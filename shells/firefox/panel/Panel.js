/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
'use strict';

var React = require('react');

var Bridge = require('../../../agent/Bridge');
var Container = require('../../../frontend/Container');
var Store = require('../../../frontend/Store');

var consts = require('../../../agent/consts');
var keyboardNav = require('../../../frontend/keyboardNav');

import type {DOMEvent} from '../../../frontend/types';
type Listenable = {
  addListener: (fn: (message: Object) => void) => void,
}

type Port = {
  disconnect: () => void,
  onMessage: Listenable,
  onDisconnect: Listenable,
  postMessage: (data: Object) => void,
};

class Panel extends React.Component {
  _port: ?Port;
  _keyListener: ?(evt: DOMEvent) => void;
  _checkTimeout: ?number;
  _unMounted: boolean;
  _bridge: ?Bridge;
  _store: Store;

  constructor(props: Object) {
    super(props)
    this.state = {loading: true, isReact: true};
    this._unMounted = false;
    window.panel = this;
  }

  getChildContext(): Object {
    return {
      store: this._store,
    };
  }

  componentDidMount() {
    this.setup();
    /* TODO(jared): make this work when the page reloads
    chrome.devtools.network.onNavigated.addListener(() => {
      this.reload();
    });
    */
  }

  componentWillUnmount() {
    this._unMounted = true;
  }

  reload() {
    this.teardown();
    if (!this._unMounted) {
      this.setState({loading: true}, this.props.reload);
    }
  }

  teardown() {
    if (this._keyListener) {
      window.removeEventListener('keydown', this._keyListener);
      this._keyListener = null;
    }
    if (this._bridge) {
      this._bridge.send('shutdown');
    }
    if (this._port) {
      this._port.disconnect();
      this._port = null;
    }
    this._bridge = null;
  }

  setup() {
    var disconnected = false;
    var port = this.props.port;

    var wall = {
      listen(fn) {
        port.onmessage = evt => {
          fn(evt.data);
        }
      },
      send(data) {
        if (disconnected) {
          return;
        }
        port.postMessage(data);
      },
    };

    /* TODO
    port.onDisconnect.addListener(() => {
      disconnected = true;
    });
    */

    this._bridge = new Bridge();
    // $FlowFixMe flow thinks `this._bridge` might be null
    this._bridge.attach(wall);

    // $FlowFixMe flow thinks `this._bridge` might be null
    this._bridge.on('hasReact', hasReact => {
      if (!hasReact) {
        this.setState({isReact: false});
      }
    });

    // xx FlowFixMe flow thinks `this._bridge` might be null
    if (this._bridge) {
      this._store = new Store(this._bridge);
    }
    // $FlowFixMe flow thinks `this._store` might be null
    this._keyListener = keyboardNav(this._store);
    window.addEventListener('keydown', this._keyListener);

    this._store.on('connected', () => {
      this.setState({loading: false});
      // this.getNewSelection();
    });
  }

  render() {
    if (!this.state.isReact) {
      return <span>No React found on page...</span>;
    }
    if (this.state.loading) {
      return (
        <div style={styles.loading}>
          <h1>Connecting to react...</h1>
          <br/>
          If this is React Native, you need to interact with the app (just tap the screen) in order to establish the bridge.
          <button onClick={() => this.reload()}>Reload</button>
        </div>
      );
    }
    return (
      // $FlowFixMe Flow thinks Container must inherit from React.Component
      <Container
        reload={this.reload.bind(this)}
        menuItems={{
          attr: (id, node, val, path, name) => {
            if (!val || node.get('nodeType') !== 'Composite' || val[consts.type] !== 'function') {
              return;
            }
            return;
            /* TODO
            return [{
              title: 'Show Source',
              action: () => this.viewAttrSource(path),
            }, {
              title: 'Execute function',
              action: () => this.executeFn(path),
            }];
            */
          },
          tree: (id, node) => {
            return;
            /* TODO
            return [node.get('nodeType') === 'Composite' && {
              title: 'Show Source',
              action: () => this.viewSource(id),
            }, this._store.capabilities.dom && {
              title: 'Show in Elements Pane',
              action: () => this.sendSelection(id),
            }];
            */
          },
        }}
      />
    );
  }
}

var styles = {
  chromePane: {
    display: 'flex',
  },
  stretch: {
    flex: 1,
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: 30,
    flex: 1,
  },
}

Panel.childContextTypes = {
  store: React.PropTypes.object,
};

module.exports = Panel;