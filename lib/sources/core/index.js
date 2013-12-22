var _ = require('underscore'),
  fs = require('fs'),
  async = require('async'),

  topLevelDir = __dirname + '/../../../',
  clientJsDir = topLevelDir,
  tmpDir = topLevelDir + 'tmp/';

module.exports = {
  get: function(asset, version, config, cb) {
    var filename = tmpDir + asset.id;

    async.waterfall([
      function (next) {
        fs.readFile(clientJsDir + asset.id + '.js', next);
      },
      function (contents, next) {
        fs.writeFile(filename, _.template(contents.toString(), config.globals()), next);
      },
      function (next) {
        next(null, filename);
      }
    ], cb);
  }
};