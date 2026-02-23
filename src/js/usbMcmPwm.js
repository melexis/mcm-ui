import { McmGeneric } from './usbMcmGeneric';
import { convertUint32ToUint8Array, MasterMode, mcmVendorRequest, uint8ArrayToUint32 } from './usbTransport';

/** Vendor-specific request codes used for control transfers. */
export const mcmVendorRequestPwm = {
  DISABLE: 0x00,
  ENABLE: 0x01,
  DUTY_CYCLE: 0x02,
  FREQUENCY: 0x03,
  PERIOD: 0x04,
};

export class McmPwm extends McmGeneric {
  setup (bitrate) {
    this.transport.mode = MasterMode.PWM;
    return this.transport.vendorControlTransferOut(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.ENABLE);
  }

  async teardown () {
    await this.transport.vendorControlTransferOut(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.DISABLE);
    this.transport.mode = MasterMode.NONE;
  }

  setPwmDutyCycle (value) {
    return this.transport.vendorControlTransferOut(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.DUTY_CYCLE, convertUint32ToUint8Array(value));
  }

  async getPwmDutyCycle () {
    const result = await this.transport.vendorControlTransferIn(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.DUTY_CYCLE, 4);
    return uint8ArrayToUint32(result);
  }

  setPwmFrequency (value) {
    return this.transport.vendorControlTransferOut(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.FREQUENCY, convertUint32ToUint8Array(value));
  }

  async getPwmFrequency () {
    const result = await this.transport.vendorControlTransferIn(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.FREQUENCY, 4);
    return uint8ArrayToUint32(result);
  }

  async getFgPeriod () {
    const result = await this.transport.vendorControlTransferIn(mcmVendorRequest.PWM_COMM, mcmVendorRequestPwm.PERIOD, 4);
    return uint8ArrayToUint32(result);
  }
}
