import { ipcMain, dialog, globalShortcut, BrowserWindow, BrowserView, session } from 'electron'
import path from 'path'
import fs from 'fs'
import cdp from './CDP'

const configPath = path.resolve('./', 'config.json')

class MainWindow {
  constructor () {
    this._window = null
    this._debug = process.env.NODE_ENV === 'development'
    this._config = {
      plugins: []
    }

    this._gameView = null
    this._pluginView = null
    this._currentPlugin = null

    cdp.on('Request', console.log)
    cdp.on('Response', console.log)
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
      }
      if (this._pluginView !== null) {
        this._pluginView.webContents.openDevTools()
      }
      if (this._window && this._window.webContents) {
        this._window.webContents.openDevTools()
      }
    })

    globalShortcut.register('CommandOrControl+Shift+K', () => {
      if (this._gameView !== null) {
        this._window.removeBrowserView(this._gameView)
        this._gameView.destroy()
        this._gameView = null
        this._currentPlugin = null
      }

      // TODO ask for destroy, then kill
      if (this._pluginView !== null) {
        this._window.removeBrowserView(this._pluginView)
        this._pluginView.destroy()
        this._pluginView = null
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
      case 'PRELOADER_GAME_DOM_READY':
        console.log('PRELOADER_GAME_DOM_READY')
        break
      case 'PRELOADER_PLUGIN_DOM_READY':
        setTimeout(() => {
          this.startGame()
        }, 1500)
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
      case 'PRELOADER_GAME_LOADED':
        return this._currentPlugin.preload.injectJS.map((p) => {
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
    const ses = session.fromPartition(`persist:plugin_${plugin.name}`)

    this._currentPlugin = plugin

    this._pluginView = new BrowserView({
      webPreferences: {
        preload: path.resolve(__dirname, '..', 'preload', 'preload_plugin.js'),
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        contextIsolation: true,
        enableRemoteModule: true,
        session: ses,
        webviewTag: true
      }
    })
    this._window.addBrowserView(this._pluginView)
    const size = this._window.getContentSize()
    this._pluginView.setBounds({
      x: 0,
      y: 0,
      width: size[0],
      height: size[1]
    })
    this._pluginView.setAutoResize({
      width: true,
      height: true
    })
    console.log(path.resolve(this._currentPlugin.path, this._currentPlugin.pluginPage))
    this._pluginView.webContents.loadURL(path.resolve(this._currentPlugin.path, this._currentPlugin.pluginPage))
  }

  calculateGameViewPosition () {
    const windows = this._currentPlugin.windows || {}
    if (windows.saved) {
      return windows.saved
    }
    const winSettings = windows.default || {
      mode: 'single',
      position: 'TL',
      width: 200,
      height: 200,
      margin: 0,
      x: 0,
      y: 0
    }
    switch (winSettings.position) {
      case 'TL':
        winSettings.x = 0
        winSettings.y = 0
        break
    }

    return winSettings
  }

  startGame () {
    if (this._gameView !== null) return
    if (this._pluginView === null) return
    const ses = session.fromPartition(`persist:plugin_${this._currentPlugin.name}`)

    this._gameView = new BrowserView({
      webPreferences: {
        preload: path.resolve(__dirname, '..', 'preload', 'preload_game.js'),
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        contextIsolation: true,
        enableRemoteModule: true,
        session: ses,
        webviewTag: true
      }
    })
    cdp.attach(this._gameView)
    cdp.loadFilters(this._currentPlugin.networkFilters || {})
    this._window.addBrowserView(this._gameView)
    this._gameView.setBounds(this.calculateGameViewPosition())
    // this._gameView.setAutoResize({
    //   width: true,
    //   height: true
    // })
    this._gameView.webContents.loadURL(this._currentPlugin.gamePage)
  }
}

export default MainWindow
