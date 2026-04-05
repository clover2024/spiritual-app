<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/videos" text="返回" />
        </ion-buttons>
        <ion-title>{{ video?.title || '视频详情' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <div v-else-if="!video" class="empty-state">
        <ion-icon :icon="playCircleOutline" class="empty-icon" />
        <p>视频不存在</p>
      </div>

      <template v-else>
        <div class="video-player-wrapper">
          <video
            ref="videoEl"
            class="video-player"
            controls
            playsinline
            :src="video.videoUrl"
            :poster="video.coverUrl"
          />
        </div>
        <div class="video-info">
          <h2>{{ video.title }}</h2>
          <p v-if="video.description" class="description">{{ video.description }}</p>
          <div class="meta-row">
            <ion-badge v-if="video.category" color="primary" class="meta-badge">
              {{ video.category }}
            </ion-badge>
            <span v-if="video.date" class="meta-date">{{ video.date }}</span>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonIcon,
  IonBadge,
} from '@ionic/vue';
import { playCircleOutline } from 'ionicons/icons';
import { getVideos } from '@/services/cos';
import type { VideoItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const video = ref<VideoItem | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);

onMounted(async () => {
  try {
    const videoId = route.params.id as string;
    const videos = await getVideos();
    video.value = videos.find((v) => v.id === videoId) || null;
  } catch (e) {
    console.error('加载视频详情失败:', e);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (videoEl.value) {
    videoEl.value.pause();
    videoEl.value.removeAttribute('src');
    videoEl.value.load();
  }
});
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

.video-player-wrapper {
  width: 100%;
  background: #000;
}

.video-player {
  width: 100%;
  display: block;
  max-height: 60vh;
}

.video-info {
  padding: 16px;
}

.video-info h2 {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 600;
}

.description {
  color: var(--ion-color-medium);
  line-height: 1.5;
  margin: 0 0 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-badge {
  font-size: 12px;
}

.meta-date {
  font-size: 12px;
  color: var(--ion-color-medium);
}
</style>
