'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertFromLocal = convertFromLocal;
exports.readLocalDir = readLocalDir;
exports.replaceAll = replaceAll;

var _lodash = require('lodash');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @description Convert from local directory to standard formatted array
 * @param {String} localDir - Local directory to convert
 */
function convertFromLocal(localDir) {
  // console.log('convert from local called', localDir);
  return readLocalDir(localDir).then(function (filesArray) {
    var filesObj = buildFilesObj(filesArray);
    console.log('Files obj built:', filesObj);
    return filesObj;
  }, function (err) {
    console.error('Error reading directory.', err);
    return Promise.reject(err);
  });
}
/**
 * @description Read local directory and convert to files array
 * @param {String} localDir - Local directory to read
 * @return {Promise}
 */
function readLocalDir(localDir) {
  var blacklist = _config2.default.copyBlacklist || ['.git'];
  return new Promise(function (resolve, reject) {
    _fs2.default.readdir(localDir, function (err, fileNames) {
      if (err) {
        console.error('Error reading local directory', JSON.stringify(err));
        return reject(err);
      }
      var filesPromises = [];
      fileNames.forEach(function (file, i) {
        //Add a new promise for each file
        if (!(0, _lodash.contains)(blacklist, file)) {
          filesPromises.push(buildFileData(file, localDir));
        } else {
          console.log(file + ' is in the blacklist and will not be copied.');
        }
      });
      //Run all file load promises
      Promise.all(filesPromises).then(function (filesArray) {
        // console.log('files promises completed:', filesArray);
        resolve(filesArray);
      }, function (err) {
        console.error('Error reading files.', err);
        reject(err);
      });
    });
  });
}
/**
 * @description Build data object from path and localDir
 * @param {String} file - File path
 * @param {String} localDir - Local directory containg file
 * @return {Promise}
 */
function buildFileData(file, localDir) {
  var fileLocalPath = _path2.default.join(__dirname, '..', localDir + '/' + file);
  var fileStats = _fs2.default.lstatSync(fileLocalPath);
  if (fileStats.isDirectory()) {
    console.log(file, 'is a directory. Adding to convert.');
    //TODO: Make this recursion work correctly
    return convertFromLocal(file);
  }
  //Passed object is file (or possibly a symlink)
  var fileData = { meta: { path: file } };
  //Attempt loading file content in as original parameter
  return new Promise(function (resolve, reject) {
    _fs2.default.readFile(fileLocalPath, { encoding: 'utf-8' }, function (err, data) {
      if (!err) {
        // console.log('File loaded successfully', data);
        fileData.original = data;
        resolve(fileData);
      } else {
        console.log('Error reading file', err);
        reject(err);
      }
    });
  });
}
/**
 * @description Place files array within an object with ids (needed to store on Firebase)
 * @param {Array} filesArray - Array of files to place in an object
 * @return {Object}
 */
function buildFilesObj(filesArray) {
  var filesObj = {};
  filesArray.forEach(function (file, i) {
    //Append files to an object under unique ids
    var id = file.meta.path.replace(/[.]/g, ':').replace(/[#$\[\]]/g, '--');
    filesObj[id] = file;
  });
  return filesObj;
}
/**
 * @description Place files array within an object with ids (needed to store on Firebase)
 * @param {String} str - String to remove all strings from
 * @param {String} find - String to replace
 * @param {String} replace - String to replace found string instances with
 * @return {String}
 */
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}