import { ipcMain, dialog, globalShortcut, BrowserWindow, session } from 'electron'
import path from 'path'
import fs from 'fs'

const configPath = path.resolve('./', 'config.json')

class MainWindow {
  constructor () {
    this._window = null
    this._debug = process.env.NODE_ENV === 'development'
    this._config = {
      plugins: []
    }
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
    let loadedConfig = {}
    try {
      loadedConfig = JSON.parse(fs.readFileSync(configPath, { encoding: 'UTF8' }))
    } catch (e) {
    }
    this._config = Object.assign({}, this._config, loadedConfig)
    this.sendConfigToRenderer()
  }

  saveConfig () {
    return fs.writeFileSync(configPath, JSON.stringify(this._config), { encoding: 'UTF8' })
  }

  sendConfigToRenderer () {
    this.sendToRenderer('CONFIG_LOADED', this._config)
  }

  addPlugin () {
    const paths = dialog.showOpenDialogSync(this._window, {
      title: 'Select plugin folder',
      properties: ['openDirectory']
    })

    // if select directory canceled
    if (typeof paths === 'undefined') {
      return
    }

    const pluginPath = paths[0]

    // if current app directory was selected
    if (path.resolve('./') === pluginPath) {
      return
    }

    // if that plugin already loaded
    if (this._config.plugins.filter((p) => p.path === pluginPath).length > 0) {
      return
    }

    // if there is no plugin config in that folder
    const pluginConfigPath = path.resolve(pluginPath, '/', 'plugin.json')
    if (!fs.existsSync(pluginConfigPath)) {
      return
    }

    try {
      let pluginConfig = JSON.parse(fs.readFileSync(pluginConfigPath))
      pluginConfig = Object.assign({}, pluginConfig, { path: pluginPath })
      this._config.plugins.push(pluginConfig)
      this.saveConfig()
      this.sendConfigToRenderer()
    } catch (e) {
    }
  }
}

export default MainWindow
