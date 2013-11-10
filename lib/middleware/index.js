var _ = require('underscore'),
  Cookies = require('cookies'),
  url = require('url'),
  fs = require('fs'),

  git = require('../git'),
  patcher = require('./patcher'),
  proxy = require('./proxy'),
  serveJs = require('./serveJs'),

  isDynoSrcReq = /^\/dynoSrc(\/.+?)?$/g;

module.exports = function() {
  var opts = this.config.globals(),
    getAssetNames = function(req) {
      return _.keys(this.config.assets);
    }.bind(this);

  git.setOutputDirectory(this.config.outputDir);

  function getPatchRequests(clientAssets, patches) {
    patchRequests = patches || [];
    
    return _.map(patchRequests, function(assetTag) {
      var parts = assetTag.split('#'),
        id = parts[0];

      return { id: id, from: clientAssets[id], to: parts[1] || 'HEAD' };
    });
  }

  return function(req, res, next) {
    var cookies = new Cookies(req, res),
      dsManifest = cookies.get(opts.cookieName),
      assetNames = getAssetNames(),
      // initialize assets to 'empty' (not present on client)
      clientAssets = (assetNames || []).reduce(function(memo, name) {
        memo[name] = '';
        return memo;
      }, {}),
      path;

    if (dsManifest) {
      decodeURIComponent(dsManifest).split('|').forEach(function(dsAsset) {
        var parts = dsAsset.split('@');
        clientAssets[parts[0]] = parts[1];
      });
    }

    req.getDynoSrcPatches = getPatchRequests.bind(null, clientAssets);

    path = url.parse(req.url).pathname;

    pathMatches = isDynoSrcReq.exec(path || '');
    isDynoSrcReq.lastIndex = 0;

    // handle special routes
    if (pathMatches && pathMatches.length > 0) {
      if (pathMatches[1]) {
        if (/\.io\.js$/.test(pathMatches[1])) {
          return serveJs.call(this, req, res);
        } else if (pathMatches[1] === '/proxy') {
          return proxy.call(this, req, res);
        }
      } else {
        return patcher.call(this, opts, req, res);
      }
    }

    next();

  }.bind(this);
};