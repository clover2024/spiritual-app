import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split('\n')) {
  const m = line.match(/^(\w+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';
const cos = new COS({ SecretId: env.COS_SECRET_ID, SecretKey: env.COS_SECRET_KEY });

function cosGet(key) {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, data) => {
      if (err) reject(err); else resolve(data.Body.toString('utf-8'));
    });
  });
}
function cosCopyByDownload(src, dst) {
  // Download from src, upload to dst
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: src }, (err, data) => {
      if (err) return reject(err);
      cos.putObject({
        Bucket: BUCKET, Region: REGION, Key: dst,
        Body: data.Body, ContentType: 'audio/mpeg',
      }, (err2, data2) => {
        if (err2) reject(err2); else resolve(data2);
      });
    });
  });
}
function cosDel(key) {
  return new Promise((resolve, reject) => {
    cos.deleteObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}
function cosPut(key, content, ct) {
  return new Promise((resolve, reject) => {
    cos.putObject({ Bucket: BUCKET, Region: REGION, Key: key, Body: Buffer.from(content, 'utf-8'), ContentType: ct }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}

const OLD_KEY = 'hymns/生命诗歌/新歌/331.mp3';
const NEW_KEY = 'hymns/生命诗歌/四、生命旅程的经历/331.mp3';

async function main() {
  // 1. Copy audio to new location
  console.log('Copying audio:', OLD_KEY, '->', NEW_KEY);
  await cosCopyByDownload(OLD_KEY, NEW_KEY);

  // 2. Delete old audio
  console.log('Deleting old:', OLD_KEY);
  await cosDel(OLD_KEY);

  // 3. Update manifest
  const raw = await cosGet('manifest.json');
  const manifest = JSON.parse(raw);
  const h = manifest.hymns.find(h => h.id === 'ls-331');
  if (h) {
    h.audioUrl = '/' + NEW_KEY;
    console.log('Updated ls-331 audioUrl:', h.audioUrl);
  }
  await cosPut('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  console.log('Manifest saved. Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
