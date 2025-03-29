<script setup>
import { ref, onMounted } from 'vue';

import StatusMessage from '../../components/StatusMessage.vue';
import StatusSpinner from '../../components/StatusSpinner.vue';

import { useMaster } from '../../js/usbMaster';
import { McmUart } from '../../js/usbMcmUart';

const systemVersionsReceived = ref(false);
const systemNetworkReceived = ref(false);
const statusMsg = ref('');
const statusMsgIsError = ref(false);
const firmwareVersion = ref('');
const resetReason = ref('');
const upTime = ref('');
const ssid = ref('');
const hostname = ref('');
const wifiMacAddress = ref('');
const wifiIp4Address = ref('');
const wifiIp4Netmask = ref('');
const wifiIp4Gateway = ref('');

const master = useMaster();
const mcm = new McmUart(master);

onMounted(() => {
  master.getVersion()
    .then((version) => {
      firmwareVersion.value = version;
      return mcm.getHostname();
    })
    .then((name) => {
      hostname.value = name;
      return master.getResetReason();
    })
    .then((reason) => {
      resetReason.value = reason;
      return master.getUpTime();
    })
    .then((time) => {
      upTime.value = usecToTime(time);
      systemVersionsReceived.value = true;
      return mcm.getSsid();
    })
    .then((name) => {
      ssid.value = name;
      systemNetworkReceived.value = true;
      /* wifiMacAddress.value = config.mac; */
      Promise.resolve();
    })
    .catch((error) => {
      console.log(error);
      statusMsg.value = `Information getting failed with ${error}`;
      statusMsgIsError.value = true;
    });
});

function usecToTime (usec) {
  usec = Math.floor(usec / 1000);
  const milliSec = usec % 1000;
  usec = Math.floor((usec - milliSec) / 1000);
  const seconds = usec % 60;
  usec = Math.floor((usec - seconds) / 60);
  const minutes = usec % 60;
  usec = Math.floor((usec - minutes) / 60);
  const hours = usec % 24;
  const days = Math.floor((usec - hours) / 24);
  return `${days} days, ${('00' + hours).slice(-2)}:${('00' + minutes).slice(-2)}:${('00' + seconds).slice(-2)}.${('000' + milliSec).slice(-3)}`;
}
</script>

<template>
  <div class="row">
    <div class="container">
      <br>
      <h1>System Details</h1>
      <p class="list-unstyled" v-if="!systemVersionsReceived || !systemNetworkReceived || !master.isConnected()">
        <StatusMessage v-bind:isError="statusMsgIsError" v-bind:message="statusMsg" v-if="statusMsgIsError" />
        <StatusSpinner title="Waiting for data" statusText="Reading information" v-if="!statusMsgIsError" />
      </p>
      <ul class="list-unstyled" v-if="systemVersionsReceived && systemNetworkReceived && master.isConnected()">
        <li><b>Version Information</b></li>
        <ul>
          <li>Type: {{ master.state.device.productName }}</li>
          <li>Firmware version: {{ firmwareVersion }}</li>
          <li>Serial number: {{ master.state.device.serialNumber }}</li>
          <li>Last reset reason: {{ resetReason }}</li>
          <li>Up time: {{ upTime }}</li>
        </ul>
        <br>
        <li><b>Network Configuration</b></li>
        <ul>
          <li>Hostname: {{ hostname }}</li>
          <li>Wi-Fi:</li>
          <ul>
            <li>SSID: {{ ssid }}</li>
            <li>MAC address: {{ wifiMacAddress }}</li>
            <li>IPv4 address: {{ wifiIp4Address }}</li>
            <li>IPv4 netmask: {{ wifiIp4Netmask }}</li>
            <li>IPv4 gateway: {{ wifiIp4Gateway }}</li>
          </ul>
        </ul>
      </ul>
    </div>
  </div>
</template>
