import { ipcMain, dialog, globalShortcut, BrowserWindow, session } from 'electron'
import path from 'path'

class MainWindow {
  constructor () {
    this._window = null
    this._debug = process.env.NODE_ENV === 'development'
  }

  create () {
    const ses = session.fromPartition('persist:MainWindow')

    this._window = new BrowserWindow({
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
      titleBarStyle: 'hidden',
      title: 'GameBox'
      // frame: false
    })
    this._window.removeMenu()

    const winURL = this._debug
      ? 'http://localhost:9080'
      : `file://${__dirname}/index.html`

    this._window.loadURL(winURL)

    // Open the DevTools for devs.
    if (this._debug) {
      this._window.webContents.openDevTools()
    }

    this.attachHotkeys()
    this.attachMessenger()
  }

  attachHotkeys () {
    globalShortcut.register('CommandOrControl+Shift+K', () => {
      if (this._window && this._window.webContents) {
        this._window.webContents.openDevTools()
      }
    })
  }

  attachMessenger () {
    ipcMain.removeAllListeners('async-renderer-message')

    ipcMain.on('async-renderer-message', (event, message) => {
      try {
        const json = JSON.parse(message)
        const { data, type } = json
        switch (type) {
          case 'CONFIG_REQUEST':
            this.loadConfig()
            break
          case 'PLUGIN_ADD':
            this.addPlugin()
            break
          default:
            if (this._debug) {
              console.log('message from renderer', type, data)
            }
            this.sendToRenderer('unhandled', json)
            break
        }
      } catch (e) {
        console.error(e)
      }
    })
  }

  sendToRenderer (type, data) {
    if (this._window) {
      this._window.send('async-main-message', JSON.stringify({
        sender: 'main',
        type,
        data
      }))
    }
  }

  loadConfig () {
    const defaultConfig = {
      a: 5,
      b: 10
    }
    const loadedConfig = {
      a: 10,
      c: 15
    }

    this.sendToRenderer('CONFIG_LOADED', Object.assign({}, defaultConfig, loadedConfig))
  }

  addPlugin () {
    console.log(dialog.showOpenDialogSync(this._window, {
      title: 'Select plugin folder',
      properties: ['openDirectory']
    }))
  }
}

export default MainWindow
