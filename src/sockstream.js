export default class StreamSock {
  /**
   * @param {string|Object} host Either define the host name (and further optional attributes), OR pass in a configuration object
   * @param port
   * @param secure
   * @param keepAlive
   * @param debugLevel
   */
  constructor(host = 'localhost', port = 8082, secure = true, keepAlive = 800, debugLevel = 0) {
    this.callbackRegister = {
      ping: message => {
        this.send('pong')
        this.console(['[PING]', message])
      },
      system: message => {
        this.console(['[SYSTEM]', message])
      }
    }
    this.disconnect = [];
    this.connections = {};
    this._config = {
      client: {
        name: 'sockstream.js',
        version: 1.2,
        debugLevel: 0,
        keepAlive: 800
      },
      server: {
        name: 'sockets/php-stream-socket-server',
        version: 1.3,
        hostname: 'localhost',
        port: 8082,
        proto: 'wss://'
      }
    }
    if (typeof host === 'object') {
      if (typeof host.client === 'object') {
        this._config.client = Object.assign({
          debugLevel: 0,
          keepAlive: 800
        }, host.client, {
          name: 'sockstream.js',
          version: 0.1
        })
      }
      if (typeof host.server === 'object') {
        this._config.server = Object.assign({
          hostname: 'localhost',
          port: 8082,
          proto: 'wss://'
        }, host.server, {
          name: 'sockets/php-stream-socket-server',
          version: 1.3
        })
      }
    } else {
      this._config = {
        client: {
          name: 'sockstream.js',
          version: 0.1,
          debugLevel: debugLevel,
          keepAlive: keepAlive
        },
        server: {
          name: 'sockets/php-stream-socket-server',
          version: 1.3,
          hostname: host,
          port: port,
          proto: !!secure ? 'wss://' : 'ws://'
        }
      }
    }
  }

  console(message, type = 'log') {
    let levelMap = {
      'log': 4,
      'debug': 3,
      'info': 2,
      'warn': 1,
      'error': 0
    }
    this._config.client.debugLevel >= (levelMap[type]||0) && console[type](message)
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
    let d = new Date().getTime();
    if (window.performance && typeof window.performance.now === 'function') {
      d += performance.now();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    })
  }

  static parseMessage(message) {
    if (typeof message === 'undefined') {
      return null
    } else if (typeof message === 'string') {
      return JSON.parse(message)
    } else {
      return message;
    }
  }

  close(connectionId = null) {
    let id = connectionId || this.lastConnectionId;
    if (typeof this.connections[id] !== 'undefined') {
      this.disconnect.push(id)
      this.connections[id].close()
    }
    return true;
  }

  /**
   * @param {string} message
   * @param {string|function} cb either define a closure or pass in a connectionId
   * @returns {boolean}
   */
  send(message, cb) {
    let connectionId = this.lastConnectionId
    if (typeof cb !== 'function' && typeof this.connections[cb] !== 'undefined' ) {
      this.lastConnectionId = connectionId = cb
    }
    if (typeof this.connections[connectionId] === 'undefined' ) {
      return false;
    }

    if (this.connections[connectionId].readyState === this.connections[connectionId].OPEN) {
      let _id = StreamSocketClient.generateUUID()
      if (typeof cb === 'function') {
        this.callbackRegister[_id] = cb
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
   * @returns {string} connectionId
   */
  open(cb) {
    this.console(['[CONNECTING]',`${this._config.server.proto}${this._config.server.hostname}:${this._config.server.port}`], 'info')
    let connectionId = StreamSocketClient.generateUUID()
    this.lastConnectionId = connectionId
    this.connections[connectionId] = new WebSocket(`${this._config.server.proto}${this._config.server.hostname}:${this._config.server.port}`)
    if (this.connections[connectionId].readyState === this.connections[connectionId].CONNECTING) {
      this.connections[connectionId].onopen = () => {
        this.console('connected', 'info')
        setTimeout(() => {
          this.send('connecting', cb)
        }, 20)
      }
      this.connections[connectionId].onerror = e => {
        this.console(['WebSocket error', e], 'error')
      }
      this.connections[connectionId].onmessage = e => {
        let parsed = StreamSocketClient.parseMessage(e.data);
        if (parsed && typeof parsed['@meta'] !== 'undefined') {
          if (typeof this.callbackRegister[parsed['@meta']._type] === 'function') {
            this.callbackRegister[parsed['@meta']._type].call(this._config, parsed['@meta']._system)
          } else if (typeof this.callbackRegister[parsed['@meta']._id] === 'function') {
            this.callbackRegister[parsed['@meta']._id].call(this._config, parsed.message || null)
            delete this.callbackRegister[parsed['@meta']._id]
          }
        }
        this.console(['[RCVD]', parsed], 'debug')
      }
      this.connections[connectionId].onclose = e => {
        this.console(['WebSocket closed', e], 'warn')
        if (this.disconnect.indexOf(connectionId) === -1 && typeof this._config.client.keepAlive === 'number' && this._config.client.keepAlive > 0) {
          setTimeout(() => {
            this.console('Attempting to reestablish WebSocket', 'info')
            this.open()
          }, this._config.client.keepAlive)
        }
        delete this.connections[connectionId]
      }
    }

    return connectionId;
  }
}