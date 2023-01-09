// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


//const electron = require('electron')
const EventEmitter = require('eventemitter3')



console.log(window.electronChannel)

const GuiSchema = require('../dataparty/gpgshare.dataparty-schema.json')

console.log(GuiSchema)

class ElectronChannel extends EventEmitter {
  constructor(channel){
    super()
    this.channel = channel
  }

  on(type, fn){
    this.channel.on(type, (event,args)=>{
      fn(args)
    })
  }

  post(type, msg){
    this.channel.postMessage(type, msg)
  }
}

class Gui {
  constructor(){
    this.channel = new ElectronChannel(window.electronChannel)
    this.comms = new Dataparty.Comms.LoopbackComms({
      channel: this.channel
    })
  
    this.config = new Dataparty.Config.MemoryConfig()
    this. peer = null

    window.onload = async ()=>{ this.onload() }

    this.channel.on('main-identity', this.onMainIdentity.bind(this))
  }

  async onload(){
    console.log('on load')

    await this.config.start()
  
    this.peer = new Dataparty.PeerParty({
      comms: this.comms,
      model: GuiSchema,
      config: this.config
    })
  
    await this.peer.loadIdentity()
  
    this.channel.post('gui-identity', this.peer.identity)
  }

  async onMainIdentity(id){
    console.log('got main id', id)
    this.comms.remoteIdentity = id

    await this.peer.start()


    console.log('waiting for auth')
    await this.comms.authorized()
    
    console.log('authed')
  }
}


window.gui = new Gui()