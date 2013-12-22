/**
 * dynoSrc-diff
 */

(function (dynoSrc) {

var callbackCount = -1,
    callbacks = [],

    endpoint = '/dynoSrc',
    callbackPrefix = '__dynoSrcCb',
    contextDiffDetect = /^@@ -\d+,\d+ \+\d+,\d+ @@$/m;

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
 * fetch(moduleName, revisionHash)
 *
 * Given a moduleName and revisionHash, will request a diff from the server via
 * JSONP. The callback will then patch the local copy of the module.
 */
dynoSrc.fetch = function fetch (name, version, cb) {
  var currentRev = this.getRevision(name) || '',
      callbackId = ++callbackCount,
      callbackName = callbackPrefix + callbackId,
      path = endpoint + '?',
      script = document.createElement('script');

  window[callbackName] = function (name, version, patchSrc) {
    var updated = dynoSrc.add(name, version, patchSrc);

    if (cb) {
      cb(name, version, updatedSrc, patchSrc);
    }
  };

  path += 'id=' + name +
    '&from=' + currentRev +
    '&to=' + version +
    '&fmt=js' +
    '&callback=' + callbackName;

  document.head.appendChild(script);
  script.src = path;

  return script;
};

/**
 * Replace the `add` function with a version that can detect contextual
 * diffs and apply patches before storing in the browser and evaluating.
 * @override add
 */
var oldAdd = dynoSrc.add;
dynoSrc.add = function add (name, version, src, andEval) {
  var srcToAdd = src,
    existing;

  if (contextDiffDetect.test(src)) {
    var existing = this.storage.get(name) || '';
    
    srcToAdd = applyPatch(existing, src);
  }

  return oldAdd.call(this, name, version, srcToAdd, andEval);
};

})(window.dynoSrc);
