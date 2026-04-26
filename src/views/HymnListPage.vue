<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>音频</ion-title>
      </ion-toolbar>
      <ion-searchbar
        v-model="searchQuery"
        placeholder="搜索音频"
        :debounce="300"
      />
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-else>
        <!-- 搜索结果 -->
        <div v-if="searchQuery">
          <div v-if="filteredHymns.length === 0" class="empty-state">
            <ion-icon :icon="musicalNotesOutline" class="empty-icon" />
            <p>未找到匹配的音频</p>
          </div>
          <ion-list v-else lines="full">
            <ion-item
              v-for="hymn in filteredHymns"
              :key="hymn.id"
              button
              detail
              @click="goToHymn(hymn.id)"
            >
              <ion-icon :icon="musicalNoteOutline" slot="start" class="hymn-icon"></ion-icon>
              <ion-label>
                <h3>{{ hymn.title }}</h3>
                <p v-if="hymn.author" class="author-text">{{ hymn.author }}</p>
                <p class="lyrics-preview">{{ getLyricsPreview(hymn.lyrics) }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <!-- 入口卡片 -->
        <div v-else class="folder-section">
          <!-- 生命诗歌入口 -->
          <div class="entry-card" @click="router.push('/tabs/lifesongs')">
            <div class="folder-card-icon">
              <ion-icon :icon="musicalNotesOutline" />
            </div>
            <div class="folder-card-info">
              <span class="folder-name">生命诗歌</span>
              <span class="folder-count">790 首 · 12 分类</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
          </div>

          <!-- 生命读经入口 -->
          <div class="entry-card" @click="router.push('/tabs/life-study')">
            <div class="folder-card-icon book-icon">
              <ion-icon :icon="bookOutline" />
            </div>
            <div class="folder-card-info">
              <span class="folder-name">生命读经</span>
              <span class="folder-count">1955 篇 · 新约 · 旧约</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
          </div>

          <!-- 日日行入口 -->
          <div class="entry-card" @click="router.push('/tabs/daily-bible')">
            <div class="folder-card-icon calendar-icon">
              <ion-icon :icon="calendarOutline" />
            </div>
            <div class="folder-card-info">
              <span class="folder-name">日日行</span>
              <span class="folder-count">每日读经 · 365天</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
          </div>
        </div>
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
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import {
  musicalNoteOutline,
  musicalNotesOutline,
  chevronForwardOutline,
  bookOutline,
  calendarOutline,
} from 'ionicons/icons';
import { getLifesongs } from '@/services/cos';
import type { LifesongItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const allItems = ref<LifesongItem[]>([]);

const filteredHymns = computed(() => {
  if (!searchQuery.value) return [];
  const q = searchQuery.value.toLowerCase();
  return allItems.value.filter(
    (h) =>
      h.title.toLowerCase().includes(q) ||
      h.author?.toLowerCase().includes(q) ||
      h.lyrics?.toLowerCase().includes(q) ||
      h.category?.toLowerCase().includes(q)
  );
});

function getLyricsPreview(lyrics?: string): string {
  if (!lyrics) return '';
  const firstLine = lyrics.split('\n').find((l) => l.trim()) || '';
  return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
}

async function loadData() {
  try {
    allItems.value = await getLifesongs();
  } catch (e) {
    console.error('加载音频失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getLifesongs().then((items) => {
    allItems.value = items;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToHymn(id: string) {
  router.push(`/hymn/${id}`);
}

onMounted(loadData);
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.folder-section {
  padding: 0;
}

.entry-card {
  display: flex;
  align-items: center;
  padding: 18px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.entry-card:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.06);
}

.folder-card-icon {
  font-size: 2rem;
  color: var(--ion-color-tertiary);
  margin-right: 14px;
  flex-shrink: 0;
}

.folder-card-icon.book-icon {
  color: var(--ion-color-primary);
}

.folder-card-icon.calendar-icon {
  color: var(--ion-color-secondary);
}

.folder-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.folder-name {
  font-size: 1.05rem;
  font-weight: 500;
}

.folder-count {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.folder-arrow {
  font-size: 1.2rem;
  color: var(--ion-color-medium);
  flex-shrink: 0;
}

.hymn-icon {
  font-size: 28px;
  color: var(--ion-color-tertiary);
  margin-right: 8px;
}

.author-text {
  font-size: 13px;
  color: var(--ion-color-medium);
}

.lyrics-preview {
  font-size: 13px;
  color: var(--ion-color-medium-shade);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
