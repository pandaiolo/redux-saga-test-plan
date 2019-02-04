'use strict';

exports.__esModule = true;
exports.schedule = schedule;
exports.delay = delay;
var setImmediate = function (glob) {
  return glob.setImmediate || function (fn) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    return glob.setTimeout.apply(glob, [fn, 0].concat(args));
  };
}(typeof window !== 'undefined' ? window : global);

function schedule(fn) {
  var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  return new Promise(function (resolve) {
    setImmediate(function () {
      var result = fn.apply(undefined, args);
      resolve(result);
    });
  });
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}