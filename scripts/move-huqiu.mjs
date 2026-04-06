import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].trim();
  }
}

const B = 'clover-1256096296', R = 'ap-shanghai';
const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });

const oldKey = '/videos/初信系列 呼求主名.mp4';
const newKey = '/videos/初信系列/初信系列 呼求主名.mp4';

async function run() {
  // copy
  await new Promise((resolve, reject) => {
    cos.putObjectCopy({
      Bucket: B, Region: R, Key: newKey,
      CopySource: `${B}.cos.${R}.myqcloud.com${encodeURI(oldKey)}`,
    }, (err, data) => err ? reject(err) : resolve(data));
  });
  console.log('Copied to', newKey);

  // delete old
  await new Promise((resolve, reject) => {
    cos.deleteObject({ Bucket: B, Region: R, Key: oldKey }, (err, data) => err ? reject(err) : resolve(data));
  });
  console.log('Deleted', oldKey);

  // update manifest
  const mData = await new Promise((resolve, reject) => {
    cos.getObject({ Bucket: B, Region: R, Key: '/manifest.json' }, (err, data) => err ? reject(err) : resolve(data));
  });
  const manifest = JSON.parse(mData.Body.toString());
  const v = manifest.videos.find(v => v.title && v.title.includes('呼求主名'));
  if (v) {
    v.videoUrl = newKey;
    v.category = '初信系列';
  }
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: B, Region: R, Key: '/manifest.json',
      Body: JSON.stringify(manifest, null, 2), ContentType: 'application/json',
    }, (err, data) => err ? reject(err) : resolve(data));
  });
  console.log('Manifest updated');
  console.log('New entry:', JSON.stringify(v, null, 2));
}

run().catch(e => { console.error(e.message || e); process.exit(1); });
