/**
* What does this module do?  Good question... 
* I was intended to do much more than it acctual does 
* as of right now.  But at this moment it simply
* pulls from github raw as a proxy (which was never used in our actual hack)
* technically creates an object around a repo you can clone and checkout branches (also not implemented)
* and shells out to git to product patch files (which is used).
*/

var spawn = require('child_process').spawn;
var fs = require('fs');
var Deferred = require('Deferred');
var request = require('request');

var isProduction = (process.env.NODE_ENV === 'production');
var mkdirp = require('mkdirp');
//default... but middleare WILL override this
var dir = __dirname;
function getProtocol(user, repo) {
  return ((isProduction) ? 'ssh://gh/' : 'git@github.com:') + user + '/' + repo + '.git';
}

var repos = {};

function scanRepos() {
  try {
    fs.readdirSync(dir).forEach(function(folder) {
      if (folder === 'files') return;
      var repo = repos[folder] =  new Repo(folder);
      repo.isCloned.resolve();
      setBranch.call(repo).done(function() {
        repo.isLoaded.resolve();
      });
    });
  }catch(e) {}
}


function gitOnRepo() {
  var args = Array.prototype.slice.call(arguments);
  var repo = args.shift();
  args.unshift('--git-dir='+dir + repo+'/.git');
  git.apply(null, args);
}

function git() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('git');
  return cmd.apply(null, args);
}

function cmd() {

  var args = Array.prototype.slice.call(arguments);
  var cmd = args.shift();
  var cb = args.pop();
  var dataArr = [];

  console.log("Running:: "+ cmd, args);
  
  console.dir(args);
  var status = spawn(cmd, args);
  status.stdout.on('data', function (data) {
    dataArr.push(data.toString('utf8'));
  });

  status.stdout.on('end', function() {
    cb(null, dataArr.join(''));
  });

  status.stderr.on('data', function (data) {
    console.error(data.toString('utf8'));
    cb(data, null);
  });

  return status.stdout;
}

//Not used, but kinda cool.  
//If we do need this we will swap the git shell aspect out for a 
//stable js-git though under the good
function Repo(name, username) {
  this.name = name;
  this.username = username;
  this.isLoaded = Deferred();
  this.isCloned = Deferred();
  this.isClonning = false;
  this.branch = null;
}

function getRepo(name, username) {
  var repo = repos[name];
  if (!repo) return (new Repo(name, username));
  else return repo;
}

function setBranch() {
  var repo = this.name;
  var dfd = Deferred();
  this.isCloned.done(function() {

    gitOnRepo(repo, 'branch', function(err, lines) {
      if (err || !lines) return console.error(err);
      lines.split('\n').forEach(function(line) {
        if (line.indexOf('*')>=0) {
          this.branch = line.substring(2);
          console.log("Found branch " + this.branch + " for " +this.name);
          dfd.resolve(this.branch);
        }
      }.bind(this));
    }.bind(this));

  }.bind(this));
  return dfd.promise();
}

Repo.prototype.checkout = function checkout(branch) {
  var repo = this.name;
  var dfd = Deferred();
  console.log("Checkout out " +repo + " for branch " +branch);
  gitOnRepo(repo, 'checkout', branch, function(err) {
    err = err || '';
    err = err.toString();
    console.log("Done with checkout "+repo + " for branch " +branch, err);
    if (err.length>0 && err.indexOf('Already on') < 0) dfd.reject(err);
    else dfd.resolve(branch);
  });
  return dfd.promise();
};

Repo.prototype.clone = function clone() {
  var repo = this.name;
  if (!this.isClonning && !this.isCloned.isResolved() && !this.isLoaded.isResolved()) {
    console.log("Cloning " + repo);
    this.isClonning = true;
    mkdirp(dir, function() {
      git('clone', getProtocol(this.username, repo), dir+ repo, function(err, out) {
        console.log("Done cloning " +repo);
        if (err) {
          console.error("Error cloning " +repo, err.toString());
        }
        this.isCloned.resolve(out);
        setBranch.call(this).done(function() {
          console.log("Successful cloning " +repo);
          this.isLoaded.resolve(out);
        }.bind(this));  
      }.bind(this));
    }.bind(this));
  }
  return this.isLoaded.promise();
};

module.exports = {
  getRepo : getRepo,
  setOutputDirectory : function(outputDir) {
    dir = outputDir + '/repos/';
    scanRepos();
  },
  getGitHubRaw : function getGitHubRaw(repo, resource, commitHash, cb) {
    var fileDir =dir+'files/' + repo+ '/';
    mkdirp(fileDir, function() {

      var filePath = fileDir+resource+"#"+commitHash;
      request('https://raw.github.com/'+repo+'/'+commitHash+'/'+resource)
        .on('end', function() {
          console.log("written :: " +filePath);
          cb(null, filePath);
        })
        .pipe(fs.createWriteStream(filePath))

    })
  }, 
  fileDiff : function(fromPath, toPath, cb) {
    if (!cb) cb = function() {};
    //TODO: add back -U0 and --minimal, something was braking though downstream
    return git('diff', '--no-index', fromPath, toPath, cb);
  }
};



