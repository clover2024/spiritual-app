<template>
  <ion-footer>
    <ion-toolbar>
      <div class="bottom-nav">
        <a class="nav-item" href="/tabs/videos">
          <ion-icon :icon="playCircleOutline" />
          <span>视频</span>
        </a>
        <a class="nav-item" href="/tabs/hymns">
          <ion-icon :icon="musicalNotesOutline" />
          <span>音频</span>
        </a>
        <a class="nav-item" href="/tabs/gospel">
          <ion-icon :icon="documentTextOutline" />
          <span>福音基站</span>
        </a>
        <a class="nav-item" href="/tabs/books">
          <ion-icon :icon="bookOutline" />
          <span>书报</span>
        </a>
        <a class="nav-item" href="/tabs/daily-bible">
          <ion-icon :icon="calendarOutline" />
          <span>日日行</span>
        </a>
        <a class="nav-item" href="/tabs/support">
          <ion-icon :icon="heartOutline" />
          <span>赞赏</span>
        </a>
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import { IonFooter, IonToolbar, IonIcon } from '@ionic/vue';
import {
  playCircleOutline,
  bookOutline,
  musicalNotesOutline,
  calendarOutline,
  documentTextOutline,
  heartOutline,
} from 'ionicons/icons';
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
}

.nav-item ion-icon {
  font-size: 22px;
}

.nav-item.router-link-active,
.nav-item.active {
  color: var(--ion-color-primary);
}
</style>
