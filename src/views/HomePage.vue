<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>橄榄山</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-else>
        <!-- 最新视频 -->
        <h2 class="section-title">
          <ion-icon :icon="playCircleOutline" class="section-icon"></ion-icon>
          最新视频
        </h2>
        <ion-list lines="none">
          <ion-item
            v-for="video in recentVideos"
            :key="video.id"
            button
            detail
            @click="goToVideo(video.id)"
          >
            <ion-thumbnail slot="start">
              <ion-img
                v-if="video.coverUrl"
                :src="video.coverUrl"
                :alt="video.title"
              ></ion-img>
              <div v-else class="thumbnail-placeholder">
                <ion-icon :icon="playCircleOutline"></ion-icon>
              </div>
            </ion-thumbnail>
            <ion-label>
              <h3>{{ video.title }}</h3>
              <p v-if="video.description">{{ video.description }}</p>
              <p v-if="video.date" class="date-text">{{ video.date }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <ion-button expand="block" fill="outline" router-link="/tabs/videos">
          查看全部视频
        </ion-button>

        <!-- 最新诗歌 -->
        <h2 class="section-title" style="margin-top: 24px;">
          <ion-icon :icon="musicalNotesOutline" class="section-icon"></ion-icon>
          最新音频
        </h2>
        <ion-list lines="none">
          <ion-item
            v-for="hymn in recentHymns"
            :key="hymn.id"
            button
            detail
            @click="goToHymn(hymn.id)"
          >
            <ion-icon :icon="musicalNoteOutline" slot="start" class="hymn-icon"></ion-icon>
            <ion-label>
              <h3>{{ hymn.title }}</h3>
              <p v-if="hymn.author">{{ hymn.author }}</p>
              <ion-badge v-if="hymn.category" color="tertiary" class="category-badge">
                {{ hymn.category }}
              </ion-badge>
            </ion-label>
          </ion-item>
        </ion-list>
        <ion-button expand="block" fill="outline" router-link="/tabs/hymns">
          查看全部音频
        </ion-button>

        <!-- 最新书报 -->
        <h2 class="section-title" style="margin-top: 24px;">
          <ion-icon :icon="bookOutline" class="section-icon"></ion-icon>
          最新书报
        </h2>
        <ion-list lines="none">
          <ion-item
            v-for="book in recentBooks"
            :key="book.id"
            button
            detail
            @click="goToBook(book.id)"
          >
            <ion-thumbnail slot="start">
              <ion-img
                v-if="book.coverUrl"
                :src="book.coverUrl"
                :alt="book.title"
              ></ion-img>
              <div v-else class="thumbnail-placeholder">
                <ion-icon :icon="bookOutline"></ion-icon>
              </div>
            </ion-thumbnail>
            <ion-label>
              <h3>{{ book.title }}</h3>
              <p v-if="book.author">{{ book.author }}</p>
              <p v-if="book.description">{{ book.description }}</p>
              <ion-badge :color="book.format === 'pdf' ? 'danger' : 'primary'" class="format-badge">
                {{ book.format?.toUpperCase() }}
              </ion-badge>
            </ion-label>
          </ion-item>
        </ion-list>
        <ion-button expand="block" fill="outline" router-link="/tabs/books" style="margin-bottom: 20px;">
          查看全部书报
        </ion-button>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonImg,
  IonIcon,
  IonButton,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { playCircleOutline, bookOutline, musicalNotesOutline, musicalNoteOutline } from 'ionicons/icons';
import { getVideos, getBooks, getHymns } from '@/services/cos';
import type { VideoItem, BookItem, HymnItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const videos = ref<VideoItem[]>([]);
const books = ref<BookItem[]>([]);
const hymns = ref<HymnItem[]>([]);

const recentVideos = computed(() => videos.value.slice(0, 5));
const recentBooks = computed(() => books.value.slice(0, 5));
const recentHymns = computed(() => hymns.value.slice(0, 5));

async function loadData() {
  try {
    const [v, h, b] = await Promise.all([getVideos(), getHymns(), getBooks()]);
    videos.value = v;
    hymns.value = h;
    books.value = b;
  } catch (e) {
    console.error('加载数据失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  loading.value = false;
  Promise.all([getVideos(), getHymns(), getBooks()]).then(([v, h, b]) => {
    videos.value = v;
    hymns.value = h;
    books.value = b;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToVideo(id: string) {
  router.push(`/video/${id}`);
}

function goToHymn(id: string) {
  router.push(`/hymn/${id}`);
}

function goToBook(id: string) {
  router.push(`/book/${id}`);
}

onMounted(loadData);
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 22px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
  border-radius: 4px;
  font-size: 24px;
  color: var(--ion-color-medium);
}

.date-text {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.format-badge {
  margin-top: 4px;
}

.hymn-icon {
  font-size: 28px;
  color: var(--ion-color-tertiary);
  margin-right: 8px;
}

.category-badge {
  margin-top: 4px;
}
</style>
