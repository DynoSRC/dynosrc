var test = require('tap').test;
var diffTool = require('diff');
var fs = require('fs');


function checkFile(t, name) {
  console.log(__dirname+'/files/'+name+'.old')
  var oldFile = fs.readFileSync(__dirname+'/files/'+name+'.old', 'utf8');
  var appliedFile = fs.readFileSync(__dirname+'/files/'+name+'.applied', 'utf8');

  var diff = diffTool.createPatch(name, oldFile, appliedFile);

  var newFile = diffTool.applyPatch(oldFile, diff);
  t.equals(appliedFile, newFile, 'Equals');
}


test("Test diff" , function(t) {

  checkFile(t, 'file1');
  t.end();
});