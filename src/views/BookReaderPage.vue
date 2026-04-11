<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/books" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ book?.title || '阅读' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :scroll-y="isPdf ? false : true">
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="book">
        <!-- PDF Reader -->
        <div v-if="book.format === 'pdf' && book.fileUrl" class="reader-container">
          <div v-if="pdfError" class="pdf-error">
            <p>{{ pdfError }}</p>
            <ion-button size="small" @click="pdfError = ''; initPdf()">重试</ion-button>
          </div>
          <template v-else>
            <div class="pdf-controls">
              <ion-button size="small" @click="prevPage" :disabled="currentPage <= 1">
                <ion-icon :icon="arrowBackOutline" slot="icon-only"></ion-icon>
              </ion-button>
              <div class="page-jump">
                <input
                  type="number"
                  class="page-input"
                  :value="currentPage"
                  :min="1"
                  :max="totalPages"
                  @change="jumpToPage($event)"
                  @keyup.enter="jumpToPage($event)"
                />
                <span class="page-sep">/</span>
                <span class="page-total">{{ totalPages }}</span>
              </div>
              <ion-button size="small" @click="nextPage" :disabled="currentPage >= totalPages">
                <ion-icon :icon="arrowForwardOutline" slot="icon-only"></ion-icon>
              </ion-button>
              <ion-button size="small" @click="downloadPdf" class="download-btn">
                <ion-icon :icon="downloadOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
            <div class="pdf-slider-wrap">
              <input
                type="range"
                class="pdf-slider"
                :min="1"
                :max="totalPages"
                :value="currentPage"
                @input="sliderJump($event)"
              />
            </div>
            <div class="pdf-viewer" ref="pdfContainer">
              <canvas ref="pdfCanvas"></canvas>
            </div>
          </template>
        </div>

        <!-- Markdown Reader -->
        <div v-if="book.format === 'markdown' && book.fileUrl" class="markdown-container ion-padding">
          <div v-if="mdLoading" class="md-loading">
            <ion-spinner></ion-spinner>
            <p>加载中...</p>
          </div>
          <div v-else-if="mdError" class="md-error">
            <p>{{ mdError }}</p>
            <ion-button size="small" @click="mdError = ''; initMarkdown()">重试</ion-button>
          </div>
          <template v-else-if="mdHtml">
            <div class="markdown-content" ref="mdContentEl" v-html="mdHtml"></div>
            <!-- TOC floating button -->
            <div
              v-if="tocItems.length > 0"
              class="toc-fab"
              @click="showToc = !showToc"
            >
              <ion-icon :icon="listOutline" />
            </div>
            <!-- TOC overlay -->
            <div v-if="showToc" class="toc-overlay" @click="showToc = false"></div>
            <!-- TOC panel -->
            <div v-if="showToc" class="toc-panel">
              <div class="toc-header">
                <span>目录</span>
                <ion-icon :icon="closeOutline" class="toc-close" @click="showToc = false" />
              </div>
              <div class="toc-list">
                <div
                  v-for="(item, idx) in tocItems"
                  :key="idx"
                  class="toc-item"
                  :class="'toc-h' + item.level, { 'toc-active': activeTocId === item.id }"
                  @click="scrollToHeading(item.id)"
                >{{ item.text }}</div>
              </div>
            </div>
          </template>
        </div>

        <!-- EPUB Reader -->
        <div v-if="book.format === 'epub' && book.fileUrl" class="epub-container">
          <div class="epub-controls">
            <ion-button size="small" @click="epubPrev">
              <ion-icon :icon="arrowBackOutline" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button size="small" @click="epubNext">
              <ion-icon :icon="arrowForwardOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
          <div ref="epubContainer" class="epub-viewer"></div>
        </div>

        <!-- No file URL -->
        <div v-if="!book.fileUrl" class="empty-state">
          <ion-icon :icon="bookOutline" class="empty-icon"></ion-icon>
          <p>文件地址不可用</p>
        </div>
      </template>

      <div v-if="!loading && !book" class="empty-state">
        <p>未找到该书报</p>
      </div>
    </ion-content>
    <BottomNav />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonSpinner,
  IonButton,
} from '@ionic/vue';
import { arrowBackOutline, arrowForwardOutline, bookOutline, downloadOutline, listOutline, closeOutline } from 'ionicons/icons';
import { marked } from 'marked';
import { getBooks } from '@/services/cos';
import { setPageMeta, resetPageMeta } from '@/composables/usePageMeta';
import { setupWxShare } from '@/composables/useWxShare';
import BottomNav from '@/components/BottomNav.vue';
import type { BookItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const book = ref<BookItem | null>(null);
const isPdf = computed(() => book.value?.format === 'pdf');

// PDF state
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
const pdfContainer = ref<HTMLDivElement | null>(null);
const currentPage = ref(1);
const totalPages = ref(0);
const pdfError = ref('');
let pdfDoc: any = null;

// EPUB state
const epubContainer = ref<HTMLDivElement | null>(null);
let epubBook: any = null;
let epubRendition: any = null;

// Markdown state
const mdLoading = ref(false);
const mdError = ref('');
const mdHtml = ref('');
const mdContentEl = ref<HTMLDivElement | null>(null);
const showToc = ref(false);
const activeTocId = ref('');

interface TocItem {
  id: string;
  text: string;
  level: number;
}
const tocItems = ref<TocItem[]>([]);

// Configure marked renderer to add ids to headings
const mdRenderer = new marked.Renderer();
let tocCounter = 0;
mdRenderer.heading = function (data: { text: string; depth: number }) {
  const id = 'md-h-' + tocCounter++;
  tocItems.value.push({ id, text: data.text, level: data.depth });
  return `<h${data.depth} id="${id}">${data.text}</h${data.depth}>`;
};
marked.use({ renderer: mdRenderer });

function scrollToHeading(id: string) {
  showToc.value = false;
  activeTocId.value = id;
  nextTick(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

onMounted(async () => {
  try {
    const books = await getBooks();
    const id = route.params.id as string;
    book.value = books.find((b) => b.id === id) || null;

    if (book.value) {
      const desc = [book.value.author, book.value.description].filter(Boolean).join(' - ');
      setupWxShare({ title: book.value.title, description: desc });
    }

    if (book.value?.fileUrl) {
      await nextTick();
      if (book.value.format === 'pdf') {
        await initPdf();
      } else if (book.value.format === 'epub') {
        await initEpub();
      } else if (book.value.format === 'markdown') {
        await initMarkdown();
      }
    }
  } catch (e) {
    console.error('加载书报详情失败:', e);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  savePage();
  resetPageMeta();
  if (pdfDoc) {
    pdfDoc.destroy();
    pdfDoc = null;
  }
  if (epubBook) {
    epubBook.destroy();
    epubBook = null;
    epubRendition = null;
  }
});

// ==================== PDF ====================
async function initPdf() {
  if (!book.value?.fileUrl) return;
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    pdfDoc = await pdfjsLib.getDocument(book.value.fileUrl).promise;

    totalPages.value = pdfDoc.numPages;
    const startPage = restorePage();
    currentPage.value = startPage;
    await renderPage(startPage);
  } catch (e: any) {
    console.error('PDF 加载失败:', e);
    pdfError.value = e?.message || 'PDF 加载失败';
  }
}

async function renderPage(pageNum: number) {
  if (!pdfDoc || !pdfCanvas.value) return;
  const page = await pdfDoc.getPage(pageNum);
  const container = pdfContainer.value;
  const canvas = pdfCanvas.value;
  if (!container || !canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const containerWidth = container.clientWidth || 375;
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = containerWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';

  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(dpr, dpr);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;
}

function getProgressKey(id: string) {
  return `pdf-progress:${id}`;
}

function savePage() {
  if (book.value && currentPage.value > 0 && currentPage.value < totalPages.value) {
    localStorage.setItem(getProgressKey(book.value.id), String(currentPage.value));
  } else if (book.value) {
    localStorage.removeItem(getProgressKey(book.value.id));
  }
}

function restorePage(): number {
  if (!book.value) return 1;
  const saved = localStorage.getItem(getProgressKey(book.value.id));
  if (saved) {
    const p = parseInt(saved, 10);
    if (p > 1 && p <= totalPages.value) return p;
  }
  return 1;
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    renderPage(currentPage.value);
    savePage();
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    renderPage(currentPage.value);
    savePage();
  }
}

function jumpToPage(event: Event) {
  const input = event.target as HTMLInputElement;
  const p = parseInt(input.value, 10);
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
    renderPage(p);
    savePage();
  } else {
    input.value = String(currentPage.value);
  }
}

let sliderTimer = 0;
function sliderJump(event: Event) {
  const input = event.target as HTMLInputElement;
  const p = parseInt(input.value, 10);
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
    // Throttle rendering for slider drag
    clearTimeout(sliderTimer);
    sliderTimer = window.setTimeout(() => {
      renderPage(p);
      savePage();
    }, 150);
  }
}

function downloadPdf() {
  if (!book.value?.fileUrl) return;
  const link = document.createElement('a');
  link.href = book.value.fileUrl;
  link.download = (book.value.title || 'document') + '.pdf';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== Markdown ====================
async function initMarkdown() {
  if (!book.value?.fileUrl) return;
  mdLoading.value = true;
  mdError.value = '';
  tocItems.value = [];
  tocCounter = 0;
  try {
    const resp = await fetch(book.value.fileUrl);
    if (!resp.ok) throw new Error('加载失败');
    const text = await resp.text();
    mdHtml.value = await marked.parse(text);
  } catch (e: any) {
    console.error('Markdown 加载失败:', e);
    mdError.value = e?.message || '内容加载失败';
  } finally {
    mdLoading.value = false;
  }
}

// ==================== EPUB ====================
async function initEpub() {
  if (!book.value?.fileUrl || !epubContainer.value) return;
  try {
    const ePub = (await import('epubjs')).default;
    epubBook = ePub(book.value.fileUrl);
    epubRendition = epubBook.renderTo(epubContainer.value, {
      width: '100%',
      height: '100%',
      spread: 'none',
    });
    await epubRendition.display();
  } catch (e) {
    console.error('EPUB 加载失败:', e);
  }
}

function epubPrev() {
  epubRendition?.prev();
}

function epubNext() {
  epubRendition?.next();
}
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.reader-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pdf-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--ion-color-danger);
  gap: 12px;
}

.pdf-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  flex-shrink: 0;
  background: var(--ion-background-color);
}

.download-btn {
  margin-left: auto;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-input {
  width: 52px;
  padding: 4px 6px;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  background: var(--ion-background-color);
  color: var(--ion-text-color);
  -webkit-appearance: none;
  appearance: none;
}

.page-input::-webkit-inner-spin-button,
.page-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.page-sep {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.page-total {
  font-size: 14px;
  color: var(--ion-color-medium);
  min-width: 28px;
}

.pdf-slider-wrap {
  padding: 0 16px 8px;
  flex-shrink: 0;
  background: var(--ion-background-color);
}

.pdf-slider {
  width: 100%;
  height: 28px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
}

.pdf-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: var(--ion-color-light-shade);
}

.pdf-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  cursor: pointer;
  margin-top: -9px;
}

.pdf-viewer {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 8px;
}

.pdf-viewer canvas {
  display: block;
}

.epub-container {
  display: flex;
  flex-direction: column;
  height: calc(100% - 1px);
}

.epub-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.epub-viewer {
  flex: 1;
  overflow: hidden;
}

.markdown-container {
  min-height: 100%;
}

.md-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.md-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
  color: var(--ion-color-danger);
  gap: 12px;
}

.markdown-content {
  line-height: 1.8;
  font-size: 16px;
  color: var(--ion-text-color);
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
}

.markdown-content :deep(h1) {
  font-size: 22px;
  font-weight: 700;
  margin: 24px 0 12px;
}

.markdown-content :deep(h2) {
  font-size: 20px;
  font-weight: 700;
  margin: 20px 0 10px;
}

.markdown-content :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 8px;
}

.markdown-content :deep(p) {
  margin-bottom: 12px;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--ion-color-primary);
  margin: 12px 0;
  padding: 8px 16px;
  background: var(--ion-color-light);
  border-radius: 4px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin-bottom: 4px;
}

.markdown-content :deep(strong) {
  font-weight: 700;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--ion-color-light-shade);
  margin: 20px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* TOC floating button */
.toc-fab {
  position: fixed;
  right: 16px;
  bottom: 80px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 100;
}

.toc-fab:active {
  opacity: 0.8;
}

/* TOC overlay */
.toc-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
}

/* TOC panel */
.toc-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 80vw);
  background: #fff;
  z-index: 201;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
  animation: toc-slide-in 0.2s ease-out;
}

@media (prefers-color-scheme: dark) {
  .toc-panel {
    background: #1e1e1e;
  }
}

@keyframes toc-slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--ion-color-light-shade);
  flex-shrink: 0;
}

.toc-close {
  font-size: 22px;
  color: var(--ion-color-medium);
  cursor: pointer;
}

.toc-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0;
}

.toc-item {
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--ion-text-color);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-item:active {
  background: var(--ion-color-light);
}

.toc-item.toc-active {
  color: var(--ion-color-primary);
  font-weight: 500;
}

.toc-item.toc-h1 {
  font-size: 15px;
  font-weight: 700;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.toc-item.toc-h3 {
  padding-left: 32px;
  font-size: 13px;
}

.toc-item.toc-h4 {
  padding-left: 48px;
  font-size: 13px;
}
</style>
