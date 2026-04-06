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

cos.getObject({ Bucket: B, Region: R, Key: '/manifest.json' }, (err, data) => {
  if (err) { console.error(err); process.exit(1); }
  const manifest = JSON.parse(data.Body.toString());

  console.log('=== VIDEOS with /books/ path ===');
  manifest.videos?.forEach((v, i) => {
    if (v.videoUrl && v.videoUrl.includes('/books/')) {
      console.log(`  [${i}]`, JSON.stringify(v));
    }
  });

  console.log('\n=== BOOKS ===');
  manifest.books?.forEach((b, i) => {
    console.log(`  [${i}]`, JSON.stringify(b));
  });

  console.log('\n=== All video titles ===');
  manifest.videos?.forEach((v, i) => {
    console.log(`  [${i}] ${v.title} -> ${v.videoUrl}`);
  });
});
