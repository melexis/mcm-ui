<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useUsbTransport } from '../../js/usbTransport';
import { McmI2c } from '../../js/usbMcmI2c';

const transport = useUsbTransport();
const mcm = new McmI2c(transport);

const route = useRoute();
const routeAddressHex = route.params.address;

const manualAddressHex = ref('');
const manualAddressValid = computed(() => {
  if (!/^[0-9a-fA-F]{1,2}$/.test(manualAddressHex.value)) {
    return false;
  }
  const value = parseInt(manualAddressHex.value, 16);
  return value >= 0x00 && value <= 0x7F;
});

const addressHex = computed(() => {
  return routeAddressHex ?? manualAddressHex.value;
});

const address = computed(() => {
  if (!addressHex.value) {
    return null;
  }
  return parseInt(addressHex.value, 16);
});

const addressValid = computed(() => {
  if (routeAddressHex) {
    const v = parseInt(routeAddressHex, 16);
    return !isNaN(v) && v >= 0x00 && v <= 0x7F;
  }
  return manualAddressValid.value;
});

onMounted(async () => {
  try {
    await mcm.enableSlavePower();
    await mcm.setup(400000);
  } catch (error) {
    console.log(error);
  }
});

onBeforeUnmount(async () => {
  await mcm.teardown();
  await mcm.disableSlavePower();
});

function buildRegisterBytes (regHex, width) {
  const reg = parseInt(regHex, 16);

  if (isNaN(reg)) {
    return [];
  }

  if (width === 8) {
    return [reg & 0xFF];
  }

  return [(reg >> 8) & 0xFF, reg & 0xFF];
}

function formatBytes (data) {
  if (!data) {
    return '';
  }
  const bytes = Array.from(data);
  return bytes
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

function isValidHex (str) {
  return /^[0-9a-fA-F]+$/.test(str);
}

function isValidHexBytes (str) {
  if (!str.trim()) {
    return false;
  }

  return str
    .trim()
    .split(/\s+/)
    .every(b => /^[0-9a-fA-F]{1,2}$/.test(b));
}

const writeRegisterValid = computed(() =>
  isValidHex(writeRegister.value)
);

const writeDataValid = computed(() =>
  isValidHexBytes(writeData.value)
);

const writeValid = computed(() =>
  writeRegisterValid.value && writeDataValid.value
);

const directReadValid = computed(() =>
  directReadLength.value > 0
);

const addrReadRegisterValid = computed(() =>
  isValidHex(addrReadRegister.value)
);

const addrReadValid = computed(() =>
  addrReadRegisterValid.value && addrReadLength.value > 0
);

const writeAddrWidth = ref(8);
const writeRegister = ref('00');
const writeData = ref('');

function parseHexBytes (text) {
  return text
    .trim()
    .split(/\s+/)
    .map(b => parseInt(b, 16))
    .filter(b => !isNaN(b) && b >= 0 && b <= 255);
}

async function rawWrite () {
  if (address.value == null) {
    return;
  }

  const regBytes = buildRegisterBytes(writeRegister.value, writeAddrWidth.value);
  const bytes = parseHexBytes(writeData.value);
  const data = new Uint8Array([...regBytes, ...bytes]);

  try {
    await mcm.write(address.value, data, 20);
  } catch (err) {
    console.error(err);
  }
}

const directReadLength = ref(1);
const directReadOutput = ref('');

async function directRead () {
  if (address.value == null) {
    return;
  }

  try {
    const result = await mcm.read(address.value, directReadLength.value, 20);
    directReadOutput.value = formatBytes(result);
  } catch (err) {
    console.error(err);
  }
}

const addrReadAddrWidth = ref(8);
const addrReadRegister = ref('00');
const addrReadLength = ref(1);
const addressedReadOutput = ref('');

async function addressedRead () {
  if (address.value == null) {
    return;
  }

  const regBytes = buildRegisterBytes(
    addrReadRegister.value,
    addrReadAddrWidth.value
  );

  try {
    const result = await mcm.writeRead(address.value, new Uint8Array(regBytes), addrReadLength.value, 20);
    addressedReadOutput.value = formatBytes(result);
  } catch (err) {
    console.error(err);
  }
}
</script>

<template>
  <div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">
        <template v-if="routeAddressHex">
          Device @ 0x{{ addressHex.toUpperCase() }}
        </template>
        <template v-else>
          Device
        </template>
      </h2>
    </div>

    <div
      v-if="!routeAddressHex"
      class="card shadow-sm mb-4"
    >
      <div class="card-body">
        <h5 class="card-title mb-3">
          Target Device
        </h5>

        <div class="row g-3 align-items-start">
          <div class="col-md-3 d-flex flex-column">
            <label class="form-label">I2C Address (7-bit hex)</label>

            <input
              v-model="manualAddressHex"
              class="form-control font-monospace"
              :class="{ 'is-invalid': !manualAddressValid && manualAddressHex }"
            >

            <div class="form-hint">
              <small
                v-if="!manualAddressValid && manualAddressHex"
                class="text-danger"
              >
                Enter 1–2 digit hex value (00–7F)
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- WRITE -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h5 class="card-title mb-4">
          Write Transaction
        </h5>

        <div class="row g-3 align-items-start">
          <div class="col-md-2">
            <label class="form-label">Register Width</label>
            <select
              v-model="writeAddrWidth"
              class="form-select"
            >
              <option :value="8">
                8-bit
              </option>
              <option :value="16">
                16-bit
              </option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label">Register (hex)</label>

            <input
              v-model="writeRegister"
              class="form-control font-monospace"
              :class="{ 'is-invalid': !writeRegisterValid }"
            >

            <div class="form-hint">
              <small
                v-if="!writeRegisterValid"
                class="text-danger"
              >
                Invalid hex value
              </small>
            </div>
          </div>

          <div class="col-md-5">
            <label class="form-label">Data Bytes (hex)</label>

            <input
              v-model="writeData"
              class="form-control font-monospace"
              :class="{ 'is-invalid': !writeDataValid }"
            >

            <div class="form-hint">
              <small
                v-if="!writeDataValid"
                class="text-danger"
              >
                Use space separated hex bytes (AA 10 05)
              </small>
            </div>
          </div>

          <div class="col-md-2 d-flex flex-column">
            <label class="form-label invisible">Action</label>

            <button
              class="btn btn-primary mt-auto"
              :disabled="!writeValid || !addressValid"
              @click="rawWrite"
            >
              Write
            </button>

            <div class="form-hint" />
          </div>
        </div>
      </div>
    </div>

    <!-- DIRECT READ -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h5 class="card-title mb-4">
          Direct Read
        </h5>

        <div class="row g-3 align-items-start">
          <div class="col-md-3">
            <label class="form-label">Read Length (bytes)</label>
            <input
              v-model.number="directReadLength"
              type="number"
              min="1"
              class="form-control"
              :class="{ 'is-invalid': !directReadValid }"
            >
            <div class="form-hint">
              <small
                v-if="!directReadValid"
                class="text-danger"
              >
                Length must be greater than 0
              </small>
            </div>
          </div>

          <div class="col-md-2 d-flex flex-column">
            <label class="form-label invisible">Action</label>

            <button
              class="btn btn-primary mt-auto"
              :disabled="!directReadValid || !addressValid"
              @click="directRead"
            >
              Read
            </button>

            <div class="form-hint" />
          </div>
        </div>

        <div class="mt-4">
          <label class="form-label">Read Result (hex)</label>
          <textarea
            v-model="directReadOutput"
            class="form-control font-monospace"
            rows="2"
            readonly
          />
        </div>
      </div>
    </div>

    <!-- ADDRESSED READ -->
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-4">
          Addressed Read
        </h5>

        <div class="row g-3 align-items-start">
          <div class="col-md-2">
            <label class="form-label">Register Width</label>
            <select
              v-model="addrReadAddrWidth"
              class="form-select"
            >
              <option :value="8">
                8-bit
              </option>
              <option :value="16">
                16-bit
              </option>
            </select>
          </div>

          <div class="col-md-3">
            <label class="form-label">Register (hex)</label>
            <input
              v-model="addrReadRegister"
              class="form-control font-monospace"
              :class="{ 'is-invalid': !addrReadRegisterValid }"
            >
            <div class="form-hint">
              <small
                v-if="!addrReadRegisterValid"
                class="text-danger"
              >
                Invalid hex value
              </small>
            </div>
          </div>

          <div class="col-md-3">
            <label class="form-label">Read Length (bytes)</label>
            <input
              v-model.number="addrReadLength"
              type="number"
              min="1"
              class="form-control"
              :class="{ 'is-invalid': !addrReadValid }"
            >
            <div class="form-hint">
              <small
                v-if="!addrReadValid"
                class="text-danger"
              >
                Length must be greater than 0
              </small>
            </div>
          </div>

          <div class="col-md-2 d-flex flex-column">
            <label class="form-label invisible">Action</label>

            <button
              class="btn btn-primary mt-auto"
              :disabled="!addrReadValid || !addressValid"
              @click="addressedRead"
            >
              Read
            </button>

            <div class="form-hint" />
          </div>
        </div>

        <div class="mt-4">
          <label class="form-label">Read Result (hex)</label>
          <textarea
            v-model="addressedReadOutput"
            class="form-control font-monospace"
            rows="2"
            readonly
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: monospace;
}

textarea {
  background-color: #f8f9fa;
}

.form-hint {
  min-height: 20px;   /* fixed vertical space */
  font-size: 0.8rem;
}

input.is-invalid {
  border-color: #dc3545;
}
</style>
