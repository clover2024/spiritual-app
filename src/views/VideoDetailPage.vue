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
          <div v-if="video.lyrics" class="lyrics-section">
            <div class="lyrics-header">
              <div class="lyrics-title">歌词</div>
              <ion-button fill="clear" size="small" @click="copyLyrics" class="copy-btn">
                <ion-icon :icon="copyOutline" slot="start" />
                {{ copySuccess ? '已复制' : '复制歌词' }}
              </ion-button>
            </div>
            <div class="lyrics-content" v-html="formattedLyrics"></div>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
  IonButton,
} from '@ionic/vue';
import { playCircleOutline, copyOutline } from 'ionicons/icons';
import { getVideos } from '@/services/cos';
import { setPageMeta, resetPageMeta } from '@/composables/usePageMeta';
import { setupWxShare } from '@/composables/useWxShare';
import type { VideoItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const video = ref<VideoItem | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const copySuccess = ref(false);
let progressTimer: ReturnType<typeof setInterval> | null = null;

function getProgressKey(id: string) {
  return `video-progress:${id}`;
}

function saveProgress() {
  const el = videoEl.value;
  const v = video.value;
  if (!el || !v || !el.duration) return;
  if (el.currentTime / el.duration > 0.95) {
    localStorage.removeItem(getProgressKey(v.id));
  } else {
    localStorage.setItem(getProgressKey(v.id), String(Math.floor(el.currentTime)));
  }
}

function restoreProgress() {
  const el = videoEl.value;
  const v = video.value;
  if (!el || !v) return;
  const saved = localStorage.getItem(getProgressKey(v.id));
  if (saved && Number(saved) > 0) {
    el.currentTime = Number(saved);
  }
}

const formattedLyrics = computed(() => {
  if (!video.value?.lyrics) return '';
  return video.value.lyrics
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
});

async function copyLyrics() {
  if (!video.value?.lyrics) return;
  try {
    await navigator.clipboard.writeText(video.value.lyrics);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = video.value!.lyrics;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  }
}

onMounted(async () => {
  try {
    const videoId = route.params.id as string;
    const videos = await getVideos();
    video.value = videos.find((v) => v.id === videoId) || null;
    if (video.value) {
      setupWxShare({
        title: video.value.title,
        description: video.value.description,
        image: video.value.coverUrl,
      });
      // Restore progress after video element is ready
      await new Promise((r) => setTimeout(r, 100));
      restoreProgress();
      progressTimer = setInterval(saveProgress, 5000);
    }
  } catch (e) {
    console.error('加载视频详情失败:', e);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  resetPageMeta();
  saveProgress();
  if (progressTimer) clearInterval(progressTimer);
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

.lyrics-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-light-shade);
}

.lyrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.lyrics-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-medium);
}

.copy-btn {
  --padding-start: 8px;
  --padding-end: 8px;
  font-size: 13px;
}

.lyrics-content {
  font-size: 15px;
  line-height: 2;
  color: var(--ion-text-color);
  white-space: normal;
}
</style>
