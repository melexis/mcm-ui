<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  content: { type: Array, default: new Array([]) },
  height: { type: String, default: '30em' }
});
const emit = defineEmits(['clear']);
const txtLogging = ref(null);
const logAutoScroll = ref(true);

watch(
  function () { return props.content.length; },
  function () {
    if (logAutoScroll.value === true) {
      setTimeout(function () {
        txtLogging.value.scrollTop = txtLogging.value.scrollHeight;
      }, 50);
    }
  }
);

function computedMessage (log) {
  const hours = (`0${log.time.getHours()}`).slice(-2);
  const minutes = (`0${log.time.getMinutes()}`).slice(-2);
  const seconds = (`0${log.time.getSeconds()}`).slice(-2);
  const milliseconds = (`00${log.time.getMilliseconds()}`).slice(-3);
  return `[${hours}:${minutes}:${seconds}:${milliseconds}] ${log.message}`;
}
</script>

<template>
  <p>
    <b>Logging</b><span style="float:right;"><a
      href="#"
      @click="emit('clear')"
    >clear</a></span>
  </p>
  <div
    ref="txtLogging"
    class="logging-box"
    :style="{ 'height': props.height }"
  >
    <template
      v-for="log in props.content"
      :key="log.time"
    >
      <span
        :class="{ 'log-error-text': log.level==='error', 'log-warning-text': log.level==='warning' }"
        v-html="computedMessage(log)"
      /><br>
    </template>
  </div>
  <input
    id="autoscroll"
    v-model="logAutoScroll"
    class="form-check-input"
    type="checkbox"
  >
  <label
    class="form-check-label"
    for="autoscroll"
  >Autoscroll</label>
</template>

<style>
  .logging-box{
    border-width: 1px;
    border-style: solid;
    border-radius: 3px;
    border-color: #ced4da;
    color: #49525c;
    background-color: #e9ecef;
    padding: 10px;
    overflow: auto;
  }
  .log-warning-text {
    color: blue;
  }
  .log-error-text {
    color: red;
  }
</style>
