var bower = require('bower'),
  fs = require('fs'),
  _ = require('underscore'),
  git = require('../../git'),
  async = require('async');

module.exports = {
  get: function(asset, version, config, cb) {
    var id = asset.id,
      bowerPackage = id + '#' + version,
      repo = null;

    async.waterfall([
      function(next) {

        bower.commands
          .info(bowerPackage)
          .on('end', function(info) {
            next(null, info);
          }); 
      },
      function(info, next) {

        if (info.latest) info = info.latest;

        if (! info) return cb('Not found');

        //reassign
        repo = info.homepage.split('.com/')[1];
        version = info.version;

        console.log(repo, version);
        git.getGitHubRaw(repo, 'bower.json', 'master', next);
      }, 
      function(bowerFile, next) {
        fs.readFile(bowerFile, 'utf8', next);
      }, 
      function(data, next) {
        data = JSON.parse(data);
        var found = false;
        [].concat(data.main).forEach(function(src) {
          if (src && src.indexOf(".js")>0) {
            found = true;
            return next(null, src);
          }
        });
        if (found) return;
        next("Could not find bower main file: " + data.main);
      }, 
      function(bowerMain, next) {
        git.getGitHubRaw(repo, bowerMain, version, next);
      }
    ], cb);
  }
};
