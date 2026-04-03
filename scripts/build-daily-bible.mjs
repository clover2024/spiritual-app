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

const BUCKET = 'clover-1256096296';
const REGION = 'ap-shanghai';
const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });

const MD_DIR = '/Users/clover/ezeo/圣经日日行/downloads/md';
const MP3_DIR = '/Users/clover/ezeo/圣经日日行/downloads/mp3';

// Days per month (Feb = 28)
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const title = yaml.match(/title:\s*(.+)/)?.[1]?.trim();
  return { title: title || '' };
}

// Build the daily-bible.json index
function buildIndex() {
  const months = [];
  let dayNum = 0;

  for (let m = 0; m < 12; m++) {
    const days = [];
    for (let d = 0; d < DAYS_IN_MONTH[m]; d++) {
      dayNum++;
      const num = String(dayNum).padStart(3, '0');
      // Read md file to get title
      const mdFiles = fs.readdirSync(MD_DIR).filter(f => f.startsWith(num + '_'));
      let title = 'Day ' + dayNum;
      if (mdFiles.length > 0) {
        const content = fs.readFileSync(path.join(MD_DIR, mdFiles[0]), 'utf-8');
        const fm = parseFrontmatter(content);
        if (fm.title) title = fm.title;
      }

      const dateStr = (m + 1) + '月' + (d + 1) + '日';
      days.push({
        day: dayNum,
        date: dateStr,
        title,
        audioUrl: '/daily/mp3/' + num + '.mp3',
        contentUrl: '/daily/md/' + mdFiles[0],
      });
    }
    months.push({ month: m + 1, name: (m + 1) + '月', days });
  }

  return { months };
}

// Upload files in batches
async function uploadBatch(files, concurrency = 5) {
  let uploaded = 0;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, Math.min(i + concurrency, files.length));
    await Promise.all(batch.map(({ localPath, cosKey }) =>
      new Promise((resolve, reject) => {
        cos.sliceUploadFile({
          Bucket: BUCKET, Region: REGION, Key: cosKey, FilePath: localPath,
          onProgress: (p) => process.stdout.write('\r' + path.basename(localPath) + ': ' + (p.percent * 100).toFixed(0) + '%'),
        }, (err, data) => {
          if (err) { reject(err); return; }
          uploaded++;
          if (uploaded % 20 === 0 || uploaded === files.length) {
            console.log('\nUploaded ' + uploaded + '/' + files.length);
          }
          resolve(data);
        });
      })
    ));
  }
}

async function main() {
  // Step 1: Build index
  console.log('Building daily-bible.json...');
  const index = buildIndex();
  const jsonPath = path.join(__dirname, '..', 'daily-bible.json');
  fs.writeFileSync(jsonPath, JSON.stringify(index, null, 2));
  console.log('Index written to ' + jsonPath);

  // Step 2: Upload daily-bible.json
  console.log('Uploading daily-bible.json...');
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: BUCKET, Region: REGION, Key: '/daily-bible.json',
      Body: fs.readFileSync(jsonPath), ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err); else resolve(data);
    });
  });
  console.log('daily-bible.json uploaded!');

  // Step 3: Upload MD files
  console.log('\n--- Uploading MD files ---');
  const mdFiles = fs.readdirSync(MD_DIR).filter(f => f.endsWith('.md')).sort();
  const mdUploads = mdFiles.map(f => ({
    localPath: path.join(MD_DIR, f),
    cosKey: '/daily/md/' + f,
  }));
  await uploadBatch(mdUploads, 10);

  // Step 4: Upload MP3 files
  console.log('\n--- Uploading MP3 files ---');
  const mp3Files = fs.readdirSync(MP3_DIR).filter(f => f.endsWith('.mp3')).sort();
  const mp3Uploads = mp3Files.map(f => ({
    localPath: path.join(MP3_DIR, f),
    cosKey: '/daily/mp3/' + f,
  }));
  await uploadBatch(mp3Uploads, 5);

  console.log('\nAll done!');
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
