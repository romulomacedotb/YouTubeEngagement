import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../pages/DashboardPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage
    },
    {
      path: '/subscribers',
      name: 'subscribers',
      component: () => import('../pages/ChannelsPage.vue')
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('../pages/TemplatesPage.vue')
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: () => import('../pages/JobsPage.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue')
    }
  ]
});

export default router;
