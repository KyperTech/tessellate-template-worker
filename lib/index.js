'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _s = require('s3');

var _s2 = _interopRequireDefault(_s);

var _s3Util = require('./s3Util');

var _s3Util2 = _interopRequireDefault(_s3Util);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var log = function log(entry) {
  _fs2.default.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
};
var templatesBucket = _config2.default.templatesBucket;
var tessellateRef = new _firebase2.default(_config2.default.fbUrl);
var templatesFbRef = tessellateRef.child('templates');
var applicationsFbRef = tessellateRef.child('files');

var WorkerTask = (function () {
  function WorkerTask(message) {
    _classCallCheck(this, WorkerTask);

    var messageArray = message.split(":");
    this.fromName = messageArray[0];
    this.fromType = messageArray[1] || 'firebase';
    this.toName = messageArray[2] || 'default';
    this.toType = messageArray[3] || 'firebase';
  }

  _createClass(WorkerTask, [{
    key: 'run',
    value: function run() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        switch (_this.fromType) {
          case 'firebase':
            switch (_this.toType) {
              default:
                //TODO: Copy to firebase
                templatesFbRef.child(_this.fromName).once('value', function (templateSnap) {
                  applicationsFbRef.child(_this.toName).update(templateSnap.val(), function (err) {
                    if (!err) {
                      log('Template copied from firebase to project. Response:', JSON.stringify(templateSnap.val()));
                      resolve();
                    } else {
                      log('Error copying to firebase: ', JSON.stringify(err));
                      reject(err);
                    }
                  });
                });
            }
            break;
          case 's3':
            switch (_this.toType) {
              default:
                //Copy from one S3 bucket to another
                var fromBucket = { name: templatesBucket, prefix: _this.fromName };
                _s3Util2.default.copyBucketToBucket(fromBucket, { name: _this.toName }).then(function (response) {
                  log('Template copied from one s3 bucket to another. Response:', JSON.stringify(response));
                  resolve(response);
                }, function (err) {
                  log('Error uploading:' + JSON.stringify(err));
                  reject(err);
                });
            }
            break;
        }
      });
    }
  }]);

  return WorkerTask;
})();

exports.default = WorkerTask;