<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>文字室</ion-title>
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
import { folderOutline } from 'ionicons/icons';
import { getGospelArticles } from '@/services/cos';

const router = useRouter();
const loading = ref(true);
const folders = ref<any[]>([]);

interface Folder {
  id: string;
  name: string;
  count: number;
}

async function loadData() {
  try {
    const articles = await getGospelArticles();
    
    folders.value = [{
      id: 'gospel-station',
      name: '福音基站',
      count: articles.length
    }];
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getGospelArticles().then((articles) => {
    folders.value = [{
      id: 'gospel-station',
      name: '福音基站',
      count: articles.length
    }];
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToFolder(folderId: string) {
  router.push(`/gospel/folder/${folderId}`);
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

.count-text {
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
