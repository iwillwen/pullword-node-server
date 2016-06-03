'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _koa = require('koa');

var _koa2 = _interopRequireDefault(_koa);

var _koaRouter = require('koa-router');

var _koaRouter2 = _interopRequireDefault(_koaRouter);

var _koaBodyparser = require('koa-bodyparser');

var _koaBodyparser2 = _interopRequireDefault(_koaBodyparser);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _koaOnerror = require('koa-onerror');

var _koaOnerror2 = _interopRequireDefault(_koaOnerror);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function segment(query) {
  var threshold = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
  var debug = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
  var ip = arguments[3];

  return new Promise(function (resolve, reject) {
    query = query.replace(/[\r\n\t]+/, ' ').trim();

    if (checkSingleWord(query)) {
      return reject(new Error('Cannot segment a single word'));
    }

    query += '\t' + threshold + '\t' + debug + '\t' + ip + '\r\n';

    var socket = _net2.default.connect(2015, process.env.REMOTE ? 'api.pullword.com' : 'localhost');

    var resultBuffer = new Buffer('');

    socket.on('connect', function () {
      return socket.write(query);
    }).on('data', function (data) {
      return resultBuffer = Buffer.concat([resultBuffer, data]);
    }).on('end', function () {
      return resolve(resultBuffer.toString());
    }).on('error', function (err) {
      return reject(err);
    });
  });
}

function resultToArray(result, debug) {
  return result.split('\r\n').filter(Boolean).map(function (line) {
    if (debug > 0) {
      var _line$split = line.split(':');

      var _line$split2 = _slicedToArray(_line$split, 2);

      var word = _line$split2[0];
      var probability = _line$split2[1];

      probability = parseFloat(probability);
      return { word: word, probability: probability };
    } else {
      return line;
    }
  });
}

function checkSingleWord(query) {
  return checkChinese(query) && query.length === 1 ||
  // Single Chinese character
  !checkChinese(query) && !query.match(/(\s+)/)
  // Single English word
  ;
}

function checkChinese(query) {
  return !!query.match(/[\u4e00-\u9fa5]/);
}

function parseQuery(query) {
  var source = query.source || '';
  var threshold = parseFloat(query.threshold || query.param1 || 0);
  var debug = parseInt(query.debug || query.param2 || 0);

  return { source: source, threshold: threshold, debug: debug };
}

var router = new _koaRouter2.default();

router.get('/get', function* () {
  var _parseQuery = parseQuery(this.query);

  var source = _parseQuery.source;
  var threshold = _parseQuery.threshold;
  var debug = _parseQuery.debug;

  var ip = this.ip;

  var result = yield segment(source, threshold, debug, ip);

  if (this.query.json == '1') {
    result = resultToArray(result, debug);
  }

  this.body = result;
});

router.get('/get.php', function* () {
  var _parseQuery2 = parseQuery(this.query);

  var source = _parseQuery2.source;
  var threshold = _parseQuery2.threshold;
  var debug = _parseQuery2.debug;

  var ip = this.ip;

  var result = yield segment(source, threshold, debug, ip);

  if (this.query.json == '1') {
    result = resultToArray(result, debug);
  }

  this.body = result;
});

router.post('/post', function* () {
  var _parseQuery3 = parseQuery(this.request.body);

  var source = _parseQuery3.source;
  var threshold = _parseQuery3.threshold;
  var debug = _parseQuery3.debug;

  var ip = this.ip;

  var result = yield segment(source, threshold, debug, ip);

  if (this.query.json == '1') {
    result = resultToArray(result, debug);
  }

  this.body = result;
});

router.post('/post.php', function* () {
  var _parseQuery4 = parseQuery(this.request.body);

  var source = _parseQuery4.source;
  var threshold = _parseQuery4.threshold;
  var debug = _parseQuery4.debug;

  var ip = this.ip;

  var result = yield segment(source, threshold, debug, ip);

  if (this.query.json == '1') {
    result = resultToArray(result, debug);
  }

  this.body = result;
});

var app = (0, _koa2.default)();
(0, _koaOnerror2.default)(app, {
  json: function json(err) {
    this.body = {
      error: err.message
    };
  },
  text: function text(err) {
    this.body = 'Error: ' + err.message;
  },
  accepts: function accepts() {
    return (this.query.json || this.request.body.json) == 1 ? 'json' : 'text';
  }
});
app.use((0, _koaBodyparser2.default)());
app.use(function* (next) {
  this.set('Access-Control-Allow-Origin', '*');
  yield next;
});
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(process.env.PORT || 80, function () {
  console.log('PullWord is running');
});