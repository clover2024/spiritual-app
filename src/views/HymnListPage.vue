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
        <!-- 面包屑导航 -->
        <div v-if="selectedFolder" class="breadcrumb">
          <span class="breadcrumb-item" @click="selectedFolder = ''; selectedSubFolder = ''">
            <ion-icon :icon="homeOutline" />
            <span>全部音频</span>
          </span>
          <template v-if="selectedSubFolder">
            <ion-icon :icon="chevronForwardOutline" class="breadcrumb-sep" />
            <span class="breadcrumb-item" @click="selectedSubFolder = ''">{{ selectedFolder }}</span>
          </template>
          <ion-icon :icon="chevronForwardOutline" class="breadcrumb-sep" />
          <span class="breadcrumb-current">{{ selectedSubFolder || selectedFolder }}</span>
        </div>

        <!-- 根文件夹视图（未选中文件夹且无搜索时） -->
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

          <!-- 无分类音频 -->
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

        <!-- 子文件夹视图（选中一级文件夹且有子文件夹，且无搜索） -->
        <div v-else-if="selectedFolder && !selectedSubFolder && subFolders.length && !searchQuery" class="folder-section">
          <div class="folder-grid">
            <div
              v-for="sf in subFolders"
              :key="sf.name"
              class="folder-card"
              @click="selectedSubFolder = sf.name"
            >
              <div class="folder-card-icon">
                <ion-icon :icon="folderOutline" />
              </div>
              <div class="folder-card-info">
                <span class="folder-name">{{ sf.name }}</span>
                <span class="folder-count">{{ sf.count }} 首</span>
              </div>
              <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
            </div>
          </div>
        </div>

        <!-- 音频列表（子文件夹内 或 搜索中） -->
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
const selectedSubFolder = ref('');
const hymns = ref<HymnItem[]>([]);

// 中文数字映射，用于排序含中文数字前缀的文件夹名
const cnNumMap: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
};
function getCnNumOrder(name: string): number {
  const m = name.match(/^([一二三四五六七八九十]+)、/);
  if (m && cnNumMap[m[1]]) return cnNumMap[m[1]];
  return 999;
}

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
  return Array.from(folderMap.values()).sort((a, b) => {
    const oa = getCnNumOrder(a.name);
    const ob = getCnNumOrder(b.name);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
});

// 无分类音频
const uncategorizedHymns = computed(() => {
  return hymns.value.filter((h) => !h.category);
});

// 从 audioUrl 路径中提取子文件夹
// 原始路径如 /audios/新约生命读经/01马太福音/Mat-001.mp3
// resolveUrl 后如 https://xxx.cos.xxx.myqcloud.com/audios/新约生命读经/01马太福音/Mat-001.mp3
function getSubFolder(audioUrl: string, category: string): string | null {
  const idx = audioUrl.indexOf('/' + category + '/');
  if (idx < 0) return null;
  const after = audioUrl.substring(idx + category.length + 2); // skip /category/
  const slashIdx = after.indexOf('/');
  if (slashIdx < 0) return null;
  const sub = after.substring(0, slashIdx);
  return sub || null;
}

const subFolders = computed(() => {
  if (!selectedFolder.value) return [];
  const categoryHymns = hymns.value.filter((h) => h.category === selectedFolder.value);
  const subMap = new Map<string, { name: string; count: number }>();
  for (const h of categoryHymns) {
    if (!h.audioUrl) continue;
    const sub = getSubFolder(h.audioUrl, selectedFolder.value);
    if (sub) {
      const existing = subMap.get(sub);
      if (existing) existing.count++;
      else subMap.set(sub, { name: sub, count: 1 });
    }
  }
  if (subMap.size === 0) return [];
  return Array.from(subMap.values()).sort((a, b) => {
    const oa = getCnNumOrder(a.name);
    const ob = getCnNumOrder(b.name);
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
});

// 从标题中提取编号用于排序（如 "001荣耀荣耀归于父神" → 1, "创世记 第001篇" → 1）
function getEpisodeNum(title: string): number {
  const m1 = title.match(/^(\d+)/);
  if (m1) return parseInt(m1[1], 10);
  const m2 = title.match(/第(\d+)篇/);
  return m2 ? parseInt(m2[1], 10) : 0;
}

// 显示的音频列表（子文件夹内 或 搜索结果）
const filteredHymns = computed(() => {
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
  if (selectedFolder.value && selectedSubFolder.value) {
    return hymns.value
      .filter((h) => {
        if (h.category !== selectedFolder.value || !h.audioUrl) return false;
        return getSubFolder(h.audioUrl, selectedFolder.value) === selectedSubFolder.value;
      })
      .sort((a, b) => getEpisodeNum(a.title) - getEpisodeNum(b.title));
  }
  if (selectedFolder.value && subFolders.value.length === 0) {
    return hymns.value
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
