<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>福音基站</ion-title>
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
import { ref, onMounted } from 'vue';
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { documentTextOutline } from 'ionicons/icons';
import { getGospelArticles } from '@/services/cos';

const router = useRouter();
const loading = ref(true);
const articles = ref<any[]>([]);

async function loadData() {
  try {
    const data = await getGospelArticles();
    articles.value = data.sort((a, b) => {
      const cnNum: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
      const getNum = (t: string) => { const m = t.match(/[一二三四五六七八九十]/); return m ? (cnNum[m[0]] ?? 99) : 99; };
      return getNum(a.title) - getNum(b.title) || a.title.localeCompare(b.title, 'zh');
    });
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getGospelArticles().then((data) => {
    articles.value = data.sort((a, b) => {
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
  router.push(`/gospel/${id}`);
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
