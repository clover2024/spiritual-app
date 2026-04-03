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
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="book">
        <!-- PDF Reader -->
        <div v-if="book.format === 'pdf' && book.fileUrl" class="reader-container">
          <div class="pdf-controls">
            <ion-button size="small" @click="prevPage" :disabled="currentPage <= 1">
              <ion-icon :icon="arrowBackOutline" slot="icon-only"></ion-icon>
            </ion-button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <ion-button size="small" @click="nextPage" :disabled="currentPage >= totalPages">
              <ion-icon :icon="arrowForwardOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
          <div class="pdf-viewer" ref="pdfContainer">
            <canvas ref="pdfCanvas"></canvas>
          </div>
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
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
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
import { arrowBackOutline, arrowForwardOutline, bookOutline } from 'ionicons/icons';
import { getBooks } from '@/services/cos';
import type { BookItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const book = ref<BookItem | null>(null);

// PDF state
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
const pdfContainer = ref<HTMLDivElement | null>(null);
const currentPage = ref(1);
const totalPages = ref(0);
let pdfDoc: any = null;

// EPUB state
const epubContainer = ref<HTMLDivElement | null>(null);
let epubBook: any = null;
let epubRendition: any = null;

onMounted(async () => {
  try {
    const books = await getBooks();
    const id = route.params.id as string;
    book.value = books.find((b) => b.id === id) || null;

    if (book.value?.fileUrl) {
      await nextTick();
      if (book.value.format === 'pdf') {
        await initPdf();
      } else if (book.value.format === 'epub') {
        await initEpub();
      }
    }
  } catch (e) {
    console.error('加载书报详情失败:', e);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
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
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    try {
      pdfDoc = await pdfjsLib.getDocument(book.value.fileUrl).promise;
    } catch {
      // worker 加载失败时回退到主线程渲染
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      pdfDoc = await pdfjsLib.getDocument(book.value.fileUrl).promise;
    }

    totalPages.value = pdfDoc.numPages;
    currentPage.value = 1;
    await renderPage(1);
  } catch (e) {
    console.error('PDF 加载失败:', e);
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

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    renderPage(currentPage.value);
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    renderPage(currentPage.value);
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
  height: calc(100% - 1px);
}

.pdf-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.page-info {
  font-size: 14px;
  min-width: 80px;
  text-align: center;
}

.pdf-viewer {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
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
</style>
