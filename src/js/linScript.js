export const frameTypeWakeUp = 0;
export const frameTypeS2M = 1;
export const frameTypeM2S = 2;

export const LinScript = function () {
  const vars = {
    baudrate: 19200,
    schedulename: '',
    script: [],
    events: {
      opened: null,
      error: null
    }
  };

  /* eslint-disable-next-line no-unused-vars */
  const root = this;

  this.on = function (eventName, eventHandler) {
    vars.events[eventName] = eventHandler;
  };

  this.loadFile = function (filename) {
    if (filename != null && typeof (filename) !== 'undefined') {
      const reader = new window.FileReader();
      reader.onload = function (event) {
        parseLinScript(event.target.result);
        if (typeof (vars.events.opened) === 'function') {
          vars.events.opened();
        }
      };
      reader.onerror = function (event) {
        if (typeof (vars.events.error) === 'function') {
          vars.events.error(event.target.error.message);
        }
      };
      reader.readAsText(filename);
    } else {
      if (typeof (vars.events.error) === 'function') {
        vars.events.error('No file selected');
      }
    }
  };

  this.getBaudrate = function () {
    return vars.baudrate;
  };

  this.getSchedulename = function () {
    return vars.schedulename;
  };

  this.getScriptLength = function () {
    return vars.script.length;
  };

  this.getScriptEntry = function (number) {
    return vars.script[number];
  };

  function parseLinScript (filecontent) {
    let result = false;
    filecontent.split('\n').forEach(function (content) {
      content = content.trim();
      if (content && !content.startsWith('*')) {
        if (content.toLowerCase() === 'end') {
          result = true;
          return false;
        } else if (content.indexOf('=') > -1) {
          parseSetting(content);
        } else {
          parseScript(content);
        }
      }
    });
    return result;
  }

  function parseSetting (settingstring) {
    const setting = settingstring.split('=');
    if (setting[0].trim().toLowerCase() === 'linbaudrate') {
      vars.baudrate = parseInt(setting[1]);
    } else if (setting[0].trim().toLowerCase() === 'schedulename') {
      vars.schedulename = setting[1].trim();
    }
  }

  function parseScript (scriptstring) {
    const script = scriptstring.split(':');
    const frameConfigs = script[1].split(';');
    const frames = [];
    for (let i = 0; i < frameConfigs.length; i++) {
      const frameConfig = frameConfigs[i].split(',');
      switch (frameConfig[0].trim().toLowerCase()) {
        case 'wku':
          frames.push({
            type: frameTypeWakeUp
          });
          break;
        case 's2m':
          frames.push({
            type: frameTypeS2M,
            frameId: parseValueToInt(frameConfig[1]),
            enhancedCrc: (frameConfig[3].trim().toLowerCase() === 'ck20'),
            datalength: parseValueToInt(frameConfig[2])
          });
          break;
        case 'm2s':
        {
          const payload = [];
          for (let y = 2; y < frameConfig.length - 1; y++) {
            payload.push(parseValueToInt(frameConfig[y]));
          }
          frames.push({
            type: frameTypeM2S,
            frameId: parseValueToInt(frameConfig[1]),
            enhancedCrc: (frameConfig[frameConfig.length - 1].trim().toLowerCase() === 'ck20'),
            payload
          });
          break;
        }
      }
    }
    vars.script.push({
      name: script[0].trim(),
      frames
    });
  }

  function parseValueToInt (text) {
    let value = 0;
    text = text.trim().toLowerCase();
    if (text.startsWith('$')) {
      value = parseInt(text.replace('$', ''), 16);
    } else if (text.startsWith('0x')) {
      value = parseInt(text.replace('0x', ''), 16);
    } else {
      value = parseInt(text);
    }
    return value;
  }
};
