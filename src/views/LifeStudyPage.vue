<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start" v-if="selectedFolder || selectedBook">
          <ion-back-button :default-href="backHref" @click="goBack" />
        </ion-buttons>
        <ion-title>生命读经</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-else>
        <!-- 面包屑导航 -->
        <div v-if="selectedFolder" class="breadcrumb">
          <span class="breadcrumb-item" @click="selectedFolder = ''; selectedBook = ''">
            <ion-icon :icon="homeOutline" />
            <span>全部</span>
          </span>
          <template v-if="selectedBook">
            <ion-icon :icon="chevronForwardOutline" class="breadcrumb-sep" />
            <span class="breadcrumb-item" @click="selectedBook = ''">{{ selectedFolderName }}</span>
          </template>
          <ion-icon :icon="chevronForwardOutline" class="breadcrumb-sep" />
          <span class="breadcrumb-current">{{ selectedBook || selectedFolderName }}</span>
        </div>

        <!-- 根层级：新约/旧约文件夹 -->
        <div v-if="!selectedFolder" class="folder-section">
          <ion-list lines="none" v-if="displayFolders.length > 0">
            <ion-item
              v-for="folder in displayFolders"
              :key="folder.id"
              button
              detail
              @click="selectedFolder = folder.id"
            >
              <ion-icon :icon="folderOutline" slot="start" class="folder-icon"></ion-icon>
              <ion-label>
                <h3>{{ folder.name }}</h3>
                <p class="count-text">{{ folder.count }} 篇</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <div v-else class="empty-container">
            <ion-icon :icon="folderOutline" class="empty-icon"></ion-icon>
            <p>暂无内容</p>
          </div>
        </div>

        <!-- 书卷层级 -->
        <div v-else-if="selectedFolder && !selectedBook" class="folder-section">
          <ion-list lines="none" v-if="books.length > 0">
            <ion-item
              v-for="book in books"
              :key="book.name"
              button
              detail
              @click="selectedBook = book.name"
            >
              <ion-icon :icon="bookOutline" slot="start" class="folder-icon"></ion-icon>
              <ion-label>
                <h3>{{ book.name }}</h3>
                <p class="count-text">{{ book.count }} 篇</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <div v-else class="empty-container">
            <ion-icon :icon="bookOutline" class="empty-icon"></ion-icon>
            <p>暂无书卷</p>
          </div>
        </div>

        <!-- 音频列表层级 -->
        <div v-else>
          <ion-list lines="full" v-if="bookItems.length > 0">
            <ion-item
              v-for="item in bookItems"
              :key="item.id"
              button
              detail
              @click="goToDetail(item.id)"
            >
              <ion-icon :icon="headsetOutline" slot="start" class="item-icon"></ion-icon>
              <ion-label>
                <h3>{{ item.title }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div v-else class="empty-container">
            <ion-icon :icon="headsetOutline" class="empty-icon"></ion-icon>
            <p>暂无音频</p>
          </div>
        </div>
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
  IonButtons,
  IonBackButton,
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
import {
  folderOutline,
  bookOutline,
  headsetOutline,
  homeOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { getLifeStudyItems, getLifeStudyFolders } from '@/services/cos';
import type { LifeStudyItem, LifeStudyFolder } from '@/types';

const router = useRouter();
const loading = ref(true);
const selectedFolder = ref('');
const selectedBook = ref('');
const allItems = ref<LifeStudyItem[]>([]);
const allFolders = ref<LifeStudyFolder[]>([]);

const selectedFolderName = computed(() => {
  return allFolders.value.find(f => f.id === selectedFolder.value)?.name || '';
});

const backHref = computed(() => {
  if (selectedBook.value) return '';
  return '/tabs/hymns';
});

// 根层级文件夹显示
const displayFolders = computed(() => {
  return allFolders.value.map(f => ({
    id: f.id,
    name: f.name,
    count: allItems.value.filter(item => item.folder === f.id).length,
  }));
});

// 书卷层级：按 book 字段分组
const books = computed(() => {
  const folderItems = allItems.value.filter(item => item.folder === selectedFolder.value);
  const bookMap = new Map<string, { name: string; count: number }>();
  for (const item of folderItems) {
    const existing = bookMap.get(item.book);
    if (existing) existing.count++;
    else bookMap.set(item.book, { name: item.book, count: 1 });
  }
  return Array.from(bookMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
});

// 音频列表层级
const bookItems = computed(() => {
  return allItems.value
    .filter(item => item.folder === selectedFolder.value && item.book === selectedBook.value)
    .sort((a, b) => {
      const na = getEpisodeNum(a.title);
      const nb = getEpisodeNum(b.title);
      return na - nb;
    });
});

function getEpisodeNum(title: string): number {
  const m = title.match(/第(\d+)篇/);
  return m ? parseInt(m[1], 10) : 0;
}

async function loadData() {
  try {
    const [folders, items] = await Promise.all([getLifeStudyFolders(), getLifeStudyItems()]);
    allFolders.value = folders;
    allItems.value = items;
  } catch (e) {
    console.error('加载生命读经失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  Promise.all([getLifeStudyFolders(), getLifeStudyItems()]).then(([folders, items]) => {
    allFolders.value = folders;
    allItems.value = items;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goBack() {
  if (selectedBook.value) {
    selectedBook.value = '';
  } else if (selectedFolder.value) {
    selectedFolder.value = '';
  }
}

function goToDetail(id: string) {
  router.push(`/life-study/${id}`);
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

.breadcrumb {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ion-color-primary);
  cursor: pointer;
}

.breadcrumb-sep {
  font-size: 1rem;
  color: var(--ion-color-medium);
}

.breadcrumb-current {
  color: var(--ion-text-color);
  font-weight: 500;
}

.folder-section {
  padding: 0;
}

.folder-icon {
  font-size: 28px;
  color: var(--ion-color-primary);
  margin-right: 8px;
}

.item-icon {
  font-size: 28px;
  color: var(--ion-color-tertiary);
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
