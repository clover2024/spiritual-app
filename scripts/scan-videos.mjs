#!/usr/bin/env node
/**
 * Scan COS /videos/ directory and generate manifests/videos-manifest.json.
 *
 * Usage:
 *   node scripts/scan-videos.mjs           # generate manifest locally
 *   node scripts/scan-videos.mjs --push    # also push to COS
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');
const MANIFEST_PATH = path.join(MANIFESTS_DIR, 'videos-manifest.json');

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';

// Load credentials
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
        } else {
          resolve(allKeys);
        }
      });
    }
    fetchPage();
  });
}

async function main() {
  console.log('Scanning COS /videos/ for MP4 files...');
  const keys = await listObjects('videos/');
  const mp4s = keys.filter(k => k.endsWith('.mp4'));
  console.log(`Found ${mp4s.length} MP4 files`);

  const items = [];
  for (const key of mp4s) {
    const filename = path.basename(key, '.mp4');
    const parts = key.split('/');
    let category = '';
    if (parts.length >= 3) {
      category = parts[1];
    }

    const id = 'v-' + key
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);

    items.push({
      id,
      title: filename,
      videoUrl: '/' + key,
      ...(category ? { category } : {}),
    });
  }

  // Sort: by category, then title
  items.sort((a, b) => {
    const catA = a.category || '';
    const catB = b.category || '';
    if (catA !== catB) return catA.localeCompare(catB, 'zh');
    return a.title.localeCompare(b.title, 'zh');
  });

  const manifest = { items };

  if (!fs.existsSync(MANIFESTS_DIR)) fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nWrote ${items.length} items to ${MANIFEST_PATH}`);

  // Stats
  const cats = {};
  items.forEach(i => {
    const c = i.category || '(未分类)';
    cats[c] = (cats[c] || 0) + 1;
  });
  console.log(`Categories (${Object.keys(cats).length}):`);
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  // Push to COS if requested
  if (process.argv.includes('--push')) {
    console.log('\nPushing to COS...');
    const body = fs.readFileSync(MANIFEST_PATH);
    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION,
        Key: 'videos/videos-manifest.json',
        Body: body, ContentType: 'application/json; charset=utf-8',
      }, (err, result) => {
        if (err) reject(err);
        else { console.log(`  OK (status ${result.statusCode})`); resolve(); }
      });
    });
  } else {
    console.log('\nTo push to COS:');
    console.log('  node scripts/manifest.mjs push videos');
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
