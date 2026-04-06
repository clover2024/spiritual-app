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

async function run() {
  // download manifest
  const mData = await new Promise((resolve, reject) => {
    cos.getObject({ Bucket: B, Region: R, Key: '/manifest.json' }, (err, data) => err ? reject(err) : resolve(data));
  });
  const manifest = JSON.parse(mData.Body.toString());

  // Find the wrongly added video entry
  const idx = manifest.videos.findIndex(v => v.videoUrl && v.videoUrl.includes('/books/'));
  if (idx === -1) {
    console.log('No misfiled book entry found in videos');
    process.exit(0);
  }
  const entry = manifest.videos.splice(idx, 1)[0];
  console.log('Removed from videos:', entry.title);

  // Add to books
  if (!manifest.books) manifest.books = [];
  const ext = entry.videoUrl.split('.').pop();
  manifest.books.push({
    id: entry.id,
    title: entry.title,
    fileUrl: entry.videoUrl,
    format: ext || 'pdf',
    date: entry.date,
  });
  console.log('Added to books:', entry.title);

  // Upload manifest
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: B, Region: R, Key: '/manifest.json',
      Body: JSON.stringify(manifest, null, 2), ContentType: 'application/json',
    }, (err, data) => err ? reject(err) : resolve(data));
  });
  console.log('Manifest updated!');
}

run().catch(e => { console.error(e.message || e); process.exit(1); });
