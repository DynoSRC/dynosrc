// go out to Assets right now
var async = require('async'),
  diff = require('diff'),
  fs = require('fs');

module.exports = {
  get: function(asset, version, config, cb) {
    var searchDir = config.assetsDir.replace(/\/?$/, '/'),
      id = asset.id;

    if (! searchDir) {
      return next({
        error: 'SERVER_ERROR',
        description: 'Asset directory not defined'
      });
    }

    async.waterfall([
      // look up Asset directory
      function(next) {
        fs.readdir(searchDir, next);
      },
      // find Asset for id
      function(files, next) {
        var i = files.indexOf(id);

        if (i < 0) {
          return next({
            error: 'NOT_FOUND',
            description: 'Asset not available: ' + searchDir + id
          });
        }

        next(null, files[i]);
      },
      // look up requested tag
      function(dirname, next) {
        // could be something
        searchDir += dirname + '/';

        var revPath = version && (searchDir + version + '.js');
        return next(null, revPath || '');
      }
    ], cb);
  }
};