<script setup>
import { ref } from 'vue';
import { vMaska } from 'maska/vue';

import ProgressBar from '../../components/ProgressBar.vue';
import StatusMessage from '../../components/StatusMessage.vue';

import { getFileContent } from '../../js/fileHandlers';
import { useMaster } from '../../js/usbMaster';
import { McmUart } from '../../js/usbMcmUart';

const manualPower = ref(false);
const enableFullDuplex = ref(false);
const selTxPin = ref('');
const bitRate = ref(115200);
const flashKey = ref('');
const flashFile = ref(null);
const nvramFile = ref(null);
const errorMsg = ref('');
const isErrorMsg = ref(false);
const progbarProgress = ref(0);
const progbarIsAnimated = ref(false);

const flashKeys = [0, 0, 0, 0];
const flashKeyError = ref(false);

const master = useMaster();
const mcm = new McmUart(master);

function onFlashKeyChange () {
  flashKeys[0] = 0;
  flashKeys[1] = 0;
  flashKeys[2] = 0;
  flashKeys[3] = 0;
  errorMsg.value = '';
  isErrorMsg.value = false;
  flashKeyError.value = false;
  if (flashKey.value !== '') {
    if (flashKey.value.match(/^[0-9A-Fa-f]{4}(:[0-9A-Fa-f]{4}){7}$/)) {
      const splitKeys = flashKey.value.split(':');
      flashKeys[0] = Number(`0x${splitKeys[1]}${splitKeys[0]}`);
      flashKeys[1] = Number(`0x${splitKeys[3]}${splitKeys[2]}`);
      flashKeys[2] = Number(`0x${splitKeys[5]}${splitKeys[4]}`);
      flashKeys[3] = Number(`0x${splitKeys[7]}${splitKeys[6]}`);
    } else {
      errorMsg.value = 'Flash protection key is invalid';
      isErrorMsg.value = true;
      flashKeyError.value = true;
    }
  }
}

function onFlashFileChange (e) {
  const files = e.target.files || e.dataTransfer.files;
  flashFile.value = null;
  if (!files.length) {
    return;
  }
  flashFile.value = files[0];
}

function onNvramFileChange (e) {
  const files = e.target.files || e.dataTransfer.files;
  nvramFile.value = null;
  if (!files.length) {
    return;
  }
  nvramFile.value = files[0];
}

function program (operation, memory) {
  let file;
  progbarProgress.value = 0;
  progbarIsAnimated.value = true;
  errorMsg.value = '';
  isErrorMsg.value = false;
  if (memory === 'Flash') {
    file = flashFile.value;
  } else {
    file = nvramFile.value;
  }
  if (file === null) {
    progbarProgress.value = 0;
    progbarIsAnimated.value = false;
    errorMsg.value = 'Select a hex file first';
    isErrorMsg.value = true;
    return;
  }
  doAction(operation, memory, file)
    .then(() => {
      progbarProgress.value = 100;
      progbarIsAnimated.value = false;
      errorMsg.value = `${operation} ${memory} finished successfully`;
      isErrorMsg.value = false;
    })
    .catch((error) => {
      progbarProgress.value = 0;
      progbarIsAnimated.value = false;
      errorMsg.value = error.message;
      isErrorMsg.value = true;
    });
}

function doAction (operation, memory, file) {
  progbarProgress.value = 10;
  errorMsg.value = 'Connection opened...';
  return getFileContent(file)
    .then((hexfile) => {
      progbarProgress.value = 15;
      errorMsg.value = `File successfully processed, ${memory} operation in progress...`;
      return mcm.bootload(
        hexfile,
        operation,
        memory,
        manualPower.value,
        bitRate.value,
        enableFullDuplex.value,
        enableFullDuplex.value ? parseInt(selTxPin.value) : 0,
        flashKeys);
    });
}

function computedFlashEnabled () {
  return (flashFile.value !== null) && !flashKeyError.value && ((progbarProgress.value === 0) || (progbarProgress.value === 100));
}

function computedNvramEnabled () {
  return (nvramFile.value !== null) && !flashKeyError.value && ((progbarProgress.value === 0) || (progbarProgress.value === 100));
}
</script>

<template>
  <div class="container">
    <br>
    <div class="row">
      <h1>UART Bootloader</h1>
    </div>
    <div class="row">
      <div class="col-md-5">
        <h2>Configuration</h2>
        <form @submit.prevent>
          <div
            id="manualpower"
            class="form-check"
          >
            <input
              id="checkmanualpower"
              v-model="manualPower"
              class="form-check-input"
              type="checkbox"
            >
            <label
              class="form-check-label"
              for="checkmanualpower"
            >
              Manual power cycling
            </label>
          </div>
          <div
            id="fullduplex"
            class="form-check"
          >
            <input
              id="checkFullDuplex"
              v-model="enableFullDuplex"
              class="form-check-input"
              type="checkbox"
            >
            <label
              class="form-check-label"
              for="checkFullDuplex"
            >
              Full duplex
            </label>
          </div>
          <div
            v-if="enableFullDuplex"
            id="txpin"
          >
            <label for="selecttxpin">TX Pin</label>
            <select
              id="selecttxpin"
              v-model="selTxPin"
              class="form-select"
            >
              <option
                disabled
                value=""
              >
                Please select tx pin
              </option>
              <option value="0">
                IO0
              </option>
              <option value="1">
                IO1
              </option>
              <option value="2">
                IO2
              </option>
              <option value="3">
                IO3
              </option>
              <option value="4">
                IO4
              </option>
              <option value="5">
                IO5
              </option>
              <option value="6">
                IO6
              </option>
              <option value="7">
                IO7
              </option>
            </select>
          </div>
          <div id="bitrate">
            <label for="selectbitrate">Bit rate</label>
            <select
              id="selectbitrate"
              v-model.number="bitRate"
              class="form-select"
            >
              <option value="460800">
                460.8 kbps
              </option>
              <option value="230400">
                230.4 kbps
              </option>
              <option
                selected
                value="115200"
              >
                115.2 kbps
              </option>
              <option value="57600">
                57.6 kbps
              </option>
              <option value="38400">
                38.4 kbps
              </option>
              <option value="19200">
                19.2 kbps
              </option>
              <option value="9600">
                9.6 kbps
              </option>
            </select>
          </div>
          <div id="flashkey">
            <label for="textFlashKey">Flash protection key</label>
            <input
              id="textFlashKey"
              v-model="flashKey"
              v-maska
              class="form-control"
              :style="flashKeyError?'color:red':''"
              type="text"
              data-maska="HHHH:HHHH:HHHH:HHHH:HHHH:HHHH:HHHH:HHHH"
              data-maska-tokens="H:[0-9a-fA-F]"
              @change="onFlashKeyChange"
            >
          </div>
        </form>
      </div>
      <div class="col-md-6 offset-md-1">
        <div id="flash">
          <h2>Flash</h2>
          <input
            type="file"
            class="mlx-file"
            accept=".hex"
            @change="onFlashFileChange"
          >
          <br><br>
          <button
            class="btn btn-primary"
            :disabled="!computedFlashEnabled()"
            @click="program('Program', 'Flash')"
          >
            Program
          </button>
          <button
            class="btn btn-primary"
            :disabled="!computedFlashEnabled()"
            @click="program('Verify', 'Flash')"
          >
            Verify
          </button>
        </div>
        <br>
        <div id="nvram">
          <h2>NVRAM</h2>
          <input
            type="file"
            class="mlx-file"
            accept=".hex"
            @change="onNvramFileChange"
          >
          <br><br>
          <button
            class="btn btn-primary"
            :disabled="!computedNvramEnabled()"
            @click="program('Program', 'NVRAM')"
          >
            Program
          </button>
          <button
            class="btn btn-primary"
            :disabled="!computedNvramEnabled()"
            @click="program('Verify', 'NVRAM')"
          >
            Verify
          </button>
        </div>
      </div>
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
  .mlx-file {
    width: 100%
  }
</style>
