<script setup>
import { ref } from 'vue';
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  statusText: {
    type: String,
    default: ''
  }
});
const wait = ref('.');
setInterval(
  () => {
    wait.value += '.';
    if (wait.value.length > 3) {
      wait.value = '.';
    }
  },
  250);
function computedTitle () {
  return `${props.title}`;
}
function computedStatusText () {
  return `${props.statusText} ${wait.value}`;
}
</script>

<template>
  <i
    class="status-spinner"
    :title="computedTitle()"
  /><i v-if="props.statusText.length>0">{{ computedStatusText() }}</i>
</template>

<style>
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .status-spinner,
  .status-spinner:before {
    display: inline-block;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #000000;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    position: relative;
    vertical-align: inherit;
    line-height: inherit;
  }
  .status-spinner {
    top: 3px;
    margin: 0 3px;
  }
  .status-spinner:before {
    border-color: #f3f3f3 #f3f3f3 transparent transparent;
    position: absolute;
    left: -2px;
    top: -2px;
    border-style: solid;
  }
</style>
