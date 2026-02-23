import { mcmVendorRequest } from './usbTransport';

const MCM_CONFIG_HOSTNAME = 0x00;
const MCM_CONFIG_WIFI_SSID = 0x01;
const MCM_CONFIG_WIFI_PASS = 0x02;
const MCM_CONFIG_WIFI_MAC = 0x03;
const MCM_CONFIG_WIFI_IP_INFO = 0x04;

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

export class McmGeneric {
  constructor (transport) {
    this.transport = transport;
  }

  /** Disable power to slave devices.
   *
   * @returns {Promise<any>}
   */
  disableSlavePower () {
    return this.transport.vendorControlTransferOut(mcmVendorRequest.SLAVE_CTRL, 0);
  }

  /** Enable power to slave devices.
   *
   * @returns {Promise<any>}
   */
  enableSlavePower () {
    return this.transport.vendorControlTransferOut(mcmVendorRequest.SLAVE_CTRL, 1);
  }

  /** Check if slave power is enabled.
   *
   * @returns {Promise<boolean>}
   */
  async isSlavePowerEnabled () {
    const response = await this.transport.vendorControlTransferIn(mcmVendorRequest.SLAVE_CTRL, 0, 255);
    return response[0] === 1;
  }

  setConfig (index, string) {
    const payload = convertStringToBytes(string);
    return this.transport.vendorControlTransferOut(mcmVendorRequest.CONFIG, index, payload);
  }

  async getConfig (index) {
    const response = await this.transport.vendorControlTransferIn(mcmVendorRequest.CONFIG, index, 255);
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
    const response = await this.transport.vendorControlTransferIn(mcmVendorRequest.CONFIG, MCM_CONFIG_WIFI_MAC, 255);
    let retval = '';
    for (let i = 0; i < 6; i++) {
      retval += `${response[i].toString(16).padStart(2, '0')}:`;
    }
    return retval.slice(0, -1);
  }

  async getIpInfo () {
    const response = await this.transport.vendorControlTransferIn(mcmVendorRequest.CONFIG, MCM_CONFIG_WIFI_IP_INFO, 255);
    const info = {};
    if (response.length >= 12) {
      info.link_up = true;
      const u32Resp = new Uint32Array(response.buffer, response.byteOffset, 3);
      info.ip = uint32ToIpString(u32Resp[0]);
      info.netmask = uint32ToIpString(u32Resp[1]);
      info.gateway = uint32ToIpString(u32Resp[2]);
    } else {
      info.link_up = false;
    }
    return info;
  }
}
