import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
}

const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });
const BUCKET = 'clover-1256096296';
const REGION = 'ap-shanghai';

function copyObj(src, dst) {
  return new Promise((resolve, reject) => {
    cos.putObjectCopy({ Bucket: BUCKET, Region: REGION, Key: dst, CopySource: `${BUCKET}.cos.${REGION}.myqcloud.com${src}` }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}

function deleteObj(key) {
  return new Promise((resolve, reject) => {
    cos.deleteObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}

function getManifest() {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: '/manifest.json' }, (err, data) => {
      if (err) reject(err); else resolve(JSON.parse(data.Body.toString()));
    });
  });
}

function putManifest(m) {
  return new Promise((resolve, reject) => {
    cos.putObject({ Bucket: BUCKET, Region: REGION, Key: '/manifest.json', Body: JSON.stringify(m, null, 2), ContentType: 'application/json' }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}

async function main() {
  // Swap: article-1 (currently 二) <-> article-2 (currently 一)
  // Step 1: article-1 -> temp
  console.log('Copying article-1.md to /gospel/temp-swap.md ...');
  await copyObj('/gospel/article-1.md', '/gospel/temp-swap.md');

  // Step 2: article-2 -> article-1 (now 一 is article-1)
  console.log('Copying article-2.md to article-1.md ...');
  await copyObj('/gospel/article-2.md', '/gospel/article-1.md');

  // Step 3: temp -> article-2 (now 二 is article-2)
  console.log('Copying temp-swap.md to article-2.md ...');
  await copyObj('/gospel/temp-swap.md', '/gospel/article-2.md');

  // Step 4: delete temp
  console.log('Deleting temp file ...');
  await deleteObj('/gospel/temp-swap.md');

  // Step 5: update manifest
  const manifest = await getManifest();
  const articles = manifest.gospelArticles || [];

  articles.forEach(a => {
    if (a.title.includes('（一）')) a.contentUrl = '/gospel/article-1.md';
    if (a.title.includes('（二）')) a.contentUrl = '/gospel/article-2.md';
  });

  // Sort: （一）first
  articles.sort((a, b) => {
    if (a.title.includes('（一）')) return -1;
    if (b.title.includes('（一）')) return 1;
    return 0;
  });

  await putManifest(manifest);
  console.log('Done! Files swapped and manifest updated.');
  articles.forEach(a => console.log(`  ${a.contentUrl} -> ${a.title}`));
}

main().catch(e => { console.error(e); process.exit(1); });
