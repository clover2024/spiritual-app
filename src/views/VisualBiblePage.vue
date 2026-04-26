<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>视觉圣经</ion-title>
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
        <div class="folder-section">
          <div
            v-for="folder in folders"
            :key="folder.slug"
            class="entry-card"
            @click="router.push(`/visual-bible/${folder.slug}`)"
          >
            <div class="folder-card-icon">
              <ion-icon :icon="imagesOutline" />
            </div>
            <div class="folder-card-info">
              <span class="folder-name">{{ folder.name }}</span>
              <span class="folder-count">{{ folder.count || 0 }} 幅作品</span>
            </div>
            <ion-icon :icon="chevronForwardOutline" class="folder-arrow" />
          </div>
        </div>

        <div v-if="folders.length === 0" class="empty-state">
          <ion-icon :icon="imagesOutline" class="empty-icon" />
          <p>暂无作品</p>
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
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { imagesOutline, chevronForwardOutline } from 'ionicons/icons';
import { getVisualBibleFolders } from '@/services/cos';

const router = useRouter();
const loading = ref(true);
const folders = ref<{ slug: string; name: string; count?: number }[]>([]);

async function loadData() {
  try {
    folders.value = await getVisualBibleFolders();
  } catch (e) {
    console.error('加载视觉圣经失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getVisualBibleFolders().then((data) => {
    folders.value = data;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
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

.folder-section {
  padding: 0;
}

.entry-card {
  display: flex;
  align-items: center;
  padding: 18px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.entry-card:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.06);
}

.folder-card-icon {
  font-size: 2rem;
  color: var(--ion-color-tertiary);
  margin-right: 14px;
  flex-shrink: 0;
}

.folder-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.folder-name {
  font-size: 1.05rem;
  font-weight: 500;
}

.folder-count {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.folder-arrow {
  font-size: 1.2rem;
  color: var(--ion-color-medium);
  flex-shrink: 0;
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
