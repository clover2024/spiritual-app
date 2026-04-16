<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start" v-if="selectedFolder">
          <ion-back-button default-href="/tabs/hymns" text="返回" @click="selectedFolder = ''" />
        </ion-buttons>
        <ion-title>生命诗歌</ion-title>
      </ion-toolbar>
      <ion-searchbar
        v-if="selectedFolder"
        v-model="searchQuery"
        placeholder="搜索诗歌"
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
        <!-- 面包屑导航 -->
        <div v-if="selectedFolder" class="breadcrumb">
          <span class="breadcrumb-item" @click="selectedFolder = ''; searchQuery = ''">
            <ion-icon :icon="homeOutline" />
            <span>全部</span>
          </span>
          <ion-icon :icon="chevronForwardOutline" class="breadcrumb-sep" />
          <span class="breadcrumb-current">{{ selectedFolder }}</span>
        </div>

        <!-- 根层级：分类文件夹 -->
        <div v-if="!selectedFolder && !searchQuery" class="folder-section">
          <div v-if="folders.length === 0" class="empty-container">
            <ion-icon :icon="folderOutline" class="empty-icon"></ion-icon>
            <p>暂无内容</p>
          </div>
          <ion-list v-else lines="none">
            <ion-item
              v-for="folder in folders"
              :key="folder.id"
              button
              detail
              @click="selectedFolder = folder.name"
            >
              <ion-icon :icon="folderOutline" slot="start" class="folder-icon"></ion-icon>
              <ion-label>
                <h3>{{ folder.name }}</h3>
                <p class="count-text">{{ folder.count }} 首</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <!-- 歌曲列表 -->
        <div v-else>
          <div v-if="filteredItems.length === 0" class="empty-state">
            <ion-icon :icon="musicalNotesOutline" class="empty-icon" />
            <p>{{ searchQuery ? '未找到匹配的诗歌' : '暂无诗歌' }}</p>
          </div>
          <ion-list v-else lines="full">
            <ion-item
              v-for="item in filteredItems"
              :key="item.id"
              button
              detail
              @click="goToDetail(item.id)"
            >
              <ion-icon :icon="musicalNoteOutline" slot="start" class="item-icon"></ion-icon>
              <ion-label>
                <h3>{{ item.title }}</h3>
                <p v-if="item.author" class="author-text">{{ item.author }}</p>
                <p class="lyrics-preview">{{ getLyricsPreview(item.lyrics) }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
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
  IonButtons,
  IonBackButton,
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
  folderOutline,
  musicalNoteOutline,
  musicalNotesOutline,
  homeOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { getLifesongs, getLifesongFolders } from '@/services/cos';
import type { LifesongItem, LifesongFolder } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const selectedFolder = ref('');
const allItems = ref<LifesongItem[]>([]);
const allFolders = ref<LifesongFolder[]>([]);

const folders = computed(() => {
  return allFolders.value.map(f => ({
    id: f.id,
    name: f.name,
    count: allItems.value.filter(i => i.category === f.name).length,
  }));
});

function getEpisodeNum(title: string): number {
  const m = title.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

const filteredItems = computed(() => {
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    return allItems.value.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.author?.toLowerCase().includes(q) ||
        h.lyrics?.toLowerCase().includes(q) ||
        h.category?.toLowerCase().includes(q)
    );
  }
  if (selectedFolder.value) {
    return allItems.value
      .filter((h) => h.category === selectedFolder.value)
      .sort((a, b) => getEpisodeNum(a.title) - getEpisodeNum(b.title));
  }
  return [];
});

function getLyricsPreview(lyrics?: string): string {
  if (!lyrics) return '';
  const firstLine = lyrics.split('\n').find((l) => l.trim()) || '';
  return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
}

async function loadData() {
  try {
    const [items, folderData] = await Promise.all([getLifesongs(), getLifesongFolders()]);
    allItems.value = items;
    allFolders.value = folderData;
  } catch (e) {
    console.error('加载生命诗歌失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  Promise.all([getLifesongs(), getLifesongFolders()]).then(([items, folderData]) => {
    allItems.value = items;
    allFolders.value = folderData;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToDetail(id: string) {
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

.breadcrumb {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ion-color-primary);
  cursor: pointer;
}

.breadcrumb-sep {
  font-size: 1rem;
  color: var(--ion-color-medium);
}

.breadcrumb-current {
  color: var(--ion-text-color);
  font-weight: 500;
}

.folder-section {
  padding: 0;
}

.folder-icon {
  font-size: 28px;
  color: var(--ion-color-primary);
  margin-right: 8px;
}

.count-text {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.item-icon {
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

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 48px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
