<script setup>
import { ref } from 'vue';

import ProgressBar from '../../components/ProgressBar.vue';
import StatusMessage from '../../components/StatusMessage.vue';

import { getFileContent } from '../../js/fileHandlers';
import { useMaster } from '../../js/usbMaster';
import { McmLin } from '../../js/usbMcmLin';

const products = ref([
  { projId: 4609, fullName: 'MLX81113xAA', NvramVerif: false, flashCsProg: false },
  { projId: 4611, fullName: 'MLX81113xAB', NvramVerif: false, flashCsProg: false },
  { projId: 6145, fullName: 'MLX81118xAA', NvramVerif: false, flashCsProg: false },
  { projId: 6146, fullName: 'MLX81118xAB', NvramVerif: true, flashCsProg: true },
  { projId: 5633, fullName: 'MLX81160-xLW-AMx-001', NvramVerif: false, flashCsProg: false },
  { projId: 1300, fullName: 'MLX81330-xDC-BMx-002', NvramVerif: false, flashCsProg: false },
  { projId: 1301, fullName: 'MLX81330-xLW-BMx-102', NvramVerif: false, flashCsProg: false },
  { projId: 1302, fullName: 'MLX81330-xDC-BMx-102', NvramVerif: false, flashCsProg: false },
  { projId: 1303, fullName: 'MLX81330-xDC-BMx-202', NvramVerif: false, flashCsProg: false },
  { projId: 1304, fullName: 'MLX81330-xDC-BMx-302', NvramVerif: false, flashCsProg: false },
  { projId: 1305, fullName: 'MLX81330-xDC-BMx-402', NvramVerif: false, flashCsProg: false },
  { projId: 1807, fullName: 'MLX81332-xLW-BMx-202', NvramVerif: false, flashCsProg: false },
  { projId: 1808, fullName: 'MLX81332-xDC-BMx-002', NvramVerif: false, flashCsProg: false },
  { projId: 1809, fullName: 'MLX81332-xDC-BMx-102', NvramVerif: false, flashCsProg: false },
  { projId: 1810, fullName: 'MLX81332-xDC-BMx-202', NvramVerif: false, flashCsProg: false },
  { projId: 1811, fullName: 'MLX81332-xDC-BMx-302', NvramVerif: false, flashCsProg: false },
  { projId: 2305, fullName: 'MLX81334-xLW-AMx-001', NvramVerif: false, flashCsProg: false },
  { projId: 9475, fullName: 'MLX81339-xDC-AMx-202', NvramVerif: true, flashCsProg: false },
  { projId: 9476, fullName: 'MLX81339-xLW-AMx-202', NvramVerif: true, flashCsProg: false },
  { projId: 9477, fullName: 'MLX81339-xDC-BMx-202', NvramVerif: true, flashCsProg: false },
  { projId: 9478, fullName: 'MLX81339-xLW-BMx-202', NvramVerif: true, flashCsProg: false },
  { projId: 2565, fullName: 'MLX81340-xLW-BMx-003', NvramVerif: false, flashCsProg: false },
  { projId: 2566, fullName: 'MLX81340-xLW-BMx-103', NvramVerif: false, flashCsProg: false },
  { projId: 3075, fullName: 'MLX81344-xLW-BMx-003', NvramVerif: false, flashCsProg: false },
  { projId: 3076, fullName: 'MLX81344-xLW-BMx-103', NvramVerif: false, flashCsProg: false },
  { projId: 3589, fullName: 'MLX81346-xLW-BMx-003', NvramVerif: false, flashCsProg: false },
  { projId: 3590, fullName: 'MLX81346-xPF-BMx-003', NvramVerif: false, flashCsProg: false },
  { projId: 9729, fullName: 'MLX81350-xDC-AMx-001', NvramVerif: true, flashCsProg: false },
  { projId: 9730, fullName: 'MLX81350-xDC-AMx-101', NvramVerif: true, flashCsProg: false },
  { projId: 9731, fullName: 'MLX81350-xDC-AMx-201', NvramVerif: true, flashCsProg: false },
  { projId: 9732, fullName: 'MLX81350-xLW-AMx-101', NvramVerif: true, flashCsProg: false },
  { projId: 9733, fullName: 'MLX81350-xLW-AMx-900', NvramVerif: true, flashCsProg: false },
  { projId: 9734, fullName: 'MLX81350-xDC-BMx-002', NvramVerif: true, flashCsProg: false },
  { projId: 9735, fullName: 'MLX81350-xDC-BMx-102', NvramVerif: true, flashCsProg: false },
  { projId: 9736, fullName: 'MLX81350-xDC-BMx-202', NvramVerif: true, flashCsProg: false },
  { projId: 9737, fullName: 'MLX81350-xLW-BMx-102', NvramVerif: true, flashCsProg: false },
  { projId: 9738, fullName: 'MLX81350-xLW-BMx-902', NvramVerif: true, flashCsProg: false },
  { projId: 9985, fullName: 'MLX81352-xDC-AMx-000', NvramVerif: true, flashCsProg: false },
  { projId: 9986, fullName: 'MLX81352-xDC-AMx-100', NvramVerif: true, flashCsProg: false },
  { projId: 9987, fullName: 'MLX81352-xDC-AMx-200', NvramVerif: true, flashCsProg: false },
  { projId: 9988, fullName: 'MLX81352-xLW-AMx-100', NvramVerif: true, flashCsProg: false },
  { projId: 10241, fullName: 'MLX81354-xDC-AMx-000', NvramVerif: true, flashCsProg: false },
  { projId: 10242, fullName: 'MLX81354-xDC-AMx-100', NvramVerif: true, flashCsProg: false },
  { projId: 10243, fullName: 'MLX81354-xDC-AMx-200', NvramVerif: true, flashCsProg: false },
  { projId: 10244, fullName: 'MLX81354-xLW-AMx-100', NvramVerif: true, flashCsProg: false },
  { projId: 3329, fullName: 'MLX91230-xDC-AAx-xxx', NvramVerif: false, flashCsProg: false },
  { projId: 3330, fullName: 'MLX91230-xDC-BAx-xxx', NvramVerif: true, flashCsProg: false },
  { projId: 3331, fullName: 'MLX9123x-KDC-BBA-000', NvramVerif: true, flashCsProg: true },
  { projId: 3332, fullName: 'MLX91230KDC-BBA-100', NvramVerif: true, flashCsProg: true },
  { projId: 3333, fullName: 'MLX91230KDC-BBC-000', NvramVerif: true, flashCsProg: true },
  { projId: 3334, fullName: 'MLX91230KDC-BBC-100', NvramVerif: true, flashCsProg: true },
  { projId: 3335, fullName: 'MLX91231KDC-BBC-000', NvramVerif: true, flashCsProg: true },
  { projId: 3336, fullName: 'MLX91230KDC-BBC-200', NvramVerif: true, flashCsProg: true },
  { projId: 3337, fullName: 'MLX91231KGO-BBC-000', NvramVerif: true, flashCsProg: true },
]);
const manualPower = ref(false);
const enableBroadcast = ref(false);
const selProduct = ref(null);
const bitRate = ref(300000);
const flashFile = ref(null);
const flashCsFile = ref(null);
const nvramFile = ref(null);
const errorMsg = ref('');
const isErrorMsg = ref(false);
const progbarProgress = ref(0);
const progbarIsAnimated = ref(false);

const master = useMaster();
const mcm = new McmLin(master);

function setErrorMessage (msg, isError = true) {
  errorMsg.value = msg;
  isErrorMsg.value = isError;
}

function onFlashFileChange (e) {
  const files = e.target.files || e.dataTransfer.files;
  flashFile.value = null;
  if (!files.length) {
    return;
  }
  flashFile.value = files[0];
}

function onFlashCsFileChange (e) {
  const files = e.target.files || e.dataTransfer.files;
  flashCsFile.value = null;
  if (!files.length) {
    return;
  }
  flashCsFile.value = files[0];
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
  if (enableBroadcast.value && selProduct.value == null) {
    setErrorMessage('Please select a product first');
    return;
  }

  let file;
  progbarProgress.value = 0;
  progbarIsAnimated.value = true;
  setErrorMessage('', false);

  if (memory === 'Flash') {
    file = flashFile.value;
  } else if (memory === 'Flash_CS') {
    file = flashCsFile.value;
  } else {
    file = nvramFile.value;
  }

  if (file === null) {
    progbarProgress.value = 0;
    progbarIsAnimated.value = false;
    setErrorMessage('Select a hex file first');
    return;
  }
  doAction(operation, memory, file)
    .then(() => {
      progbarProgress.value = 100;
      progbarIsAnimated.value = false;
      setErrorMessage(`${operation} ${memory} finished successfully`, false);
    })
    .catch((error) => {
      progbarProgress.value = 0;
      progbarIsAnimated.value = false;
      setErrorMessage(error.message);
    });
}

function doAction (operation, memory, file) {
  progbarProgress.value = 10;
  setErrorMessage('Connection opened...', false);
  return getFileContent(file)
    .then((hexfile) => {
      progbarProgress.value = 15;
      setErrorMessage(`File successfully processed, ${memory} operation in progress...`, false);
      return mcm.bootload(
        hexfile,
        operation,
        memory,
        manualPower.value,
        bitRate.value,
        enableBroadcast.value ? selProduct.value.projId : '');
    });
}

function computedFlashEnabled () {
  return (flashFile.value !== null) && ((progbarProgress.value === 0) || (progbarProgress.value === 100));
}

function computedFlashCsEnabled () {
  return !enableBroadcast.value || (selProduct.value != null && selProduct.value.flashCsProg);
}

function computedNvramEnabled () {
  return (nvramFile.value !== null) &&
         ((progbarProgress.value === 0) || (progbarProgress.value === 100));
}

function computedNvramVerificationEnabled () {
  return (nvramFile.value !== null) &&
         (!enableBroadcast.value || (selProduct.value != null && selProduct.value.NvramVerif)) &&
         ((progbarProgress.value === 0) || (progbarProgress.value === 100));
}
</script>

<template>
  <div class="container">
    <br>
    <div class="row">
      <h1>One2one PPM Programmer</h1>
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
            id="broadcast"
            class="form-check"
          >
            <input
              id="checkEnablebroadcast"
              v-model="enableBroadcast"
              class="form-check-input"
              type="checkbox"
            >
            <label
              class="form-check-label"
              for="checkEnablebroadcast"
            >
              Broadcast programming
            </label>
          </div>
          <div
            v-if="enableBroadcast"
            id="product"
          >
            <label for="selectproduct">Product</label>
            <select
              id="selectproduct"
              v-model="selProduct"
              class="form-select"
            >
              <option
                disabled
                value=""
              >
                Please select product
              </option>
              <option
                v-for="product in products"
                :key="product.projId"
                :value="product"
              >
                {{ product.fullName }}
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
              <option
                selected
                value="300000"
              >
                300 kbps
              </option>
              <option value="250000">
                250 kbps
              </option>
              <option value="200000">
                200 kbps
              </option>
              <option value="150000">
                150 kbps
              </option>
              <option value="125000">
                125 kbps
              </option>
              <option value="100000">
                100 kbps
              </option>
              <option value="75000">
                75 kbps
              </option>
              <option value="50000">
                50 kbps
              </option>
              <option value="25000">
                25 kbps
              </option>
            </select>
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
        <div
          id="flash_cs"
          v-if="computedFlashCsEnabled()"
        >
          <br>
          <h2>Flash CS</h2>
          <input
            type="file"
            class="mlx-file"
            accept=".hex"
            @change="onFlashCsFileChange"
          >
          <br><br>
          <button
            class="btn btn-primary"
            :disabled="!flashCsFile"
            @click="program('Program', 'Flash_CS')"
          >
            Program
          </button>
          <button
            class="btn btn-primary"
            :disabled="!flashCsFile"
            @click="program('Verify', 'Flash_CS')"
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
            :disabled="!computedNvramVerificationEnabled()"
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
    width: 100%;
    padding: 5px;
    margin: 5px 0;
  }
</style>
