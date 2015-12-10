import fs from 'fs';
import s3 from 's3';
import s3Util from './s3Util';
import config from './config';
import Firebase from 'firebase';
import { Clone } from 'nodegit';
import { convertFromLocal } from './utils';
import rimraf from 'rimraf';

let log = (entry) => {
  fs.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
};
let tessellateRef = new Firebase(config.fbUrl);
let templatesFbRef = tessellateRef.child('templates');
let applicationsFbRef = tessellateRef.child('files');

export default class WorkerTask {
  constructor(message) {
    let messageArray = message.split("**");
    this.fromName = messageArray[0];
    this.fromType = messageArray[1] || 'firebase';
    this.toName = messageArray[2] || 'default';
    this.toType = messageArray[3] || 'firebase';
    let now = new Date().getTime();
    this.localDir = `${config.tempDir}/${this.toName}-${now}`;
    console.log('worker task built', this);
  }
  run() {
    switch(this.fromType) {
      case 'firebase':
        switch(this.toType) {
          case 'firebase':
            //From Firebase to Firebase
            return this.copyFbTemplate();
          default:
            console.error('invalid destination type');
            return Promise.reject();
        }
      case 'git' :
        switch(this.toType) {
          case 'firebase':
            console.log('add repo to project');
            //Clone from git and write to project
            return this.addRepoToProject();
          default:
            console.error('invalid destination type');
            return Promise.reject();
        }
      case 's3':
        switch(this.toType) {
          case 's3':
            return this.copyS3ToS3();
          default:
            console.error('invalid destination type');
            return Promise.reject();
        }
      default :
        return this.copyFbTemplate();
    }
  }
  deleteLocalDir() {
    return new Promise((resolve, reject) => {
      rimraf(this.localDir, {}, (err) => {
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
  addRepoToProject() {
    return this.cloneAndConvertRepo(this.fromName).then((template) => {
      console.log('Repo cloned and coverted successfully:', template);
      return this.addToProject(template).then(() => {
        console.log('Repo successfully added to project');
        return template;
      }, (err) => {
        return Promise.reject(err);
      });
    }, (err) => {
      return Promise.reject(err);
    });
  }
  cloneAndConvertRepo(url) {
    console.log('clone and convert repo called', url);
    return Clone.clone(url, this.localDir, null).then((repo) => {
      //TODO: Convert folder into standard format
      console.log('repo cloned successfully');
      return this.convertAndRemoveLocal();
    }, (err) => {
      console.error('error cloning repo', err);
      return Promise.reject(err);
    });
  }
  convertLocalDir() {
    console.log('convert local dir called');
    return convertFromLocal(this.localDir);
  }
  convertAndRemoveLocal() {
    console.log('convertAndRemoveLocal called');
    return this.convertLocalDir().then((local) => {
      console.log('converted successfully', local);
      return this.deleteLocalDir().then(() => {
        return local;
      }, (err) => {
        console.error('Error deleting local directory', JSON.stringify(err));
        return local;
      });
    }, (err) => {
      console.error('Error converting local directory', JSON.stringify(err));
      return Promise.reject(err);
    });
  }
  //Copy to project's files list (on Firebase)
  addToProject(filesData) {
    console.log('add to project called');
    return new Promise((resolve, reject) => {
      applicationsFbRef.child(this.toName).update(filesData, (err) => {
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
  copyFbTemplate() {
    console.log('copy fb template called');
    return new Promise((resolve, reject) => {
      templatesFbRef.child(this.fromName).once('value', (templateSnap) => {
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
  copyFbTemplateToProject() {
    return this.copyFbTemplate().then((template) => {
      return this.addToProject(template);
    }, (err) => {
      return Promise.reject(err);
    });
  }
  copyS3ToS3() {
    //Copy from one S3 bucket to another
    let fromBucket = {name:config.templatesBucket, prefix:this.fromName};
    return s3Util.copyBucketToBucket(fromBucket, {name:this.toName}).then((response) => {
      console.log('Template copied from one s3 bucket to another. Response:', JSON.stringify(response));
      return response;
     }, (err) => {
      console.log('Error uploading:' + JSON.stringify(err));
      return Promise.reject(err);
    });
  }
}
