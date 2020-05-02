import { ipcMain, dialog, globalShortcut, BrowserWindow, BrowserView, session } from 'electron'
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

    this._gameView = null
    this._currentPlugin = null
  }

  create () {
    this.attachHotkeys()
    this.attachMessenger()
    this.loadConfig()
    this.openStartWindow()
  }

  openStartWindow () {
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
    // if (this._debug) {
    //   this._window.webContents.openDevTools()
    // }
  }

  attachHotkeys () {
    globalShortcut.register('CommandOrControl+Shift+F12', () => {
      if (this._gameView !== null) {
        this._gameView.webContents.openDevTools()
      } else if (this._window && this._window.webContents) {
        this._window.webContents.openDevTools()
      }
    })

    globalShortcut.register('CommandOrControl+Shift+K', () => {
      if (this._gameView !== null) {
        this._gameView.destroy()
        this._gameView = null
        this._currentPlugin = null
      }
    })
  }

  attachMessenger () {
    ipcMain.removeAllListeners('async-renderer-message')

    ipcMain.on('async-renderer-message', (event, message) => {
      try {
        const json = JSON.parse(message)
        const { data, type } = json
        this.parseMessageFromRenderer(type, data)
      } catch (e) {
        console.error(e)
      }
    })

    ipcMain.on('sync-renderer-message', (event, message) => {
      try {
        const json = JSON.parse(message)
        const { data, type } = json
        event.returnValue = this.parseSyncMessageFromRenderer(type, data)
      } catch (e) {
        console.error(e)
      }
    })
  }

  parseMessageFromRenderer (type, data) {
    switch (type) {
      case 'CONFIG_REQUEST':
        this.sendConfigToRenderer()
        break
      case 'PLUGIN_ADD':
        this.addPlugin()
        break
      case 'PLUGIN_DELETE':
        this.deletePlugin(data)
        break
      case 'PLUGIN_REMOVE':
        this.removePlugin(data)
        break
      case 'PLUGIN_RELOAD_CONFIG':
        this.reloadPlugin(data)
        break
      case 'PLUGIN_START':
        this.startPlugin(data)
        break
      case 'PRELOADER_LOADED':
        console.log(data)
        break
      default:
        if (this._debug) {
          console.log('message from renderer', type, data)
        }
        this.sendToRenderer('unhandled', {
          data,
          type
        })
        break
    }
  }

  parseSyncMessageFromRenderer (type, data) {
    switch (type) {
      case 'PRELOADER_LOADED':
        return this._currentPlugin.preload.js.safe.map((p) => {
          let jsContent = ''
          try {
            jsContent = fs.readFileSync(path.resolve(this._currentPlugin.path, p), { encoding: 'UTF-8' }).toString()
          } catch (e) {
            console.error(e)
          }
          return jsContent
        }).filter(js => js.length > 0)
      default:
        if (this._debug) {
          console.log('sync message from renderer', type, data)
        }
        return JSON.stringify({ type: 'unhandled' })
    }
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
      title: 'Select plugin.json',
      defaultPath: path.resolve('./', 'plugins'),
      filters: [{
        name: 'plugin.json',
        extensions: ['json']
      }],
      properties: ['openFile']
    })

    // if dialog canceled
    if (typeof paths === 'undefined') {
      return
    }

    const pluginJSONPath = paths[0]

    // if selected plugin already loaded
    if (this._config.plugins.filter((p) => p.JSONpath === pluginJSONPath).length > 0) {
      return
    }

    try {
      let pluginJSON = JSON.parse(fs.readFileSync(pluginJSONPath))
      pluginJSON = Object.assign({}, pluginJSON, {
        path: path.dirname(pluginJSONPath),
        JSONpath: pluginJSONPath
      })
      this._config.plugins.push(pluginJSON)
      this.saveConfig()
      this.sendConfigToRenderer()
    } catch (e) {
    }
  }

  reloadPlugin (plugin) {
    let pluginJSON = {}
    try {
      pluginJSON = JSON.parse(fs.readFileSync(plugin.JSONpath))
    } catch (e) {
      console.error(e)
    }
    this._config.plugins = this._config.plugins.map((p) => {
      if (p.name === plugin.name) {
        return Object.assign(pluginJSON, plugin)
      }
      return p
    })
    this.saveConfig()
    this.sendConfigToRenderer()
  }

  // just removes from config
  removePlugin (plugin) {
    this._config.plugins = this._config.plugins.filter((p) => p.name !== plugin.name)
    this.saveConfig()
    this.sendConfigToRenderer()
  }

  // deletes all plugin files as well
  deletePlugin (plugin) {
    this.sendConfigToRenderer()
  }

  // start plugin
  startPlugin (plugin) {
    const ses = session.fromPartition(`persist:gameView_${plugin.name}`)

    this._currentPlugin = plugin
    this._gameView = new BrowserView({
      webPreferences: {
        preload: path.resolve(__dirname, '..', 'preload', 'preload_plugin.js'),
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        contextIsolation: true,
        enableRemoteModule: true,
        session: ses
      }
    })
    this._window.addBrowserView(this._gameView)
    const size = this._window.getContentSize()
    this._gameView.setBounds({
      x: 0,
      y: 0,
      width: size[0],
      height: size[1]
    })
    this._gameView.setAutoResize({
      width: true,
      height: true
    })
    this._gameView.webContents.loadURL(plugin.gamePage)
  }
}

export default MainWindow
