'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.isSagaWrapper = isSagaWrapper;
exports.default = createSagaWrapper;

var _fsmIterator2 = require('fsm-iterator');

var _fsmIterator3 = _interopRequireDefault(_fsmIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var INIT = 'INIT';
var NEXT = 'NEXT';
var LOOP = 'LOOP';

var FALSY = '@@redux-saga-test-plan/falsy';
var SAGA_WRAPPER = '@@redux-saga-test-plan/saga-wrapper';

// Tagging falsy values that aren't null or undefined because
// redux-saga blocks when they are yielded.
// https://github.com/jfairbank/redux-saga-test-plan/issues/94
function wrapFalsy(value) {
  if (!value && value != null) {
    var _ref;

    return _ref = {}, _ref[FALSY] = true, _ref.value = value, _ref;
  }

  return value;
}

function unwrapFalsy(value) {
  if (value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && value[FALSY]) {
    return value.value;
  }

  return value;
}

function isSagaWrapper(saga) {
  return saga[SAGA_WRAPPER];
}

function createSagaWrapper() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'sagaWrapper';

  function sagaWrapper(wrappedIterator, refineYieldedValue, onReturn) {
    var _fsmIterator;

    var result = wrappedIterator.next();

    function complete() {
      if (typeof onReturn === 'function') {
        onReturn(result.value);
      }

      return {
        value: result.value,
        done: true
      };
    }

    return (0, _fsmIterator3.default)(INIT, (_fsmIterator = {}, _fsmIterator[INIT] = function (_, fsm) {
      try {
        if (result.done) {
          return complete();
        }

        var value = refineYieldedValue(result.value);

        value = Array.isArray(value) ? value.map(wrapFalsy) : wrapFalsy(value);

        return {
          value: value,
          next: NEXT
        };
      } catch (e) {
        return fsm.throw(e, fsm);
      }
    }, _fsmIterator[NEXT] = function (response, fsm) {
      var finalResponse = Array.isArray(response) ? response.map(unwrapFalsy) : unwrapFalsy(response);

      result = wrappedIterator.next(finalResponse);
      return fsm[LOOP](undefined, fsm);
    }, _fsmIterator[LOOP] = function (_, fsm) {
      if (result.done) {
        return complete();
      }

      return fsm[INIT](undefined, fsm);
    }, _fsmIterator.return = function _return(value, fsm) {
      result = wrappedIterator.return(value);
      return fsm[LOOP](undefined, fsm);
    }, _fsmIterator.throw = function _throw(e, fsm) {
      result = wrappedIterator.throw(e);
      return fsm[LOOP](undefined, fsm);
    }, _fsmIterator));
  }

  sagaWrapper[SAGA_WRAPPER] = true;

  try {
    Object.defineProperty(sagaWrapper, 'name', { value: name });
    // eslint-disable-next-line no-empty
  } catch (e) {}

  return sagaWrapper;
}