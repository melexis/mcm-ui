import { concatUint8Arrays, convertUint32ToUint8Array, MasterMode, mcmVendorRequest } from '../js/usbMaster';

const MCM_CONFIG_HOSTNAME = 0x00;
const MCM_CONFIG_WIFI_SSID = 0x01;
const MCM_CONFIG_WIFI_PASS = 0x02;
const MCM_CONFIG_WIFI_MAC = 0x03;
const MCM_CONFIG_WIFI_IP_INFO = 0x04;

const MEMORY_FLASH = 1;
const MEMORY_NVRAM = 0;

const OPP_PROGRAM = 0;
const OPP_VERIFY = 1;

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

let rxBareUartBuffer = new Uint8Array([]);
let rxBareUartCallback = null;

function convertStringToBytes (string) {
  const strBytes = new TextEncoder().encode(string);
  const retval = new Uint8Array(strBytes.length + 1);
  retval.set(strBytes, 0);
  retval.set([0], retval.length - 1);
  return retval;
}

function decodeUsbString (response) {
  return new TextDecoder().decode(response).replace(/\0.*$/, '');
}

function bulkRxCallbackBareUart (data) {
  rxBareUartBuffer = concatUint8Arrays(rxBareUartBuffer, data);
  if (typeof (rxBareUartCallback) === 'function') {
    const consumedLength = rxBareUartCallback(rxBareUartBuffer);
    if (typeof consumedLength === 'number' && consumedLength >= 0) {
      rxBareUartBuffer = rxBareUartBuffer.slice(consumedLength);
    }
  }
}

function uint32ToIpString (u32) {
  return [
    u32 & 0xFF,
    (u32 >> 8) & 0xFF,
    (u32 >> 16) & 0xFF,
    (u32 >> 24) & 0xFF
  ].join('.');
}

export class McmUart {
  constructor (master) {
    this.master = master;
  }

  disableSlavePower () {
    return this.master.vendorControlTransferOut(mcmVendorRequest.SLAVE_CTRL, 0);
  }

  enableSlavePower () {
    return this.master.vendorControlTransferOut(mcmVendorRequest.SLAVE_CTRL, 1);
  }

  async isSlavePowerEnabled () {
    const response = await this.master.vendorControlTransferIn(mcmVendorRequest.SLAVE_CTRL, 0, 255);
    return response[0] === 1;
  }

  async disableBareUartMode () {
    rxBareUartBuffer = new Uint8Array([]);
    rxBareUartCallback = null;
    await this.master.vendorControlTransferOut(mcmVendorRequest.BARE_UART_MODE, 0);
    await this.master.stopBulkReceiver();
  }

  async enableBareUartMode (rxCallback, bitRate, dataBits, stopBits, parity, halfDuplex) {
    rxBareUartCallback = rxCallback;
    const payload = new Uint8Array(8);
    payload.set(convertUint32ToUint8Array(bitRate), 0); // baudrate to be used in communication
    payload[4] = MCM_UART_RAW_DATA_BITS.indexOf(dataBits); // number of data bits (0:5bits; 1:6bits; 2:7bits; 3:8bits)
    payload[5] = MCM_UART_RAW_STOP_BITS.indexOf(stopBits); // number of stop bits (1:1bit; 2:1.5bit; 3:2bits)
    payload[6] = MCM_UART_RAW_PARITY.indexOf(parity); // parity type (0:disabled; 2:even; 3:odd)
    payload[7] = halfDuplex ? 1 : 0; // 1: use half duplex communication
    this.master.startBulkReceiver(MasterMode.BARE, bulkRxCallbackBareUart);
    await this.master.vendorControlTransferOut(mcmVendorRequest.BARE_UART_MODE, 1, payload);
    rxBareUartBuffer = new Uint8Array([]);
  }

  async writeToBareUart (message) {
    if (this.master.mode !== MasterMode.BARE) {
      throw new Error('device needs to be put in bare uart mode first');
    }
    await this.master.vendorTransferOut(message);
  }

  receiveFromBareUart (length) {
    if (this.master.mode !== MasterMode.BARE) {
      return Promise.reject(new Error('device needs to be put in bare uart mode first'));
    }
    if (length >= rxBareUartBuffer.length) {
      const retval = rxBareUartBuffer;
      rxBareUartBuffer = new Uint8Array([]);
      return Promise.resolve(retval);
    }
    const retval = rxBareUartBuffer.slice(0, length);
    rxBareUartBuffer = rxBareUartBuffer.slice(length + 1);
    return Promise.resolve(retval);
  }

  async bootload (hexfile, operation, memory, manualPower, bitRate, fullDuplex, txPin, flashKeys) {
    if (!Array.isArray(flashKeys) || flashKeys.length < 4) {
      return Promise.reject(new Error('flashKeys must be an array of 4 values'));
    }

    if (this.master.mode !== MasterMode.NONE) {
      await this.disableBareUartMode();
    }

    const decoder = new TextDecoder();

    const waitBootloadDone = async () => {
      let buffer = '';
      while (true) {
        const chunk = await this.master.vendorTransferIn();
        buffer += decoder.decode(chunk);
        const newlineCharIndex = buffer.indexOf('\n');
        if (newlineCharIndex >= 0) {
          const message = buffer.slice(0, newlineCharIndex);
          buffer = buffer.slice(newlineCharIndex + 1);
          if (message.includes('OK')) {
            return;
          } else if (message.startsWith('FAIL:')) {
            throw new Error(message.slice(message.indexOf('FAIL: ') + 6));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };

    // transfer hex file
    await this.master.doHexfileTransfer(hexfile);

    const payload = new Uint8Array(28);
    payload.set(convertUint32ToUint8Array(bitRate), 0); // baudrate to be used during bootloader operations
    payload.set(convertUint32ToUint8Array(flashKeys[0]), 4); // flash protection keys for the chip
    payload.set(convertUint32ToUint8Array(flashKeys[1]), 8);
    payload.set(convertUint32ToUint8Array(flashKeys[2]), 12);
    payload.set(convertUint32ToUint8Array(flashKeys[3]), 16);
    payload[20] = manualPower ? 1 : 0; // 1: manual power cycling
    payload[21] = fullDuplex ? 1 : 0; // 1: bootloading shall be done in full duplex mode
    payload[22] = txPin; // chip tx pin to use when in full duplex mode
    payload[23] = memory.toLowerCase() === 'flash' ? MEMORY_FLASH : MEMORY_NVRAM; // memory type to perform action on (0: NVRAM; 1: flash)
    payload[24] = operation.toLowerCase() === 'program' ? OPP_PROGRAM : OPP_VERIFY; // action type to perform (0: program; 1: verify)
    payload[25] = 0; // reserved
    payload[26] = 0; // reserved
    payload[27] = 0; // reserved

    try {
      this.master.mode = MasterMode.BOOTLOADER;

      // do bootloading action
      await this.master.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_DO, 0, payload);

      await waitBootloadDone();
    } finally {
      this.master.mode = MasterMode.NONE;
    }
  }

  setConfig (index, string) {
    const payload = convertStringToBytes(string);
    return this.master.vendorControlTransferOut(mcmVendorRequest.CONFIG, index, payload);
  }

  async getConfig (index) {
    const response = await this.master.vendorControlTransferIn(mcmVendorRequest.CONFIG, index, 255);
    return decodeUsbString(response);
  }

  setHostname (hostname) {
    return this.setConfig(MCM_CONFIG_HOSTNAME, hostname);
  }

  getHostname () {
    return this.getConfig(MCM_CONFIG_HOSTNAME);
  }

  setSsid (ssid) {
    return this.setConfig(MCM_CONFIG_WIFI_SSID, ssid);
  }

  getSsid () {
    return this.getConfig(MCM_CONFIG_WIFI_SSID);
  }

  setPassword (password) {
    return this.setConfig(MCM_CONFIG_WIFI_PASS, password);
  }

  getPassword () {
    return this.getConfig(MCM_CONFIG_WIFI_PASS);
  }

  async getMac () {
    const response = await this.master.vendorControlTransferIn(mcmVendorRequest.CONFIG, MCM_CONFIG_WIFI_MAC, 255);
    let retval = '';
    for (let i = 0; i < 6; i++) {
      retval += `${response[i].toString(16).padStart(2, '0')}:`;
    }
    return retval.slice(0, -1);
  }

  async getIpInfo () {
    const response = await this.master.vendorControlTransferIn(mcmVendorRequest.CONFIG, MCM_CONFIG_WIFI_IP_INFO, 255);
    const info = {};
    if (response.length > 0) {
      info.link_up = true;
      const u32Resp = new Uint32Array(response.buffer);
      info.ip = uint32ToIpString(u32Resp[0]);
      info.netmask = uint32ToIpString(u32Resp[1]);
      info.gateway = uint32ToIpString(u32Resp[2]);
    } else {
      info.link_up = false;
    }
    return info;
  }
}
