<script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue';

  import { useMaster } from '../../js/usbMaster';
  import { McmUart, MCM_UART_RAW_DATA_BITS, MCM_UART_RAW_STOP_BITS, MCM_UART_RAW_PARITY } from '../../js/usbMcmUart';

  import ModalWindow from '../../components/ModalWindow.vue';

  const logContent = ref([]);
  const txMessage = ref('');
  const showTimestamp = ref(false);

  const bitRate = ref(2000000);
  const dataBits = ref(8);
  const stopBits = ref(1);
  const parity = ref('disabled');
  const fullDuplex = ref(true);

  const showModal = ref(false);

  const master = useMaster();
  const mcm = new McmUart(master);

  onMounted(() => {
    mcm.enableBareUartMode(
      receivedMessage,
      bitRate.value,
      dataBits.value,
      stopBits.value,
      parity.value,
      fullDuplex.value ? 0 : 1);
  });

  onBeforeUnmount(() => {
    mcm.disableBareUartMode();
  });

  function sendMessage () {
    mcm.writeToBareUart(txMessage.value);
    const time = new Date();
    const type = 'tx';
    const message = `${txMessage.value}`;
    logContent.value.push({ time, type, message });
  }

  function receivedMessage (message) {
    const time = new Date();
    const type = 'rx';
    const decodedMessage = new TextDecoder().decode(message);
    logContent.value.push({ time, type, decodedMessage });
  }

  function clearLogContent () {
    logContent.value = [];
  }

  function computedMessage (log) {
    if (showTimestamp.value) {
      const hours = (`0${log.time.getHours()}`).slice(-2);
      const minutes = (`0${log.time.getMinutes()}`).slice(-2);
      const seconds = (`0${log.time.getSeconds()}`).slice(-2);
      const milliseconds = (`00${log.time.getMilliseconds()}`).slice(-3);
      return `[${hours}:${minutes}:${seconds}:${milliseconds}] ${log.message}`;
    }
    return log.message;
  }

  function configDone () {
    showModal.value = false;
    mcm.disableBareUartMode()
      .then(() => {
        mcm.enableBareUartMode(
          receivedMessage,
          bitRate.value,
          dataBits.value,
          stopBits.value,
          parity.value,
          fullDuplex.value ? 0 : 1);
      });
  }
</script>

<template>
  <div class="container">
    <br>
    <div class="row">
      <h1>UART Terminal</h1>
      <div>
        <p><a href="#" v-on:click="showModal=true">configure</a><span style="float:right;"><a href="#" v-on:click="clearLogContent()">clear</a></span></p>
        <div class="text-receive-box">
          <div v-for="message in logContent" :key="message.time">
            <span :class="{ 'message-error': message.type==='error', 'message-tx': message.type ==='tx' }" v-html="computedMessage(message)"></span>
          </div>
        </div>
        <div class="form-group">
          <label for="textTransmit">Transmit</label>
          <div class="input-group">
            <input class="form-control" type="text" id="textTransmit" v-model="txMessage">
            <div class="input-group-append">
              <button class="btn btn-outline-secondary" type="button" v-on:click="sendMessage">Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <ModalWindow v-bind:show="showModal" v-on:cancel="showModal=false" v-on:submit="configDone">
      <template #header>Configure</template>
      <template #body>
        <div id="fullduplex">
          <input class="form-check-input" type="checkbox" id="checkFullDuplex" v-model="fullDuplex">
          <label class="form-check-label" for="checkFullDuplex">
            Full duplex
          </label>
        </div>
        <div id="bitrate">
          <label for="selectbitrate">Bit rate</label>
          <select class="form-select" v-model.number="bitRate" id="selectbitrate">
            <option value=2000000>2.0 Mbps</option>
            <option value=1500000>1.5 Mbps</option>
            <option value=1152000>1.152 Mbps</option>
            <option value=1000000>1.0 Mbps</option>
            <option value=921600>921.6 kbps</option>
            <option value=576000>576.0 kbps</option>
            <option value=500000>500.0 kbps</option>
            <option value=460800>460.8 kbps</option>
            <option value=230400>230.4 kbps</option>
            <option value=115200>115.2 kbps</option>
            <option value=57600>57.6 kbps</option>
            <option value=38400>38.4 kbps</option>
            <option value=19200>19.2 kbps</option>
            <option value=9600>9.6 kbps</option>
          </select>
        </div>
        <div id="databits">
          <label for="selectdatabits">Data bits</label>
          <select class="form-select" v-model.number="dataBits" id="selectdatabits">
            <template v-for="[index, option] in MCM_UART_RAW_DATA_BITS.entries()" v-bind:key="index">
              <option v-if="option!==null" :value="option">{{ option }} bits</option>
            </template>
          </select>
        </div>
        <div id="stopbits">
          <label for="selectstopbits">Stop bits</label>
          <select class="form-select" v-model.number="stopBits" id="selectstopbits">
            <template v-for="[index, option] in MCM_UART_RAW_STOP_BITS.entries()" v-bind:key="index">
              <option v-if="option!==null" :value="option">{{ option }} bit</option>
            </template>
          </select>
        </div>
        <div id="parity">
          <label for="selectparity">Parity</label>
          <select class="form-select" v-model.number="parity" id="selectparity">
            <template v-for="[index, option] in MCM_UART_RAW_PARITY.entries()" v-bind:key="index">
              <option v-if="option!==null" :value="option">{{ option }}</option>
            </template>
          </select>
        </div>
      </template>
      <template #buttonSubmit>Save</template>
      <template #buttonCancel>Cancel</template>
    </ModalWindow>
  </Teleport>
</template>

<style scoped>
  .text-receive-box {
    border-width: 1px;
    border-style: solid;
    border-radius: 3px;
    border-color: #ced4da;
    color: #49525c;
    background-color: #e9ecef;
    height: 30em;
    padding: 10px;
    overflow: auto;
  }
  .message-tx {
    color: darkgrey;
  }
  .message-error {
    color: red;
  }
</style>
