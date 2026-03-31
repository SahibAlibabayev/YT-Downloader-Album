/**
 * preload.js — Renderer (React) ile Main process arasında güvenli köprü.
 * contextBridge.exposeInMainWorld ile API'ları render tarafına açar.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Electron ortamında mı?
  isElectron: true,

  // Downloads klasörünü Dosya Gezgini'nde aç
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  changeDownloadPath: () => ipcRenderer.invoke('change-download-path'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Ayarlar
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),

  // Uygulama versiyonu (About ekranı için)
  getVersion: () => ipcRenderer.invoke('get-version'),
});
