<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue';

import StatusMessage from '../../components/StatusMessage.vue';

import { useUsbTransport } from '../../js/usbTransport';
import { McmPwm } from '../../js/usbMcmPwm';

const transport = useUsbTransport();
const mcm = new McmPwm(transport);

const errorMsg = ref('');
const isErrorMsg = ref(false);
let errorCount = 0;

const pwmFrequency = ref(1000);
const pwmDutyCycle = ref(0);

const pwmStatFrequency = ref(null);
const pwmStatDutyCycle = ref(null);
const pwmStatFgFrequency = ref(null);

let pollTimer = null;

onMounted(async () => {
  try {
    await mcm.enableSlavePower();
    await mcm.setup();

    await updateDutyCycle();
    await updateFrequency();
    await updateStatus();

    pollTimer = setInterval(updateStatus, 250);
  } catch (error) {
    isErrorMsg.value = true;
    errorMsg.value = error.message;
    errorCount = 10;
  }
});

onBeforeUnmount(async () => {
  clearInterval(pollTimer);
  await mcm.teardown();
  await mcm.disableSlavePower();
});

async function updateDutyCycle () {
  try {
    await mcm.setPwmDutyCycle(
      Math.round((pwmDutyCycle.value / 100) * (1 << 10))
    );
  } catch (error) {
    isErrorMsg.value = true;
    errorMsg.value = error.message;
    errorCount = 10;
  }
}

async function updateFrequency () {
  try {
    await mcm.setPwmFrequency(pwmFrequency.value);
  } catch (error) {
    isErrorMsg.value = true;
    errorMsg.value = error.message;
    errorCount = 10;
  }
}

async function updateStatus () {
  try {
    const dutyCycle = await mcm.getPwmDutyCycle();
    const frequency = await mcm.getPwmFrequency();
    const fgPeriod = await mcm.getFgPeriod();

    pwmStatFrequency.value = frequency;
    pwmStatDutyCycle.value = Math.round(
      (dutyCycle * 100) / (1 << 10)
    );

    if (fgPeriod > 0) {
      pwmStatFgFrequency.value = Math.round(1000000 / fgPeriod);
    } else {
      pwmStatFgFrequency.value = 'unknown';
    }
  } catch {
    /* silent polling error (optional) */
  }

  if (errorCount > 0) {
    errorCount -= 1;
  } else {
    isErrorMsg.value = false;
    errorMsg.value = '';
  }
}
</script>

<template>
  <div class="container py-4">
    <h1 class="mb-4">
      PWM Controller
    </h1>

    <div class="row g-4">
      <!-- ================= CONTROL CARD ================= -->
      <div class="col-md-6">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h5 class="card-title mb-4">
              Control
            </h5>

            <form @submit.prevent>
              <!-- Frequency -->
              <div class="mb-4">
                <label
                  for="frequency"
                  class="form-label fw-semibold"
                >
                  Frequency
                </label>

                <div class="input-group">
                  <input
                    id="frequency"
                    v-model.number="pwmFrequency"
                    type="number"
                    min="100"
                    max="10000"
                    step="1"
                    class="form-control"
                    @change="updateFrequency"
                  >
                  <span class="input-group-text">Hz</span>
                </div>
              </div>

              <!-- Duty Cycle -->
              <div class="mb-3">
                <div class="d-flex justify-content-between">
                  <label
                    for="dutycycle"
                    class="form-label fw-semibold"
                  >
                    Duty Cycle
                  </label>
                  <span class="fw-bold text-primary">
                    {{ pwmDutyCycle }} %
                  </span>
                </div>

                <input
                  id="dutycycle"
                  v-model.number="pwmDutyCycle"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  @input="updateDutyCycle"
                  class="form-range"
                >
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ================= STATUS CARD ================= -->
      <div class="col-md-6">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h5 class="card-title mb-4">
              Live Status
            </h5>

            <div class="status-grid">
              <div class="status-label">
                PWM Frequency
              </div>
              <div class="status-value">
                {{ pwmStatFrequency ?? '--' }} Hz
              </div>

              <div class="status-label">
                PWM Duty
              </div>
              <div class="status-value">
                {{ pwmStatDutyCycle ?? '--' }} %
              </div>

              <div class="status-label">
                FG Frequency
              </div>
              <div class="status-value">
                {{ pwmStatFgFrequency ?? '--' }} Hz
              </div>
            </div>

            <StatusMessage
              :is-error="isErrorMsg"
              :message="errorMsg"
              class="mb-3"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 0.75rem;
  column-gap: 1rem;
  align-items: center;
}

.status-label {
  font-weight: 500;
  color: #6c757d;
}

.status-value {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: right;
}
</style>
