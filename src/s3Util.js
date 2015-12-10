/** s3 connection helpers
 *	@description functionality for accessing/reading/writing to and from S3. These functions are used by files such as fileStorage.js
 */

import AWS from 'aws-sdk';
import s3Sdk from 's3';
import _ from 'lodash';
import rimraf from 'rimraf';

let sourceS3Conf = new AWS.Config({
  accessKeyId: process.env.TESSELLATE_AWS_KEY,           //replace this with the S3 Access Key for the source bucket
  secretAccessKey: process.env.TESSELLATE_AWS_SECRET  //replace this with the S3 Secret Access Key for the source bucket
});
let s3 = new AWS.S3(sourceS3Conf);
let s3Client = s3Sdk.createClient({
	s3Options:{
		accessKeyId: process.env.TESSELLATE_AWS_KEY,
		secretAccessKey: process.env.TESSELLATE_AWS_SECRET
	}
});
//Set where local read write ops take place
let localFileStore = "fs/";

/** Create new S3 bucket and set default cors settings, and set index.html is website
 * @function createBucketSite
 * @params {string} newBucketName Name of new bucket to create
 */
export function createBucketSite(bucketName){
	// console.log('createBucketSite called');
  if (!bucketName) {
    return Promise.reject({status:500, message:'Invalid Bucket Name'});
  }
	console.log('[createBucketSite] bucket name:', bucketName);
	createS3Bucket(bucketName).then((bucketData) => {
		console.log('[createBucketSite] createS3Bucket successful:', bucketData);
		setBucketCors(bucketName).then(() => {
			console.log('[createBucketSite] setBucketCors successful. BucketData:', bucketData);
			// d.resolve(bucketData);
			setBucketWebsite(bucketName).then(() => {
				console.log('[createBucketSite] setBucketWebsite successful. BucketData:', bucketData);
				return bucketData;
			}, (err) => {
				console.error('Error setting bucket site', err);
				return Promise.reject(err);
			});
		}, (err) => {
			console.error('Error setting new bucket cors config', err);
			return Promise.reject(err);
		});
	}, (err) => {
		console.error('Error creating new bucket', err);
		return Promise.reject(err);
	});
}

/** Get a signed url
 * @function saveFile
 */
export function getSignedUrl(urlData){
	var params = {Bucket: urlData.bucket, Key: urlData.key};
  return new Promise((resolve, reject) => {
    s3.getSignedUrl(urlData.action, params, (err, url) => {
      if(err){
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
export function getBuckets(){
  return new Promise((resolve, reject) => {
    s3.listBuckets((err, data) => {
      if (err) {
        console.log('Error:', err);
        reject(err);
      }
      else {
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
export function createS3Bucket(bucketName){
	console.log('createS3Bucket called', bucketName);
	let newBucketName = bucketName.toLowerCase();
  if(!AWS.config.credentials){
		return Promise.reject('AWS Credentials are required to access S3');
	}
  return new Promise((resolve, reject) => {
    s3.createBucket({Bucket: newBucketName, ACL:'public-read'}, (err, data) => {
      if(err){
        console.error('[createS3Bucket] error creating bucket:', err);
        reject({status:500, error:err});
      } else {
        console.log('[createS3Bucket] bucketCreated successfully:', data);
        // Setup Bucket website
        var dataContents = data.toString();
        // TODO: Return more accurate information here
        resolve({name:newBucketName.toLowerCase(), websiteUrl:''});
      }
    });
  });

}

/** Remove all contents then delete an S3 bucket
* @function deleteBucket
* @params {string} bucketName Name of bucket to delete
*/
export function deleteBucket(bucketName){
	console.log('deleteBucket called', bucketName)
	// Empty bucket
  return new Promise((resolve, reject) => {
    let deleteTask = s3Client.deleteDir({Bucket: bucketName});
  	deleteTask.on('error', (err) => {
  		console.error('error deleting bucket:', err);
  		reject(err);
  	});
  	deleteTask.on('end', () => {
  		console.log(bucketName + ' bucket emptied of files successfully');
  		// Delete bucket
  		s3.deleteBucket({Bucket: bucketName}, (err, data)  => {
  			if(err){
  				console.error('[deleteBucket()] Error deleting bucket:', err);
  				reject(err);
  			} else {
  				// Setup Bucket website
  				resolve({message: bucketName + ' Bucket deleted successfully'});
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
function setBucketCors(bucketName){
	console.log('[setBucketCors()] Bucket Name:', bucketName);
  let corsConfig = {
    Bucket:bucketName,
    CORSConfiguration:{
      CORSRules: [{
        AllowedHeaders: [
          '*',
        ],
        AllowedMethods: [
          'HEAD','GET', 'PUT', 'POST'
        ],
        AllowedOrigins: [
          'http://*', 'https://*'
        ],
        // ExposeHeaders: [
        //   'STRING_VALUE',
        // ],
        MaxAgeSeconds: 3000
      }]
    }
  }
  return new Promise((resolve, reject) => {
    s3.putBucketCors(corsConfig, (err, data) => {
      if(err){
        console.error('Error creating bucket website setup');
        reject({status:500, error:err});
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
function setBucketWebsite(bucketName){
	console.log('[setBucketWebsite()] setBucketWebsite called:', bucketName);
	var d = q.defer();
	let siteConfig = {
    Bucket: bucketName,
    WebsiteConfiguration:{
      IndexDocument:{
        Suffix:'index.html'
      }
    }
  };
  return new Promise((resolve, reject) => {
    s3.putBucketWebsite(siteConfig, (err, data) => {
      if(err){
        console.error('[setBucketWebsite()] Error creating bucket website setup');
        reject({status:500, error:err});
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
function saveFile(bucketName, fileData){
	console.log('[saveFile] saveFile called', arguments);
  let saveParams = {Bucket:bucketName, Key:fileData.key,  Body: fileData.content, ACL:'public-read'};
  if(_.has(fileData, 'contentType')){
  	saveParams.ContentType = fileData.contentType;
  }
  console.log('[saveFile] saveParams:', saveParams);
  return new Promise((resolve, reject) => {
    s3.putObject(saveParams, (err, data) => {
      //[TODO] Add putting object ACL (make public)
      if(!err){
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
function downloadBucketToDir(bucketInfo, localDir){
	console.log('uploadBucketToDir called:', bucketInfo);
	let bucketName = '';
  let bucketPrefix = "";
	if(_.isString(bucketInfo)){
		bucketName = bucketInfo;
	} else {
		bucketName = bucketInfo.name;
		if(_.has(bucketInfo, "prefix")){
			bucketPrefix = bucketInfo.prefix;
		}
	}
	let upParams = {
	  localDir: localDir,
	  s3Params: {
	    Bucket: bucketName,
	    Prefix: bucketPrefix,
	    ACL:'public-read'
	  },
	};
  return new Promise((resolve, reject) => {
    var downloader = s3Client.downloadDir({localDir:localDir, s3Params:{Prefix:bucketPrefix, Bucket:bucketName}})
    downloader.on('error', (err) => {
      console.error("[downloadBucketToDir] unable to sync:", err);
      reject(err);
    });
    // downloader.on('progress', () => {
    //   console.log("progress", downloader.progressAmount, downloader.progressTotal);
    // });
    downloader.on('end', () => {
      console.log("[downloadBucketToDir] Download succesful");
      resolve(localDir);
    });
  })
}
/** Upload local directory contents to provided S3 Bucket
 * @function uploadDir
 * @params {string} bucketName - Name of bucket to upload files to
 * @params {string} localDir - Local directory to upload to S3
 */
export function uploadDir(bucketInfo, localDir){
	console.log('uploadToBucket called:', bucketInfo);
	let bucketName = '';
  let bucketPrefix = '';
	if(_.isString(bucketInfo)){
		bucketName = bucketInfo;
	} else {
		bucketName = bucketInfo.name;
		if(_.has(bucketInfo, "prefix")){
			bucketPrefix = bucketInfo.prefix;
		}
	}
	let upParams = {
	  localDir: localDir,
	  s3Params: {
	    Bucket: bucketName,
	    Prefix: bucketPrefix,
	    ACL:'public-read'
	  },
	};
  return new Promise((resolve, reject) => {
    var uploader = s3Client.uploadDir(upParams);
  	uploader.on('error', (err) => {
    	console.error("[uploadToBucket] unable to sync:", err);
    	reject(err);
  	});
  	// uploader.on('progress', () => {
  	//   console.log("progress", uploader.progressAmount, uploader.progressTotal);
  	// });
  	uploader.on('end', () => {
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
export function copyBucketToBucket(srcBucketInfo, destBucketInfo){
	console.log('copyBucketToBucket called:', srcBucketInfo, destBucketInfo);
	var srcBucket = {prefix:''};
	var destBucket = {prefix:''};
	//Handle strings and objects
	if(_.isString(srcBucketInfo)){
		srcBucket.name = srcBucketInfo;
	} else {
		srcBucket.name = srcBucketInfo.name;
		if(_.has(srcBucketInfo, "prefix")){
			srcBucket.prefix = srcBucketInfo.prefix;
		}
	}
	if(_.isString(destBucketInfo)){
		destBucket.name = destBucketInfo;
	} else {
		destBucket.name = destBucketInfo.name;
		if(_.has(destBucketInfo, "prefix")){
			destBucket.prefix = destBucketInfo.prefix;
		}
	}
	var tempFolder = localFileStore + srcBucket.name;
	return downloadBucketToDir(srcBucket, tempFolder).then((downloadRes) => {
		// console.log('bucket downloaded successfully:', downloadRes);
		uploadDir(destBucket, tempFolder).then((uploadRes) => {
			// console.log('bucket uploaded successfully:', downloadRes);
			rimraf(tempFolder, (err) => {
				if(err){console.error('Error removing local directory:', err)}
				d.resolve(destBucket);
			});
		}, (err) => {
			console.log('bucket upload error:', err);
			return Promise.reject(err);
		});
	}, (err) => {
		console.log('bucket download error:', err);
		return Promise.reject(err);
	});
}

/** Insert data into template files
 * @function uploadToBucket
 * @params {array} filesArray List of template files as strings
 * @params {object} templateData Data to be templated into the file
 */
export function templateFiles(filesArray, templateData){
	//TODO: Template each file
	// var replaceVar = "ZZ";
	return _.map(filesArray, function(file){
		var template = _.template(fileString);
		return template(templateData);
	});
}

/** Insert data into a local directory of template files
 * @function uploadToBucket
 * @params {array} filesArray
 * @params {object} templateData Data to be templated into the file
 */
function templateLocalDir(dirPath, templateData){
	//TODO: Template each file loaded from path directory
	// var template = _.template(fileString);
	// var compiledFile = template(templateData);
}

//Get list of objects contained within bucket
export function getFiles(bucketName){
	if(!bucketName){
		return Promise.reject({message:'Bucket name required to get objects'});
	}
  return new Promise((resolve, reject) => {
    s3.listObjects({Bucket:bucketName}, (err, data) => {
      if (err) {
        console.log("Error:", err);
        reject(err);
      }
      else {
        console.log("[getFiles] listObjects returned:", data);
        resolve(data);
      }
    });
  });
}
