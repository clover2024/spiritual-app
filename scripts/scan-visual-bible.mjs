#!/usr/bin/env node
/**
 * Scan a local directory for visual bible images, upload to COS,
 * and generate manifests/visual-bible-manifest.json.
 *
 * Directory structure expected:
 *   <input-dir>/
 *     诗篇23篇/
 *       诗篇23篇-王羲之书法.png
 *     其他文件夹/
 *       image.jpg
 *
 * Usage:
 *   node scripts/scan-visual-bible.mjs <input-dir>              # scan only, generate manifest
 *   node scripts/scan-visual-bible.mjs <input-dir> --upload     # also upload images to COS
 *   node scripts/scan-visual-bible.mjs <input-dir> --push       # upload + push manifest to COS
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');
const MANIFEST_PATH = path.join(MANIFESTS_DIR, 'visual-bible-manifest.json');

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

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

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('Usage: node scripts/scan-visual-bible.mjs <input-dir> [--upload|--push]');
  process.exit(1);
}
const resolvedDir = path.resolve(inputDir);
if (!fs.existsSync(resolvedDir)) {
  console.error(`Directory not found: ${resolvedDir}`);
  process.exit(1);
}

const doUpload = process.argv.includes('--upload') || process.argv.includes('--push');
const doPush = process.argv.includes('--push');

async function uploadFile(localPath, remoteKey) {
  const body = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : 'application/octet-stream';

  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET, Region: REGION, Key: remoteKey,
      Body: body, ContentType: contentType,
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function main() {
  console.log(`Scanning ${resolvedDir} for visual bible images...`);

  const folders = [];
  const items = [];

  const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderName = entry.name;
    const folderPath = path.join(resolvedDir, folderName);
    const imageFiles = fs.readdirSync(folderPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return IMAGE_EXTS.has(ext);
    });

    if (imageFiles.length === 0) continue;

    console.log(`  Folder: ${folderName} (${imageFiles.length} images)`);

    folders.push({
      id: folderName,
      name: folderName,
      count: imageFiles.length,
    });

    for (const imgFile of imageFiles) {
      const ext = path.extname(imgFile);
      const title = path.basename(imgFile, ext);
      const remoteKey = `visual-bible/${folderName}/${imgFile}`;
      const localPath = path.join(folderPath, imgFile);

      const id = 'vb-' + `${folderName}-${title}`
        .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);

      items.push({
        id,
        title,
        folder: folderName,
        imageUrl: `/${remoteKey}`,
      });

      if (doUpload) {
        console.log(`    Uploading ${imgFile}...`);
        await uploadFile(localPath, remoteKey);
        console.log(`    OK: ${remoteKey}`);
      }
    }
  }

  const manifest = { folders, items };

  if (!fs.existsSync(MANIFESTS_DIR)) fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nWrote ${items.length} items in ${folders.length} folders to ${MANIFEST_PATH}`);

  if (doPush) {
    console.log('\nPushing manifest to COS...');
    const body = fs.readFileSync(MANIFEST_PATH);
    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION,
        Key: 'visual-bible/visual-bible-manifest.json',
        Body: body, ContentType: 'application/json; charset=utf-8',
      }, (err, result) => {
        if (err) reject(err);
        else { console.log(`  OK (status ${result.statusCode})`); resolve(); }
      });
    });
  } else {
    console.log('\nTo push to COS:');
    console.log('  node scripts/manifest.mjs push visual-bible');
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
