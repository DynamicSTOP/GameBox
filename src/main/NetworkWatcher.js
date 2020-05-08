// https://chromedevtools.github.io/devtools-protocol/tot/Fetch/
import EventEmitter from 'events'

class NetworkWatcher extends EventEmitter {
  constructor (props) {
    super(props)
    this._view = null
    this._debugger = null
    this._debug = process.env.NODE_ENV === 'development'
    this.loadWatcherRules()
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

  loadWatcherRules (rules = {}) {
    this.watcherRules = {
      request: false,
      response: false,
      headers: false
    }
    Object.assign(this.watcherRules, rules)
    this.validateWatcherRules()
  }

  validateWatcherRules () {
    const checkRule = (rulesGroup, asRegexp = false, toLower) => {
      if (rulesGroup instanceof Array) {
        rulesGroup = rulesGroup.filter((r) => typeof r === 'string').filter((r) => r.length > 0)
        if (toLower) {
          rulesGroup = rulesGroup.map((r) => r.toLowerCase())
        }
        if (asRegexp) {
          rulesGroup = rulesGroup.map((r) => new RegExp(r))
        }
        if (rulesGroup.length === 0) {
          rulesGroup = false
        }
      } else if (rulesGroup !== true) {
        rulesGroup = false
      }
      return rulesGroup
    }
    this.watcherRules.request = checkRule(this.watcherRules.request, true)
    this.watcherRules.response = checkRule(this.watcherRules.response, true)
    this.watcherRules.headers = checkRule(this.watcherRules.headers, false, true)
  }

  filterHeaders (headers) {
    if (this.watcherRules.headers === false) {
      return {}
    }

    const filteredHeaders = {}
    if (headers instanceof Array) {
      // response is like this { name: 'status', value: '200' },
      headers.map((oldHeader) => {
        if (this.watcherRules.headers === true || this.watcherRules.headers.indexOf(oldHeader.name.toLowerCase()) !== -1) {
          filteredHeaders[oldHeader.name.toLowerCase()] = oldHeader.value
        }
      })
      return filteredHeaders
    } else if (typeof headers === 'object') {
      Object.keys(headers).map((oldHeader) => {
        if (this.watcherRules.headers === true || this.watcherRules.headers.indexOf(oldHeader.toLowerCase()) !== -1) {
          filteredHeaders[oldHeader.toLowerCase()] = headers[oldHeader]
        }
      })
    }
    return filteredHeaders
  }

  getPostData (request) {
    const post = {
      data: request.postData,
      type: null
    }
    const keys = Object.keys(request.headers).filter((k) => k.toLowerCase() === 'content-type')
    if (keys.length) {
      post.type = request.headers[keys[0]]
    }
    return post
  }

  testRequest (params = {}) {
    const requestType = params.responseHeaders ? 'Response' : 'Request'
    if (requestType === 'Request' && this.watcherRules.request !== false) {
      if (this.watcherRules.request === true || this.watcherRules.request.some(r => r.test(params.request.url))) {
        this.emit('Request', {
          method: params.request.method,
          url: params.request.url,
          headers: this.filterHeaders(params.request.headers)
        })
      }
    } else if (this.watcherRules.response !== false) { // Response
      if (this.watcherRules.response === true || this.watcherRules.response.some(r => r.test(params.request.url))) {
        this._debugger.sendCommand('Fetch.getResponseBody', { requestId: params.requestId })
          .then((result) => {
            const responseDetails = {
              method: params.request.method,
              url: params.request.url,
              headers: this.filterHeaders(params.request.headers),
              responseHeaders: this.filterHeaders(params.responseHeaders),
              response: result
            }
            if (responseDetails.method === 'POST') {
              responseDetails.post = this.getPostData(params.request)
            }
            this.emit('Response', responseDetails)
          })
      }
    }
  }

  parseMessage (event, method, params) {
    // check this page https://chromedevtools.github.io/devtools-protocol/tot/Network
    if (method === 'Fetch.requestPaused') {
      try {
        this.testRequest(params)
      } catch (e) {
        console.error(e)
      }
      this._debugger.sendCommand('Fetch.continueRequest', { requestId: params.requestId })
    }
  }

  detach () {
    if (this._view) {
      this._debugger.detach()
    }
    this._view = null
  }
}

const nw = new NetworkWatcher()
export default nw
