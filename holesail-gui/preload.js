const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  start: (data) => ipcRenderer.invoke('start-holesail', data),
  stop: (tabId) => ipcRenderer.invoke('stop-holesail', tabId),
  clipboard: (text) => navigator.clipboard.writeText(text)
});