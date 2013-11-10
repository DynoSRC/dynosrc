var fs = require('fs');

module.exports = function(req, res) {
  res.writeHead(200, {
    'content-type': 'text/html',
    'cache-control': 'public, max-age=2592000'
  });
  
  fs.createReadStream(__dirname + '/proxy.html')
    .pipe(res);
};