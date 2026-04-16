#!/usr/bin/env node
/**
 * Generate lifesongs-manifest.json from cached HTML pages and COS audio files.
 *
 * Reads .tmp-lifesongs/page-NNN.html for metadata (title, lyrics, author, category),
 * scans COS /hymns/生命诗歌/ for audio file paths,
 * and generates manifests/lifesongs-manifest.json.
 *
 * Usage:
 *   node scripts/scan-lifesongs.mjs           # generate manifest locally
 *   node scripts/scan-lifesongs.mjs --push    # also push to COS
 */
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT, 'manifests');
const MANIFEST_PATH = path.join(MANIFESTS_DIR, 'lifesongs-manifest.json');
const TMP_DIR = path.join(ROOT, '.tmp-lifesongs');

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';

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
  console.error('Error: COS_SECRET_ID and COS_SECRET_KEY not found.');
  process.exit(1);
}
const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

// ---- List COS objects with pagination ----
function listObjects(prefix) {
  return new Promise((resolve, reject) => {
    const allKeys = [];
    let marker = '';
    function fetchPage() {
      cos.getBucket({ Bucket: BUCKET, Region: REGION, Prefix: prefix, Marker: marker, MaxKeys: 1000 }, (err, data) => {
        if (err) return reject(err);
        const contents = data.Contents || [];
        for (const item of contents) allKeys.push(item.Key);
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

// ---- HTML metadata extraction (from scrape-lifesongs.mjs) ----

function extractTitle(html) {
  const m = html.match(/<h1[^>]*class="article-title"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
  if (m) return m[1].trim();
  const m2 = html.match(/<title>([^<]+)-生命诗歌<\/title>/);
  if (m2) return m2[1].trim();
  return '';
}

function extractCategory(html) {
  const m = html.match(/<a[^>]*href="https:\/\/lifesongs\.cn\/\w+"[^>]*>([^<]+)<\/a>\s*<\/li>\s*<li>\s*正文/);
  if (m) return m[1].trim();
  const m2 = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/);
  if (m2) {
    const parts = m2[1].split(',');
    for (const p of parts) {
      if (/^[一二三四五六七八九十]+、/.test(p.trim())) return p.trim();
    }
  }
  return '';
}

function extractLyrics(html) {
  let raw = '';
  const m1 = html.match(/<details>\s*<summary>[\s\S]*?<\/summary>\s*([\s\S]*?)<\/details>/);
  if (m1) raw = m1[1];
  if (!raw) {
    const m2 = html.match(/✪歌词文本[\s\S]*?<section[^>]*>([\s\S]*?)<\/section>/);
    if (m2) raw = m2[1];
  }
  if (!raw) return '';

  const lines = [];
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pm;
  while ((pm = pRegex.exec(raw)) !== null) {
    let text = pm[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
      .trim();
    if (text) lines.push(text);
  }

  const stanzas = [];
  let currentStanza = [];
  for (const line of lines) {
    if (/^\d+\.\d+/.test(line) && !/^[一二三四五六七八九十]/.test(line)) {
      if (currentStanza.length) { stanzas.push(currentStanza.join('\n')); currentStanza = []; }
      continue;
    }
    if (/^[一二三四五六七八九十]+[、．.]/.test(line) || /^[一二三四五六七八九十]+$/.test(line)) {
      if (currentStanza.length) { stanzas.push(currentStanza.join('\n')); currentStanza = []; }
    }
    if (line.startsWith('+') || /^词[：:]/.test(line) || /^曲[：:]/.test(line)) {
      if (currentStanza.length) { stanzas.push(currentStanza.join('\n')); currentStanza = []; }
      continue;
    }
    currentStanza.push(line);
  }
  if (currentStanza.length) stanzas.push(currentStanza.join('\n'));
  return stanzas.join('\n\n');
}

function extractAuthor(html) {
  const m = html.match(/<meta\s+name='keywords'\s+content='([^']+)'/);
  if (!m) return '';
  const parts = m[1].split(',').map(s => s.trim());
  return parts.filter(p => !/^[一二三四五六七八九十]+、/.test(p) && p !== '生命诗歌' && p.length > 0).join(', ') || '';
}

// ---- Main ----

async function main() {
  // 1. Scan COS for audio files under /hymns/生命诗歌/
  console.log('Scanning COS /hymns/生命诗歌/ for audio files...');
  const cosKeys = await listObjects('hymns/生命诗歌/');
  const mp3Map = new Map(); // padded number -> COS key
  for (const key of cosKeys) {
    if (!key.endsWith('.mp3')) continue;
    const filename = path.basename(key, '.mp3');
    const num = parseInt(filename, 10);
    if (!isNaN(num)) {
      mp3Map.set(String(num).padStart(3, '0'), '/' + key);
    }
  }
  console.log(`Found ${mp3Map.size} MP3 files on COS`);

  // 2. Collect unique categories from HTML pages
  const categorySet = new Map(); // name -> id
  const items = [];

  // 3. Process each HTML page
  const pageFiles = fs.readdirSync(TMP_DIR).filter(f => f.startsWith('page-') && f.endsWith('.html')).sort();
  console.log(`Processing ${pageFiles.length} HTML pages...`);

  for (const pageFile of pageFiles) {
    const numStr = pageFile.replace('page-', '').replace('.html', '');
    const html = fs.readFileSync(path.join(TMP_DIR, pageFile), 'utf-8');

    const title = extractTitle(html);
    const category = extractCategory(html);
    const lyrics = extractLyrics(html);
    const author = extractAuthor(html);
    const audioUrl = mp3Map.get(numStr) || '';

    if (!title) {
      console.warn(`  Skipping ${pageFile}: no title`);
      continue;
    }

    // Derive category from COS audio path (more reliable than HTML breadcrumb)
    // Path pattern: /hymns/生命诗歌/一、颂赞的歌声/001.mp3
    let cosCategory = '';
    if (audioUrl) {
      const pathParts = audioUrl.split('/');
      // Find the segment after "生命诗歌"
      const idx = pathParts.indexOf('生命诗歌');
      if (idx >= 0 && idx + 1 < pathParts.length) {
        cosCategory = pathParts[idx + 1];
      }
    }

    const catName = cosCategory || category || '未分类';
    if (!categorySet.has(catName)) {
      categorySet.set(catName, catName);
    }

    items.push({
      id: `ls-${numStr}`,
      title,
      author: author || undefined,
      category: catName,
      lyrics: lyrics || undefined,
      audioUrl: audioUrl || undefined,
    });
  }

  // Sort items by number
  items.sort((a, b) => {
    const na = parseInt(a.id.replace('ls-', ''), 10);
    const nb = parseInt(b.id.replace('ls-', ''), 10);
    return na - nb;
  });

  // Build folders from categories, sorted by Chinese number prefix
  const cnNumMap = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  };
  function getCnNumOrder(name) {
    const m = name.match(/^([一二三四五六七八九十]+)、/);
    if (m && cnNumMap[m[1]]) return cnNumMap[m[1]];
    return 999;
  }

  const folders = Array.from(categorySet.keys())
    .sort((a, b) => {
      const oa = getCnNumOrder(a);
      const ob = getCnNumOrder(b);
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b, 'zh-CN');
    })
    .map(name => ({
      id: name,
      name,
      count: items.filter(i => i.category === name).length,
    }));

  // Remove undefined fields
  for (const item of items) {
    if (!item.author) delete item.author;
    if (!item.lyrics) delete item.lyrics;
    if (!item.audioUrl) delete item.audioUrl;
  }

  const manifest = { folders, items };

  // Write local manifest
  if (!fs.existsSync(MANIFESTS_DIR)) fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nWrote ${items.length} items to ${MANIFEST_PATH}`);
  console.log(`Folders (${folders.length}):`);
  for (const f of folders) console.log(`  ${f.name}: ${f.count} 首`);
  const withAudio = items.filter(i => i.audioUrl).length;
  const withLyrics = items.filter(i => i.lyrics).length;
  console.log(`有音频: ${withAudio}, 有歌词: ${withLyrics}`);

  // Push to COS if requested
  if (process.argv.includes('--push')) {
    console.log('\nPushing to COS...');
    const body = fs.readFileSync(MANIFEST_PATH);
    await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: BUCKET, Region: REGION,
        Key: 'lifesongs/lifesongs-manifest.json',
        Body: body, ContentType: 'application/json; charset=utf-8',
      }, (err, result) => {
        if (err) reject(err);
        else { console.log(`  OK (status ${result.statusCode})`); resolve(); }
      });
    });
  } else {
    console.log('\nTo push to COS:');
    console.log('  node scripts/manifest.mjs push lifesongs');
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
