import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/videos',
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/videos',
      },
      {
        path: 'videos',
        component: () => import('@/views/VideoListPage.vue'),
      },
      {
        path: 'books',
        component: () => import('@/views/BookListPage.vue'),
      },
      {
        path: 'hymns',
        component: () => import('@/views/HymnListPage.vue'),
      },
      {
        path: 'daily-bible',
        component: () => import('@/views/DailyBiblePage.vue'),
      },
      {
        path: 'support',
        component: () => import('@/views/SupportPage.vue'),
      },
      {
        path: 'gospel',
        component: () => import('@/views/GospelStationPage.vue'),
      },
    ],
  },
  {
    path: '/video/:id',
    component: () => import('@/views/VideoDetailPage.vue'),
  },
  {
    path: '/book/:id',
    component: () => import('@/views/BookReaderPage.vue'),
  },
  {
    path: '/hymn/:id',
    component: () => import('@/views/HymnDetailPage.vue'),
  },
  {
    path: '/daily-bible/:month/:day',
    component: () => import('@/views/DailyBibleDetailPage.vue'),
  },
  {
    path: '/gospel/folder/:folderId',
    component: () => import('@/views/GospelFolderPage.vue'),
  },
  {
    path: '/gospel/:id',
    component: () => import('@/views/GospelDetailPage.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
