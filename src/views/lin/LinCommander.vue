<script setup>
import { ref } from 'vue';
import { MelexisMaster } from '../../js/melexisMaster.js';
import { lIfcWakeUp, lS2m, lM2s } from '../../js/linComm.js';
import { LinScript, frameTypeWakeUp, frameTypeS2M, frameTypeM2S } from '../../js/linScript.js';

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
let master = null;
let schedulePosition = 0;

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

function connectMaster () {
  return new Promise(function (resolve, reject) {
    logInfo('Connecting...');
    master = new MelexisMaster();
    master.on('closed', function () {
      stopSchedule();
      master = null;
    });
    master.open(location.hostname).then(
      function () {
        resolve();
      },
      function (error) {
        stopSchedule();
        master = null;
        reject(error);
      }
    );
  });
}

function handleSequence (seqNr, frameNr = 0) {
  return new Promise(function (resolve, reject) {
    if (master === null || typeof (master) === 'undefined') {
      connectMaster().then(
        function () {
          handleSequence(seqNr).then(
            function () { resolve(); },
            function (error) { reject(error); }
          );
        },
        function (error) {
          stopSchedule();
          reject(error);
        }
      );
    } else {
      const script = linScript.getScriptEntry(seqNr);
      const frame = script.frames[frameNr];
      const nextFrame = function () {
        frameNr += 1;
        if (frameNr < script.frames.length) {
          handleSequence(seqNr, frameNr).then(
            function () { resolve(); },
            function (error) { reject(error); }
          );
        } else {
          resolve();
        }
      };
      switch (frame.type) {
        case frameTypeWakeUp:
          lIfcWakeUp(master).then(
            function () {
              logInfo(`${script.name} : wake up pulse`);
              nextFrame();
            },
            function (error) {
              logError(`${script.name} : failed with ${error}`);
              nextFrame();
            }
          );
          break;
        case frameTypeS2M:
          lS2m(master, linScript.getBaudrate(), frame.enhancedCrc, frame.frameId, frame.datalength).then(
            function (data) {
              logInfo(`${script.name} : ${byteToHexStr(frame.frameId)} - ${payloadToHexStr(data)}`);
              nextFrame();
            },
            function (error) {
              logError(`${script.name} : ${byteToHexStr(frame.frameId)} - ${error}`);
              nextFrame();
            }
          );
          break;
        case frameTypeM2S:
          lM2s(master, linScript.getBaudrate(), frame.enhancedCrc, frame.frameId, frame.payload).then(
            function () {
              logInfo(`${script.name} : ${byteToHexStr(frame.frameId)} - ${payloadToHexStr(frame.payload)}`);
              nextFrame();
            },
            function (error) {
              logError(`${script.name} : ${byteToHexStr(frame.frameId)} - ${error}`);
              nextFrame();
            }
          );
          break;
      }
    }
  });
}

function startSchedule () {
  scheduleRunning.value = true;
  schedulePosition = 0;
  stepSchedule();
}

function stepSchedule () {
  if (scheduleRunning.value === true) {
    handleSequence(schedulePosition).then(
      function () {
        schedulePosition += 1;
        if (schedulePosition >= linScript.getScriptLength()) {
          schedulePosition = 0;
        }
        if (scheduleRunning.value === true) {
          setTimeout(function () {
            stepSchedule();
          }, parseInt(delayTime.value));
        }
      },
      function (error) {
        logError(error);
      }
    );
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
                  <img
                    src="@/assets/media-play-6x.png"
                    width="24"
                    title="Run Schedule"
                    :hidden="scheduleRunning"
                    @click="startSchedule()"
                  >
                  <img
                    src="@/assets/media-stop-6x.png"
                    width="24"
                    title="Stop Schedule"
                    :hidden="!scheduleRunning"
                    @click="stopSchedule()"
                  >
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
                  <img
                    src="@/assets/media-play-6x.png"
                    width="24"
                    title="Execute Sequence"
                  >
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
