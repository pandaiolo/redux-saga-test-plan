'use strict';

exports.__esModule = true;

var _exposableEffects;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
/* eslint-disable no-underscore-dangle */


exports.default = expectSaga;

var _reduxSaga = require('redux-saga');

var _is = require('@redux-saga/is');

var is = _interopRequireWildcard(_is);

var _effects = require('redux-saga/effects');

var effects = _interopRequireWildcard(_effects);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _array = require('../utils/array');

var _Map = require('../utils/Map');

var _Map2 = _interopRequireDefault(_Map);

var _ArraySet = require('../utils/ArraySet');

var _ArraySet2 = _interopRequireDefault(_ArraySet);

var _logging = require('../utils/logging');

var _async = require('../utils/async');

var _identity = require('../utils/identity');

var _identity2 = _interopRequireDefault(_identity);

var _parseEffect2 = require('./parseEffect');

var _parseEffect3 = _interopRequireDefault(_parseEffect2);

var _provideValue = require('./provideValue');

var _object = require('../utils/object');

var _findDispatchableActionIndex = require('./findDispatchableActionIndex');

var _findDispatchableActionIndex2 = _interopRequireDefault(_findDispatchableActionIndex);

var _sagaWrapper = require('./sagaWrapper');

var _sagaWrapper2 = _interopRequireDefault(_sagaWrapper);

var _sagaIdFactory = require('./sagaIdFactory');

var _sagaIdFactory2 = _interopRequireDefault(_sagaIdFactory);

var _helpers = require('./providers/helpers');

var _asEffect = require('../utils/asEffect');

var _expectations = require('./expectations');

var _keys = require('../shared/keys');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var all = effects.all,
    call = effects.call,
    fork = effects.fork,
    race = effects.race,
    spawn = effects.spawn;


var INIT_ACTION = { type: '@@redux-saga-test-plan/INIT' };
var defaultSagaWrapper = (0, _sagaWrapper2.default)();

function extractState(reducer, initialState) {
  return initialState || reducer(undefined, INIT_ACTION);
}

function _toJSON(object) {
  if (Array.isArray(object)) {
    return object.map(_toJSON);
  }

  if (typeof object === 'function') {
    return '@@redux-saga-test-plan/json/function/' + (object.name || '<anonymous>');
  }

  if ((typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && object !== null) {
    return (0, _object.mapValues)(object, _toJSON);
  }

  return object;
}

function lacksSagaWrapper(value) {
  var _parseEffect = (0, _parseEffect3.default)(value),
      type = _parseEffect.type,
      effect = _parseEffect.effect;

  return type !== 'FORK' || !(0, _sagaWrapper.isSagaWrapper)(effect.fn);
}

var exposableEffects = (_exposableEffects = {}, _exposableEffects[_keys.TAKE] = 'take', _exposableEffects[_keys.PUT] = 'put', _exposableEffects[_keys.RACE] = 'race', _exposableEffects[_keys.CALL] = 'call', _exposableEffects[_keys.CPS] = 'cps', _exposableEffects[_keys.FORK] = 'fork', _exposableEffects[_keys.GET_CONTEXT] = 'getContext', _exposableEffects[_keys.SELECT] = 'select', _exposableEffects[_keys.SET_CONTEXT] = 'setContext', _exposableEffects[_keys.ACTION_CHANNEL] = 'actionChannel', _exposableEffects);

function expectSaga(generator) {
  var _effectStores;

  for (var _len = arguments.length, sagaArgs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    sagaArgs[_key - 1] = arguments[_key];
  }

  var allEffects = [];
  var effectStores = (_effectStores = {}, _effectStores[_keys.TAKE] = new _ArraySet2.default(), _effectStores[_keys.PUT] = new _ArraySet2.default(), _effectStores[_keys.RACE] = new _ArraySet2.default(), _effectStores[_keys.CALL] = new _ArraySet2.default(), _effectStores[_keys.CPS] = new _ArraySet2.default(), _effectStores[_keys.FORK] = new _ArraySet2.default(), _effectStores[_keys.GET_CONTEXT] = new _ArraySet2.default(), _effectStores[_keys.SET_CONTEXT] = new _ArraySet2.default(), _effectStores[_keys.SELECT] = new _ArraySet2.default(), _effectStores[_keys.ACTION_CHANNEL] = new _ArraySet2.default(), _effectStores);

  var expectations = [];
  var ioChannel = (0, _reduxSaga.stdChannel)();
  var queuedActions = [];
  var forkedTasks = [];
  var outstandingForkEffects = new _Map2.default();
  var outstandingActionChannelEffects = new _Map2.default();
  var channelsToPatterns = new _Map2.default();
  var dispatchPromise = Promise.resolve();
  var nextSagaId = (0, _sagaIdFactory2.default)();

  var stopDirty = false;
  var negateNextAssertion = false;
  var isRunning = false;
  var delayTime = null;

  var iterator = void 0;
  var mainTask = void 0;
  var mainTaskPromise = void 0;
  var providers = void 0;

  var returnValue = void 0;

  var storeState = void 0;

  function setReturnValue(value) {
    returnValue = value;
  }

  function useProvidedValue(value) {
    function addEffect() {
      // Because we are providing a return value and not hitting redux-saga, we
      // need to manually store the effect so assertions on the effect work.
      processEffect({
        effectId: nextSagaId(),
        effect: value
      });
    }

    try {
      var providedValue = (0, _provideValue.provideValue)(providers, value);

      if (providedValue === _provideValue.NEXT) {
        return value;
      }

      addEffect();
      return providedValue;
    } catch (e) {
      addEffect();
      throw e;
    }
  }

  function refineYieldedValue(value) {
    var parsedEffect = (0, _parseEffect3.default)(value);
    var localProviders = providers || {};
    var type = parsedEffect.type,
        effect = parsedEffect.effect;


    switch (true) {
      case type === _keys.RACE && !localProviders.race:
        processEffect({
          effectId: nextSagaId(),
          effect: value
        });

        return race(parsedEffect.mapEffects(refineYieldedValue));

      case type === _keys.ALL && !localProviders.all:
        return all(parsedEffect.mapEffects(refineYieldedValue));

      case type === _keys.FORK:
        {
          var args = effect.args,
              detached = effect.detached,
              context = effect.context,
              fn = effect.fn;


          var providedValue = useProvidedValue(value);
          var isProvided = providedValue !== value;

          if (!detached && !isProvided) {
            // Because we wrap the `fork`, we need to manually store the effect,
            // so assertions on the `fork` work.
            processEffect({
              effectId: nextSagaId(),
              effect: value
            });

            var finalArgs = args;

            return fork((0, _sagaWrapper2.default)(fn.name), fn.apply(context, finalArgs), refineYieldedValue);
          }

          if (detached && !isProvided) {
            // Because we wrap the `spawn`, we need to manually store the effect,
            // so assertions on the `spawn` work.
            processEffect({
              effectId: nextSagaId(),
              effect: value
            });

            return spawn((0, _sagaWrapper2.default)(fn.name), fn.apply(context, args), refineYieldedValue);
          }

          return providedValue;
        }

      case type === _keys.CALL:
        {
          var _providedValue = useProvidedValue(value);

          if (_providedValue !== value) {
            return _providedValue;
          }

          // Because we manually consume the `call`, we need to manually store
          // the effect, so assertions on the `call` work.
          processEffect({
            effectId: nextSagaId(),
            effect: value
          });

          var _context = effect.context,
              _fn = effect.fn,
              _args = effect.args;

          var result = _fn.apply(_context, _args);

          if (is.iterator(result)) {
            return call(defaultSagaWrapper, result, refineYieldedValue);
          }

          return result;
        }

      // Ensure we wrap yielded iterators (i.e. `yield someInnerSaga()`) for
      // providers to work.
      case is.iterator(value):
        return useProvidedValue(defaultSagaWrapper(value, refineYieldedValue));

      default:
        return useProvidedValue(value);
    }
  }

  function defaultReducer() {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : storeState;

    return state;
  }

  var reducer = defaultReducer;

  function getAllPromises() {
    return new Promise(function (resolve) {
      Promise.all([].concat(forkedTasks.map(taskPromise), [mainTaskPromise])).then(function () {
        if (stopDirty) {
          stopDirty = false;
          resolve(getAllPromises());
        }
        resolve();
      });
    });
  }

  function addForkedTask(task) {
    stopDirty = true;
    forkedTasks.push(task);
  }

  function cancelMainTask(timeout, silenceTimeout, timedOut) {
    if (!silenceTimeout && timedOut) {
      (0, _logging.warn)('Saga exceeded async timeout of ' + timeout + 'ms');
    }

    mainTask.cancel();

    return mainTaskPromise;
  }

  function scheduleStop(timeout) {
    var promise = (0, _async.schedule)(getAllPromises).then(function () {
      return false;
    });
    var silenceTimeout = false;
    var timeoutLength = void 0;

    if (typeof timeout === 'number') {
      timeoutLength = timeout;
    } else if ((typeof timeout === 'undefined' ? 'undefined' : _typeof(timeout)) === 'object') {
      silenceTimeout = timeout.silenceTimeout === true;

      if ('timeout' in timeout) {
        timeoutLength = timeout.timeout;
      } else {
        timeoutLength = expectSaga.DEFAULT_TIMEOUT;
      }
    }

    if (typeof timeoutLength === 'number') {
      promise = Promise.race([promise, (0, _async.delay)(timeoutLength).then(function () {
        return true;
      })]);
    }

    return promise.then(function (timedOut) {
      return (0, _async.schedule)(cancelMainTask, [timeoutLength, silenceTimeout, timedOut]);
    });
  }

  function queueAction(action) {
    queuedActions.push(action);
  }

  function notifyListeners(action) {
    ioChannel.put(action);
  }

  function dispatch(action) {
    if (typeof action._delayTime === 'number') {
      var _delayTime = action._delayTime;


      dispatchPromise.then(function () {
        return (0, _async.delay)(_delayTime);
      }).then(function () {
        storeState = reducer(storeState, action);
        notifyListeners(action);
      });
    } else {
      storeState = reducer(storeState, action);
      dispatchPromise.then(function () {
        return notifyListeners(action);
      });
    }
  }

  function associateChannelWithPattern(channel, pattern) {
    channelsToPatterns.set(channel, pattern);
  }

  function getDispatchableActions(effect) {
    var pattern = effect.pattern || channelsToPatterns.get(effect.channel);
    var index = (0, _findDispatchableActionIndex2.default)(queuedActions, pattern);

    if (index > -1) {
      var actions = queuedActions.splice(0, index + 1);
      return actions;
    }

    return [];
  }

  function processEffect(event) {
    var parsedEffect = (0, _parseEffect3.default)(event.effect);

    // Using string literal for flow
    if (parsedEffect.type === 'NONE') {
      return;
    }

    var effectStore = effectStores[parsedEffect.type];

    if (!effectStore) {
      return;
    }

    allEffects.push(event.effect);
    effectStore.add(event.effect);

    switch (parsedEffect.type) {
      case _keys.FORK:
        {
          outstandingForkEffects.set(event.effectId, parsedEffect.effect);
          break;
        }

      case _keys.TAKE:
        {
          var actions = getDispatchableActions(parsedEffect.effect);

          var _splitAt = (0, _array.splitAt)(actions, -1),
              reducerActions = _splitAt[0],
              _splitAt$ = _splitAt[1],
              sagaAction = _splitAt$[0];

          reducerActions.forEach(function (action) {
            dispatch(action);
          });

          if (sagaAction) {
            dispatch(sagaAction);
          }

          break;
        }

      case _keys.ACTION_CHANNEL:
        {
          outstandingActionChannelEffects.set(event.effectId, parsedEffect.effect);
          break;
        }

      // no default
    }
  }

  function addExpectation(expectation) {
    expectations.push(expectation);
  }

  var io = {
    dispatch: dispatch,

    channel: ioChannel,

    getState: function getState() {
      return storeState;
    },


    sagaMonitor: {
      effectTriggered: function effectTriggered(event) {
        processEffect(event);
      },
      effectResolved: function effectResolved(effectId, value) {
        var forkEffect = outstandingForkEffects.get(effectId);

        if (forkEffect) {
          addForkedTask(value);
          return;
        }

        var actionChannelEffect = outstandingActionChannelEffects.get(effectId);

        if (actionChannelEffect) {
          associateChannelWithPattern(value, actionChannelEffect.pattern);
        }
      },
      effectRejected: function effectRejected() {},
      effectCancelled: function effectCancelled() {}
    }
  };

  var api = {
    run: run,
    silentRun: silentRun,
    withState: withState,
    withReducer: withReducer,
    provide: provide,
    returns: returns,
    hasFinalState: hasFinalState,
    dispatch: apiDispatch,
    delay: apiDelay,

    // $FlowFixMe
    get not() {
      negateNextAssertion = true;
      return api;
    },

    actionChannel: createEffectTesterFromEffects('actionChannel', _keys.ACTION_CHANNEL, _asEffect.asEffect.actionChannel),
    apply: createEffectTesterFromEffects('apply', _keys.CALL, _asEffect.asEffect.call),
    call: createEffectTesterFromEffects('call', _keys.CALL, _asEffect.asEffect.call),
    cps: createEffectTesterFromEffects('cps', _keys.CPS, _asEffect.asEffect.cps),
    fork: createEffectTesterFromEffects('fork', _keys.FORK, _asEffect.asEffect.fork),
    getContext: createEffectTesterFromEffects('getContext', _keys.GET_CONTEXT, _asEffect.asEffect.getContext),
    put: createEffectTesterFromEffects('put', _keys.PUT, _asEffect.asEffect.put),
    putResolve: createEffectTesterFromEffects('putResolve', _keys.PUT, _asEffect.asEffect.put),
    race: createEffectTesterFromEffects('race', _keys.RACE, _asEffect.asEffect.race),
    select: createEffectTesterFromEffects('select', _keys.SELECT, _asEffect.asEffect.select),
    spawn: createEffectTesterFromEffects('spawn', _keys.FORK, _asEffect.asEffect.fork),
    setContext: createEffectTesterFromEffects('setContext', _keys.SET_CONTEXT, _asEffect.asEffect.setContext),
    take: createEffectTesterFromEffects('take', _keys.TAKE, _asEffect.asEffect.take),
    takeMaybe: createEffectTesterFromEffects('takeMaybe', _keys.TAKE, _asEffect.asEffect.take)
  };

  api.actionChannel.like = createEffectTester('actionChannel', _keys.ACTION_CHANNEL, effects.actionChannel, _asEffect.asEffect.actionChannel, true);
  api.actionChannel.pattern = function (pattern) {
    return api.actionChannel.like({ pattern: pattern });
  };

  api.apply.like = createEffectTester('apply', _keys.CALL, effects.apply, _asEffect.asEffect.call, true);
  api.apply.fn = function (fn) {
    return api.apply.like({ fn: fn });
  };

  api.call.like = createEffectTester('call', _keys.CALL, effects.call, _asEffect.asEffect.call, true);
  api.call.fn = function (fn) {
    return api.call.like({ fn: fn });
  };

  api.cps.like = createEffectTester('cps', _keys.CPS, effects.cps, _asEffect.asEffect.cps, true);
  api.cps.fn = function (fn) {
    return api.cps.like({ fn: fn });
  };

  api.fork.like = createEffectTester('fork', _keys.FORK, effects.fork, _asEffect.asEffect.fork, true);
  api.fork.fn = function (fn) {
    return api.fork.like({ fn: fn });
  };

  api.put.like = createEffectTester('put', _keys.PUT, effects.put, _asEffect.asEffect.put, true);
  api.put.actionType = function (type) {
    return api.put.like({ action: { type: type } });
  };

  api.putResolve.like = createEffectTester('putResolve', _keys.PUT, effects.putResolve, _asEffect.asEffect.put, true);
  api.putResolve.actionType = function (type) {
    return api.putResolve.like({ action: { type: type } });
  };

  api.select.like = createEffectTester('select', _keys.SELECT, effects.select, _asEffect.asEffect.select, true);
  api.select.selector = function (selector) {
    return api.select.like({ selector: selector });
  };

  api.spawn.like = createEffectTester('spawn', _keys.FORK, effects.spawn, _asEffect.asEffect.fork, true);
  api.spawn.fn = function (fn) {
    return api.spawn.like({ fn: fn });
  };

  function checkExpectations() {
    expectations.forEach(function (expectation) {
      expectation({ storeState: storeState, returnValue: returnValue });
    });
  }

  function apiDispatch(action) {
    var dispatchableAction = void 0;

    if (typeof delayTime === 'number') {
      dispatchableAction = (0, _objectAssign2.default)({}, action, {
        _delayTime: delayTime
      });

      delayTime = null;
    } else {
      dispatchableAction = action;
    }

    if (isRunning) {
      dispatch(dispatchableAction);
    } else {
      queueAction(dispatchableAction);
    }

    return api;
  }

  function taskPromise(task) {
    return task.toPromise();
  }

  function start() {
    var sagaWrapper = (0, _sagaWrapper2.default)(generator.name);

    isRunning = true;
    iterator = generator.apply(undefined, sagaArgs);

    mainTask = (0, _reduxSaga.runSaga)(io, sagaWrapper, iterator, refineYieldedValue, setReturnValue);

    mainTaskPromise = taskPromise(mainTask).then(checkExpectations)
    // Pass along the error instead of rethrowing or allowing to
    // bubble up to avoid PromiseRejectionHandledWarning
    .catch(_identity2.default);

    return api;
  }

  function stop(timeout) {
    return scheduleStop(timeout).then(function (err) {
      if (err) {
        throw err;
      }
    });
  }

  function exposeResults() {
    var finalEffects = Object.keys(exposableEffects).reduce(function (memo, key) {
      var effectName = exposableEffects[key];
      var values = effectStores[key].values().filter(lacksSagaWrapper);

      if (values.length > 0) {
        // eslint-disable-next-line no-param-reassign
        memo[effectName] = effectStores[key].values().filter(lacksSagaWrapper);
      }

      return memo;
    }, {});

    return {
      storeState: storeState,
      returnValue: returnValue,
      effects: finalEffects,
      allEffects: allEffects,
      toJSON: function toJSON() {
        return _toJSON(finalEffects);
      }
    };
  }

  function run() {
    var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : expectSaga.DEFAULT_TIMEOUT;

    start();
    return stop(timeout).then(exposeResults);
  }

  function silentRun() {
    var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : expectSaga.DEFAULT_TIMEOUT;

    return run({
      timeout: timeout,
      silenceTimeout: true
    });
  }

  function withState(state) {
    storeState = state;
    return api;
  }

  function withReducer(newReducer, initialState) {
    reducer = newReducer;

    storeState = extractState(newReducer, initialState);

    return api;
  }

  function provide(newProviders) {
    providers = Array.isArray(newProviders) ? (0, _helpers.coalesceProviders)(newProviders) : newProviders;

    return api;
  }

  function returns(value) {
    addExpectation((0, _expectations.createReturnExpectation)({
      value: value,
      expected: !negateNextAssertion
    }));

    return api;
  }

  function hasFinalState(state) {
    addExpectation((0, _expectations.createStoreStateExpectation)({
      state: state,
      expected: !negateNextAssertion
    }));

    return api;
  }

  function apiDelay(time) {
    delayTime = time;
    return api;
  }

  function createEffectTester(effectName, storeKey, effectCreator, extractEffect) {
    var like = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    return function () {
      var expectedEffect = like ? arguments.length <= 0 ? undefined : arguments[0] : effectCreator.apply(undefined, arguments);

      addExpectation((0, _expectations.createEffectExpectation)({
        effectName: effectName,
        expectedEffect: expectedEffect,
        storeKey: storeKey,
        like: like,
        extractEffect: extractEffect,
        store: effectStores[storeKey],
        expected: !negateNextAssertion
      }));

      negateNextAssertion = false;

      return api;
    };
  }

  function createEffectTesterFromEffects(effectName, storeKey, extractEffect) {
    return createEffectTester(effectName, storeKey, effects[effectName], extractEffect);
  }

  return api;
}

expectSaga.DEFAULT_TIMEOUT = 250;