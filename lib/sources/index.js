var fs = require('fs'),
  files = fs.readdirSync(__dirname),
  exports = {};

files.forEach(function(file) {
  var source;

  if (file !== 'index.js') {
    source = require(__dirname + '/' + file);
    source.name = file;
    
    exports[file.replace(/\.js$/, '')] = source;
  }
});

module.exports = exports;