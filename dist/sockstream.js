'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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

    this.callbackRegister = {
      ping: function ping(message) {
        _this.send('pong');
        _this.console(['[PING]', message]);
      },
      system: function system(message) {
        _this.console(['[SYSTEM]', message]);
      }
    };
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
    };
    if ((typeof host === 'undefined' ? 'undefined' : _typeof(host)) === 'object') {
      if (_typeof(host.client) === 'object') {
        this._config.client = Object.assign({
          debugLevel: 0,
          keepAlive: 800
        }, host.client, {
          name: 'sockstream.js',
          version: 0.1
        });
      }
      if (_typeof(host.server) === 'object') {
        this._config.server = Object.assign({
          hostname: 'localhost',
          port: 8082,
          proto: 'wss://'
        }, host.server, {
          name: 'sockets/php-stream-socket-server',
          version: 1.3
        });
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
      };
    }
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
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'log';

      var levelMap = {
        'log': 4,
        'debug': 3,
        'info': 2,
        'warn': 1,
        'error': 0
      };
      this._config.client.debugLevel >= (levelMap[type] || 0) && console[type](message);
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
     * @param {string} message
     * @param {string|function} cb either define a closure or pass in a connectionId
     * @returns {boolean}
     */

  }, {
    key: 'send',
    value: function send(message, cb) {
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
          this.callbackRegister[_id] = cb;
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
     * @returns {string} connectionId
     */

  }, {
    key: 'open',
    value: function open(cb) {
      var _this2 = this;

      this.console(['[CONNECTING]', '' + this._config.server.proto + this._config.server.hostname + ':' + this._config.server.port], 'info');
      var connectionId = StreamSock.generateUUID();
      this.lastConnectionId = connectionId;
      this.connections[connectionId] = new WebSocket('' + this._config.server.proto + this._config.server.hostname + ':' + this._config.server.port);
      if (this.connections[connectionId].readyState === this.connections[connectionId].CONNECTING) {
        this.connections[connectionId].onopen = function () {
          _this2.console('connected', 'info');
          setTimeout(function () {
            _this2.send('connecting', cb);
          }, 20);
        };
        this.connections[connectionId].onerror = function (e) {
          _this2.console(['WebSocket error', e], 'error');
        };
        this.connections[connectionId].onmessage = function (e) {
          var parsed = StreamSock.parseMessage(e.data);
          if (parsed && typeof parsed['@meta'] !== 'undefined') {
            if (typeof _this2.callbackRegister[parsed['@meta']._type] === 'function') {
              _this2.callbackRegister[parsed['@meta']._type].call(_this2._config, parsed['@meta']._system);
            } else if (typeof _this2.callbackRegister[parsed['@meta']._id] === 'function') {
              _this2.callbackRegister[parsed['@meta']._id].call(_this2._config, parsed.message || null);
              delete _this2.callbackRegister[parsed['@meta']._id];
            }
          }
          _this2.console(['[RCVD]', parsed], 'debug');
        };
        this.connections[connectionId].onclose = function (e) {
          _this2.console(['WebSocket closed', e], 'warn');
          if (_this2.disconnect.indexOf(connectionId) === -1 && typeof _this2._config.client.keepAlive === 'number' && _this2._config.client.keepAlive > 0) {
            setTimeout(function () {
              _this2.console('Attempting to reestablish WebSocket', 'info');
              _this2.open();
            }, _this2._config.client.keepAlive);
          }
          delete _this2.connections[connectionId];
        };
      }

      return connectionId;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNvY2tzdHJlYW0uanMiXSwibmFtZXMiOlsiU3RyZWFtU29jayIsImhvc3QiLCJwb3J0Iiwic2VjdXJlIiwia2VlcEFsaXZlIiwiZGVidWdMZXZlbCIsImNhbGxiYWNrUmVnaXN0ZXIiLCJwaW5nIiwic2VuZCIsImNvbnNvbGUiLCJtZXNzYWdlIiwic3lzdGVtIiwiZGlzY29ubmVjdCIsImNvbm5lY3Rpb25zIiwiX2NvbmZpZyIsImNsaWVudCIsIm5hbWUiLCJ2ZXJzaW9uIiwic2VydmVyIiwiaG9zdG5hbWUiLCJwcm90byIsIk9iamVjdCIsImFzc2lnbiIsInR5cGUiLCJsZXZlbE1hcCIsInNldHRpbmciLCJkZWJ1ZyIsImNvbm5lY3Rpb25JZCIsImlkIiwibGFzdENvbm5lY3Rpb25JZCIsInB1c2giLCJjbG9zZSIsImNiIiwicmVhZHlTdGF0ZSIsIk9QRU4iLCJfaWQiLCJnZW5lcmF0ZVVVSUQiLCJKU09OIiwic3RyaW5naWZ5IiwiV2ViU29ja2V0IiwiQ09OTkVDVElORyIsIm9ub3BlbiIsInNldFRpbWVvdXQiLCJvbmVycm9yIiwiZSIsIm9ubWVzc2FnZSIsInBhcnNlZCIsInBhcnNlTWVzc2FnZSIsImRhdGEiLCJfdHlwZSIsImNhbGwiLCJfc3lzdGVtIiwib25jbG9zZSIsImluZGV4T2YiLCJvcGVuIiwiZCIsIkRhdGUiLCJnZXRUaW1lIiwid2luZG93IiwicGVyZm9ybWFuY2UiLCJub3ciLCJyZXBsYWNlIiwiYyIsInIiLCJNYXRoIiwicmFuZG9tIiwiZmxvb3IiLCJ0b1N0cmluZyIsInBhcnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBcUJBLFU7QUFDbkI7Ozs7Ozs7QUFPQSx3QkFBNkY7QUFBQSxRQUFqRkMsSUFBaUYsdUVBQTFFLFdBQTBFO0FBQUEsUUFBN0RDLElBQTZELHVFQUF0RCxJQUFzRDtBQUFBLFFBQWhEQyxNQUFnRCx1RUFBdkMsSUFBdUM7O0FBQUE7O0FBQUEsUUFBakNDLFNBQWlDLHVFQUFyQixHQUFxQjtBQUFBLFFB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LE9BRkQsTUFFTyxJQUFJLE9BQU9BLE9BQVAsS0FBbUIsUUFBdkIsRUFBaUM7QUFDdEMsZUFBTzJCLEtBQUsrQixLQUFMLENBQVcxRCxPQUFYLENBQVA7QUFDRCxPQUZNLE1BRUE7QUFDTCxlQUFPQSxPQUFQO0FBQ0Q7QUFDRjs7Ozs7O2tCQXJIa0JWLFUiLCJmaWxlIjoic29ja3N0cmVhbS5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbVNvY2sge1xuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd8T2JqZWN0fSBob3N0IEVpdGhlciBkZWZpbmUgdGhlIGhvc3QgbmFtZSAoYW5kIGZ1cnRoZXIgb3B0aW9uYWwgYXR0cmlidXRlcyksIE9SIHBhc3MgaW4gYSBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgKiBAcGFyYW0gcG9ydFxuICAgKiBAcGFyYW0gc2VjdXJlXG4gICAqIEBwYXJhbSBrZWVwQWxpdmVcbiAgICogQHBhcmFtIGRlYnVnTGV2ZWxcbiAgICovXG4gIGNvbnN0cnVjdG9yKGhvc3QgPSAnbG9jYWxob3N0JywgcG9ydCA9IDgwODIsIHNlY3VyZSA9IHRydWUsIGtlZXBBbGl2ZSA9IDgwMCwgZGVidWdMZXZlbCA9IDApIHtcbiAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXIgPSB7XG4gICAgICBwaW5nOiBtZXNzYWdlID0+IHtcbiAgICAgICAgdGhpcy5zZW5kKCdwb25nJylcbiAgICAgICAgdGhpcy5jb25zb2xlKFsnW1BJTkddJywgbWVzc2FnZV0pXG4gICAgICB9LFxuICAgICAgc3lzdGVtOiBtZXNzYWdlID0+IHtcbiAgICAgICAgdGhpcy5jb25zb2xlKFsnW1NZU1RFTV0nLCBtZXNzYWdlXSlcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5kaXNjb25uZWN0ID0gW107XG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IHt9O1xuICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgIGNsaWVudDoge1xuICAgICAgICBuYW1lOiAnc29ja3N0cmVhbS5qcycsXG4gICAgICAgIHZlcnNpb246IDEuMixcbiAgICAgICAgZGVidWdMZXZlbDogMCxcbiAgICAgICAga2VlcEFsaXZlOiA4MDBcbiAgICAgIH0sXG4gICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgbmFtZTogJ3NvY2tldHMvcGhwLXN0cmVhbS1zb2NrZXQtc2VydmVyJyxcbiAgICAgICAgdmVyc2lvbjogMS4zLFxuICAgICAgICBob3N0bmFtZTogJ2xvY2FsaG9zdCcsXG4gICAgICAgIHBvcnQ6IDgwODIsXG4gICAgICAgIHByb3RvOiAnd3NzOi8vJ1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGhvc3QgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAodHlwZW9mIGhvc3QuY2xpZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLl9jb25maWcuY2xpZW50ID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgZGVidWdMZXZlbDogMCxcbiAgICAgICAgICBrZWVwQWxpdmU6IDgwMFxuICAgICAgICB9LCBob3N0LmNsaWVudCwge1xuICAgICAgICAgIG5hbWU6ICdzb2Nrc3RyZWFtLmpzJyxcbiAgICAgICAgICB2ZXJzaW9uOiAwLjFcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgaG9zdC5zZXJ2ZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMuX2NvbmZpZy5zZXJ2ZXIgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICBob3N0bmFtZTogJ2xvY2FsaG9zdCcsXG4gICAgICAgICAgcG9ydDogODA4MixcbiAgICAgICAgICBwcm90bzogJ3dzczovLydcbiAgICAgICAgfSwgaG9zdC5zZXJ2ZXIsIHtcbiAgICAgICAgICBuYW1lOiAnc29ja2V0cy9waHAtc3RyZWFtLXNvY2tldC1zZXJ2ZXInLFxuICAgICAgICAgIHZlcnNpb246IDEuM1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIGNsaWVudDoge1xuICAgICAgICAgIG5hbWU6ICdzb2Nrc3RyZWFtLmpzJyxcbiAgICAgICAgICB2ZXJzaW9uOiAwLjEsXG4gICAgICAgICAgZGVidWdMZXZlbDogZGVidWdMZXZlbCxcbiAgICAgICAgICBrZWVwQWxpdmU6IGtlZXBBbGl2ZVxuICAgICAgICB9LFxuICAgICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgICBuYW1lOiAnc29ja2V0cy9waHAtc3RyZWFtLXNvY2tldC1zZXJ2ZXInLFxuICAgICAgICAgIHZlcnNpb246IDEuMyxcbiAgICAgICAgICBob3N0bmFtZTogaG9zdCxcbiAgICAgICAgICBwb3J0OiBwb3J0LFxuICAgICAgICAgIHByb3RvOiAhIXNlY3VyZSA/ICd3c3M6Ly8nIDogJ3dzOi8vJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc29sZShtZXNzYWdlLCB0eXBlID0gJ2xvZycpIHtcbiAgICBsZXQgbGV2ZWxNYXAgPSB7XG4gICAgICAnbG9nJzogNCxcbiAgICAgICdkZWJ1Zyc6IDMsXG4gICAgICAnaW5mbyc6IDIsXG4gICAgICAnd2Fybic6IDEsXG4gICAgICAnZXJyb3InOiAwXG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZy5jbGllbnQuZGVidWdMZXZlbCA+PSAobGV2ZWxNYXBbdHlwZV18fDApICYmIGNvbnNvbGVbdHlwZV0obWVzc2FnZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBFaXRoZXIgcmV0cmlldmVzIG9yIHNldHMgdGhlIGRlYnVnIGNvbmZpZyB2YWx1ZVxuICAgKiBAcGFyYW0gc2V0dGluZ1xuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGRlYnVnKHNldHRpbmcpIHtcbiAgICBpZiAodHlwZW9mIHNldHRpbmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLl9jb25maWcuY2xpZW50LmRlYnVnID0gISFzZXR0aW5nXG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb25maWcuY2xpZW50LmRlYnVnXG4gIH1cblxuICBzdGF0aWMgZ2VuZXJhdGVVVUlEKCkge1xuICAgIGxldCBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgaWYgKHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB0eXBlb2Ygd2luZG93LnBlcmZvcm1hbmNlLm5vdyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZCArPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9XG4gICAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24gKGMpIHtcbiAgICAgIGxldCByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuICAgICAgZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcbiAgICAgIHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG4gICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBwYXJzZU1lc3NhZ2UobWVzc2FnZSkge1xuICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKG1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxuXG4gIGNsb3NlKGNvbm5lY3Rpb25JZCA9IG51bGwpIHtcbiAgICBsZXQgaWQgPSBjb25uZWN0aW9uSWQgfHwgdGhpcy5sYXN0Q29ubmVjdGlvbklkO1xuICAgIGlmICh0eXBlb2YgdGhpcy5jb25uZWN0aW9uc1tpZF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3QucHVzaChpZClcbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbaWRdLmNsb3NlKClcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2VcbiAgICogQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb259IGNiIGVpdGhlciBkZWZpbmUgYSBjbG9zdXJlIG9yIHBhc3MgaW4gYSBjb25uZWN0aW9uSWRcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzZW5kKG1lc3NhZ2UsIGNiKSB7XG4gICAgbGV0IGNvbm5lY3Rpb25JZCA9IHRoaXMubGFzdENvbm5lY3Rpb25JZFxuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRoaXMuY29ubmVjdGlvbnNbY2JdICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgIHRoaXMubGFzdENvbm5lY3Rpb25JZCA9IGNvbm5lY3Rpb25JZCA9IGNiXG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdID09PSAndW5kZWZpbmVkJyApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnJlYWR5U3RhdGUgPT09IHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5PUEVOKSB7XG4gICAgICBsZXQgX2lkID0gU3RyZWFtU29jay5nZW5lcmF0ZVVVSUQoKVxuICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbX2lkXSA9IGNiXG4gICAgICB9XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0uc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICdAbWV0YSc6IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICdfaWQnOiBfaWRcbiAgICAgICAgfSwgdGhpcy5fY29uZmlnKSxcbiAgICAgICAgJ21lc3NhZ2UnOiBtZXNzYWdlXG4gICAgICB9KSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29uc29sZSgnV2ViU29ja2V0IG5vdCBvcGVuJywgJ3dhcm4nKVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIG5ldyBXZWJTb2NrZXQgY29ubmVjdGlvbiwgaXQgZG9lcyBub3Qgb3Zlci13cml0ZSBleGlzdGluZyBvcGVuIGNvbm5lY3Rpb25zXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IGNvbm5lY3Rpb25JZFxuICAgKi9cbiAgb3BlbihjYikge1xuICAgIHRoaXMuY29uc29sZShbJ1tDT05ORUNUSU5HXScsYCR7dGhpcy5fY29uZmlnLnNlcnZlci5wcm90b30ke3RoaXMuX2NvbmZpZy5zZXJ2ZXIuaG9zdG5hbWV9OiR7dGhpcy5fY29uZmlnLnNlcnZlci5wb3J0fWBdLCAnaW5mbycpXG4gICAgbGV0IGNvbm5lY3Rpb25JZCA9IFN0cmVhbVNvY2suZ2VuZXJhdGVVVUlEKClcbiAgICB0aGlzLmxhc3RDb25uZWN0aW9uSWQgPSBjb25uZWN0aW9uSWRcbiAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0gPSBuZXcgV2ViU29ja2V0KGAke3RoaXMuX2NvbmZpZy5zZXJ2ZXIucHJvdG99JHt0aGlzLl9jb25maWcuc2VydmVyLmhvc3RuYW1lfToke3RoaXMuX2NvbmZpZy5zZXJ2ZXIucG9ydH1gKVxuICAgIGlmICh0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0ucmVhZHlTdGF0ZSA9PT0gdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLkNPTk5FQ1RJTkcpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuY29uc29sZSgnY29ubmVjdGVkJywgJ2luZm8nKVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnNlbmQoJ2Nvbm5lY3RpbmcnLCBjYilcbiAgICAgICAgfSwgMjApXG4gICAgICB9XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0ub25lcnJvciA9IGUgPT4ge1xuICAgICAgICB0aGlzLmNvbnNvbGUoWydXZWJTb2NrZXQgZXJyb3InLCBlXSwgJ2Vycm9yJylcbiAgICAgIH1cbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICAgICAgbGV0IHBhcnNlZCA9IFN0cmVhbVNvY2sucGFyc2VNZXNzYWdlKGUuZGF0YSk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZFsnQG1ldGEnXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuY2FsbGJhY2tSZWdpc3RlcltwYXJzZWRbJ0BtZXRhJ10uX3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbcGFyc2VkWydAbWV0YSddLl90eXBlXS5jYWxsKHRoaXMuX2NvbmZpZywgcGFyc2VkWydAbWV0YSddLl9zeXN0ZW0pXG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5jYWxsYmFja1JlZ2lzdGVyW3BhcnNlZFsnQG1ldGEnXS5faWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbcGFyc2VkWydAbWV0YSddLl9pZF0uY2FsbCh0aGlzLl9jb25maWcsIHBhcnNlZC5tZXNzYWdlIHx8IG51bGwpXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jYWxsYmFja1JlZ2lzdGVyW3BhcnNlZFsnQG1ldGEnXS5faWRdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29uc29sZShbJ1tSQ1ZEXScsIHBhcnNlZF0sICdkZWJ1ZycpXG4gICAgICB9XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0ub25jbG9zZSA9IGUgPT4ge1xuICAgICAgICB0aGlzLmNvbnNvbGUoWydXZWJTb2NrZXQgY2xvc2VkJywgZV0sICd3YXJuJylcbiAgICAgICAgaWYgKHRoaXMuZGlzY29ubmVjdC5pbmRleE9mKGNvbm5lY3Rpb25JZCkgPT09IC0xICYmIHR5cGVvZiB0aGlzLl9jb25maWcuY2xpZW50LmtlZXBBbGl2ZSA9PT0gJ251bWJlcicgJiYgdGhpcy5fY29uZmlnLmNsaWVudC5rZWVwQWxpdmUgPiAwKSB7XG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUoJ0F0dGVtcHRpbmcgdG8gcmVlc3RhYmxpc2ggV2ViU29ja2V0JywgJ2luZm8nKVxuICAgICAgICAgICAgdGhpcy5vcGVuKClcbiAgICAgICAgICB9LCB0aGlzLl9jb25maWcuY2xpZW50LmtlZXBBbGl2ZSlcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbm5lY3Rpb25JZDtcbiAgfVxufVxuIl19