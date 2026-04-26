<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/visual-bible" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ folderName }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-else>
        <div class="gallery-grid">
          <div
            v-for="item in items"
            :key="item.id"
            class="gallery-item"
            @click="openImage(item)"
          >
            <img :src="item.imageUrl" :alt="item.title" loading="lazy" />
            <div class="gallery-caption">{{ item.title }}</div>
          </div>
        </div>

        <div v-if="items.length === 0" class="empty-state">
          <ion-icon :icon="imagesOutline" class="empty-icon" />
          <p>暂无作品</p>
        </div>
      </template>

      <!-- 全屏查看 -->
      <div v-if="fullscreenUrl" class="fullscreen-overlay" @click="fullscreenUrl = ''">
        <img :src="fullscreenUrl" class="fullscreen-image" @click.stop />
        <div class="fullscreen-close" @click="fullscreenUrl = ''">
          <ion-icon :icon="closeOutline" />
        </div>
      </div>
    </ion-content>
    <BottomNav />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonSpinner,
} from '@ionic/vue';
import { imagesOutline, closeOutline } from 'ionicons/icons';
import { getVisualBibleItems, getVisualBibleFolders } from '@/services/cos';
import BottomNav from '@/components/BottomNav.vue';
import { setupWxShare } from '@/composables/useWxShare';
import { resetPageMeta } from '@/composables/usePageMeta';
import type { VisualBibleItem, VisualBibleFolder } from '@/types';

const route = useRoute();
const loading = ref(true);
const allItems = ref<VisualBibleItem[]>([]);
const allFolders = ref<VisualBibleFolder[]>([]);
const fullscreenUrl = ref('');

const folderSlug = computed(() => route.params.folderId as string);
const currentFolder = computed(() => allFolders.value.find(f => f.slug === folderSlug.value));
const folderName = computed(() => currentFolder.value?.name || '');
const items = computed(() => allItems.value.filter(i => i.folder === folderSlug.value));

function openImage(item: VisualBibleItem) {
  fullscreenUrl.value = item.imageUrl;
}

async function loadData() {
  try {
    const [items, folders] = await Promise.all([getVisualBibleItems(), getVisualBibleFolders()]);
    allItems.value = items;
    allFolders.value = folders;

    const folder = folders.find(f => f.slug === folderSlug.value);
    if (folder) {
      setupWxShare({
        title: `视觉圣经-${folder.name}`,
        description: `${folder.name} · ${items.filter(i => i.folder === folder.slug).length} 幅作品`,
      });
    }
  } catch (e) {
    console.error('加载视觉圣经作品失败:', e);
  } finally {
    loading.value = false;
  }
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

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px;
}

.gallery-item {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-light);
  transition: transform 0.15s;
}

.gallery-item:active {
  transform: scale(0.97);
}

.gallery-item img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}

.gallery-caption {
  padding: 8px 10px;
  font-size: 0.85rem;
  color: var(--ion-color-dark);
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

.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.fullscreen-close {
  position: fixed;
  top: 16px;
  right: 16px;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  z-index: 1001;
  padding: 8px;
}
</style>
