<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/videos" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ video?.title || '视频播放' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="video">
        <!-- Video Player -->
        <div class="video-container">
          <video
            v-if="video.videoUrl"
            ref="videoEl"
            class="video-player"
            controls
            controlslist="nodownload"
            :poster="video.coverUrl"
            preload="metadata"
          >
            <source :src="video.videoUrl" />
            您的浏览器不支持视频播放
          </video>
          <div v-else class="no-video">
            <ion-icon :icon="playCircleOutline" class="no-video-icon"></ion-icon>
            <p>视频地址不可用</p>
          </div>
        </div>

        <!-- Video Info -->
        <div class="video-info ion-padding">
          <h2>{{ video.title }}</h2>
          <p v-if="video.description" class="description">{{ video.description }}</p>
        </div>
      </template>

      <div v-if="!loading && !video" class="empty-state">
        <p>未找到该视频</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
} from '@ionic/vue';
import { playCircleOutline } from 'ionicons/icons';
import { getVideos } from '@/services/cos';
import type { VideoItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const video = ref<VideoItem | null>(null);

onMounted(async () => {
  try {
    const videos = await getVideos();
    const id = route.params.id as string;
    video.value = videos.find((v) => v.id === id) || null;
  } catch (e) {
    console.error('加载视频详情失败:', e);
  } finally {
    loading.value = false;
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

.video-container {
  width: 100%;
  background: #000;
}

.video-player {
  width: 100%;
  max-height: 56.25vw; /* 16:9 */
  display: block;
}

.no-video {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 56.25vw;
  color: var(--ion-color-medium);
}

.no-video-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.video-info h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.description {
  line-height: 1.6;
  color: var(--ion-color-medium-shade);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
