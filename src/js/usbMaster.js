import { reactive, inject } from 'vue';

import { upgradeFirmware } from '../js/usbMasterFirmware';
import { hexfileTransfer } from '../js/usbMasterHexTransfer';

const MasterSymbol = Symbol('Master');

const VENDOR_SPECIFIC_CLASS = 0xFF;

/** Vendor-specific request codes used for control transfers. */
export const mcmVendorRequest = {
  IDENTIFY: 0x00,
  INFO: 0x01,
  CONFIG: 0x02,
  SLAVE_CTRL: 0x10,
  BARE_UART_MODE: 0x20,
  PWM_COMM: 0x21,
  LIN_COMM: 0x22,
  BOOTLOADER_DO_TRANSFER: 0x30,
  BOOTLOADER_DO: 0x31,
  BOOTLOADER_UART: 0x32,
  BOOTLOADER_PPM: 0x33,
  OTA_DO_TRANSFER: 0x80,
  OTA_UPDATE_BOOT_PARTITION: 0x81,
  RESTART: 0xE0,
  UNKNOWN: 0xFF,
};

/** Message ID constants used in bulk MLX messages. */
export const mcmMlxMessageId = {
  PPM_DO_BTL_ACTION: 0x3300,
  MCM_BULK_MSG_ERROR_REPORT: 0xFFFF,
};

const MCM_INFO_VERSION = 0x00;
const MCM_INFO_RESET_REASON = 0x01;
const MCM_INFO_UP_TIME = 0x02;

/** Operating modes for the Master. */
export const MasterMode = {
  NONE: null,
  LIN: 'lin',
  BOOTLOADER: 'bootloader',
  HEXTRANSFER: 'hextransfer',
  ERROR: 'error',
};

/** Reset reasons for ESP32 devices. */
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

/** Convert a 32-bit integer to a Uint8Array. */
export function convertUint32ToUint8Array (value, littleEndian = true) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, littleEndian);
  return new Uint8Array(buffer);
}

/** Convert a 16-bit integer to a Uint8Array. */
export function convertUint16ToUint8Array (value, littleEndian = true) {
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint16(0, value, littleEndian);
  return new Uint8Array(buffer);
}

/** Convert a Uint8Array into a 32-bit integer. */
export function uint8ArrayToUint32 (bytes, littleEndian = true) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(0, littleEndian);
}

/** Convert a Uint8Array into a 16-bit integer. */
export function uint8ArrayToUint16 (bytes, littleEndian = true) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint16(0, littleEndian);
}

/** Helper function to concatenate Uint8Arrays
 *
 * @param {Uint8Array} a - First array.
 * @param {Uint8Array} b - Second array.
 * @returns {Uint8Array} Concatenated arrays.
 */
export function concatUint8Arrays (a, b) {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(a, 0);
  result.set(b, a.byteLength);
  return result;
}

/** Calculate the 16-bit CRC.
 *
 * @param {Uint8Array} data - Data to calculate the checksum for.
 * @param {number} initValue - Initial value to use in CRC calculation.
 * @returns {number} Calculated 16-bit checksum.
 */
export function calculate16BitCrc (data, initValue) {
  let crc = initValue;
  for (let i = 0; i < data.byteLength; i++) {
    const byte = data[i];
    crc = ((crc >> 8) & 0xFF) | (crc << 8);
    crc ^= byte;
    crc ^= (crc >> 4) & 0x000F;
    crc ^= (crc << 8) << 4;
    crc ^= ((crc & 0xFF) << 4) << 1;
    crc &= 0xFFFF;
  }
  return crc & 0xFFFF;
}

export class Master {
  constructor () {
    // These properties will be wrapped in a reactive object later
    this.state = reactive({
      _device: null,
      _mode: MasterMode.NONE,
      vendorInterfaceNumber: null,
      vendorInEndpoint: null,
      vendorInPacketSize: null,
      vendorOutEndpoint: null,
      bulkReceiverRunning: false,
      bulkReceiverAbort: null
    });

    this._onDisconnect = this._onDisconnect.bind(this);
    navigator.usb.addEventListener('disconnect', this._onDisconnect);
  }

  /** Internal handler for USB disconnect events.
   *
   * Called by the browser when a USBDevice is physically detached.
   */
  _onDisconnect (event) {
    if (this.state._device && this.state._device === event.device) {
      this.state._device = null;
    }
  }

  /** Clean up event listeners, reactive state, and close the device if open. */
  async dispose () {
    await this.stopBulkReceiver();
    navigator.usb.removeEventListener('disconnect', this._onDisconnect);
    if (this.state._device?.opened) {
      try {
        await this.state._device.close();
      } catch (err) {
        console.warn('Failed to close device during dispose:', err);
      }
    }
    this.state._device = null;
    this.state.vendorInterfaceNumber = null;
    this.state.vendorInEndpoint = null;
    this.state.vendorInPacketSize = null;
    this.state.vendorOutEndpoint = null;
    this.state.bulkReceiverAbort = null;
    this.state.bulkReceiverRunning = false;
    this.state._mode = MasterMode.NONE;
  }

  /** Inject a USBDevice object into the Master. */
  setDevice (device) {
    this.state._device = device;
  }

  get device () {
    return this.state._device;
  }

  /** Whether a device is selected. */
  isSelected () {
    return this.state._device !== null;
  }

  /** Set operating mode. */
  set mode (value) {
    this.state._mode = value;
  }

  /** Get operating mode. */
  get mode () {
    return this.state._mode;
  }

  /** Whether the device is connected and opened. */
  isConnected () {
    return this.state._device !== null && this.state._device.opened;
  }

  /** Connect to the selected WebUSB device and claim the vendor interface.
   *
   * @returns {Promise<void>}
   * @throws {Error} If no device is selected or connection fails.
   */
  async connect () {
    if (this.state._device === null) {
      throw new Error('no device selected yet');
    }
    if (this.isConnected()) {
      return;
    }

    await this.state._device.open();

    if (this.state._device.configuration === null) {
      await this.state._device.selectConfiguration(1);
    }

    await this.detectVendorEndpoints();

    try {
      await this.state._device.claimInterface(this.state.vendorInterfaceNumber);
    } catch (err) {
      if (!err.message.includes('already claimed')) {
        throw err;
      }
    }
  }

  /** Disconnect from the USB device.
   *
   * Releases interface, stops bulk receiver, and closes the device.
   */
  async disconnect () {
    if (this.isConnected()) {
      this.stopBulkReceiver().catch(() => {});
      await this.state._device.releaseInterface(this.state.vendorInterfaceNumber);
      if (this.state._device?.opened) {
        await this.state._device.close();
      }
      this.state._device = null;
      this.mode = MasterMode.NONE;
      this.state.vendorInterfaceNumber = null;
      this.state.vendorInEndpoint = null;
      this.state.vendorInPacketSize = null;
      this.state.vendorOutEndpoint = null;
    }
  }

  /** Detect vendor-specific endpoints in the active configuration.
   *
   * This searches all interfaces for a class 0xFF interface, then identifies
   * IN and OUT bulk endpoints.
   */
  detectVendorEndpoints () {
    const interfaces = this.state._device.configurations[0].interfaces;
    for (const iface of interfaces) {
      const altSetting = iface.alternate;
      if (altSetting.interfaceClass === VENDOR_SPECIFIC_CLASS) {
        this.state.vendorInterfaceNumber = iface.interfaceNumber;
        for (const endpoint of altSetting.endpoints) {
          if (endpoint.direction === 'in') {
            this.state.vendorInEndpoint = endpoint;
            this.state.vendorInPacketSize = this.state.vendorInEndpoint?.packetSize ??
              this.state.vendorInEndpoint?.maxPacketSize ?? 64;
          } else if (endpoint.direction === 'out') {
            this.state.vendorOutEndpoint = endpoint;
          }
        }
        if (this.state.vendorInEndpoint !== null && this.state.vendorOutEndpoint !== null) {
          return;
        } else {
          throw new Error('Could not detect vendor IN and OUT endpoints');
        }
      }
    }
    throw new Error('No interfaces found for vendor device class');
  }

  /** Perform a bulk IN transfer from the device.
   *
   * @returns {Promise<Uint8Array>} Received data
   */
  async vendorTransferIn () {
    await this.connect();
    const result = await this.state._device.transferIn(
      this.state.vendorInEndpoint.endpointNumber,
      this.state.vendorInPacketSize
    );
    if (result.status === 'ok') {
      /* transfer went all fine */
      return new Uint8Array(result.data.buffer);
    } else if (result.status === 'stall') {
      /* device indicated an error */
      await this.state._device.clearHalt('in', this.state.vendorInEndpoint.endpointNumber);
      throw new Error('Device indicated an error occurred');
    } else if (result.status === 'babble') {
      /* device returned more data than expected */
      throw new Error('Device returned more data than expected');
    }
    throw new Error('Transfer in gave unexpected response');
  }

  /** Perform a bulk OUT transfer.
   *
   * @param {Uint8Array} data - Data to send
   */
  async vendorTransferOut (data) {
    const payload = new Uint8Array(data);
    await this.connect();
    const result = await this.state._device.transferOut(this.state.vendorOutEndpoint.endpointNumber, payload);
    if (result.status === 'ok') {
      /* transfer went all fine */
      if (result.bytesWritten !== payload.length) {
        throw new Error('not all data could be sent');
      }
      return;
    } else if (result.status === 'stall') {
      /* device indicated an error */
      await this.state._device.clearHalt('out', this.state.vendorOutEndpoint.endpointNumber);
      throw new Error('Device indicated an error occurred');
    }
    throw new Error('Transfer out gave unexpected response');
  }

  /** Perform a vendor-specific control transfer IN.
   *
   * @returns {Promise<Uint8Array>} Received data
   */
  async vendorControlTransferIn (bRequest, wValue, length) {
    await this.connect();
    const setup = {
      requestType: 'class',
      recipient: 'interface',
      request: bRequest,
      value: wValue,
      index: this.state.vendorInterfaceNumber
    };
    const result = await this.state._device.controlTransferIn(setup, length);
    if (result.status === 'ok') {
      /* transfer went all fine */
      return new Uint8Array(result.data.buffer);
    } else if (result.status === 'stall') {
      /* device indicated an error */
      await this.state._device.clearHalt('in', this.state.vendorInEndpoint.endpointNumber);
      throw new Error('Device indicated an error occurred');
    } else if (result.status === 'babble') {
      /* device returned more data than expected */
      throw new Error('device returned more data than expected');
    }
    throw new Error('transfer in gave unexpected response');
  }

  /** Send a vendor control transfer OUT request.
   *
   * @param {number} bRequest - The vendor specific request code.
   * @param {number} wValue - The value field for the request.
   * @param {Uint8Array} data - Optional payload.
   * @returns {Promise<void>}
   */
  async vendorControlTransferOut (bRequest, wValue, data) {
    const payload = new Uint8Array(data);
    await this.connect();
    const setup = {
      requestType: 'class',
      recipient: 'interface',
      request: bRequest,
      value: wValue,
      index: this.state.vendorInterfaceNumber
    };
    const result = await this.state._device.controlTransferOut(setup, payload);
    if (result.status === 'ok') {
      /* transfer went all fine */
      if (result.bytesWritten !== payload.length) {
        throw new Error('not all data could be sent');
      }
      return;
    } else if (result.status === 'stall') {
      /* device indicated an error */
      await this.state._device.clearHalt('out', this.state.vendorOutEndpoint.endpointNumber);
      throw new Error('Device indicated an error occurred');
    }
    throw new Error('transfer out gave unexpected response');
  }

  /** Start the bulk receiver task */
  async startBulkReceiver (receiverMode, callback) {
    if (this.state.bulkReceiverRunning) {
      throw new Error('Receiver already running');
    }

    this.mode = receiverMode;
    const controller = new AbortController();
    this.state.bulkReceiverRunning = true;
    this.state.bulkReceiverAbort = controller;

    const loop = async () => {
      while (!controller.signal.aborted && this.isConnected()) {
        try {
          const chunk = await this.vendorTransferIn();
          callback?.(chunk);
        } catch (error) {
          if (controller.signal.aborted) {
            break;
          }
          console.error(error);
          this.mode = MasterMode.ERROR;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      this.state.bulkReceiverRunning = false;
    };

    loop();
    return controller;
  }

  /** Stop the bulk receiver task
   *
   * Since the receiver uses vendorTransferIn() which does not have a timeout
   * it is important to know stopping can only be effective if bytes are being
   * received.
   */
  async stopBulkReceiver () {
    this.state.bulkReceiverAbort?.abort();
    const forceClose = this.state._device;
    if (this.state.bulkReceiverRunning) {
      setTimeout(() => {
        if (this.state.bulkReceiverRunning) {
          if (forceClose?.opened) {
            try {
              forceClose.close();
            } catch {}
          }
        }
      }, 300);
    }
    this.state.bulkReceiverAbort = null;
    this.mode = MasterMode.NONE;
  }

  identify () {
    return this.vendorControlTransferOut(mcmVendorRequest.IDENTIFY, 1);
  }

  getProductName () {
    return this.state._device.productName;
  }

  async getVersion () {
    const result = await this.vendorControlTransferIn(mcmVendorRequest.INFO, MCM_INFO_VERSION, 255);
    return new TextDecoder().decode(result);
  }

  async getResetReason () {
    const result = await this.vendorControlTransferIn(mcmVendorRequest.INFO, MCM_INFO_RESET_REASON, 255);
    return esp32ResetReasons[result[0]];
  }

  async getUpTime () {
    const result = await this.vendorControlTransferIn(mcmVendorRequest.INFO, MCM_INFO_UP_TIME, 255);
    return uint8ArrayToUint32(result);
  }

  async restart () {
    await this.vendorControlTransferOut(mcmVendorRequest.RESTART, 0);
    await this.disconnect();
  }

  async upgradeFirmware (fileContent, progress) {
    return upgradeFirmware(this, fileContent, progress);
  }

  async doHexfileTransfer (hexfile) {
    return hexfileTransfer(this, hexfile);
  }

  /** Send a message on the bulk channel.
   *
   * @param {number} command - Command to be send.
   * @param {Uint8Array} data - Data to be send in the message.
   */
  async sendBulkMlxMessage (command, data) {
    const messLength = 12 + data.byteLength + 2;
    const message = new Uint8Array(messLength);
    message.set(convertUint32ToUint8Array(0xAA55AA55), 0);
    message.set(convertUint16ToUint8Array(messLength), 4);
    message.set(convertUint16ToUint8Array(command), 6);
    message.set(convertUint32ToUint8Array(0), 8);
    message.set(data, 12);
    message.set(convertUint16ToUint8Array(calculate16BitCrc(message.subarray(0, 12 + data.byteLength), 0x1D0F)), messLength - 2);
    await this.vendorTransferOut(message);
  }

  /** Receive a message on the bulk channel.
   *
   * @param {number} command - Command to be expected.
   * @param {number} timeout - Timeout to wait for a response [ms].
   * @returns {Uint8Array} Response message data received.
   */
  async receiveBulkMlxMessage (command, timeout) {
    const HEADERSIZE = 12;
    let rxLength = HEADERSIZE;
    let message = new Uint8Array();
    const stopTime = Date.now() + timeout;

    while (rxLength > message.length) {
      const chunk = await this.vendorTransferIn();
      message = concatUint8Arrays(message, chunk);

      while (message.length >= 6) {
        const magic = uint8ArrayToUint32(message.subarray(0, 4));
        if (magic === 0xAA55AA55) {
          rxLength = message[4] | (message[5] << 8);
          break;
        }
        // drop a byte as the header did not fit
        message = message.slice(1);
      }

      if (Date.now() > stopTime) {
        throw new Error('No valid response received before timeout');
      }
    }

    // Check CRC
    const rxCrc = message[message.length - 2] | (message[message.length - 1] << 8);
    const calcCrc = calculate16BitCrc(message.slice(0, -2), 0x1D0F);
    if (rxCrc !== calcCrc) {
      throw new Error('Response received with corrupt checksum');
    }

    // Check command
    const rxCommand = message[6] | (message[7] << 8);
    if (rxCommand === mcmMlxMessageId.MCM_BULK_MSG_ERROR_REPORT) {
      const errors = {
        command: message[HEADERSIZE] | (message[HEADERSIZE + 1] << 8),
        code: message[HEADERSIZE + 2] | (message[HEADERSIZE + 3] << 8),
      };
      const errMsg = new TextDecoder().decode(message.slice(HEADERSIZE + 4, -2));
      throw new Error(errMsg, { errors });
    }

    if (rxCommand !== command) {
      throw new Error(
        `Unexpected command response ${rxCommand.toString(16).padStart(4, '0')} received, expected ${command.toString(16).padStart(4, '0')}`
      );
    }

    return message.slice(HEADERSIZE, -2);
  }

  /** Send a message and wait for the response on the bulk channel.
   *
   * @param {number} command - Command to be send.
   * @param {Uint8Array} data - Data to be send in the message.
   * @param {number} timeout - Timeout to wait for a response [ms].
   * @returns {Uint8Array} Response message data received.
   */
  async sendBulkMlxMessageAndWaitResponse (command, data, timeout) {
    await this.sendBulkMlxMessage(command, data);
    return this.receiveBulkMlxMessage(command, timeout);
  }
}

export const MasterPlugin = {
  install (app) {
    const masterInstance = new Master();
    app.provide(MasterSymbol, masterInstance);

    app.unmount = ((originalUnmount) => {
      return function () {
        masterInstance.dispose();
        originalUnmount.call(this);
      };
    })(app.unmount);
  }
};

export function useMaster () {
  const master = inject(MasterSymbol);
  if (!master) {
    throw new Error('useMaster must be used within the app that installed the MasterPlugin');
  }
  return master;
}
