<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/hymns" text="返回"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ hymn?.title || '音频' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>加载中...</p>
      </div>

      <template v-if="hymn">
        <div class="hymn-detail ion-padding">
          <!-- 标题区 -->
          <div class="hymn-header">
            <h1 class="hymn-title">{{ hymn.title }}</h1>
            <div class="hymn-meta">
              <span v-if="hymn.author">{{ hymn.author }}</span>
              <ion-badge v-if="hymn.category" color="tertiary" class="category-badge">
                {{ hymn.category }}
              </ion-badge>
            </div>
          </div>

          <!-- 音频播放器 -->
          <div v-if="hymn.audioUrl" class="audio-section">
            <!-- 版本切换 -->
            <div v-if="hymn.audioVersions && hymn.audioVersions.length > 1" class="version-tabs">
              <button
                v-for="v in hymn.audioVersions"
                :key="v.label"
                class="version-tab"
                :class="{ active: currentAudioUrl === v.url }"
                @click="switchVersion(v.url)"
              >{{ v.label }}</button>
            </div>
            <div class="audio-controls-bar">
              <button class="autoplay-toggle" :class="{ active: autoPlayNext }" @click="autoPlayNext = !autoPlayNext">
                <ion-icon :icon="playSkipForwardOutline" />
                <span>{{ autoPlayNext ? '连播开' : '连播关' }}</span>
              </button>
            </div>
            <audio
              ref="audioEl"
              class="audio-player"
              controls
              preload="auto"
              playsinline
              webkit-playsinline
              x5-playsinline
              x5-video-player-type="h5"
              :src="currentAudioUrl"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @ended="onAudioEnded"
            >
              您的浏览器不支持音频播放
            </audio>
          </div>

          <!-- 歌词区 -->
          <div class="lyrics-section">
            <div
              v-for="(stanza, index) in stanzas"
              :key="index"
              class="stanza"
            >
              <p
                v-for="(line, lineIndex) in stanza"
                :key="lineIndex"
                class="lyrics-line"
                :class="{ 'lyrics-verse-num': lineIndex === 0 && isVerseNum(line) }"
              >{{ line }}</p>
            </div>
          </div>

          <!-- 相关推荐 -->
          <div v-if="relatedHymns.length" class="related-section">
            <div class="related-title">相关推荐</div>
            <div class="related-list">
              <div
                v-for="rh in relatedHymns"
                :key="rh.id"
                class="related-item"
                @click="goToHymn(rh.id)"
              >
                <div class="related-thumb">
                  <ion-icon :icon="musicalNoteOutline" />
                </div>
                <div class="related-info">
                  <div class="related-name">{{ rh.title }}</div>
                  <div v-if="rh.author" class="related-date">{{ rh.author }}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </template>

      <div v-if="!loading && !hymn" class="empty-state">
        <p>未找到该音频</p>
      </div>
    </ion-content>
    <BottomNav />
  </ion-page>
</template>

<script lang="ts">
// Module-level: persists across component instances (Ionic re-creates on route change)
let _autoPlayNext = false;
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonBadge,
  IonSpinner,
  IonIcon,
} from '@ionic/vue';
import { musicalNoteOutline, playSkipForwardOutline } from 'ionicons/icons';
import { getHymns } from '@/services/cos';
import { setPageMeta, resetPageMeta } from '@/composables/usePageMeta';
import { setupWxShare } from '@/composables/useWxShare';
import BottomNav from '@/components/BottomNav.vue';
import type { HymnItem } from '@/types';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const hymn = ref<HymnItem | null>(null);
const allHymns = ref<HymnItem[]>([]);
const audioEl = ref<HTMLAudioElement | null>(null);
const currentAudioUrl = ref('');
const autoPlayNext = ref(_autoPlayNext);
let saveThrottleTimer = 0;

// Sync ref → module-level so next instance reads the latest value
watch(autoPlayNext, (v) => { _autoPlayNext = v; });

function switchVersion(url: string) {
  if (currentAudioUrl.value === url) return;
  const el = audioEl.value;
  let resumeTime = 0;
  if (el) {
    resumeTime = el.currentTime;
    el.pause();
  }
  currentAudioUrl.value = url;
  if (el && resumeTime > 0) {
    nextTick(() => {
      el.currentTime = resumeTime;
    });
  }
}

const cnNumMap: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

function isLikelyVerseNum(line: string, lastVerseNum: number): boolean {
  const t = line.trim();
  if (t === '副' || t === '（副）') return true;
  const n = cnNumMap[t];
  if (n === undefined) return false;
  // Accept if it's the first verse (一) or follows the expected sequence
  return n === 1 || n === lastVerseNum + 1;
}

const stanzas = computed(() => {
  if (!hymn.value?.lyrics) return [];
  let lyrics = hymn.value.lyrics;
  // Scraped lyrics (lifesongs.cn) use \n\n as line separator (no single \n).
  // Normalize: if there are no single \n between double \n\n, collapse \n\n → \n
  const hasSingleNewline = /[^\n]\n[^\n]/.test(lyrics);
  if (!hasSingleNewline) {
    lyrics = lyrics.replace(/\n\n+/g, '\n');
  }
  // Split into lines, then group by verse markers
  const lines = lyrics.split('\n').map((l) => l.trim()).filter((l) => l);
  const result: string[][] = [];
  let current: string[] = [];
  let lastVerseNum = 0;
  for (const line of lines) {
    // Skip header lines like "B-1", "A-2" etc.
    if (/^[A-Z]-\d+$/.test(line)) continue;
    // Skip credit lines like "词：..." or "曲：..."
    if (/^[词曲]/.test(line) && (line.includes('：') || line.includes(':'))) continue;
    if (isLikelyVerseNum(line, lastVerseNum) && current.length) {
      const n = cnNumMap[line.trim()];
      if (n !== undefined) lastVerseNum = n;
      result.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) result.push(current);
  return result;
});

function isVerseNum(line: string): boolean {
  const t = line.trim();
  return /^[一二三四五六七八九十]+$/.test(t) || t === '副' || t === '（副）';
}

function getSubFolder(audioUrl: string, category: string): string | null {
  const idx = audioUrl.indexOf('/' + category + '/');
  if (idx < 0) return null;
  const after = audioUrl.substring(idx + category.length + 2);
  const slashIdx = after.indexOf('/');
  if (slashIdx < 0) return null;
  return after.substring(0, slashIdx) || null;
}

const relatedHymns = computed(() => {
  if (!hymn.value) return [];
  const cat = hymn.value.category;
  if (!cat) return [];

  const curSub = hymn.value.audioUrl ? getSubFolder(hymn.value.audioUrl, cat) : null;

  // Build same-group list (preserving original order) including current item
  let groupWithCurrent: HymnItem[];
  if (curSub) {
    groupWithCurrent = allHymns.value.filter((h) =>
      h.category === cat &&
      h.audioUrl &&
      getSubFolder(h.audioUrl, cat) === curSub
    );
  } else {
    groupWithCurrent = allHymns.value.filter((h) => h.category === cat);
  }

  // Find current item's position within the group
  const curIdx = groupWithCurrent.findIndex((h) => h.id === hymn.value!.id);
  const sameGroup = groupWithCurrent.filter((h) => h.id !== hymn.value!.id);

  // Show items after current position first, then wrap to beginning
  const after = sameGroup.slice(curIdx);
  const before = sameGroup.slice(0, curIdx);
  return [...after, ...before].slice(0, 10);
});

function goToHymn(id: string) {
  router.push(`/hymn/${id}`);
}

function getProgressKey(id: string) {
  return `audio-progress:${id}`;
}

function saveProgress() {
  const el = audioEl.value;
  const h = hymn.value;
  if (!el || !h || !el.duration) return;
  if (el.currentTime / el.duration > 0.95) {
    localStorage.removeItem(getProgressKey(h.id));
  } else {
    localStorage.setItem(getProgressKey(h.id), String(Math.floor(el.currentTime)));
  }
}

function onTimeUpdate() {
  const now = Date.now();
  if (now - saveThrottleTimer < 3000) return;
  saveThrottleTimer = now;
  saveProgress();
}

function onLoadedMetadata() {
  const el = audioEl.value;
  const h = hymn.value;
  if (!el || !h) return;
  const saved = localStorage.getItem(getProgressKey(h.id));
  if (saved && Number(saved) > 0) {
    el.currentTime = Number(saved);
  }
}

function onPageHide() {
  saveProgress();
}

function onAudioEnded() {
  if (!autoPlayNext.value || !hymn.value) return;
  saveProgress();
  const next = relatedHymns.value[0];
  if (!next) return;
  const h = allHymns.value.find((item) => item.id === next.id);
  if (!h) return;
  // Switch data in-place without navigating (avoids WeChat autoplay block)
  hymn.value = h;
  currentAudioUrl.value = h.audioUrl || '';
  const desc = h.author || h.lyrics?.split('\n')[0] || '';
  setupWxShare({ title: h.title, description: desc });
  // Update URL without page change
  history.replaceState(null, '', `#/hymn/${h.id}`);
  // Play on same audio element — same user gesture chain, WeChat allows it
  nextTick(() => {
    const el = audioEl.value;
    if (el) el.play().catch(() => {});
  });
}

onMounted(async () => {
  try {
    const hymns = await getHymns();
    allHymns.value = hymns;
    const id = route.params.id as string;
    hymn.value = hymns.find((h) => h.id === id) || null;
    if (hymn.value) {
      currentAudioUrl.value = hymn.value.audioUrl || '';
      const desc = hymn.value.author || hymn.value.lyrics?.split('\n')[0] || '';
      setupWxShare({ title: hymn.value.title, description: desc });
      window.addEventListener('pagehide', onPageHide);
    }
  } catch (e) {
    console.error('加载音频详情失败:', e);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  resetPageMeta();
  saveProgress();
  window.removeEventListener('pagehide', onPageHide);
  if (audioEl.value) {
    audioEl.value.pause();
    audioEl.value.removeAttribute('src');
    audioEl.value.load();
  }
});

watch(() => route.params.id, async (newId) => {
  if (!newId || !allHymns.value.length) return;
  saveProgress();
  if (audioEl.value) {
    audioEl.value.pause();
    audioEl.value.currentTime = 0;
  }
  const h = allHymns.value.find((h) => h.id === newId);
  if (h) {
    hymn.value = h;
    currentAudioUrl.value = h.audioUrl || '';
    const desc = h.author || h.lyrics?.split('\n')[0] || '';
    setupWxShare({ title: h.title, description: desc });
  }
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

.hymn-header {
  margin-bottom: 20px;
}

.hymn-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.hymn-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.category-badge {
  font-size: 12px;
}

.audio-section {
  margin-bottom: 24px;
}

.version-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.version-tab {
  padding: 6px 16px;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 20px;
  background: var(--ion-background-color);
  color: var(--ion-color-medium);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.version-tab.active {
  background: var(--ion-color-primary);
  color: #fff;
  border-color: var(--ion-color-primary);
}

.audio-controls-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.autoplay-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 16px;
  background: var(--ion-background-color);
  color: var(--ion-color-medium);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.autoplay-toggle.active {
  background: var(--ion-color-tertiary);
  color: #fff;
  border-color: var(--ion-color-tertiary);
}

.audio-player {
  width: 100%;
  border-radius: 8px;
  outline: none;
}

.lyrics-section {
  line-height: 1;
  -webkit-user-select: text;
  -moz-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
}

.stanza {
  margin-bottom: 24px;
}

.lyrics-line {
  font-size: 16px;
  line-height: 2;
  text-align: center;
  margin: 0;
  white-space: pre-wrap;
}

.lyrics-verse-num {
  font-weight: 600;
  text-align: center;
  margin-bottom: 2px;
}

.related-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--ion-color-light-shade);
}

.related-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-medium);
  margin-bottom: 12px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--ion-color-light-shade);
  border-radius: 8px;
  overflow: hidden;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--ion-background-color);
  cursor: pointer;
}

.related-item:active {
  background: var(--ion-color-light);
}

.related-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: var(--ion-color-tertiary);
}

.related-info {
  flex: 1;
  min-width: 0;
}

.related-name {
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-date {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin-top: 2px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--ion-color-medium);
}
</style>
