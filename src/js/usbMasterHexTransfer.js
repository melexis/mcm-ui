import { mcmVendorRequest, MasterMode } from '../js/usbMaster';

export async function hexfileTransfer (master, hexfile) {
  const decoder = new TextDecoder();

  const waitForDone = async () => {
    let buffer = '';
    while (true) {
      const chunk = await master.vendorTransferIn();
      buffer += decoder.decode(chunk);
      const idx = buffer.indexOf('\n');
      if (idx >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.includes('OK')) {
          return;
        } else if (line.startsWith('FAIL:')) {
          throw new Error(line.slice(line.indexOf('FAIL: ') + 6));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  try {
    master.mode = MasterMode.HEXTRANSFER;

    // enable bootloader transfer hex mode
    await master.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_DO_TRANSFER, 1);

    // send hexfile
    await master.vendorTransferOut(hexfile);

    // disable bootloader transfer hex mode
    await master.vendorControlTransferOut(mcmVendorRequest.BOOTLOADER_DO_TRANSFER, 0);

    // wait for processing done
    await waitForDone();
  } finally {
    master.mode = MasterMode.NONE;
  }
}
