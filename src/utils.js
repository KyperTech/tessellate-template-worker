import {contains} from 'lodash';
import fs from 'fs';
import path from 'path';
import config from './config';

/**
 * @description Convert from local directory to standard formatted array
 * @param {String} localDir - Local directory to convert
 */
export function convertFromLocal(localDir) {
  // console.log('convert from local called', localDir);
  return readLocalDir(localDir).then((filesArray) => {
    let filesObj = buildFilesObj(filesArray);
    console.log('Files obj built:', filesObj);
    return filesObj;
  }, (err) => {
    console.error('Error reading directory.', err);
    return Promise.reject(err);
  });
}
/**
 * @description Read local directory and convert to files array
 * @param {String} localDir - Local directory to read
 * @return {Promise}
 */
export function readLocalDir(localDir) {
  let blacklist = config.copyBlacklist || ['.git'];
  return new Promise((resolve, reject) => {
    fs.readdir(localDir, (err, fileNames) => {
      if(err) {
        console.error('Error reading local directory', JSON.stringify(err));
        return reject(err);
      }
      let filesPromises = [];
      fileNames.forEach((file, i) => {
        //Add a new promise for each file
        if (!contains(blacklist, file)) {
          filesPromises.push(buildFileData(file, localDir));
        } else {
          console.log(file + ' is in the blacklist and will not be copied.');
        }
      });
      //Run all file load promises
      Promise.all(filesPromises).then((filesArray) => {
        // console.log('files promises completed:', filesArray);
        resolve(filesArray);
      }, (err) => {
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
  let fileLocalPath = path.join(__dirname, '..', `${localDir}/${file}`);
  let fileStats = fs.lstatSync(fileLocalPath);
  if (fileStats.isDirectory()) {
    console.log(file, 'is a directory. Adding to convert.');
    //TODO: Make this recursion work correctly
    return convertFromLocal(file);
  }
  //Passed object is file (or possibly a symlink)
  let fileData = {meta:{path: file}};
  //Attempt loading file content in as original parameter
  return new Promise((resolve, reject) => {
    fs.readFile(fileLocalPath, {encoding: 'utf-8'}, (err, data) => {
      if(!err){
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
  let filesObj = {};
  filesArray.forEach((file, i) => {
    //Append files to an object under unique ids
    let id = new Date().getTime() + i;
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
export function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
