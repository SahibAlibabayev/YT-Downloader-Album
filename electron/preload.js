/**
 * preload.js — Secure bridge between the Renderer (React) and the Main process.
 * Exposes safe APIs to the renderer via contextBridge.exposeInMainWorld.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Flag so the frontend can detect it is running inside Electron
  isElectron: true,

  // Open the downloads folder in the system file explorer
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  changeDownloadPath: () => ipcRenderer.invoke('change-download-path'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),

  // Application version (used by the About screen)
  getVersion: () => ipcRenderer.invoke('get-version'),
});
