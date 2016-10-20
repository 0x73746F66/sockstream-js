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
        name: 'stream-socket-client.js',
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
          name: 'stream-socket-client.js',
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
          name: 'stream-socket-client.js',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0cmVhbS1zb2NrZXQtY2xpZW50LmpzIl0sIm5hbWVzIjpbIlN0cmVhbVNvY2tldENsaWVudCIsImhvc3QiLCJwb3J0Iiwic2VjdXJlIiwia2VlcEFsaXZlIiwiZGVidWdMZXZlbCIsImNhbGxiYWNrUmVnaXN0ZXIiLCJwaW5nIiwic2VuZCIsImNvbnNvbGUiLCJtZXNzYWdlIiwic3lzdGVtIiwiZGlzY29ubmVjdCIsImNvbm5lY3Rpb25zIiwiX2NvbmZpZyIsImNsaWVudCIsIm5hbWUiLCJ2ZXJzaW9uIiwic2VydmVyIiwiaG9zdG5hbWUiLCJwcm90byIsIk9iamVjdCIsImFzc2lnbiIsInR5cGUiLCJsZXZlbE1hcCIsInNldHRpbmciLCJkZWJ1ZyIsImNvbm5lY3Rpb25JZCIsImlkIiwibGFzdENvbm5lY3Rpb25JZCIsInB1c2giLCJjbG9zZSIsImNiIiwicmVhZHlTdGF0ZSIsIk9QRU4iLCJfaWQiLCJnZW5lcmF0ZVVVSUQiLCJKU09OIiwic3RyaW5naWZ5IiwiV2ViU29ja2V0IiwiQ09OTkVDVElORyIsIm9ub3BlbiIsInNldFRpbWVvdXQiLCJvbmVycm9yIiwiZSIsIm9ubWVzc2FnZSIsInBhcnNlZCIsInBhcnNlTWVzc2FnZSIsImRhdGEiLCJfdHlwZSIsImNhbGwiLCJfc3lzdGVtIiwib25jbG9zZSIsImluZGV4T2YiLCJvcGVuIiwiZCIsIkRhdGUiLCJnZXRUaW1lIiwid2luZG93IiwicGVyZm9ybWFuY2UiLCJub3ciLCJyZXBsYWNlIiwiYyIsInIiLCJNYXRoIiwicmFuZG9tIiwiZmxvb3IiLCJ0b1N0cmluZyIsInBhcnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztJQUFNQSxrQjtBQUNKOzs7Ozs7O0FBT0EsZ0NBQTZGO0FBQUEsUUFBakZDLElBQWlGLHVFQUExRSxXQUEwRTtBQUFBLFFBQTdEQyxJQUE2RCx1RUFBdEQsSUFBc0Q7QUFBQSxRQUFoREMsTUFBZ0QsdUVBQXZDLElBQXVDOztBQUFBOztBQUFBLFFBQWpDQyxTQUFpQyx1RUFBckIsR0FBcUI7QUFBQSxRQUFoQkMsVUFBZ0IsdUVBQUgsQ0FBRzs7QUFBQTs7QUFDM0YsU0FBS0MsZ0JBQUwsR0FBd0I7QUFDdEJDLFlBQU0sdUJBQVc7QUFDZixjQUFLQyxJQUFMLENBQVUsTUFBVjtBQUNBLGNBQUtDLE9BQUwsQ0FBYSxDQUFDLFFBQUQsRUFBV0MsT0FBWCxDQUFiO0FBQ0QsT0FKcUI7QUFLdEJDLGNBQVEseUJBQVc7QUFDakIsY0FBS0YsT0FBTCxDQUFhLENBQUMsVUFBRCxFQUFhQyxPQUFiLENBQWI7QUFDRDtBQVBxQixLQUF4QjtBQVNBLFNBQUtFLFVBQUwsR0FBa0IsRUFBbEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CLEVBQW5CO0FBQ0EsU0FBS0MsT0FBTCxHQUFlO0FBQ2JDLGNBQVE7QUFDTkMsY0FBTSx5QkFEQTtBQUVOQyxpQkFBUyxHQUZIO0FBR05aLG9CQUFZLENBSE47QUFJTkQsbUJBQVc7QUFKTCxPQURLO0FBT2JjLGNBQVE7QUFDTkYsY0FBTSxrQ0FEQTtBQUVOQyxpQkFBUyxHQUZIO0FBR05FLGtCQUFVLFdBSEo7QUFJTmpCLGNBQU0sSUFKQTtBQUtOa0IsZUFBTztBQUxEO0FBUEssS0FBZjtBQWVBLFFBQUksUUFBT25CLElBQVAseUNBQU9BLElBQVAsT0FBZ0IsUUFBcEIsRUFBOEI7QUFDNUIsVUFBSSxRQUFPQSxLQUFLYyxNQUFaLE1BQXVCLFFBQTNCLEVBQXFDO0FBQ25DLGFBQUtELE9BQUwsQ0FBYUMsTUFBYixHQUFzQk0sT0FBT0MsTUFBUCxDQUFjO0FBQ2xDakIsc0JBQVksQ0FEc0I7QUFFbENELHFCQUFXO0FBRnVCLFNBQWQsRUFHbkJILEtBQUtjLE1BSGMsRUFHTjtBQUNkQyxnQkFBTSx5QkFEUTtBQUVkQyxtQkFBUztBQUZLLFNBSE0sQ0FBdEI7QUFPRDtBQUNELFVBQUksUUFBT2hCLEtBQUtpQixNQUFaLE1BQXVCLFFBQTNCLEVBQXFDO0FBQ25DLGFBQUtKLE9BQUwsQ0FBYUksTUFBYixHQUFzQkcsT0FBT0MsTUFBUCxDQUFjO0FBQ2xDSCxvQkFBVSxXQUR3QjtBQUVsQ2pCLGdCQUFNLElBRjRCO0FBR2xDa0IsaUJBQU87QUFIMkIsU0FBZCxFQUluQm5CLEtBQUtpQixNQUpjLEVBSU47QUFDZEYsZ0JBQU0sa0NBRFE7QUFFZEMsbUJBQVM7QUFGSyxTQUpNLENBQXRCO0FBUUQ7QUFDRixLQXBCRCxNQW9CTztBQUNMLFdBQUtILE9BQUwsR0FBZTtBQUNiQyxnQkFBUTtBQUNOQyxnQkFBTSx5QkFEQTtBQUVOQyxtQkFBUyxHQUZIO0FBR05aLHNCQUFZQSxVQUhOO0FBSU5ELHFCQUFXQTtBQUpMLFNBREs7QUFPYmMsZ0JBQVE7QUFDTkYsZ0JBQU0sa0NBREE7QUFFTkMsbUJBQVMsR0FGSDtBQUdORSxvQkFBVWxCLElBSEo7QUFJTkMsZ0JBQU1BLElBSkE7QUFLTmtCLGlCQUFPLENBQUMsQ0FBQ2pCLE1BQUYsR0FBVyxRQUFYLEdBQXNCO0FBTHZCO0FBUEssT0FBZjtBQWVEO0FBQ0Y7Ozs7Ozs7Ozs7Ozs7O2dCQUVPTyxPLEVBQXVCO0FBQUEsVUFBZGEsSUFBYyx1RUFBUCxLQUFPOztBQUM3QixVQUFJQyxXQUFXO0FBQ2IsZUFBTyxDQURNO0FBRWIsaUJBQVMsQ0FGSTtBQUdiLGdCQUFRLENBSEs7QUFJYixnQkFBUSxDQUpLO0FBS2IsaUJBQVM7QUFMSSxPQUFmO0FBT0EsV0FBS1YsT0FBTCxDQUFhQyxNQUFiLENBQW9CVixVQUFwQixLQUFtQ21CLFNBQVNELElBQVQsS0FBZ0IsQ0FBbkQsS0FBeURkLFFBQVFjLElBQVIsRUFBY2IsT0FBZCxDQUF6RDtBQUNELEs7O0FBRUQ7Ozs7Ozs7OzBCQUtNZSxPLEVBQVM7QUFDYixVQUFJLE9BQU9BLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbEMsYUFBS1gsT0FBTCxDQUFhQyxNQUFiLENBQW9CVyxLQUFwQixHQUE0QixDQUFDLENBQUNELE9BQTlCO0FBQ0Q7QUFDRCxhQUFPLEtBQUtYLE9BQUwsQ0FBYUMsTUFBYixDQUFvQlcsS0FBM0I7QUFDRDs7OzRCQXdCMEI7QUFBQSxVQUFyQkMsWUFBcUIsdUVBQU4sSUFBTTs7QUFDekIsVUFBSUMsS0FBS0QsZ0JBQWdCLEtBQUtFLGdCQUE5QjtBQUNBLFVBQUksT0FBTyxLQUFLaEIsV0FBTCxDQUFpQmUsRUFBakIsQ0FBUCxLQUFnQyxXQUFwQyxFQUFpRDtBQUMvQyxhQUFLaEIsVUFBTCxDQUFnQmtCLElBQWhCLENBQXFCRixFQUFyQjtBQUNBLGFBQUtmLFdBQUwsQ0FBaUJlLEVBQWpCLEVBQXFCRyxLQUFyQjtBQUNEO0FBQ0QsYUFBTyxJQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7O3lCQUtLckIsTyxFQUFTc0IsRSxFQUFJO0FBQ2hCLFVBQUlMLGVBQWUsS0FBS0UsZ0JBQXhCO0FBQ0EsVUFBSSxPQUFPRyxFQUFQLEtBQWMsVUFBZCxJQUE0QixPQUFPLEtBQUtuQixXQUFMLENBQWlCbUIsRUFBakIsQ0FBUCxLQUFnQyxXQUFoRSxFQUE4RTtBQUM1RSxhQUFLSCxnQkFBTCxHQUF3QkYsZUFBZUssRUFBdkM7QUFDRDtBQUNELFVBQUksT0FBTyxLQUFLbkIsV0FBTCxDQUFpQmMsWUFBakIsQ0FBUCxLQUEwQyxXQUE5QyxFQUE0RDtBQUMxRCxlQUFPLEtBQVA7QUFDRDs7QUFFRCxVQUFJLEtBQUtkLFdBQUwsQ0FBaUJjLFlBQWpCLEVBQStCTSxVQUEvQixLQUE4QyxLQUFLcEIsV0FBTCxDQUFpQmMsWUFBakIsRUFBK0JPLElBQWpGLEVBQXVGO0FBQ3JGLFlBQUlDLE1BQU1uQyxtQkFBbUJvQyxZQUFuQixFQUFWO0FBQ0EsWUFBSSxPQUFPSixFQUFQLEtBQWMsVUFBbEIsRUFBOEI7QUFDNUIsZUFBSzFCLGdCQUFMLENBQXNCNkIsR0FBdEIsSUFBNkJILEVBQTdCO0FBQ0Q7QUFDRCxhQUFLbkIsV0FBTCxDQUFpQmMsWUFBakIsRUFBK0JuQixJQUEvQixDQUFvQzZCLEtBQUtDLFNBQUwsQ0FBZTtBQUNqRCxtQkFBU2pCLE9BQU9DLE1BQVAsQ0FBYztBQUNyQixtQkFBT2E7QUFEYyxXQUFkLEVBRU4sS0FBS3JCLE9BRkMsQ0FEd0M7QUFJakQscUJBQVdKO0FBSnNDLFNBQWYsQ0FBcEM7QUFNQSxlQUFPLElBQVA7QUFDRCxPQVpELE1BWU87QUFDTCxhQUFLRCxPQUFMLENBQWEsb0JBQWIsRUFBbUMsTUFBbkM7QUFDRDtBQUNELGFBQU8sS0FBUDtBQUNEOztBQUVEOzs7Ozs7Ozt5QkFLS3VCLEUsRUFBSTtBQUFBOztBQUNQLFdBQUt2QixPQUFMLENBQWEsQ0FBQyxjQUFELE9BQW1CLEtBQUtLLE9BQUwsQ0FBYUksTUFBYixDQUFvQkUsS0FBdkMsR0FBK0MsS0FBS04sT0FBTCxDQUFhSSxNQUFiLENBQW9CQyxRQUFuRSxTQUErRSxLQUFLTCxPQUFMLENBQWFJLE1BQWIsQ0FBb0JoQixJQUFuRyxDQUFiLEVBQXlILE1BQXpIO0FBQ0EsVUFBSXlCLGVBQWUzQixtQkFBbUJvQyxZQUFuQixFQUFuQjtBQUNBLFdBQUtQLGdCQUFMLEdBQXdCRixZQUF4QjtBQUNBLFdBQUtkLFdBQUwsQ0FBaUJjLFlBQWpCLElBQWlDLElBQUlZLFNBQUosTUFBaUIsS0FBS3pCLE9BQUwsQ0FBYUksTUFBYixDQUFvQkUsS0FBckMsR0FBNkMsS0FBS04sT0FBTCxDQUFhSSxNQUFiLENBQW9CQyxRQUFqRSxTQUE2RSxLQUFLTCxPQUFMLENBQWFJLE1BQWIsQ0FBb0JoQixJQUFqRyxDQUFqQztBQUNBLFVBQUksS0FBS1csV0FBTCxDQUFpQmMsWUFBakIsRUFBK0JNLFVBQS9CLEtBQThDLEtBQUtwQixXQUFMLENBQWlCYyxZQUFqQixFQUErQmEsVUFBakYsRUFBNkY7QUFDM0YsYUFBSzNCLFdBQUwsQ0FBaUJjLFlBQWpCLEVBQStCYyxNQUEvQixHQUF3QyxZQUFNO0FBQzVDLGlCQUFLaEMsT0FBTCxDQUFhLFdBQWIsRUFBMEIsTUFBMUI7QUFDQWlDLHFCQUFXLFlBQU07QUFDZixtQkFBS2xDLElBQUwsQ0FBVSxZQUFWLEVBQXdCd0IsRUFBeEI7QUFDRCxXQUZELEVBRUcsRUFGSDtBQUdELFNBTEQ7QUFNQSxhQUFLbkIsV0FBTCxDQUFpQmMsWUFBakIsRUFBK0JnQixPQUEvQixHQUF5QyxhQUFLO0FBQzVDLGlCQUFLbEMsT0FBTCxDQUFhLENBQUMsaUJBQUQsRUFBb0JtQyxDQUFwQixDQUFiLEVBQXFDLE9BQXJDO0FBQ0QsU0FGRDtBQUdBLGFBQUsvQixXQUFMLENBQWlCYyxZQUFqQixFQUErQmtCLFNBQS9CLEdBQTJDLGFBQUs7QUFDOUMsY0FBSUMsU0FBUzlDLG1CQUFtQitDLFlBQW5CLENBQWdDSCxFQUFFSSxJQUFsQyxDQUFiO0FBQ0EsY0FBSUYsVUFBVSxPQUFPQSxPQUFPLE9BQVAsQ0FBUCxLQUEyQixXQUF6QyxFQUFzRDtBQUNwRCxnQkFBSSxPQUFPLE9BQUt4QyxnQkFBTCxDQUFzQndDLE9BQU8sT0FBUCxFQUFnQkcsS0FBdEMsQ0FBUCxLQUF3RCxVQUE1RCxFQUF3RTtBQUN0RSxxQkFBSzNDLGdCQUFMLENBQXNCd0MsT0FBTyxPQUFQLEVBQWdCRyxLQUF0QyxFQUE2Q0MsSUFBN0MsQ0FBa0QsT0FBS3BDLE9BQXZELEVBQWdFZ0MsT0FBTyxPQUFQLEVBQWdCSyxPQUFoRjtBQUNELGFBRkQsTUFFTyxJQUFJLE9BQU8sT0FBSzdDLGdCQUFMLENBQXNCd0MsT0FBTyxPQUFQLEVBQWdCWCxHQUF0QyxDQUFQLEtBQXNELFVBQTFELEVBQXNFO0FBQzNFLHFCQUFLN0IsZ0JBQUwsQ0FBc0J3QyxPQUFPLE9BQVAsRUFBZ0JYLEdBQXRDLEVBQTJDZSxJQUEzQyxDQUFnRCxPQUFLcEMsT0FBckQsRUFBOERnQyxPQUFPcEMsT0FBUCxJQUFrQixJQUFoRjtBQUNBLHFCQUFPLE9BQUtKLGdCQUFMLENBQXNCd0MsT0FBTyxPQUFQLEVBQWdCWCxHQUF0QyxDQUFQO0FBQ0Q7QUFDRjtBQUNELGlCQUFLMUIsT0FBTCxDQUFhLENBQUMsUUFBRCxFQUFXcUMsTUFBWCxDQUFiLEVBQWlDLE9BQWpDO0FBQ0QsU0FYRDtBQVlBLGFBQUtqQyxXQUFMLENBQWlCYyxZQUFqQixFQUErQnlCLE9BQS9CLEdBQXlDLGFBQUs7QUFDNUMsaUJBQUszQyxPQUFMLENBQWEsQ0FBQyxrQkFBRCxFQUFxQm1DLENBQXJCLENBQWIsRUFBc0MsTUFBdEM7QUFDQSxjQUFJLE9BQUtoQyxVQUFMLENBQWdCeUMsT0FBaEIsQ0FBd0IxQixZQUF4QixNQUEwQyxDQUFDLENBQTNDLElBQWdELE9BQU8sT0FBS2IsT0FBTCxDQUFhQyxNQUFiLENBQW9CWCxTQUEzQixLQUF5QyxRQUF6RixJQUFxRyxPQUFLVSxPQUFMLENBQWFDLE1BQWIsQ0FBb0JYLFNBQXBCLEdBQWdDLENBQXpJLEVBQTRJO0FBQzFJc0MsdUJBQVcsWUFBTTtBQUNmLHFCQUFLakMsT0FBTCxDQUFhLHFDQUFiLEVBQW9ELE1BQXBEO0FBQ0EscUJBQUs2QyxJQUFMO0FBQ0QsYUFIRCxFQUdHLE9BQUt4QyxPQUFMLENBQWFDLE1BQWIsQ0FBb0JYLFNBSHZCO0FBSUQ7QUFDRCxpQkFBTyxPQUFLUyxXQUFMLENBQWlCYyxZQUFqQixDQUFQO0FBQ0QsU0FURDtBQVVEOztBQUVELGFBQU9BLFlBQVA7QUFDRDs7O21DQTVHcUI7QUFDcEIsVUFBSTRCLElBQUksSUFBSUMsSUFBSixHQUFXQyxPQUFYLEVBQVI7QUFDQSxVQUFJQyxPQUFPQyxXQUFQLElBQXNCLE9BQU9ELE9BQU9DLFdBQVAsQ0FBbUJDLEdBQTFCLEtBQWtDLFVBQTVELEVBQXdFO0FBQ3RFTCxhQUFLSSxZQUFZQyxHQUFaLEVBQUw7QUFDRDtBQUNELGFBQU8sdUNBQXVDQyxPQUF2QyxDQUErQyxPQUEvQyxFQUF3RCxVQUFVQyxDQUFWLEVBQWE7QUFDMUUsWUFBSUMsSUFBSSxDQUFDUixJQUFJUyxLQUFLQyxNQUFMLEtBQWdCLEVBQXJCLElBQTJCLEVBQTNCLEdBQWdDLENBQXhDO0FBQ0FWLFlBQUlTLEtBQUtFLEtBQUwsQ0FBV1gsSUFBSSxFQUFmLENBQUo7QUFDQSxlQUFPLENBQUNPLEtBQUssR0FBTCxHQUFXQyxDQUFYLEdBQWdCQSxJQUFJLEdBQUosR0FBVSxHQUEzQixFQUFpQ0ksUUFBakMsQ0FBMEMsRUFBMUMsQ0FBUDtBQUNELE9BSk0sQ0FBUDtBQUtEOzs7aUNBRW1CekQsTyxFQUFTO0FBQzNCLFVBQUksT0FBT0EsT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQyxlQUFPLElBQVA7QUFDRCxPQUZELE1BRU8sSUFBSSxPQUFPQSxPQUFQLEtBQW1CLFFBQXZCLEVBQWlDO0FBQ3RDLGVBQU8yQixLQUFLK0IsS0FBTCxDQUFXMUQsT0FBWCxDQUFQO0FBQ0QsT0FGTSxNQUVBO0FBQ0wsZUFBT0EsT0FBUDtBQUNEO0FBQ0YiLCJmaWxlIjoic3RyZWFtLXNvY2tldC1jbGllbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjbGFzcyBTdHJlYW1Tb2NrZXRDbGllbnQge1xuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd8T2JqZWN0fSBob3N0IEVpdGhlciBkZWZpbmUgdGhlIGhvc3QgbmFtZSAoYW5kIGZ1cnRoZXIgb3B0aW9uYWwgYXR0cmlidXRlcyksIE9SIHBhc3MgaW4gYSBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgKiBAcGFyYW0gcG9ydFxuICAgKiBAcGFyYW0gc2VjdXJlXG4gICAqIEBwYXJhbSBrZWVwQWxpdmVcbiAgICogQHBhcmFtIGRlYnVnTGV2ZWxcbiAgICovXG4gIGNvbnN0cnVjdG9yKGhvc3QgPSAnbG9jYWxob3N0JywgcG9ydCA9IDgwODIsIHNlY3VyZSA9IHRydWUsIGtlZXBBbGl2ZSA9IDgwMCwgZGVidWdMZXZlbCA9IDApIHtcbiAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXIgPSB7XG4gICAgICBwaW5nOiBtZXNzYWdlID0+IHtcbiAgICAgICAgdGhpcy5zZW5kKCdwb25nJylcbiAgICAgICAgdGhpcy5jb25zb2xlKFsnW1BJTkddJywgbWVzc2FnZV0pXG4gICAgICB9LFxuICAgICAgc3lzdGVtOiBtZXNzYWdlID0+IHtcbiAgICAgICAgdGhpcy5jb25zb2xlKFsnW1NZU1RFTV0nLCBtZXNzYWdlXSlcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5kaXNjb25uZWN0ID0gW107XG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IHt9O1xuICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgIGNsaWVudDoge1xuICAgICAgICBuYW1lOiAnc3RyZWFtLXNvY2tldC1jbGllbnQuanMnLFxuICAgICAgICB2ZXJzaW9uOiAwLjEsXG4gICAgICAgIGRlYnVnTGV2ZWw6IDAsXG4gICAgICAgIGtlZXBBbGl2ZTogODAwXG4gICAgICB9LFxuICAgICAgc2VydmVyOiB7XG4gICAgICAgIG5hbWU6ICdzb2NrZXRzL3BocC1zdHJlYW0tc29ja2V0LXNlcnZlcicsXG4gICAgICAgIHZlcnNpb246IDEuMyxcbiAgICAgICAgaG9zdG5hbWU6ICdsb2NhbGhvc3QnLFxuICAgICAgICBwb3J0OiA4MDgyLFxuICAgICAgICBwcm90bzogJ3dzczovLydcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBob3N0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHR5cGVvZiBob3N0LmNsaWVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5fY29uZmlnLmNsaWVudCA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgIGRlYnVnTGV2ZWw6IDAsXG4gICAgICAgICAga2VlcEFsaXZlOiA4MDBcbiAgICAgICAgfSwgaG9zdC5jbGllbnQsIHtcbiAgICAgICAgICBuYW1lOiAnc3RyZWFtLXNvY2tldC1jbGllbnQuanMnLFxuICAgICAgICAgIHZlcnNpb246IDAuMVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBob3N0LnNlcnZlciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5fY29uZmlnLnNlcnZlciA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgIGhvc3RuYW1lOiAnbG9jYWxob3N0JyxcbiAgICAgICAgICBwb3J0OiA4MDgyLFxuICAgICAgICAgIHByb3RvOiAnd3NzOi8vJ1xuICAgICAgICB9LCBob3N0LnNlcnZlciwge1xuICAgICAgICAgIG5hbWU6ICdzb2NrZXRzL3BocC1zdHJlYW0tc29ja2V0LXNlcnZlcicsXG4gICAgICAgICAgdmVyc2lvbjogMS4zXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgY2xpZW50OiB7XG4gICAgICAgICAgbmFtZTogJ3N0cmVhbS1zb2NrZXQtY2xpZW50LmpzJyxcbiAgICAgICAgICB2ZXJzaW9uOiAwLjEsXG4gICAgICAgICAgZGVidWdMZXZlbDogZGVidWdMZXZlbCxcbiAgICAgICAgICBrZWVwQWxpdmU6IGtlZXBBbGl2ZVxuICAgICAgICB9LFxuICAgICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgICBuYW1lOiAnc29ja2V0cy9waHAtc3RyZWFtLXNvY2tldC1zZXJ2ZXInLFxuICAgICAgICAgIHZlcnNpb246IDEuMyxcbiAgICAgICAgICBob3N0bmFtZTogaG9zdCxcbiAgICAgICAgICBwb3J0OiBwb3J0LFxuICAgICAgICAgIHByb3RvOiAhIXNlY3VyZSA/ICd3c3M6Ly8nIDogJ3dzOi8vJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc29sZShtZXNzYWdlLCB0eXBlID0gJ2xvZycpIHtcbiAgICBsZXQgbGV2ZWxNYXAgPSB7XG4gICAgICAnbG9nJzogNCxcbiAgICAgICdkZWJ1Zyc6IDMsXG4gICAgICAnaW5mbyc6IDIsXG4gICAgICAnd2Fybic6IDEsXG4gICAgICAnZXJyb3InOiAwXG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZy5jbGllbnQuZGVidWdMZXZlbCA+PSAobGV2ZWxNYXBbdHlwZV18fDApICYmIGNvbnNvbGVbdHlwZV0obWVzc2FnZSlcbiAgfVxuXG4gIC8qKlxuICAgKiBFaXRoZXIgcmV0cmlldmVzIG9yIHNldHMgdGhlIGRlYnVnIGNvbmZpZyB2YWx1ZVxuICAgKiBAcGFyYW0gc2V0dGluZ1xuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGRlYnVnKHNldHRpbmcpIHtcbiAgICBpZiAodHlwZW9mIHNldHRpbmcgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLl9jb25maWcuY2xpZW50LmRlYnVnID0gISFzZXR0aW5nXG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb25maWcuY2xpZW50LmRlYnVnXG4gIH1cblxuICBzdGF0aWMgZ2VuZXJhdGVVVUlEKCkge1xuICAgIGxldCBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgaWYgKHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB0eXBlb2Ygd2luZG93LnBlcmZvcm1hbmNlLm5vdyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZCArPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9XG4gICAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24gKGMpIHtcbiAgICAgIGxldCByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuICAgICAgZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcbiAgICAgIHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG4gICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBwYXJzZU1lc3NhZ2UobWVzc2FnZSkge1xuICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKG1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH1cbiAgfVxuXG4gIGNsb3NlKGNvbm5lY3Rpb25JZCA9IG51bGwpIHtcbiAgICBsZXQgaWQgPSBjb25uZWN0aW9uSWQgfHwgdGhpcy5sYXN0Q29ubmVjdGlvbklkO1xuICAgIGlmICh0eXBlb2YgdGhpcy5jb25uZWN0aW9uc1tpZF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3QucHVzaChpZClcbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbaWRdLmNsb3NlKClcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2VcbiAgICogQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb259IGNiIGVpdGhlciBkZWZpbmUgYSBjbG9zdXJlIG9yIHBhc3MgaW4gYSBjb25uZWN0aW9uSWRcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzZW5kKG1lc3NhZ2UsIGNiKSB7XG4gICAgbGV0IGNvbm5lY3Rpb25JZCA9IHRoaXMubGFzdENvbm5lY3Rpb25JZFxuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRoaXMuY29ubmVjdGlvbnNbY2JdICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgIHRoaXMubGFzdENvbm5lY3Rpb25JZCA9IGNvbm5lY3Rpb25JZCA9IGNiXG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdID09PSAndW5kZWZpbmVkJyApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnJlYWR5U3RhdGUgPT09IHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5PUEVOKSB7XG4gICAgICBsZXQgX2lkID0gU3RyZWFtU29ja2V0Q2xpZW50LmdlbmVyYXRlVVVJRCgpXG4gICAgICBpZiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tSZWdpc3RlcltfaWRdID0gY2JcbiAgICAgIH1cbiAgICAgIHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgJ0BtZXRhJzogT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgJ19pZCc6IF9pZFxuICAgICAgICB9LCB0aGlzLl9jb25maWcpLFxuICAgICAgICAnbWVzc2FnZSc6IG1lc3NhZ2VcbiAgICAgIH0pKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb25zb2xlKCdXZWJTb2NrZXQgbm90IG9wZW4nLCAnd2FybicpXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgbmV3IFdlYlNvY2tldCBjb25uZWN0aW9uLCBpdCBkb2VzIG5vdCBvdmVyLXdyaXRlIGV4aXN0aW5nIG9wZW4gY29ubmVjdGlvbnNcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JcbiAgICogQHJldHVybnMge3N0cmluZ30gY29ubmVjdGlvbklkXG4gICAqL1xuICBvcGVuKGNiKSB7XG4gICAgdGhpcy5jb25zb2xlKFsnW0NPTk5FQ1RJTkddJyxgJHt0aGlzLl9jb25maWcuc2VydmVyLnByb3RvfSR7dGhpcy5fY29uZmlnLnNlcnZlci5ob3N0bmFtZX06JHt0aGlzLl9jb25maWcuc2VydmVyLnBvcnR9YF0sICdpbmZvJylcbiAgICBsZXQgY29ubmVjdGlvbklkID0gU3RyZWFtU29ja2V0Q2xpZW50LmdlbmVyYXRlVVVJRCgpXG4gICAgdGhpcy5sYXN0Q29ubmVjdGlvbklkID0gY29ubmVjdGlvbklkXG4gICAgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdID0gbmV3IFdlYlNvY2tldChgJHt0aGlzLl9jb25maWcuc2VydmVyLnByb3RvfSR7dGhpcy5fY29uZmlnLnNlcnZlci5ob3N0bmFtZX06JHt0aGlzLl9jb25maWcuc2VydmVyLnBvcnR9YClcbiAgICBpZiAodGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnJlYWR5U3RhdGUgPT09IHRoaXMuY29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5DT05ORUNUSU5HKSB7XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0ub25vcGVuID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmNvbnNvbGUoJ2Nvbm5lY3RlZCcsICdpbmZvJylcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zZW5kKCdjb25uZWN0aW5nJywgY2IpXG4gICAgICAgIH0sIDIwKVxuICAgICAgfVxuICAgICAgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLm9uZXJyb3IgPSBlID0+IHtcbiAgICAgICAgdGhpcy5jb25zb2xlKFsnV2ViU29ja2V0IGVycm9yJywgZV0sICdlcnJvcicpXG4gICAgICB9XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0ub25tZXNzYWdlID0gZSA9PiB7XG4gICAgICAgIGxldCBwYXJzZWQgPSBTdHJlYW1Tb2NrZXRDbGllbnQucGFyc2VNZXNzYWdlKGUuZGF0YSk7XG4gICAgICAgIGlmIChwYXJzZWQgJiYgdHlwZW9mIHBhcnNlZFsnQG1ldGEnXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRoaXMuY2FsbGJhY2tSZWdpc3RlcltwYXJzZWRbJ0BtZXRhJ10uX3R5cGVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbcGFyc2VkWydAbWV0YSddLl90eXBlXS5jYWxsKHRoaXMuX2NvbmZpZywgcGFyc2VkWydAbWV0YSddLl9zeXN0ZW0pXG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5jYWxsYmFja1JlZ2lzdGVyW3BhcnNlZFsnQG1ldGEnXS5faWRdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrUmVnaXN0ZXJbcGFyc2VkWydAbWV0YSddLl9pZF0uY2FsbCh0aGlzLl9jb25maWcsIHBhcnNlZC5tZXNzYWdlIHx8IG51bGwpXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jYWxsYmFja1JlZ2lzdGVyW3BhcnNlZFsnQG1ldGEnXS5faWRdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29uc29sZShbJ1tSQ1ZEXScsIHBhcnNlZF0sICdkZWJ1ZycpXG4gICAgICB9XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0ub25jbG9zZSA9IGUgPT4ge1xuICAgICAgICB0aGlzLmNvbnNvbGUoWydXZWJTb2NrZXQgY2xvc2VkJywgZV0sICd3YXJuJylcbiAgICAgICAgaWYgKHRoaXMuZGlzY29ubmVjdC5pbmRleE9mKGNvbm5lY3Rpb25JZCkgPT09IC0xICYmIHR5cGVvZiB0aGlzLl9jb25maWcuY2xpZW50LmtlZXBBbGl2ZSA9PT0gJ251bWJlcicgJiYgdGhpcy5fY29uZmlnLmNsaWVudC5rZWVwQWxpdmUgPiAwKSB7XG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUoJ0F0dGVtcHRpbmcgdG8gcmVlc3RhYmxpc2ggV2ViU29ja2V0JywgJ2luZm8nKVxuICAgICAgICAgICAgdGhpcy5vcGVuKClcbiAgICAgICAgICB9LCB0aGlzLl9jb25maWcuY2xpZW50LmtlZXBBbGl2ZSlcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5jb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbm5lY3Rpb25JZDtcbiAgfVxufVxuIl19