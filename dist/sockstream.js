'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StreamSock = function () {
  /**
   * @param {string|Object} host Either define the host name (and further optional attributes), OR pass in a configuration object
   * @param port
   * @param secure
   * @param keepAlive
   * @param debugLevel
   */
  function StreamSock() {
    var host = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'localhost';
    var port = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8082;
    var secure = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    var _this = this;

    var keepAlive = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 800;
    var debugLevel = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;

    _classCallCheck(this, StreamSock);

    var clientName = 'sockstream.js';
    var clientVersion = '1.4.0';
    var defaultKeepAlive = 800;
    var defaultDebugLevel = 0;
    var defaultPort = 8082;
    var defaultProto = 'wss://';
    var defaultHost = '127.0.0.1';
    this.callbackRegister = { anonymous: {} };
    this.maxKeepAliveAttempt = 20;
    this.keepAliveAttempt = 0;
    this.disconnect = [];
    this.connections = {};
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
    };
    if ((typeof host === 'undefined' ? 'undefined' : _typeof(host)) === 'object') {
      if (_typeof(host.client) === 'object') {
        this._config.client = Object.assign({
          debugLevel: defaultDebugLevel,
          keepAlive: defaultKeepAlive
        }, host.client, {
          name: clientName,
          version: clientVersion
        });
      }
      if (_typeof(host.server) === 'object') {
        this._config.server = Object.assign({
          hostname: defaultHost,
          port: defaultPort,
          proto: defaultProto
        }, host.server);
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
      };
    }
    this.on('ping', function (message) {
      _this.emit('pong');
      _this.console(['[PING]', message], 'debug');
    });
    this.on('system', function (message) {
      _this.console(['[SYSTEM]', message], 'info');
    });
  }

  _createClass(StreamSock, [{
    key: 'console',
    value: function (_console) {
      function console(_x) {
        return _console.apply(this, arguments);
      }

      console.toString = function () {
        return _console.toString();
      };

      return console;
    }(function (message) {
      var _console2;

      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'log';

      var levelMap = {
        'log': 4,
        'debug': 3,
        'info': 2,
        'warn': 1,
        'error': 0
      };
      this._config.client.debugLevel >= (levelMap[type] || 0) && (_console2 = console)[type].apply(_console2, _toConsumableArray(message));
    })

    /**
     * Either retrieves or sets the debug config value
     * @param setting
     * @returns {boolean}
     */

  }, {
    key: 'debug',
    value: function debug(setting) {
      if (typeof setting !== 'undefined') {
        this._config.client.debug = !!setting;
      }
      return this._config.client.debug;
    }
  }, {
    key: 'close',
    value: function close() {
      var connectionId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

      var id = connectionId || this.lastConnectionId;
      if (typeof this.connections[id] !== 'undefined') {
        this.disconnect.push(id);
        this.connections[id].close();
      }
      return true;
    }

    /**
     * listens for a message type from the server
     * @param {string} type
     * @param {string|function} cb
     * @returns {boolean}
     */

  }, {
    key: 'on',
    value: function on(type, cb) {
      if (typeof cb === 'function') {
        if (typeof this.callbackRegister[type] === 'undefined') {
          this.callbackRegister[type] = [cb];
        } else if (Array.isArray(this.callbackRegister[type])) {
          this.callbackRegister[type].push(cb);
        }
      }
    }

    /**
     * sends a message to the server on an open conneciton
     * @param {string} message
     * @param {string|function} cb either define a closure or pass in a connectionId
     * @returns {boolean}
     */

  }, {
    key: 'emit',
    value: function emit(message, cb) {
      var connectionId = this.lastConnectionId;
      if (typeof cb !== 'function' && typeof this.connections[cb] !== 'undefined') {
        this.lastConnectionId = connectionId = cb;
      }
      if (typeof this.connections[connectionId] === 'undefined') {
        return false;
      }

      if (this.connections[connectionId].readyState === this.connections[connectionId].OPEN) {
        var _id = StreamSock.generateUUID();
        if (typeof cb === 'function') {
          this.callbackRegister.anonymous[_id] = cb;
        }
        this.connections[connectionId].send(JSON.stringify({
          '@meta': Object.assign({
            '_id': _id
          }, this._config),
          'message': message
        }));
        return true;
      } else {
        this.console('WebSocket not open', 'warn');
      }
      return false;
    }

    /**
     * Opens a new WebSocket connection, it does not over-write existing open connections
     * @param {function} cb
     * @param {string} connection optional
     * @returns {string} connectionId
     */

  }, {
    key: 'connect',
    value: function connect(cb, connection) {
      var _this2 = this;

      if (!connection || typeof connection !== 'string') {
        connection = '' + this._config.server.proto + this._config.server.hostname + ':' + this._config.server.port;
      }
      this.console(['[CONNECTING]', connection], 'info');
      var connectionId = StreamSock.generateUUID();
      this.lastConnectionId = connectionId;
      try {
        this.connections[connectionId] = new WebSocket('' + this._config.server.proto + this._config.server.hostname + ':' + this._config.server.port);
      } catch (e) {
        return;
      }
      if (this.connections[connectionId].readyState === this.connections[connectionId].CONNECTING) {
        this.connections[connectionId].onopen = function () {
          _this2.console('connected', 'info');
          _this2.keepAliveAttempt = 0;
          setTimeout(function () {
            _this2.emit('connecting', cb);
          }, 20);
        };
        this.connections[connectionId].onerror = function (e) {
          _this2.console(e, 'error');
        };
        this.connections[connectionId].onmessage = function (e) {
          var parsed = StreamSock.parseMessage(e.data);
          if (parsed && typeof parsed['@meta'] !== 'undefined') {
            if (typeof _this2.callbackRegister[parsed['@meta']._type] === 'function') {
              _this2.callbackRegister[parsed['@meta']._type].forEach(function (fn) {
                return fn.call(_this2._config, parsed.message);
              });
            } else if (typeof _this2.callbackRegister.anonymous[parsed['@meta']._id] === 'function') {
              _this2.callbackRegister.anonymous[parsed['@meta']._id].call(_this2._config, parsed.message);
              delete _this2.callbackRegister.anonymous[parsed['@meta']._id];
            }
            _this2.console(['[RCVD]', parsed.message], 'debug');
          } else {
            _this2.console(['[RCVD]', e.data], 'debug');
          }
        };
        this.connections[connectionId].onclose = function (e) {
          _this2.console(['WebSocket closed', e], 'warn');
          if (_this2.disconnect.indexOf(connectionId) === -1 && typeof _this2._config.client.keepAlive === 'number' && _this2._config.client.keepAlive > 0) {
            if (++_this2.keepAliveAttempt > _this2.maxKeepAliveAttempt) {
              return;
            }
            var timeout = _this2._config.client.keepAlive;
            if (_this2.keepAliveAttempt > 5) {
              timeout = timeout + timeout / 2;
            } else if (_this2.keepAliveAttempt > 10) {
              timeout = timeout * 2;
            }
            setTimeout(function () {
              _this2.console('Attempting to reestablish WebSocket', 'info');
              _this2.connect(cb, connection);
            }, timeout);
          }
          delete _this2.connections[connectionId];
        };
      }

      return connectionId;
    }

    /**
     * @param number int
     */

  }, {
    key: 'setMaxKeepAliveAttempt',
    value: function setMaxKeepAliveAttempt(number) {
      this.maxKeepAliveAttempt = typeof number === 'number' ? number : this.maxKeepAliveAttempt;
      return this;
    }
  }], [{
    key: 'generateUUID',
    value: function generateUUID() {
      var d = new Date().getTime();
      if (window.performance && typeof window.performance.now === 'function') {
        d += performance.now();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
      });
    }
  }, {
    key: 'parseMessage',
    value: function parseMessage(message) {
      if (typeof message === 'undefined') {
        return null;
      } else if (typeof message === 'string') {
        return JSON.parse(message);
      } else {
        return message;
      }
    }
  }]);

  return StreamSock;
}();

exports.default = StreamSock;