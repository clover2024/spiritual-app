<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="videos" href="/tabs/videos">
          <ion-icon aria-hidden="true" :icon="playCircleOutline" />
          <ion-label>视频</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="hymns" href="/tabs/hymns">
          <ion-icon aria-hidden="true" :icon="musicalNotesOutline" />
          <ion-label>音频</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="gospel" href="/tabs/gospel">
          <ion-icon aria-hidden="true" :icon="appsOutline" />
          <ion-label>福音</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="books" href="/tabs/books">
          <ion-icon aria-hidden="true" :icon="bookOutline" />
          <ion-label>书报</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="support" href="/tabs/support">
          <ion-icon aria-hidden="true" :icon="heartOutline" />
          <ion-label>赞赏</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet,
} from '@ionic/vue';
import { playCircleOutline, bookOutline, musicalNotesOutline, appsOutline, heartOutline } from 'ionicons/icons';
</script>
