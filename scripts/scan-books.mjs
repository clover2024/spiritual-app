#!/usr/bin/env node
/**
 * Scan COS /books/ directory and generate manifests/books-manifest.json.
 *
 * Usage:
 *   node scripts/scan-books.mjs           # generate manifest locally
 *   node scripts/scan-books.mjs --push    # also push to COS
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');
const MANIFEST_PATH = path.join(MANIFESTS_DIR, 'books-manifest.json');

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';

const env = {};
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
}
const SECRET_ID = process.env.COS_SECRET_ID || env.COS_SECRET_ID;
const SECRET_KEY = process.env.COS_SECRET_KEY || env.COS_SECRET_KEY;
if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: COS_SECRET_ID and COS_SECRET_KEY not found.');
  process.exit(1);
}
const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

function listObjects(prefix) {
  return new Promise((resolve, reject) => {
    const allKeys = [];
    let marker = '';
    function fetchPage() {
      cos.getBucket({ Bucket: BUCKET, Region: REGION, Prefix: prefix, Marker: marker, MaxKeys: 1000 }, (err, data) => {
        if (err) return reject(err);
        for (const item of data.Contents || []) allKeys.push(item.Key);
        if (data.IsTruncated === 'true') {
          marker = data.NextMarker || allKeys[allKeys.length - 1] || '';
          fetchPage();
        } else resolve(allKeys);
      });
    }
    fetchPage();
  });
}

const FORMAT_MAP = {
  '.pdf': 'pdf',
  '.epub': 'epub',
  '.md': 'markdown',
};

// Folder definitions: COS subdirectory prefix → folder metadata
const FOLDER_DEFS = {
  'books/ni-tuosheng/': {
    id: 'ni-tuosheng',
    name: '倪柝声文集',
    description: '倪柝声弟兄著作集',
  },
};

async function main() {
  console.log('Scanning COS /books/ for book files...');
  const keys = await listObjects('books/');
  const bookFiles = keys.filter(k => {
    const ext = path.extname(k).toLowerCase();
    return ext in FORMAT_MAP;
  });
  console.log(`Found ${bookFiles.length} book files`);

  const items = [];
  for (const key of bookFiles) {
    const ext = path.extname(key).toLowerCase();
    const filename = path.basename(key);
    const title = path.basename(key, ext);
    const format = FORMAT_MAP[ext];

    const id = 'book-' + title
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);

    // Determine folder from COS key prefix
    let folder = undefined;
    for (const [prefix, def] of Object.entries(FOLDER_DEFS)) {
      if (key.startsWith(prefix)) {
        folder = def.id;
        break;
      }
    }

    items.push({
      id,
      title,
      fileUrl: '/' + key,
      format,
      ...(folder ? { folder } : {}),
    });
  }

  // Sort by title
  items.sort((a, b) => a.title.localeCompare(b.title, 'zh'));

  // Build folders array from definitions
  const folders = Object.values(FOLDER_DEFS);

  const manifest = { items, folders };

  if (!fs.existsSync(MANIFESTS_DIR)) fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nWrote ${items.length} items to ${MANIFEST_PATH}`);

  const fmts = {};
  items.forEach(i => { fmts[i.format] = (fmts[i.format] || 0) + 1; });
  console.log('Formats:', JSON.stringify(fmts));

  if (process.argv.includes('--push')) {
    console.log('\nPushing to COS...');
    const body = fs.readFileSync(MANIFEST_PATH);
    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION,
        Key: 'books/books-manifest.json',
        Body: body, ContentType: 'application/json; charset=utf-8',
      }, (err, result) => {
        if (err) reject(err);
        else { console.log(`  OK (status ${result.statusCode})`); resolve(); }
      });
    });
  } else {
    console.log('\nTo push to COS:');
    console.log('  node scripts/manifest.mjs push books');
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
