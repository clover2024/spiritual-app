<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>诗歌</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="搜索诗歌"
          :debounce="300"
        ></ion-searchbar>
      </ion-toolbar>
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
        <!-- 分类筛选 -->
        <div class="category-bar">
          <ion-chip
            :outline="selectedCategory !== ''"
            :color="selectedCategory === '' ? 'primary' : 'medium'"
            @click="selectedCategory = ''"
          >
            <ion-label>全部</ion-label>
          </ion-chip>
          <ion-chip
            v-for="cat in categories"
            :key="cat"
            :outline="selectedCategory !== cat"
            :color="selectedCategory === cat ? 'primary' : 'medium'"
            @click="selectedCategory = cat"
          >
            <ion-label>{{ cat }}</ion-label>
          </ion-chip>
        </div>

        <!-- 诗歌列表 -->
        <ion-list lines="full">
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

        <div v-if="filteredHymns.length === 0" class="empty-state">
          <ion-icon :icon="musicalNotesOutline" class="empty-icon"></ion-icon>
          <p>{{ searchQuery ? '未找到匹配的诗歌' : '暂无诗歌内容' }}</p>
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
  IonChip,
  IonBadge,
  RefresherCustomEvent,
} from '@ionic/vue';
import { musicalNoteOutline, musicalNotesOutline, headsetOutline } from 'ionicons/icons';
import { getHymns } from '@/services/cos';
import type { HymnItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const selectedCategory = ref('');
const hymns = ref<HymnItem[]>([]);

const categories = computed(() => {
  const cats = new Set<string>();
  hymns.value.forEach((h) => {
    if (h.category) cats.add(h.category);
  });
  return Array.from(cats);
});

const filteredHymns = computed(() => {
  let result = hymns.value;
  if (selectedCategory.value) {
    result = result.filter((h) => h.category === selectedCategory.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.author?.toLowerCase().includes(q) ||
        h.lyrics?.toLowerCase().includes(q)
    );
  }
  return result;
});

function getLyricsPreview(lyrics: string): string {
  const firstLine = lyrics.split('\n').find((l) => l.trim()) || '';
  return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
}

async function loadData() {
  try {
    hymns.value = await getHymns();
  } catch (e) {
    console.error('加载诗歌失败:', e);
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

.category-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
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
