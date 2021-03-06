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

var _nodegit = require('nodegit');

var _utils = require('./utils');

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var log = function log(entry) {
  _fs2.default.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
};
var tessellateRef = new _firebase2.default(_config2.default.fbUrl);
var templatesFbRef = tessellateRef.child('templates');
var applicationsFbRef = tessellateRef.child('files');

var WorkerTask = (function () {
  function WorkerTask(message) {
    _classCallCheck(this, WorkerTask);

    var messageArray = message.split("**");
    this.fromName = messageArray[0];
    this.fromType = messageArray[1] || 'firebase';
    this.toName = messageArray[2] || 'default';
    this.toType = messageArray[3] || 'firebase';
    var now = new Date().getTime();
    this.localDir = _config2.default.tempDir + '/' + this.toName + '-' + now;
    console.log('worker task built', this);
  }

  _createClass(WorkerTask, [{
    key: 'run',
    value: function run() {
      switch (this.fromType) {
        case 'firebase':
          switch (this.toType) {
            case 'firebase':
              //From Firebase to Firebase
              return this.copyFbTemplate();
            default:
              console.error('invalid destination type');
              return Promise.reject();
          }
        case 'git':
          switch (this.toType) {
            case 'firebase':
              console.log('add repo to project');
              //Clone from git and write to project
              return this.addRepoToProject();
            default:
              return this.addRepoToProject();

          }
        case 's3':
          switch (this.toType) {
            case 's3':
              return this.copyS3ToS3();
            default:
              console.error('invalid destination type');
              return Promise.reject();
          }
        default:
          return this.copyFbTemplate();
      }
    }
  }, {
    key: 'deleteLocalDir',
    value: function deleteLocalDir() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        (0, _rimraf2.default)(_this.localDir, {}, function (err) {
          if (!err) {
            console.log('Template copied from firebase to project.');
            resolve();
          } else {
            console.log('Error deleting local dir:', JSON.stringify(err));
            reject(err);
          }
        });
      });
    }
    //Copy git repo

  }, {
    key: 'addRepoToProject',
    value: function addRepoToProject() {
      var _this2 = this;

      return this.cloneAndConvertRepo(this.fromName).then(function (template) {
        console.log('Repo cloned and coverted successfully:', template);
        return _this2.addToProject(template).then(function () {
          console.log('Repo successfully added to project');
          return template;
        }, function (err) {
          return Promise.reject(err);
        });
      }, function (err) {
        return Promise.reject(err);
      });
    }
  }, {
    key: 'cloneAndConvertRepo',
    value: function cloneAndConvertRepo(url) {
      var _this3 = this;

      console.log('clone and convert repo called', url);
      var opts = {
        remoteCallbacks: {
          certificateCheck: function certificateCheck() {
            // github will fail cert check on some machines
            // this overrides that check
            return 1;
          }
        }
      };
      return _nodegit.Clone.clone(url, this.localDir, opts).then(function (repo) {
        //TODO: Convert folder into standard format
        console.log('repo cloned successfully');
        return _this3.convertAndRemoveLocal();
      }, function (err) {
        console.error('error cloning repo', err);
        return Promise.reject(err);
      });
    }
  }, {
    key: 'convertLocalDir',
    value: function convertLocalDir() {
      console.log('convert local dir called');
      return (0, _utils.convertFromLocal)(this.localDir);
    }
  }, {
    key: 'convertAndRemoveLocal',
    value: function convertAndRemoveLocal() {
      var _this4 = this;

      console.log('convertAndRemoveLocal called');
      return this.convertLocalDir().then(function (local) {
        console.log('converted successfully', local);
        return _this4.deleteLocalDir().then(function () {
          return local;
        }, function (err) {
          console.error('Error deleting local directory', JSON.stringify(err));
          return local;
        });
      }, function (err) {
        console.error('Error converting local directory', JSON.stringify(err));
        return Promise.reject(err);
      });
    }
    //Copy to project's files list (on Firebase)

  }, {
    key: 'addToProject',
    value: function addToProject(filesData) {
      var _this5 = this;

      console.log('add to project called');
      return new Promise(function (resolve, reject) {
        applicationsFbRef.child(_this5.toName).update(filesData, function (err) {
          if (!err) {
            console.log('Template copied from firebase to project:', JSON.stringify(filesData));
            resolve();
          } else {
            console.error('Error copying to firebase: ', JSON.stringify(err));
            reject(err);
          }
        });
      });
    }
    //Copy template from firebase

  }, {
    key: 'copyFbTemplate',
    value: function copyFbTemplate() {
      var _this6 = this;

      console.log('copy fb template called');
      return new Promise(function (resolve, reject) {
        templatesFbRef.child(_this6.fromName).once('value', function (templateSnap) {
          if (templateSnap && typeof templateSnap.val() === 'function') {
            resolve(templateSnap.val());
          } else {
            console.error('Template does not exist on Firebase.');
            reject('Template does not exist');
          }
        });
      });
    }
    //Copy template from firebase to project

  }, {
    key: 'copyFbTemplateToProject',
    value: function copyFbTemplateToProject() {
      var _this7 = this;

      return this.copyFbTemplate().then(function (template) {
        return _this7.addToProject(template);
      }, function (err) {
        return Promise.reject(err);
      });
    }
  }, {
    key: 'copyS3ToS3',
    value: function copyS3ToS3() {
      //Copy from one S3 bucket to another
      var fromBucket = { name: _config2.default.templatesBucket, prefix: this.fromName };
      return _s3Util2.default.copyBucketToBucket(fromBucket, { name: this.toName }).then(function (response) {
        console.log('Template copied from one s3 bucket to another. Response:', JSON.stringify(response));
        return response;
      }, function (err) {
        console.log('Error uploading:' + JSON.stringify(err));
        return Promise.reject(err);
      });
    }
  }]);

  return WorkerTask;
})();

exports.default = WorkerTask;