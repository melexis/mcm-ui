const MCM_VENDOR_REQUEST_CONFIG = 0x02;
const MCM_VENDOR_REQUEST_SLAVE_CTRL = 0x10;
const MCM_VENDOR_REQUEST_BARE_UART_MODE = 0x20;
const MCM_VENDOR_REQUEST_BOOTLOADER_DO_TRANSFER = 0x30;
const MCM_VENDOR_REQUEST_BOOTLOADER_DO = 0x31;

const MCM_CONFIG_HOSTNAME = 0x00;
const MCM_CONFIG_WIFI_SSID = 0x01;
const MCM_CONFIG_WIFI_PASS = 0x02;
const MCM_CONFIG_WIFI_MAC = 0x03;
const MCM_CONFIG_WIFI_IP_INFO = 0x04;

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

let rxBtlBuffer = '';
let rxBareUartBuffer = [];
let rxBareUartCallback = null;

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

function bulkRxCallbackBootloader (buffer) {
  const newData = new TextDecoder().decode(buffer);
  rxBtlBuffer = rxBtlBuffer.concat(newData);
}

function bulkRxCallbackBareUart (data) {
  const aData = Array.from(data);
  rxBareUartBuffer.push(...aData);
  if (typeof (rxBareUartCallback) === 'function') {
    const length = rxBareUartCallback(rxBareUartBuffer);
    rxBareUartBuffer = rxBareUartBuffer.slice(length + 1);
  }
}

function waitBootloadDone () {
  const newlineCharIndex = rxBtlBuffer.indexOf('\n');
  if (newlineCharIndex >= 0) {
    const message = rxBtlBuffer.slice(0, newlineCharIndex);
    rxBtlBuffer = rxBtlBuffer.slice(newlineCharIndex + 1);
    if (message.includes('OK')) {
      return Promise.resolve();
    } else if (message.startsWith('FAIL:')) {
      return Promise.reject(new Error(message.slice(message.indexOf('FAIL: ') + 6)));
    }
  }
  return new Promise(resolve => setTimeout(resolve, 50))
    .then(() => {
      return waitBootloadDone();
    });
}

export class McmUart {
  constructor (master) {
    this.master = master;
  }

  disableSlavePower () {
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_SLAVE_CTRL, 0);
  }

  enableSlavePower () {
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_SLAVE_CTRL, 1);
  }

  isSlavePowerEnabled () {
    return this.master.vendorControlTransferIn(MCM_VENDOR_REQUEST_SLAVE_CTRL, 0, 255)
      .then((response) => {
        return Promise.resolve(response[0] === 1);
      });
  }

  disableBareUartMode () {
    rxBareUartBuffer = [];
    rxBareUartCallback = null;
    this.master.bulkRxCallback = null;
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BARE_UART_MODE, 0)
      .then(() => {
        this.master.mode = null;
        return Promise.resolve();
      });
  }

  enableBareUartMode (rxCallback, bitRate, dataBits, stopBits, parity, halfDuplex) {
    rxBareUartCallback = rxCallback;
    const payload = new Uint8Array(8);
    payload.set(convertToUint8Array(bitRate), 0); // baudrate to be used in communication
    payload[4] = MCM_UART_RAW_DATA_BITS.indexOf(dataBits); // number of data bits (0:5bits; 1:6bits; 2:7bits; 3:8bits)
    payload[5] = MCM_UART_RAW_STOP_BITS.indexOf(stopBits); // number of stop bits (1:1bit; 2:1.5bit; 3:2bits)
    payload[6] = MCM_UART_RAW_PARITY.indexOf(parity); // parity type (0:disabled; 2:even; 3:odd)
    payload[7] = halfDuplex ? 1 : 0; // 1: use half duplex communication
    this.master.bulkRxCallback = null;
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BARE_UART_MODE, 1, payload)
      .then(() => {
        this.master.mode = 'bare';
        rxBareUartBuffer = [];
        this.master.bulkRxCallback = bulkRxCallbackBareUart;
        return Promise.resolve();
      });
  }

  writeToBareUart (message) {
    if (this.master.mode !== 'bare') {
      return Promise.reject(new Error('device needs to be put in bare uart mode first'));
    }
    return this.master.vendorTransferOut(message);
  }

  receiveFromBareUart (length) {
    if (this.master.mode !== 'bare') {
      return Promise.reject(new Error('device needs to be put in bare uart mode first'));
    }
    if (length >= rxBareUartBuffer.length) {
      const retval = rxBareUartBuffer;
      rxBareUartBuffer = [];
      return Promise.resolve(retval);
    }
    const retval = rxBareUartBuffer.slice(0, length);
    rxBareUartBuffer = rxBareUartBuffer.slice(length + 1);
    return Promise.resolve(retval);
  }

  bootload (hexfile, operation, memory, manualPower, bitRate, fullDuplex, txPin, flashKeys) {
    if (this.master.mode !== null) {
      this.disableBareUartMode();
    }
    // enable bootloader transfer hex mode
    rxBtlBuffer = '';
    this.master.bulkRxCallback = bulkRxCallbackBootloader;
    return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BOOTLOADER_DO_TRANSFER, 1)
      .then(() => {
        this.master.mode = 'hextransfer';
        return Promise.resolve();
      })
      .then(() => {
        // send hexfile
        return this.master.vendorTransferOut(hexfile);
      })
      .then(() => {
        // disable bootloader transfer hex mode
        return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BOOTLOADER_DO_TRANSFER, 0);
      })
      .then(() => {
        // wait for processing done
        return waitBootloadDone();
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
        this.master.mode = 'bootloader';
        rxBtlBuffer = '';
        return this.master.vendorControlTransferOut(MCM_VENDOR_REQUEST_BOOTLOADER_DO, 0, payload);
      })
      .then(() => {
        return waitBootloadDone();
      })
      .then(() => {
        rxBtlBuffer = '';
        this.master.bulkRxCallback = null;
        this.master.mode = null;
        return Promise.resolve();
      })
      .catch((error) => {
        this.master.bulkRxCallback = null;
        this.master.mode = null;
        return Promise.reject(error);
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

  getMac () {
    return this.master.vendorControlTransferIn(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_WIFI_MAC, 255)
      .then((response) => {
        let retval = '';
        for (let i = 0; i < 6; i++) {
          retval += `${response[i].toString(16)}:`;
        }
        return Promise.resolve(retval.slice(0, -1));
      });
  }

  getIpInfo () {
    return this.master.vendorControlTransferIn(MCM_VENDOR_REQUEST_CONFIG, MCM_CONFIG_WIFI_IP_INFO, 255)
      .then((response) => {
        const info = {};
        if (response.length > 0) {
          info.link_up = true;
          const u32Resp = new Uint32Array(response.buffer);
          info.ip = u32Resp[0];
          info.netmask = u32Resp[1];
          info.gateway = u32Resp[2];
        } else {
          info.link_up = false;
        }
        return Promise.resolve(info);
      });
  }
}
