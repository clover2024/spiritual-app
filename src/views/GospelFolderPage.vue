<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/gospel"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ folderName }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-else>
        <ion-list lines="none" v-if="articles.length > 0">
          <ion-item
            v-for="article in articles"
            :key="article.id"
            button
            detail
            @click="goToArticle(article.id)"
          >
            <ion-icon :icon="documentTextOutline" slot="start" class="article-icon"></ion-icon>
            <ion-label>
              <h3>{{ article.title }}</h3>
              <p v-if="article.author" class="author-text">{{ article.author }}</p>
              <p v-if="article.summary">{{ article.summary }}</p>
              <p v-if="article.date" class="date-text">{{ article.date }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-else class="empty-container">
          <ion-icon :icon="documentTextOutline" class="empty-icon"></ion-icon>
          <p>暂无文章</p>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBackButton,
  IonButtons,
  RefresherCustomEvent,
} from '@ionic/vue';
import { documentTextOutline } from 'ionicons/icons';
import { getGospelArticles, getGospelFolders } from '@/services/cos';
import { setupWxShare } from '@/composables/useWxShare';
import { resetPageMeta } from '@/composables/usePageMeta';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const articles = ref<any[]>([]);
const folderName = ref('文章列表');

async function loadData() {
  try {
    const folderId = route.params.folderId as string;
    const [folders, data] = await Promise.all([getGospelFolders(), getGospelArticles()]);
    const folder = folders.find((f: any) => f.id === folderId);
    if (folder) folderName.value = folder.name;
    const filtered = folderId ? data.filter((a: any) => a.folder === folderId) : data;
    articles.value = filtered.sort((a: any, b: any) => {
      const cnNum: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
      const getNum = (t: string) => { const m = t.match(/[一二三四五六七八九十]/); return m ? (cnNum[m[0]] ?? 99) : 99; };
      return getNum(a.title) - getNum(b.title) || a.title.localeCompare(b.title, 'zh');
    });
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
    setupWxShare({ title: folderName.value });
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  const folderId = route.params.folderId as string;
  getGospelArticles().then((data) => {
    const filtered = folderId ? data.filter((a: any) => a.folder === folderId) : data;
    articles.value = filtered.sort((a: any, b: any) => {
      const cnNum: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
      const getNum = (t: string) => { const m = t.match(/[一二三四五六七八九十]/); return m ? (cnNum[m[0]] ?? 99) : 99; };
      return getNum(a.title) - getNum(b.title) || a.title.localeCompare(b.title, 'zh');
    });
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToArticle(id: string) {
  router.push(`/wzs/${id}`);
}

onMounted(loadData);

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
  height: 200px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.article-icon {
  font-size: 28px;
  color: var(--ion-color-primary);
  margin-right: 8px;
}

.author-text {
  font-size: 13px;
  color: var(--ion-color-primary);
}

.date-text {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.empty-icon {
  font-size: 48px;
}
</style>
