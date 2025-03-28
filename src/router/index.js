import { createRouter, createWebHistory } from 'vue-router';
import { useMaster } from '../js/usbMaster';

const routes = [
  {
    path: '/',
    redirect: '/webapp',
  },
  {
    path: '/webapp',
    children: [
      {
        path: '',
        name: 'home',
        component: () =>
          import(/* webpackChunkName: "app" */ '@/views/HomePage.vue'),
      },
      {
        path: 'terms-of-use',
        name: 'terms-of-use',
        component: () =>
          import(/* webpackChunkName: "app" */ '@/views/TermsOfUse.vue'),
      },
      {
        path: 'uart',
        meta: { requiresMaster: true },
        children: [
          {
            path: '',
            name: 'uart',
            redirect: { name: 'uart-bootloader' },
          },
          {
            path: 'bootloader',
            name: 'uart-bootloader',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/uart/UartBootloader.vue'),
          },
          {
            path: 'terminal',
            name: 'uart-terminal',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/uart/UartTerminal.vue'),
          },
        ],
      },
      {
        path: 'system',
        meta: { requiresMaster: true },
        children: [
          {
            path: '',
            name: 'system',
            redirect: { name: 'system-details' },
          },
          {
            path: 'details',
            name: 'system-details',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/system/SystemDetails.vue'),
          },
          {
            path: 'config',
            name: 'system-config',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/system/SystemConfig.vue'),
          },
          {
            path: 'upgrade',
            name: 'system-upgrade',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/system/SystemUpgrade.vue'),
          },
          {
            path: 'reboot',
            name: 'system-reboot',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/system/SystemReboot.vue'),
          },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  if (to.meta.requiresMaster) {
    const master = await useMaster();
    if (!master.isSelected()) {
      return {
        path: '/webapp',
        query: { redirect: to.path },
      }
    }
  }
})

export default router
