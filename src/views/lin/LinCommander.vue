<script setup>
import { onBeforeUnmount, ref } from 'vue';

import { useMaster, MasterMode } from '../../js/usbMaster';
import { McmLin } from '../../js/usbMcmLin';

import { LinScript, frameTypeWakeUp, frameTypeS2M, frameTypeM2S } from '../../js/linScript';

import StatusMessage from '../../components/StatusMessage.vue';
import AppLogger from '../../components/AppLogger.vue';

const logContent = ref([]);
const linFile = ref(null);
const fileStatus = ref('No file loaded yet.');
const fileLoaded = ref(false);
const statusMsg = ref('');
const statusMsgIsError = ref(false);
const scheduleRunning = ref(false);
const delayTime = ref(50);

let linScript = null;
let schedulePosition = 0;

const master = useMaster();
const mcm = new McmLin(master);

onBeforeUnmount(() => {
  mcm.teardown();
});

function onFileChange (e) {
  const files = e.target.files || e.dataTransfer.files;
  linFile.value = null;
  if (!files.length) {
    return;
  }
  linFile.value = files[0];
}

function onLoadFile () {
  statusMsg.value = '';
  statusMsgIsError.value = false;
  fileStatus.value = '';
  fileLoaded.value = false;
  linScript = new LinScript();
  linScript.on('error', function (error) {
    statusMsg.value = `LIN file reading failed with: ${error}`;
    fileStatus.value = 'No file loaded yet.';
    statusMsgIsError.value = true;
  });
  linScript.on('opened', function () {
    fileLoaded.value = true;
  });
  linScript.loadFile(linFile.value);
}

async function handleSequence (seqNr, frameNr = 0) {
  if (mcm.master.mode !== MasterMode.LIN) {
    logInfo('Connecting...');
    await mcm.setup();
  }

  const script = linScript.getScriptEntry(seqNr);
  while (true) {
    const frame = script.frames[frameNr];
    switch (frame.type) {
      case frameTypeWakeUp:
        try {
          await mcm.lIfcWakeUp();
          logInfo(`${script.name} : wake up pulse`);
        } catch (error) {
          logError(`${script.name} : failed with ${error}`);
        }
        break;
      case frameTypeS2M:
        try {
          const data = await mcm.lS2m(linScript.getBaudrate(), frame.enhancedCrc, frame.frameId, frame.datalength);
          logInfo(`${script.name} : ${byteToHexStr(frame.frameId)} - ${payloadToHexStr(data)}`);
        } catch (error) {
          logError(`${script.name} : ${byteToHexStr(frame.frameId)} - ${error}`);
        }
        break;
      case frameTypeM2S:
        try {
          await mcm.lM2s(linScript.getBaudrate(), frame.enhancedCrc, frame.frameId, frame.payload);
          logInfo(`${script.name} : ${byteToHexStr(frame.frameId)} - ${payloadToHexStr(frame.payload)}`);
        } catch (error) {
          logError(`${script.name} : ${byteToHexStr(frame.frameId)} - ${error}`);
        }
        break;
    }

    frameNr += 1;
    if (frameNr >= script.frames.length) {
      break;
    }
  }
}

function startSchedule () {
  scheduleRunning.value = true;
  schedulePosition = 0;
  stepSchedule();
}

async function stepSchedule () {
  while (scheduleRunning.value === true) {
    await handleSequence(schedulePosition);
    schedulePosition += 1;
    if (schedulePosition >= linScript.getScriptLength()) {
      schedulePosition = 0;
    }
    await new Promise(resolve => setTimeout(resolve, parseInt(delayTime.value)));
  }
}

function stopSchedule () {
  scheduleRunning.value = false;
}

function byteToHexStr (byte) {
  return `0x${('0' + byte.toString(16).toUpperCase()).slice(-2)}`;
}

function payloadToHexStr (payload) {
  let result = '';
  for (let i = 0; i < payload.length; i++) {
    result += ` ${byteToHexStr(payload[i])}`;
  }
  return result;
}

function clearLogContent () {
  logContent.value = [];
}

function logInfo (message) {
  const time = new Date();
  const level = 'info';
  logContent.value.push({ time, level, message });
}

function logError (message) {
  const time = new Date();
  const level = 'error';
  logContent.value.push({ time, level, message });
}
</script>

<template>
  <div class="row">
    <div class="container">
      <br>
      <h1>LIN Commander</h1>
      <form>
        <input
          id="linFile"
          type="file"
          @change="onFileChange"
          accept=".lin"
        >
        <button
          type="button"
          @click="onLoadFile()"
          class="btn btn-primary"
        >
          Load LIN file
        </button>
      </form>
      <StatusMessage
        :is-error="statusMsgIsError"
        :message="statusMsg"
      />
    </div>
  </div>
  <div class="row">
    <div
      class="container"
      v-if="!fileLoaded"
    >
      {{ fileStatus }}
    </div>
    <div
      class="container"
      v-if="fileLoaded"
    >
      <br>
      <div class="row">
        <div class="col-md-4">
          <table
            class="table table-sm table-striped"
            id="schedule-table"
          >
            <thead>
              <tr>
                <th scope="col">
                  Schedule: {{ linScript.getSchedulename() }}
                </th>
                <th class="text-right">
                  <span
                    title="Run Schedule"
                    :hidden="scheduleRunning"
                    @click="startSchedule()"
                  >
                    <font-awesome-icon icon="fa-solid fa-play" />
                  </span>
                  <span
                    title="Stop Schedule"
                    :hidden="!scheduleRunning"
                    @click="stopSchedule()"
                  >
                    <font-awesome-icon icon="fa-solid fa-stop" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="index in linScript.getScriptLength()"
                :key="index"
                @click="handleSequence(index-1)"
              >
                <td class="align-middle">
                  {{ linScript.getScriptEntry(index-1).name }}
                </td>
                <td class="text-right">
                  <span
                    title="Execute Sequence"
                  >
                    <font-awesome-icon icon="fa-solid fa-play" />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <form>
            <div class="form-group">
              <label for="txtDelay">Delay [ms]</label>
              <input
                type="number"
                step="1"
                min="10"
                max="1000.0"
                class="form-control"
                id="txtDelay"
                v-model="delayTime"
              >
            </div>
          </form>
        </div>
        <div class="col-md-8">
          <AppLogger
            :content="logContent"
            @clear="clearLogContent"
          />
        </div>
      </div>
    </div>
  </div>
</template>
