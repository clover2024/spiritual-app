import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
      if (err) reject(err);
      else resolve(data.Body.toString('utf-8'));
    });
  });
}

function cosPut(key, content, contentType) {
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET, Region: REGION, Key: key,
      Body: Buffer.from(content, 'utf-8'),
      ContentType: contentType,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function main() {
  const raw = await cosGet('manifest.json');
  const manifest = JSON.parse(raw);

  let updated = 0;
  for (const h of manifest.hymns) {
    if (h.id.startsWith('ls-') && h.category && h.category.startsWith('生命诗歌/')) {
      h.category = '生命诗歌';
      updated++;
    }
  }

  console.log(`Updated ${updated} categories to '生命诗歌'`);

  // Verify subfolder logic
  const sample = manifest.hymns.filter(h => h.id.startsWith('ls-')).slice(0, 3);
  for (const h of sample) {
    console.log(`  ${h.id}: category=${h.category} audioUrl=${h.audioUrl}`);
  }

  await cosPut('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  console.log('Manifest saved');
}

main().catch(e => { console.error(e); process.exit(1); });
