// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.


const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronChannel', {
  on: (channel, listener)=>{ return ipcRenderer.on(channel, listener)  },
  postMessage: (channel, message)=>{ return ipcRenderer.postMessage(channel, message)  }
})