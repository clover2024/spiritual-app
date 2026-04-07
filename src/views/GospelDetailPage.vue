<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/gospel" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ article?.title || '文章详情' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-else-if="article">
        <div class="article-meta">
          <p v-if="article.author" class="author">{{ article.author }}</p>
          <p v-if="article.date" class="date">{{ article.date }}</p>
        </div>

        <!-- Audio player -->
        <div v-if="article.audioUrl" class="audio-player">
          <audio controls :src="article.audioUrl" class="audio-element" preload="metadata">
            您的浏览器不支持音频播放
          </audio>
        </div>

        <div class="article-content" v-html="renderedContent"></div>
      </template>

      <div v-else class="error-container">
        <p>文章未找到</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
} from '@ionic/vue';
import { marked } from 'marked';
import { getGospelArticles } from '@/services/cos';
import type { GospelArticle } from '@/types';

const route = useRoute();
const loading = ref(true);
const article = ref<GospelArticle | null>(null);
const rawContent = ref('');

const renderedContent = computed(() => {
  if (!rawContent.value) return '';
  return marked(rawContent.value);
});

async function loadArticle() {
  try {
    const articleId = route.params.id as string;
    const articles = await getGospelArticles();
    const found = articles.find((a) => a.id === articleId);
    if (found) {
      article.value = found;
      if (found.contentUrl) {
        const response = await fetch(found.contentUrl);
        if (response.ok) {
          rawContent.value = await response.text();
        }
      }
    }
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadArticle);
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

.article-meta {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ion-color-light);
}

.article-meta .author {
  font-weight: 600;
  color: var(--ion-color-primary);
  margin: 0 0 4px 0;
}

.article-meta .date {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
}

.audio-player {
  margin-bottom: 20px;
}

.audio-element {
  width: 100%;
}

.article-content {
  line-height: 1.8;
  font-size: 16px;
}

.article-content :deep(strong) {
  font-weight: 700;
}

.article-content :deep(em) {
  font-style: italic;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
}

.article-content :deep(h2) {
  font-size: 20px;
}

.article-content :deep(h3) {
  font-size: 18px;
}

.article-content :deep(p) {
  margin-bottom: 12px;
}

.article-content :deep(blockquote) {
  border-left: 4px solid var(--ion-color-primary);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--ion-color-medium);
  font-style: italic;
}

.article-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
}

.article-content :deep(ol),
.article-content :deep(ul) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.article-content :deep(li) {
  margin-bottom: 6px;
}

.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--ion-color-medium);
}
</style>
