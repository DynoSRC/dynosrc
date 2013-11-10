var fs = require('fs');

module.exports = function (req, res) {
  res.writeHead(200, {
    'content-type': 'application/x-javascript',
    'cache-control': 'public, max-age=2592000'
  });

  var matches = req.url.match(/(dyno(Src|Proxy))\.io\.js/);

  fs.createReadStream(__dirname + '/../../' + matches[1] + '.js')
    .pipe(res);
};