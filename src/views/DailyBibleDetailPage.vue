<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/daily-bible" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ dayData?.title || '每日读经' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="dayData">
        <div class="bible-detail ion-padding">
          <!-- 标题区 -->
          <div class="bible-header">
            <div class="day-circle">
              <span class="day-number">{{ dayData.day }}</span>
            </div>
            <div class="header-text">
              <h1 class="bible-title">{{ dayData.title }}</h1>
              <p class="bible-date">{{ dayData.date }}</p>
            </div>
          </div>

          <!-- 音频播放器 -->
          <div v-if="dayData.audioUrl" class="audio-section">
            <audio
              ref="audioEl"
              class="audio-player"
              controls
              preload="metadata"
              :src="dayData.audioUrl"
            >
              您的浏览器不支持音频播放
            </audio>
          </div>

          <!-- 经文内容 -->
          <div v-if="contentLoading" class="content-loading">
            <ion-spinner></ion-spinner>
            <p>加载经文内容...</p>
          </div>
          <div v-else-if="contentHtml" class="content-section" v-html="contentHtml"></div>
          <div v-else-if="!contentLoading" class="content-placeholder">
            <ion-icon :icon="bookOutline" class="placeholder-icon"></ion-icon>
            <p>经文内容不可用</p>
          </div>
        </div>
      </template>

      <div v-if="!loading && !dayData" class="empty-state">
        <p>未找到该日的读经内容</p>
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
import { bookOutline } from 'ionicons/icons';
import { getDailyBible } from '@/services/cos';
import { marked } from 'marked';
import type { DailyBibleDay } from '@/types';

const route = useRoute();
const loading = ref(true);
const contentLoading = ref(false);
const dayData = ref<DailyBibleDay | null>(null);
const contentHtml = ref('');

onMounted(async () => {
  try {
    const monthNum = Number(route.params.month);
    const dayNum = Number(route.params.day);

    const allMonths = await getDailyBible();
    const month = allMonths.find((m) => m.month === monthNum);
    if (month) {
      dayData.value = month.days.find((d) => d.day === dayNum) || null;
    }

    if (dayData.value?.contentUrl) {
      contentLoading.value = true;
      try {
        const resp = await fetch(dayData.value.contentUrl);
        if (resp.ok) {
          const text = await resp.text();
          // Strip YAML frontmatter if present
          let md = text;
          if (md.trim().startsWith('---')) {
            const end = md.indexOf('---', 3);
            if (end !== -1) {
              md = md.slice(end + 3).trim();
            }
          }
          contentHtml.value = await marked.parse(md);
        }
      } catch (e) {
        console.error('加载经文内容失败:', e);
      } finally {
        contentLoading.value = false;
      }
    }
  } catch (e) {
    console.error('加载读经详情失败:', e);
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

.bible-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.day-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.day-number {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.bible-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.bible-date {
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0;
}

.audio-section {
  margin-bottom: 24px;
}

.audio-player {
  width: 100%;
  border-radius: 8px;
}

.content-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.content-section {
  line-height: 1.8;
  font-size: 16px;
  color: var(--ion-color-medium-shade);
}

.content-section :deep(h1) {
  font-size: 22px;
  font-weight: 700;
  margin: 24px 0 12px;
}

.content-section :deep(h2) {
  font-size: 20px;
  font-weight: 700;
  margin: 20px 0 10px;
}

.content-section :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 8px;
}

.content-section :deep(p) {
  margin-bottom: 12px;
}

.content-section :deep(blockquote) {
  border-left: 4px solid var(--ion-color-primary);
  margin: 12px 0;
  padding: 8px 16px;
  background: var(--ion-color-light);
  border-radius: 4px;
  color: var(--ion-color-medium-shade);
}

.content-section :deep(ul),
.content-section :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.content-section :deep(li) {
  margin-bottom: 4px;
}

.content-section :deep(strong) {
  font-weight: 700;
  color: var(--ion-color-dark);
}

.content-section :deep(em) {
  font-style: italic;
}

.content-section :deep(hr) {
  border: none;
  border-top: 1px solid var(--ion-color-light-shade);
  margin: 20px 0;
}

.content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--ion-color-medium);
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
