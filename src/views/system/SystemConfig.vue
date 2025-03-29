<script setup>
import { ref, onMounted } from 'vue';

import StatusMessage from '../../components/StatusMessage.vue';

import { useMaster } from '../../js/usbMaster';
import { McmUart } from '../../js/usbMcmUart';

const formEnabled = ref(false);
const hostname = ref('');
const ssid = ref('');
const password = ref('');
const showPassword = ref(false);
const statusMsg = ref('');
const statusMsgIsError = ref(false);

const currentData = {};
const master = useMaster();
const mcm = new McmUart(master);

onMounted(() => {
  mcm.getHostname()
    .then((response) => {
      currentData.hostname = response;
      hostname.value = response;
      return mcm.getSsid();
    })
    .then((response) => {
      currentData.ssid = response;
      ssid.value = response;
      return mcm.getPassword();
    })
    .then((response) => {
      currentData.password = response;
      password.value = response;
      formEnabled.value = true;
    })
    .catch((error) => {
      console.log(error);
      statusMsg.value = `Configuration getting failed with ${error}`;
      statusMsgIsError.value = true;
    });
});

function submit () {
  statusMsg.value = '';
  statusMsgIsError.value = false;
  return Promise.resolve()
    .then(() => {
      if (currentData.hostname !== hostname.value) {
        return mcm.setHostname(hostname.value);
      }
      return Promise.resolve();
    })
    .then(() => {
      if (currentData.ssid !== ssid.value) {
        return mcm.setSsid(ssid.value);
      }
      return Promise.resolve();
    })
    .then(() => {
      if (currentData.password !== password.value) {
        return mcm.setPassword(password.value);
      }
      return Promise.resolve();
    })
    .then(() => {
      statusMsg.value = 'Configuration updated successfully';
      statusMsgIsError.value = false;
    })
    .catch((error) => {
      console.log(error);
      statusMsg.value = `Configuration updating failed with ${error}`;
      statusMsgIsError.value = true;
    });
}

function toggleShow () {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <div class="row">
    <div class="container">
      <br>
      <h1>System Configuration</h1>
      <form v-on:submit.prevent="submit">
        <h3>Network</h3>
        <div class="form-group">
          <label for="hostname">Hostname</label>
          <input type="text" minlength="1" maxlength="32" class="form-control" id="hostname" v-model="hostname" v-bind:disabled="!formEnabled" />
        </div>
        <h3>Wi-Fi</h3>
        <div class="form-group">
          <label for="ssid">SSID</label>
          <input type="text" minlength="1" maxlength="32" class="form-control" id="ssid" v-model="ssid" v-bind:disabled="!formEnabled" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <div v-if="showPassword" class="input-group" id="show_password">
            <input type="text" minlength="1" maxlength="64" class="form-control" id="password" v-model="password" v-bind:disabled="!formEnabled" />
            <div class="input-group-append">
              <button class="btn btn-outline-secondary" type="button" v-on:click="toggleShow">
                <font-awesome-icon icon="fa-solid fa-eye-slash" />
              </button>
            </div>
          </div>
          <div v-else class="input-group" id="hide_password">
            <input type="password" minlength="1" maxlength="64" class="form-control" id="password" v-model="password" v-bind:disabled="!formEnabled" />
            <div class="input-group-append">
              <button class="btn btn-outline-secondary" type="button" v-on:click="toggleShow">
                <font-awesome-icon icon="fa-solid fa-eye" />
              </button>
            </div>
          </div>
        </div>
        <br>
        <div class="form-group">
          <button class="btn btn-primary" v-bind:disabled="!formEnabled">Save</button>
        </div>
      </form>
      <StatusMessage v-bind:isError="statusMsgIsError" v-bind:message="statusMsg" />
    </div>
  </div>
</template>
