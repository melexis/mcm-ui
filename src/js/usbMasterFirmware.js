import { mcmVendorRequest, MasterMode } from '../js/usbMaster';

export async function upgradeFirmware (master, fileContent, onProgress) {
  const total = fileContent.byteLength;
  const chunkSize = 5120;
  const decoder = new TextDecoder();

  const waitForLine = async () => {
    let buffer = '';
    while (true) {
      const chunk = await master.vendorTransferIn();
      buffer += decoder.decode(chunk);
      const idx = buffer.indexOf('\n');
      if (idx >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        return line.trim();
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  try {
    master.mode = MasterMode.UPGRADE;

    // start partition data transfer
    await master.vendorControlTransferOut(mcmVendorRequest.OTA_DO_TRANSFER, 1);

    // do bin file transfer
    while (fileContent.byteLength > 0) {
      const chunk = fileContent.slice(0, chunkSize);
      fileContent = fileContent.slice(chunkSize);
      await master.vendorTransferOut(chunk);
      onProgress?.(total - fileContent.byteLength, total);

      const line = await waitForLine();
      if (line.startsWith('FAIL')) {
        throw new Error('Device reported failure');
      }
    }

    // finish transfer mode and initiate partition validation
    await master.vendorControlTransferOut(mcmVendorRequest.OTA_DO_TRANSFER, 0);

    // wait for validation result
    while (true) {
      const line = await waitForLine();
      if (line.startsWith('FAIL')) {
        throw new Error('MCM reported a failure');
      }
      if (line.includes('VALID')) {
        break;
      }
    }

    // update boot partition
    await master.vendorControlTransferOut(mcmVendorRequest.OTA_UPDATE_BOOT_PARTITION, 0);

    // finalize by restarting the mcm
    await master.restart();
  } finally {
    master.mode = MasterMode.NONE;
  }
}
