#!/usr/bin/env node
/**
 * Re-parse lyrics from cached HTML pages and update manifest.
 * Fixes:
 *   - Remove verse numbers (一、二、三...) from line starts
 *   - Handle <p><p> nesting in section format
 *   - Remove meter lines (8.7.8.7.双 etc)
 *   - Remove title repeat, special tags (特, 副 prefix kept as 副歌 marker)
 *   - Remove metadata (+词/曲 info)
 *
 * Usage: node scripts/fix-ls-lyrics.mjs [--dry-run]
 */

import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const TMP_DIR = path.resolve(__dirname, '..', '.tmp-lifesongs');

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split('\n')) {
  const m = line.match(/^(\w+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const BUCKET = 'clover-1313238640';
const REGION = 'ap-nanjing';
const cos = new COS({ SecretId: env.COS_SECRET_ID, SecretKey: env.COS_SECRET_KEY });

function cosGet(key) {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: key }, (err, data) => {
      if (err) reject(err); else resolve(data.Body.toString('utf-8'));
    });
  });
}

function cosPut(key, content, ct) {
  return new Promise((resolve, reject) => {
    cos.putObject({ Bucket: BUCKET, Region: REGION, Key: key, Body: Buffer.from(content, 'utf-8'), ContentType: ct }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
}

function extractLyrics(html, title) {
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

  // Fix nested <p><p>...</p> by replacing <p><p> with <p>
  raw = raw.replace(/<p>\s*<p>/g, '<p>');

  // Extract text from <p> tags
  const lines = [];
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let pm;
  while ((pm = pRegex.exec(raw)) !== null) {
    let text = pm[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .trim();
    if (text) lines.push(text);
  }

  if (lines.length === 0) return '';

  // Get clean title (without leading number)
  const cleanTitle = title ? title.replace(/^\d+\s*/, '').trim() : '';

  // Chinese verse number regex: 一 二 三 ... 十一 十二 at line start
  const verseNumRe = /^[一二三四五六七八九十]+$/;
  // Known verse numbers map
  const numMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12 };
  // Meter line: e.g. "8.7.8.7.双" "8.5.8.3." "11.9.11.9.副" "特副" "特"
  const meterRe = /^[\d]+\.[\d]+/;

  const stanzas = [];
  let currentStanza = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip title repeat line (exact match with clean title)
    if (cleanTitle && line === cleanTitle) continue;

    // Skip standalone verse number line (e.g. just "一" or "二")
    if (verseNumRe.test(line)) continue;

    // Skip meter lines (e.g. "8.7.8.7.双", "8.5.8.3.")
    if (meterRe.test(line)) continue;

    // Skip standalone special tags: "特", "特副", "副" (just tags, no lyrics)
    if (/^[特副]+$/.test(line) || /^特副$/.test(line) || /^副$/.test(line)) continue;

    // Remove verse number prefix: "一当头一次..." -> add "一" as separate line + "当头一次..."
    // Try longest match first (十一, 十二) then single char (一, 二...)
    for (const prefix of ['十一', '十二', '十', '一', '二', '三', '四', '五', '六', '七', '八', '九']) {
      if (line.startsWith(prefix) && line.length > prefix.length) {
        // Start new stanza with verse number as first line
        if (currentStanza.length) {
          stanzas.push(currentStanza.join('\n'));
          currentStanza = [];
        }
        currentStanza.push(prefix);
        line = line.substring(prefix.length);
        break;
      }
    }

    // Handle "副" prefix (chorus indicator)
    if (line.startsWith('副')) {
      const rest = line.substring(1);
      if (rest.length > 0) {
        // "副歌词..." -> keep as is, or split?
        // Let's keep "副" as a separate marker line
        if (currentStanza.length) {
          stanzas.push(currentStanza.join('\n'));
          currentStanza = [];
        }
        currentStanza.push('副');
        currentStanza.push(rest);
        continue;
      }
    }

    // Remove metadata at end (starts with +)
    if (line.startsWith('+')) continue;
    // Also handle inline metadata: "歌词+词：..."
    const metaIdx = line.indexOf('+词');
    if (metaIdx >= 0) {
      line = line.substring(0, metaIdx).trim();
      if (!line) continue;
    }
    const metaIdx2 = line.indexOf('+曲');
    if (metaIdx2 >= 0) {
      line = line.substring(0, metaIdx2).trim();
      if (!line) continue;
    }

    if (line) currentStanza.push(line);
  }

  if (currentStanza.length) {
    stanzas.push(currentStanza.join('\n'));
  }

  return stanzas.join('\n\n');
}

async function main() {
  console.log('Loading manifest...');
  const raw = await cosGet('manifest.json');
  const manifest = JSON.parse(raw);

  const lsHymns = manifest.hymns.filter(h => h.id.startsWith('ls-'));
  console.log(`Found ${lsHymns.length} lifesongs hymns`);

  let updated = 0;
  let noPage = 0;

  for (const hymn of lsHymns) {
    const num = hymn.id.replace('ls-', '');
    const padded = num.padStart(3, '0');
    const pageFile = path.join(TMP_DIR, `page-${padded}.html`);

    if (!fs.existsSync(pageFile)) {
      noPage++;
      continue;
    }

    const html = fs.readFileSync(pageFile, 'utf-8');
    const newLyrics = extractLyrics(html, hymn.title);

    if (newLyrics !== hymn.lyrics) {
      hymn.lyrics = newLyrics;
      updated++;
    }
  }

  console.log(`Updated: ${updated}, No cached page: ${noPage}`);

  // Show some samples
  const samples = [1, 10, 50, 100, 200, 400, 600, 670, 700];
  console.log('\nSample lyrics:');
  for (const n of samples) {
    const id = 'ls-' + String(n).padStart(3, '0');
    const h = manifest.hymns.find(h => h.id === id);
    if (h) {
      console.log(`\n--- ${h.title} ---`);
      console.log(h.lyrics.substring(0, 200));
      if (h.lyrics.length > 200) console.log('...');
    }
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Not uploading');
    return;
  }

  await cosPut('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  console.log('\nManifest uploaded');
}

main().catch(e => { console.error(e); process.exit(1); });
