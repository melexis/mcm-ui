<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { gt } from 'semver';

import ProgressBar from '../../components/ProgressBar.vue';
import StatusMessage from '../../components/StatusMessage.vue';

import { useMaster } from '../../js/usbMaster';

const master = useMaster();
const working = ref(false);
const statusMsg = ref('');
const statusMsgIsError = ref(false);
const progbarProgress = ref(0);
const progbarIsAnimated = ref(false);
const firmwareRevRead = ref(false);
const firmwareVersion = ref('');
const upgradeAvailable = ref(false);
const newFirmware = 'v0.14.0';

onMounted(() => {
  master.getVersion()
    .then((version) => {
      firmwareVersion.value = version;
      upgradeAvailable.value = gt(newFirmware, firmwareVersion.value);
      firmwareRevRead.value = true;
    });
});

function progressCallback (step, total) {
  progbarProgress.value = 100 * step / total;
}

function upgradeClicked () {
  working.value = true;
  statusMsg.value = '';
  statusMsgIsError.value = false;
  progbarProgress.value = 0;
  progbarIsAnimated.value = true;
  statusMsg.value = 'Getting new binary...';
  return axios
    .get(`${import.meta.env.BASE_URL}mcm-81339-${newFirmware.replaceAll('.', '-')}.bin`,
      {
        responseType: 'arraybuffer',
        headers: { 'Content-Type': 'application/octet-stream' }
      })
    .then((response) => {
      statusMsg.value = 'Transferring binary...';
      return master.upgradeFirmware(response.data, progressCallback);
    })
    .then(() => {
      statusMsg.value = 'Upgrade successful';
      progbarProgress.value = 100;
      progbarIsAnimated.value = false;
      working.value = false;
      return Promise.resolve();
    })
    .catch((error) => {
      console.log(error);
      statusMsg.value = `Upgrading failed with ${error}`;
      statusMsgIsError.value = true;
      progbarProgress.value = 0;
      progbarIsAnimated.value = false;
      working.value = false;
    });
}

function computedBusy () {
  return working.value;
}
</script>

<template>
  <div class="row">
    <div class="container">
      <br>
      <h1>System Upgrade</h1>
      <div v-if="!firmwareRevRead">
        <p>Checking for firmware updates...</p>
      </div>
      <div v-if="firmwareRevRead">
        <div v-if="upgradeAvailable">
          <p>Press 'Upgrade' to upgrade the firmware from {{ firmwareVersion }} to {{ newFirmware }}.</p>
          <div class="form-group">
            <button
              class="btn btn-primary"
              :disabled="computedBusy()"
              @click="upgradeClicked"
            >
              Upgrade
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
              :is-error="statusMsgIsError"
              :message="statusMsg"
            />
          </div>
        </div>
        <div v-if="!upgradeAvailable">
          <p>Your MCM is running the most recent firmware.</p>
        </div>
      </div>
    </div>
  </div>
</template>
