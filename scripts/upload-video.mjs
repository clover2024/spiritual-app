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
const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';

if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: COS_SECRET_ID and COS_SECRET_KEY must be set in .env');
  process.exit(1);
}

const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

const FILE_PATH = process.argv[2];
if (!FILE_PATH) {
  console.error('Usage: node scripts/upload-video.mjs <file> [--type video|book|hymn] [--title <title>] [--category <category>] [--folder <folder>] [--author <author>]');
  process.exit(1);
}
let fileType = 'video';
let customTitle = null;
let customCategory = null;
let customAuthor = null;
let folder = null;
for (let i = 3; i < process.argv.length; i++) {
  if (process.argv[i] === '--type' && process.argv[i + 1]) fileType = process.argv[++i];
  else if (process.argv[i] === '--title' && process.argv[i + 1]) customTitle = process.argv[++i];
  else if (process.argv[i] === '--category' && process.argv[i + 1]) customCategory = process.argv[++i];
  else if (process.argv[i] === '--folder' && process.argv[i + 1]) folder = process.argv[++i];
  else if (process.argv[i] === '--author' && process.argv[i + 1]) customAuthor = process.argv[++i];
}

const fileName = path.basename(FILE_PATH);
const ext = path.extname(fileName).toLowerCase();
const baseName = path.parse(fileName).name;
const title = customTitle || baseName;

let cosKey;
if (fileType === 'book') {
  cosKey = `/books/${fileName}`;
} else if (fileType === 'hymn') {
  cosKey = `/hymns/${fileName}`;
} else if (folder) {
  cosKey = `/videos/${folder}/${fileName}`;
} else {
  cosKey = `/videos/${fileName}`;
}

function uploadFile() {
  const sizeMB = (fs.statSync(FILE_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Uploading ${FILE_PATH} (${sizeMB} MB) to ${cosKey} ...`);

  return new Promise((resolve, reject) => {
    if (fs.statSync(FILE_PATH).size > 10 * 1024 * 1024) {
      cos.sliceUploadFile({
        Bucket: BUCKET, Region: REGION, Key: cosKey, FilePath: FILE_PATH,
        onProgress: (p) => process.stdout.write(`\rProgress: ${(p.percent * 100).toFixed(0)}%`),
      }, (err, data) => {
        console.log();
        if (err) reject(err); else resolve(data);
      });
    } else {
      cos.putObject({
        Bucket: BUCKET, Region: REGION, Key: cosKey,
        Body: fs.createReadStream(FILE_PATH),
        ContentLength: fs.statSync(FILE_PATH).size,
      }, (err, data) => {
        if (err) reject(err); else resolve(data);
      });
    }
  });
}

function downloadManifest() {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: '/manifest.json' }, (err, data) => {
      if (err) {
        if (err.statusCode === 404) {
          resolve({ videos: [], hymns: [], books: [] });
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
      Bucket: BUCKET, Region: REGION, Key: '/manifest.json',
      Body: JSON.stringify(manifest, null, 2), ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}

async function main() {
  try {
    await uploadFile();
    console.log('Upload complete!');

    const manifest = await downloadManifest();
    const today = new Date().toISOString().split('T')[0];
    const id = fileType + '-' + Date.now() + Math.random().toString(36).slice(2, 5);

    if (fileType === 'book') {
      if (!manifest.books) manifest.books = [];
      const rawExt = ext.replace('.', '') || 'pdf';
      const formatMap = { md: 'markdown' };
      const bookEntry = { id, title, fileUrl: cosKey, format: formatMap[rawExt] || rawExt, date: today };
      if (customAuthor) bookEntry.author = customAuthor;
      manifest.books.push(bookEntry);
      console.log(`Added book: ${title}`);
    } else if (fileType === 'hymn') {
      if (!manifest.hymns) manifest.hymns = [];
      manifest.hymns.push({ id, title, audioUrl: cosKey, lyrics: '', date: today });
      console.log(`Added hymn: ${title}`);
    } else {
      if (!manifest.videos) manifest.videos = [];
      const videoEntry = { id, title, videoUrl: cosKey, date: today };
      if (customCategory) videoEntry.category = customCategory;
      manifest.videos.push(videoEntry);
      console.log(`Added video: ${title}`);
    }

    await uploadManifest(manifest);
    console.log('Manifest updated!');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
