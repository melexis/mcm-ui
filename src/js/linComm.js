export function lIfcWakeUp (master) {
  return new Promise(function (resolve, reject) {
    master.sendTask(
      {
        protocol: 'lin',
        function: 'l_ifc_wake_up',
        args: { pulse_time: 200 }
      },
      resolve,
      reject
    );
  });
}

export function lM2s (master, baudrate, enhancedCrc, frameid, payload) {
  return new Promise(function (resolve, reject) {
    master.sendTask(
      {
        protocol: 'lin',
        function: 'handle_message_on_bus',
        args: {
          datalength: payload.length,
          m2s: true,
          baudrate,
          enhanced_crc: enhancedCrc,
          frameid,
          payload
        }
      },
      resolve,
      reject
    );
  });
}

export function lS2m (master, baudrate, enhancedCrc, frameid, datalength) {
  return new Promise(function (resolve, reject) {
    master.sendTask(
      {
        protocol: 'lin',
        function: 'handle_message_on_bus',
        args: {
          datalength,
          m2s: false,
          baudrate,
          enhanced_crc: enhancedCrc,
          frameid
        }
      },
      resolve,
      reject
    );
  });
}

export function ldDiagnostic (master, nad, baudrate, sid, payload) {
  return new Promise(function (resolve, reject) {
    payload.splice(0, 0, sid);
    const diagData = {
      protocol: 'lin',
      function: 'ld_diagnostic',
      args: {
        nad,
        baudrate,
        payload
      }
    };
    master.sendTask(
      diagData,
      function (data) {
        if (data[0] === 0x7F) {
          // slave reported an error
          reject(new Error(`Error 0x${data[2].toString(16)} was reported by ` +
                           `the device for SID 0x${data[1].toString(16)}`));
        } else if (data[0] !== ((sid + 0x40) & 0xFF)) {
          reject(new Error(`An incorrect RSID was received (0x${data[0].toString(16)})`));
        } else {
          resolve(data.slice(1));
        }
      },
      reject
    );
  });
}

export function ldSendMessage (master, nad, baudrate, sid, payload) {
  return new Promise(function (resolve, reject) {
    payload.splice(0, 0, sid);
    const diagData = {
      protocol: 'lin',
      function: 'ld_send_message',
      args: {
        nad,
        baudrate,
        payload
      }
    };
    master.sendTask(
      diagData,
      resolve,
      reject
    );
  });
}

export function ldReceiveMessage (master, nad, baudrate, sid) {
  return new Promise(function (resolve, reject) {
    const diagData = {
      protocol: 'lin',
      function: 'ld_receive_message',
      args: {
        nad,
        baudrate
      }
    };
    master.sendTask(
      diagData,
      function (data) {
        if (data[0] === 0x7F) {
          // slave reported an error
          reject(new Error(`Error 0x${data[2].toString(16)} was reported by ` +
                           `the device for SID 0x${data[1].toString(16)}`));
        } else if (data[0] !== ((sid + 0x40) & 0xFF)) {
          reject(new Error(`An incorrect RSID was received (0x${data[0].toString(16)})`));
        } else {
          resolve(data.slice(1));
        }
      },
      reject
    );
  });
}

export function readById (master, nad, baudrate, identifier) {
  return ldDiagnostic(master, nad, baudrate, 0xB2, [identifier, 0xFF, 0x7F, 0xFF, 0xFF]);
}
