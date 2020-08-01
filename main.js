// Modules to control application life and create native browser window
const {app, BrowserWindow, screen, ipcMain, protocol } = require('electron')
const os = require('os')
const Path = require('path')
const debug = require('debug')('gpgshare')
const Gpgfs = require('gpgfs')
const GPG = Gpgfs.GPG
const url = require('url')
const WRTC = require('wrtc')
const SimplePeer = require('simple-peer')

function createWindow () {
  // Create the browser window.
  debug('create window')
  let mainWindow = new BrowserWindow({
    frame: true,
    width: 600,
    height: 400,
    webPreferences:{
      nodeIntegration: true
    }
  })

  

  
  //mainWindow.setMenu(null)
  mainWindow.loadFile('index.html')


  // and load the index.html of the app.
  

  //mainWindow.show()

  
  //mainWindow.focus(); // focus the window up front on the active screen
  //mainWindow.setVisibleOnAllWorkspaces(false); // disable all screen behavior
  //mainWindow.setVisibleOnAllWorkspaces(true); // put the window on all screens

  const {x, y} = screen.getCursorScreenPoint();
  // Find the display where the mouse cursor will be
  const currentDisplay = screen.getDisplayNearestPoint({ x, y });
  // Set window position to that display coordinates
  mainWindow.setPosition(currentDisplay. workArea.x, currentDisplay. workArea.y);
  // Center window relatively to that display
  mainWindow.center();
  // Display the window
  mainWindow.show();


  // Open the DevTools.
   mainWindow.webContents.openDevTools()

  return mainWindow
}


async function main(){
  const keychainPath = os.homedir()+'/.gnupg'
  debug('keychain', keychainPath)
  const keychain = new GPG.KeyChain(keychainPath)

  await Promise.all([
    keychain.open(),
    app.whenReady()
  ])

  debug('creating window')

  let mainWindow = createWindow()
  
  debug('publics ultimate', await keychain.listPublicKeys(true))

  debug('whoami', await keychain.whoami())

  protocol.registerBufferProtocol('gpgfs', (request, callback) => {
    debug('protocol request', request.url, JSON.stringify( url.parse(request.url), null, 2 ))
    callback({ mimeType: 'text/html', data: Buffer.from('<h5>Response</h5>') })
  }, (error) => {
    if (error) console.error('Failed to register protocol')
  })

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
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.on('peer-available', (event, data) => {
    debug('peer-available', event)


    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      wrtc: WRTC
    })
    
    
    peer.on('error', err=>{
      debug('peer-error', err)
    })
    
    peer.on('signal', data=>{
      //sned to parent
      mainWindow.webContents.send('peer-client-signal', data)
      debug('tx-signal',data)
    })
    
    peer.on('data', data=>{
      debug('data',data)
    })

    peer.on('connect', () => {
      debug('connected, sending hello')
      peer.send('hey peer2, how is it going?')
    })

    ipcMain.on('peer-client-signal', (event, data) => {
      debug('rx-signal', data)
      peer.signal(data)
    })
  })


}

// Run main
main().catch((error) => {
  console.log(error)
  console.error(error.message)
  process.exit()
})
