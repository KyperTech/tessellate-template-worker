import {uniqueId} from 'lodash';
import fs from 'fs';

/**
 * @description Convert from local directory to standard formatted array
 */
export function convertFromLocal(localDir) {
  return new Promise((resolve, reject) => {
    fs.readdir(localDir, (err, files) => {
      if(err) {
        return reject(err);
      }
      let filesObj = {};
      console.log('files read from directory', files);
      files.forEach((file) => {
        filesObj[uniqueId()] = file;
      });
      console.log('files object build', files);
      resolve(filesObj);
    });
  });
}
