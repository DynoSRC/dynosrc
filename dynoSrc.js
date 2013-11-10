/***
*
**/
(function () {

// Bail if we're already loaded.
if (window.dynoSrc) { return; }

var ls = localStorage,
    getItem = ls.getItem.bind(ls),
    setItem = ls.setItem.bind(ls),
    removeItem = ls.removeItem.bind(ls),
    clear = ls.clear.bind(ls),

    ENDPOINT = window.DYNOSRC_ENDPOINT || '/dynoSrc',
    LOCAL_STORAGE_PREFIX = 'dynosrc.',
    COOKIE_NAME = '_ds',
    COOKIE_PAIR_SEPARATOR = '|',
    COOKIE_REV_SEPARATOR = '@',
    CALLBACK_PREFIX = '__dynoSrcCb',

    callbackCount = -1,
    callbacks = [],
    cookies;

// MDN's cookie lib.
cookies = {
  get: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  set: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  remove: function (sKey, sPath, sDomain) {
    if (!sKey || !this.has(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  has: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  }
};

/*
 * applyPatch(oldStr, diffStr)
 *
 * Applies diff. Taken from jsdiff. :D
 */
function applyPatch (oldStr, uniDiff) {
  var diffstr = uniDiff.split('\n');
  var diff = [];
  var remEOFNL = false,
      addEOFNL = false;

  // i = 4 in order to skip diff headers.
  for (var i = 4; i < diffstr.length; i++) {
    if(diffstr[i][0] === '@') {
      var meh = diffstr[i].split(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      diff.unshift({
        start:meh[3],
        oldlength:meh[2],
        oldlines:[],
        newlength:meh[4],
        newlines:[]
      });
    } else if(diffstr[i][0] === '+') {
      diff[0].newlines.push(diffstr[i].substr(1));
    } else if(diffstr[i][0] === '-') {
      diff[0].oldlines.push(diffstr[i].substr(1));
    } else if(diffstr[i][0] === ' ') {
      diff[0].newlines.push(diffstr[i].substr(1));
      diff[0].oldlines.push(diffstr[i].substr(1));
    } else if(diffstr[i][0] === '\\') {
      if (diffstr[i-1][0] === '+') {
        remEOFNL = true;
      } else if(diffstr[i-1][0] === '-') {
        addEOFNL = true;
      }
    }
  }

  var str = oldStr.split('\n');
  for (i = diff.length - 1; i >= 0; i--) {
    var d = diff[i];
    for (var j = 0; j < d.oldlength; j++) {
      if(str[d.start-1+j] !== d.oldlines[j]) {
        return false;
      }
    }
    Array.prototype.splice.apply(str,[d.start-1,+d.oldlength].concat(d.newlines));
  }

  if (remEOFNL) {
    while (!str[str.length-1]) {
      str.pop();
    }
  } else if (addEOFNL) {
    str.push('');
  }
  return str.join('\n');
}

/*
 * evalScript(content)
 *
 * Appends a script tag to the page where innerHTML=content. We do this instead
 * of eval() because it is easier to debug.
 */
function evalScript (content) {
  var script = document.createElement('script');

  document.head.appendChild(script);
  script.appendChild(document.createTextNode(content));

  return script;
}

/*
 * fetch(moduleName, revisionHash)
 *
 * Given a moduleName and revisionHash, will request a diff from the server via
 * JSONP. The callback will then patch the local copy of the module.
 */
function fetch (moduleName, revisionHash, cb) {
  var currentRev = getRevision(moduleName) || '',
      method = currentRev ? 'apply' : 'add',
      callbackId = ++callbackCount,
      callbackName = CALLBACK_PREFIX + callbackId,
      path = ENDPOINT + '?',
      script = document.createElement('script'),
      callback;

  window[callbackName] = function (moduleName, revisionHash, moduleSrc) {
    dynoSrc[method](moduleName, revisionHash, moduleSrc, false);

    if (cb) {
      cb(getItem(LOCAL_STORAGE_PREFIX + moduleName), moduleSrc);
    }
  };

  path += 'id=' + moduleName +
    '&from=' + currentRev +
    '&to=' + revisionHash +
    '&fmt=js' +
    '&callback=' + callbackName;

  document.head.appendChild(script);
  script.src = path;

  return script;
}

/*
 * apply(moduleName, revisionHash [, diff, load])
 *
 * Given a moduleName, revisionHash, and diff, will patch local copy of the
 * module, then store the new revisionHash. If no diff is supplied just pretend
 * it never happened and roll with it. If load is false, will not eval script.
 */
function apply (moduleName, revisionHash, diff, load) {
  var moduleSrc;

  if (!moduleName) {
    throw new Error('No module name!');
  }

  if (!revisionHash) {
    throw new Error('No revision hash!');
  }

  moduleSrc = getItem(LOCAL_STORAGE_PREFIX + moduleName) || '';

  if (diff) {
    moduleSrc = applyPatch(moduleSrc, diff);
  }

  storeModule(moduleName, revisionHash, diff ? moduleSrc : false);

  if (load === false) {
    return moduleSrc;
  }

  return evalScript(moduleSrc);
}

/*
 * add(moduleName, revisionHash, moduleSrc)
 *
 * Given a moduleName, revisionHash, and moduleSrc, adds module to localStorage.
 * This to handle the case where we are fetching a module we don't yet have on
 * the client.
 */
function add (moduleName, revisionHash, moduleSrc) {
  if (!moduleName) {
    throw new Error('No module name!');
  }

  if (!revisionHash) {
    throw new Error('No revision hash!');
  }

  if (!moduleSrc) {
    throw new Error('No module source!');
  }

  storeModule(moduleName, revisionHash, moduleSrc);

  return evalScript(moduleSrc);
}

/*
 * load(moduleName)
 *
 * Just loads module out of localStorage. Useful for demo pages and such.
 */
function load (moduleName) {
  if (!moduleName) {
    throw new Error('No module name!');
  }

  moduleSrc = getItem(LOCAL_STORAGE_PREFIX + moduleName) || '';

  if (moduleSrc) {
    return evalScript(moduleSrc);
  }

  return false;
}

/*
 * getRevision(moduleName)
 *
 * Given a moduleName, will return current revision on client, if any. If no
 * moduleName is provided, returns hash of module:revision pairs.
 */
function getRevision (moduleName) {
  var cookie = cookies.get(COOKIE_NAME) || '',
      kvPairs = cookie ? cookie.split(COOKIE_PAIR_SEPARATOR) : [],
      modules = {};

  // Parse out modules.
  kvPairs.forEach(function (pair) {
    var parts = pair.split(COOKIE_REV_SEPARATOR),
        module = parts[0],
        revision = parts[1];

    modules[module] = revision;
  });

  if (moduleName) {
    return modules[moduleName];
  }

  return modules;
}

/*
 * nuke()
 *
 * Removes DynoSource cookie and clears localStorage.
 */
function nuke () {
  clear();
  cookies.remove(COOKIE_NAME);
}

/*
 * storeModule(moduleName, revisionHash, moduleSrc)
 *
 * Given a moduleName, revisionHash, and moduleSrc, stores the module in
 * localStorage along with revision hash in the cookie.
 */
function storeModule (moduleName, revisionHash, moduleSrc) {
  if (moduleSrc !== false) {
    setItem(LOCAL_STORAGE_PREFIX + moduleName, moduleSrc);
  }
  updateCookie(moduleName, revisionHash);
}

/*
 * updateCookie(moduleName, revisionHash)
 *
 * Given a moduleName and revisionHash, updates the revisionHash for the module
 * in the manifest cookie.
 */
function updateCookie (moduleName, revisionHash) {
  var modules = getRevision(),
      cookie = '',
      encodedPairs = [],
      module;

  // Update this module.
  modules[moduleName] = revisionHash;

  // Encode for cookie.
  for (module in modules) {
    if (!modules.hasOwnProperty(module)) { continue; }
    // module name + separator + revision
    encodedPairs.push(module + COOKIE_REV_SEPARATOR + modules[module]);
  }

  cookie = encodedPairs.join(COOKIE_PAIR_SEPARATOR);
  cookies.set(COOKIE_NAME, cookie, Infinity, '/');
}

window.dynoSrc = {
  apply: apply,
  add: add,
  fetch: fetch,
  load: load,
  getRevision: getRevision,
  nuke: nuke
};

})();
