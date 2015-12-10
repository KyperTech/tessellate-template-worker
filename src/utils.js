import {uniqueId} from 'lodash';
import fs from 'fs';

/**
 * @description Convert from local directory to standard formatted array
 */
export function convertFromLocal(localDir) {
  console.log('convert from local called', localDir);
  return new Promise((resolve, reject) => {
    fs.readdir(localDir, (err, files) => {
      if(err) {
        console.error('Error reading local directory', JSON.stringify(err));
        return reject(err);
      }
      let filesObj = {};
      console.log('files read from directory', files);
      files.forEach((file, i) => {
        let fileName = replaceAll('.', '::')
        let id = new Date().getTime() + i;
        filesObj[id] = {meta:{path: file}};
      });
      console.log('files object built', filesObj);
      resolve(filesObj);
    });
  });
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
