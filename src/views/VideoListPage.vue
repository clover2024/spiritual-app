<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>视频资源</ion-title>
      </ion-toolbar>
      <ion-searchbar
        v-model="searchQuery"
        placeholder="搜索视频"
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
            <span>全部视频</span>
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
                <span class="folder-count">{{ folder.count }} 个视频</span>
              </div>
              <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
            </div>
          </div>

          <!-- 无分类视频 -->
          <div v-if="uncategorizedVideos.length" class="unclassified-section">
            <div class="section-title">其他视频</div>
            <ion-list lines="none">
              <ion-item
                v-for="video in uncategorizedVideos"
                :key="video.id"
                button
                detail
                @click="goToVideo(video.id)"
              >
                <ion-thumbnail slot="start" class="video-thumbnail">
                  <ion-img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" />
                  <div v-else class="thumbnail-placeholder">
                    <ion-icon :icon="playCircleOutline" />
                  </div>
                  <div v-if="video.duration" class="duration-badge">
                    {{ video.duration }}
                  </div>
                </ion-thumbnail>
                <ion-label>
                  <h3>{{ video.title }}</h3>
                  <p v-if="video.description" class="description">{{ video.description }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </div>

        <!-- 视频列表（选中文件夹 或 搜索中） -->
        <div v-else>
          <div v-if="filteredVideos.length === 0" class="empty-state">
            <ion-icon :icon="playCircleOutline" class="empty-icon" />
            <p>没有找到视频</p>
          </div>
          <ion-list v-else lines="none">
            <ion-item
              v-for="video in filteredVideos"
              :key="video.id"
              button
              detail
              @click="goToVideo(video.id)"
            >
              <ion-thumbnail slot="start" class="video-thumbnail">
                <ion-img v-if="video.coverUrl" :src="video.coverUrl" :alt="video.title" />
                <div v-else class="thumbnail-placeholder">
                  <ion-icon :icon="playCircleOutline" />
                </div>
                <div v-if="video.duration" class="duration-badge">
                  {{ video.duration }}
                </div>
              </ion-thumbnail>
              <ion-label>
                <h3>{{ video.title }}</h3>
                <p v-if="video.description" class="description">{{ video.description }}</p>
                <div class="tag-row">
                  <ion-badge v-if="video.category" color="light" class="tag-badge">
                    {{ video.category }}
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
  IonThumbnail,
  IonImg,
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  RefresherCustomEvent,
} from '@ionic/vue';
import {
  playCircleOutline,
  folderOutline,
  homeOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { getVideos } from '@/services/cos';
import type { VideoItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const selectedFolder = ref('');
const videos = ref<VideoItem[]>([]);

// 按 category 分组生成文件夹列表
const folders = computed(() => {
  const folderMap = new Map<string, { name: string; count: number }>();
  videos.value.forEach((v) => {
    if (v.category) {
      const existing = folderMap.get(v.category);
      if (existing) {
        existing.count++;
      } else {
        folderMap.set(v.category, { name: v.category, count: 1 });
      }
    }
  });
  return Array.from(folderMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
});

// 无分类视频
const uncategorizedVideos = computed(() => {
  return videos.value.filter((v) => !v.category);
});

// 显示的视频列表（文件夹内 或 搜索结果）
const filteredVideos = computed(() => {
  if (selectedFolder.value) {
    return videos.value.filter((v) => v.category === selectedFolder.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    return videos.value.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
    );
  }
  return [];
});

function goToVideo(id: string) {
  router.push(`/video/${id}`);
}

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
  getVideos()
    .then((v) => {
      videos.value = v;
      event.target.complete();
    })
    .catch(() => {
      event.target.complete();
    });
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
  color: var(--ion-color-primary);
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

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--ion-color-light-shade);
  color: var(--ion-color-medium);
  font-size: 1.5rem;
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
