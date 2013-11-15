var test = require('tap').test;
var diffTool = require('diff');
var fs = require('fs');
var basename = require('path').basename;
var git = require('dynosrc').git;
var util = require('util');

function fileName(t, name) {
  var oldFile = fs.readFileSync('files/'+name+'.old', 'utf8');
  var appliedFile = fs.readFileSync('files/'+name+'.applied', 'utf8');

  var diff = diffTool.createPatch(name, oldFile, appliedFile);

  var newFile = diffTool.applyPatch(oldFile, diff);
  t.equals(appliedFile, newFile, 'Equals');
}

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

test("JS Git", function(t) {

  git.getGitHubRaw('ryanstevens/ModelFlow', 'package.json', '40efc16', function(err, f1) {
    console.log("File ::"+ f1.filePath);
    git.getGitHubRaw('ryanstevens/ModelFlow', 'package.json', '8050f1', function(err, f2) {

      git.fileDiff(f1, f2, function(out) {

        console.log(out);
        t.end();

      }).on('data', function(data) {
        console.log(data.toString());
      });
    });
  });

})

