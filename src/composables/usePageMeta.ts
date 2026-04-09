const DEFAULT_TITLE = '橄榄山';
const DEFAULT_DESCRIPTION = '视频、诗歌、书报、每日读经、福音文章，你的属灵陪伴';
const DEFAULT_IMAGE = 'https://clover-1256096296.cos.ap-shanghai.myqcloud.com/images/share-icon.png';

function getOrCreateMeta(attr: string, attrValue: string): HTMLMetaElement {
  let el = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  return el;
}

export function setPageMeta(options: {
  title: string;
  description?: string;
  image?: string;
}) {
  const { title, description, image } = options;

  document.title = title;

  getOrCreateMeta('property', 'og:title').content = title;
  getOrCreateMeta('property', 'og:description').content = description || DEFAULT_DESCRIPTION;
  getOrCreateMeta('property', 'og:image').content = image || DEFAULT_IMAGE;
}

export function resetPageMeta() {
  document.title = DEFAULT_TITLE;

  const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
  if (ogTitle) ogTitle.content = DEFAULT_TITLE;

  const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
  if (ogDesc) ogDesc.content = DEFAULT_DESCRIPTION;

  const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
  if (ogImage) ogImage.content = DEFAULT_IMAGE;
}
