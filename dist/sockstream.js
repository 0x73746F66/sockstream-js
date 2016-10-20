'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StreamSocketClient = function () {
  /**
   * @param {string|Object} host Either define the host name (and further optional attributes), OR pass in a configuration object
   * @param port
   * @param secure
   * @param keepAlive
   * @param debugLevel
   */
  function StreamSocketClient() {
    var host = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'localhost';
    var port = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8082;
    var secure = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    var _this = this;

    var keepAlive = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 800;
    var debugLevel = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;

    _classCallCheck(this, StreamSocketClient);

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
        version: 0.1,
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

  _createClass(StreamSocketClient, [{
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
        var _id = StreamSocketClient.generateUUID();
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
      var connectionId = StreamSocketClient.generateUUID();
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
          var parsed = StreamSocketClient.parseMessage(e.data);
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

  return StreamSocketClient;
}();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNvY2tzdHJlYW0uanMiXSwibmFtZXMiOlsiU3RyZWFtU29ja2V0Q2xpZW50IiwiaG9zdCIsInBvcnQiLCJzZWN1cmUiLCJrZWVwQWxpdmUiLCJkZWJ1Z0xldmVsIiwiY2FsbGJhY2tSZWdpc3RlciIsInBpbmciLCJzZW5kIiwiY29uc29sZSIsIm1lc3NhZ2UiLCJzeXN0ZW0iLCJkaXNjb25uZWN0IiwiY29ubmVjdGlvbnMiLCJfY29uZmlnIiwiY2xpZW50IiwibmFtZSIsInZlcnNpb24iLCJzZXJ2ZXIiLCJob3N0bmFtZSIsInByb3RvIiwiT2JqZWN0IiwiYXNzaWduIiwidHlwZSIsImxldmVsTWFwIiwic2V0dGluZyIsImRlYnVnIiwiY29ubmVjdGlvbklkIiwiaWQiLCJsYXN0Q29ubmVjdGlvbklkIiwicHVzaCIsImNsb3NlIiwiY2IiLCJyZWFkeVN0YXRlIiwiT1BFTiIsIl9pZCIsImdlbmVyYXRlVVVJRCIsIkpTT04iLCJzdHJpbmdpZnkiLCJXZWJTb2NrZXQiLCJDT05ORUNUSU5HIiwib25vcGVuIiwic2V0VGltZW91dCIsIm9uZXJyb3IiLCJlIiwib25tZXNzYWdlIiwicGFyc2VkIiwicGFyc2VNZXNzYWdlIiwiZGF0YSIsIl90eXBlIiwiY2FsbCIsIl9zeXN0ZW0iLCJvbmNsb3NlIiwiaW5kZXhPZiIsIm9wZW4iLCJkIiwiRGF0ZSIsImdldFRpbWUiLCJ3aW5kb3ciLCJwZXJmb3JtYW5jZSIsIm5vdyIsInJlcGxhY2UiLCJjIiwiciIsIk1hdGgiLCJyYW5kb20iLCJmbG9vciIsInRvU3RyaW5nIiwicGFyc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0lBQU1BLGtCO0FBQ0o7Ozs7Ozs7QUFPQSxnQ0FBNkY7QUFBQSxRQUFqRkMsSUFBaUYsdUVBQTFFLFdBQTBFO0FBQUEsUUFBN0RDLElBQTZELHVFQUF0RCxJQUFzRDtBQUFBLFFBQWhEQyxNQUFnRCx1RUFBdkMsSUFBdUM7O0FBQUE7O0FBQUEsUUFBakNDLFNBQWlDLHVFQUFyQixHQUFxQjtBQUFB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QU8sSUFBUDtBQUNELE9BRkQsTUFFTyxJQUFJLE9BQU9BLE9BQVAsS0FBbUIsUUFBdkIsRUFBaUM7QUFDdEMsZUFBTzJCLEtBQUsrQixLQUFMLENBQVcxRCxPQUFYLENBQVA7QUFDRCxPQUZNLE1BRUE7QUFDTCxlQUFPQSxPQUFQO0FBQ0Q7QUFDRiIsImZpbGUiOiJzb2Nrc3RyZWFtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgU3RyZWFtU29ja2V0Q2xpZW50IHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7c3RyaW5nfE9iamVjdH0gaG9zdCBFaXRoZXIgZGVmaW5lIHRoZSBob3N0IG5hbWUgKGFuZCBmdXJ0aGVyIG9wdGlvbmFsIGF0dHJpYnV0ZXMpLCBPUiBwYXNzIGluIGEgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICogQHBhcmFtIHBvcnRcbiAgICogQHBhcmFtIHNlY3VyZVxuICAgKiBAcGFyYW0ga2VlcEFsaXZlXG4gICAqIEBwYXJhbSBkZWJ1Z0xldmVsXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihob3N0ID0gJ2xvY2FsaG9zdCcsIHBvcnQgPSA4MDgyLCBzZWN1cmUgPSB0cnVlLCBrZWVwQWxpdmUgPSA4MDAsIGRlYnVnTGV2ZWwgPSAwKSB7XG4gICAgdGhpcy5jYWxsYmFja1JlZ2lzdGVyID0ge1xuICAgICAgcGluZzogbWVzc2FnZSA9PiB7XG4gICAgICAgIHRoaXMuc2VuZCgncG9uZycpXG4gICAgICAgIHRoaXMuY29uc29sZShbJ1tQSU5HXScsIG1lc3NhZ2VdKVxuICAgICAgfSxcbiAgICAgIHN5c3RlbTogbWVzc2FnZSA9PiB7XG4gICAgICAgIHRoaXMuY29uc29sZShbJ1tTWVNURU1dJywgbWVzc2FnZV0pXG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZGlzY29ubmVjdCA9IFtdO1xuICAgIHRoaXMuY29ubmVjdGlvbnMgPSB7fTtcbiAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICBjbGllbnQ6IHtcbiAgICAgICAgbmFtZTogJ3NvY2tzdHJlYW0uanMnLFxuICAgICAgICB2ZXJzaW9uOiAwLjEsXG4gICAgICAgIGRlYnVnTGV2ZWw6IDAsXG4gICAgICAgIGtlZXBBbGl2ZTogODAwXG4gICAgICB9LFxuICAgICAgc2VydmVyOiB7XG4gICAgICAgIG5hbWU6ICdzb2NrZXRzL3BocC1zdHJlYW0tc29ja2V0LXNlcnZlcicsXG4gICAgICAgIHZlcnNpb246IDEuMyxcbiAgICAgICAgaG9zdG5hbWU6ICdsb2NhbGhvc3QnLFxuICAgICAgICBwb3J0OiA4MDgyLFxuICAgICAgICBwcm90bzogJ3dzczovLydcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBob3N0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHR5cGVvZiBob3N0LmNsaWVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5fY29uZmlnLmNsaWVudCA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgIGRlYnVnTGV2ZWw6IDAsXG4gICAgICAgICAga2VlcEFsaXZlOiA4MDBcbiAgICAgICAgfSwgaG9zdC5jbGllbnQsIHtcbiAgICAgICAgICBuYW1lOiAnc29ja3N0cmVhbS5qcycsXG4gICAgICAgICAgdmVyc2lvbjogMC4xXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIGhvc3Quc2VydmVyID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLl9jb25maWcuc2VydmVyID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgaG9zdG5hbWU6ICdsb2NhbGhvc3QnLFxuICAgICAgICAgIHBvcnQ6IDgwODIsXG4gICAgICAgICAgcHJvdG86ICd3c3M6Ly8nXG4gICAgICAgIH0sIGhvc3Quc2VydmVyLCB7XG4gICAgICAgICAgbmFtZTogJ3NvY2tldHMvcGhwLXN0cmVhbS1zb2NrZXQtc2VydmVyJyxcbiAgICAgICAgICB2ZXJzaW9uOiAxLjNcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICBjbGllbnQ6IHtcbiAgICAgICAgICBuYW1lOiAnc29ja3N0cmVhbS5qcycsXG4gICAgICAgICAgdmVyc2lvbjogMC4xLFxuICAgICAgICAgIGRlYnVnTGV2ZWw6IGRlYnVnTGV2ZWwsXG4gICAgICAgICAga2VlcEFsaXZlOiBrZWVwQWxpdmVcbiAgICAgICAgfSxcbiAgICAgICAgc2VydmVyOiB7XG4gICAgICAgICAgbmFtZTogJ3NvY2tldHMvcGhwLXN0cmVhbS1zb2NrZXQtc2VydmVyJyxcbiAgICAgICAgICB2ZXJzaW9uOiAxLjMsXG4gICAgICAgICAgaG9zdG5hbWU6IGhvc3QsXG4gICAgICAgICAgcG9ydDogcG9ydCxcbiAgICAgICAgICBwcm90bzogISFzZWN1cmUgPyAnd3NzOi8vJyA6ICd3czovLydcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnNvbGUobWVzc2FnZSwgdHlwZSA9ICdsb2cnKSB7XG4gICAgbGV0IGxldmVsTWFwID0ge1xuICAgICAgJ2xvZyc6IDQsXG4gICAgICAnZGVidWcnOiAzLFxuICAgICAgJ2luZm8nOiAyLFxuICAgICAgJ3dhcm4nOiAxLFxuICAgICAgJ2Vycm9yJzogMFxuICAgIH1cbiAgICB0aGlzLl9jb25maWcuY2xpZW50LmRlYnVnTGV2ZWwgPj0gKGxldmVsTWFwW3R5cGVdfHwwKSAmJiBjb25zb2xlW3R5cGVdKG1lc3NhZ2UpXG4gIH1cblxuICAvKipcbiAgICogRWl0aGVyIHJldHJpZXZlcyBvciBzZXRzIHRoZSBkZWJ1ZyBjb25maWcgdmFsdWVcbiAgICogQHBhcmFtIHNldHRpbmdcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBkZWJ1ZyhzZXR0aW5nKSB7XG4gICAgaWYgKHR5cGVvZiBzZXR0aW5nICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5fY29uZmlnLmNsaWVudC5kZWJ1ZyA9ICEhc2V0dGluZ1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29uZmlnLmNsaWVudC5kZWJ1Z1xuICB9XG5cbiAgc3RhdGljIGdlbmVyYXRlVVVJRCgpIHtcbiAgICBsZXQgZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGlmICh3aW5kb3cucGVyZm9ybWFuY2UgJiYgdHlwZW9mIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGQgKz0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfVxuICAgIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uIChjKSB7XG4gICAgICBsZXQgciA9IChkICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMDtcbiAgICAgIGQgPSBNYXRoLmZsb29yKGQgLyAxNik7XG4gICAgICByZXR1cm4gKGMgPT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KSkudG9TdHJpbmcoMTYpO1xuICAgIH0pXG4gIH1cblxuICBzdGF0aWMgcGFyc2VNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gSlNPTi5wYXJzZShtZXNzYWdlKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9XG4gIH1cblxuICBjbG9zZShjb25uZWN0aW9uSWQgPSBudWxsKSB7XG4gICAgbGV0IGlkID0gY29ubmVjdGlvbklkIHx8IHRoaXMubGFzdENvbm5lY3Rpb25JZDtcbiAgICBpZiAodHlwZW9mIHRoaXMuY29ubmVjdGlvbnNbaWRdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5kaXNjb25uZWN0LnB1c2goaWQpXG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2lkXS5jbG9zZSgpXG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlXG4gICAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufSBjYiBlaXRoZXIgZGVmaW5lIGEgY2xvc3VyZSBvciBwYXNzIGluIGEgY29ubmVjdGlvbklkXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc2VuZChtZXNzYWdlLCBjYikge1xuICAgIGxldCBjb25uZWN0aW9uSWQgPSB0aGlzLmxhc3RDb25uZWN0aW9uSWRcbiAgICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB0aGlzLmNvbm5lY3Rpb25zW2NiXSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICB0aGlzLmxhc3RDb25uZWN0aW9uSWQgPSBjb25uZWN0aW9uSWQgPSBjYlxuICAgIH1cbiAgICBpZiAodHlwZW9mIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5yZWFkeVN0YXRlID09PSB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0uT1BFTikge1xuICAgICAgbGV0IF9pZCA9IFN0cmVhbVNvY2tldENsaWVudC5nZW5lcmF0ZVVVSUQoKVxuICAgICAgaWYgKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbX2lkXSA9IGNiXG4gICAgICB9XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0uc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICdAbWV0YSc6IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICdfaWQnOiBfaWRcbiAgICAgICAgfSwgdGhpcy5fY29uZmlnKSxcbiAgICAgICAgJ21lc3NhZ2UnOiBtZXNzYWdlXG4gICAgICB9KSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29uc29sZSgnV2ViU29ja2V0IG5vdCBvcGVuJywgJ3dhcm4nKVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIG5ldyBXZWJTb2NrZXQgY29ubmVjdGlvbiwgaXQgZG9lcyBub3Qgb3Zlci13cml0ZSBleGlzdGluZyBvcGVuIGNvbm5lY3Rpb25zXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IGNvbm5lY3Rpb25JZFxuICAgKi9cbiAgb3BlbihjYikge1xuICAgIHRoaXMuY29uc29sZShbJ1tDT05ORUNUSU5HXScsYCR7dGhpcy5fY29uZmlnLnNlcnZlci5wcm90b30ke3RoaXMuX2NvbmZpZy5zZXJ2ZXIuaG9zdG5hbWV9OiR7dGhpcy5fY29uZmlnLnNlcnZlci5wb3J0fWBdLCAnaW5mbycpXG4gICAgbGV0IGNvbm5lY3Rpb25JZCA9IFN0cmVhbVNvY2tldENsaWVudC5nZW5lcmF0ZVVVSUQoKVxuICAgIHRoaXMubGFzdENvbm5lY3Rpb25JZCA9IGNvbm5lY3Rpb25JZFxuICAgIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXSA9IG5ldyBXZWJTb2NrZXQoYCR7dGhpcy5fY29uZmlnLnNlcnZlci5wcm90b30ke3RoaXMuX2NvbmZpZy5zZXJ2ZXIuaG9zdG5hbWV9OiR7dGhpcy5fY29uZmlnLnNlcnZlci5wb3J0fWApXG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5yZWFkeVN0YXRlID09PSB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0uQ09OTkVDVElORykge1xuICAgICAgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5jb25zb2xlKCdjb25uZWN0ZWQnLCAnaW5mbycpXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuc2VuZCgnY29ubmVjdGluZycsIGNiKVxuICAgICAgICB9LCAyMClcbiAgICAgIH1cbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5vbmVycm9yID0gZSA9PiB7XG4gICAgICAgIHRoaXMuY29uc29sZShbJ1dlYlNvY2tldCBlcnJvcicsIGVdLCAnZXJyb3InKVxuICAgICAgfVxuICAgICAgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLm9ubWVzc2FnZSA9IGUgPT4ge1xuICAgICAgICBsZXQgcGFyc2VkID0gU3RyZWFtU29ja2V0Q2xpZW50LnBhcnNlTWVzc2FnZShlLmRhdGEpO1xuICAgICAgICBpZiAocGFyc2VkICYmIHR5cGVvZiBwYXJzZWRbJ0BtZXRhJ10gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbcGFyc2VkWydAbWV0YSddLl90eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja1JlZ2lzdGVyW3BhcnNlZFsnQG1ldGEnXS5fdHlwZV0uY2FsbCh0aGlzLl9jb25maWcsIHBhcnNlZFsnQG1ldGEnXS5fc3lzdGVtKVxuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuY2FsbGJhY2tSZWdpc3RlcltwYXJzZWRbJ0BtZXRhJ10uX2lkXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja1JlZ2lzdGVyW3BhcnNlZFsnQG1ldGEnXS5faWRdLmNhbGwodGhpcy5fY29uZmlnLCBwYXJzZWQubWVzc2FnZSB8fCBudWxsKVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2FsbGJhY2tSZWdpc3RlcltwYXJzZWRbJ0BtZXRhJ10uX2lkXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnNvbGUoWydbUkNWRF0nLCBwYXJzZWRdLCAnZGVidWcnKVxuICAgICAgfVxuICAgICAgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLm9uY2xvc2UgPSBlID0+IHtcbiAgICAgICAgdGhpcy5jb25zb2xlKFsnV2ViU29ja2V0IGNsb3NlZCcsIGVdLCAnd2FybicpXG4gICAgICAgIGlmICh0aGlzLmRpc2Nvbm5lY3QuaW5kZXhPZihjb25uZWN0aW9uSWQpID09PSAtMSAmJiB0eXBlb2YgdGhpcy5fY29uZmlnLmNsaWVudC5rZWVwQWxpdmUgPT09ICdudW1iZXInICYmIHRoaXMuX2NvbmZpZy5jbGllbnQua2VlcEFsaXZlID4gMCkge1xuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb25zb2xlKCdBdHRlbXB0aW5nIHRvIHJlZXN0YWJsaXNoIFdlYlNvY2tldCcsICdpbmZvJylcbiAgICAgICAgICAgIHRoaXMub3BlbigpXG4gICAgICAgICAgfSwgdGhpcy5fY29uZmlnLmNsaWVudC5rZWVwQWxpdmUpXG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb25uZWN0aW9uSWQ7XG4gIH1cbn1cbiJdfQ==