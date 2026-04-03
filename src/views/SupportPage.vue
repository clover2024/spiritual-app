<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>赞赏支持</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="support-container">
        <!-- 圣经经文 -->
        <div class="verse-card">
          <div class="verse-quote">"</div>
          <p class="verse-text">
            各人要随本心所酌定的，不要作难，不要勉强，因为捐得乐意的人是神所喜爱的。
          </p>
          <p class="verse-ref">哥林多后书 9:7</p>
        </div>

        <!-- 说明文字 -->
        <div class="intro-card">
          <ion-icon :icon="heartOutline" class="intro-icon"></ion-icon>
          <h2 class="intro-title">感谢您的使用</h2>
          <p class="intro-text">
            本应用的持续运行需要服务器存储、网络带宽等费用支持。所有视频、诗歌、书报资源均托管在云存储上，每次播放都会产生流量费用。如果这些属灵资源对您有帮助，欢迎赞赏支持，帮助我们继续维护和更新。
          </p>
        </div>

        <!-- 赞赏二维码 -->
        <div class="qr-card">
          <h3 class="qr-title">扫码赞赏</h3>
          <div class="qr-wrapper">
            <img :src="qrUrl" alt="赞赏码" class="qr-image" />
          </div>
          <p class="qr-hint">截图保存并扫描二维码即可赞赏</p>
        </div>

        <!-- 第二段经文 -->
        <div class="verse-card verse-card-small">
          <p class="verse-text verse-text-small">
            "因为你的财宝在哪里，你的心也在那里。"
          </p>
          <p class="verse-ref">马太福音 6:21</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/vue';
import { heartOutline } from 'ionicons/icons';
import { getFullUrl } from '@/services/cos';

const qrUrl = getFullUrl('/images/support-qr.jpg');
</script>

<style scoped>
.support-container {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

/* 经文卡片 */
.verse-card {
  position: relative;
  background: #faf6f0;
  border-radius: 16px;
  padding: 28px 24px 20px;
  margin-bottom: 16px;
  text-align: center;
}

.verse-card-small {
  padding: 20px 24px 16px;
}

.verse-quote {
  font-size: 48px;
  line-height: 1;
  color: #c4a97d;
  font-family: Georgia, serif;
  position: absolute;
  top: 4px;
  left: 16px;
  opacity: 0.6;
}

.verse-text {
  font-size: 16px;
  font-style: italic;
  color: #5c4a3a;
  line-height: 2;
  margin: 0;
}

.verse-text-small {
  font-size: 14px;
}

.verse-ref {
  font-size: 13px;
  color: #a08e7a;
  margin: 8px 0 0;
  text-align: right;
  font-style: normal;
}

@media (prefers-color-scheme: dark) {
  .verse-card {
    background: #2c2418;
  }
  .verse-text {
    color: #e8dcc8;
  }
  .verse-quote {
    color: #8a7a5a;
  }
  .verse-ref {
    color: #8a7e6a;
  }
}

/* 说明卡片 */
.intro-card {
  background: var(--ion-card-background, #fff);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.intro-icon {
  font-size: 32px;
  color: #c4a97d;
  margin-bottom: 8px;
}

.intro-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--ion-text-color);
}

.intro-text {
  font-size: 14px;
  line-height: 1.9;
  color: var(--ion-color-medium-shade);
  margin: 0;
  text-align: left;
}

/* 二维码卡片 */
.qr-card {
  background: var(--ion-card-background, #fff);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.qr-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--ion-text-color);
}

.qr-wrapper {
  display: inline-block;
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.qr-image {
  width: 200px;
  height: 200px;
  object-fit: contain;
  border-radius: 8px;
}

.qr-hint {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 12px 0 0;
}
</style>
