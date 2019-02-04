'use strict';

exports.__esModule = true;
exports.createEffectExpectation = createEffectExpectation;
exports.createReturnExpectation = createReturnExpectation;
exports.createStoreStateExpectation = createStoreStateExpectation;

var _utilInspect = require('util-inspect');

var _utilInspect2 = _interopRequireDefault(_utilInspect);

var _lodash = require('lodash.ismatch');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.isequal');

var _lodash4 = _interopRequireDefault(_lodash3);

var _SagaTestError = require('../shared/SagaTestError');

var _SagaTestError2 = _interopRequireDefault(_SagaTestError);

var _serializeEffect = require('../shared/serializeEffect');

var _serializeEffect2 = _interopRequireDefault(_serializeEffect);

var _reportActualEffects = require('./reportActualEffects');

var _reportActualEffects2 = _interopRequireDefault(_reportActualEffects);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createEffectExpectation(_ref) {
  var effectName = _ref.effectName,
      expectedEffect = _ref.expectedEffect,
      storeKey = _ref.storeKey,
      like = _ref.like,
      extractEffect = _ref.extractEffect,
      store = _ref.store,
      expected = _ref.expected;

  return function () {
    var deleted = like ? store.deleteBy(function (item) {
      return (0, _lodash2.default)(extractEffect(item), expectedEffect);
    }) : store.delete(expectedEffect);

    var errorMessage = '';

    if (deleted && !expected) {
      var serializedEffect = (0, _serializeEffect2.default)(expectedEffect, storeKey);

      errorMessage = '\n' + effectName + ' expectation unmet:' + ('\n\nNot Expected\n------------\n' + serializedEffect + '\n');
    } else if (!deleted && expected) {
      var _serializedEffect = (0, _serializeEffect2.default)(expectedEffect, storeKey);

      errorMessage = '\n' + effectName + ' expectation unmet:' + ('\n\nExpected\n--------\n' + _serializedEffect + '\n');

      errorMessage += (0, _reportActualEffects2.default)(store, storeKey, effectName);
    }

    if (errorMessage) {
      throw new _SagaTestError2.default(errorMessage);
    }
  };
}

function createReturnExpectation(_ref2) {
  var value = _ref2.value,
      expected = _ref2.expected;

  return function (_ref3) {
    var returnValue = _ref3.returnValue;

    if (expected && !(0, _lodash4.default)(value, returnValue)) {
      var serializedActual = (0, _utilInspect2.default)(returnValue, { depth: 3 });
      var serializedExpected = (0, _utilInspect2.default)(value, { depth: 3 });

      var errorMessage = '\nExpected to return:\n-------------------\n' + serializedExpected + '\n\nBut returned instead:\n---------------------\n' + serializedActual + '\n';

      throw new _SagaTestError2.default(errorMessage);
    } else if (!expected && (0, _lodash4.default)(value, returnValue)) {
      var _serializedExpected = (0, _utilInspect2.default)(value, { depth: 3 });

      var _errorMessage = '\nDid not expect to return:\n-------------------------\n' + _serializedExpected + '\n';

      throw new _SagaTestError2.default(_errorMessage);
    }
  };
}

function createStoreStateExpectation(_ref4) {
  var expectedState = _ref4.state,
      expected = _ref4.expected;

  return function (_ref5) {
    var storeState = _ref5.storeState;

    if (expected && !(0, _lodash4.default)(expectedState, storeState)) {
      var serializedActual = (0, _utilInspect2.default)(storeState, { depth: 3 });
      var serializedExpected = (0, _utilInspect2.default)(expectedState, { depth: 3 });

      var errorMessage = '\nExpected to have final store state:\n-----------------------------------\n' + serializedExpected + '\n\nBut instead had final store state:\n----------------------------------\n' + serializedActual + '\n';

      throw new _SagaTestError2.default(errorMessage);
    } else if (!expected && (0, _lodash4.default)(expectedState, storeState)) {
      var _serializedExpected2 = (0, _utilInspect2.default)(expectedState, { depth: 3 });

      var _errorMessage2 = '\nExpected to not have final store state:\n---------------------------------------\n' + _serializedExpected2 + '\n';

      throw new _SagaTestError2.default(_errorMessage2);
    }
  };
}