// Modules to control application life and create native browser window
const {app, BrowserWindow, screen, ipcMain, protocol } = require('electron')
const os = require('os')
const Path = require('path')
const debug = require('debug')('gpgshare')
const Gpgfs = require('gpgfs')
const GPG = Gpgfs.GPG
const url = require('url')
const path = require('path')
const EventEmitter = require('events')
const Dataparty = require('@dataparty/api/src/index')


const GuiSchema = require('./dataparty/gpgshare.dataparty-schema.json')



class ElectronChannel extends EventEmitter {
  constructor(window){
    super()
    this.window = window
  }

  on(type, fn){
    ipcMain.on(type, (event,...args)=>{
      fn(args)
    })
  }

  post(type, msg){
    this.window.webContents.send(type, msg)
  }
}

class AppGui {
  constructor(){
    this.ramConfig = new Dataparty.Config.MemoryConfig()
    this.channel = null
    this.guiComms = null
    this.hostLocal = null
    this.guiPeer = null

    this.window = null

    this.keychainPath = os.homedir()+'/.gnupg'
    debug('keychain', this.keychainPath)
    this.keychain = new GPG.KeyChain(this.keychainPath)
  }

  async start(){
    console.log('start')
  
    await Promise.all([
      this.keychain.open(),
      app.whenReady()
    ])

    this.window = new BrowserWindow({
      frame: true,
      width: 600,
      height: 400,
      webPreferences:{
        nodeIntegration: true,
        contextIsolation: false
      }
    })
  
    
    this.window.setMenu(null)
    this.window.loadFile(path.join(__dirname, 'app/index.html'))
  
  
  
    const {x, y} = screen.getCursorScreenPoint();
    // Find the display where the mouse cursor will be
    const currentDisplay = screen.getDisplayNearestPoint({ x, y });
    // Set window position to that display coordinates
    this.window.setPosition(currentDisplay. workArea.x, currentDisplay. workArea.y);
    // Center window relatively to that display
    this.window.center();
    // Display the window
    this.window.show();
  
  
    // Open the DevTools.
    this.window.webContents.openDevTools()

    ipcMain.once('gui-identity', async (event, id)=>{
      console.log('on gui identity', id)
      await this.onGuiReady(id)
    })
    
    debug('publics ultimate', await this.keychain.listPublicKeys(true))
  
    debug('whoami', await this.keychain.whoami())

    protocol.registerBufferProtocol('gpgfs', (request, callback) => {
      debug('protocol request', request.url, JSON.stringify( url.parse(request.url), null, 2 ))
      callback({ mimeType: 'text/html', data: Buffer.from('<h5>Response</h5>') })
    }, (error) => {
      if (error) console.error('Failed to register protocol')
    })
  }

  async onGuiReady(identity){

    this.channel = new ElectronChannel(this.window)

    this.guiComms = new Dataparty.Comms.LoopbackComms({
      host: true,
      channel: this.channel,
      //remoteIdentity: identity
    })

    

    this.hostLocal = new Dataparty.LokiParty({
      path: './gpgfs-gui.db',
      model: GuiSchema,
      config: this.ramConfig,
      //dbAdapter: Dataparty.Bouncer.LokiDb.LokiLocalStorageAdapter
    })

    await this.ramConfig.start()

    this.guiPeer = new Dataparty.PeerParty({
      comms: this.guiComms,
      hostParty: this.hostLocal,
      model: GuiSchema,
      config: this.ramConfig
    })
  
    await this.guiPeer.loadIdentity()

    this.window.webContents.send('main-identity', this.guiPeer.identity)
  
    console.log('main identity', this.guiPeer.identity)

    this.guiPeer.start()

    console.log('waiting for auth')
    await Promise.all([
      this.guiComms.authorized()
    ])
    
    console.log('authed')
  
  }
}






async function main(){

  let gui = new AppGui()

  await gui.start()


  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    debug('on window-all-closed')
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', function () {
    debug('on active')
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    //if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })


}

// Run main
main().catch((error) => {
  console.log(error)
  console.error(error.message)
  process.exit()
})
