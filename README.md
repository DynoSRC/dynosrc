# [DynoSrc](http://www.dinosrc.it)

Minimize HTTP Requests - DynoSRC loads JavaScript files inline in your HTML response, then stores them in localStorage. You can even inline the DynoSRC client lib, eliminating all HTTP requests for JavaScript on your site.

Differential Updates - Now, if a JS asset on your site changes, your users will have to download it again even though just a fraction of it changed. DynoSRC sends down differentials updates, so changes to large files don't require full downloads.

### Getting Started

#### Install DynoSrc

    npm install dynosrc

#### Configure Middleware

    dynSrc.globals({
      //folder containing your JS / CSS files
      assetsDir: __dirname + '/assets'
    });

    //install express style middleware
    app.use(dynoSrc.middleware());

    dynSrc.assets({
      //point directly to files on github
      'ryanstevens/ModelFlow': {
        filename: 'package.json',
        source: 'git',
        //this can also be a tag
        head: '8050f1'
      },
      'jquery': {
        head: '1.9.1',
        //this lives on disk
        source: 'asset'
      }
    });

#### Get Patches, Send to Client

    app.get('/', function (req, res) {
      dynSrc.getPatches(req, {
        patches: ['jquery', 'backbone']
      }, function(err, patches) {
        res.render('index.html', {
          title: 'Super Cool Project',
          patches: patches
        });
      });
    });

#Documentation

####What's going on under the hood

* We are relying on forking out to a child_process and using the git avaliable to the system's user. 


####   Apply Patches in Client

    dynoSrc.apply('my-cool-module', '0.1.2', '...diff...');



#DEV mode FTW

dynoSrc eats its own dog food in while developing.  Here is a simple run down of what the middleware will do on every page load.

* wef

## Project TODO's

* DEV mode WILL eat your entire HD.  Someone needs to write a thing to clean up all the things :)
* Move sever oriented unit tests out of NodeKnockout repo and into public dynoSrc repo.
* Remove hard dependancy on shelling out to git. 
* Much of this feels like it could be complimented with a Grunt task.
* Write client unit tests against dynoSrc.js ;)
* Bit mask resources in cookie to not store entire resource name


## Special Featurez

This next section is NOT part of this module, but a special route build into the node knockout project we crated when making this module.  The purpose of this code is to show how easy it is to product diff's on the fly. 

    var query = url.parse(req.url, true).query;
    async.parallel([
      function(next) {
        git.getGitHubRaw(query.repo, query.file, query.from, next);
      },
      function(next) {
        git.getGitHubRaw(query.repo, query.file, query.to, next);
      }
    ], function(err, files) {
      git.fileDiff(files[0], files[1]).pipe(res);
    });

You can see this in action here
/github/diff?repo=chjj/marked&file=package.json&from=122dde&to=46eaa2

