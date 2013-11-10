var _ = require('underscore'),
  url = require('url'),

  contentTypeMap = {
    'js': 'text/javascript',
    'json': 'application/json',
    'script': 'text/html'
  };

function writeRes(res, code, data, headers) {
  var isJson = _.isObject(data);

  if (isJson) {
    headers = _.defaults(headers || {}, {
      'content-type': 'application/json'
    });
  }

  res.writeHead(code, headers);
  res.end(isJson ? JSON.stringify(data) : (data || ''));
}

module.exports = function (opts, req, res) {
  var query = url.parse(req.url, true).query,
    id = query.id,
    from = query.from,
    to = query.to,
    format = query.fmt || 'json',
    usingHead,
    defaultScriptFns = new RegExp(
      '^((' + opts.scriptApplyFn + ')|(' + opts.scriptAddFn + '))'
    );

  if (! id) 
    return writeRes(res, 400, {
      error: 'Please specify asset id'
    });
  if (_.isUndefined(from) || _.isUndefined(to)) 
    return writeRes(res, 400, {
      error: 'Please specify from/to revisions'
    });

  // want to know if using alias for cachability
  usingHead = (to === 'HEAD') || (from === 'HEAD');

  this.patch(id, from, to, format, function(err, patch) {
    if (err) {
      return writeRes(res, err.http || 500, err);
    }

    // custom JSONP support
    if (format === 'js' && query.callback) {
      patch = patch.replace(defaultScriptFns, query.callback);
    }

    writeRes(res, 200, patch, {
      'content-type': contentTypeMap[format],
      'cache-control': usingHead
        // HEAD shortcut shouldn't be cached
        ? 'public, max-age=0, no-cache'
        // automatically cache
        : 'public, max-age=' + opts.maxAge
    });
  });
}