<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/life-study" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ item?.book || '生命读经' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="item">
        <div class="detail-content ion-padding">
          <h1 class="item-title">{{ item.title }}</h1>
          <p v-if="item.book" class="item-book">{{ item.book }}</p>

          <div v-if="item.audioUrl" class="audio-section">
            <audio
              class="audio-player"
              controls
              preload="metadata"
              playsinline
              webkit-playsinline
              x5-playsinline
              x5-video-player-type="h5"
              :src="item.audioUrl"
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        </div>
      </template>

      <div v-if="!loading && !item" class="empty-state">
        <p>未找到该音频</p>
      </div>
    </ion-content>
    <BottomNav />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/vue';
import { getLifeStudyItems } from '@/services/cos';
import { setPageMeta, resetPageMeta } from '@/composables/usePageMeta';
import { setupWxShare } from '@/composables/useWxShare';
import BottomNav from '@/components/BottomNav.vue';
import type { LifeStudyItem } from '@/types';

const route = useRoute();
const loading = ref(true);
const item = ref<LifeStudyItem | null>(null);

onMounted(async () => {
  try {
    const itemId = route.params.id as string;
    const items = await getLifeStudyItems();
    item.value = items.find(i => i.id === itemId) || null;

    if (item.value) {
      setPageMeta({ title: item.value.title });
      setupWxShare({
        title: item.value.title,
        description: `${item.value.book} - 生命读经`,
      });
    }
  } catch (e) {
    console.error('加载生命读经详情失败:', e);
  } finally {
    loading.value = false;
  }
});

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
  height: 300px;
  gap: 12px;
  color: var(--ion-color-medium);
}

.detail-content {
  padding: 16px;
}

.item-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.item-book {
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0 0 20px 0;
}

.audio-section {
  margin-top: 8px;
}

.audio-player {
  width: 100%;
  border-radius: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
