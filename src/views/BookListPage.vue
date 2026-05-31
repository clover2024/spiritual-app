<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>书报资源</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="搜索书报"
          :debounce="300"
        ></ion-searchbar>
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
        <!-- Featured section: 倪柝声专区 -->
        <div v-if="showFeatured && niFolder && niBooks.length > 0" class="featured-section ion-padding">
          <div class="featured-banner" @click="openFolder(niFolder.id)">
            <div class="featured-info">
              <div class="featured-icon">
                <ion-icon :icon="libraryOutline" />
              </div>
              <div class="featured-text">
                <span class="featured-title">{{ niFolder.name }}</span>
                <span class="featured-desc">{{ niFolder.description }} · {{ niBooks.length }}本</span>
              </div>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="featured-arrow" />
          </div>
        </div>

        <!-- Folder detail view -->
        <template v-if="activeFolder">
          <div class="folder-header ion-padding">
            <ion-button fill="clear" size="small" @click="activeFolder = ''">
              <ion-icon :icon="arrowBackOutline" slot="icon-only"></ion-icon>
              <span>全部书报</span>
            </ion-button>
          </div>
          <div class="book-grid ion-padding">
            <div
              v-for="book in filteredBooks"
              :key="book.id"
              class="book-card"
              @click="goToBook(book.id)"
            >
              <div class="book-cover">
                <ion-img
                  v-if="book.coverUrl"
                  :src="book.coverUrl"
                  :alt="book.title"
                ></ion-img>
                <div v-else class="cover-placeholder">
                  <ion-icon :icon="bookOutline"></ion-icon>
                  <ion-badge :color="book.format === 'pdf' ? 'danger' : 'primary'">
                    {{ book.format?.toUpperCase() }}
                  </ion-badge>
                </div>
              </div>
              <div class="book-info">
                <h3>{{ book.title }}</h3>
                <p v-if="book.author">{{ book.author }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Normal grid view -->
        <template v-else>
          <div v-if="filteredBooks.length > 0" class="book-grid">
            <div
              v-for="book in filteredBooks"
              :key="book.id"
              class="book-card"
              @click="goToBook(book.id)"
            >
              <div class="book-cover">
                <ion-img
                  v-if="book.coverUrl"
                  :src="book.coverUrl"
                  :alt="book.title"
                ></ion-img>
                <div v-else class="cover-placeholder">
                  <ion-icon :icon="bookOutline"></ion-icon>
                  <ion-badge :color="book.format === 'pdf' ? 'danger' : 'primary'">
                    {{ book.format?.toUpperCase() }}
                  </ion-badge>
                </div>
              </div>
              <div class="book-info">
                <h3>{{ book.title }}</h3>
                <p v-if="book.author">{{ book.author }}</p>
              </div>
            </div>
          </div>
        </template>

        <div v-if="!loading && filteredBooks.length === 0" class="empty-state">
          <ion-icon :icon="bookOutline" class="empty-icon"></ion-icon>
          <p>{{ searchQuery ? '未找到匹配的书报' : '暂无书报内容' }}</p>
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
  IonTitle,
  IonContent,
  IonImg,
  IonIcon,
  IonBadge,
  IonSearchbar,
  IonSpinner,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { bookOutline, libraryOutline, chevronForwardOutline, arrowBackOutline } from 'ionicons/icons';
import { getBooks, getBookFolders } from '@/services/cos';
import type { BookItem, BookFolder } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const books = ref<BookItem[]>([]);
const folders = ref<BookFolder[]>([]);
const activeFolder = ref('');

const niFolder = computed(() => folders.value.find(f => f.id === 'ni-tuosheng'));
const niBooks = computed(() => books.value.filter(b => b.folder === 'ni-tuosheng'));
const showFeatured = computed(() => !searchQuery.value && !activeFolder.value);

const filteredBooks = computed(() => {
  let list = books.value;
  if (activeFolder.value) {
    list = list.filter(b => b.folder === activeFolder.value);
  }
  if (!searchQuery.value) return list;
  const q = searchQuery.value.toLowerCase();
  return list.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
  );
});

async function loadData() {
  try {
    const [items, folderList] = await Promise.all([getBooks(), getBookFolders()]);
    books.value = items;
    folders.value = folderList;
  } catch (e) {
    console.error('加载书报失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  Promise.all([getBooks(), getBookFolders()]).then(([items, folderList]) => {
    books.value = items;
    folders.value = folderList;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToBook(id: string) {
  router.push(`/book/${id}`);
}

function openFolder(folderId: string) {
  activeFolder.value = folderId;
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

/* Featured banner */
.featured-section {
  padding-bottom: 0;
}

.featured-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s;
}

.featured-banner:active {
  transform: scale(0.98);
}

.featured-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.featured-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.featured-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.featured-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.featured-desc {
  font-size: 0.8rem;
  opacity: 0.85;
}

.featured-arrow {
  font-size: 1.3rem;
  opacity: 0.7;
}

/* Folder header */
.folder-header {
  padding-bottom: 0;
}

/* Book grid */
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  padding: 16px;
}

.book-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.book-card:active {
  transform: scale(0.97);
}

.book-cover {
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
  gap: 8px;
  font-size: 32px;
  color: var(--ion-color-medium);
}

.book-info {
  padding: 8px 2px;
}

.book-info h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-info p {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 0;
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
</style>
