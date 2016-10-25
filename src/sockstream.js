export default class StreamSock {
  /**
   * @param {string|Object} host Either define the host name (and further optional attributes), OR pass in a configuration object
   * @param port
   * @param secure
   * @param keepAlive
   * @param debugLevel
   */
  constructor(host = 'localhost', port = 8082, secure = true, keepAlive = 800, debugLevel = 0) {
    let clientName = 'sockstream.js'
    let clientVersion = '1.4.0'
    let defaultKeepAlive = 800
    let defaultDebugLevel = 0
    let defaultPort = 8082
    let defaultProto = 'wss://'
    let defaultHost = '127.0.0.1'
    this.callbackRegister = {anonymous:{}}
    this.maxKeepAliveAttempt = 20
    this.keepAliveAttempt = 0
    this.disconnect = []
    this.connections = {}
    this._config = {
      client: {
        name: clientName,
        version: clientVersion,
        debugLevel: defaultDebugLevel,
        keepAlive: defaultKeepAlive
      },
      server: {
        hostname: defaultHost,
        port: defaultPort,
        proto: defaultProto
      }
    }
    if (typeof host === 'object') {
      if (typeof host.client === 'object') {
        this._config.client = Object.assign({
          debugLevel: defaultDebugLevel,
          keepAlive: defaultKeepAlive
        }, host.client, {
          name: clientName,
          version: clientVersion
        })
      }
      if (typeof host.server === 'object') {
        this._config.server = Object.assign({
          hostname: defaultHost,
          port: defaultPort,
          proto: defaultProto
        }, host.server)
      }
    } else {
      this._config = {
        client: {
          name: clientName,
          version: clientVersion,
          debugLevel: debugLevel,
          keepAlive: keepAlive
        },
        server: {
          hostname: host,
          port: port,
          proto: !!secure ? 'wss://' : 'ws://'
        }
      }
    }
    this.on('ping', message => {
      this.send('pong')
      this.console(['[PING]', message], 'debug')
    })
    this.on('system', message => {
      this.console(['[SYSTEM]', message], 'info')
    })
  }

  console(message, type = 'log') {
    let levelMap = {
      'log': 4,
      'debug': 3,
      'info': 2,
      'warn': 1,
      'error': 0
    }
    this._config.client.debugLevel >= (levelMap[type]||0) && console[type](...message)
  }

  /**
   * Either retrieves or sets the debug config value
   * @param setting
   * @returns {boolean}
   */
  debug(setting) {
    if (typeof setting !== 'undefined') {
      this._config.client.debug = !!setting
    }
    return this._config.client.debug
  }

  static generateUUID() {
    let d = new Date().getTime()
    if (window.performance && typeof window.performance.now === 'function') {
      d += performance.now()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = (d + Math.random() * 16) % 16 | 0
      d = Math.floor(d / 16)
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  static parseMessage(message) {
    if (typeof message === 'undefined') {
      return null
    } else if (typeof message === 'string') {
      return JSON.parse(message)
    } else {
      return message
    }
  }

  close(connectionId = null) {
    let id = connectionId || this.lastConnectionId
    if (typeof this.connections[id] !== 'undefined') {
      this.disconnect.push(id)
      this.connections[id].close()
    }
    return true
  }

  /**
   * listens for a message type from the server
   * @param {string} type
   * @param {string|function} cb
   * @returns {boolean}
   */
  on(type, cb) {
    if (typeof cb === 'function') {
      if (typeof this.callbackRegister[type] === 'undefined') {
        this.callbackRegister[type] = [cb]
      } else if (Array.isArray(this.callbackRegister[type])) {
        this.callbackRegister[type].push(cb)
      }
    }
  }

  /**
   * sends a message to the server on an open conneciton
   * @param {string} message
   * @param {string|function} cb either define a closure or pass in a connectionId
   * @returns {boolean}
   */
  emit(message, cb) {
    let connectionId = this.lastConnectionId
    if (typeof cb !== 'function' && typeof this.connections[cb] !== 'undefined' ) {
      this.lastConnectionId = connectionId = cb
    }
    if (typeof this.connections[connectionId] === 'undefined' ) {
      return false
    }

    if (this.connections[connectionId].readyState === this.connections[connectionId].OPEN) {
      let _id = StreamSock.generateUUID()
      if (typeof cb === 'function') {
        this.callbackRegister.anonymous[_id] = cb
      }
      this.connections[connectionId].send(JSON.stringify({
        '@meta': Object.assign({
          '_id': _id
        }, this._config),
        'message': message
      }))
      return true
    } else {
      this.console('WebSocket not open', 'warn')
    }
    return false
  }

  /**
   * Opens a new WebSocket connection, it does not over-write existing open connections
   * @param {function} cb
   * @param {string} connection optional
   * @returns {string} connectionId
   */
  connect(cb, connection) {
    if (!connection || typeof connection !== 'string') {
      connection = `${this._config.server.proto}${this._config.server.hostname}:${this._config.server.port}`
    }
    this.console(['[CONNECTING]', connection], 'info')
    let connectionId = StreamSock.generateUUID()
    this.lastConnectionId = connectionId
    try {
      this.connections[connectionId] = new WebSocket(`${this._config.server.proto}${this._config.server.hostname}:${this._config.server.port}`)
    } catch(e){return}
    if (this.connections[connectionId].readyState === this.connections[connectionId].CONNECTING) {
      this.connections[connectionId].onopen = () => {
        this.console('connected', 'info')
        this.keepAliveAttempt = 0
        setTimeout(() => {
          this.send('connecting', cb)
        }, 20)
      }
      this.connections[connectionId].onerror = e => {
        this.console(e, 'error')
      }
      this.connections[connectionId].onmessage = e => {
        let parsed = StreamSock.parseMessage(e.data)
        if (parsed && typeof parsed['@meta'] !== 'undefined') {
          if (typeof this.callbackRegister[parsed['@meta']._type] === 'function') {
            this.callbackRegister[parsed['@meta']._type].forEach(fn=> fn.call(this._config, parsed.message))
          } else if (typeof this.callbackRegister.anonymous[parsed['@meta']._id] === 'function') {
            this.callbackRegister.anonymous[parsed['@meta']._id].call(this._config, parsed.message)
            delete this.callbackRegister.anonymous[parsed['@meta']._id]
          }
          this.console(['[RCVD]', parsed.message], 'debug')
        } else {
          this.console(['[RCVD]', e.data], 'debug')
        }
      }
      this.connections[connectionId].onclose = e => {
        this.console(['WebSocket closed', e], 'warn')
        if (this.disconnect.indexOf(connectionId) === -1 && typeof this._config.client.keepAlive === 'number' && this._config.client.keepAlive > 0) {
          if (++this.keepAliveAttempt > this.maxKeepAliveAttempt) {
            return
          }
          let timeout = this._config.client.keepAlive
          if (this.keepAliveAttempt > 5) {
            timeout = timeout + (timeout/2)
          } else if (this.keepAliveAttempt > 10) {
            timeout = timeout*2
          }
          setTimeout(() => {
            this.console('Attempting to reestablish WebSocket', 'info')
            this.open()
          }, timeout)
        }
        delete this.connections[connectionId]
      }
    }

    return connectionId
  }

  /**
   * @param number int
   */
  setMaxKeepAliveAttempt(number) {
    this.maxKeepAliveAttempt = typeof number === 'number' ? number : this.maxKeepAliveAttempt
    return this
  }
}
