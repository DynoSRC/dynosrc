var test = require('tap').test;
var fs = require('fs');
var basename = require('path').basename;
var util = require('util');
var async = require('async');
var git = require('../lib/git');

git.setOutputDirectory(__dirname + '/../tmp/');

test("Bower test", function(t) {

  var bower = require('../lib/sources/bower');
  t.ok(bower, "Bower is a valid expression");

  bower.get({id: 'underscore'}, '', null, function(err, path) {

    t.ok(path.indexOf('underscore.js') > 0, 'Pulled file from bower');
    t.end();
  });

});

test("Checkout Tests", function(t) {

  var repo = git.getRepo('ModelFlow', 'ryanstevens');
  repo.clone().done(function(branch) {
    repo.checkout('master').done(function(branch) {
      console.log("Checked out branch " + branch);
      t.same(branch, "master");
      t.end();
    });
  });
});

test("Github raw tests", function(t) {

  t.plan(1);
  async.parallel([
    function(cb) {
      git.getGitHubRaw('ryanstevens/ModelFlow', 'package.json', '40efc16', cb);
    },
    function(cb) {
      git.getGitHubRaw('ryanstevens/ModelFlow', 'package.json', '8050f1', cb);
    }
  ], function(err, results) {

    git.fileDiff(results[0], results[1], function(err, out) {

      t.ok(out.length>10, "Should have some output");
      t.end();

    }).on('data', function(data) {
      console.log(data.toString());
    });

  });

})

