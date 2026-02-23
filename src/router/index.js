import { createRouter, createWebHistory } from 'vue-router';
import { useUsbTransport } from '../js/usbTransport';

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
        path: 'i2c',
        meta: { requiresMaster: true },
        children: [
          {
            path: '',
            name: 'i2c',
            redirect: { name: 'i2c-detect' },
          },
          {
            path: 'detect',
            name: 'i2c-detect',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/i2c/I2cDetect.vue'),
          },
          {
            path: 'device',
            children: [
              {
                path: '',
                name: 'i2c-device',
                component: () =>
                  import(/* webpackChunkName: "app" */ '@/views/i2c/I2cDevice.vue'),
              },
              {
                path: ':address',
                name: 'i2c-device-addressed',
                component: () =>
                  import(/* webpackChunkName: "app" */ '@/views/i2c/I2cDevice.vue'),
              },
            ],
          },
        ],
      },
      {
        path: 'lin',
        meta: { requiresMaster: true },
        children: [
          {
            path: '',
            name: 'lin',
            redirect: { name: 'lin-commander' },
          },
          {
            path: 'commander',
            name: 'lin-commander',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/lin/LinCommander.vue'),
          },
        ],
      },
      {
        path: 'ppm',
        meta: { requiresMaster: true },
        children: [
          {
            path: '',
            name: 'ppm',
            redirect: { name: 'ppm-one2one' },
          },
          {
            path: 'one2one',
            name: 'ppm-one2one',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/ppm/One2One.vue'),
          },
        ],
      },
      {
        path: 'pwm',
        meta: { requiresMaster: true },
        children: [
          {
            path: '',
            name: 'pwm',
            redirect: { name: 'pwm-controller' },
          },
          {
            path: 'controller',
            name: 'pwm-controller',
            component: () =>
              import(/* webpackChunkName: "app" */ '@/views/pwm/PwmController.vue'),
          },
        ],
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
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to) => {
  if (to.meta.requiresMaster) {
    const transport = await useUsbTransport();
    if (!transport.isSelected()) {
      return {
        path: '/webapp',
        query: { redirect: to.path },
      };
    }
  }
});

export default router;
