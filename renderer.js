// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const { ipcRenderer } = require('electron')
const SimplePeer = require("simple-peer");


const peer = new SimplePeer({
  initiator: false,
  trickle: false
})



peer.on('close', ()=>{
  console.log('closed')
})

peer.on('connect', ()=>{
  console.log('connected')
})


peer.on('error', err=>{
  console.error('peer-error', err)
})

peer.on('signal', data=>{
  //sned to parent
  ipcRenderer.send('peer-client-signal', data)
  console.log('tx-signal',data)
})

peer.on('data', data=>{
  console.log('data',data.toString())
})

ipcRenderer.on('peer-client-signal', (event, data)=>{
  console.log('rx-signal', data)
  peer.signal(data)
})



ipcRenderer.send('peer-available')