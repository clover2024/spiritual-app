<template>
  <ion-footer>
    <ion-toolbar>
      <div class="bottom-nav">
        <a class="nav-item" @click="go('/tabs/videos')">
          <ion-icon :icon="playCircleOutline" />
          <span>视频</span>
        </a>
        <a class="nav-item" @click="go('/tabs/hymns')">
          <ion-icon :icon="musicalNotesOutline" />
          <span>音频</span>
        </a>
        <a class="nav-item" @click="go('/tabs/visual-bible')">
          <ion-icon :icon="imagesOutline" />
          <span>视觉圣经</span>
        </a>
        <a class="nav-item" @click="go('/tabs/gospel')">
          <ion-icon :icon="documentTextOutline" />
          <span>文字室</span>
        </a>
        <a class="nav-item" @click="go('/tabs/books')">
          <ion-icon :icon="bookOutline" />
          <span>书报</span>
        </a>
        <a class="nav-item" @click="go('/tabs/support')">
          <ion-icon :icon="heartOutline" />
          <span>赞赏</span>
        </a>
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import { IonFooter, IonToolbar, IonIcon } from '@ionic/vue';
import { useRouter } from 'vue-router';
import {
  playCircleOutline,
  bookOutline,
  musicalNotesOutline,
  imagesOutline,
  documentTextOutline,
  heartOutline,
} from 'ionicons/icons';

const router = useRouter();

function go(path: string) {
  router.push(path);
}
</script>

<style scoped>
.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 50px;
  padding: 0 4px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--ion-color-medium);
  font-size: 10px;
  min-width: 0;
  flex: 1;
  cursor: pointer;
}

.nav-item ion-icon {
  font-size: 22px;
}
</style>
