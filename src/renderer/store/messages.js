export const sendMessageToMain = (type = 'UNKNOWN', data = {}) => {
  window.postMessage(JSON.stringify({
    sender: 'renderer',
    type,
    data
  }))
}

export class MessageParser {
  constructor (store) {
    this.store = store
  }

  subscribe () {
    window.addEventListener('message', this.receiveMessage.bind(this), false)
  }

  receiveMessage (event) {
    if (event.data) {
      let data = {}
      try {
        data = JSON.parse(event.data)
      } catch (e) {
      }
      if (data.sender === 'main') {
        this.parseMessage(data)
      }
    }
  }

  parseMessage (message) {
    switch (message.type) {
      case 'CONFIG_LOADED':
        this.store.commit('CONFIG_UPDATE', message.data)
        break
      default:
        console.error('unknown message type', message)
        break
    }
  }
}
