<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>福音</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="module-grid">
        <div class="module-card" @click="router.push('/tabs/visual-bible')">
          <div class="module-icon visual-bible-icon">
            <ion-icon :icon="imagesOutline" />
          </div>
          <div class="module-info">
            <span class="module-name">视觉圣经</span>
            <span class="module-desc">圣经经文视觉艺术</span>
          </div>
        </div>

        <div class="module-card" @click="router.push('/tabs/gospel-station')">
          <div class="module-icon gospel-station-icon">
            <ion-icon :icon="documentTextOutline" />
          </div>
          <div class="module-info">
            <span class="module-name">文字室</span>
            <span class="module-desc">福音文章阅读</span>
          </div>
        </div>

        <div class="module-card" @click="router.push('/tabs/gospel-tracts')">
          <div class="module-icon gospel-tracts-icon">
            <ion-icon :icon="newspaperOutline" />
          </div>
          <div class="module-info">
            <span class="module-name">福音单张</span>
            <span class="module-desc">福音小册子</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/vue';
import { imagesOutline, documentTextOutline, newspaperOutline } from 'ionicons/icons';

const router = useRouter();
</script>

<style scoped>
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding-top: 8px;
}

.module-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 12px 24px;
  border-radius: 16px;
  background: var(--ion-color-light);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.module-card:active {
  transform: scale(0.97);
  background: var(--ion-color-light-shade);
}

.module-icon {
  font-size: 2.4rem;
  margin-bottom: 12px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.visual-bible-icon {
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.gospel-station-icon {
  color: #fff;
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.gospel-tracts-icon {
  color: #fff;
  background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.module-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.module-name {
  font-size: 1rem;
  font-weight: 600;
}

.module-desc {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}
</style>
