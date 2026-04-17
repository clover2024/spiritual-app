<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>文字室</ion-title>
      </ion-toolbar>
      <ion-searchbar
        v-model="searchQuery"
        placeholder="搜索文章"
        :debounce="300"
      />
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
        <!-- 搜索结果 -->
        <div v-if="searchQuery">
          <div v-if="filteredArticles.length === 0" class="empty-container">
            <ion-icon :icon="documentTextOutline" class="empty-icon"></ion-icon>
            <p>未找到匹配的文章</p>
          </div>
          <ion-list v-else lines="full">
            <ion-item
              v-for="article in filteredArticles"
              :key="article.id"
              button
              detail
              @click="goToArticle(article.id)"
            >
              <ion-icon :icon="documentTextOutline" slot="start" class="article-icon"></ion-icon>
              <ion-label>
                <h3>{{ article.title }}</h3>
                <p v-if="article.summary" class="summary-text">{{ article.summary }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <!-- 文件夹列表 -->
        <template v-else>
          <ion-list lines="none" v-if="folders.length > 0">
            <ion-item
              v-for="folder in folders"
              :key="folder.id"
              button
              detail
              @click="goToFolder(folder.id)"
            >
              <ion-icon :icon="folderOutline" slot="start" class="folder-icon"></ion-icon>
              <ion-label>
                <h3>{{ folder.name }}</h3>
                <p class="count-text">{{ folder.count }} 篇文章</p>
              </ion-label>
            </ion-item>
          </ion-list>

          <div v-else class="empty-container">
            <ion-icon :icon="folderOutline" class="empty-icon"></ion-icon>
            <p>暂无文件夹</p>
          </div>
        </template>
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
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { folderOutline, documentTextOutline } from 'ionicons/icons';
import { getGospelArticles, getGospelFolders } from '@/services/cos';
import type { GospelFolder, GospelArticle } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const folders = ref<any[]>([]);
const allArticles = ref<GospelArticle[]>([]);

const filteredArticles = computed(() => {
  if (!searchQuery.value) return [];
  const q = searchQuery.value.toLowerCase();
  return allArticles.value.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q) ||
      a.author?.toLowerCase().includes(q)
  );
});

async function loadData() {
  try {
    const [allFolders, articles] = await Promise.all([getGospelFolders(), getGospelArticles()]);
    allArticles.value = articles;

    folders.value = allFolders.map((f: GospelFolder) => ({
      id: f.id,
      name: f.name,
      count: articles.filter((a: GospelArticle) => a.folder === f.id).length,
    }));
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  Promise.all([getGospelFolders(), getGospelArticles()]).then(([allFolders, articles]) => {
    allArticles.value = articles;
    folders.value = allFolders.map((f: GospelFolder) => ({
      id: f.id,
      name: f.name,
      count: articles.filter((a: GospelArticle) => a.folder === f.id).length,
    }));
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToFolder(folderId: string) {
  router.push(`/wzs/folder/${folderId}`);
}

function goToArticle(id: string) {
  router.push(`/wzs/${id}`);
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

.folder-icon {
  font-size: 28px;
  color: var(--ion-color-primary);
  margin-right: 8px;
}

.article-icon {
  font-size: 28px;
  color: var(--ion-color-tertiary);
  margin-right: 8px;
}

.count-text {
  font-size: 12px;
  color: var(--ion-color-medium);
}

.summary-text {
  font-size: 13px;
  color: var(--ion-color-medium-shade);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
