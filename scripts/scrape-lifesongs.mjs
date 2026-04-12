#!/usr/bin/env node
/**
 * Scrape lifesongs.cn hymns s001-s790
 * Downloads audio MP3s and extracts lyrics + metadata
 * Uploads to COS under /hymns/生命诗歌/ folder
 * Updates manifest.json
 *
 * Usage:
 *   node scripts/scrape-lifesongs.mjs [--start N] [--end N] [--dry-run] [--skip-audio] [--skip-manifest]
 *
 * Options:
 *   --start N        Start from hymn number N (default: 1)
 *   --end N          End at hymn number N (default: 790)
 *   --dry-run        Only scrape pages, don't upload
 *   --skip-audio     Skip downloading/uploading audio files
 *   --skip-manifest  Skip manifest update
 *   --batch-size N   Upload manifest every N items (default: 50)
 */

import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env file with COS_SECRET_ID and COS_SECRET_KEY');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';
const cos = new COS({ SecretId: env.COS_SECRET_ID, SecretKey: env.COS_SECRET_KEY });

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const idx = args.indexOf('--' + name);
  return idx >= 0 && idx + 1 < args.length ? parseInt(args[idx + 1]) : def;
};
const hasFlag = (name) => args.includes('--' + name);

const START = getArg('start', 1);
const END = getArg('end', 790);
const DRY_RUN = hasFlag('dry-run');
const SKIP_AUDIO = hasFlag('skip-audio');
const SKIP_MANIFEST = hasFlag('skip-manifest');
const BATCH_SIZE = getArg('batch-size', 50);

// Temp dir for downloads
const TMP_DIR = path.resolve(__dirname, '..', '.tmp-lifesongs');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ---- HTML parsing helpers ----

function extractTitle(html) {
  const m = html.match(/<h1[^>]*class="article-title"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
  if (m) return m[1].trim();
  const m2 = html.match(/<title>([^<]+)-生命诗歌<\/title>/);
  if (m2) return m2[1].trim();
  return '';
}

function extractCategory(html) {
  // From breadcrumb: <a href="https://lifesongs.cn/praiseworship">一、颂赞的歌声</a>
  const m = html.match(/<a[^>]*href="https:\/\/lifesongs\.cn\/\w+"[^>]*>([^<]+)<\/a>\s*<\/li>\s*<li>\s*正文/);
  if (m) return m[1].trim();
  // Fallback from meta keywords
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
  // Two formats:
  // 1. <details><summary>点击展开歌词</summary>...<p>...</p>...</details>
  // 2. <h2>✪歌词文本</h2><section>...<p>...</p>...</section>

  let raw = '';

  // Try format 1: <details>
  const m1 = html.match(/<details>\s*<summary>[\s\S]*?<\/summary>\s*([\s\S]*?)<\/details>/);
  if (m1) {
    raw = m1[1];
  }

  // Try format 2: section after ✪歌词文本
  if (!raw) {
    const m2 = html.match(/✪歌词文本[\s\S]*?<section[^>]*>([\s\S]*?)<\/section>/);
    if (m2) {
      raw = m2[1];
    }
  }

  if (!raw) return '';

  // Extract text from <p> tags
  const lines = [];
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pm;
  while ((pm = pRegex.exec(raw)) !== null) {
    let text = pm[1]
      .replace(/<[^>]+>/g, '')  // strip HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .trim();
    if (text) lines.push(text);
  }

  // Separate into stanzas (verse lines vs metadata)
  const stanzas = [];
  let currentStanza = [];

  for (const line of lines) {
    // Skip meter line (e.g., "8.7.8.7.8.7." or "8.5.8.3．")
    if (/^\d+\.\d+/.test(line) && !/^[一二三四五六七八九十]/.test(line)) {
      if (currentStanza.length) {
        stanzas.push(currentStanza.join('\n'));
        currentStanza = [];
      }
      continue;
    }
    // Check if it's a verse start (Chinese number prefix like 一、二、)
    if (/^[一二三四五六七八九十]+[、．.]/.test(line) || /^[一二三四五六七八九十]+$/.test(line)) {
      if (currentStanza.length) {
        stanzas.push(currentStanza.join('\n'));
        currentStanza = [];
      }
    }
    // Metadata line at end (starts with + or 词/曲 info)
    if (line.startsWith('+') || /^词[：:]/.test(line) || /^曲[：:]/.test(line)) {
      if (currentStanza.length) {
        stanzas.push(currentStanza.join('\n'));
        currentStanza = [];
      }
      continue;
    }
    currentStanza.push(line);
  }
  if (currentStanza.length) {
    stanzas.push(currentStanza.join('\n'));
  }

  return stanzas.join('\n\n');
}

function extractAuthor(html) {
  // From keywords meta: "Henry T. Smart,波纳"
  const m = html.match(/<meta\s+name='keywords'\s+content='([^']+)'/);
  if (!m) return '';
  const parts = m[1].split(',').map(s => s.trim());
  // Filter out category names
  return parts.filter(p => !/^[一二三四五六七八九十]+、/.test(p) && p !== '生命诗歌' && p.length > 0).join(', ') || '';
}

// ---- Fetch page ----

const fetchWithTimeout = (url, timeout = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal, headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }}).finally(() => clearTimeout(timer));
};

async function fetchPage(num) {
  const padded = String(num).padStart(3, '0');
  const url = `https://lifesongs.cn/hymns/s${padded}.html`;
  const tmpFile = path.join(TMP_DIR, `page-${padded}.html`);

  // Use cached file if exists
  if (fs.existsSync(tmpFile)) {
    return fs.readFileSync(tmpFile, 'utf-8');
  }

  for (let retry = 0; retry < 5; retry++) {
    try {
      if (retry > 0) {
        const delay = Math.min(retry * 2000, 10000);
        await new Promise(r => setTimeout(r, delay));
      }
      const resp = await fetchWithTimeout(url, 20000);
      if (!resp.ok) {
        if (resp.status === 404) {
          console.log(`  [SKIP] s${padded} - 404`);
          return null;
        }
        continue;
      }
      const html = await resp.text();
      if (html && html.includes('article-title')) {
        fs.writeFileSync(tmpFile, html);
        return html;
      }
      if (html && html.length < 500) {
        console.log(`  [SKIP] s${padded} - empty page (${html.length} bytes)`);
        return null;
      }
    } catch (e) {
      console.log(`  [RETRY] s${padded} attempt ${retry + 1}: ${e.message}`);
    }
  }
  console.log(`  [FAIL] s${padded} - could not fetch after 5 retries`);
  return null;
}

// ---- Download audio ----

async function downloadAudio(num) {
  const padded = String(num).padStart(3, '0');
  const audioUrl = `https://cdn.lifesongs.cn/audio/lifesongs/mp3/${padded}.mp3`;
  const tmpFile = path.join(TMP_DIR, `audio-${padded}.mp3`);

  if (fs.existsSync(tmpFile) && fs.statSync(tmpFile).size > 1000) {
    return tmpFile;
  }

  for (let retry = 0; retry < 3; retry++) {
    try {
      if (retry > 0) await new Promise(r => setTimeout(r, retry * 2000));
      const resp = await fetchWithTimeout(audioUrl, 60000);
      if (!resp.ok) {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        return null;
      }
      const arrayBuf = await resp.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length > 1000) {
        fs.writeFileSync(tmpFile, buf);
        return tmpFile;
      }
      return null;
    } catch (e) {
      console.log(`  [AUDIO-RETRY] s${padded} attempt ${retry + 1}: ${e.message}`);
    }
  }
  return null;
}

// ---- COS helpers ----

function cosPutObject(key, filePath, contentType) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentLength: fs.statSync(filePath).size,
      ContentType: contentType,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function cosGetObject(key) {
  return new Promise((resolve, reject) => {
    cos.getObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data.Body.toString('utf-8'));
    });
  });
}

function cosPutObjectContent(key, content, contentType) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: Buffer.from(content, 'utf-8'),
      ContentType: contentType,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// ---- Main ----

async function main() {
  console.log(`=== Lifesongs.cn Scraper ===`);
  console.log(`Range: s${String(START).padStart(3, '0')} to s${String(END).padStart(3, '0')}`);
  console.log(`Options: dry-run=${DRY_RUN}, skip-audio=${SKIP_AUDIO}, skip-manifest=${SKIP_MANIFEST}`);
  console.log(`Tmp dir: ${TMP_DIR}\n`);

  // Load existing manifest
  let manifest = { hymns: [] };
  if (!SKIP_MANIFEST) {
    try {
      const raw = await cosGetObject('manifest.json');
      manifest = JSON.parse(raw);
      console.log(`Loaded manifest: ${manifest.hymns?.length || 0} existing hymns`);
    } catch (e) {
      console.error('Failed to load manifest:', e.message);
      process.exit(1);
    }
  }

  const existingHymnIds = new Set((manifest.hymns || []).map(h => h.id));
  const newHymns = [];
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let num = START; num <= END; num++) {
    const padded = String(num).padStart(3, '0');
    const hymnId = `ls-${padded}`;

    // Skip if already in manifest
    if (existingHymnIds.has(hymnId)) {
      skipped++;
      if (num % 50 === 0) process.stdout.write(`\n  [${num}/${END}] `);
      continue;
    }

    if (num % 10 === 1 || num === START) process.stdout.write(`[${num}/${END}] `);

    // Fetch page
    const html = await fetchPage(num);
    if (!html) {
      failed++;
      continue;
    }

    // Extract metadata
    const title = extractTitle(html);
    const category = extractCategory(html);
    const lyrics = extractLyrics(html);
    const author = extractAuthor(html);

    if (!title) {
      console.log(`\n  [SKIP] s${padded} - no title found`);
      failed++;
      continue;
    }

    // Keep number prefix in title, e.g. "001 荣耀荣耀归于父神"
    const cleanTitle = title.trim();

    const hymnEntry = {
      id: hymnId,
      title: cleanTitle,
      category: '生命诗歌/' + (category || '未分类'),
      lyrics: lyrics || '',
      date: new Date().toISOString().slice(0, 10),
    };
    if (author) hymnEntry.author = author;

    // Download & upload audio
    if (!SKIP_AUDIO && !DRY_RUN) {
      const audioFile = await downloadAudio(num);
      if (audioFile) {
        const cosKey = `hymns/生命诗歌/${category || '未分类'}/${padded}.mp3`;
        try {
          await cosPutObject(cosKey, audioFile, 'audio/mpeg');
          hymnEntry.audioUrl = `/${cosKey}`;
        } catch (e) {
          console.log(`\n  [AUDIO-UPLOAD-FAIL] s${padded}: ${e.message}`);
        }
      } else {
        console.log(`\n  [NO-AUDIO] s${padded}`);
      }
    } else if (!SKIP_AUDIO) {
      // Dry run: check if audio would be available
      const audioFile = await downloadAudio(num);
      if (audioFile) {
        hymnEntry.audioUrl = `/hymns/生命诗歌/${category || '未分类'}/${padded}.mp3`;
      }
    }

    newHymns.push(hymnEntry);
    uploaded++;

    // Batch upload manifest periodically
    if (!DRY_RUN && !SKIP_MANIFEST && newHymns.length > 0 && uploaded % BATCH_SIZE === 0) {
      console.log(`\n  [BATCH] Uploading manifest with ${uploaded} new hymns...`);
      manifest.hymns = [...(manifest.hymns || []), ...newHymns.splice(0)];
      await cosPutObjectContent('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
      console.log(`  [BATCH] Manifest updated. Total hymns: ${manifest.hymns.length}`);
    }

    // Delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Final manifest upload
  if (!DRY_RUN && !SKIP_MANIFEST && newHymns.length > 0) {
    manifest.hymns = [...(manifest.hymns || []), ...newHymns];
    await cosPutObjectContent('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
    console.log(`\n[FINAL] Manifest updated. Total hymns: ${manifest.hymns.length}`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (DRY_RUN && newHymns.length > 0) {
    const sample = newHymns.slice(0, 3);
    console.log(`\nSample entries:`);
    for (const h of sample) {
      console.log(`  ${h.id}: ${h.title} [${h.category}] audio=${!!h.audioUrl} lyrics=${h.lyrics.length}chars`);
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
