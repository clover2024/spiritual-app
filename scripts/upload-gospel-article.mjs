import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].trim();
  }
}

const SECRET_ID = process.env.COS_SECRET_ID;
const SECRET_KEY = process.env.COS_SECRET_KEY;
const BUCKET = 'clover-1256096296';
const REGION = 'ap-shanghai';

if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: COS_SECRET_ID and COS_SECRET_KEY must be set in .env');
  process.exit(1);
}

const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

const FILE_PATH = process.argv[2];
if (!FILE_PATH) {
  console.error('Usage: node scripts/upload-gospel-article.mjs <markdown-file> [--title <title>] [--author <author>] [--summary <summary>] [--audio <audio-url>]');
  process.exit(1);
}

let customTitle = null;
let customAuthor = 'FY基站';
let customSummary = null;
let audioUrl = null;

for (let i = 3; i < process.argv.length; i++) {
  if (process.argv[i] === '--title' && process.argv[i + 1]) customTitle = process.argv[++i];
  else if (process.argv[i] === '--author' && process.argv[i + 1]) customAuthor = process.argv[++i];
  else if (process.argv[i] === '--summary' && process.argv[i + 1]) customSummary = process.argv[++i];
  else if (process.argv[i] === '--audio' && process.argv[i + 1]) audioUrl = process.argv[++i];
}

const fileName = path.basename(FILE_PATH);
const title = customTitle || path.parse(fileName).name;
const cosKey = `/gospel/${fileName}`;

function uploadFile() {
  const sizeMB = (fs.statSync(FILE_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Uploading ${FILE_PATH} (${sizeMB} MB) to ${cosKey} ...`);

  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: cosKey,
      Body: fs.createReadStream(FILE_PATH),
      ContentLength: fs.statSync(FILE_PATH).size,
      ContentType: 'text/markdown; charset=utf-8',
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function downloadManifest() {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: '/manifest.json' }, (err, data) => {
      if (err) {
        if (err.statusCode === 404) {
          resolve({ videos: [], hymns: [], books: [], gospelArticles: [] });
        } else reject(err);
      } else {
        resolve(JSON.parse(data.Body.toString()));
      }
    });
  });
}

function uploadManifest(manifest) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: '/manifest.json',
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function main() {
  try {
    await uploadFile();
    console.log('Upload complete!');

    const manifest = await downloadManifest();
    const today = new Date().toISOString().split('T')[0];
    const id = 'gospel-' + Date.now() + Math.random().toString(36).slice(2, 5);

    if (!manifest.gospelArticles) manifest.gospelArticles = [];

    const entry = {
      id,
      title,
      author: customAuthor,
      contentUrl: cosKey,
      date: today,
    };
    if (customSummary) entry.summary = customSummary;
    if (audioUrl) entry.audioUrl = audioUrl;

    manifest.gospelArticles.push(entry);
    console.log(`Added gospel article: ${title}`);

    await uploadManifest(manifest);
    console.log('Manifest updated!');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
