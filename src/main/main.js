// Modules to control application life and create native browser window
import MainWindow from './MainWindow'
import { app, BrowserWindow } from 'electron'
const mainWindow = new MainWindow()

app.allowRendererProcessReuse = true

app.on('ready', () => {
  mainWindow.create()
})

app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) mainWindow.create()
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
