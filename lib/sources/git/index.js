var git = require('../../git');

module.exports = {
  get: function(asset, version, config, cb) {
    git.getGitHubRaw(asset.id, asset.filename, version, cb);
  }
};