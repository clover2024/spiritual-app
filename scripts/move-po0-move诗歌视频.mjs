import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
) if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].trim();
  }
}

const BUCKET = 'clover-1256096296';
const REGION = 'ap-shanghai';
const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });

function downloadManifest() {
  return new Promise((resolve, reject) => {
    cos.getObject({ Bucket: BUCKET, Region: REGION, Key: '/manifest.json' }, (err) => {
      if (err.statusCode === 404) {
        resolve({ videos: [], });
      } else {
      resolve(manifest);
    }
  });
}

  manifest.videos = manifest.videos || [];
  for (const v of videos.filter(v =>
    v.category === '诗歌视频' && v.videoUrl && !v.videoUrl.includes('/诗歌视频/')
  );
  if (toMove.length === 0) {
    console.log('没有需要移动的诗歌视频');
    return;
  }

  console.log(`找到 ${toMove.length} 个诗歌视频需要移动:\n`);

  for (const video of toMove) {
    const oldKey = video.videoUrl;
    const fileName = oldKey.split('/').pop();
    const newKey = `/videos/诗歌视频/${fileName}`;

    console.log(`    ${oldKey} -> ${newKey}`);
    await copyObject(oldKey, newKey);
    await deleteObject(oldKey);
    video.videoUrl = newKey;

    console.log('    done');
  }

  await uploadManifest(manifest);
  console.log(`\nManifest updated! Moved ${toMove.length} files files`);
}

 main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
}
