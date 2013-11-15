var test = require('tap').test,
  fs = require('fs'),
  _ = require('underscore'),
  // create a special test instance
  dynosource = require('../index').factory({
    // reference test fixtures
    assetsDir: __dirname + '/assets'
  });

dynosource.defaults({
  source: 'asset'
});
dynosource.assets({
  'test': {
    head: '0.0.2',
    alias: 't'
  },
  'test2': {
    head: '0.0.2'
  }
});

function p(prefix, text) {
  return (prefix ? (prefix + ': ') : '') + text;
}

function checkError(t, err, prefix) {
  t.notOk(err, err ? ('Error: ' + JSON.stringify(err)) : 'No errors');
}

function checkPatch(t, patch, prefix, isNew) {
  t.ok(patch, p(prefix, 'Patch exists'));

  if (! patch) return;
  t.ok(patch.to && _.isString(patch.to), p(prefix, 'Patch version OK'));
  t.ok(patch.id && _.isString(patch.id), p(prefix, 'Patch id OK'));

  if (isNew) {
    t.notOk(patch.from, p(prefix, 'Patch contents OK'));
    t.ok(patch.raw && _.isString(patch.raw), p(prefix, 'Patch contents OK'));
  } else {
    t.ok(patch.from && _.isString(patch.from), p(prefix, 'Patch version OK'));
    t.ok(_.isString(patch.diff), p(prefix, 'Patch contents OK'));
  }
}

test('Single patch', function(t) {
  dynosource.patch('test', '0.0.1', 'HEAD', function(err, patch) {
    checkError(t, err);
    checkPatch(t, patch);
    t.end();
  });
});

test('Patch by alias', function(t) {
  dynosource.patch('t', '0.0.1', 'HEAD', function(err, patch) {
    checkError(t, err, 'Alias');
    checkPatch(t, patch, 'Alias');
    t.end();
  });
});

test('Diffing from nothing', function(t) {
  dynosource.patch('test', null, 'HEAD', function(err, patch) {
    checkError(t, err, 'From null');
    checkPatch(t, patch, 'From null', true);
    t.end();
  });
});

test('Script formatter', function(t) {
  dynosource.patch('test', '0.0.1', 'HEAD', 'script', function(err, patch) {
    checkError(t, err);
    t.ok(/\<script\>(.*)?\<\/script\>/.test(patch), 'Script format');
    t.end();
  });
});

// test('Handle minifiers', function(t) {
//   dynosource.patch('backbone-min', '0.9.0', 'HEAD', function(err, patch) {
//     checkError(t, err);
//     checkPatch(t, patch);
//     t.end();
//   });
// });

test('Express middleware', function(t) {
  var middleware = dynosource.middleware(['jquery']),
    mockReq = {
      headers: {
        'cookie': '_ds=test@0.0.1|test2@0.0.2|test3@0.0.3; path=/; httpOnly'
      },
      url: '/'
    },
    mockRes = {};

  middleware(mockReq, mockRes, function() {
    t.ok(_.isFunction(mockReq.getDynoSrcPatches), 'Request has `dynosource` function');

    var patches = mockReq.getDynoSrcPatches();
    t.equals(patches.length, 0, 'Got correct # of patches');

    var ordered = mockReq.getDynoSrcPatches(['test2', 'test']);
    t.equals(ordered.length, 2, 'Ordered: got correct # of ordered');
    t.equals(ordered[0].id, 'test2', 'Ordered: id parsed correctly');
    t.equals(ordered[0].from, '0.0.2', 'Ordered: version parsed correctly');
    
    t.end();  
  });
});

test('Dev mode', function(t) {
  var devDyno = dynosource.factory({
    dev: true,
    assetsDir: __dirname + '/assets'
  });

  devDyno.assets({
    'test': {
      head: '0.0.2'
    }
  });

  devDyno.patch('test', '0.0.1', 'HEAD', function(err, patch) {
    checkError(t, err, 'Dev mode');
    checkPatch(t, patch, 'Dev mode');

    t.ok(/DEV-\d+/.test(patch.to), 'Patched up to DEV version');
    var devV1 = patch.to;

    devDyno.patch('test', devV1, 'HEAD', function(err, patch) {
      checkError(t, err, 'Dev mode');
      checkPatch(t, patch, 'Dev mode');

      var devV2 = patch.to;
      t.equals(patch.from, devV1, 'Patched up from ' + devV1);
      t.notEquals(devV2, devV1, 'Patched up to new version ' + devV2);
      t.end();
    });
  });
});