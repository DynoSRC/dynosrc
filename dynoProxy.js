// DynoProxy

(function() {

  var dynoProxy,
    options = {
      origin: 'http://waving.2013.nodeknockout.com'
    },
    proxy,
    queue = [],
    callbacks = {},
    commands = [
      {
        pattern: /^ready$/,
        fn: function(event) {
          flushQueue();
          if (options.onStart) {
            options.onStart.call(null);
          }
        }
      },
      {
        pattern: /^script:(.+?):/,
        fn: function(event) {
          var content = event.data.replace(this.pattern, ''),
            matches = event.data.match(this.pattern),
            tag = matches && matches[1],
            script = document.createElement('script');

          document.head.appendChild(script);
          script.appendChild(document.createTextNode(content));

          // script should eval immediately, but just to be sure...
          setTimeout(function() {
            if (callbacks[tag]) {
              callbacks[tag]();
              delete callbacks[tag];
            }
          }, 1);
        }
      }
    ];

  function extend(obj1, obj2) {
    for (var i in obj2) {
      obj1[i] = obj2[i];
    }
  }

  function flushQueue() {
    queue.forEach(function(args) {
      dynoProxy.apply.apply(dynoProxy, args);
    });
    queue = [];
  }

  function startProxy(onStarted) {
    var iframeId = 'dynosource-proxy',
      iframe = document.getElementById(iframeId);
      
    if (! iframe) {
      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.src = options.origin + '/dynoSrc/proxy';
      iframe.style.position = 'absolute';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);
    }

    // store to closure
    proxy = iframe;
  }

  dynoProxy = {
    init: function(opts) {
      extend(options, opts);

      // set up listener to wait for 'ready' msg
      window.addEventListener('message', function(event) {
        if (event.origin !== options.origin) {
          return;
        }

        commands.forEach(function(cmd) {
          if (cmd.pattern.test(event.data)) {
            cmd.fn(event);
          }
        });
      }, false);

      if (! document.body) {
        document.addEventListener('DOMContentLoaded', function() {
          document.removeEventListener('DOMContentLoaded', arguments.callee, false);
          startProxy();
        }, false);
      } else {
        startProxy();
      }
    },
    apply: function(moduleName, revisionHash, cb) {
      if (! proxy) {
        queue.push([moduleName, revisionHash]);
        return false;
      }

      var tag = moduleName + '#' + revisionHash,
        cmd = 'apply:' + tag;

      proxy.contentWindow.postMessage(cmd, options.origin);

      if (cb) {
        callbacks[tag] = cb;
      }

      return true;
    }
  };

  window.dynoProxy = dynoProxy;
})();