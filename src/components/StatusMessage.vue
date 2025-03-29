<script setup>
const props = defineProps({
  message: { type: String, default: '' },
  isError: Boolean
});
</script>

<template>
  <p :class="{ 'status-error-text': props.isError }">
    {{ props.message }}
  </p>
</template>

<style>
  .status-error-text {
    color: red
  }
</style>
