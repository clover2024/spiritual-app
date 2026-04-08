import { setPageMeta } from './usePageMeta';

const WX_SIGN_URL = import.meta.env.VITE_WX_SIGN_URL || '';
const SHARE_ICON = 'https://clover-1256096296.cos.ap-shanghai.myqcloud.com/images/share-icon.png';

interface WxConfig {
  appId: string;
  timestamp: string;
  nonceStr: string;
  signature: string;
}

declare global {
  interface Window {
    wx: any;
  }
}

let wxLoaded = false;
let wxReady = false;
let pendingShare: { title: string; desc: string; link: string; imgUrl: string } | null = null;

function loadWxSdk(): Promise<void> {
  if (wxLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.onload = () => { wxLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load WeChat JS-SDK'));
    document.head.appendChild(script);
  });
}

async function initWxConfig() {
  if (!WX_SIGN_URL) return;
  if (wxReady) return;

  try {
    const url = window.location.href.split('#')[0];
    const res = await fetch(`${WX_SIGN_URL}?url=${encodeURIComponent(url)}`);
    const data: WxConfig & { error?: string } = await res.json();

    if (data.error) {
      console.error('WX sign error:', data.error);
      return;
    }

    window.wx.config({
      debug: false,
      appId: data.appId,
      timestamp: data.timestamp,
      nonceStr: data.nonceStr,
      signature: data.signature,
      jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
    });

    window.wx.ready(() => {
      wxReady = true;
      if (pendingShare) {
        applyShareData(pendingShare);
        pendingShare = null;
      }
    });

    window.wx.error((err: any) => {
      console.error('WX config error:', err);
    });
  } catch (e) {
    console.error('WX init failed:', e);
  }
}

function applyShareData(data: { title: string; desc: string; link: string; imgUrl: string }) {
  if (!window.wx) return;
  window.wx.updateAppMessageShareData({
    title: data.title,
    desc: data.desc,
    link: data.link,
    imgUrl: data.imgUrl,
  });
  window.wx.updateTimelineShareData({
    title: data.title,
    link: data.link,
    imgUrl: data.imgUrl,
  });
}

export async function setupWxShare(options: {
  title: string;
  description?: string;
  image?: string;
}) {
  const { title, description, image } = options;
  const link = window.location.href;
  const imgUrl = image || SHARE_ICON;
  const desc = description || '';

  // 更新 meta 标签
  setPageMeta({ title, description, image });

  // 检测是否在微信浏览器中
  const ua = navigator.userAgent.toLowerCase();
  const isWechat = ua.includes('micromessenger');
  if (!isWechat) return;

  // 加载 SDK 并初始化
  try {
    await loadWxSdk();
    await initWxConfig();

    const shareData = { title, desc, link, imgUrl };
    if (wxReady) {
      applyShareData(shareData);
    } else {
      pendingShare = shareData;
    }
  } catch (e) {
    // 非 微信 环境下静默失败
  }
}
