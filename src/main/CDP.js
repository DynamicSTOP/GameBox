// https://chromedevtools.github.io/devtools-protocol/tot/Fetch/
class CDP {
  constructor () {
    this._view = null
    this._debugger = null
    this._requests = {}
    this._debug = process.env.NODE_ENV === 'development'
  }

  attach (view) {
    if (this._view) {
      this.detach()
    }

    try {
      view.webContents.debugger.attach('1.3')
      this._view = view
      this._view.webContents.on('destroyed', () => {
        this._view = null
        this._debugger = null
      })
      this._requests = {}
    } catch (err) {
      console.log('Debugger attach failed : ', err)
    }

    if (this._view) {
      this._debugger = this._view.webContents.debugger
      this._debugger.on('message', this.parseMessage.bind(this))
      this._debugger.sendCommand('Fetch.enable', { patterns: [{ requestStage: 'Request' }, { requestStage: 'Response' }] })
    }
  }

  parseMessage (event, method, params) {
    // check this page https://chromedevtools.github.io/devtools-protocol/tot/Network
    if (method === 'Fetch.requestPaused') {
      const requestType = params.responseHeaders ? 'Response' : 'Request'
      if (requestType === 'Response') {
        if (params.request.method === 'GET' && params.resourceType === 'XHR') {
          this._debugger.sendCommand('Fetch.getResponseBody', { requestId: params.requestId })
            .then((result) => {
              let body = result.body
              if (result.base64Encoded) {
                body = Buffer.from(result.body, 'base64').toString()
              }
              console.log('::Fetch.requestPaused', params.requestId, params.request.method, params.request.url, requestType, body)
            })
        } else {
          console.log('::Fetch.requestPaused', params.requestId, params.request.method, params.request.url, requestType)
        }
      } else {
        if (this._debug) {
          console.log('::Fetch.requestPaused', params.requestId, params.request.method, params.request.url, requestType)
        }
      }
      this._debugger.sendCommand('Fetch.continueRequest', { requestId: params.requestId })
    } else {
      console.log(method)
    }
  }

  detach () {
    if (this._view) {
      this._debugger.detach()
    }
    this._view = null
  }
}

const cdp = new CDP()
export default cdp
