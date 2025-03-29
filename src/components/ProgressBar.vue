<script setup>
const props = defineProps({
  maximum: {
    type: [String, Number],
    default: 100
  },
  value: {
    type: [String, Number],
    default: 0
  },
  precision: {
    type: [String, Number],
    default: 0
  },
  isAnimated: {
    type: Boolean,
    default: false
  }
});
function progressBarStyles () {
  return { width: 100 * (computedValue() / computedMax()) + '%' };
}
function computedValue () {
  return parseFloat(props.value, 0);
}
function computedMax () {
  return parseFloat(props.maximum, 0);
}
function computedPrecision () {
  return parseInt(props.precision, 0);
}
function computedProgress () {
  const precision = computedPrecision();
  const p = Math.pow(10, precision);
  return ((100 * p * computedValue()) / computedMax() / p).toFixed(precision);
}
function computedText () {
  const progress = computedProgress();
  return progress > 0 ? `${progress} %` : '';
}
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    :aria-valuenow="computedProgress().toString()"
    aria-valuemin="0"
    :aria-valuemax="computedMax().toString()"
  >
    <div
      class="progress-bar"
      :class="{ 'progress-bar-striped': isAnimated, 'progress-bar-animated': isAnimated }"
      :style="progressBarStyles()"
    >
      {{ computedText() }}
    </div>
  </div>
</template>
