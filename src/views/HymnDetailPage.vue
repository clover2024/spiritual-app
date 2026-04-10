<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/hymns" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ hymn?.title || '音频' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="hymn">
        <div class="hymn-detail ion-padding">
          <!-- 标题区 -->
          <div class="hymn-header">
            <h1 class="hymn-title">{{ hymn.title }}</h1>
            <div class="hymn-meta">
              <span v-if="hymn.author">{{ hymn.author }}</span>
              <ion-badge v-if="hymn.category" color="tertiary" class="category-badge">
                {{ hymn.category }}
              </ion-badge>
            </div>
          </div>

          <!-- 音频播放器 -->
          <div v-if="hymn.audioUrl" class="audio-section">
            <audio
              ref="audioEl"
              class="audio-player"
              controls
              preload="metadata"
              :src="hymn.audioUrl"
            >
              您的浏览器不支持音频播放
            </audio>
          </div>

          <!-- 歌词区 -->
          <div class="lyrics-section">
            <div
              v-for="(stanza, index) in stanzas"
              :key="index"
              class="stanza"
            >
              <p
                v-for="(line, lineIndex) in stanza"
                :key="lineIndex"
                class="lyrics-line"
              >{{ line }}</p>
            </div>
          </div>

        </div>
      </template>

      <div v-if="!loading && !hymn" class="empty-state">
        <p>未找到该音频</p>
      </div>
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
  IonBadge,
  IonSpinner,
} from '@ionic/vue';
import { getHymns } from '@/services/cos';
import { setPageMeta, resetPageMeta } from '@/composables/usePageMeta';
import { setupWxShare } from '@/composables/useWxShare';
import type { HymnItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const hymn = ref<HymnItem | null>(null);

const stanzas = computed(() => {
  if (!hymn.value?.lyrics) return [];
  return hymn.value.lyrics
    .split('\n\n')
    .map((stanza) => stanza.split('\n').filter((l) => l.trim()));
});

onMounted(async () => {
  try {
    const allHymns = await getHymns();
    const id = route.params.id as string;
    hymn.value = allHymns.find((h) => h.id === id) || null;
    if (hymn.value) {
      const desc = hymn.value.author || hymn.value.lyrics?.split('\n')[0] || '';
      setupWxShare({ title: hymn.value.title, description: desc });
    }
  } catch (e) {
    console.error('加载音频详情失败:', e);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  resetPageMeta();
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

.hymn-header {
  margin-bottom: 20px;
}

.hymn-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.hymn-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.category-badge {
  font-size: 12px;
}

.audio-section {
  margin-bottom: 24px;
}

.audio-player {
  width: 100%;
  border-radius: 8px;
}

.lyrics-section {
  line-height: 1;
}

.stanza {
  margin-bottom: 24px;
}

.lyrics-line {
  font-size: 16px;
  line-height: 2;
  text-align: center;
  margin: 0;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
