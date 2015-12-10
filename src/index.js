import fs from 'fs';
import s3 from 's3';
import s3Util from './s3Util';
import config from './config';
import Firebase from 'firebase';

let log = (entry) => {
  fs.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
};
let templatesBucket = config.templatesBucket;
let tessellateRef = new Firebase(config.fbUrl);
let templatesFbRef = tessellateRef.child('templates');
let applicationsFbRef = tessellateRef.child('files');

export default class WorkerTask {
  constructor(message) {
    let messageArray = message.split(":");
    this.fromName = messageArray[0];
    this.fromType = messageArray[1] || 'firebase';
    this.toName = messageArray[2] || 'default';
    this.toType = messageArray[3] || 'firebase';
  }
  run() {
    return new Promise((resolve, reject) => {
      switch(this.fromType) {
        case 'firebase':
          switch(this.toType) {
            default:
              //TODO: Copy to firebase
              templatesFbRef.child(this.fromName).once('value', (templateSnap) => {
                applicationsFbRef.child(this.toName).update(templateSnap.val(), (err) => {
                  if(!err){
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
          switch(this.toType) {
            default:
              //Copy from one S3 bucket to another
              let fromBucket = {name:templatesBucket, prefix:this.fromName};
              s3Util.copyBucketToBucket(fromBucket, {name:this.toName}).then((response) => {
                log('Template copied from one s3 bucket to another. Response:', JSON.stringify(response));
                resolve(response);
               }, (err) => {
                log('Error uploading:' + JSON.stringify(err));
                reject(err);
              });
          }
        break;
      }
    });

  }
}
