<script setup>
import { ref, reactive } from 'vue';

import ProgressBar from '../../components/ProgressBar.vue';
import StatusMessage from '../../components/StatusMessage.vue';

import router from '../../router/index.js';

import { useUsbTransport } from '../../js/usbTransport';
import { McmI2c } from '../../js/usbMcmI2c';

const transport = useUsbTransport();
const mcm = new McmI2c(transport);

const detecting = ref(false);
const bitrate = ref(400000);
const errorMsg = ref('');
const isErrorMsg = ref(false);
const progbarProgress = ref(0);
const progbarIsAnimated = ref(false);
const detectedMap = reactive(
  Array.from({ length: 128 }, () => ({
    probed: false,
    found: false
  }))
);

async function doDetection () {
  if (detecting.value) {
    return;
  }
  try {
    detecting.value = true;
    progbarProgress.value = 0;
    progbarIsAnimated.value = true;
    errorMsg.value = 'Starting...';
    isErrorMsg.value = false;

    resetMap();

    await mcm.enableSlavePower();
    await mcm.setup(bitrate.value);
    await new Promise(resolve => setTimeout(resolve, 100));

    errorMsg.value = 'Detecting...';
    isErrorMsg.value = false;

    for (let address = 0x1; address <= 0x7E; address++) {
      progbarProgress.value = 100 * address / 0x7E;
      progbarIsAnimated.value = true;

      const result = await mcm.probeAddress(address);

      detectedMap[address].probed = true;
      detectedMap[address].found = result;
    }

    progbarProgress.value = 100;
    progbarIsAnimated.value = false;
    errorMsg.value = 'Finished successfully';
    isErrorMsg.value = false;
  } catch (error) {
    progbarProgress.value = 0;
    progbarIsAnimated.value = false;
    errorMsg.value = error.message;
    isErrorMsg.value = true;
  } finally {
    await mcm.teardown();
    await mcm.disableSlavePower();
    detecting.value = false;
  }
}

function resetMap () {
  for (let i = 1; i < 127; i++) {
    detectedMap[i].probed = false;
    detectedMap[i].found = false;
  }
}

function isReserved (address) {
  return address === 0x00 || address === 0x7F;
}

function formatCell (address) {
  if (isReserved(address)) {
    return '';
  }

  const cell = detectedMap[address];

  if (!cell.probed) {
    return '';
  }

  if (cell.found) {
    return address.toString(16).padStart(2, '0').toUpperCase();
  }

  return '--';
}

function cellClass (address) {
  if (isReserved(address)) {
    return 'table-secondary';
  }

  const cell = detectedMap[address];

  if (!cell.probed) {
    return '';
  }

  if (cell.found) {
    return 'table-success fw-bold';
  }

  return 'table-light text-muted';
}

function addressIndex (row, col) {
  return (row - 1) * 16 + (col - 1);
}

function openDevice (address) {
  if (!detectedMap[address]?.found) {
    return;
  }
  router.push({ name: 'i2c-device-addressed', params: { address } });
}
</script>

<template>
  <div class="container">
    <br>
    <div class="row">
      <h1>I2C Detect</h1>
    </div>

    <br>

    <div class="container">
      <table class="table table-bordered text-center align-middle i2c-table">
        <thead>
          <tr>
            <th />
            <th
              v-for="col in 16"
              :key="'col'+col"
            >
              {{ (col - 1).toString(16).toUpperCase() }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in 8"
            :key="'row'+row"
          >
            <th>
              {{ ((row - 1) * 16).toString(16).padStart(2, '0').toUpperCase() }}
            </th>

            <td
              v-for="col in 16"
              :key="row + '-' + col"
              :class="cellClass(addressIndex(row, col))"
              style="cursor: pointer;"
              @click="openDevice(addressIndex(row, col))"
            >
              {{ formatCell(addressIndex(row, col)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <br>

    <div class="container">
      <button
        class="btn btn-primary"
        @click="doDetection()"
        :disabled="detecting"
      >
        Detect
      </button>
    </div>

    <br>

    <div class="container">
      <ProgressBar
        maximum="100"
        :value="progbarProgress"
        precision="0"
        :is-animated="progbarIsAnimated"
      />
      <StatusMessage
        :is-error="isErrorMsg"
        :message="errorMsg"
      />
    </div>
  </div>
</template>

<style scoped>
.i2c-table {
  table-layout: fixed;
  border-collapse: collapse;
  margin: 0 auto;              /* center horizontally */
}

.i2c-table th,
.i2c-table td {
  padding: 0;
  text-align: center;
  vertical-align: middle;
  font-family: monospace;
  font-size: 0.9rem;
  transition: background-color 0.15s ease, transform 0.05s ease;
}

/* Row header column (00, 10, 20, ...) */
.i2c-table th:first-child {
  width: 48px;                 /* slightly wider for row labels */
  font-weight: 600;
}

/* Column header row */
.i2c-table thead th {
  font-weight: 600;
  background-color: #f8f9fa;
}

/* Reserved addresses (0x00, 0x7F) */
.i2c-table td.table-secondary {
  background-color: #f1f3f5;
  color: #adb5bd;
  cursor: default;
}

/* Hover effect for clickable cells */
.i2c-table td:not(.table-secondary):hover {
  background-color: #e9ecef;
  transform: scale(1.05);
  z-index: 1;
}

/* Found device highlight refinement */
.i2c-table td.table-success {
  background-color: #d1e7dd !important;
  color: #0f5132;
}

/* Not found but probed */
.i2c-table td.table-light {
  background-color: #f8f9fa;
  color: #6c757d;
}

/* Prevent hover scaling from affecting layout */
.i2c-table td {
  position: relative;
}

/* Optional: subtle grid appearance */
.i2c-table th,
.i2c-table td {
  border: 1px solid #dee2e6;
}
</style>
