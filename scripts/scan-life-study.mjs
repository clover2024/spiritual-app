#!/usr/bin/env node
/**
 * Scan COS audios/ directory for life study MP3 files and generate life-study-manifest.json.
 *
 * Expected COS structure:
 *   audios/新约生命读经/01马太福音/Mat-001.mp3
 *   audios/旧约生命读经/01创世记/Gen-001.mp3
 *
 * Usage:
 *   node scripts/scan-life-study.mjs           # scan and write manifests/life-study-manifest.json
 *   node scripts/scan-life-study.mjs --push    # also push to COS after scanning
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');
const MANIFEST_PATH = path.join(MANIFESTS_DIR, 'life-study-manifest.json');

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';
const PREFIX = 'audios/';

// Load credentials from .env
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
  console.error('Error: COS_SECRET_ID and COS_SECRET_KEY not found in .env or environment.');
  process.exit(1);
}

const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

/**
 * List all objects under a given prefix, handling pagination.
 */
function listObjects(prefix) {
  return new Promise((resolve, reject) => {
    const allKeys = [];
    let marker = '';

    function fetchPage() {
      cos.getBucket({
        Bucket: BUCKET,
        Region: REGION,
        Prefix: prefix,
        Marker: marker,
        MaxKeys: 1000,
      }, (err, data) => {
        if (err) return reject(err);
        const contents = data.Contents || [];
        for (const item of contents) {
          allKeys.push(item.Key);
        }
        if (data.IsTruncated === 'true') {
          marker = data.NextMarker || contents[contents.length - 1]?.Key || '';
          fetchPage();
        } else {
          resolve(allKeys);
        }
      });
    }

    fetchPage();
  });
}

/**
 * Map Chinese book folder prefix to a readable book name.
 * e.g. "01马太福音" -> "马太福音"
 */
function extractBookName(folderName) {
  // Remove leading digits
  return folderName.replace(/^\d+/, '') || folderName;
}

/**
 * Map abbreviated filename to title.
 * e.g. "Mat-001.mp3" -> "马太福音 第001篇"
 * Uses the parent folder name to get the book name.
 */
function buildTitle(bookFolder, filename) {
  const bookName = extractBookName(bookFolder);
  const baseName = path.basename(filename, '.mp3');
  // Extract number from filename like "Mat-001" or "Gen-001"
  const numMatch = baseName.match(/(\d+)$/);
  const num = numMatch ? numMatch[1] : baseName;
  return `${bookName} 第${num.padStart(3, '0')}篇`;
}

/**
 * Determine folder id from path.
 * "audios/新约生命读经/..." -> "new-testament"
 * "audios/旧约生命读经/..." -> "old-testament"
 */
function getFolderId(pathStr) {
  if (pathStr.includes('/新约生命读经/')) return 'new-testatement';
  if (pathStr.includes('/旧约生命读经/')) return 'old-testament';
  return '';
}

async function main() {
  console.log('Scanning COS bucket for MP3 files under audios/ ...');
  const allKeys = await listObjects(PREFIX);
  console.log(`Found ${allKeys.length} total objects under ${PREFIX}`);

  // Filter for MP3 files in 新约生命读经 or 旧约生命读经 subfolders
  const mp3Keys = allKeys.filter(key => {
    return key.endsWith('.mp3') &&
      (key.includes('/新约生命读经/') || key.includes('/旧约生命读经/'));
  });
  console.log(`Found ${mp3Keys.length} life study MP3 files`);

  // Parse into items
  const items = [];
  let idCounter = 0;

  for (const key of mp3Keys) {
    // Parse path: audios/新约生命读经/01马太福音/Mat-001.mp3
    const parts = key.replace(/^audios\//, '').split('/');
    if (parts.length < 3) {
      console.warn(`  Skipping unexpected path: ${key}`);
      continue;
    }

    const testament = parts[0]; // 新约生命读经 or 旧约生命读经
    const bookFolder = parts[1]; // 01马太福音
    const filename = parts[2]; // Mat-001.mp3

    const folderId = testament === '新约生命读经' ? 'new-testament' : 'old-testament';
    const id = `ls-${String(++idCounter).padStart(4, '0')}`;
    const title = buildTitle(bookFolder, filename);
    const audioUrl = `/${key}`;

    items.push({
      id,
      title,
      folder: folderId,
      book: bookFolder,
      audioUrl,
    });
  }

  // Sort items: new testament first, then old testament; within each, by book folder then by title
  items.sort((a, b) => {
    if (a.folder !== b.folder) {
      return a.folder === 'new-testament' ? -1 : 1;
    }
    const bookCompare = a.book.localeCompare(b.book, 'zh-CN');
    if (bookCompare !== 0) return bookCompare;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  // Re-assign IDs after sorting
  let newId = 0;
  for (const item of items) {
    item.id = `ls-${String(++newId).padStart(4, '0')}`;
  }

  const manifest = {
    folders: [
      { id: 'new-testament', name: '新约生命读经' },
      { id: 'old-testament', name: '旧约生命读经' },
    ],
    items,
  };

  // Write local manifest
  if (!fs.existsSync(MANIFESTS_DIR)) {
    fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nWrote ${items.length} items to ${MANIFEST_PATH}`);

  // Print summary
  const newCount = items.filter(i => i.folder === 'new-testament').length;
  const oldCount = items.filter(i => i.folder === 'old-testament').length;
  console.log(`  新约: ${newCount} 篇`);
  console.log(`  旧约: ${oldCount} 篇`);

  // Push to COS if requested
  if (process.argv.includes('--push')) {
    console.log('\nPushing to COS...');
    const body = fs.readFileSync(MANIFEST_PATH);
    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET,
        Region: REGION,
        Key: 'life-study/life-study-manifest.json',
        Body: body,
        ContentType: 'application/json; charset=utf-8',
      }, (err, result) => {
        if (err) reject(err);
        else {
          console.log(`  OK (status ${result.statusCode})`);
          resolve();
        }
      });
    });
    console.log('Push complete.');
  } else {
    console.log('\nTo push to COS, run:');
    console.log('  node scripts/manifest.mjs push life-study');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
