/* eslint-disable semi */
const MCM_VENDOR_REQUEST_CONFIG = 0x02;
const MCM_VENDOR_REQUEST_SLAVE_CTRL = 0x10;
const MCM_VENDOR_REQUEST_BARE_UART_MODE = 0x20;
const MCM_VENDOR_REQUEST_BOOTLOADER_DO_TRANSFER = 0x30;
const MCM_VENDOR_REQUEST_BOOTLOADER_DO = 0x31;

const MCM_CONFIG_HOSTNAME = 0x00;
const MCM_CONFIG_WIFI_SSID = 0x01;
const MCM_CONFIG_WIFI_PASS = 0x02;

export const MCM_UART_RAW_DATA_BITS = [
  5,
  6,
  7,
  8
];

export const MCM_UART_RAW_STOP_BITS = [
  null,
  1,
  1.5,
  2
];

export const MCM_UART_RAW_PARITY = [
  'disabled',
  null,
  'even',
  'odd'
];

let rxTempBuffer = '';

function convertToUint8Array (value) {
  if (value > 0xFFFFFFFF || value < 0) {
    throw new RangeError('value must be a valid 32-bit unsigned integer');
  }
  const retval = new Uint8Array(4);
  retval[0] = (value >> 0) & 0xFF;
  retval[1] = (value >> 8) & 0xFF;
  retval[2] = (value >> 16) & 0xFF;
  retval[3] = (value >> 24) & 0xFF;
  return retval;
}

function convertStringToBytes (string) {
  const strBytes = new TextEncoder().encode(string);
  const retval = new Uint8Array(strBytes.length + 1);
  retval.set(strBytes, 0);
  retval.set([0], retval.length - 1);
  return retval;
}

function waitBootloadDone (master) {
  return master.vendorTransferIn(64)
    .then((response) => {
      const newData = new TextDecoder().decode(response);
      rxTempBuffer = rxTempBuffer.concat(newData);
      const newlineCharIndex = rxTempBuffer.indexOf('\n');
      if (newlineCharIndex >= 0) {
        const message = rxTempBuffer.slice(0, newlineCharIndex);
        rxTempBuffer = rxTempBuffer.slice(newlineCharIndex + 1);
        if (message.includes('OK')) {
          master.mode = null;
          return Promise.resolve();
        } else if (message.startsWith('FAIL:')) {
          master.mode = null;
          return Promise.reject(new Error(message.slice(message.indexOf('FAIL: ') + 6)));
        }
      }
      return waitBootloadDone(master);
    });
}

function bareUartReceiver (mcm, rxCallback) {
  return mcm.master.vendorTransferIn(64)
    .then((response) => {
      if (typeof (rxCallback) === 'function') {
        rxCallback(new TextDecoder().decode(response));
      }
      if (mcm.mode !== 'bare') {
        return Promise.resolve();
      }
      if (!mcm.master.isConnected()) {
        return Promise.resolve();
      }
      return bareUartReceiver(mcm, rxCallback);
    });
}

export class McmUart {
  constructor (master) {
    this.master = master;
    this.mode = null;
  }

  disableSlavePower () {
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_SLAVE_CTRL, 0);
  }

  enableSlavePower () {
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_SLAVE_CTRL, 1);
  }

  disableBareUartMode () {
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BARE_UART_MODE, 0)
      .then(() => {
        this.mode = null;
        return Promise.resolve();
      });
  }

  enableBareUartMode (rxCallback, bitRate, dataBits, stopBits, parity, halfDuplex) {
    const payload = new Uint8Array(8);
    payload.set(convertToUint8Array(bitRate), 0); // baudrate to be used in communication
    payload[4] = MCM_UART_RAW_DATA_BITS.indexOf(dataBits); // number of data bits (0:5bits; 1:6bits; 2:7bits; 3:8bits)
    payload[5] = MCM_UART_RAW_STOP_BITS.indexOf(stopBits); // number of stop bits (1:1bit; 2:1.5bit; 3:2bits)
    payload[6] = MCM_UART_RAW_PARITY.indexOf(parity); // parity type (0:disabled; 2:even; 3:odd)
    payload[7] = halfDuplex ? 1 : 0; // 1: use half duplex communication
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BARE_UART_MODE, 1, payload)
      .then(() => {
        this.mode = 'bare';
        bareUartReceiver(this, rxCallback);
        return Promise.resolve();
      });
  }

  writeToBareUart (message) {
    if (this.mode !== 'bare') {
      return Promise.reject(new Error('device needs to be put in bare uart mode first'));
    }
    const hexBuffer = new TextEncoder().encode(message);
    return this.master.vendorTransferOut(hexBuffer);
  }

  bootload (hexfile, operation, memory, manualPower, bitRate, fullDuplex, txPin, flashKeys) {
    // enable bootloader transfer hex mode
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BOOTLOADER_DO_TRANSFER, 1)
      .then(() => {
        this.mode = 'hextransfer';
        return Promise.resolve();
      })
      .then(() => {
        // send hexfile
        const hexBuffer = new TextEncoder().encode(hexfile);
        return this.master.vendorTransferOut(hexBuffer);
      })
      .then(() => {
        // disable bootloader transfer hex mode
        return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BOOTLOADER_DO_TRANSFER, 0);
      })
      .then(() => {
        // wait for processing done
        return waitBootloadDone(this.master);
      })
      .then(() => {
        // do bootloading action
        const payload = new Uint8Array(28);
        payload.set(convertToUint8Array(bitRate), 0); // baudrate to be used during bootloader operations
        payload.set(convertToUint8Array(flashKeys[0]), 4); // flash protection keys for the chip
        payload.set(convertToUint8Array(flashKeys[1]), 8);
        payload.set(convertToUint8Array(flashKeys[2]), 12);
        payload.set(convertToUint8Array(flashKeys[3]), 16);
        payload[20] = manualPower ? 1 : 0; // 1: manual power cycling
        payload[21] = fullDuplex ? 1 : 0; // 1: bootloading shall be done in full duplex mode
        payload[22] = txPin; // chip tx pin to use when in full duplex mode
        payload[23] = memory.toLowerCase() === 'flash' ? 1 : 0; // memory type to perform action on (0: NVRAM; 1: flash)
        payload[24] = operation.toLowerCase() === 'program' ? 0 : 1; // action type to perform (0: program; 1: verify)
        payload[25] = 0; // reserved
        payload[26] = 0; // reserved
        payload[27] = 0; // reserved
        return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BOOTLOADER_DO, 0, payload);
      })
      .then(() => {
        this.mode = 'bootloader';
        rxTempBuffer = '';
        return waitBootloadDone(this.master);
      });
  }

  setHostname (hostname) {
    const payload = convertStringToBytes(hostname);
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_HOSTNAME, payload);
  }

  getHostname () {
    return this.master.vendorControlTransferIn(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_HOSTNAME, 255)
      .then((response) => {
        return Promise.resolve(new TextDecoder().decode(response));
      });
  }

  setSsid (ssid) {
    const payload = convertStringToBytes(ssid);
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_WIFI_SSID, payload);
  }

  getSsid () {
    return this.master.vendorControlTransferIn(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_WIFI_SSID, 255)
      .then((response) => {
        return Promise.resolve(new TextDecoder().decode(response));
      });
  }

  setPassword (password) {
    const payload = convertStringToBytes(password);
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_WIFI_PASS, payload);
  }

  getPassword () {
    return this.master.vendorControlTransferIn(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_WIFI_PASS, 255)
      .then((response) => {
        return Promise.resolve(new TextDecoder().decode(response));
      });
  }
}
