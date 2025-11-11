import { convertUint32ToUint8Array, MasterMode, mcmMlxMessageId, mcmVendorRequest } from '../js/usbMaster';

const MCM_CONFIG_HOSTNAME = 0x00;
const MCM_CONFIG_WIFI_SSID = 0x01;
const MCM_CONFIG_WIFI_PASS = 0x02;
const MCM_CONFIG_WIFI_MAC = 0x03;
const MCM_CONFIG_WIFI_IP_INFO = 0x04;

const MEMORY_FLASH = 1;
const MEMORY_NVRAM = 0;

const OPP_PROGRAM = 0;
const OPP_VERIFY = 1;

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

function uint32ToIpString (u32) {
  return [
    u32 & 0xFF,
    (u32 >> 8) & 0xFF,
    (u32 >> 16) & 0xFF,
    (u32 >> 24) & 0xFF
  ].join('.');
}

export class McmLin {
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

  async disableLinMode () {
    await this.master.vendorControlTransferOut(mcmVendorRequest.LIN_COMM, 0);
    this.master.mode = MasterMode.NONE;
  }

  async bootload (hexfile, operation, memory, manualPower, bitRate, broadcast) {
    if (this.master.mode !== MasterMode.NONE) {
      await this.disableLinMode();
    }

    // transfer hex file
    await this.master.doHexfileTransfer(hexfile);

    const payload = new Uint8Array(8);
    payload.set(convertUint32ToUint8Array(bitRate), 0); // baudrate to be used during bootloader operations
    payload[4] = manualPower ? 1 : 0; // 1: manual power cycling
    payload[5] = broadcast ? 1 : 0; // 1: bootloading shall be done in broadcast mode
    payload[6] = memory.toLowerCase() === 'flash' ? MEMORY_FLASH : MEMORY_NVRAM; // memory type to perform action on (0: NVRAM; 1: flash)
    payload[7] = operation.toLowerCase() === 'program' ? OPP_PROGRAM : OPP_VERIFY; // action type to perform (0: program; 1: verify)

    try {
      this.master.mode = MasterMode.BOOTLOADER;

      // enable ppm btl command mode
      await this.master.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_PPM, 1);

      // do bootloading action
      await this.master.sendBulkMlxMessageAndWaitResponse(
        mcmMlxMessageId.PPM_DO_BTL_ACTION,
        payload,
        10000
      );
    } finally {
      // disable ppm btl command mode
      await this.master.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_PPM, 0);
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
