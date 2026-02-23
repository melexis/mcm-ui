import { McmGeneric } from './usbMcmGeneric';
import { concatUint8Arrays, convertUint16ToUint8Array, convertUint32ToUint8Array, MasterMode, mcmVendorRequest } from './usbTransport';

const mcmI2cCommand = {
  PROBE: 0x2302,
  WRITE: 0x2303,
  WRITE_READ: 0x2304,
  READ: 0x2305,
};

export class McmI2c extends McmGeneric {
  setup (bitrate) {
    this.transport.mode = MasterMode.I2C;
    return this.transport.vendorControlTransferOut(mcmVendorRequest.I2C_COMM, 1, convertUint32ToUint8Array(bitrate));
  }

  async teardown () {
    await this.transport.vendorControlTransferOut(mcmVendorRequest.I2C_COMM, 0);
    this.transport.mode = MasterMode.NONE;
  }

  async probeAddress (address) {
    const result = await this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmI2cCommand.PROBE,
      new Uint8Array([address]),
      100
    );
    return result[0] === 1;
  }

  write (address, data, timeout) {
    const payload = new Uint8Array(8);
    payload.set(convertUint16ToUint8Array(address), 0);
    payload.set(convertUint32ToUint8Array(timeout), 2);
    payload.set(convertUint16ToUint8Array(data.byteLength), 6);
    return this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmI2cCommand.WRITE,
      concatUint8Arrays(payload, data),
      timeout + 100
    );
  }

  writeRead (address, writeData, readLength, timeout) {
    const payload = new Uint8Array(10);
    payload.set(convertUint16ToUint8Array(address), 0);
    payload.set(convertUint32ToUint8Array(timeout), 2);
    payload.set(convertUint16ToUint8Array(writeData.byteLength), 6);
    payload.set(convertUint16ToUint8Array(readLength), 8);
    return this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmI2cCommand.WRITE_READ,
      concatUint8Arrays(payload, writeData),
      timeout + 100
    );
  }

  read (address, length, timeout) {
    const payload = new Uint8Array(8);
    payload.set(convertUint16ToUint8Array(address), 0);
    payload.set(convertUint32ToUint8Array(timeout), 2);
    payload.set(convertUint16ToUint8Array(length), 6);
    return this.transport.sendBulkMlxMessageAndWaitResponse(
      mcmI2cCommand.READ,
      payload,
      timeout + 100
    );
  }
}
