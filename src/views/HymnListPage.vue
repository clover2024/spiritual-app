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
        <!-- 面包屑导航（进入文件夹后显示） -->
        <div v-if="selectedFolder" class="breadcrumb">
          <span class="breadcrumb-item" @click="selectedFolder = ''">
            <ion-icon :icon="homeOutline" />
            <span>全部音频</span>
          </span>
          <ion-icon :icon="chevronForwardOutline" class="breadcrumb-sep" />
          <span class="breadcrumb-current">{{ selectedFolder }}</span>
        </div>

        <!-- 文件夹视图（未选中文件夹且无搜索时） -->
        <div v-if="!selectedFolder && !searchQuery" class="folder-section">
          <div class="folder-grid">
            <div
              v-for="folder in folders"
              :key="folder.name"
              class="folder-card"
              @click="selectedFolder = folder.name"
            >
              <div class="folder-card-icon">
                <ion-icon :icon="folderOutline" />
              </div>
              <div class="folder-card-info">
                <span class="folder-name">{{ folder.name }}</span>
                <span class="folder-count">{{ folder.count }} 首</span>
              </div>
              <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
            </div>
          </div>

          <!-- 无分类诗歌 -->
          <div v-if="uncategorizedHymns.length" class="unclassified-section">
            <div class="section-title">其他音频</div>
            <ion-list lines="none">
              <ion-item
                v-for="hymn in uncategorizedHymns"
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
        </div>

        <!-- 诗歌列表（选中文件夹 或 搜索中） -->
        <div v-else>
          <div v-if="filteredHymns.length === 0" class="empty-state">
            <ion-icon :icon="musicalNotesOutline" class="empty-icon" />
            <p>{{ searchQuery ? '未找到匹配的音频' : '暂无音频内容' }}</p>
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
                <div class="tag-row">
                  <ion-badge v-if="hymn.category" color="tertiary" class="tag-badge">
                    {{ hymn.category }}
                  </ion-badge>
                  <ion-badge v-if="hymn.audioUrl" color="success" class="tag-badge">
                    <ion-icon :icon="headsetOutline" class="audio-badge-icon"></ion-icon>
                    有音频
                  </ion-badge>
                </div>
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
  IonBadge,
  RefresherCustomEvent,
} from '@ionic/vue';
import {
  musicalNoteOutline,
  musicalNotesOutline,
  headsetOutline,
  folderOutline,
  homeOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { getHymns } from '@/services/cos';
import type { HymnItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const selectedFolder = ref('');
const hymns = ref<HymnItem[]>([]);

// 按 category 分组生成文件夹列表
const folders = computed(() => {
  const folderMap = new Map<string, { name: string; count: number }>();
  hymns.value.forEach((h) => {
    if (h.category) {
      const existing = folderMap.get(h.category);
      if (existing) {
        existing.count++;
      } else {
        folderMap.set(h.category, { name: h.category, count: 1 });
      }
    }
  });
  return Array.from(folderMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
});

// 无分类诗歌
const uncategorizedHymns = computed(() => {
  return hymns.value.filter((h) => !h.category);
});

// 显示的诗歌列表（文件夹内 或 搜索结果）
const filteredHymns = computed(() => {
  if (selectedFolder.value) {
    return hymns.value.filter((h) => h.category === selectedFolder.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    return hymns.value.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.author?.toLowerCase().includes(q) ||
        h.lyrics?.toLowerCase().includes(q) ||
        h.category?.toLowerCase().includes(q)
    );
  }
  return [];
});

function getLyricsPreview(lyrics: string): string {
  const firstLine = lyrics.split('\n').find((l) => l.trim()) || '';
  return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
}

async function loadData() {
  try {
    hymns.value = await getHymns();
  } catch (e) {
    console.error('加载音频失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getHymns().then((h) => {
    hymns.value = h;
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

.folder-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.folder-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.folder-card:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.06);
}

.folder-card-icon {
  font-size: 1.8rem;
  color: var(--ion-color-tertiary);
  margin-right: 12px;
  flex-shrink: 0;
}

.folder-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.folder-name {
  font-size: 1rem;
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

.unclassified-section {
  margin-top: 12px;
}

.section-title {
  padding: 12px 16px 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
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

.tag-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.tag-badge {
  font-size: 11px;
}

.audio-badge-icon {
  font-size: 12px;
  margin-right: 2px;
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
