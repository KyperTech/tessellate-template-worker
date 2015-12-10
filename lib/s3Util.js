'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBucketSite = createBucketSite;
exports.getSignedUrl = getSignedUrl;
exports.getBuckets = getBuckets;
exports.createS3Bucket = createS3Bucket;
exports.deleteBucket = deleteBucket;
exports.uploadDir = uploadDir;
exports.copyBucketToBucket = copyBucketToBucket;
exports.templateFiles = templateFiles;
exports.getFiles = getFiles;

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _s = require('s3');

var _s2 = _interopRequireDefault(_s);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** s3 connection helpers
 *	@description functionality for accessing/reading/writing to and from S3. These functions are used by files such as fileStorage.js
 */

var sourceS3Conf = new _awsSdk2.default.Config({
  accessKeyId: process.env.TESSELLATE_AWS_KEY, //replace this with the S3 Access Key for the source bucket
  secretAccessKey: process.env.TESSELLATE_AWS_SECRET //replace this with the S3 Secret Access Key for the source bucket
});
var s3 = new _awsSdk2.default.S3(sourceS3Conf);
var s3Client = _s2.default.createClient({
  s3Options: {
    accessKeyId: process.env.TESSELLATE_AWS_KEY,
    secretAccessKey: process.env.TESSELLATE_AWS_SECRET
  }
});
//Set where local read write ops take place
var localFileStore = "fs/";

/** Create new S3 bucket and set default cors settings, and set index.html is website
 * @function createBucketSite
 * @params {string} newBucketName Name of new bucket to create
 */
function createBucketSite(bucketName) {
  // console.log('createBucketSite called');
  if (!bucketName) {
    return Promise.reject({ status: 500, message: 'Invalid Bucket Name' });
  }
  console.log('[createBucketSite] bucket name:', bucketName);
  createS3Bucket(bucketName).then(function (bucketData) {
    console.log('[createBucketSite] createS3Bucket successful:', bucketData);
    setBucketCors(bucketName).then(function () {
      console.log('[createBucketSite] setBucketCors successful. BucketData:', bucketData);
      // d.resolve(bucketData);
      setBucketWebsite(bucketName).then(function () {
        console.log('[createBucketSite] setBucketWebsite successful. BucketData:', bucketData);
        return bucketData;
      }, function (err) {
        console.error('Error setting bucket site', err);
        return Promise.reject(err);
      });
    }, function (err) {
      console.error('Error setting new bucket cors config', err);
      return Promise.reject(err);
    });
  }, function (err) {
    console.error('Error creating new bucket', err);
    return Promise.reject(err);
  });
}

/** Get a signed url
 * @function saveFile
 */
function getSignedUrl(urlData) {
  var params = { Bucket: urlData.bucket, Key: urlData.key };
  return new Promise(function (resolve, reject) {
    s3.getSignedUrl(urlData.action, params, function (err, url) {
      if (err) {
        console.log('Error getting signed url:', err);
        reject(err);
      } else {
        console.log('The URL is', url);
        resolve(url);
      }
    });
  });
};

//----------------- Helper Functions ------------------//

/** Get S3 Buckets
 * @function uploadToBucket
 * @params {string} bucketName Name of bucket to upload to
 */
function getBuckets() {
  return new Promise(function (resolve, reject) {
    s3.listBuckets(function (err, data) {
      if (err) {
        console.log('Error:', err);
        reject(err);
      } else {
        for (var index in data.Buckets) {
          var bucket = data.Buckets[index];
          // console.log('Bucket: ', bucket);
        }
        resolve(data.Buckets);
      }
    });
  });
}
/** Create a new bucket
* @function createS3Bucket
* @params {string} bucketName Name of bucket to create
*/
function createS3Bucket(bucketName) {
  console.log('createS3Bucket called', bucketName);
  var newBucketName = bucketName.toLowerCase();
  if (!_awsSdk2.default.config.credentials) {
    return Promise.reject('AWS Credentials are required to access S3');
  }
  return new Promise(function (resolve, reject) {
    s3.createBucket({ Bucket: newBucketName, ACL: 'public-read' }, function (err, data) {
      if (err) {
        console.error('[createS3Bucket] error creating bucket:', err);
        reject({ status: 500, error: err });
      } else {
        console.log('[createS3Bucket] bucketCreated successfully:', data);
        // Setup Bucket website
        var dataContents = data.toString();
        // TODO: Return more accurate information here
        resolve({ name: newBucketName.toLowerCase(), websiteUrl: '' });
      }
    });
  });
}

/** Remove all contents then delete an S3 bucket
* @function deleteBucket
* @params {string} bucketName Name of bucket to delete
*/
function deleteBucket(bucketName) {
  console.log('deleteBucket called', bucketName);
  // Empty bucket
  return new Promise(function (resolve, reject) {
    var deleteTask = s3Client.deleteDir({ Bucket: bucketName });
    deleteTask.on('error', function (err) {
      console.error('error deleting bucket:', err);
      reject(err);
    });
    deleteTask.on('end', function () {
      console.log(bucketName + ' bucket emptied of files successfully');
      // Delete bucket
      s3.deleteBucket({ Bucket: bucketName }, function (err, data) {
        if (err) {
          console.error('[deleteBucket()] Error deleting bucket:', err);
          reject(err);
        } else {
          // Setup Bucket website
          resolve({ message: bucketName + ' Bucket deleted successfully' });
        }
      });
    });
  });
}
/** Set Cors configuration for an S3 bucket
* @function setBucketCors
* @params {string} newBucketName Name of bucket to set Cors configuration for
*/
//TODO: Set this when creating bucket?
function setBucketCors(bucketName) {
  console.log('[setBucketCors()] Bucket Name:', bucketName);
  var corsConfig = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [{
        AllowedHeaders: ['*'],
        AllowedMethods: ['HEAD', 'GET', 'PUT', 'POST'],
        AllowedOrigins: ['http://*', 'https://*'],
        // ExposeHeaders: [
        //   'STRING_VALUE',
        // ],
        MaxAgeSeconds: 3000
      }]
    }
  };
  return new Promise(function (resolve, reject) {
    s3.putBucketCors(corsConfig, function (err, data) {
      if (err) {
        console.error('Error creating bucket website setup');
        reject({ status: 500, error: err });
      } else {
        // console.log('bucket cors set successfully resolving');
        resolve();
      }
    });
  });
}

/** Set website configuration for an S3 bucket
* @function setBucketWebsite
* @params {string} newBucketName Name of bucket for which to set website configuration
*/
function setBucketWebsite(bucketName) {
  console.log('[setBucketWebsite()] setBucketWebsite called:', bucketName);
  var d = q.defer();
  var siteConfig = {
    Bucket: bucketName,
    WebsiteConfiguration: {
      IndexDocument: {
        Suffix: 'index.html'
      }
    }
  };
  return new Promise(function (resolve, reject) {
    s3.putBucketWebsite(siteConfig, function (err, data) {
      if (err) {
        console.error('[setBucketWebsite()] Error creating bucket website setup');
        reject({ status: 500, error: err });
      } else {
        console.log('[setBucketWebsite()] website config set for ' + bucketName, data);
        resolve();
      }
    });
  });
}

/** Upload file contents to S3 given bucket, file key and file contents
 * @function saveFile
 * @params {string} bucketName - Name of bucket to upload to
 * @params {object} fileData - Object containing file information
 * @params {string} fileData.key - Key of file to save
 * @params {string} fileData.content - File contents in string form
 */
function saveFile(bucketName, fileData) {
  console.log('[saveFile] saveFile called', arguments);
  var saveParams = { Bucket: bucketName, Key: fileData.key, Body: fileData.content, ACL: 'public-read' };
  if (_lodash2.default.has(fileData, 'contentType')) {
    saveParams.ContentType = fileData.contentType;
  }
  console.log('[saveFile] saveParams:', saveParams);
  return new Promise(function (resolve, reject) {
    s3.putObject(saveParams, function (err, data) {
      //[TODO] Add putting object ACL (make public)
      if (!err) {
        console.log('[saveFile] file saved successfully. Returning:', data);
        resolve(data);
      } else {
        console.log('[saveFile] error saving file:', err);
        reject(err);
      }
    });
  });
}
/** Download S3 bucket contetns to provided local directory
 * @function downloadBucketToDir
 * @params {object | string} bucketInfo - Name of bucket to upload files as string
 * or object containing bucket info as follows: {name:"bucket123", prefix:""}
 * @params {string} localDir - Local directory to upload to S3
 */
function downloadBucketToDir(bucketInfo, localDir) {
  console.log('uploadBucketToDir called:', bucketInfo);
  var bucketName = '';
  var bucketPrefix = "";
  if (_lodash2.default.isString(bucketInfo)) {
    bucketName = bucketInfo;
  } else {
    bucketName = bucketInfo.name;
    if (_lodash2.default.has(bucketInfo, "prefix")) {
      bucketPrefix = bucketInfo.prefix;
    }
  }
  var upParams = {
    localDir: localDir,
    s3Params: {
      Bucket: bucketName,
      Prefix: bucketPrefix,
      ACL: 'public-read'
    }
  };
  return new Promise(function (resolve, reject) {
    var downloader = s3Client.downloadDir({ localDir: localDir, s3Params: { Prefix: bucketPrefix, Bucket: bucketName } });
    downloader.on('error', function (err) {
      console.error("[downloadBucketToDir] unable to sync:", err);
      reject(err);
    });
    // downloader.on('progress', () => {
    //   console.log("progress", downloader.progressAmount, downloader.progressTotal);
    // });
    downloader.on('end', function () {
      console.log("[downloadBucketToDir] Download succesful");
      resolve(localDir);
    });
  });
}
/** Upload local directory contents to provided S3 Bucket
 * @function uploadDir
 * @params {string} bucketName - Name of bucket to upload files to
 * @params {string} localDir - Local directory to upload to S3
 */
function uploadDir(bucketInfo, localDir) {
  console.log('uploadToBucket called:', bucketInfo);
  var bucketName = '';
  var bucketPrefix = '';
  if (_lodash2.default.isString(bucketInfo)) {
    bucketName = bucketInfo;
  } else {
    bucketName = bucketInfo.name;
    if (_lodash2.default.has(bucketInfo, "prefix")) {
      bucketPrefix = bucketInfo.prefix;
    }
  }
  var upParams = {
    localDir: localDir,
    s3Params: {
      Bucket: bucketName,
      Prefix: bucketPrefix,
      ACL: 'public-read'
    }
  };
  return new Promise(function (resolve, reject) {
    var uploader = s3Client.uploadDir(upParams);
    uploader.on('error', function (err) {
      console.error("[uploadToBucket] unable to sync:", err);
      reject(err);
    });
    // uploader.on('progress', () => {
    //   console.log("progress", uploader.progressAmount, uploader.progressTotal);
    // });
    uploader.on('end', function () {
      console.log("[uploadToBucket] Upload succesful");
      // [TODO] Delete new app folders
      var bucketUrl = bucketName + '.s3-website-us-east-1.amazonAWS.com';
      console.log('[uploadToBucket] uploader returning:', bucketUrl);
      resolve(bucketUrl);
    });
  });
}
/** Copy one Bucket to another Bucket including the use of prefixes
 * @function copyBucketToBucket
 * @params {string|object} srcBucketInfo Object with name and prefix or name of bucket to copy as string
 * @params {string} srcBucketInfo.name Name of bucket to copy from
 * @params {string} srcBucketInfo.prefix Prefix of bucket to copy from
 * @params {string|object} destBucketName Object with name and prefix or name of bucket to copy src to
 * @params {string} srcBucketInfo.name Name of bucket to copy to
 * @params {string} srcBucketInfo.prefix Prefix of bucket to copy to
 */
//TODO: Provide the option to delete the local copy or not after operation is complete
function copyBucketToBucket(srcBucketInfo, destBucketInfo) {
  console.log('copyBucketToBucket called:', srcBucketInfo, destBucketInfo);
  var srcBucket = { prefix: '' };
  var destBucket = { prefix: '' };
  //Handle strings and objects
  if (_lodash2.default.isString(srcBucketInfo)) {
    srcBucket.name = srcBucketInfo;
  } else {
    srcBucket.name = srcBucketInfo.name;
    if (_lodash2.default.has(srcBucketInfo, "prefix")) {
      srcBucket.prefix = srcBucketInfo.prefix;
    }
  }
  if (_lodash2.default.isString(destBucketInfo)) {
    destBucket.name = destBucketInfo;
  } else {
    destBucket.name = destBucketInfo.name;
    if (_lodash2.default.has(destBucketInfo, "prefix")) {
      destBucket.prefix = destBucketInfo.prefix;
    }
  }
  var tempFolder = localFileStore + srcBucket.name;
  return downloadBucketToDir(srcBucket, tempFolder).then(function (downloadRes) {
    // console.log('bucket downloaded successfully:', downloadRes);
    uploadDir(destBucket, tempFolder).then(function (uploadRes) {
      // console.log('bucket uploaded successfully:', downloadRes);
      (0, _rimraf2.default)(tempFolder, function (err) {
        if (err) {
          console.error('Error removing local directory:', err);
        }
        d.resolve(destBucket);
      });
    }, function (err) {
      console.log('bucket upload error:', err);
      return Promise.reject(err);
    });
  }, function (err) {
    console.log('bucket download error:', err);
    return Promise.reject(err);
  });
}

/** Insert data into template files
 * @function uploadToBucket
 * @params {array} filesArray List of template files as strings
 * @params {object} templateData Data to be templated into the file
 */
function templateFiles(filesArray, templateData) {
  //TODO: Template each file
  // var replaceVar = "ZZ";
  return _lodash2.default.map(filesArray, function (file) {
    var template = _lodash2.default.template(fileString);
    return template(templateData);
  });
}

/** Insert data into a local directory of template files
 * @function uploadToBucket
 * @params {array} filesArray
 * @params {object} templateData Data to be templated into the file
 */
function templateLocalDir(dirPath, templateData) {}
//TODO: Template each file loaded from path directory
// var template = _.template(fileString);
// var compiledFile = template(templateData);

//Get list of objects contained within bucket
function getFiles(bucketName) {
  if (!bucketName) {
    return Promise.reject({ message: 'Bucket name required to get objects' });
  }
  return new Promise(function (resolve, reject) {
    s3.listObjects({ Bucket: bucketName }, function (err, data) {
      if (err) {
        console.log("Error:", err);
        reject(err);
      } else {
        console.log("[getFiles] listObjects returned:", data);
        resolve(data);
      }
    });
  });
}