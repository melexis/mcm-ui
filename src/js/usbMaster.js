/* eslint-disable semi */
import { reactive, inject } from 'vue';

const MasterSymbol = Symbol('Master');

const VENDOR_SPECIFIC_CLASS = 0xFF;

const MCM_VENDOR_REQUEST_IDENTIFY = 0x00;
const MCM_VENDOR_REQUEST_INFO = 0x01;

const MCM_INFO_VERSION = 0x00;
const MCM_INFO_RESET_REASON = 0x01;
const MCM_INFO_UP_TIME = 0x02;

export const esp32ResetReasons = {
  0: 'Reset reason can not be determined',
  1: 'Reset due to power-on event',
  2: 'Reset by external pin (not applicable for ESP32)',
  3: 'Software reset via esp_restart',
  4: 'Software reset due to exception/panic',
  5: 'Reset (software or hardware) due to interrupt watchdog',
  6: 'Reset due to task watchdog',
  7: 'Reset due to other watchdogs',
  8: 'Reset after exiting deep sleep mode',
  9: 'Brownout reset (software or hardware)',
  10: 'Reset over SDIO',
  11: 'Reset by USB peripheral',
  12: 'Reset by JTAG'
};

function doTransferIn (device, endpointNumber, length) {
  return device.transferIn(endpointNumber, length);
}

function doTransferOut (device, endpointNumber, data) {
  return device.transferOut(endpointNumber, data)
    .then((result) => {
      if (result.status === 'ok') {
        /* transfer went all fine */
        if (result.bytesWritten !== data.length) {
          return Promise.reject(new Error('not all data could be sent'));
        }
        return Promise.resolve();
      } else if (result.status === 'stall') {
        /* device indicated an error */
        return this.state.device.clearHalt('out', endpointNumber)
          .then(() => { return Promise.reject(new Error('Device indicated an error occurred')) });
      }
      return Promise.reject(new Error('Transfer out gave unexpected response'));
    });
}

export class Master {
  constructor () {
    // These properties will be wrapped in a reactive object later
    this.state = reactive({
      device: null,
      vendorInterfaceNumber: null,
      vendorInEndpoint: null,
      vendorOutEndpoint: null
    });
  }

  setDevice (device) {
    this.state.device = device;
  }

  isSelected () {
    return this.state.device !== null;
  }

  isConnected () {
    return this.state.device !== null && this.state.device.opened;
  }

  connect () {
    if (this.state.device) {
      if (!this.state.device.opened) {
        return this.state.device.open()
          .then(() => {
            if (this.state.device.configuration === null) {
              return Promise.resolve(this.state.device.selectConfiguration(1));
            }
            return Promise.resolve();
          })
          .then(() => { return this.detectVendorEndpoints(); })
          .then(() => { return this.state.device.claimInterface(this.state.vendorInterfaceNumber); })
          .then(() => {
            navigator.usb.addEventListener('disconnect', (event) => {
              if (this.state.device && this.state.device === event.device) {
                this.state.device = null;
              }
            });
            return Promise.resolve();
          });
      } else {
        return Promise.resolve();
      }
    } else {
      return Promise.reject(new Error('no device selected yet')); /* TODO redirect to home */
    }
  }

  disconnect () {
    if (this.isConnected()) {
      return this.state.device.releaseInterface(this.state.vendorInterfaceNumber)
        .then(() => { return this.state.device.close(); })
        .then(() => {
          this.state.device = null;
          this.state.vendorInEndpoint = null;
          this.state.vendorOutEndpoint = null;
          return Promise.resolve();
        });
    } else {
      return Promise.resolve();
    }
  }

  detectVendorEndpoints () {
    const interfaces = this.state.device.configurations[0].interfaces;
    for (const iface of interfaces) {
      const altSetting = iface.alternate;
      if (altSetting.interfaceClass === VENDOR_SPECIFIC_CLASS) {
        this.state.vendorInterfaceNumber = iface.interfaceNumber;
        for (const endpoint of altSetting.endpoints) {
          if (endpoint.direction === 'in') {
            this.state.vendorInEndpoint = endpoint.endpointNumber;
          } else if (endpoint.direction === 'out') {
            this.state.vendorOutEndpoint = endpoint.endpointNumber;
          }
        }
        if (this.inEndpoint !== null && this.outEndpoint !== null) {
          return Promise.resolve();
        } else {
          return Promise.reject(new Error('Could not detect vendor IN and OUT endpoints'));
        }
      }
    }
    return Promise.reject(new Error('No interfaces found for vendor device class'));
  }

  vendorTransferIn (length) {
    return this.connect()
      .then(() => { return doTransferIn(this.state.device, this.state.vendorInEndpoint, length) })
      .then((result) => {
        if (result.status === 'ok') {
          /* transfer went all fine */
          return Promise.resolve(new Uint8Array(result.data.buffer));
        } else if (result.status === 'stall') {
          /* device indicated an error */
          return this.state.device.clearHalt('in', this.state.vendorInEndpoint)
            .then(() => { return Promise.reject(new Error('Device indicated an error occurred')) });
        } else if (result.status === 'babble') {
          /* device returned more data than expected */
          return Promise.reject(new Error('Device returned more data than expected'));
        }
        return Promise.reject(new Error('Transfer in gave unexpected response'));
      });
  }

  vendorTransferOut (data) {
    const payload = new Uint8Array(data);
    return this.connect()
      .then(() => {
        return doTransferOut(this.state.device, this.state.vendorOutEndpoint, payload);
      })
  }

  vendorControlTransferIn (bRequest, wValue, length) {
    return this.connect()
      .then(() => {
        const setup = {
          requestType: 'class',
          recipient: 'interface',
          request: bRequest,
          value: wValue,
          index: this.state.vendorInterfaceNumber
        };
        return this.state.device.controlTransferIn(setup, length);
      })
      .then((result) => {
        if (result.status === 'ok') {
          /* transfer went all fine */
          return Promise.resolve(new Uint8Array(result.data.buffer));
        } else if (result.status === 'stall') {
          /* device indicated an error */
          return this.state.device.clearHalt('in', this.state.vendorInEndpoint)
            .then(() => { return Promise.reject(new Error('Device indicated an error occurred')) });
        } else if (result.status === 'babble') {
          /* device returned more data than expected */
          return Promise.reject(new Error('device returned more data than expected'));
        }
        return Promise.reject(new Error('transfer in gave unexpected response'));
      });
  }

  vendorControlTransferOut (bRequest, wValue, data) {
    const payload = new Uint8Array(data);
    return this.connect()
      .then(() => {
        const setup = {
          requestType: 'class',
          recipient: 'interface',
          request: bRequest,
          value: wValue,
          index: this.state.vendorInterfaceNumber
        };
        return this.state.device.controlTransferOut(setup, payload);
      })
      .then((result) => {
        if (result.status === 'ok') {
          /* transfer went all fine */
          if (result.bytesWritten !== payload.length) {
            return Promise.reject(new Error('not all data could be sent'));
          }
          return Promise.resolve();
        } else if (result.status === 'stall') {
          /* device indicated an error */
          return this.state.device.clearHalt('out', this.state.vendorOutEndpoint)
            .then(() => { return Promise.reject(new Error('Device indicated an error occurred')) });
        }
        return Promise.reject(new Error('transfer out gave unexpected response'));
      });
  }

  identify () {
    return this.vendorControlTransferOut(MCM_VENDOR_REQUEST_IDENTIFY, 1);
  }

  getVersion () {
    return this.vendorControlTransferIn(MCM_VENDOR_REQUEST_INFO, MCM_INFO_VERSION, 255)
      .then((result) => {
        const decoder = new TextDecoder();
        return Promise.resolve(decoder.decode(result));
      });
  }

  getResetReason () {
    return this.vendorControlTransferIn(MCM_VENDOR_REQUEST_INFO, MCM_INFO_RESET_REASON, 255)
      .then((result) => {
        return Promise.resolve(esp32ResetReasons[result[0]]);
      });
  }

  getUpTime () {
    return this.vendorControlTransferIn(MCM_VENDOR_REQUEST_INFO, MCM_INFO_UP_TIME, 255)
      .then((result) => {
        let value = 0;
        for (let i = result.length; i > 0; i--) {
          value = (value << 8) | result[i - 1];
        }
        return Promise.resolve(value);
      });
  }
}

export const MasterPlugin = {
  install (app) {
    const masterInstance = new Master();
    app.provide(MasterSymbol, masterInstance);
  }
};

export function useMaster () {
  const master = inject(MasterSymbol);
  if (!master) {
    throw new Error('useMaster must be used within the app that installed the MasterPlugin');
  }
  return master;
}
