/* eslint-disable semi */

export function getFileContent (file) {
  return new Promise(function (resolve, reject) {
    const fileReader = new FileReader(); /* eslint-disable-line no-undef */
    fileReader.addEventListener('load', () => {
      resolve(fileReader.result);
    });
    fileReader.addEventListener('error', () => {
      reject(new Error(`Failed reading file '${file.name}' with '${fileReader.error}'`));
    });
    fileReader.readAsArrayBuffer(file);
  });
}
