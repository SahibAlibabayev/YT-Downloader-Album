/**
 * settings.js — persistent settings management via electron-store
 * Settings are saved to: %AppData%/YTDownloader/config.json
 */
const { app } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  name: 'config',
  defaults: {
    language:       'en',
    defaultFormat:  'mp3',
    defaultQuality: '320kbps',
    theme:          'dark',
    downloadPath:   null,
  },
});

module.exports = {
  getSettings: () => store.store,
  saveSettings: (data) => {
    const allowed = ['language', 'defaultFormat', 'defaultQuality', 'theme', 'downloadPath'];
    for (const key of allowed) {
      if (data[key] !== undefined) store.set(key, data[key]);
    }
    return store.store;
  },
  get: (key) => store.get(key),
  set: (key, val) => store.set(key, val),
};
