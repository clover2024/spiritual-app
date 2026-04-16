import type { Manifest, VideoItem, BookItem, HymnItem, DailyBibleMonth, GospelArticle, GospelFolder } from '@/types';

const COS_BASE_URL = import.meta.env.VITE_COS_BASE_URL || '';
const MANIFEST_PATH = '/manifest.json';

let cachedManifest: Manifest | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cachedGospelArticles: GospelArticle[] | null = null;
let cachedGospelFolders: GospelFolder[] | null = null;
let gospelCacheTimestamp = 0;
const GOSPEL_CACHE_TTL = 5 * 60 * 1000;

function getBaseUrl(): string {
  if (COS_BASE_URL) return COS_BASE_URL;
  const bucket = import.meta.env.VITE_COS_BUCKET;
  const region = import.meta.env.VITE_COS_REGION;
  if (bucket && region) {
    return `https://${bucket}.cos.${region}.myqcloud.com`;
  }
  return '';
}

function resolveUrl(path: string | undefined, baseUrl: string): string | undefined {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  return `${baseUrl}${path}`;
}

export async function fetchManifest(): Promise<Manifest> {
  const now = Date.now();
  if (cachedManifest && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedManifest;
  }

  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    console.warn('COS 未配置，使用示例数据');
    return getSampleManifest();
  }

  try {
    const response = await fetch(`${baseUrl}${MANIFEST_PATH}?t=${now}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest: Manifest = await response.json();
    manifest.videos?.forEach(v => {
      v.videoUrl = resolveUrl(v.videoUrl, baseUrl) || '';
      v.coverUrl = resolveUrl(v.coverUrl, baseUrl);
    });
    manifest.books?.forEach(b => {
      b.fileUrl = resolveUrl(b.fileUrl, baseUrl) || '';
      b.coverUrl = resolveUrl(b.coverUrl, baseUrl);
    });
    manifest.hymns?.forEach(h => {
      h.audioUrl = resolveUrl(h.audioUrl, baseUrl);
      h.coverUrl = resolveUrl(h.coverUrl, baseUrl);
      h.audioVersions?.forEach(v => {
        v.url = resolveUrl(v.url, baseUrl) || '';
      });
    });
    cachedManifest = manifest;
    cacheTimestamp = now;
    return manifest;
  } catch (error) {
    console.error('获取 manifest 失败:', error);
    return getSampleManifest();
  }
}

export async function getVideos(): Promise<VideoItem[]> {
  const manifest = await fetchManifest();
  return manifest.videos || [];
}

export async function getBooks(): Promise<BookItem[]> {
  const manifest = await fetchManifest();
  return manifest.books || [];
}

export async function getHymns(): Promise<HymnItem[]> {
  const manifest = await fetchManifest();
  return manifest.hymns || [];
}

export async function getGospelArticles(): Promise<GospelArticle[]> {
  const now = Date.now();
  if (cachedGospelArticles && (now - gospelCacheTimestamp) < GOSPEL_CACHE_TTL) {
    return cachedGospelArticles;
  }

  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const response = await fetch(`${baseUrl}/gospel/gospel-manifest.json?t=${now}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const articles: GospelArticle[] = data.articles || [];
    articles.forEach(g => {
      g.contentUrl = resolveUrl(g.contentUrl, baseUrl) || '';
      g.audioUrl = resolveUrl(g.audioUrl, baseUrl);
      g.coverUrl = resolveUrl(g.coverUrl, baseUrl);
    });
    cachedGospelArticles = articles;
    cachedGospelFolders = data.folders || [];
    gospelCacheTimestamp = now;
    return articles;
  } catch (error) {
    console.error('获取福音 manifest 失败:', error);
    return [];
  }
}

export async function getGospelFolders(): Promise<GospelFolder[]> {
  if (!cachedGospelFolders) await getGospelArticles();
  return cachedGospelFolders || [];
}

let cachedDailyBible: DailyBibleMonth[] | null = null;
let dailyBibleTimestamp = 0;
const DAILY_BIBLE_TTL = 30 * 60 * 1000;

export async function getDailyBible(): Promise<DailyBibleMonth[]> {
  const now = Date.now();
  if (cachedDailyBible && (now - dailyBibleTimestamp) < DAILY_BIBLE_TTL) {
    return cachedDailyBible;
  }

  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const response = await fetch(`${baseUrl}/daily-bible.json?t=${now}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const months: DailyBibleMonth[] = data.months || data;
    months.forEach(m => {
      m.days?.forEach(d => {
        d.audioUrl = resolveUrl(d.audioUrl, baseUrl) || '';
        d.contentUrl = resolveUrl(d.contentUrl, baseUrl) || '';
      });
    });
    cachedDailyBible = months;
    dailyBibleTimestamp = now;
    return months;
  } catch (error) {
    console.error('获取每日读经失败:', error);
    return [];
  }
}

export function getFullUrl(relativePath: string): string {
  const baseUrl = getBaseUrl();
  if (!baseUrl || relativePath.startsWith('http')) return relativePath;
  return `${baseUrl}${relativePath}`;
}

function getSampleManifest(): Manifest {
  return {
    videos: [
      {
        id: 'sample-1',
        title: '示例视频 - 请配置 COS 后替换',
        description: '请在腾讯云 COS 根目录放置 manifest.json 文件来配置实际内容',
        videoUrl: '',
        coverUrl: '',
      },
    ],
    books: [
      {
        id: 'sample-1',
        title: '示例书报 - 请配置 COS 后替换',
        author: '示例作者',
        description: '请在腾讯云 COS 根目录放置 manifest.json 文件来配置实际内容',
        fileUrl: '',
        format: 'pdf',
        coverUrl: '',
      },
    ],
    hymns: [
      {
        id: 'sample-1',
        title: '示例诗歌 - 请配置 COS 后替换',
        author: '示例作者',
        category: '赞美',
        lyrics: '第一节歌词示例\n第二节歌词示例\n\n请在腾讯云 COS 根目录放置 manifest.json 文件来配置实际内容',
      },
    ],
  };
}
