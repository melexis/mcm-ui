import { McmGeneric } from './usbMcmGeneric';
import { convertUint16ToUint8Array, convertUint32ToUint8Array, MasterMode, mcmMlxMessageId, mcmVendorRequest } from './usbTransport';

const BTL_MEMORY = {
  nvram: 0,
  flash: 1,
  flash_cs: 2,
};
const OPP_PROGRAM = 0;
const OPP_VERIFY = 1;

const mcmLinCommand = {
  SEND_WAKEUP: 0x2200,
  HANDLE_MESSAGE: 0x2201,
};

export class McmLin extends McmGeneric {
  /** Disable LIN mode.
   *
   * @returns {Promise<void>} Resolves when LIN mode was disabled.
   */
  async disableLinMode () {
    await this.transport.vendorControlTransferOut(mcmVendorRequest.LIN_COMM, 0);
    this.transport.mode = MasterMode.NONE;
  }

  /** Bootload a HEX file into the device.
   *
   * @param {string} hexfile - HEX file content.
   * @param {string} operation - Bootloader operation.
   * @param {string} memory - Target memory type.
   * @param {boolean} manualPower - Whether manual power is applied.
   * @param {number} bitRate - LIN bus bitrate.
   * @param {boolean} broadcast - Whether to program in broadcast mode.
   * @returns {Promise<any>} Resolves with bootload response.
   */
  async bootload (hexfile, operation, memory, manualPower, bitRate, broadcast) {
    if (this.transport.mode === MasterMode.LIN) {
      await this.disableLinMode();
    }

    const memType = BTL_MEMORY[memory.toLowerCase()];
    if (memType === undefined) {
      throw new Error(`Unknown memory type: "${memory}". Valid types: ${Object.keys(BTL_MEMORY).join(', ')}`);
    }

    // transfer hex file
    await this.transport.doHexfileTransfer(hexfile);

    const payload = new Uint8Array(8);
    payload.set(convertUint32ToUint8Array(bitRate), 0); // baudrate to be used during bootloader operations
    payload[4] = manualPower ? 1 : 0; // 1: manual power cycling
    payload[5] = broadcast ? 1 : 0; // 1: bootloading shall be done in broadcast mode
    payload[6] = memType; // memory type to perform action on (0: NVRAM; 1: flash; 2=flash_cs)
    payload[7] = operation.toLowerCase() === 'program' ? OPP_PROGRAM : OPP_VERIFY; // action type to perform (0: program; 1: verify)

    try {
      this.transport.mode = MasterMode.BOOTLOADER;

      // enable ppm btl command mode
      await this.transport.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_PPM, 1);

      // do bootloading action
      await this.transport.sendBulkMlxMessageAndWaitResponse(
        mcmMlxMessageId.PPM_DO_BTL_ACTION,
        payload,
        10000
      );
    } finally {
      // disable ppm btl command mode
      await this.transport.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_PPM, 0);
      this.transport.mode = MasterMode.NONE;
    }
  }

  async setup () {
    try {
      this.transport.mode = MasterMode.LIN;
      await this.transport.vendorControlTransferOut(mcmVendorRequest.LIN_COMM, 1);
    } catch (error) {
      console.log(error);
      this.transport.mode = MasterMode.ERROR;
    }
  }

  async teardown () {
    return this.disableLinMode();
  }

  lIfcWakeUp () {
    return this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmLinCommand.SEND_WAKEUP,
      convertUint16ToUint8Array(200),
      1000
    );
  }

  lM2s (baudrate, enhancedCrc, frameId, payload) {
    const messLength = 6 + payload.length;
    const message = new Uint8Array(messLength);
    message.set(convertUint16ToUint8Array(baudrate), 0);
    message[2] = payload.length;
    message[3] = 1;
    message[4] = enhancedCrc ? 1 : 0;
    message[5] = frameId;
    message.set(payload, 6);
    return this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmLinCommand.HANDLE_MESSAGE,
      message,
      1000
    );
  }

  lS2m (baudrate, enhancedCrc, frameId, datalength) {
    const message = new Uint8Array(6);
    message.set(convertUint16ToUint8Array(baudrate), 0);
    message[2] = datalength;
    message[3] = 0;
    message[4] = enhancedCrc ? 1 : 0;
    message[5] = frameId;
    return this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmLinCommand.HANDLE_MESSAGE,
      message,
      1000
    );
  }

  ldDiagnostic (nad, baudrate, sid, payload) {
    throw new Error('method not yet implemented in MCM');
  }

  ldSendMessage (nad, baudrate, sid, payload) {
    throw new Error('method not yet implemented in MCM');
  }

  ldReceiveMessage (nad, baudrate, sid) {
    throw new Error('method not yet implemented in MCM');
  }
}
