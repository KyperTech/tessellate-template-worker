'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertFromLocal = convertFromLocal;

var _lodash = require('lodash');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @description Convert from local directory to standard formatted array
 */
function convertFromLocal(localDir) {
  return new Promise(function (resolve, reject) {
    _fs2.default.readdir(localDir, function (err, files) {
      if (err) {
        return reject(err);
      }
      var filesObj = {};
      console.log('files read from directory', files);
      files.forEach(function (file) {
        filesObj[(0, _lodash.uniqueId)()] = file;
      });
      console.log('files object build', files);
      resolve(filesObj);
    });
  });
}