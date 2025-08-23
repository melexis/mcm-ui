<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';

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
const logContainer = ref(null);
const shouldAutoScroll = ref(true);

const showModal = ref(false);

const master = useMaster();
const mcm = new McmUart(master);

const onScroll = () => {
  const el = logContainer.value;
  if (el) {
    const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    shouldAutoScroll.value = isNearBottom;
  }
};

onMounted(() => {
  mcm.enableBareUartMode(
    receivedMessage,
    bitRate.value,
    dataBits.value,
    stopBits.value,
    parity.value,
    !fullDuplex.value ? 1 : 0);

  const el = logContainer.value;
  if (el) {
    el.addEventListener('scroll', onScroll);
  }
});

onBeforeUnmount(() => {
  mcm.disableBareUartMode();

  const el = logContainer.value;
  if (el) {
    el.removeEventListener('scroll', onScroll);
  }
});

watch(
  () => logContent.value.length,
  async () => {
    await nextTick();
    const el = logContainer.value;
    if (el && shouldAutoScroll.value) {
      el.scrollTop = el.scrollHeight;
    }
  }
);

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
  return message.length;
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
        !fullDuplex.value ? 1 : 0);
    });
}

function scrollToBottom () {
  const el = logContainer.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
    shouldAutoScroll.value = true;
  }
}
</script>

<template>
  <div class="container">
    <br>
    <div class="row">
      <h1>UART Terminal</h1>
      <div>
        <p>
          <a
            href="#"
            @click="showModal=true"
          >
            configure
          </a>
          <span style="float:right;">
            <a
              href="#"
              @click="clearLogContent()"
            >
              clear
            </a>
            |
            <a
              href="#"
              @click.prevent="scrollToBottom"
            >
              scroll to bottom
            </a>
          </span>
        </p>
        <div
          class="text-receive-box"
          ref="logContainer"
        >
          <div
            v-for="message in logContent"
            :key="message.time"
          >
            <span
              :class="{ 'message-error': message.type==='error', 'message-tx': message.type ==='tx' }"
              v-html="computedMessage(message)"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="textTransmit">Transmit</label>
          <div class="input-group">
            <input
              id="textTransmit"
              v-model="txMessage"
              class="form-control"
              type="text"
              @keyup.enter="sendMessage"
            >
            <div class="input-group-append">
              <button
                class="btn btn-outline-secondary"
                type="button"
                @click="sendMessage"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <ModalWindow
      :show="showModal"
      @cancel="showModal=false"
      @submit="configDone"
    >
      <template #header>
        Configure
      </template>
      <template #body>
        <div id="fullduplex">
          <input
            id="checkFullDuplex"
            v-model="fullDuplex"
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
        <div id="bitrate">
          <label for="selectbitrate">Bit rate</label>
          <select
            id="selectbitrate"
            v-model.number="bitRate"
            class="form-select"
          >
            <option value="2000000">
              2.0 Mbps
            </option>
            <option value="1500000">
              1.5 Mbps
            </option>
            <option value="1152000">
              1.152 Mbps
            </option>
            <option value="1000000">
              1.0 Mbps
            </option>
            <option value="921600">
              921.6 kbps
            </option>
            <option value="576000">
              576.0 kbps
            </option>
            <option value="500000">
              500.0 kbps
            </option>
            <option value="460800">
              460.8 kbps
            </option>
            <option value="230400">
              230.4 kbps
            </option>
            <option value="115200">
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
        <div id="databits">
          <label for="selectdatabits">Data bits</label>
          <select
            id="selectdatabits"
            v-model.number="dataBits"
            class="form-select"
          >
            <template
              v-for="[index, option] in MCM_UART_RAW_DATA_BITS.entries()"
              :key="index"
            >
              <option
                v-if="option!==null"
                :value="option"
              >
                {{ option }} bits
              </option>
            </template>
          </select>
        </div>
        <div id="stopbits">
          <label for="selectstopbits">Stop bits</label>
          <select
            id="selectstopbits"
            v-model.number="stopBits"
            class="form-select"
          >
            <template
              v-for="[index, option] in MCM_UART_RAW_STOP_BITS.entries()"
              :key="index"
            >
              <option
                v-if="option!==null"
                :value="option"
              >
                {{ option }} bit
              </option>
            </template>
          </select>
        </div>
        <div id="parity">
          <label for="selectparity">Parity</label>
          <select
            id="selectparity"
            v-model="parity"
            class="form-select"
          >
            <template
              v-for="[index, option] in MCM_UART_RAW_PARITY.entries()"
              :key="index"
            >
              <option
                v-if="option!==null"
                :value="option"
              >
                {{ option }}
              </option>
            </template>
          </select>
        </div>
      </template>
      <template #buttonSubmit>
        Save
      </template>
      <template #buttonCancel>
        Cancel
      </template>
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
    overflow-anchor: none;
    scroll-behavior: smooth;
  }
  .message-tx {
    color: darkgrey;
  }
  .message-error {
    color: red;
  }
</style>
