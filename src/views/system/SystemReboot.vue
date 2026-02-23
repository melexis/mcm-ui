<script setup>
import { ref, onMounted } from 'vue';

import { useRouter } from 'vue-router';
import { useUsbTransport } from '../../js/usbTransport';

const timeLeft = ref(10);
const wait = ref('.');

const transport = useUsbTransport();
const router = useRouter();

const timer = setInterval(function () {
  timeLeft.value -= 0.25;
  if (timeLeft.value <= 0) {
    clearInterval(timer);
    router.push('/webapp');
  }
  wait.value += '.';
  if (wait.value.length > 3) {
    wait.value = '.';
  }
}, 250);
onMounted(function () {
  transport.restart();
});
</script>

<template>
  <div class="row">
    <div class="container">
      <br>
      <h1>System Rebooting{{ wait }}</h1>
      <p>This page will auto refresh in {{ Math.ceil(timeLeft) }} seconds</p>
    </div>
  </div>
</template>
