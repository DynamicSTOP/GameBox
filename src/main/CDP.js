// https://chromedevtools.github.io/devtools-protocol/tot/Fetch/
class CDP {
  constructor () {
    this._view = null
    this._debugger = null
    this._debug = process.env.NODE_ENV === 'development'
    this.loadFilters()
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

  loadFilters (filters = {}) {
    this.filters = {
      request: false,
      response: false,
      headers: false,
      blacklistParams: []
    }
    Object.assign(this.filters, filters)
    this.validateFilters()
  }

  validateFilters () {
    const checkFilter = (filterGroup) => {
      if (filterGroup instanceof Array) {
        filterGroup = filterGroup.filter((r) => typeof r === 'string').filter((r) => r.length > 0).map((r) => new RegExp(r))
        if (filterGroup.length === 0) {
          filterGroup = false
        }
      } else if (filterGroup !== true) {
        filterGroup = false
      }
      return filterGroup
    }
    this.filters.request = checkFilter(this.filters.request)
    this.filters.response = checkFilter(this.filters.response)
  }

  testRequest (params = {}) {
    const requestType = params.responseHeaders ? 'Response' : 'Request'
    if (requestType === 'Request' && this.filters.request !== false) {
      if (this.filters.request === true || this.filters.request.some(r => r.test(params.request.url))) {
        if (this._debug) {
          console.log('::Fetch.requestPaused', params.requestId, params.request.method, params.request.url, requestType)
        }
      }
    } else if (this.filters.response !== false) { // Response
      if (this.filters.response === true || this.filters.response.some(r => r.test(params.request.url))) {
        if (this._debug) {
          this._debugger.sendCommand('Fetch.getResponseBody', { requestId: params.requestId })
            .then((result) => {
              const { body } = result
              // if (result.base64Encoded) {
              //   body = Buffer.from(result.body, 'base64').toString()
              // }
              console.log('::Fetch.requestPaused', params.requestId, params.request.method, params.request.url, requestType, body.substr(0, 20) + '...')
            })
        }
      }
    }
  }

  parseMessage (event, method, params) {
    // check this page https://chromedevtools.github.io/devtools-protocol/tot/Network
    if (method === 'Fetch.requestPaused') {
      this.testRequest(params)
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
