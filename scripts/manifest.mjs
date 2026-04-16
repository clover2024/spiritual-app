#!/usr/bin/env node
/**
 * Manifest sync tool: push/pull manifest files between local (manifests/) and COS.
 * Usage:
 *   node scripts/manifest.mjs push gospel   — push gospel-manifest.json to COS
 *   node scripts/manifest.mjs push main     — push manifest.json to COS
 *   node scripts/manifest.mjs push all      — push both
 *   node scripts/manifest.mjs pull gospel   — pull gospel-manifest.json from COS
 *   node scripts/manifest.mjs pull main     — pull manifest.json from COS
 *   node scripts/manifest.mjs pull all      — pull both
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';

// Read credentials from .env or environment
let SecretId = process.env.COS_SECRET_ID;
let SecretKey = process.env.COS_SECRET_KEY;

if (!SecretId || !SecretKey) {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const m = line.match(/^COS_SECRET_ID=(.+)/);
      if (m) SecretId = m[1].trim();
      const m2 = line.match(/^COS_SECRET_KEY=(.+)/);
      if (m2) SecretKey = m2[1].trim();
    }
  }
}

if (!SecretId || !SecretKey) {
  console.error('Error: COS_SECRET_ID and COS_SECRET_KEY not found. Set them in .env or environment.');
  process.exit(1);
}

const cos = new COS({ SecretId, SecretKey });

const FILES = {
  gospel: { local: 'gospel-manifest.json', remote: 'gospel/gospel-manifest.json' },
  main: { local: 'manifest.json', remote: 'manifest.json' },
};

function ensureDir() {
  if (!fs.existsSync(MANIFESTS_DIR)) fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
}

async function pushOne(name) {
  const cfg = FILES[name];
  if (!cfg) { console.error(`Unknown manifest: ${name}`); return; }
  const localPath = path.join(MANIFESTS_DIR, cfg.local);
  if (!fs.existsSync(localPath)) { console.error(`Local file not found: ${localPath}`); return; }
  const body = fs.readFileSync(localPath);
  console.log(`Pushing ${cfg.local} → ${cfg.remote} (${(body.length / 1024).toFixed(1)} KB)`);
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET, Region: REGION, Key: cfg.remote,
      Body: body, ContentType: 'application/json; charset=utf-8',
    }, (err, result) => {
      if (err) reject(err);
      else { console.log(`  OK (status ${result.statusCode})`); resolve(); }
    });
  });
}

async function pullOne(name) {
  const cfg = FILES[name];
  if (!cfg) { console.error(`Unknown manifest: ${name}`); return; }
  ensureDir();
  const localPath = path.join(MANIFESTS_DIR, cfg.local);
  console.log(`Pulling ${cfg.remote} → ${cfg.local}`);
  await new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: cfg.remote }, (err, data) => {
      if (err) reject(err);
      else {
        fs.writeFileSync(localPath, data.Body);
        console.log(`  OK (${(data.Body.length / 1024).toFixed(1)} KB)`);
        resolve();
      }
    });
  });
}

const [,, action, target] = process.argv;
const targets = target === 'all' ? Object.keys(FILES) : [target];

if (!action || !target) {
  console.log('Usage: node scripts/manifest.mjs <push|pull> <gospel|main|all>');
  process.exit(1);
}

(async () => {
  for (const t of targets) {
    if (action === 'push') await pushOne(t);
    else if (action === 'pull') await pullOne(t);
    else { console.error(`Unknown action: ${action}`); process.exit(1); }
  }
  console.log('Done.');
})();
