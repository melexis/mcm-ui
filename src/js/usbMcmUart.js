import { McmGeneric } from './usbMcmGeneric';
import { concatUint8Arrays, convertUint32ToUint8Array, MasterMode, mcmVendorRequest } from './usbTransport';

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

function bulkRxCallbackBareUart (data) {
  rxBareUartBuffer = concatUint8Arrays(rxBareUartBuffer, data);
  if (typeof (rxBareUartCallback) === 'function') {
    const consumedLength = rxBareUartCallback(rxBareUartBuffer);
    if (typeof consumedLength === 'number' && consumedLength >= 0) {
      rxBareUartBuffer = rxBareUartBuffer.slice(consumedLength);
    }
  }
}

export class McmUart extends McmGeneric {
  /** Disable bare UART mode.
   *
   * @returns {Promise<void>} Resolves when bare UART mode was disabled.
   */
  async disableBareUartMode () {
    rxBareUartBuffer = new Uint8Array([]);
    rxBareUartCallback = null;
    this.transport.announceStopBulkReceiver();
    await this.transport.vendorControlTransferOut(mcmVendorRequest.BARE_UART_MODE, 0);
    await this.transport.stopBulkReceiver();
  }

  /** Enable bare UART mode for raw communication.
   *
   * @param {void} rxCallback - callback to be executed on receipt of data.
   * @param {number} bitRate - Baud rate.
   * @param {number} dataBits - Number of data bits (5-8).
   * @param {number} stopBits - Number of stop bits (1, 1.5, 2).
   * @param {string} parity - Parity ('disabled', 'even', 'odd').
   * @param {boolean} halfDuplex - Optional half-duplex flag (not used).
   * @returns {Promise<void>} Resolves when bare UART mode was enabled.
   */
  async enableBareUartMode (rxCallback, bitRate, dataBits, stopBits, parity, halfDuplex) {
    rxBareUartCallback = rxCallback;
    const payload = new Uint8Array(8);
    payload.set(convertUint32ToUint8Array(bitRate), 0); // baudrate to be used in communication
    payload[4] = MCM_UART_RAW_DATA_BITS.indexOf(dataBits); // number of data bits (0:5bits; 1:6bits; 2:7bits; 3:8bits)
    payload[5] = MCM_UART_RAW_STOP_BITS.indexOf(stopBits); // number of stop bits (1:1bit; 2:1.5bit; 3:2bits)
    payload[6] = MCM_UART_RAW_PARITY.indexOf(parity); // parity type (0:disabled; 2:even; 3:odd)
    payload[7] = halfDuplex ? 1 : 0; // 1: use half duplex communication
    this.transport.startBulkReceiver(MasterMode.BARE, bulkRxCallbackBareUart);
    rxBareUartBuffer = new Uint8Array([]);
    await this.transport.vendorControlTransferOut(mcmVendorRequest.BARE_UART_MODE, 1, payload);
  }

  get bareUartModeEnabled () {
    return this.transport.mode === MasterMode.BARE;
  }

  /** Send raw data to the device in bare UART mode.
   *
   * @param {Array<number>} data - Data to transmit.
   * @returns {Promise<void>}
   * @throws {Error} If the device is not in bare UART mode.
   */
  async writeToBareUart (data) {
    if (this.transport.mode !== MasterMode.BARE) {
      throw new Error('device needs to be put in bare uart mode first');
    }
    await this.transport.vendorTransferOut(data);
  }

  /** Receive raw data from the device in bare UART mode.
   *
   * @param {number} length - Number of bytes to read.
   * @returns {Promise<Uint8Array>} Resolves with received data.
   * @throws {Error} If the device is not in bare UART mode.
   */
  async receiveFromBareUart (length) {
    if (this.transport.mode !== MasterMode.BARE) {
      throw new Error('device needs to be put in bare uart mode first');
    }
    if (length >= rxBareUartBuffer.length) {
      const retval = rxBareUartBuffer;
      rxBareUartBuffer = new Uint8Array([]);
      return retval;
    }
    const retval = rxBareUartBuffer.slice(0, length);
    rxBareUartBuffer = rxBareUartBuffer.slice(length);
    return retval;
  }

  /** Bootload a HEX file into the device.
   *
   * @param {string} hexfile - HEX file content.
   * @param {string} operation - Bootloader operation.
   * @param {string} memory - Target memory type.
   * @param {boolean} manualPower - Whether manual power is applied.
   * @param {number} bitRate - LIN bus bitrate.
   * @param {boolean} fullDuplex - Full duplex mode.
   * @param {number} txPin - TX pin identifier.
   * @param {Array<number>} flashKeys - Optional flash key sequence.
   * @returns {Promise<any>} Resolves with bootload response.
   */
  async bootload (hexfile, operation, memory, manualPower, bitRate, fullDuplex, txPin, flashKeys) {
    if (!Array.isArray(flashKeys) || flashKeys.length < 4) {
      throw new Error('flashKeys must be an array of 4 values');
    }

    if (this.transport.mode !== MasterMode.NONE) {
      await this.disableBareUartMode();
    }

    const decoder = new TextDecoder();

    const waitBootloadDone = async (timeout) => {
      let buffer = '';
      const stopTime = Date.now() + timeout;
      while (Date.now() < stopTime) {
        const chunk = await this.transport.vendorTransferIn();
        buffer += decoder.decode(chunk);
        const newlineCharIndex = buffer.indexOf('\n');
        if (newlineCharIndex >= 0) {
          const message = buffer.slice(0, newlineCharIndex);
          buffer = buffer.slice(newlineCharIndex + 1);
          if (message.includes('OK')) {
            return;
          } else if (message.startsWith('FAIL:')) {
            throw new Error(message.slice(message.indexOf('FAIL:') + 5));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('Timeout during bootloading');
    };

    // transfer hex file
    await this.transport.doHexfileTransfer(hexfile);

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
      this.transport.mode = MasterMode.BOOTLOADER;

      // do bootloading action
      await this.transport.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_DO, 0, payload);

      await waitBootloadDone(60000);
    } finally {
      this.transport.mode = MasterMode.NONE;
    }
  }
}
