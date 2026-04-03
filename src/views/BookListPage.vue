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

      <div v-else-if="filteredBooks.length > 0" class="book-grid">
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

      <div v-if="!loading && filteredBooks.length === 0" class="empty-state">
        <ion-icon :icon="bookOutline" class="empty-icon"></ion-icon>
        <p>{{ searchQuery ? '未找到匹配的书报' : '暂无书报内容' }}</p>
      </div>
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
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { bookOutline } from 'ionicons/icons';
import { getBooks } from '@/services/cos';
import type { BookItem } from '@/types';

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const books = ref<BookItem[]>([]);

const filteredBooks = computed(() => {
  if (!searchQuery.value) return books.value;
  const q = searchQuery.value.toLowerCase();
  return books.value.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
  );
});

async function loadData() {
  try {
    books.value = await getBooks();
  } catch (e) {
    console.error('加载书报失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getBooks().then((b) => {
    books.value = b;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToBook(id: string) {
  router.push(`/book/${id}`);
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
