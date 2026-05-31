<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>福音单张</ion-title>
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
        <div class="tract-grid ion-padding">
          <div
            v-for="tract in tracts"
            :key="tract.id"
            class="tract-card"
            @click="openViewer(tract)"
          >
            <div class="tract-cover">
              <img :src="tract.images[0]" :alt="tract.title" loading="lazy" />
            </div>
            <div class="tract-title">{{ tract.title }}</div>
          </div>
        </div>

        <div v-if="tracts.length === 0" class="empty-state">
          <ion-icon :icon="imagesOutline" class="empty-icon"></ion-icon>
          <p>暂无福音单张</p>
        </div>
      </template>

      <!-- Fullscreen viewer -->
      <div v-if="viewerTract" class="viewer-overlay" @click="viewerTract = null">
        <div class="viewer-close" @click.stop="viewerTract = null">
          <ion-icon :icon="closeOutline" />
        </div>
        <div class="viewer-content" @click.stop>
          <img
            :src="viewerTract.images[viewerIndex]"
            :alt="viewerTract.title"
            class="viewer-image"
          />
        </div>
        <div class="viewer-nav">
          <ion-button fill="clear" :disabled="viewerIndex <= 0" @click.stop="viewerIndex--">
            <ion-icon :icon="arrowBackOutline" slot="icon-only" color="light"></ion-icon>
          </ion-button>
          <span class="viewer-counter">{{ viewerIndex + 1 }} / {{ viewerTract.images.length }}</span>
          <ion-button fill="clear" :disabled="viewerIndex >= viewerTract.images.length - 1" @click.stop="viewerIndex++">
            <ion-icon :icon="arrowForwardOutline" slot="icon-only" color="light"></ion-icon>
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/vue';
import { imagesOutline, closeOutline, arrowBackOutline, arrowForwardOutline } from 'ionicons/icons';
import { getGospelTracts } from '@/services/cos';
import type { GospelTract } from '@/types';

const loading = ref(true);
const tracts = ref<GospelTract[]>([]);
const viewerTract = ref<GospelTract | null>(null);
const viewerIndex = ref(0);

async function loadData() {
  try {
    tracts.value = await getGospelTracts();
  } catch (e) {
    console.error('加载福音单张失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getGospelTracts().then(data => {
    tracts.value = data;
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function openViewer(tract: GospelTract) {
  viewerTract.value = tract;
  viewerIndex.value = 0;
}

onMounted(loadData);
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

.tract-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-top: 4px;
}

.tract-card {
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-light);
  cursor: pointer;
  transition: transform 0.1s;
}

.tract-card:active {
  transform: scale(0.97);
}

.tract-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
}

.tract-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tract-title {
  padding: 8px 10px;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Fullscreen viewer */
.viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 300;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.viewer-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 301;
  font-size: 28px;
  color: #fff;
  cursor: pointer;
  padding: 4px;
}

.viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 8px 8px;
  overflow: hidden;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.viewer-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0 24px;
}

.viewer-counter {
  color: #fff;
  font-size: 14px;
  min-width: 60px;
  text-align: center;
}
</style>
