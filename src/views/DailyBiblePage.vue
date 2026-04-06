<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>每日读经</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          placeholder="搜索读经内容"
          :debounce="300"
        ></ion-searchbar>
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
        <!-- 月份筛选 -->
        <div class="month-bar">
          <ion-chip
            :outline="selectedMonth !== -1"
            :color="selectedMonth === -1 ? 'primary' : 'medium'"
            @click="selectedMonth = -1"
          >
            <ion-label>当日</ion-label>
          </ion-chip>
          <ion-chip
            v-for="m in months"
            :key="m.month"
            :outline="selectedMonth !== m.month"
            :color="selectedMonth === m.month ? 'primary' : 'medium'"
            @click="selectedMonth = m.month"
          >
            <ion-label>{{ m.name }}</ion-label>
          </ion-chip>
        </div>

        <!-- 读经列表 -->
        <ion-list lines="full">
          <ion-item
            v-for="day in filteredDays"
            :key="`${day.month}-${day.day}`"
            button
            detail
            @click="goToDetail(day.month, day.day)"
          >
            <div class="day-badge" slot="start">
              <span class="day-number">{{ day.day }}</span>
            </div>
            <ion-label>
              <h3>{{ day.title }}</h3>
              <p class="date-text">{{ day.date }}</p>
              <div class="tag-row">
                <ion-badge v-if="day.audioUrl" color="success" class="tag-badge">
                  <ion-icon :icon="headsetOutline" class="audio-badge-icon"></ion-icon>
                  有音频
                </ion-badge>
                <ion-badge color="primary" class="tag-badge">
                  {{ day.monthName }}
                </ion-badge>
              </div>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-if="filteredDays.length === 0" class="empty-state">
          <ion-icon :icon="bookOutline" class="empty-icon"></ion-icon>
          <p>{{ searchQuery ? '未找到匹配的读经内容' : '暂无读经内容' }}</p>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  IonBadge,
  RefresherCustomEvent,
} from '@ionic/vue';
import { bookOutline, headsetOutline } from 'ionicons/icons';
import { getDailyBible } from '@/services/cos';
import type { DailyBibleMonth, DailyBibleDay } from '@/types';

interface FlatDay extends DailyBibleDay {
  month: number;
  monthName: string;
}

const router = useRouter();
const loading = ref(true);
const searchQuery = ref('');
const now = new Date();
const todayStr = `${now.getMonth() + 1}月${now.getDate()}日`;
const selectedMonth = ref(-1);
const months = ref<DailyBibleMonth[]>([]);
const allDays = ref<FlatDay[]>([]);

const filteredDays = computed(() => {
  let result = allDays.value;
  if (selectedMonth.value === -1) {
    result = result.filter((d) => d.date === todayStr);
  } else if (selectedMonth.value) {
    result = result.filter((d) => d.month === selectedMonth.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.date.toLowerCase().includes(q)
    );
  }
  return result;
});

function flattenDays(dailyBible: DailyBibleMonth[]): FlatDay[] {
  const flat: FlatDay[] = [];
  for (const m of dailyBible) {
    for (const d of m.days) {
      flat.push({
        ...d,
        month: m.month,
        monthName: m.name,
      });
    }
  }
  return flat;
}

async function loadData() {
  try {
    const data = await getDailyBible();
    months.value = data;
    allDays.value = flattenDays(data);
  } catch (e) {
    console.error('加载每日读经失败:', e);
  } finally {
    loading.value = false;
  }
}

function handleRefresh(event: RefresherCustomEvent) {
  getDailyBible().then((data) => {
    months.value = data;
    allDays.value = flattenDays(data);
    event.target.complete();
  }).catch(() => {
    event.target.complete();
  });
}

function goToDetail(month: number, day: number) {
  router.push(`/daily-bible/${month}/${day}`);
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

.month-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
}

.day-badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.day-number {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.date-text {
  font-size: 13px;
  color: var(--ion-color-medium);
}

.tag-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.tag-badge {
  font-size: 11px;
}

.audio-badge-icon {
  font-size: 12px;
  margin-right: 2px;
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
