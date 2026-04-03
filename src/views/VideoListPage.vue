<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>视频资源</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="搜索视频"
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
        <div v-if="categories.length > 0" class="category-bar">
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

        <!-- 视频列表 -->
        <ion-list lines="none">
          <ion-item
            v-for="video in filteredVideos"
            :key="video.id"
            button
            detail
            @click="goToVideo(video.id)"
          >
            <ion-thumbnail slot="start" class="video-thumbnail">
              <ion-img
                v-if="video.coverUrl"
                :src="video.coverUrl"
                :alt="video.title"
              ></ion-img>
              <div v-else class="thumbnail-placeholder">
                <ion-icon :icon="playCircleOutline"></ion-icon>
              </div>
              <div v-if="video.duration" class="duration-badge">
                {{ video.duration }}
              </div>
            </ion-thumbnail>
            <ion-label>
              <h3>{{ video.title }}</h3>
              <p v-if="video.description" class="description">{{ video.description }}</p>
              <div class="tag-row">
                <ion-badge v-if="video.category" color="tertiary" class="tag-badge">
                  {{ video.category }}
                </ion-badge>
              </div>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-if="filteredVideos.length === 0" class="empty-state">
          <ion-icon :icon="videocamOutline" class="empty-icon"></ion-icon>
          <p>{{ searchQuery ? '未找到匹配的视频' : '暂无视频内容' }}</p>
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
  IonThumbnail,
  IonImg,
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  IonBadge,
  RefresherCustomEvent,
} from '@ionic/vue';
import { playCircleOutline, videocamOutline } from 'ionicons/icons';
import { getVideos } from '@/services/cos';
import type { VideoItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const selectedCategory = ref('');
const videos = ref<VideoItem[]>([]);

const categories = computed(() => {
  const cats = new Set<string>();
  videos.value.forEach((v) => {
    if (v.category) cats.add(v.category);
  });
  return Array.from(cats);
});

const filteredVideos = computed(() => {
  let result = videos.value;
  if (selectedCategory.value) {
    result = result.filter((v) => v.category === selectedCategory.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
    );
  }
  return result;
});

async function loadData() {
  try {
    videos.value = await getVideos();
  } catch (e) {
    console.error('加载视频失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getVideos().then((v) => {
    videos.value = v;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToVideo(id: string) {
  router.push(`/video/${id}`);
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

.video-thumbnail {
  position: relative;
}

.duration-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
}

.description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tag-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.tag-badge {
  font-size: 11px;
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
