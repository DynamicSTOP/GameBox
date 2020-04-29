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
    window.addEventListener('message', this.receiveMessage, false)
  }

  receiveMessage (event) {
    if (event.data) {
      try {
        const data = JSON.parse(event.data)
        if (data.sender === 'main') {
          console.log('renderer', data)
        }
      } catch (e) {
      }
    }
  }
}
