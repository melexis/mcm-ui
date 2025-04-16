<script setup>
import { useRouter, useRoute } from 'vue-router';
import { ref, onMounted } from 'vue';
import { useMaster } from '../js/usbMaster';

const router = useRouter();
const route = useRoute();
const usbDevices = ref();
const master = useMaster();
const hasForget = ref(false);
const hasWebUsb = ref(false);

onMounted(() => {
  if (!!navigator && !!navigator.usb && typeof (navigator.usb.getDevices) === 'function') {
    hasWebUsb.value = true;

    if ('forget' in USBDevice.prototype) {
      hasForget.value = true;
    }

    if (!master.isSelected()) {
      navigator.usb.getDevices().then(devices => {
        usbDevices.value = devices;
      });
    }

    navigator.usb.addEventListener('connect', (event) => {
      usbDevices.value.push(event.device);
    });

    navigator.usb.addEventListener('disconnect', (event) => {
      const usbDisconIndex = usbDevices.value.indexOf(event.device);
      usbDevices.value.splice(usbDisconIndex, 1);
      router.push('/webapp');
    });
  }
});

function requestDevice () {
  const filters = [
    {
      vendorId: 0x03E9,
      productId: 0x6F08,
      classCode: 0xFF, // vendor-specific
    },
  ];
  navigator.usb.requestDevice({ filters })
    .then((device) => {
      const index = usbDevices.value.indexOf(device);
      if (index < 0) {
        /* fresh new device */
        usbDevices.value.push(device);
      }
    })
    .catch(error => { console.error(error); });
}

function onMcmClick (device) {
  master.setDevice(device);
  if (typeof (route.redirectedFrom) !== 'undefined' && route.redirectedFrom.path !== '/') {
    router.push(route.redirectedFrom.path);
  } else {
    master.identify()
      .catch((error) => (console.log(error.message)));
  }
}

function onForgetMcmClick (device) {
  device.forget()
    .then(() => {
    });
}
</script>

<template>
  <div
    v-if="!hasWebUsb"
    class="row"
  >
    <div class="container">
      <br>
      <p>Your browser does not support WebUSB which is mandatory for this web application!</p>
    </div>
  </div>
  <div
    v-if="!master.isSelected() && hasWebUsb"
    class="row"
  >
    <div class="container">
      <br>
      <div class="row">
        <p>Click on a board below to open the UI.</p>
        <div
          id="boxContainer"
          class="master-container"
        >
          <div v-if="usbDevices.length === 0">
            <div class="box">
              <div class="div-center">
                <p>No USB devices found</p>
                <img
                  src="/static/MCM-81339-not-connected.png"
                  class="img-fluid"
                >
              </div>
            </div>
          </div>
          <div v-if="usbDevices.length !== 0">
            <div
              v-for="(device, index) in usbDevices"
              :key="index"
              class="box"
              @click="onMcmClick(device)"
            >
              <div class="div-center">
                <p
                  v-if="hasForget"
                  @click="onForgetMcmClick(device)"
                >
                  forget
                </p>
                <p>{{ device.productName }}<br>(S/N: {{ device.serialNumber }})</p>
                <img
                  src="/static/MCM-81339.png"
                  class="img-fluid"
                >
              </div>
            </div>
          </div>
          <div
            class="box-not-found"
            @click="requestDevice()"
          >
            <p>
              Do not see your USB device? Grant this site permission to access it here.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="master.isSelected() && hasWebUsb"
    class="row"
  >
    <div class="container">
      <br>
      <h1>Home</h1>
      <div class="row">
        <div class="col-md-8">
          <p>Melexis Compact Master (MCM) for controlling UART protocol busses.&nbsp;&nbsp;</p>
          <p>The device is for development only.</p>
        </div>
        <div class="col-md-4">
          <img src="/static/MCM-81339.png">
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .master-container {
    border-width: 1px;
    border-style: solid;
    border-radius: 3px;
    border-color: #ced4da;
    padding: 5px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 5px;
    background-color: #e9ecef;
    align-items: start;
    height: 70vh;
  }
  .box {
    border-width: 1px;
    border-style: solid;
    border-radius: 3px;
    border-color: #ced4da;
    padding: 10px;
    text-align: center;
    cursor: pointer;
    box-sizing: border-box;
    background-color: white;
    height: 25vh;
    overflow: hidden;
  }
  .box-not-found {
    border-width: 1px;
    border-style: solid;
    border-radius: 3px;
    border-color: #ced4da;
    padding: 10px;
    text-align: center;
    cursor: pointer;
    box-sizing: border-box;
    background-color: #cdcfd1;
    height: 25vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .box-not-found p {
    color: #747678;
  }
  .div-center {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  .div-center p {
    margin-bottom: 10px;
  }
  .img-fluid {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    flex-grow: 1;
  }
  .no-more-boxes {
    grid-column: 1 / -1; /* Span across all columns */
    text-align: center;
  }
  img {
    height:60%;
    object-fit:cover;
  }
</style>
