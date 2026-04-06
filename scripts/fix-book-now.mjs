import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const B = 'clover-1256096296', R = 'ap-shanghai';
const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });
async function fix() {
  const mData = await new Promise((resolve, reject) => {
    cos.getObject({ Bucket: B, Region: R, Key: '/manifest.json' }, (err, data) => err ? reject(err) : resolve(data));
  });
  const manifest = JSON.parse(mData.Body.toString());
  const bookIdx = manifest.videos.findIndex(v => v.videoUrl && v.videoUrl.includes('/books/'));
  if (bookIdx === -1) { console.log('Nothing to fix.'); return; }
  const entry = manifest.videos.splice(bookIdx, 1)[0];
  console.log('Found in videos:', entry.title);
  if (!manifest.books) manifest.books = [];
  manifest.books.push({ id: entry.id, title: entry.title, fileUrl: entry.videoUrl, format: 'pdf', date: entry.date });
  console.log('Moved to books:', entry.title);
  await new Promise((resolve, reject) => {
    cos.putObject({ Bucket: B, Region: R, Key: '/manifest.json', Body: JSON.stringify(manifest, null, 2), ContentType: 'application/json' }, (err, data) => err ? reject(err) : resolve(data));
  });
  console.log('Manifest fixed!');
}
fix().catch(e => { console.error(e.message || e); process.exit(1); });
