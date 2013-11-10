var fs = require('fs'),
  git = require('./git');

module.exports = function(name, v1, v2, cb) {
  var patch = '',
    stream;

  stream = (!! v1)
    ? git.fileDiff(v1, v2)
    : fs.createReadStream(v2);

  stream.on('data', function(data) {
      patch += data.toString('utf8');
    })
    .on('end', function() {
      cb(null, patch);
    });
};