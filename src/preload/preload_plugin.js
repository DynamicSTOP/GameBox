(function () {
  console.log('Preload loaded')
  const { ipcRenderer } = require('electron')

  ipcRenderer.on('async-main-message', (event, message) => {
    console.log('preloader passing message from main', message)
    window.postMessage(message, '*')
  })

  function receiveMessageForMain (event) {
    if (event.data) {
      try {
        const data = JSON.parse(event.data)
        if (data.sender === 'renderer') {
          console.log('preloader passing message to main')
          ipcRenderer.send('async-renderer-message', event.data)
        }
      } catch (e) {
      }
    }
  }
  window.addEventListener('message', receiveMessageForMain, false)

  function pageIsReady () {
    ipcRenderer.send('async-renderer-message', JSON.stringify({
      seder: 'renderer',
      type: 'PRELOADER_PLUGIN_DOM_READY'
    }))
  }
  document.addEventListener('DOMContentLoaded', pageIsReady)
})()
