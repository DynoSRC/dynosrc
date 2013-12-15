/**
 * dynoSrc-core
 */

(function() {

var manifest = {},
    plugins = [<% _.map(plugins, function (plugin) { return "'dynoSrc-" + plugin + "'" }).join(',') %>],
    localStoragePrefix = '<%= localStoragePrefix %>' || 'dynosrc.',
    updateCallbacks = [],
    destroyCallbacks = [];

function evalScript (src) {
  var script = document.createElement('script');

  document.head.appendChild(script);
  script.appendChild(document.createTextNode(src));

  return script;
}

function makeStorage (ls) {
  var getItem = ls.getItem.bind(ls),
    setItem = ls.setItem.bind(ls);

  function deserialize (lsValue) {
    if (! lsValue) {
      return null;
    }

    var splitIndex = lsValue.indexOf(':');

    return {
      version: lsValue.substring(0, splitIndex),
      src: lsValue.substring(splitIndex + 1)
    };
  }

  function serialize (version, src) {
    return version + ':' + src;
  }

  function wrapUpdateHandler (fn) {
    return function (event) {
      var name = event.key,
        updated = deserialize(event.newValue),
        last = deserialize(event.oldValue);

      return fn(name, last && last.version, updated.version, updated.src);
    };
  }

  return {
    getVersion: function getVersion (name) {
      var stored = deserialize(getItem(localStoragePrefix + name));

      return stored && stored.version;
    },
    get: function get (name, version) {
      var stored = deserialize(getItem(localStoragePrefix + name));

      return stored && (version && version === stored.version) && stored.src;
    },
    set: function storeModule (name, version, src) {
      return setItem(localStoragePrefix + name, serialize(version, src));
    }
  };
}

window.dynoSrc = {
  manifest: manifest,

  storage: makeStorage(window.localStorage),

  getVersion: function getVersion (name) {
    if (! manifest[name]) {
      manifest[name] = this.storage.getVersion(name);
    }

    return manifest[name];
  },
  add: function add (name, version, src, andEval) {
    if (!name) {
      throw new Error('No module name!');
    }

    if (!version) {
      throw new Error('No revision hash!');
    }

    if (!src) {
      throw new Error('No module source!');
    }

    var oldVersion = manifest[name];

    manifest[name] = version;
    this.storage.set(name, version, src);

    updateCallbacks.forEach(function (fn) {
      fn(name, oldVersion, version, src);
    });

    if (andEval !== false) evalScript(src);

    return src;
  },
  onUpdate: function onUpdate (fn) {
    updateCallbacks.push(fn);
  },
  onDestroy: function onDestroy (fn) {
    destroyCallbacks.push(fn);
  },
  load: function load (name, version) {
    if (!name) {
      throw new Error('No module name!');
    }

    var src = this.storage.get(name, version) || '';

    return src ? evalScript(src) : false;
  },
  init: function init () {
    plugins.forEach(this.load.bind(this));
  },
  destroy: function destroy () {
    for (var name in manifest) {
      delete manifest[name];
    }

    destroyCallbacks.forEach(function (fn) { fn(); });
  }
};

window.dynoSrc.init();

})();
