// Modules to control application life and create native browser window
const { app, BrowserWindow, session } = require('electron')
const path = require('path')

function createWindow () {
  const ses = session.fromPartition('persist:name')

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.resolve(__dirname, '..', 'preload', 'preload.js'),
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      contextIsolation: true,
      enableRemoteModule: true,
      session: ses
    },
    frame: false
  })

  const winURL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:9080'
    : `file://${__dirname}/index.html`

  mainWindow.loadURL(winURL)

  // Open the DevTools for devs.
  if (process.env.NODE_ENV === 'development') {
    require('vue-devtools').install()
    mainWindow.webContents.openDevTools()
  }
}

app.allowRendererProcessReuse = true

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// TODO whitelist urls based on plugins
// prevent going outside of box
// const URL = require('url').URL
// app.on('web-contents-created', (event, contents) => {
//   contents.on('will-navigate', (event, navigationUrl) => {
//     const parsedUrl = new URL(navigationUrl)
//
//     if (parsedUrl.hostname !== 'github.com') {
//       event.preventDefault()
//     }
//   })
// })
