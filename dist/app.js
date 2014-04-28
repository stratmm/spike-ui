(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Backbone.Wreqr (Backbone.Marionette)
// ----------------------------------
// v1.2.1
//
// Copyright (c)2014 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://github.com/marionettejs/backbone.wreqr


(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(['exports', 'backbone', 'underscore'], function(exports, Backbone, _) {
      factory(exports, Backbone, _);
    });
  } else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    var _ = require('underscore');
    factory(exports, Backbone, _);
  } else {
    factory({}, root.Backbone, root._);
  }

}(this, function(Wreqr, Backbone, _) {
  "use strict";

  Backbone.Wreqr = Wreqr;

  // Handlers
// --------
// A registry of functions to call, given a name

Wreqr.Handlers = (function(Backbone, _){
  "use strict";
  
  // Constructor
  // -----------

  var Handlers = function(options){
    this.options = options;
    this._wreqrHandlers = {};
    
    if (_.isFunction(this.initialize)){
      this.initialize(options);
    }
  };

  Handlers.extend = Backbone.Model.extend;

  // Instance Members
  // ----------------

  _.extend(Handlers.prototype, Backbone.Events, {

    // Add multiple handlers using an object literal configuration
    setHandlers: function(handlers){
      _.each(handlers, function(handler, name){
        var context = null;

        if (_.isObject(handler) && !_.isFunction(handler)){
          context = handler.context;
          handler = handler.callback;
        }

        this.setHandler(name, handler, context);
      }, this);
    },

    // Add a handler for the given name, with an
    // optional context to run the handler within
    setHandler: function(name, handler, context){
      var config = {
        callback: handler,
        context: context
      };

      this._wreqrHandlers[name] = config;

      this.trigger("handler:add", name, handler, context);
    },

    // Determine whether or not a handler is registered
    hasHandler: function(name){
      return !! this._wreqrHandlers[name];
    },

    // Get the currently registered handler for
    // the specified name. Throws an exception if
    // no handler is found.
    getHandler: function(name){
      var config = this._wreqrHandlers[name];

      if (!config){
        return;
      }

      return function(){
        var args = Array.prototype.slice.apply(arguments);
        return config.callback.apply(config.context, args);
      };
    },

    // Remove a handler for the specified name
    removeHandler: function(name){
      delete this._wreqrHandlers[name];
    },

    // Remove all handlers from this registry
    removeAllHandlers: function(){
      this._wreqrHandlers = {};
    }
  });

  return Handlers;
})(Backbone, _);

  // Wreqr.CommandStorage
// --------------------
//
// Store and retrieve commands for execution.
Wreqr.CommandStorage = (function(){
  "use strict";

  // Constructor function
  var CommandStorage = function(options){
    this.options = options;
    this._commands = {};

    if (_.isFunction(this.initialize)){
      this.initialize(options);
    }
  };

  // Instance methods
  _.extend(CommandStorage.prototype, Backbone.Events, {

    // Get an object literal by command name, that contains
    // the `commandName` and the `instances` of all commands
    // represented as an array of arguments to process
    getCommands: function(commandName){
      var commands = this._commands[commandName];

      // we don't have it, so add it
      if (!commands){

        // build the configuration
        commands = {
          command: commandName, 
          instances: []
        };

        // store it
        this._commands[commandName] = commands;
      }

      return commands;
    },

    // Add a command by name, to the storage and store the
    // args for the command
    addCommand: function(commandName, args){
      var command = this.getCommands(commandName);
      command.instances.push(args);
    },

    // Clear all commands for the given `commandName`
    clearCommands: function(commandName){
      var command = this.getCommands(commandName);
      command.instances = [];
    }
  });

  return CommandStorage;
})();

  // Wreqr.Commands
// --------------
//
// A simple command pattern implementation. Register a command
// handler and execute it.
Wreqr.Commands = (function(Wreqr){
  "use strict";

  return Wreqr.Handlers.extend({
    // default storage type
    storageType: Wreqr.CommandStorage,

    constructor: function(options){
      this.options = options || {};

      this._initializeStorage(this.options);
      this.on("handler:add", this._executeCommands, this);

      var args = Array.prototype.slice.call(arguments);
      Wreqr.Handlers.prototype.constructor.apply(this, args);
    },

    // Execute a named command with the supplied args
    execute: function(name, args){
      name = arguments[0];
      args = Array.prototype.slice.call(arguments, 1);

      if (this.hasHandler(name)){
        this.getHandler(name).apply(this, args);
      } else {
        this.storage.addCommand(name, args);
      }

    },

    // Internal method to handle bulk execution of stored commands
    _executeCommands: function(name, handler, context){
      var command = this.storage.getCommands(name);

      // loop through and execute all the stored command instances
      _.each(command.instances, function(args){
        handler.apply(context, args);
      });

      this.storage.clearCommands(name);
    },

    // Internal method to initialize storage either from the type's
    // `storageType` or the instance `options.storageType`.
    _initializeStorage: function(options){
      var storage;

      var StorageType = options.storageType || this.storageType;
      if (_.isFunction(StorageType)){
        storage = new StorageType();
      } else {
        storage = StorageType;
      }

      this.storage = storage;
    }
  });

})(Wreqr);

  // Wreqr.RequestResponse
// ---------------------
//
// A simple request/response implementation. Register a
// request handler, and return a response from it
Wreqr.RequestResponse = (function(Wreqr){
  "use strict";

  return Wreqr.Handlers.extend({
    request: function(){
      var name = arguments[0];
      var args = Array.prototype.slice.call(arguments, 1);
      if (this.hasHandler(name)) {
        return this.getHandler(name).apply(this, args);
      }
    }
  });

})(Wreqr);

  // Event Aggregator
// ----------------
// A pub-sub object that can be used to decouple various parts
// of an application through event-driven architecture.

Wreqr.EventAggregator = (function(Backbone, _){
  "use strict";
  var EA = function(){};

  // Copy the `extend` function used by Backbone's classes
  EA.extend = Backbone.Model.extend;

  // Copy the basic Backbone.Events on to the event aggregator
  _.extend(EA.prototype, Backbone.Events);

  return EA;
})(Backbone, _);

  // Wreqr.Channel
// --------------
//
// An object that wraps the three messaging systems:
// EventAggregator, RequestResponse, Commands
Wreqr.Channel = (function(Wreqr){
  "use strict";

  var Channel = function(channelName) {
    this.vent        = new Backbone.Wreqr.EventAggregator();
    this.reqres      = new Backbone.Wreqr.RequestResponse();
    this.commands    = new Backbone.Wreqr.Commands();
    this.channelName = channelName;
  };

  _.extend(Channel.prototype, {

    // Remove all handlers from the messaging systems of this channel
    reset: function() {
      this.vent.off();
      this.vent.stopListening();
      this.reqres.removeAllHandlers();
      this.commands.removeAllHandlers();
      return this;
    },

    // Connect a hash of events; one for each messaging system
    connectEvents: function(hash, context) {
      this._connect('vent', hash, context);
      return this;
    },

    connectCommands: function(hash, context) {
      this._connect('commands', hash, context);
      return this;
    },

    connectRequests: function(hash, context) {
      this._connect('reqres', hash, context);
      return this;
    },

    // Attach the handlers to a given message system `type`
    _connect: function(type, hash, context) {
      if (!hash) {
        return;
      }

      context = context || this;
      var method = (type === 'vent') ? 'on' : 'setHandler';

      _.each(hash, function(fn, eventName) {
        this[type][method](eventName, _.bind(fn, context));
      }, this);
    }
  });


  return Channel;
})(Wreqr);

  // Wreqr.Radio
// --------------
//
// An object that lets you communicate with many channels.
Wreqr.radio = (function(Wreqr){
  "use strict";

  var Radio = function() {
    this._channels = {};
    this.vent = {};
    this.commands = {};
    this.reqres = {};
    this._proxyMethods();
  };

  _.extend(Radio.prototype, {

    channel: function(channelName) {
      if (!channelName) {
        throw new Error('Channel must receive a name');
      }

      return this._getChannel( channelName );
    },

    _getChannel: function(channelName) {
      var channel = this._channels[channelName];

      if(!channel) {
        channel = new Wreqr.Channel(channelName);
        this._channels[channelName] = channel;
      }

      return channel;
    },

    _proxyMethods: function() {
      _.each(['vent', 'commands', 'reqres'], function(system) {
        _.each( messageSystems[system], function(method) {
          this[system][method] = proxyMethod(this, system, method);
        }, this);
      }, this);
    }
  });


  var messageSystems = {
    vent: [
      'on',
      'off',
      'trigger',
      'once',
      'stopListening',
      'listenTo',
      'listenToOnce'
    ],

    commands: [
      'execute',
      'setHandler',
      'setHandlers',
      'removeHandler',
      'removeAllHandlers'
    ],

    reqres: [
      'request',
      'setHandler',
      'setHandlers',
      'removeHandler',
      'removeAllHandlers'
    ]
  };

  var proxyMethod = function(radio, system, method) {
    return function(channelName) {
      var messageSystem = radio._getChannel(channelName)[system];
      var args = Array.prototype.slice.call(arguments, 1);

      messageSystem[method].apply(messageSystem, args);
    };
  };

  return new Radio();

})(Wreqr);


}));

},{"backbone":false,"underscore":4}],2:[function(require,module,exports){
module.exports = function (css) {
  var head = document.getElementsByTagName('head')[0],
      style = document.createElement('style');

  style.type = 'text/css';

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  
  head.appendChild(style);
};

module.exports.byUrl = function(url) {
  var head = document.getElementsByTagName('head')[0],
      link = document.createElement('link');

  link.rel = 'stylesheet';
  link.href = url;
  
  head.appendChild(link);
};
},{}],3:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":2}],4:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}],5:[function(require,module,exports){
var $, Backbone, Marionette, Routes, Styles, app;

$ = require('jquery');

Backbone = require('backbone');

Backbone.$ = $;

Marionette = require('backbone.marionette');

Routes = require('./app/routes/home.coffee');

Styles = require("./app/stylesheets/app.less");

app = new Marionette.Application();

app.addInitializer(function(options) {
  var appRouter;
  appRouter = new Routes;
  return Backbone.history.start({
    pushState: true
  });
});

app.start();

module.exports = app;


},{"./app/routes/home.coffee":12,"./app/stylesheets/app.less":13,"backbone":false,"backbone.marionette":false,"jquery":false}],6:[function(require,module,exports){
var Backbone, Model;

Backbone = require('backbone');

Backbone.IndexedDB = require('backbone_indexeddb');

window.Database = require('../database/indexdb.coffee');

Model = require('../models/days_to_ship.coffee');

module.exports = Backbone.Collection.extend({
  storeName: 'days_to_ship',
  database: window.Database,
  model: Model
});


},{"../database/indexdb.coffee":8,"../models/days_to_ship.coffee":9,"backbone":false,"backbone_indexeddb":24}],7:[function(require,module,exports){
var Backbone, Model;

Backbone = require('backbone');

Backbone.IndexedDB = require('backbone_indexeddb');

window.Database = require('../database/indexdb.coffee');

Model = require('../models/product.coffee');

module.exports = Backbone.Collection.extend({
  storeName: 'products',
  database: window.Database,
  model: Model
});


},{"../database/indexdb.coffee":8,"../models/product.coffee":10,"backbone":false,"backbone_indexeddb":24}],8:[function(require,module,exports){
module.exports = {
  id: 'noths-database',
  description: 'NOTHS Local Database',
  migrations: [
    {
      version: 1,
      migrate: function(transaction, next) {
        var store;
        store = transaction.db.createObjectStore('users', {
          keyPath: "id"
        });
        store.createIndex('emailIndex', 'email');
        return next();
      }
    }, {
      version: 2,
      migrate: function(transaction, next) {
        var store;
        store = transaction.db.createObjectStore('products', {
          keyPath: "id"
        });
        return next();
      }
    }, {
      version: 3,
      migrate: function(transaction, next) {
        var store;
        store = transaction.db.createObjectStore('days_to_ship', {
          keyPath: "id"
        });
        store.createIndex('daysIndex', 'days');
        return next();
      }
    }
  ]
};


},{}],9:[function(require,module,exports){
var Backbone;

Backbone = require('backbone');

Backbone.IndexedDB = require('backbone_indexeddb');

window.Database = require('../database/indexdb.coffee');

module.exports = Backbone.Model.extend({
  storeName: 'days_to_ship',
  database: window.Database,
  defaults: {
    title: "",
    days: 1
  }
});


},{"../database/indexdb.coffee":8,"backbone":false,"backbone_indexeddb":24}],10:[function(require,module,exports){
var Backbone, DaysToShip, _;

Backbone = require('backbone');

Backbone.IndexedDB = require('backbone_indexeddb');

window.Database = require('../database/indexdb.coffee');

_ = require('underscore');

DaysToShip = require('./days_to_ship.coffee');

module.exports = Backbone.Model.extend({
  storeName: 'products',
  database: window.Database,
  defaults: {
    title: "",
    price: 0.0,
    introduction: "",
    days_to_ship_id: null
  }
});


},{"../database/indexdb.coffee":8,"./days_to_ship.coffee":9,"backbone":false,"backbone_indexeddb":24,"underscore":4}],11:[function(require,module,exports){
var Wreqr;

Wreqr = require('backbone.wreqr');

module.exports = new Wreqr.Commands();


},{"backbone.wreqr":1}],12:[function(require,module,exports){
var DaysToShip, Marionette, ViewHome;

Marionette = require('backbone.marionette');

ViewHome = require('../views/home/layout.coffee');

DaysToShip = require('../models/days_to_ship.coffee');

module.exports = Marionette.AppRouter.extend({
  initialize: function() {
    console.log("App.Routes.Home::initialize");
    this.region_manager = new Marionette.RegionManager();
    return this.regions = this.region_manager.addRegions({
      home: "#home-page-row"
    });
  },
  routes: {
    "": "homeShow",
    "factory": "runFactory"
  },
  homeShow: function() {
    var view;
    console.log("App.Routes.Home::homeShow");
    console.log("Would have shown home");
    view = new ViewHome;
    return this.regions.home.show(view);
  },
  runFactory: function() {
    new DaysToShip({
      title: "up to 2 Days",
      days: 2
    }).save();
    new DaysToShip({
      title: "up to 4 Days",
      days: 4
    }).save();
    new DaysToShip({
      title: "up to a week",
      days: 7
    }).save();
    return new DaysToShip({
      title: "up to two weeks",
      days: 14
    }).save();
  }
});


},{"../models/days_to_ship.coffee":9,"../views/home/layout.coffee":14,"backbone.marionette":false}],13:[function(require,module,exports){
var css = "/*! normalize.css v3.0.0 | MIT License | git.io/normalize */\nhtml {\n  font-family: sans-serif;\n  -ms-text-size-adjust: 100%;\n  -webkit-text-size-adjust: 100%;\n}\nbody {\n  margin: 0;\n}\narticle,\naside,\ndetails,\nfigcaption,\nfigure,\nfooter,\nheader,\nhgroup,\nmain,\nnav,\nsection,\nsummary {\n  display: block;\n}\naudio,\ncanvas,\nprogress,\nvideo {\n  display: inline-block;\n  vertical-align: baseline;\n}\naudio:not([controls]) {\n  display: none;\n  height: 0;\n}\n[hidden],\ntemplate {\n  display: none;\n}\na {\n  background: transparent;\n}\na:active,\na:hover {\n  outline: 0;\n}\nabbr[title] {\n  border-bottom: 1px dotted;\n}\nb,\nstrong {\n  font-weight: bold;\n}\ndfn {\n  font-style: italic;\n}\nh1 {\n  font-size: 2em;\n  margin: 0.67em 0;\n}\nmark {\n  background: #ff0;\n  color: #000;\n}\nsmall {\n  font-size: 80%;\n}\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\nsup {\n  top: -0.5em;\n}\nsub {\n  bottom: -0.25em;\n}\nimg {\n  border: 0;\n}\nsvg:not(:root) {\n  overflow: hidden;\n}\nfigure {\n  margin: 1em 40px;\n}\nhr {\n  -moz-box-sizing: content-box;\n  box-sizing: content-box;\n  height: 0;\n}\npre {\n  overflow: auto;\n}\ncode,\nkbd,\npre,\nsamp {\n  font-family: monospace, monospace;\n  font-size: 1em;\n}\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  color: inherit;\n  font: inherit;\n  margin: 0;\n}\nbutton {\n  overflow: visible;\n}\nbutton,\nselect {\n  text-transform: none;\n}\nbutton,\nhtml input[type=\"button\"],\ninput[type=\"reset\"],\ninput[type=\"submit\"] {\n  -webkit-appearance: button;\n  cursor: pointer;\n}\nbutton[disabled],\nhtml input[disabled] {\n  cursor: default;\n}\nbutton::-moz-focus-inner,\ninput::-moz-focus-inner {\n  border: 0;\n  padding: 0;\n}\ninput {\n  line-height: normal;\n}\ninput[type=\"checkbox\"],\ninput[type=\"radio\"] {\n  box-sizing: border-box;\n  padding: 0;\n}\ninput[type=\"number\"]::-webkit-inner-spin-button,\ninput[type=\"number\"]::-webkit-outer-spin-button {\n  height: auto;\n}\ninput[type=\"search\"] {\n  -webkit-appearance: textfield;\n  -moz-box-sizing: content-box;\n  -webkit-box-sizing: content-box;\n  box-sizing: content-box;\n}\ninput[type=\"search\"]::-webkit-search-cancel-button,\ninput[type=\"search\"]::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\nfieldset {\n  border: 1px solid #c0c0c0;\n  margin: 0 2px;\n  padding: 0.35em 0.625em 0.75em;\n}\nlegend {\n  border: 0;\n  padding: 0;\n}\ntextarea {\n  overflow: auto;\n}\noptgroup {\n  font-weight: bold;\n}\ntable {\n  border-collapse: collapse;\n  border-spacing: 0;\n}\ntd,\nth {\n  padding: 0;\n}\n@media print {\n  * {\n    text-shadow: none !important;\n    color: #000 !important;\n    background: transparent !important;\n    box-shadow: none !important;\n  }\n  a,\n  a:visited {\n    text-decoration: underline;\n  }\n  a[href]:after {\n    content: \" (\" attr(href) \")\";\n  }\n  abbr[title]:after {\n    content: \" (\" attr(title) \")\";\n  }\n  a[href^=\"javascript:\"]:after,\n  a[href^=\"#\"]:after {\n    content: \"\";\n  }\n  pre,\n  blockquote {\n    border: 1px solid #999;\n    page-break-inside: avoid;\n  }\n  thead {\n    display: table-header-group;\n  }\n  tr,\n  img {\n    page-break-inside: avoid;\n  }\n  img {\n    max-width: 100% !important;\n  }\n  p,\n  h2,\n  h3 {\n    orphans: 3;\n    widows: 3;\n  }\n  h2,\n  h3 {\n    page-break-after: avoid;\n  }\n  select {\n    background: #fff !important;\n  }\n  .navbar {\n    display: none;\n  }\n  .table td,\n  .table th {\n    background-color: #fff !important;\n  }\n  .btn > .caret,\n  .dropup > .btn > .caret {\n    border-top-color: #000 !important;\n  }\n  .label {\n    border: 1px solid #000;\n  }\n  .table {\n    border-collapse: collapse !important;\n  }\n  .table-bordered th,\n  .table-bordered td {\n    border: 1px solid #ddd !important;\n  }\n}\n* {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n}\n*:before,\n*:after {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n}\nhtml {\n  font-size: 62.5%;\n  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n}\nbody {\n  font-family: \"Helvetica Neue\", Helvetica, Arial, sans-serif;\n  font-size: 14px;\n  line-height: 1.42857143;\n  color: #333333;\n  background-color: #ffffff;\n}\ninput,\nbutton,\nselect,\ntextarea {\n  font-family: inherit;\n  font-size: inherit;\n  line-height: inherit;\n}\na {\n  color: #428bca;\n  text-decoration: none;\n}\na:hover,\na:focus {\n  color: #2a6496;\n  text-decoration: underline;\n}\na:focus {\n  outline: thin dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\nfigure {\n  margin: 0;\n}\nimg {\n  vertical-align: middle;\n}\n.img-responsive,\n.thumbnail > img,\n.thumbnail a > img,\n.carousel-inner > .item > img,\n.carousel-inner > .item > a > img {\n  display: block;\n  max-width: 100%;\n  height: auto;\n}\n.img-rounded {\n  border-radius: 6px;\n}\n.img-thumbnail {\n  padding: 4px;\n  line-height: 1.42857143;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-radius: 4px;\n  -webkit-transition: all 0.2s ease-in-out;\n  transition: all 0.2s ease-in-out;\n  display: inline-block;\n  max-width: 100%;\n  height: auto;\n}\n.img-circle {\n  border-radius: 50%;\n}\nhr {\n  margin-top: 20px;\n  margin-bottom: 20px;\n  border: 0;\n  border-top: 1px solid #eeeeee;\n}\n.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  border: 0;\n}\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\n.h1,\n.h2,\n.h3,\n.h4,\n.h5,\n.h6 {\n  font-family: inherit;\n  font-weight: 500;\n  line-height: 1.1;\n  color: inherit;\n}\nh1 small,\nh2 small,\nh3 small,\nh4 small,\nh5 small,\nh6 small,\n.h1 small,\n.h2 small,\n.h3 small,\n.h4 small,\n.h5 small,\n.h6 small,\nh1 .small,\nh2 .small,\nh3 .small,\nh4 .small,\nh5 .small,\nh6 .small,\n.h1 .small,\n.h2 .small,\n.h3 .small,\n.h4 .small,\n.h5 .small,\n.h6 .small {\n  font-weight: normal;\n  line-height: 1;\n  color: #999999;\n}\nh1,\n.h1,\nh2,\n.h2,\nh3,\n.h3 {\n  margin-top: 20px;\n  margin-bottom: 10px;\n}\nh1 small,\n.h1 small,\nh2 small,\n.h2 small,\nh3 small,\n.h3 small,\nh1 .small,\n.h1 .small,\nh2 .small,\n.h2 .small,\nh3 .small,\n.h3 .small {\n  font-size: 65%;\n}\nh4,\n.h4,\nh5,\n.h5,\nh6,\n.h6 {\n  margin-top: 10px;\n  margin-bottom: 10px;\n}\nh4 small,\n.h4 small,\nh5 small,\n.h5 small,\nh6 small,\n.h6 small,\nh4 .small,\n.h4 .small,\nh5 .small,\n.h5 .small,\nh6 .small,\n.h6 .small {\n  font-size: 75%;\n}\nh1,\n.h1 {\n  font-size: 36px;\n}\nh2,\n.h2 {\n  font-size: 30px;\n}\nh3,\n.h3 {\n  font-size: 24px;\n}\nh4,\n.h4 {\n  font-size: 18px;\n}\nh5,\n.h5 {\n  font-size: 14px;\n}\nh6,\n.h6 {\n  font-size: 12px;\n}\np {\n  margin: 0 0 10px;\n}\n.lead {\n  margin-bottom: 20px;\n  font-size: 16px;\n  font-weight: 200;\n  line-height: 1.4;\n}\n@media (min-width: 768px) {\n  .lead {\n    font-size: 21px;\n  }\n}\nsmall,\n.small {\n  font-size: 85%;\n}\ncite {\n  font-style: normal;\n}\n.text-left {\n  text-align: left;\n}\n.text-right {\n  text-align: right;\n}\n.text-center {\n  text-align: center;\n}\n.text-justify {\n  text-align: justify;\n}\n.text-muted {\n  color: #999999;\n}\n.text-primary {\n  color: #428bca;\n}\na.text-primary:hover {\n  color: #3071a9;\n}\n.text-success {\n  color: #3c763d;\n}\na.text-success:hover {\n  color: #2b542c;\n}\n.text-info {\n  color: #31708f;\n}\na.text-info:hover {\n  color: #245269;\n}\n.text-warning {\n  color: #8a6d3b;\n}\na.text-warning:hover {\n  color: #66512c;\n}\n.text-danger {\n  color: #a94442;\n}\na.text-danger:hover {\n  color: #843534;\n}\n.bg-primary {\n  color: #fff;\n  background-color: #428bca;\n}\na.bg-primary:hover {\n  background-color: #3071a9;\n}\n.bg-success {\n  background-color: #dff0d8;\n}\na.bg-success:hover {\n  background-color: #c1e2b3;\n}\n.bg-info {\n  background-color: #d9edf7;\n}\na.bg-info:hover {\n  background-color: #afd9ee;\n}\n.bg-warning {\n  background-color: #fcf8e3;\n}\na.bg-warning:hover {\n  background-color: #f7ecb5;\n}\n.bg-danger {\n  background-color: #f2dede;\n}\na.bg-danger:hover {\n  background-color: #e4b9b9;\n}\n.page-header {\n  padding-bottom: 9px;\n  margin: 40px 0 20px;\n  border-bottom: 1px solid #eeeeee;\n}\nul,\nol {\n  margin-top: 0;\n  margin-bottom: 10px;\n}\nul ul,\nol ul,\nul ol,\nol ol {\n  margin-bottom: 0;\n}\n.list-unstyled {\n  padding-left: 0;\n  list-style: none;\n}\n.list-inline {\n  padding-left: 0;\n  list-style: none;\n  margin-left: -5px;\n}\n.list-inline > li {\n  display: inline-block;\n  padding-left: 5px;\n  padding-right: 5px;\n}\ndl {\n  margin-top: 0;\n  margin-bottom: 20px;\n}\ndt,\ndd {\n  line-height: 1.42857143;\n}\ndt {\n  font-weight: bold;\n}\ndd {\n  margin-left: 0;\n}\n@media (min-width: 768px) {\n  .dl-horizontal dt {\n    float: left;\n    width: 160px;\n    clear: left;\n    text-align: right;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .dl-horizontal dd {\n    margin-left: 180px;\n  }\n}\nabbr[title],\nabbr[data-original-title] {\n  cursor: help;\n  border-bottom: 1px dotted #999999;\n}\n.initialism {\n  font-size: 90%;\n  text-transform: uppercase;\n}\nblockquote {\n  padding: 10px 20px;\n  margin: 0 0 20px;\n  font-size: 17.5px;\n  border-left: 5px solid #eeeeee;\n}\nblockquote p:last-child,\nblockquote ul:last-child,\nblockquote ol:last-child {\n  margin-bottom: 0;\n}\nblockquote footer,\nblockquote small,\nblockquote .small {\n  display: block;\n  font-size: 80%;\n  line-height: 1.42857143;\n  color: #999999;\n}\nblockquote footer:before,\nblockquote small:before,\nblockquote .small:before {\n  content: '\\2014 \\00A0';\n}\n.blockquote-reverse,\nblockquote.pull-right {\n  padding-right: 15px;\n  padding-left: 0;\n  border-right: 5px solid #eeeeee;\n  border-left: 0;\n  text-align: right;\n}\n.blockquote-reverse footer:before,\nblockquote.pull-right footer:before,\n.blockquote-reverse small:before,\nblockquote.pull-right small:before,\n.blockquote-reverse .small:before,\nblockquote.pull-right .small:before {\n  content: '';\n}\n.blockquote-reverse footer:after,\nblockquote.pull-right footer:after,\n.blockquote-reverse small:after,\nblockquote.pull-right small:after,\n.blockquote-reverse .small:after,\nblockquote.pull-right .small:after {\n  content: '\\00A0 \\2014';\n}\nblockquote:before,\nblockquote:after {\n  content: \"\";\n}\naddress {\n  margin-bottom: 20px;\n  font-style: normal;\n  line-height: 1.42857143;\n}\ncode,\nkbd,\npre,\nsamp {\n  font-family: Menlo, Monaco, Consolas, \"Courier New\", monospace;\n}\ncode {\n  padding: 2px 4px;\n  font-size: 90%;\n  color: #c7254e;\n  background-color: #f9f2f4;\n  white-space: nowrap;\n  border-radius: 4px;\n}\nkbd {\n  padding: 2px 4px;\n  font-size: 90%;\n  color: #ffffff;\n  background-color: #333333;\n  border-radius: 3px;\n  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);\n}\npre {\n  display: block;\n  padding: 9.5px;\n  margin: 0 0 10px;\n  font-size: 13px;\n  line-height: 1.42857143;\n  word-break: break-all;\n  word-wrap: break-word;\n  color: #333333;\n  background-color: #f5f5f5;\n  border: 1px solid #cccccc;\n  border-radius: 4px;\n}\npre code {\n  padding: 0;\n  font-size: inherit;\n  color: inherit;\n  white-space: pre-wrap;\n  background-color: transparent;\n  border-radius: 0;\n}\n.pre-scrollable {\n  max-height: 340px;\n  overflow-y: scroll;\n}\n.container {\n  margin-right: auto;\n  margin-left: auto;\n  padding-left: 15px;\n  padding-right: 15px;\n}\n@media (min-width: 768px) {\n  .container {\n    width: 750px;\n  }\n}\n@media (min-width: 992px) {\n  .container {\n    width: 970px;\n  }\n}\n@media (min-width: 1200px) {\n  .container {\n    width: 1170px;\n  }\n}\n.container-fluid {\n  margin-right: auto;\n  margin-left: auto;\n  padding-left: 15px;\n  padding-right: 15px;\n}\n.row {\n  margin-left: -15px;\n  margin-right: -15px;\n}\n.col-xs-1, .col-sm-1, .col-md-1, .col-lg-1, .col-xs-2, .col-sm-2, .col-md-2, .col-lg-2, .col-xs-3, .col-sm-3, .col-md-3, .col-lg-3, .col-xs-4, .col-sm-4, .col-md-4, .col-lg-4, .col-xs-5, .col-sm-5, .col-md-5, .col-lg-5, .col-xs-6, .col-sm-6, .col-md-6, .col-lg-6, .col-xs-7, .col-sm-7, .col-md-7, .col-lg-7, .col-xs-8, .col-sm-8, .col-md-8, .col-lg-8, .col-xs-9, .col-sm-9, .col-md-9, .col-lg-9, .col-xs-10, .col-sm-10, .col-md-10, .col-lg-10, .col-xs-11, .col-sm-11, .col-md-11, .col-lg-11, .col-xs-12, .col-sm-12, .col-md-12, .col-lg-12 {\n  position: relative;\n  min-height: 1px;\n  padding-left: 15px;\n  padding-right: 15px;\n}\n.col-xs-1, .col-xs-2, .col-xs-3, .col-xs-4, .col-xs-5, .col-xs-6, .col-xs-7, .col-xs-8, .col-xs-9, .col-xs-10, .col-xs-11, .col-xs-12 {\n  float: left;\n}\n.col-xs-12 {\n  width: 100%;\n}\n.col-xs-11 {\n  width: 91.66666667%;\n}\n.col-xs-10 {\n  width: 83.33333333%;\n}\n.col-xs-9 {\n  width: 75%;\n}\n.col-xs-8 {\n  width: 66.66666667%;\n}\n.col-xs-7 {\n  width: 58.33333333%;\n}\n.col-xs-6 {\n  width: 50%;\n}\n.col-xs-5 {\n  width: 41.66666667%;\n}\n.col-xs-4 {\n  width: 33.33333333%;\n}\n.col-xs-3 {\n  width: 25%;\n}\n.col-xs-2 {\n  width: 16.66666667%;\n}\n.col-xs-1 {\n  width: 8.33333333%;\n}\n.col-xs-pull-12 {\n  right: 100%;\n}\n.col-xs-pull-11 {\n  right: 91.66666667%;\n}\n.col-xs-pull-10 {\n  right: 83.33333333%;\n}\n.col-xs-pull-9 {\n  right: 75%;\n}\n.col-xs-pull-8 {\n  right: 66.66666667%;\n}\n.col-xs-pull-7 {\n  right: 58.33333333%;\n}\n.col-xs-pull-6 {\n  right: 50%;\n}\n.col-xs-pull-5 {\n  right: 41.66666667%;\n}\n.col-xs-pull-4 {\n  right: 33.33333333%;\n}\n.col-xs-pull-3 {\n  right: 25%;\n}\n.col-xs-pull-2 {\n  right: 16.66666667%;\n}\n.col-xs-pull-1 {\n  right: 8.33333333%;\n}\n.col-xs-pull-0 {\n  right: 0%;\n}\n.col-xs-push-12 {\n  left: 100%;\n}\n.col-xs-push-11 {\n  left: 91.66666667%;\n}\n.col-xs-push-10 {\n  left: 83.33333333%;\n}\n.col-xs-push-9 {\n  left: 75%;\n}\n.col-xs-push-8 {\n  left: 66.66666667%;\n}\n.col-xs-push-7 {\n  left: 58.33333333%;\n}\n.col-xs-push-6 {\n  left: 50%;\n}\n.col-xs-push-5 {\n  left: 41.66666667%;\n}\n.col-xs-push-4 {\n  left: 33.33333333%;\n}\n.col-xs-push-3 {\n  left: 25%;\n}\n.col-xs-push-2 {\n  left: 16.66666667%;\n}\n.col-xs-push-1 {\n  left: 8.33333333%;\n}\n.col-xs-push-0 {\n  left: 0%;\n}\n.col-xs-offset-12 {\n  margin-left: 100%;\n}\n.col-xs-offset-11 {\n  margin-left: 91.66666667%;\n}\n.col-xs-offset-10 {\n  margin-left: 83.33333333%;\n}\n.col-xs-offset-9 {\n  margin-left: 75%;\n}\n.col-xs-offset-8 {\n  margin-left: 66.66666667%;\n}\n.col-xs-offset-7 {\n  margin-left: 58.33333333%;\n}\n.col-xs-offset-6 {\n  margin-left: 50%;\n}\n.col-xs-offset-5 {\n  margin-left: 41.66666667%;\n}\n.col-xs-offset-4 {\n  margin-left: 33.33333333%;\n}\n.col-xs-offset-3 {\n  margin-left: 25%;\n}\n.col-xs-offset-2 {\n  margin-left: 16.66666667%;\n}\n.col-xs-offset-1 {\n  margin-left: 8.33333333%;\n}\n.col-xs-offset-0 {\n  margin-left: 0%;\n}\n@media (min-width: 768px) {\n  .col-sm-1, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6, .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-10, .col-sm-11, .col-sm-12 {\n    float: left;\n  }\n  .col-sm-12 {\n    width: 100%;\n  }\n  .col-sm-11 {\n    width: 91.66666667%;\n  }\n  .col-sm-10 {\n    width: 83.33333333%;\n  }\n  .col-sm-9 {\n    width: 75%;\n  }\n  .col-sm-8 {\n    width: 66.66666667%;\n  }\n  .col-sm-7 {\n    width: 58.33333333%;\n  }\n  .col-sm-6 {\n    width: 50%;\n  }\n  .col-sm-5 {\n    width: 41.66666667%;\n  }\n  .col-sm-4 {\n    width: 33.33333333%;\n  }\n  .col-sm-3 {\n    width: 25%;\n  }\n  .col-sm-2 {\n    width: 16.66666667%;\n  }\n  .col-sm-1 {\n    width: 8.33333333%;\n  }\n  .col-sm-pull-12 {\n    right: 100%;\n  }\n  .col-sm-pull-11 {\n    right: 91.66666667%;\n  }\n  .col-sm-pull-10 {\n    right: 83.33333333%;\n  }\n  .col-sm-pull-9 {\n    right: 75%;\n  }\n  .col-sm-pull-8 {\n    right: 66.66666667%;\n  }\n  .col-sm-pull-7 {\n    right: 58.33333333%;\n  }\n  .col-sm-pull-6 {\n    right: 50%;\n  }\n  .col-sm-pull-5 {\n    right: 41.66666667%;\n  }\n  .col-sm-pull-4 {\n    right: 33.33333333%;\n  }\n  .col-sm-pull-3 {\n    right: 25%;\n  }\n  .col-sm-pull-2 {\n    right: 16.66666667%;\n  }\n  .col-sm-pull-1 {\n    right: 8.33333333%;\n  }\n  .col-sm-pull-0 {\n    right: 0%;\n  }\n  .col-sm-push-12 {\n    left: 100%;\n  }\n  .col-sm-push-11 {\n    left: 91.66666667%;\n  }\n  .col-sm-push-10 {\n    left: 83.33333333%;\n  }\n  .col-sm-push-9 {\n    left: 75%;\n  }\n  .col-sm-push-8 {\n    left: 66.66666667%;\n  }\n  .col-sm-push-7 {\n    left: 58.33333333%;\n  }\n  .col-sm-push-6 {\n    left: 50%;\n  }\n  .col-sm-push-5 {\n    left: 41.66666667%;\n  }\n  .col-sm-push-4 {\n    left: 33.33333333%;\n  }\n  .col-sm-push-3 {\n    left: 25%;\n  }\n  .col-sm-push-2 {\n    left: 16.66666667%;\n  }\n  .col-sm-push-1 {\n    left: 8.33333333%;\n  }\n  .col-sm-push-0 {\n    left: 0%;\n  }\n  .col-sm-offset-12 {\n    margin-left: 100%;\n  }\n  .col-sm-offset-11 {\n    margin-left: 91.66666667%;\n  }\n  .col-sm-offset-10 {\n    margin-left: 83.33333333%;\n  }\n  .col-sm-offset-9 {\n    margin-left: 75%;\n  }\n  .col-sm-offset-8 {\n    margin-left: 66.66666667%;\n  }\n  .col-sm-offset-7 {\n    margin-left: 58.33333333%;\n  }\n  .col-sm-offset-6 {\n    margin-left: 50%;\n  }\n  .col-sm-offset-5 {\n    margin-left: 41.66666667%;\n  }\n  .col-sm-offset-4 {\n    margin-left: 33.33333333%;\n  }\n  .col-sm-offset-3 {\n    margin-left: 25%;\n  }\n  .col-sm-offset-2 {\n    margin-left: 16.66666667%;\n  }\n  .col-sm-offset-1 {\n    margin-left: 8.33333333%;\n  }\n  .col-sm-offset-0 {\n    margin-left: 0%;\n  }\n}\n@media (min-width: 992px) {\n  .col-md-1, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-7, .col-md-8, .col-md-9, .col-md-10, .col-md-11, .col-md-12 {\n    float: left;\n  }\n  .col-md-12 {\n    width: 100%;\n  }\n  .col-md-11 {\n    width: 91.66666667%;\n  }\n  .col-md-10 {\n    width: 83.33333333%;\n  }\n  .col-md-9 {\n    width: 75%;\n  }\n  .col-md-8 {\n    width: 66.66666667%;\n  }\n  .col-md-7 {\n    width: 58.33333333%;\n  }\n  .col-md-6 {\n    width: 50%;\n  }\n  .col-md-5 {\n    width: 41.66666667%;\n  }\n  .col-md-4 {\n    width: 33.33333333%;\n  }\n  .col-md-3 {\n    width: 25%;\n  }\n  .col-md-2 {\n    width: 16.66666667%;\n  }\n  .col-md-1 {\n    width: 8.33333333%;\n  }\n  .col-md-pull-12 {\n    right: 100%;\n  }\n  .col-md-pull-11 {\n    right: 91.66666667%;\n  }\n  .col-md-pull-10 {\n    right: 83.33333333%;\n  }\n  .col-md-pull-9 {\n    right: 75%;\n  }\n  .col-md-pull-8 {\n    right: 66.66666667%;\n  }\n  .col-md-pull-7 {\n    right: 58.33333333%;\n  }\n  .col-md-pull-6 {\n    right: 50%;\n  }\n  .col-md-pull-5 {\n    right: 41.66666667%;\n  }\n  .col-md-pull-4 {\n    right: 33.33333333%;\n  }\n  .col-md-pull-3 {\n    right: 25%;\n  }\n  .col-md-pull-2 {\n    right: 16.66666667%;\n  }\n  .col-md-pull-1 {\n    right: 8.33333333%;\n  }\n  .col-md-pull-0 {\n    right: 0%;\n  }\n  .col-md-push-12 {\n    left: 100%;\n  }\n  .col-md-push-11 {\n    left: 91.66666667%;\n  }\n  .col-md-push-10 {\n    left: 83.33333333%;\n  }\n  .col-md-push-9 {\n    left: 75%;\n  }\n  .col-md-push-8 {\n    left: 66.66666667%;\n  }\n  .col-md-push-7 {\n    left: 58.33333333%;\n  }\n  .col-md-push-6 {\n    left: 50%;\n  }\n  .col-md-push-5 {\n    left: 41.66666667%;\n  }\n  .col-md-push-4 {\n    left: 33.33333333%;\n  }\n  .col-md-push-3 {\n    left: 25%;\n  }\n  .col-md-push-2 {\n    left: 16.66666667%;\n  }\n  .col-md-push-1 {\n    left: 8.33333333%;\n  }\n  .col-md-push-0 {\n    left: 0%;\n  }\n  .col-md-offset-12 {\n    margin-left: 100%;\n  }\n  .col-md-offset-11 {\n    margin-left: 91.66666667%;\n  }\n  .col-md-offset-10 {\n    margin-left: 83.33333333%;\n  }\n  .col-md-offset-9 {\n    margin-left: 75%;\n  }\n  .col-md-offset-8 {\n    margin-left: 66.66666667%;\n  }\n  .col-md-offset-7 {\n    margin-left: 58.33333333%;\n  }\n  .col-md-offset-6 {\n    margin-left: 50%;\n  }\n  .col-md-offset-5 {\n    margin-left: 41.66666667%;\n  }\n  .col-md-offset-4 {\n    margin-left: 33.33333333%;\n  }\n  .col-md-offset-3 {\n    margin-left: 25%;\n  }\n  .col-md-offset-2 {\n    margin-left: 16.66666667%;\n  }\n  .col-md-offset-1 {\n    margin-left: 8.33333333%;\n  }\n  .col-md-offset-0 {\n    margin-left: 0%;\n  }\n}\n@media (min-width: 1200px) {\n  .col-lg-1, .col-lg-2, .col-lg-3, .col-lg-4, .col-lg-5, .col-lg-6, .col-lg-7, .col-lg-8, .col-lg-9, .col-lg-10, .col-lg-11, .col-lg-12 {\n    float: left;\n  }\n  .col-lg-12 {\n    width: 100%;\n  }\n  .col-lg-11 {\n    width: 91.66666667%;\n  }\n  .col-lg-10 {\n    width: 83.33333333%;\n  }\n  .col-lg-9 {\n    width: 75%;\n  }\n  .col-lg-8 {\n    width: 66.66666667%;\n  }\n  .col-lg-7 {\n    width: 58.33333333%;\n  }\n  .col-lg-6 {\n    width: 50%;\n  }\n  .col-lg-5 {\n    width: 41.66666667%;\n  }\n  .col-lg-4 {\n    width: 33.33333333%;\n  }\n  .col-lg-3 {\n    width: 25%;\n  }\n  .col-lg-2 {\n    width: 16.66666667%;\n  }\n  .col-lg-1 {\n    width: 8.33333333%;\n  }\n  .col-lg-pull-12 {\n    right: 100%;\n  }\n  .col-lg-pull-11 {\n    right: 91.66666667%;\n  }\n  .col-lg-pull-10 {\n    right: 83.33333333%;\n  }\n  .col-lg-pull-9 {\n    right: 75%;\n  }\n  .col-lg-pull-8 {\n    right: 66.66666667%;\n  }\n  .col-lg-pull-7 {\n    right: 58.33333333%;\n  }\n  .col-lg-pull-6 {\n    right: 50%;\n  }\n  .col-lg-pull-5 {\n    right: 41.66666667%;\n  }\n  .col-lg-pull-4 {\n    right: 33.33333333%;\n  }\n  .col-lg-pull-3 {\n    right: 25%;\n  }\n  .col-lg-pull-2 {\n    right: 16.66666667%;\n  }\n  .col-lg-pull-1 {\n    right: 8.33333333%;\n  }\n  .col-lg-pull-0 {\n    right: 0%;\n  }\n  .col-lg-push-12 {\n    left: 100%;\n  }\n  .col-lg-push-11 {\n    left: 91.66666667%;\n  }\n  .col-lg-push-10 {\n    left: 83.33333333%;\n  }\n  .col-lg-push-9 {\n    left: 75%;\n  }\n  .col-lg-push-8 {\n    left: 66.66666667%;\n  }\n  .col-lg-push-7 {\n    left: 58.33333333%;\n  }\n  .col-lg-push-6 {\n    left: 50%;\n  }\n  .col-lg-push-5 {\n    left: 41.66666667%;\n  }\n  .col-lg-push-4 {\n    left: 33.33333333%;\n  }\n  .col-lg-push-3 {\n    left: 25%;\n  }\n  .col-lg-push-2 {\n    left: 16.66666667%;\n  }\n  .col-lg-push-1 {\n    left: 8.33333333%;\n  }\n  .col-lg-push-0 {\n    left: 0%;\n  }\n  .col-lg-offset-12 {\n    margin-left: 100%;\n  }\n  .col-lg-offset-11 {\n    margin-left: 91.66666667%;\n  }\n  .col-lg-offset-10 {\n    margin-left: 83.33333333%;\n  }\n  .col-lg-offset-9 {\n    margin-left: 75%;\n  }\n  .col-lg-offset-8 {\n    margin-left: 66.66666667%;\n  }\n  .col-lg-offset-7 {\n    margin-left: 58.33333333%;\n  }\n  .col-lg-offset-6 {\n    margin-left: 50%;\n  }\n  .col-lg-offset-5 {\n    margin-left: 41.66666667%;\n  }\n  .col-lg-offset-4 {\n    margin-left: 33.33333333%;\n  }\n  .col-lg-offset-3 {\n    margin-left: 25%;\n  }\n  .col-lg-offset-2 {\n    margin-left: 16.66666667%;\n  }\n  .col-lg-offset-1 {\n    margin-left: 8.33333333%;\n  }\n  .col-lg-offset-0 {\n    margin-left: 0%;\n  }\n}\ntable {\n  max-width: 100%;\n  background-color: transparent;\n}\nth {\n  text-align: left;\n}\n.table {\n  width: 100%;\n  margin-bottom: 20px;\n}\n.table > thead > tr > th,\n.table > tbody > tr > th,\n.table > tfoot > tr > th,\n.table > thead > tr > td,\n.table > tbody > tr > td,\n.table > tfoot > tr > td {\n  padding: 8px;\n  line-height: 1.42857143;\n  vertical-align: top;\n  border-top: 1px solid #dddddd;\n}\n.table > thead > tr > th {\n  vertical-align: bottom;\n  border-bottom: 2px solid #dddddd;\n}\n.table > caption + thead > tr:first-child > th,\n.table > colgroup + thead > tr:first-child > th,\n.table > thead:first-child > tr:first-child > th,\n.table > caption + thead > tr:first-child > td,\n.table > colgroup + thead > tr:first-child > td,\n.table > thead:first-child > tr:first-child > td {\n  border-top: 0;\n}\n.table > tbody + tbody {\n  border-top: 2px solid #dddddd;\n}\n.table .table {\n  background-color: #ffffff;\n}\n.table-condensed > thead > tr > th,\n.table-condensed > tbody > tr > th,\n.table-condensed > tfoot > tr > th,\n.table-condensed > thead > tr > td,\n.table-condensed > tbody > tr > td,\n.table-condensed > tfoot > tr > td {\n  padding: 5px;\n}\n.table-bordered {\n  border: 1px solid #dddddd;\n}\n.table-bordered > thead > tr > th,\n.table-bordered > tbody > tr > th,\n.table-bordered > tfoot > tr > th,\n.table-bordered > thead > tr > td,\n.table-bordered > tbody > tr > td,\n.table-bordered > tfoot > tr > td {\n  border: 1px solid #dddddd;\n}\n.table-bordered > thead > tr > th,\n.table-bordered > thead > tr > td {\n  border-bottom-width: 2px;\n}\n.table-striped > tbody > tr:nth-child(odd) > td,\n.table-striped > tbody > tr:nth-child(odd) > th {\n  background-color: #f9f9f9;\n}\n.table-hover > tbody > tr:hover > td,\n.table-hover > tbody > tr:hover > th {\n  background-color: #f5f5f5;\n}\ntable col[class*=\"col-\"] {\n  position: static;\n  float: none;\n  display: table-column;\n}\ntable td[class*=\"col-\"],\ntable th[class*=\"col-\"] {\n  position: static;\n  float: none;\n  display: table-cell;\n}\n.table > thead > tr > td.active,\n.table > tbody > tr > td.active,\n.table > tfoot > tr > td.active,\n.table > thead > tr > th.active,\n.table > tbody > tr > th.active,\n.table > tfoot > tr > th.active,\n.table > thead > tr.active > td,\n.table > tbody > tr.active > td,\n.table > tfoot > tr.active > td,\n.table > thead > tr.active > th,\n.table > tbody > tr.active > th,\n.table > tfoot > tr.active > th {\n  background-color: #f5f5f5;\n}\n.table-hover > tbody > tr > td.active:hover,\n.table-hover > tbody > tr > th.active:hover,\n.table-hover > tbody > tr.active:hover > td,\n.table-hover > tbody > tr.active:hover > th {\n  background-color: #e8e8e8;\n}\n.table > thead > tr > td.success,\n.table > tbody > tr > td.success,\n.table > tfoot > tr > td.success,\n.table > thead > tr > th.success,\n.table > tbody > tr > th.success,\n.table > tfoot > tr > th.success,\n.table > thead > tr.success > td,\n.table > tbody > tr.success > td,\n.table > tfoot > tr.success > td,\n.table > thead > tr.success > th,\n.table > tbody > tr.success > th,\n.table > tfoot > tr.success > th {\n  background-color: #dff0d8;\n}\n.table-hover > tbody > tr > td.success:hover,\n.table-hover > tbody > tr > th.success:hover,\n.table-hover > tbody > tr.success:hover > td,\n.table-hover > tbody > tr.success:hover > th {\n  background-color: #d0e9c6;\n}\n.table > thead > tr > td.info,\n.table > tbody > tr > td.info,\n.table > tfoot > tr > td.info,\n.table > thead > tr > th.info,\n.table > tbody > tr > th.info,\n.table > tfoot > tr > th.info,\n.table > thead > tr.info > td,\n.table > tbody > tr.info > td,\n.table > tfoot > tr.info > td,\n.table > thead > tr.info > th,\n.table > tbody > tr.info > th,\n.table > tfoot > tr.info > th {\n  background-color: #d9edf7;\n}\n.table-hover > tbody > tr > td.info:hover,\n.table-hover > tbody > tr > th.info:hover,\n.table-hover > tbody > tr.info:hover > td,\n.table-hover > tbody > tr.info:hover > th {\n  background-color: #c4e3f3;\n}\n.table > thead > tr > td.warning,\n.table > tbody > tr > td.warning,\n.table > tfoot > tr > td.warning,\n.table > thead > tr > th.warning,\n.table > tbody > tr > th.warning,\n.table > tfoot > tr > th.warning,\n.table > thead > tr.warning > td,\n.table > tbody > tr.warning > td,\n.table > tfoot > tr.warning > td,\n.table > thead > tr.warning > th,\n.table > tbody > tr.warning > th,\n.table > tfoot > tr.warning > th {\n  background-color: #fcf8e3;\n}\n.table-hover > tbody > tr > td.warning:hover,\n.table-hover > tbody > tr > th.warning:hover,\n.table-hover > tbody > tr.warning:hover > td,\n.table-hover > tbody > tr.warning:hover > th {\n  background-color: #faf2cc;\n}\n.table > thead > tr > td.danger,\n.table > tbody > tr > td.danger,\n.table > tfoot > tr > td.danger,\n.table > thead > tr > th.danger,\n.table > tbody > tr > th.danger,\n.table > tfoot > tr > th.danger,\n.table > thead > tr.danger > td,\n.table > tbody > tr.danger > td,\n.table > tfoot > tr.danger > td,\n.table > thead > tr.danger > th,\n.table > tbody > tr.danger > th,\n.table > tfoot > tr.danger > th {\n  background-color: #f2dede;\n}\n.table-hover > tbody > tr > td.danger:hover,\n.table-hover > tbody > tr > th.danger:hover,\n.table-hover > tbody > tr.danger:hover > td,\n.table-hover > tbody > tr.danger:hover > th {\n  background-color: #ebcccc;\n}\n@media (max-width: 767px) {\n  .table-responsive {\n    width: 100%;\n    margin-bottom: 15px;\n    overflow-y: hidden;\n    overflow-x: scroll;\n    -ms-overflow-style: -ms-autohiding-scrollbar;\n    border: 1px solid #dddddd;\n    -webkit-overflow-scrolling: touch;\n  }\n  .table-responsive > .table {\n    margin-bottom: 0;\n  }\n  .table-responsive > .table > thead > tr > th,\n  .table-responsive > .table > tbody > tr > th,\n  .table-responsive > .table > tfoot > tr > th,\n  .table-responsive > .table > thead > tr > td,\n  .table-responsive > .table > tbody > tr > td,\n  .table-responsive > .table > tfoot > tr > td {\n    white-space: nowrap;\n  }\n  .table-responsive > .table-bordered {\n    border: 0;\n  }\n  .table-responsive > .table-bordered > thead > tr > th:first-child,\n  .table-responsive > .table-bordered > tbody > tr > th:first-child,\n  .table-responsive > .table-bordered > tfoot > tr > th:first-child,\n  .table-responsive > .table-bordered > thead > tr > td:first-child,\n  .table-responsive > .table-bordered > tbody > tr > td:first-child,\n  .table-responsive > .table-bordered > tfoot > tr > td:first-child {\n    border-left: 0;\n  }\n  .table-responsive > .table-bordered > thead > tr > th:last-child,\n  .table-responsive > .table-bordered > tbody > tr > th:last-child,\n  .table-responsive > .table-bordered > tfoot > tr > th:last-child,\n  .table-responsive > .table-bordered > thead > tr > td:last-child,\n  .table-responsive > .table-bordered > tbody > tr > td:last-child,\n  .table-responsive > .table-bordered > tfoot > tr > td:last-child {\n    border-right: 0;\n  }\n  .table-responsive > .table-bordered > tbody > tr:last-child > th,\n  .table-responsive > .table-bordered > tfoot > tr:last-child > th,\n  .table-responsive > .table-bordered > tbody > tr:last-child > td,\n  .table-responsive > .table-bordered > tfoot > tr:last-child > td {\n    border-bottom: 0;\n  }\n}\nfieldset {\n  padding: 0;\n  margin: 0;\n  border: 0;\n  min-width: 0;\n}\nlegend {\n  display: block;\n  width: 100%;\n  padding: 0;\n  margin-bottom: 20px;\n  font-size: 21px;\n  line-height: inherit;\n  color: #333333;\n  border: 0;\n  border-bottom: 1px solid #e5e5e5;\n}\nlabel {\n  display: inline-block;\n  margin-bottom: 5px;\n  font-weight: bold;\n}\ninput[type=\"search\"] {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n}\ninput[type=\"radio\"],\ninput[type=\"checkbox\"] {\n  margin: 4px 0 0;\n  margin-top: 1px \\9;\n  /* IE8-9 */\n  line-height: normal;\n}\ninput[type=\"file\"] {\n  display: block;\n}\ninput[type=\"range\"] {\n  display: block;\n  width: 100%;\n}\nselect[multiple],\nselect[size] {\n  height: auto;\n}\ninput[type=\"file\"]:focus,\ninput[type=\"radio\"]:focus,\ninput[type=\"checkbox\"]:focus {\n  outline: thin dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\noutput {\n  display: block;\n  padding-top: 7px;\n  font-size: 14px;\n  line-height: 1.42857143;\n  color: #555555;\n}\n.form-control {\n  display: block;\n  width: 100%;\n  height: 34px;\n  padding: 6px 12px;\n  font-size: 14px;\n  line-height: 1.42857143;\n  color: #555555;\n  background-color: #ffffff;\n  background-image: none;\n  border: 1px solid #cccccc;\n  border-radius: 4px;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  -webkit-transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;\n  transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;\n}\n.form-control:focus {\n  border-color: #66afe9;\n  outline: 0;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, 0.6);\n  box-shadow: inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, 0.6);\n}\n.form-control::-moz-placeholder {\n  color: #999999;\n  opacity: 1;\n}\n.form-control:-ms-input-placeholder {\n  color: #999999;\n}\n.form-control::-webkit-input-placeholder {\n  color: #999999;\n}\n.form-control[disabled],\n.form-control[readonly],\nfieldset[disabled] .form-control {\n  cursor: not-allowed;\n  background-color: #eeeeee;\n  opacity: 1;\n}\ntextarea.form-control {\n  height: auto;\n}\ninput[type=\"search\"] {\n  -webkit-appearance: none;\n}\ninput[type=\"date\"] {\n  line-height: 34px;\n}\n.form-group {\n  margin-bottom: 15px;\n}\n.radio,\n.checkbox {\n  display: block;\n  min-height: 20px;\n  margin-top: 10px;\n  margin-bottom: 10px;\n  padding-left: 20px;\n}\n.radio label,\n.checkbox label {\n  display: inline;\n  font-weight: normal;\n  cursor: pointer;\n}\n.radio input[type=\"radio\"],\n.radio-inline input[type=\"radio\"],\n.checkbox input[type=\"checkbox\"],\n.checkbox-inline input[type=\"checkbox\"] {\n  float: left;\n  margin-left: -20px;\n}\n.radio + .radio,\n.checkbox + .checkbox {\n  margin-top: -5px;\n}\n.radio-inline,\n.checkbox-inline {\n  display: inline-block;\n  padding-left: 20px;\n  margin-bottom: 0;\n  vertical-align: middle;\n  font-weight: normal;\n  cursor: pointer;\n}\n.radio-inline + .radio-inline,\n.checkbox-inline + .checkbox-inline {\n  margin-top: 0;\n  margin-left: 10px;\n}\ninput[type=\"radio\"][disabled],\ninput[type=\"checkbox\"][disabled],\n.radio[disabled],\n.radio-inline[disabled],\n.checkbox[disabled],\n.checkbox-inline[disabled],\nfieldset[disabled] input[type=\"radio\"],\nfieldset[disabled] input[type=\"checkbox\"],\nfieldset[disabled] .radio,\nfieldset[disabled] .radio-inline,\nfieldset[disabled] .checkbox,\nfieldset[disabled] .checkbox-inline {\n  cursor: not-allowed;\n}\n.input-sm {\n  height: 30px;\n  padding: 5px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\nselect.input-sm {\n  height: 30px;\n  line-height: 30px;\n}\ntextarea.input-sm,\nselect[multiple].input-sm {\n  height: auto;\n}\n.input-lg {\n  height: 46px;\n  padding: 10px 16px;\n  font-size: 18px;\n  line-height: 1.33;\n  border-radius: 6px;\n}\nselect.input-lg {\n  height: 46px;\n  line-height: 46px;\n}\ntextarea.input-lg,\nselect[multiple].input-lg {\n  height: auto;\n}\n.has-feedback {\n  position: relative;\n}\n.has-feedback .form-control {\n  padding-right: 42.5px;\n}\n.has-feedback .form-control-feedback {\n  position: absolute;\n  top: 25px;\n  right: 0;\n  display: block;\n  width: 34px;\n  height: 34px;\n  line-height: 34px;\n  text-align: center;\n}\n.has-success .help-block,\n.has-success .control-label,\n.has-success .radio,\n.has-success .checkbox,\n.has-success .radio-inline,\n.has-success .checkbox-inline {\n  color: #3c763d;\n}\n.has-success .form-control {\n  border-color: #3c763d;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n}\n.has-success .form-control:focus {\n  border-color: #2b542c;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #67b168;\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #67b168;\n}\n.has-success .input-group-addon {\n  color: #3c763d;\n  border-color: #3c763d;\n  background-color: #dff0d8;\n}\n.has-success .form-control-feedback {\n  color: #3c763d;\n}\n.has-warning .help-block,\n.has-warning .control-label,\n.has-warning .radio,\n.has-warning .checkbox,\n.has-warning .radio-inline,\n.has-warning .checkbox-inline {\n  color: #8a6d3b;\n}\n.has-warning .form-control {\n  border-color: #8a6d3b;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n}\n.has-warning .form-control:focus {\n  border-color: #66512c;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #c0a16b;\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #c0a16b;\n}\n.has-warning .input-group-addon {\n  color: #8a6d3b;\n  border-color: #8a6d3b;\n  background-color: #fcf8e3;\n}\n.has-warning .form-control-feedback {\n  color: #8a6d3b;\n}\n.has-error .help-block,\n.has-error .control-label,\n.has-error .radio,\n.has-error .checkbox,\n.has-error .radio-inline,\n.has-error .checkbox-inline {\n  color: #a94442;\n}\n.has-error .form-control {\n  border-color: #a94442;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n}\n.has-error .form-control:focus {\n  border-color: #843534;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #ce8483;\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #ce8483;\n}\n.has-error .input-group-addon {\n  color: #a94442;\n  border-color: #a94442;\n  background-color: #f2dede;\n}\n.has-error .form-control-feedback {\n  color: #a94442;\n}\n.form-control-static {\n  margin-bottom: 0;\n}\n.help-block {\n  display: block;\n  margin-top: 5px;\n  margin-bottom: 10px;\n  color: #737373;\n}\n@media (min-width: 768px) {\n  .form-inline .form-group {\n    display: inline-block;\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .form-inline .form-control {\n    display: inline-block;\n    width: auto;\n    vertical-align: middle;\n  }\n  .form-inline .input-group > .form-control {\n    width: 100%;\n  }\n  .form-inline .control-label {\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .form-inline .radio,\n  .form-inline .checkbox {\n    display: inline-block;\n    margin-top: 0;\n    margin-bottom: 0;\n    padding-left: 0;\n    vertical-align: middle;\n  }\n  .form-inline .radio input[type=\"radio\"],\n  .form-inline .checkbox input[type=\"checkbox\"] {\n    float: none;\n    margin-left: 0;\n  }\n  .form-inline .has-feedback .form-control-feedback {\n    top: 0;\n  }\n}\n.form-horizontal .control-label,\n.form-horizontal .radio,\n.form-horizontal .checkbox,\n.form-horizontal .radio-inline,\n.form-horizontal .checkbox-inline {\n  margin-top: 0;\n  margin-bottom: 0;\n  padding-top: 7px;\n}\n.form-horizontal .radio,\n.form-horizontal .checkbox {\n  min-height: 27px;\n}\n.form-horizontal .form-group {\n  margin-left: -15px;\n  margin-right: -15px;\n}\n.form-horizontal .form-control-static {\n  padding-top: 7px;\n}\n@media (min-width: 768px) {\n  .form-horizontal .control-label {\n    text-align: right;\n  }\n}\n.form-horizontal .has-feedback .form-control-feedback {\n  top: 0;\n  right: 15px;\n}\n.btn {\n  display: inline-block;\n  margin-bottom: 0;\n  font-weight: normal;\n  text-align: center;\n  vertical-align: middle;\n  cursor: pointer;\n  background-image: none;\n  border: 1px solid transparent;\n  white-space: nowrap;\n  padding: 6px 12px;\n  font-size: 14px;\n  line-height: 1.42857143;\n  border-radius: 4px;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n.btn:focus,\n.btn:active:focus,\n.btn.active:focus {\n  outline: thin dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\n.btn:hover,\n.btn:focus {\n  color: #333333;\n  text-decoration: none;\n}\n.btn:active,\n.btn.active {\n  outline: 0;\n  background-image: none;\n  -webkit-box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n}\n.btn.disabled,\n.btn[disabled],\nfieldset[disabled] .btn {\n  cursor: not-allowed;\n  pointer-events: none;\n  opacity: 0.65;\n  filter: alpha(opacity=65);\n  -webkit-box-shadow: none;\n  box-shadow: none;\n}\n.btn-default {\n  color: #333333;\n  background-color: #ffffff;\n  border-color: #cccccc;\n}\n.btn-default:hover,\n.btn-default:focus,\n.btn-default:active,\n.btn-default.active,\n.open .dropdown-toggle.btn-default {\n  color: #333333;\n  background-color: #ebebeb;\n  border-color: #adadad;\n}\n.btn-default:active,\n.btn-default.active,\n.open .dropdown-toggle.btn-default {\n  background-image: none;\n}\n.btn-default.disabled,\n.btn-default[disabled],\nfieldset[disabled] .btn-default,\n.btn-default.disabled:hover,\n.btn-default[disabled]:hover,\nfieldset[disabled] .btn-default:hover,\n.btn-default.disabled:focus,\n.btn-default[disabled]:focus,\nfieldset[disabled] .btn-default:focus,\n.btn-default.disabled:active,\n.btn-default[disabled]:active,\nfieldset[disabled] .btn-default:active,\n.btn-default.disabled.active,\n.btn-default[disabled].active,\nfieldset[disabled] .btn-default.active {\n  background-color: #ffffff;\n  border-color: #cccccc;\n}\n.btn-default .badge {\n  color: #ffffff;\n  background-color: #333333;\n}\n.btn-primary {\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #357ebd;\n}\n.btn-primary:hover,\n.btn-primary:focus,\n.btn-primary:active,\n.btn-primary.active,\n.open .dropdown-toggle.btn-primary {\n  color: #ffffff;\n  background-color: #3276b1;\n  border-color: #285e8e;\n}\n.btn-primary:active,\n.btn-primary.active,\n.open .dropdown-toggle.btn-primary {\n  background-image: none;\n}\n.btn-primary.disabled,\n.btn-primary[disabled],\nfieldset[disabled] .btn-primary,\n.btn-primary.disabled:hover,\n.btn-primary[disabled]:hover,\nfieldset[disabled] .btn-primary:hover,\n.btn-primary.disabled:focus,\n.btn-primary[disabled]:focus,\nfieldset[disabled] .btn-primary:focus,\n.btn-primary.disabled:active,\n.btn-primary[disabled]:active,\nfieldset[disabled] .btn-primary:active,\n.btn-primary.disabled.active,\n.btn-primary[disabled].active,\nfieldset[disabled] .btn-primary.active {\n  background-color: #428bca;\n  border-color: #357ebd;\n}\n.btn-primary .badge {\n  color: #428bca;\n  background-color: #ffffff;\n}\n.btn-success {\n  color: #ffffff;\n  background-color: #5cb85c;\n  border-color: #4cae4c;\n}\n.btn-success:hover,\n.btn-success:focus,\n.btn-success:active,\n.btn-success.active,\n.open .dropdown-toggle.btn-success {\n  color: #ffffff;\n  background-color: #47a447;\n  border-color: #398439;\n}\n.btn-success:active,\n.btn-success.active,\n.open .dropdown-toggle.btn-success {\n  background-image: none;\n}\n.btn-success.disabled,\n.btn-success[disabled],\nfieldset[disabled] .btn-success,\n.btn-success.disabled:hover,\n.btn-success[disabled]:hover,\nfieldset[disabled] .btn-success:hover,\n.btn-success.disabled:focus,\n.btn-success[disabled]:focus,\nfieldset[disabled] .btn-success:focus,\n.btn-success.disabled:active,\n.btn-success[disabled]:active,\nfieldset[disabled] .btn-success:active,\n.btn-success.disabled.active,\n.btn-success[disabled].active,\nfieldset[disabled] .btn-success.active {\n  background-color: #5cb85c;\n  border-color: #4cae4c;\n}\n.btn-success .badge {\n  color: #5cb85c;\n  background-color: #ffffff;\n}\n.btn-info {\n  color: #ffffff;\n  background-color: #5bc0de;\n  border-color: #46b8da;\n}\n.btn-info:hover,\n.btn-info:focus,\n.btn-info:active,\n.btn-info.active,\n.open .dropdown-toggle.btn-info {\n  color: #ffffff;\n  background-color: #39b3d7;\n  border-color: #269abc;\n}\n.btn-info:active,\n.btn-info.active,\n.open .dropdown-toggle.btn-info {\n  background-image: none;\n}\n.btn-info.disabled,\n.btn-info[disabled],\nfieldset[disabled] .btn-info,\n.btn-info.disabled:hover,\n.btn-info[disabled]:hover,\nfieldset[disabled] .btn-info:hover,\n.btn-info.disabled:focus,\n.btn-info[disabled]:focus,\nfieldset[disabled] .btn-info:focus,\n.btn-info.disabled:active,\n.btn-info[disabled]:active,\nfieldset[disabled] .btn-info:active,\n.btn-info.disabled.active,\n.btn-info[disabled].active,\nfieldset[disabled] .btn-info.active {\n  background-color: #5bc0de;\n  border-color: #46b8da;\n}\n.btn-info .badge {\n  color: #5bc0de;\n  background-color: #ffffff;\n}\n.btn-warning {\n  color: #ffffff;\n  background-color: #f0ad4e;\n  border-color: #eea236;\n}\n.btn-warning:hover,\n.btn-warning:focus,\n.btn-warning:active,\n.btn-warning.active,\n.open .dropdown-toggle.btn-warning {\n  color: #ffffff;\n  background-color: #ed9c28;\n  border-color: #d58512;\n}\n.btn-warning:active,\n.btn-warning.active,\n.open .dropdown-toggle.btn-warning {\n  background-image: none;\n}\n.btn-warning.disabled,\n.btn-warning[disabled],\nfieldset[disabled] .btn-warning,\n.btn-warning.disabled:hover,\n.btn-warning[disabled]:hover,\nfieldset[disabled] .btn-warning:hover,\n.btn-warning.disabled:focus,\n.btn-warning[disabled]:focus,\nfieldset[disabled] .btn-warning:focus,\n.btn-warning.disabled:active,\n.btn-warning[disabled]:active,\nfieldset[disabled] .btn-warning:active,\n.btn-warning.disabled.active,\n.btn-warning[disabled].active,\nfieldset[disabled] .btn-warning.active {\n  background-color: #f0ad4e;\n  border-color: #eea236;\n}\n.btn-warning .badge {\n  color: #f0ad4e;\n  background-color: #ffffff;\n}\n.btn-danger {\n  color: #ffffff;\n  background-color: #d9534f;\n  border-color: #d43f3a;\n}\n.btn-danger:hover,\n.btn-danger:focus,\n.btn-danger:active,\n.btn-danger.active,\n.open .dropdown-toggle.btn-danger {\n  color: #ffffff;\n  background-color: #d2322d;\n  border-color: #ac2925;\n}\n.btn-danger:active,\n.btn-danger.active,\n.open .dropdown-toggle.btn-danger {\n  background-image: none;\n}\n.btn-danger.disabled,\n.btn-danger[disabled],\nfieldset[disabled] .btn-danger,\n.btn-danger.disabled:hover,\n.btn-danger[disabled]:hover,\nfieldset[disabled] .btn-danger:hover,\n.btn-danger.disabled:focus,\n.btn-danger[disabled]:focus,\nfieldset[disabled] .btn-danger:focus,\n.btn-danger.disabled:active,\n.btn-danger[disabled]:active,\nfieldset[disabled] .btn-danger:active,\n.btn-danger.disabled.active,\n.btn-danger[disabled].active,\nfieldset[disabled] .btn-danger.active {\n  background-color: #d9534f;\n  border-color: #d43f3a;\n}\n.btn-danger .badge {\n  color: #d9534f;\n  background-color: #ffffff;\n}\n.btn-link {\n  color: #428bca;\n  font-weight: normal;\n  cursor: pointer;\n  border-radius: 0;\n}\n.btn-link,\n.btn-link:active,\n.btn-link[disabled],\nfieldset[disabled] .btn-link {\n  background-color: transparent;\n  -webkit-box-shadow: none;\n  box-shadow: none;\n}\n.btn-link,\n.btn-link:hover,\n.btn-link:focus,\n.btn-link:active {\n  border-color: transparent;\n}\n.btn-link:hover,\n.btn-link:focus {\n  color: #2a6496;\n  text-decoration: underline;\n  background-color: transparent;\n}\n.btn-link[disabled]:hover,\nfieldset[disabled] .btn-link:hover,\n.btn-link[disabled]:focus,\nfieldset[disabled] .btn-link:focus {\n  color: #999999;\n  text-decoration: none;\n}\n.btn-lg,\n.btn-group-lg > .btn {\n  padding: 10px 16px;\n  font-size: 18px;\n  line-height: 1.33;\n  border-radius: 6px;\n}\n.btn-sm,\n.btn-group-sm > .btn {\n  padding: 5px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\n.btn-xs,\n.btn-group-xs > .btn {\n  padding: 1px 5px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\n.btn-block {\n  display: block;\n  width: 100%;\n  padding-left: 0;\n  padding-right: 0;\n}\n.btn-block + .btn-block {\n  margin-top: 5px;\n}\ninput[type=\"submit\"].btn-block,\ninput[type=\"reset\"].btn-block,\ninput[type=\"button\"].btn-block {\n  width: 100%;\n}\n.fade {\n  opacity: 0;\n  -webkit-transition: opacity 0.15s linear;\n  transition: opacity 0.15s linear;\n}\n.fade.in {\n  opacity: 1;\n}\n.collapse {\n  display: none;\n}\n.collapse.in {\n  display: block;\n}\n.collapsing {\n  position: relative;\n  height: 0;\n  overflow: hidden;\n  -webkit-transition: height 0.35s ease;\n  transition: height 0.35s ease;\n}\n@font-face {\n  font-family: 'Glyphicons Halflings';\n  src: url('../fonts/glyphicons-halflings-regular.eot');\n  src: url('../fonts/glyphicons-halflings-regular.eot?#iefix') format('embedded-opentype'), url('../fonts/glyphicons-halflings-regular.woff') format('woff'), url('../fonts/glyphicons-halflings-regular.ttf') format('truetype'), url('../fonts/glyphicons-halflings-regular.svg#glyphicons_halflingsregular') format('svg');\n}\n.glyphicon {\n  position: relative;\n  top: 1px;\n  display: inline-block;\n  font-family: 'Glyphicons Halflings';\n  font-style: normal;\n  font-weight: normal;\n  line-height: 1;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.glyphicon-asterisk:before {\n  content: \"\\2a\";\n}\n.glyphicon-plus:before {\n  content: \"\\2b\";\n}\n.glyphicon-euro:before {\n  content: \"\\20ac\";\n}\n.glyphicon-minus:before {\n  content: \"\\2212\";\n}\n.glyphicon-cloud:before {\n  content: \"\\2601\";\n}\n.glyphicon-envelope:before {\n  content: \"\\2709\";\n}\n.glyphicon-pencil:before {\n  content: \"\\270f\";\n}\n.glyphicon-glass:before {\n  content: \"\\e001\";\n}\n.glyphicon-music:before {\n  content: \"\\e002\";\n}\n.glyphicon-search:before {\n  content: \"\\e003\";\n}\n.glyphicon-heart:before {\n  content: \"\\e005\";\n}\n.glyphicon-star:before {\n  content: \"\\e006\";\n}\n.glyphicon-star-empty:before {\n  content: \"\\e007\";\n}\n.glyphicon-user:before {\n  content: \"\\e008\";\n}\n.glyphicon-film:before {\n  content: \"\\e009\";\n}\n.glyphicon-th-large:before {\n  content: \"\\e010\";\n}\n.glyphicon-th:before {\n  content: \"\\e011\";\n}\n.glyphicon-th-list:before {\n  content: \"\\e012\";\n}\n.glyphicon-ok:before {\n  content: \"\\e013\";\n}\n.glyphicon-remove:before {\n  content: \"\\e014\";\n}\n.glyphicon-zoom-in:before {\n  content: \"\\e015\";\n}\n.glyphicon-zoom-out:before {\n  content: \"\\e016\";\n}\n.glyphicon-off:before {\n  content: \"\\e017\";\n}\n.glyphicon-signal:before {\n  content: \"\\e018\";\n}\n.glyphicon-cog:before {\n  content: \"\\e019\";\n}\n.glyphicon-trash:before {\n  content: \"\\e020\";\n}\n.glyphicon-home:before {\n  content: \"\\e021\";\n}\n.glyphicon-file:before {\n  content: \"\\e022\";\n}\n.glyphicon-time:before {\n  content: \"\\e023\";\n}\n.glyphicon-road:before {\n  content: \"\\e024\";\n}\n.glyphicon-download-alt:before {\n  content: \"\\e025\";\n}\n.glyphicon-download:before {\n  content: \"\\e026\";\n}\n.glyphicon-upload:before {\n  content: \"\\e027\";\n}\n.glyphicon-inbox:before {\n  content: \"\\e028\";\n}\n.glyphicon-play-circle:before {\n  content: \"\\e029\";\n}\n.glyphicon-repeat:before {\n  content: \"\\e030\";\n}\n.glyphicon-refresh:before {\n  content: \"\\e031\";\n}\n.glyphicon-list-alt:before {\n  content: \"\\e032\";\n}\n.glyphicon-lock:before {\n  content: \"\\e033\";\n}\n.glyphicon-flag:before {\n  content: \"\\e034\";\n}\n.glyphicon-headphones:before {\n  content: \"\\e035\";\n}\n.glyphicon-volume-off:before {\n  content: \"\\e036\";\n}\n.glyphicon-volume-down:before {\n  content: \"\\e037\";\n}\n.glyphicon-volume-up:before {\n  content: \"\\e038\";\n}\n.glyphicon-qrcode:before {\n  content: \"\\e039\";\n}\n.glyphicon-barcode:before {\n  content: \"\\e040\";\n}\n.glyphicon-tag:before {\n  content: \"\\e041\";\n}\n.glyphicon-tags:before {\n  content: \"\\e042\";\n}\n.glyphicon-book:before {\n  content: \"\\e043\";\n}\n.glyphicon-bookmark:before {\n  content: \"\\e044\";\n}\n.glyphicon-print:before {\n  content: \"\\e045\";\n}\n.glyphicon-camera:before {\n  content: \"\\e046\";\n}\n.glyphicon-font:before {\n  content: \"\\e047\";\n}\n.glyphicon-bold:before {\n  content: \"\\e048\";\n}\n.glyphicon-italic:before {\n  content: \"\\e049\";\n}\n.glyphicon-text-height:before {\n  content: \"\\e050\";\n}\n.glyphicon-text-width:before {\n  content: \"\\e051\";\n}\n.glyphicon-align-left:before {\n  content: \"\\e052\";\n}\n.glyphicon-align-center:before {\n  content: \"\\e053\";\n}\n.glyphicon-align-right:before {\n  content: \"\\e054\";\n}\n.glyphicon-align-justify:before {\n  content: \"\\e055\";\n}\n.glyphicon-list:before {\n  content: \"\\e056\";\n}\n.glyphicon-indent-left:before {\n  content: \"\\e057\";\n}\n.glyphicon-indent-right:before {\n  content: \"\\e058\";\n}\n.glyphicon-facetime-video:before {\n  content: \"\\e059\";\n}\n.glyphicon-picture:before {\n  content: \"\\e060\";\n}\n.glyphicon-map-marker:before {\n  content: \"\\e062\";\n}\n.glyphicon-adjust:before {\n  content: \"\\e063\";\n}\n.glyphicon-tint:before {\n  content: \"\\e064\";\n}\n.glyphicon-edit:before {\n  content: \"\\e065\";\n}\n.glyphicon-share:before {\n  content: \"\\e066\";\n}\n.glyphicon-check:before {\n  content: \"\\e067\";\n}\n.glyphicon-move:before {\n  content: \"\\e068\";\n}\n.glyphicon-step-backward:before {\n  content: \"\\e069\";\n}\n.glyphicon-fast-backward:before {\n  content: \"\\e070\";\n}\n.glyphicon-backward:before {\n  content: \"\\e071\";\n}\n.glyphicon-play:before {\n  content: \"\\e072\";\n}\n.glyphicon-pause:before {\n  content: \"\\e073\";\n}\n.glyphicon-stop:before {\n  content: \"\\e074\";\n}\n.glyphicon-forward:before {\n  content: \"\\e075\";\n}\n.glyphicon-fast-forward:before {\n  content: \"\\e076\";\n}\n.glyphicon-step-forward:before {\n  content: \"\\e077\";\n}\n.glyphicon-eject:before {\n  content: \"\\e078\";\n}\n.glyphicon-chevron-left:before {\n  content: \"\\e079\";\n}\n.glyphicon-chevron-right:before {\n  content: \"\\e080\";\n}\n.glyphicon-plus-sign:before {\n  content: \"\\e081\";\n}\n.glyphicon-minus-sign:before {\n  content: \"\\e082\";\n}\n.glyphicon-remove-sign:before {\n  content: \"\\e083\";\n}\n.glyphicon-ok-sign:before {\n  content: \"\\e084\";\n}\n.glyphicon-question-sign:before {\n  content: \"\\e085\";\n}\n.glyphicon-info-sign:before {\n  content: \"\\e086\";\n}\n.glyphicon-screenshot:before {\n  content: \"\\e087\";\n}\n.glyphicon-remove-circle:before {\n  content: \"\\e088\";\n}\n.glyphicon-ok-circle:before {\n  content: \"\\e089\";\n}\n.glyphicon-ban-circle:before {\n  content: \"\\e090\";\n}\n.glyphicon-arrow-left:before {\n  content: \"\\e091\";\n}\n.glyphicon-arrow-right:before {\n  content: \"\\e092\";\n}\n.glyphicon-arrow-up:before {\n  content: \"\\e093\";\n}\n.glyphicon-arrow-down:before {\n  content: \"\\e094\";\n}\n.glyphicon-share-alt:before {\n  content: \"\\e095\";\n}\n.glyphicon-resize-full:before {\n  content: \"\\e096\";\n}\n.glyphicon-resize-small:before {\n  content: \"\\e097\";\n}\n.glyphicon-exclamation-sign:before {\n  content: \"\\e101\";\n}\n.glyphicon-gift:before {\n  content: \"\\e102\";\n}\n.glyphicon-leaf:before {\n  content: \"\\e103\";\n}\n.glyphicon-fire:before {\n  content: \"\\e104\";\n}\n.glyphicon-eye-open:before {\n  content: \"\\e105\";\n}\n.glyphicon-eye-close:before {\n  content: \"\\e106\";\n}\n.glyphicon-warning-sign:before {\n  content: \"\\e107\";\n}\n.glyphicon-plane:before {\n  content: \"\\e108\";\n}\n.glyphicon-calendar:before {\n  content: \"\\e109\";\n}\n.glyphicon-random:before {\n  content: \"\\e110\";\n}\n.glyphicon-comment:before {\n  content: \"\\e111\";\n}\n.glyphicon-magnet:before {\n  content: \"\\e112\";\n}\n.glyphicon-chevron-up:before {\n  content: \"\\e113\";\n}\n.glyphicon-chevron-down:before {\n  content: \"\\e114\";\n}\n.glyphicon-retweet:before {\n  content: \"\\e115\";\n}\n.glyphicon-shopping-cart:before {\n  content: \"\\e116\";\n}\n.glyphicon-folder-close:before {\n  content: \"\\e117\";\n}\n.glyphicon-folder-open:before {\n  content: \"\\e118\";\n}\n.glyphicon-resize-vertical:before {\n  content: \"\\e119\";\n}\n.glyphicon-resize-horizontal:before {\n  content: \"\\e120\";\n}\n.glyphicon-hdd:before {\n  content: \"\\e121\";\n}\n.glyphicon-bullhorn:before {\n  content: \"\\e122\";\n}\n.glyphicon-bell:before {\n  content: \"\\e123\";\n}\n.glyphicon-certificate:before {\n  content: \"\\e124\";\n}\n.glyphicon-thumbs-up:before {\n  content: \"\\e125\";\n}\n.glyphicon-thumbs-down:before {\n  content: \"\\e126\";\n}\n.glyphicon-hand-right:before {\n  content: \"\\e127\";\n}\n.glyphicon-hand-left:before {\n  content: \"\\e128\";\n}\n.glyphicon-hand-up:before {\n  content: \"\\e129\";\n}\n.glyphicon-hand-down:before {\n  content: \"\\e130\";\n}\n.glyphicon-circle-arrow-right:before {\n  content: \"\\e131\";\n}\n.glyphicon-circle-arrow-left:before {\n  content: \"\\e132\";\n}\n.glyphicon-circle-arrow-up:before {\n  content: \"\\e133\";\n}\n.glyphicon-circle-arrow-down:before {\n  content: \"\\e134\";\n}\n.glyphicon-globe:before {\n  content: \"\\e135\";\n}\n.glyphicon-wrench:before {\n  content: \"\\e136\";\n}\n.glyphicon-tasks:before {\n  content: \"\\e137\";\n}\n.glyphicon-filter:before {\n  content: \"\\e138\";\n}\n.glyphicon-briefcase:before {\n  content: \"\\e139\";\n}\n.glyphicon-fullscreen:before {\n  content: \"\\e140\";\n}\n.glyphicon-dashboard:before {\n  content: \"\\e141\";\n}\n.glyphicon-paperclip:before {\n  content: \"\\e142\";\n}\n.glyphicon-heart-empty:before {\n  content: \"\\e143\";\n}\n.glyphicon-link:before {\n  content: \"\\e144\";\n}\n.glyphicon-phone:before {\n  content: \"\\e145\";\n}\n.glyphicon-pushpin:before {\n  content: \"\\e146\";\n}\n.glyphicon-usd:before {\n  content: \"\\e148\";\n}\n.glyphicon-gbp:before {\n  content: \"\\e149\";\n}\n.glyphicon-sort:before {\n  content: \"\\e150\";\n}\n.glyphicon-sort-by-alphabet:before {\n  content: \"\\e151\";\n}\n.glyphicon-sort-by-alphabet-alt:before {\n  content: \"\\e152\";\n}\n.glyphicon-sort-by-order:before {\n  content: \"\\e153\";\n}\n.glyphicon-sort-by-order-alt:before {\n  content: \"\\e154\";\n}\n.glyphicon-sort-by-attributes:before {\n  content: \"\\e155\";\n}\n.glyphicon-sort-by-attributes-alt:before {\n  content: \"\\e156\";\n}\n.glyphicon-unchecked:before {\n  content: \"\\e157\";\n}\n.glyphicon-expand:before {\n  content: \"\\e158\";\n}\n.glyphicon-collapse-down:before {\n  content: \"\\e159\";\n}\n.glyphicon-collapse-up:before {\n  content: \"\\e160\";\n}\n.glyphicon-log-in:before {\n  content: \"\\e161\";\n}\n.glyphicon-flash:before {\n  content: \"\\e162\";\n}\n.glyphicon-log-out:before {\n  content: \"\\e163\";\n}\n.glyphicon-new-window:before {\n  content: \"\\e164\";\n}\n.glyphicon-record:before {\n  content: \"\\e165\";\n}\n.glyphicon-save:before {\n  content: \"\\e166\";\n}\n.glyphicon-open:before {\n  content: \"\\e167\";\n}\n.glyphicon-saved:before {\n  content: \"\\e168\";\n}\n.glyphicon-import:before {\n  content: \"\\e169\";\n}\n.glyphicon-export:before {\n  content: \"\\e170\";\n}\n.glyphicon-send:before {\n  content: \"\\e171\";\n}\n.glyphicon-floppy-disk:before {\n  content: \"\\e172\";\n}\n.glyphicon-floppy-saved:before {\n  content: \"\\e173\";\n}\n.glyphicon-floppy-remove:before {\n  content: \"\\e174\";\n}\n.glyphicon-floppy-save:before {\n  content: \"\\e175\";\n}\n.glyphicon-floppy-open:before {\n  content: \"\\e176\";\n}\n.glyphicon-credit-card:before {\n  content: \"\\e177\";\n}\n.glyphicon-transfer:before {\n  content: \"\\e178\";\n}\n.glyphicon-cutlery:before {\n  content: \"\\e179\";\n}\n.glyphicon-header:before {\n  content: \"\\e180\";\n}\n.glyphicon-compressed:before {\n  content: \"\\e181\";\n}\n.glyphicon-earphone:before {\n  content: \"\\e182\";\n}\n.glyphicon-phone-alt:before {\n  content: \"\\e183\";\n}\n.glyphicon-tower:before {\n  content: \"\\e184\";\n}\n.glyphicon-stats:before {\n  content: \"\\e185\";\n}\n.glyphicon-sd-video:before {\n  content: \"\\e186\";\n}\n.glyphicon-hd-video:before {\n  content: \"\\e187\";\n}\n.glyphicon-subtitles:before {\n  content: \"\\e188\";\n}\n.glyphicon-sound-stereo:before {\n  content: \"\\e189\";\n}\n.glyphicon-sound-dolby:before {\n  content: \"\\e190\";\n}\n.glyphicon-sound-5-1:before {\n  content: \"\\e191\";\n}\n.glyphicon-sound-6-1:before {\n  content: \"\\e192\";\n}\n.glyphicon-sound-7-1:before {\n  content: \"\\e193\";\n}\n.glyphicon-copyright-mark:before {\n  content: \"\\e194\";\n}\n.glyphicon-registration-mark:before {\n  content: \"\\e195\";\n}\n.glyphicon-cloud-download:before {\n  content: \"\\e197\";\n}\n.glyphicon-cloud-upload:before {\n  content: \"\\e198\";\n}\n.glyphicon-tree-conifer:before {\n  content: \"\\e199\";\n}\n.glyphicon-tree-deciduous:before {\n  content: \"\\e200\";\n}\n.caret {\n  display: inline-block;\n  width: 0;\n  height: 0;\n  margin-left: 2px;\n  vertical-align: middle;\n  border-top: 4px solid;\n  border-right: 4px solid transparent;\n  border-left: 4px solid transparent;\n}\n.dropdown {\n  position: relative;\n}\n.dropdown-toggle:focus {\n  outline: 0;\n}\n.dropdown-menu {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  z-index: 1000;\n  display: none;\n  float: left;\n  min-width: 160px;\n  padding: 5px 0;\n  margin: 2px 0 0;\n  list-style: none;\n  font-size: 14px;\n  background-color: #ffffff;\n  border: 1px solid #cccccc;\n  border: 1px solid rgba(0, 0, 0, 0.15);\n  border-radius: 4px;\n  -webkit-box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);\n  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);\n  background-clip: padding-box;\n}\n.dropdown-menu.pull-right {\n  right: 0;\n  left: auto;\n}\n.dropdown-menu .divider {\n  height: 1px;\n  margin: 9px 0;\n  overflow: hidden;\n  background-color: #e5e5e5;\n}\n.dropdown-menu > li > a {\n  display: block;\n  padding: 3px 20px;\n  clear: both;\n  font-weight: normal;\n  line-height: 1.42857143;\n  color: #333333;\n  white-space: nowrap;\n}\n.dropdown-menu > li > a:hover,\n.dropdown-menu > li > a:focus {\n  text-decoration: none;\n  color: #262626;\n  background-color: #f5f5f5;\n}\n.dropdown-menu > .active > a,\n.dropdown-menu > .active > a:hover,\n.dropdown-menu > .active > a:focus {\n  color: #ffffff;\n  text-decoration: none;\n  outline: 0;\n  background-color: #428bca;\n}\n.dropdown-menu > .disabled > a,\n.dropdown-menu > .disabled > a:hover,\n.dropdown-menu > .disabled > a:focus {\n  color: #999999;\n}\n.dropdown-menu > .disabled > a:hover,\n.dropdown-menu > .disabled > a:focus {\n  text-decoration: none;\n  background-color: transparent;\n  background-image: none;\n  filter: progid:DXImageTransform.Microsoft.gradient(enabled = false);\n  cursor: not-allowed;\n}\n.open > .dropdown-menu {\n  display: block;\n}\n.open > a {\n  outline: 0;\n}\n.dropdown-menu-right {\n  left: auto;\n  right: 0;\n}\n.dropdown-menu-left {\n  left: 0;\n  right: auto;\n}\n.dropdown-header {\n  display: block;\n  padding: 3px 20px;\n  font-size: 12px;\n  line-height: 1.42857143;\n  color: #999999;\n}\n.dropdown-backdrop {\n  position: fixed;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  top: 0;\n  z-index: 990;\n}\n.pull-right > .dropdown-menu {\n  right: 0;\n  left: auto;\n}\n.dropup .caret,\n.navbar-fixed-bottom .dropdown .caret {\n  border-top: 0;\n  border-bottom: 4px solid;\n  content: \"\";\n}\n.dropup .dropdown-menu,\n.navbar-fixed-bottom .dropdown .dropdown-menu {\n  top: auto;\n  bottom: 100%;\n  margin-bottom: 1px;\n}\n@media (min-width: 768px) {\n  .navbar-right .dropdown-menu {\n    left: auto;\n    right: 0;\n  }\n  .navbar-right .dropdown-menu-left {\n    left: 0;\n    right: auto;\n  }\n}\n.btn-group,\n.btn-group-vertical {\n  position: relative;\n  display: inline-block;\n  vertical-align: middle;\n}\n.btn-group > .btn,\n.btn-group-vertical > .btn {\n  position: relative;\n  float: left;\n}\n.btn-group > .btn:hover,\n.btn-group-vertical > .btn:hover,\n.btn-group > .btn:focus,\n.btn-group-vertical > .btn:focus,\n.btn-group > .btn:active,\n.btn-group-vertical > .btn:active,\n.btn-group > .btn.active,\n.btn-group-vertical > .btn.active {\n  z-index: 2;\n}\n.btn-group > .btn:focus,\n.btn-group-vertical > .btn:focus {\n  outline: none;\n}\n.btn-group .btn + .btn,\n.btn-group .btn + .btn-group,\n.btn-group .btn-group + .btn,\n.btn-group .btn-group + .btn-group {\n  margin-left: -1px;\n}\n.btn-toolbar {\n  margin-left: -5px;\n}\n.btn-toolbar .btn-group,\n.btn-toolbar .input-group {\n  float: left;\n}\n.btn-toolbar > .btn,\n.btn-toolbar > .btn-group,\n.btn-toolbar > .input-group {\n  margin-left: 5px;\n}\n.btn-group > .btn:not(:first-child):not(:last-child):not(.dropdown-toggle) {\n  border-radius: 0;\n}\n.btn-group > .btn:first-child {\n  margin-left: 0;\n}\n.btn-group > .btn:first-child:not(:last-child):not(.dropdown-toggle) {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.btn-group > .btn:last-child:not(:first-child),\n.btn-group > .dropdown-toggle:not(:first-child) {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group > .btn-group {\n  float: left;\n}\n.btn-group > .btn-group:not(:first-child):not(:last-child) > .btn {\n  border-radius: 0;\n}\n.btn-group > .btn-group:first-child > .btn:last-child,\n.btn-group > .btn-group:first-child > .dropdown-toggle {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.btn-group > .btn-group:last-child > .btn:first-child {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group .dropdown-toggle:active,\n.btn-group.open .dropdown-toggle {\n  outline: 0;\n}\n.btn-group > .btn + .dropdown-toggle {\n  padding-left: 8px;\n  padding-right: 8px;\n}\n.btn-group > .btn-lg + .dropdown-toggle {\n  padding-left: 12px;\n  padding-right: 12px;\n}\n.btn-group.open .dropdown-toggle {\n  -webkit-box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n}\n.btn-group.open .dropdown-toggle.btn-link {\n  -webkit-box-shadow: none;\n  box-shadow: none;\n}\n.btn .caret {\n  margin-left: 0;\n}\n.btn-lg .caret {\n  border-width: 5px 5px 0;\n  border-bottom-width: 0;\n}\n.dropup .btn-lg .caret {\n  border-width: 0 5px 5px;\n}\n.btn-group-vertical > .btn,\n.btn-group-vertical > .btn-group,\n.btn-group-vertical > .btn-group > .btn {\n  display: block;\n  float: none;\n  width: 100%;\n  max-width: 100%;\n}\n.btn-group-vertical > .btn-group > .btn {\n  float: none;\n}\n.btn-group-vertical > .btn + .btn,\n.btn-group-vertical > .btn + .btn-group,\n.btn-group-vertical > .btn-group + .btn,\n.btn-group-vertical > .btn-group + .btn-group {\n  margin-top: -1px;\n  margin-left: 0;\n}\n.btn-group-vertical > .btn:not(:first-child):not(:last-child) {\n  border-radius: 0;\n}\n.btn-group-vertical > .btn:first-child:not(:last-child) {\n  border-top-right-radius: 4px;\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.btn-group-vertical > .btn:last-child:not(:first-child) {\n  border-bottom-left-radius: 4px;\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group-vertical > .btn-group:not(:first-child):not(:last-child) > .btn {\n  border-radius: 0;\n}\n.btn-group-vertical > .btn-group:first-child:not(:last-child) > .btn:last-child,\n.btn-group-vertical > .btn-group:first-child:not(:last-child) > .dropdown-toggle {\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.btn-group-vertical > .btn-group:last-child:not(:first-child) > .btn:first-child {\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group-justified {\n  display: table;\n  width: 100%;\n  table-layout: fixed;\n  border-collapse: separate;\n}\n.btn-group-justified > .btn,\n.btn-group-justified > .btn-group {\n  float: none;\n  display: table-cell;\n  width: 1%;\n}\n.btn-group-justified > .btn-group .btn {\n  width: 100%;\n}\n[data-toggle=\"buttons\"] > .btn > input[type=\"radio\"],\n[data-toggle=\"buttons\"] > .btn > input[type=\"checkbox\"] {\n  display: none;\n}\n.input-group {\n  position: relative;\n  display: table;\n  border-collapse: separate;\n}\n.input-group[class*=\"col-\"] {\n  float: none;\n  padding-left: 0;\n  padding-right: 0;\n}\n.input-group .form-control {\n  position: relative;\n  z-index: 2;\n  float: left;\n  width: 100%;\n  margin-bottom: 0;\n}\n.input-group-lg > .form-control,\n.input-group-lg > .input-group-addon,\n.input-group-lg > .input-group-btn > .btn {\n  height: 46px;\n  padding: 10px 16px;\n  font-size: 18px;\n  line-height: 1.33;\n  border-radius: 6px;\n}\nselect.input-group-lg > .form-control,\nselect.input-group-lg > .input-group-addon,\nselect.input-group-lg > .input-group-btn > .btn {\n  height: 46px;\n  line-height: 46px;\n}\ntextarea.input-group-lg > .form-control,\ntextarea.input-group-lg > .input-group-addon,\ntextarea.input-group-lg > .input-group-btn > .btn,\nselect[multiple].input-group-lg > .form-control,\nselect[multiple].input-group-lg > .input-group-addon,\nselect[multiple].input-group-lg > .input-group-btn > .btn {\n  height: auto;\n}\n.input-group-sm > .form-control,\n.input-group-sm > .input-group-addon,\n.input-group-sm > .input-group-btn > .btn {\n  height: 30px;\n  padding: 5px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\nselect.input-group-sm > .form-control,\nselect.input-group-sm > .input-group-addon,\nselect.input-group-sm > .input-group-btn > .btn {\n  height: 30px;\n  line-height: 30px;\n}\ntextarea.input-group-sm > .form-control,\ntextarea.input-group-sm > .input-group-addon,\ntextarea.input-group-sm > .input-group-btn > .btn,\nselect[multiple].input-group-sm > .form-control,\nselect[multiple].input-group-sm > .input-group-addon,\nselect[multiple].input-group-sm > .input-group-btn > .btn {\n  height: auto;\n}\n.input-group-addon,\n.input-group-btn,\n.input-group .form-control {\n  display: table-cell;\n}\n.input-group-addon:not(:first-child):not(:last-child),\n.input-group-btn:not(:first-child):not(:last-child),\n.input-group .form-control:not(:first-child):not(:last-child) {\n  border-radius: 0;\n}\n.input-group-addon,\n.input-group-btn {\n  width: 1%;\n  white-space: nowrap;\n  vertical-align: middle;\n}\n.input-group-addon {\n  padding: 6px 12px;\n  font-size: 14px;\n  font-weight: normal;\n  line-height: 1;\n  color: #555555;\n  text-align: center;\n  background-color: #eeeeee;\n  border: 1px solid #cccccc;\n  border-radius: 4px;\n}\n.input-group-addon.input-sm {\n  padding: 5px 10px;\n  font-size: 12px;\n  border-radius: 3px;\n}\n.input-group-addon.input-lg {\n  padding: 10px 16px;\n  font-size: 18px;\n  border-radius: 6px;\n}\n.input-group-addon input[type=\"radio\"],\n.input-group-addon input[type=\"checkbox\"] {\n  margin-top: 0;\n}\n.input-group .form-control:first-child,\n.input-group-addon:first-child,\n.input-group-btn:first-child > .btn,\n.input-group-btn:first-child > .btn-group > .btn,\n.input-group-btn:first-child > .dropdown-toggle,\n.input-group-btn:last-child > .btn:not(:last-child):not(.dropdown-toggle),\n.input-group-btn:last-child > .btn-group:not(:last-child) > .btn {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.input-group-addon:first-child {\n  border-right: 0;\n}\n.input-group .form-control:last-child,\n.input-group-addon:last-child,\n.input-group-btn:last-child > .btn,\n.input-group-btn:last-child > .btn-group > .btn,\n.input-group-btn:last-child > .dropdown-toggle,\n.input-group-btn:first-child > .btn:not(:first-child),\n.input-group-btn:first-child > .btn-group:not(:first-child) > .btn {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.input-group-addon:last-child {\n  border-left: 0;\n}\n.input-group-btn {\n  position: relative;\n  font-size: 0;\n  white-space: nowrap;\n}\n.input-group-btn > .btn {\n  position: relative;\n}\n.input-group-btn > .btn + .btn {\n  margin-left: -1px;\n}\n.input-group-btn > .btn:hover,\n.input-group-btn > .btn:focus,\n.input-group-btn > .btn:active {\n  z-index: 2;\n}\n.input-group-btn:first-child > .btn,\n.input-group-btn:first-child > .btn-group {\n  margin-right: -1px;\n}\n.input-group-btn:last-child > .btn,\n.input-group-btn:last-child > .btn-group {\n  margin-left: -1px;\n}\n.nav {\n  margin-bottom: 0;\n  padding-left: 0;\n  list-style: none;\n}\n.nav > li {\n  position: relative;\n  display: block;\n}\n.nav > li > a {\n  position: relative;\n  display: block;\n  padding: 10px 15px;\n}\n.nav > li > a:hover,\n.nav > li > a:focus {\n  text-decoration: none;\n  background-color: #eeeeee;\n}\n.nav > li.disabled > a {\n  color: #999999;\n}\n.nav > li.disabled > a:hover,\n.nav > li.disabled > a:focus {\n  color: #999999;\n  text-decoration: none;\n  background-color: transparent;\n  cursor: not-allowed;\n}\n.nav .open > a,\n.nav .open > a:hover,\n.nav .open > a:focus {\n  background-color: #eeeeee;\n  border-color: #428bca;\n}\n.nav .nav-divider {\n  height: 1px;\n  margin: 9px 0;\n  overflow: hidden;\n  background-color: #e5e5e5;\n}\n.nav > li > a > img {\n  max-width: none;\n}\n.nav-tabs {\n  border-bottom: 1px solid #dddddd;\n}\n.nav-tabs > li {\n  float: left;\n  margin-bottom: -1px;\n}\n.nav-tabs > li > a {\n  margin-right: 2px;\n  line-height: 1.42857143;\n  border: 1px solid transparent;\n  border-radius: 4px 4px 0 0;\n}\n.nav-tabs > li > a:hover {\n  border-color: #eeeeee #eeeeee #dddddd;\n}\n.nav-tabs > li.active > a,\n.nav-tabs > li.active > a:hover,\n.nav-tabs > li.active > a:focus {\n  color: #555555;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-bottom-color: transparent;\n  cursor: default;\n}\n.nav-tabs.nav-justified {\n  width: 100%;\n  border-bottom: 0;\n}\n.nav-tabs.nav-justified > li {\n  float: none;\n}\n.nav-tabs.nav-justified > li > a {\n  text-align: center;\n  margin-bottom: 5px;\n}\n.nav-tabs.nav-justified > .dropdown .dropdown-menu {\n  top: auto;\n  left: auto;\n}\n@media (min-width: 768px) {\n  .nav-tabs.nav-justified > li {\n    display: table-cell;\n    width: 1%;\n  }\n  .nav-tabs.nav-justified > li > a {\n    margin-bottom: 0;\n  }\n}\n.nav-tabs.nav-justified > li > a {\n  margin-right: 0;\n  border-radius: 4px;\n}\n.nav-tabs.nav-justified > .active > a,\n.nav-tabs.nav-justified > .active > a:hover,\n.nav-tabs.nav-justified > .active > a:focus {\n  border: 1px solid #dddddd;\n}\n@media (min-width: 768px) {\n  .nav-tabs.nav-justified > li > a {\n    border-bottom: 1px solid #dddddd;\n    border-radius: 4px 4px 0 0;\n  }\n  .nav-tabs.nav-justified > .active > a,\n  .nav-tabs.nav-justified > .active > a:hover,\n  .nav-tabs.nav-justified > .active > a:focus {\n    border-bottom-color: #ffffff;\n  }\n}\n.nav-pills > li {\n  float: left;\n}\n.nav-pills > li > a {\n  border-radius: 4px;\n}\n.nav-pills > li + li {\n  margin-left: 2px;\n}\n.nav-pills > li.active > a,\n.nav-pills > li.active > a:hover,\n.nav-pills > li.active > a:focus {\n  color: #ffffff;\n  background-color: #428bca;\n}\n.nav-stacked > li {\n  float: none;\n}\n.nav-stacked > li + li {\n  margin-top: 2px;\n  margin-left: 0;\n}\n.nav-justified {\n  width: 100%;\n}\n.nav-justified > li {\n  float: none;\n}\n.nav-justified > li > a {\n  text-align: center;\n  margin-bottom: 5px;\n}\n.nav-justified > .dropdown .dropdown-menu {\n  top: auto;\n  left: auto;\n}\n@media (min-width: 768px) {\n  .nav-justified > li {\n    display: table-cell;\n    width: 1%;\n  }\n  .nav-justified > li > a {\n    margin-bottom: 0;\n  }\n}\n.nav-tabs-justified {\n  border-bottom: 0;\n}\n.nav-tabs-justified > li > a {\n  margin-right: 0;\n  border-radius: 4px;\n}\n.nav-tabs-justified > .active > a,\n.nav-tabs-justified > .active > a:hover,\n.nav-tabs-justified > .active > a:focus {\n  border: 1px solid #dddddd;\n}\n@media (min-width: 768px) {\n  .nav-tabs-justified > li > a {\n    border-bottom: 1px solid #dddddd;\n    border-radius: 4px 4px 0 0;\n  }\n  .nav-tabs-justified > .active > a,\n  .nav-tabs-justified > .active > a:hover,\n  .nav-tabs-justified > .active > a:focus {\n    border-bottom-color: #ffffff;\n  }\n}\n.tab-content > .tab-pane {\n  display: none;\n}\n.tab-content > .active {\n  display: block;\n}\n.nav-tabs .dropdown-menu {\n  margin-top: -1px;\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.navbar {\n  position: relative;\n  min-height: 50px;\n  margin-bottom: 20px;\n  border: 1px solid transparent;\n}\n@media (min-width: 768px) {\n  .navbar {\n    border-radius: 4px;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-header {\n    float: left;\n  }\n}\n.navbar-collapse {\n  max-height: 340px;\n  overflow-x: visible;\n  padding-right: 15px;\n  padding-left: 15px;\n  border-top: 1px solid transparent;\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);\n  -webkit-overflow-scrolling: touch;\n}\n.navbar-collapse.in {\n  overflow-y: auto;\n}\n@media (min-width: 768px) {\n  .navbar-collapse {\n    width: auto;\n    border-top: 0;\n    box-shadow: none;\n  }\n  .navbar-collapse.collapse {\n    display: block !important;\n    height: auto !important;\n    padding-bottom: 0;\n    overflow: visible !important;\n  }\n  .navbar-collapse.in {\n    overflow-y: visible;\n  }\n  .navbar-fixed-top .navbar-collapse,\n  .navbar-static-top .navbar-collapse,\n  .navbar-fixed-bottom .navbar-collapse {\n    padding-left: 0;\n    padding-right: 0;\n  }\n}\n.container > .navbar-header,\n.container-fluid > .navbar-header,\n.container > .navbar-collapse,\n.container-fluid > .navbar-collapse {\n  margin-right: -15px;\n  margin-left: -15px;\n}\n@media (min-width: 768px) {\n  .container > .navbar-header,\n  .container-fluid > .navbar-header,\n  .container > .navbar-collapse,\n  .container-fluid > .navbar-collapse {\n    margin-right: 0;\n    margin-left: 0;\n  }\n}\n.navbar-static-top {\n  z-index: 1000;\n  border-width: 0 0 1px;\n}\n@media (min-width: 768px) {\n  .navbar-static-top {\n    border-radius: 0;\n  }\n}\n.navbar-fixed-top,\n.navbar-fixed-bottom {\n  position: fixed;\n  right: 0;\n  left: 0;\n  z-index: 1030;\n}\n@media (min-width: 768px) {\n  .navbar-fixed-top,\n  .navbar-fixed-bottom {\n    border-radius: 0;\n  }\n}\n.navbar-fixed-top {\n  top: 0;\n  border-width: 0 0 1px;\n}\n.navbar-fixed-bottom {\n  bottom: 0;\n  margin-bottom: 0;\n  border-width: 1px 0 0;\n}\n.navbar-brand {\n  float: left;\n  padding: 15px 15px;\n  font-size: 18px;\n  line-height: 20px;\n  height: 50px;\n}\n.navbar-brand:hover,\n.navbar-brand:focus {\n  text-decoration: none;\n}\n@media (min-width: 768px) {\n  .navbar > .container .navbar-brand,\n  .navbar > .container-fluid .navbar-brand {\n    margin-left: -15px;\n  }\n}\n.navbar-toggle {\n  position: relative;\n  float: right;\n  margin-right: 15px;\n  padding: 9px 10px;\n  margin-top: 8px;\n  margin-bottom: 8px;\n  background-color: transparent;\n  background-image: none;\n  border: 1px solid transparent;\n  border-radius: 4px;\n}\n.navbar-toggle:focus {\n  outline: none;\n}\n.navbar-toggle .icon-bar {\n  display: block;\n  width: 22px;\n  height: 2px;\n  border-radius: 1px;\n}\n.navbar-toggle .icon-bar + .icon-bar {\n  margin-top: 4px;\n}\n@media (min-width: 768px) {\n  .navbar-toggle {\n    display: none;\n  }\n}\n.navbar-nav {\n  margin: 7.5px -15px;\n}\n.navbar-nav > li > a {\n  padding-top: 10px;\n  padding-bottom: 10px;\n  line-height: 20px;\n}\n@media (max-width: 767px) {\n  .navbar-nav .open .dropdown-menu {\n    position: static;\n    float: none;\n    width: auto;\n    margin-top: 0;\n    background-color: transparent;\n    border: 0;\n    box-shadow: none;\n  }\n  .navbar-nav .open .dropdown-menu > li > a,\n  .navbar-nav .open .dropdown-menu .dropdown-header {\n    padding: 5px 15px 5px 25px;\n  }\n  .navbar-nav .open .dropdown-menu > li > a {\n    line-height: 20px;\n  }\n  .navbar-nav .open .dropdown-menu > li > a:hover,\n  .navbar-nav .open .dropdown-menu > li > a:focus {\n    background-image: none;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-nav {\n    float: left;\n    margin: 0;\n  }\n  .navbar-nav > li {\n    float: left;\n  }\n  .navbar-nav > li > a {\n    padding-top: 15px;\n    padding-bottom: 15px;\n  }\n  .navbar-nav.navbar-right:last-child {\n    margin-right: -15px;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-left {\n    float: left !important;\n  }\n  .navbar-right {\n    float: right !important;\n  }\n}\n.navbar-form {\n  margin-left: -15px;\n  margin-right: -15px;\n  padding: 10px 15px;\n  border-top: 1px solid transparent;\n  border-bottom: 1px solid transparent;\n  -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1);\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1);\n  margin-top: 8px;\n  margin-bottom: 8px;\n}\n@media (min-width: 768px) {\n  .navbar-form .form-group {\n    display: inline-block;\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .navbar-form .form-control {\n    display: inline-block;\n    width: auto;\n    vertical-align: middle;\n  }\n  .navbar-form .input-group > .form-control {\n    width: 100%;\n  }\n  .navbar-form .control-label {\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .navbar-form .radio,\n  .navbar-form .checkbox {\n    display: inline-block;\n    margin-top: 0;\n    margin-bottom: 0;\n    padding-left: 0;\n    vertical-align: middle;\n  }\n  .navbar-form .radio input[type=\"radio\"],\n  .navbar-form .checkbox input[type=\"checkbox\"] {\n    float: none;\n    margin-left: 0;\n  }\n  .navbar-form .has-feedback .form-control-feedback {\n    top: 0;\n  }\n}\n@media (max-width: 767px) {\n  .navbar-form .form-group {\n    margin-bottom: 5px;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-form {\n    width: auto;\n    border: 0;\n    margin-left: 0;\n    margin-right: 0;\n    padding-top: 0;\n    padding-bottom: 0;\n    -webkit-box-shadow: none;\n    box-shadow: none;\n  }\n  .navbar-form.navbar-right:last-child {\n    margin-right: -15px;\n  }\n}\n.navbar-nav > li > .dropdown-menu {\n  margin-top: 0;\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.navbar-fixed-bottom .navbar-nav > li > .dropdown-menu {\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.navbar-btn {\n  margin-top: 8px;\n  margin-bottom: 8px;\n}\n.navbar-btn.btn-sm {\n  margin-top: 10px;\n  margin-bottom: 10px;\n}\n.navbar-btn.btn-xs {\n  margin-top: 14px;\n  margin-bottom: 14px;\n}\n.navbar-text {\n  margin-top: 15px;\n  margin-bottom: 15px;\n}\n@media (min-width: 768px) {\n  .navbar-text {\n    float: left;\n    margin-left: 15px;\n    margin-right: 15px;\n  }\n  .navbar-text.navbar-right:last-child {\n    margin-right: 0;\n  }\n}\n.navbar-default {\n  background-color: #f8f8f8;\n  border-color: #e7e7e7;\n}\n.navbar-default .navbar-brand {\n  color: #777777;\n}\n.navbar-default .navbar-brand:hover,\n.navbar-default .navbar-brand:focus {\n  color: #5e5e5e;\n  background-color: transparent;\n}\n.navbar-default .navbar-text {\n  color: #777777;\n}\n.navbar-default .navbar-nav > li > a {\n  color: #777777;\n}\n.navbar-default .navbar-nav > li > a:hover,\n.navbar-default .navbar-nav > li > a:focus {\n  color: #333333;\n  background-color: transparent;\n}\n.navbar-default .navbar-nav > .active > a,\n.navbar-default .navbar-nav > .active > a:hover,\n.navbar-default .navbar-nav > .active > a:focus {\n  color: #555555;\n  background-color: #e7e7e7;\n}\n.navbar-default .navbar-nav > .disabled > a,\n.navbar-default .navbar-nav > .disabled > a:hover,\n.navbar-default .navbar-nav > .disabled > a:focus {\n  color: #cccccc;\n  background-color: transparent;\n}\n.navbar-default .navbar-toggle {\n  border-color: #dddddd;\n}\n.navbar-default .navbar-toggle:hover,\n.navbar-default .navbar-toggle:focus {\n  background-color: #dddddd;\n}\n.navbar-default .navbar-toggle .icon-bar {\n  background-color: #888888;\n}\n.navbar-default .navbar-collapse,\n.navbar-default .navbar-form {\n  border-color: #e7e7e7;\n}\n.navbar-default .navbar-nav > .open > a,\n.navbar-default .navbar-nav > .open > a:hover,\n.navbar-default .navbar-nav > .open > a:focus {\n  background-color: #e7e7e7;\n  color: #555555;\n}\n@media (max-width: 767px) {\n  .navbar-default .navbar-nav .open .dropdown-menu > li > a {\n    color: #777777;\n  }\n  .navbar-default .navbar-nav .open .dropdown-menu > li > a:hover,\n  .navbar-default .navbar-nav .open .dropdown-menu > li > a:focus {\n    color: #333333;\n    background-color: transparent;\n  }\n  .navbar-default .navbar-nav .open .dropdown-menu > .active > a,\n  .navbar-default .navbar-nav .open .dropdown-menu > .active > a:hover,\n  .navbar-default .navbar-nav .open .dropdown-menu > .active > a:focus {\n    color: #555555;\n    background-color: #e7e7e7;\n  }\n  .navbar-default .navbar-nav .open .dropdown-menu > .disabled > a,\n  .navbar-default .navbar-nav .open .dropdown-menu > .disabled > a:hover,\n  .navbar-default .navbar-nav .open .dropdown-menu > .disabled > a:focus {\n    color: #cccccc;\n    background-color: transparent;\n  }\n}\n.navbar-default .navbar-link {\n  color: #777777;\n}\n.navbar-default .navbar-link:hover {\n  color: #333333;\n}\n.navbar-inverse {\n  background-color: #222222;\n  border-color: #080808;\n}\n.navbar-inverse .navbar-brand {\n  color: #999999;\n}\n.navbar-inverse .navbar-brand:hover,\n.navbar-inverse .navbar-brand:focus {\n  color: #ffffff;\n  background-color: transparent;\n}\n.navbar-inverse .navbar-text {\n  color: #999999;\n}\n.navbar-inverse .navbar-nav > li > a {\n  color: #999999;\n}\n.navbar-inverse .navbar-nav > li > a:hover,\n.navbar-inverse .navbar-nav > li > a:focus {\n  color: #ffffff;\n  background-color: transparent;\n}\n.navbar-inverse .navbar-nav > .active > a,\n.navbar-inverse .navbar-nav > .active > a:hover,\n.navbar-inverse .navbar-nav > .active > a:focus {\n  color: #ffffff;\n  background-color: #080808;\n}\n.navbar-inverse .navbar-nav > .disabled > a,\n.navbar-inverse .navbar-nav > .disabled > a:hover,\n.navbar-inverse .navbar-nav > .disabled > a:focus {\n  color: #444444;\n  background-color: transparent;\n}\n.navbar-inverse .navbar-toggle {\n  border-color: #333333;\n}\n.navbar-inverse .navbar-toggle:hover,\n.navbar-inverse .navbar-toggle:focus {\n  background-color: #333333;\n}\n.navbar-inverse .navbar-toggle .icon-bar {\n  background-color: #ffffff;\n}\n.navbar-inverse .navbar-collapse,\n.navbar-inverse .navbar-form {\n  border-color: #101010;\n}\n.navbar-inverse .navbar-nav > .open > a,\n.navbar-inverse .navbar-nav > .open > a:hover,\n.navbar-inverse .navbar-nav > .open > a:focus {\n  background-color: #080808;\n  color: #ffffff;\n}\n@media (max-width: 767px) {\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .dropdown-header {\n    border-color: #080808;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu .divider {\n    background-color: #080808;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > li > a {\n    color: #999999;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > li > a:hover,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > li > a:focus {\n    color: #ffffff;\n    background-color: transparent;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .active > a,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .active > a:hover,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .active > a:focus {\n    color: #ffffff;\n    background-color: #080808;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .disabled > a,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .disabled > a:hover,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .disabled > a:focus {\n    color: #444444;\n    background-color: transparent;\n  }\n}\n.navbar-inverse .navbar-link {\n  color: #999999;\n}\n.navbar-inverse .navbar-link:hover {\n  color: #ffffff;\n}\n.breadcrumb {\n  padding: 8px 15px;\n  margin-bottom: 20px;\n  list-style: none;\n  background-color: #f5f5f5;\n  border-radius: 4px;\n}\n.breadcrumb > li {\n  display: inline-block;\n}\n.breadcrumb > li + li:before {\n  content: \"/\\00a0\";\n  padding: 0 5px;\n  color: #cccccc;\n}\n.breadcrumb > .active {\n  color: #999999;\n}\n.pagination {\n  display: inline-block;\n  padding-left: 0;\n  margin: 20px 0;\n  border-radius: 4px;\n}\n.pagination > li {\n  display: inline;\n}\n.pagination > li > a,\n.pagination > li > span {\n  position: relative;\n  float: left;\n  padding: 6px 12px;\n  line-height: 1.42857143;\n  text-decoration: none;\n  color: #428bca;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  margin-left: -1px;\n}\n.pagination > li:first-child > a,\n.pagination > li:first-child > span {\n  margin-left: 0;\n  border-bottom-left-radius: 4px;\n  border-top-left-radius: 4px;\n}\n.pagination > li:last-child > a,\n.pagination > li:last-child > span {\n  border-bottom-right-radius: 4px;\n  border-top-right-radius: 4px;\n}\n.pagination > li > a:hover,\n.pagination > li > span:hover,\n.pagination > li > a:focus,\n.pagination > li > span:focus {\n  color: #2a6496;\n  background-color: #eeeeee;\n  border-color: #dddddd;\n}\n.pagination > .active > a,\n.pagination > .active > span,\n.pagination > .active > a:hover,\n.pagination > .active > span:hover,\n.pagination > .active > a:focus,\n.pagination > .active > span:focus {\n  z-index: 2;\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #428bca;\n  cursor: default;\n}\n.pagination > .disabled > span,\n.pagination > .disabled > span:hover,\n.pagination > .disabled > span:focus,\n.pagination > .disabled > a,\n.pagination > .disabled > a:hover,\n.pagination > .disabled > a:focus {\n  color: #999999;\n  background-color: #ffffff;\n  border-color: #dddddd;\n  cursor: not-allowed;\n}\n.pagination-lg > li > a,\n.pagination-lg > li > span {\n  padding: 10px 16px;\n  font-size: 18px;\n}\n.pagination-lg > li:first-child > a,\n.pagination-lg > li:first-child > span {\n  border-bottom-left-radius: 6px;\n  border-top-left-radius: 6px;\n}\n.pagination-lg > li:last-child > a,\n.pagination-lg > li:last-child > span {\n  border-bottom-right-radius: 6px;\n  border-top-right-radius: 6px;\n}\n.pagination-sm > li > a,\n.pagination-sm > li > span {\n  padding: 5px 10px;\n  font-size: 12px;\n}\n.pagination-sm > li:first-child > a,\n.pagination-sm > li:first-child > span {\n  border-bottom-left-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.pagination-sm > li:last-child > a,\n.pagination-sm > li:last-child > span {\n  border-bottom-right-radius: 3px;\n  border-top-right-radius: 3px;\n}\n.pager {\n  padding-left: 0;\n  margin: 20px 0;\n  list-style: none;\n  text-align: center;\n}\n.pager li {\n  display: inline;\n}\n.pager li > a,\n.pager li > span {\n  display: inline-block;\n  padding: 5px 14px;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-radius: 15px;\n}\n.pager li > a:hover,\n.pager li > a:focus {\n  text-decoration: none;\n  background-color: #eeeeee;\n}\n.pager .next > a,\n.pager .next > span {\n  float: right;\n}\n.pager .previous > a,\n.pager .previous > span {\n  float: left;\n}\n.pager .disabled > a,\n.pager .disabled > a:hover,\n.pager .disabled > a:focus,\n.pager .disabled > span {\n  color: #999999;\n  background-color: #ffffff;\n  cursor: not-allowed;\n}\n.label {\n  display: inline;\n  padding: .2em .6em .3em;\n  font-size: 75%;\n  font-weight: bold;\n  line-height: 1;\n  color: #ffffff;\n  text-align: center;\n  white-space: nowrap;\n  vertical-align: baseline;\n  border-radius: .25em;\n}\n.label[href]:hover,\n.label[href]:focus {\n  color: #ffffff;\n  text-decoration: none;\n  cursor: pointer;\n}\n.label:empty {\n  display: none;\n}\n.btn .label {\n  position: relative;\n  top: -1px;\n}\n.label-default {\n  background-color: #999999;\n}\n.label-default[href]:hover,\n.label-default[href]:focus {\n  background-color: #808080;\n}\n.label-primary {\n  background-color: #428bca;\n}\n.label-primary[href]:hover,\n.label-primary[href]:focus {\n  background-color: #3071a9;\n}\n.label-success {\n  background-color: #5cb85c;\n}\n.label-success[href]:hover,\n.label-success[href]:focus {\n  background-color: #449d44;\n}\n.label-info {\n  background-color: #5bc0de;\n}\n.label-info[href]:hover,\n.label-info[href]:focus {\n  background-color: #31b0d5;\n}\n.label-warning {\n  background-color: #f0ad4e;\n}\n.label-warning[href]:hover,\n.label-warning[href]:focus {\n  background-color: #ec971f;\n}\n.label-danger {\n  background-color: #d9534f;\n}\n.label-danger[href]:hover,\n.label-danger[href]:focus {\n  background-color: #c9302c;\n}\n.badge {\n  display: inline-block;\n  min-width: 10px;\n  padding: 3px 7px;\n  font-size: 12px;\n  font-weight: bold;\n  color: #ffffff;\n  line-height: 1;\n  vertical-align: baseline;\n  white-space: nowrap;\n  text-align: center;\n  background-color: #999999;\n  border-radius: 10px;\n}\n.badge:empty {\n  display: none;\n}\n.btn .badge {\n  position: relative;\n  top: -1px;\n}\n.btn-xs .badge {\n  top: 0;\n  padding: 1px 5px;\n}\na.badge:hover,\na.badge:focus {\n  color: #ffffff;\n  text-decoration: none;\n  cursor: pointer;\n}\na.list-group-item.active > .badge,\n.nav-pills > .active > a > .badge {\n  color: #428bca;\n  background-color: #ffffff;\n}\n.nav-pills > li > a > .badge {\n  margin-left: 3px;\n}\n.jumbotron {\n  padding: 30px;\n  margin-bottom: 30px;\n  color: inherit;\n  background-color: #eeeeee;\n}\n.jumbotron h1,\n.jumbotron .h1 {\n  color: inherit;\n}\n.jumbotron p {\n  margin-bottom: 15px;\n  font-size: 21px;\n  font-weight: 200;\n}\n.container .jumbotron {\n  border-radius: 6px;\n}\n.jumbotron .container {\n  max-width: 100%;\n}\n@media screen and (min-width: 768px) {\n  .jumbotron {\n    padding-top: 48px;\n    padding-bottom: 48px;\n  }\n  .container .jumbotron {\n    padding-left: 60px;\n    padding-right: 60px;\n  }\n  .jumbotron h1,\n  .jumbotron .h1 {\n    font-size: 63px;\n  }\n}\n.thumbnail {\n  display: block;\n  padding: 4px;\n  margin-bottom: 20px;\n  line-height: 1.42857143;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-radius: 4px;\n  -webkit-transition: all 0.2s ease-in-out;\n  transition: all 0.2s ease-in-out;\n}\n.thumbnail > img,\n.thumbnail a > img {\n  margin-left: auto;\n  margin-right: auto;\n}\na.thumbnail:hover,\na.thumbnail:focus,\na.thumbnail.active {\n  border-color: #428bca;\n}\n.thumbnail .caption {\n  padding: 9px;\n  color: #333333;\n}\n.alert {\n  padding: 15px;\n  margin-bottom: 20px;\n  border: 1px solid transparent;\n  border-radius: 4px;\n}\n.alert h4 {\n  margin-top: 0;\n  color: inherit;\n}\n.alert .alert-link {\n  font-weight: bold;\n}\n.alert > p,\n.alert > ul {\n  margin-bottom: 0;\n}\n.alert > p + p {\n  margin-top: 5px;\n}\n.alert-dismissable {\n  padding-right: 35px;\n}\n.alert-dismissable .close {\n  position: relative;\n  top: -2px;\n  right: -21px;\n  color: inherit;\n}\n.alert-success {\n  background-color: #dff0d8;\n  border-color: #d6e9c6;\n  color: #3c763d;\n}\n.alert-success hr {\n  border-top-color: #c9e2b3;\n}\n.alert-success .alert-link {\n  color: #2b542c;\n}\n.alert-info {\n  background-color: #d9edf7;\n  border-color: #bce8f1;\n  color: #31708f;\n}\n.alert-info hr {\n  border-top-color: #a6e1ec;\n}\n.alert-info .alert-link {\n  color: #245269;\n}\n.alert-warning {\n  background-color: #fcf8e3;\n  border-color: #faebcc;\n  color: #8a6d3b;\n}\n.alert-warning hr {\n  border-top-color: #f7e1b5;\n}\n.alert-warning .alert-link {\n  color: #66512c;\n}\n.alert-danger {\n  background-color: #f2dede;\n  border-color: #ebccd1;\n  color: #a94442;\n}\n.alert-danger hr {\n  border-top-color: #e4b9c0;\n}\n.alert-danger .alert-link {\n  color: #843534;\n}\n@-webkit-keyframes progress-bar-stripes {\n  from {\n    background-position: 40px 0;\n  }\n  to {\n    background-position: 0 0;\n  }\n}\n@keyframes progress-bar-stripes {\n  from {\n    background-position: 40px 0;\n  }\n  to {\n    background-position: 0 0;\n  }\n}\n.progress {\n  overflow: hidden;\n  height: 20px;\n  margin-bottom: 20px;\n  background-color: #f5f5f5;\n  border-radius: 4px;\n  -webkit-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n.progress-bar {\n  float: left;\n  width: 0%;\n  height: 100%;\n  font-size: 12px;\n  line-height: 20px;\n  color: #ffffff;\n  text-align: center;\n  background-color: #428bca;\n  -webkit-box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.15);\n  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.15);\n  -webkit-transition: width 0.6s ease;\n  transition: width 0.6s ease;\n}\n.progress-striped .progress-bar {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-size: 40px 40px;\n}\n.progress.active .progress-bar {\n  -webkit-animation: progress-bar-stripes 2s linear infinite;\n  animation: progress-bar-stripes 2s linear infinite;\n}\n.progress-bar-success {\n  background-color: #5cb85c;\n}\n.progress-striped .progress-bar-success {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.progress-bar-info {\n  background-color: #5bc0de;\n}\n.progress-striped .progress-bar-info {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.progress-bar-warning {\n  background-color: #f0ad4e;\n}\n.progress-striped .progress-bar-warning {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.progress-bar-danger {\n  background-color: #d9534f;\n}\n.progress-striped .progress-bar-danger {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.media,\n.media-body {\n  overflow: hidden;\n  zoom: 1;\n}\n.media,\n.media .media {\n  margin-top: 15px;\n}\n.media:first-child {\n  margin-top: 0;\n}\n.media-object {\n  display: block;\n}\n.media-heading {\n  margin: 0 0 5px;\n}\n.media > .pull-left {\n  margin-right: 10px;\n}\n.media > .pull-right {\n  margin-left: 10px;\n}\n.media-list {\n  padding-left: 0;\n  list-style: none;\n}\n.list-group {\n  margin-bottom: 20px;\n  padding-left: 0;\n}\n.list-group-item {\n  position: relative;\n  display: block;\n  padding: 10px 15px;\n  margin-bottom: -1px;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n}\n.list-group-item:first-child {\n  border-top-right-radius: 4px;\n  border-top-left-radius: 4px;\n}\n.list-group-item:last-child {\n  margin-bottom: 0;\n  border-bottom-right-radius: 4px;\n  border-bottom-left-radius: 4px;\n}\n.list-group-item > .badge {\n  float: right;\n}\n.list-group-item > .badge + .badge {\n  margin-right: 5px;\n}\na.list-group-item {\n  color: #555555;\n}\na.list-group-item .list-group-item-heading {\n  color: #333333;\n}\na.list-group-item:hover,\na.list-group-item:focus {\n  text-decoration: none;\n  background-color: #f5f5f5;\n}\na.list-group-item.active,\na.list-group-item.active:hover,\na.list-group-item.active:focus {\n  z-index: 2;\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #428bca;\n}\na.list-group-item.active .list-group-item-heading,\na.list-group-item.active:hover .list-group-item-heading,\na.list-group-item.active:focus .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item.active .list-group-item-text,\na.list-group-item.active:hover .list-group-item-text,\na.list-group-item.active:focus .list-group-item-text {\n  color: #e1edf7;\n}\n.list-group-item-success {\n  color: #3c763d;\n  background-color: #dff0d8;\n}\na.list-group-item-success {\n  color: #3c763d;\n}\na.list-group-item-success .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-success:hover,\na.list-group-item-success:focus {\n  color: #3c763d;\n  background-color: #d0e9c6;\n}\na.list-group-item-success.active,\na.list-group-item-success.active:hover,\na.list-group-item-success.active:focus {\n  color: #fff;\n  background-color: #3c763d;\n  border-color: #3c763d;\n}\n.list-group-item-info {\n  color: #31708f;\n  background-color: #d9edf7;\n}\na.list-group-item-info {\n  color: #31708f;\n}\na.list-group-item-info .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-info:hover,\na.list-group-item-info:focus {\n  color: #31708f;\n  background-color: #c4e3f3;\n}\na.list-group-item-info.active,\na.list-group-item-info.active:hover,\na.list-group-item-info.active:focus {\n  color: #fff;\n  background-color: #31708f;\n  border-color: #31708f;\n}\n.list-group-item-warning {\n  color: #8a6d3b;\n  background-color: #fcf8e3;\n}\na.list-group-item-warning {\n  color: #8a6d3b;\n}\na.list-group-item-warning .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-warning:hover,\na.list-group-item-warning:focus {\n  color: #8a6d3b;\n  background-color: #faf2cc;\n}\na.list-group-item-warning.active,\na.list-group-item-warning.active:hover,\na.list-group-item-warning.active:focus {\n  color: #fff;\n  background-color: #8a6d3b;\n  border-color: #8a6d3b;\n}\n.list-group-item-danger {\n  color: #a94442;\n  background-color: #f2dede;\n}\na.list-group-item-danger {\n  color: #a94442;\n}\na.list-group-item-danger .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-danger:hover,\na.list-group-item-danger:focus {\n  color: #a94442;\n  background-color: #ebcccc;\n}\na.list-group-item-danger.active,\na.list-group-item-danger.active:hover,\na.list-group-item-danger.active:focus {\n  color: #fff;\n  background-color: #a94442;\n  border-color: #a94442;\n}\n.list-group-item-heading {\n  margin-top: 0;\n  margin-bottom: 5px;\n}\n.list-group-item-text {\n  margin-bottom: 0;\n  line-height: 1.3;\n}\n.panel {\n  margin-bottom: 20px;\n  background-color: #ffffff;\n  border: 1px solid transparent;\n  border-radius: 4px;\n  -webkit-box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);\n  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);\n}\n.panel-body {\n  padding: 15px;\n}\n.panel-heading {\n  padding: 10px 15px;\n  border-bottom: 1px solid transparent;\n  border-top-right-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.panel-heading > .dropdown .dropdown-toggle {\n  color: inherit;\n}\n.panel-title {\n  margin-top: 0;\n  margin-bottom: 0;\n  font-size: 16px;\n  color: inherit;\n}\n.panel-title > a {\n  color: inherit;\n}\n.panel-footer {\n  padding: 10px 15px;\n  background-color: #f5f5f5;\n  border-top: 1px solid #dddddd;\n  border-bottom-right-radius: 3px;\n  border-bottom-left-radius: 3px;\n}\n.panel > .list-group {\n  margin-bottom: 0;\n}\n.panel > .list-group .list-group-item {\n  border-width: 1px 0;\n  border-radius: 0;\n}\n.panel > .list-group:first-child .list-group-item:first-child {\n  border-top: 0;\n  border-top-right-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.panel > .list-group:last-child .list-group-item:last-child {\n  border-bottom: 0;\n  border-bottom-right-radius: 3px;\n  border-bottom-left-radius: 3px;\n}\n.panel-heading + .list-group .list-group-item:first-child {\n  border-top-width: 0;\n}\n.panel > .table,\n.panel > .table-responsive > .table {\n  margin-bottom: 0;\n}\n.panel > .table:first-child,\n.panel > .table-responsive:first-child > .table:first-child {\n  border-top-right-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.panel > .table:first-child > thead:first-child > tr:first-child td:first-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child td:first-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child td:first-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child td:first-child,\n.panel > .table:first-child > thead:first-child > tr:first-child th:first-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child th:first-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child th:first-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child th:first-child {\n  border-top-left-radius: 3px;\n}\n.panel > .table:first-child > thead:first-child > tr:first-child td:last-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child td:last-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child td:last-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child td:last-child,\n.panel > .table:first-child > thead:first-child > tr:first-child th:last-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child th:last-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child th:last-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child th:last-child {\n  border-top-right-radius: 3px;\n}\n.panel > .table:last-child,\n.panel > .table-responsive:last-child > .table:last-child {\n  border-bottom-right-radius: 3px;\n  border-bottom-left-radius: 3px;\n}\n.panel > .table:last-child > tbody:last-child > tr:last-child td:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child td:first-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child td:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child td:first-child,\n.panel > .table:last-child > tbody:last-child > tr:last-child th:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child th:first-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child th:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child th:first-child {\n  border-bottom-left-radius: 3px;\n}\n.panel > .table:last-child > tbody:last-child > tr:last-child td:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child td:last-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child td:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child td:last-child,\n.panel > .table:last-child > tbody:last-child > tr:last-child th:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child th:last-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child th:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child th:last-child {\n  border-bottom-right-radius: 3px;\n}\n.panel > .panel-body + .table,\n.panel > .panel-body + .table-responsive {\n  border-top: 1px solid #dddddd;\n}\n.panel > .table > tbody:first-child > tr:first-child th,\n.panel > .table > tbody:first-child > tr:first-child td {\n  border-top: 0;\n}\n.panel > .table-bordered,\n.panel > .table-responsive > .table-bordered {\n  border: 0;\n}\n.panel > .table-bordered > thead > tr > th:first-child,\n.panel > .table-responsive > .table-bordered > thead > tr > th:first-child,\n.panel > .table-bordered > tbody > tr > th:first-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > th:first-child,\n.panel > .table-bordered > tfoot > tr > th:first-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > th:first-child,\n.panel > .table-bordered > thead > tr > td:first-child,\n.panel > .table-responsive > .table-bordered > thead > tr > td:first-child,\n.panel > .table-bordered > tbody > tr > td:first-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > td:first-child,\n.panel > .table-bordered > tfoot > tr > td:first-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > td:first-child {\n  border-left: 0;\n}\n.panel > .table-bordered > thead > tr > th:last-child,\n.panel > .table-responsive > .table-bordered > thead > tr > th:last-child,\n.panel > .table-bordered > tbody > tr > th:last-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > th:last-child,\n.panel > .table-bordered > tfoot > tr > th:last-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > th:last-child,\n.panel > .table-bordered > thead > tr > td:last-child,\n.panel > .table-responsive > .table-bordered > thead > tr > td:last-child,\n.panel > .table-bordered > tbody > tr > td:last-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > td:last-child,\n.panel > .table-bordered > tfoot > tr > td:last-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > td:last-child {\n  border-right: 0;\n}\n.panel > .table-bordered > thead > tr:first-child > td,\n.panel > .table-responsive > .table-bordered > thead > tr:first-child > td,\n.panel > .table-bordered > tbody > tr:first-child > td,\n.panel > .table-responsive > .table-bordered > tbody > tr:first-child > td,\n.panel > .table-bordered > thead > tr:first-child > th,\n.panel > .table-responsive > .table-bordered > thead > tr:first-child > th,\n.panel > .table-bordered > tbody > tr:first-child > th,\n.panel > .table-responsive > .table-bordered > tbody > tr:first-child > th {\n  border-bottom: 0;\n}\n.panel > .table-bordered > tbody > tr:last-child > td,\n.panel > .table-responsive > .table-bordered > tbody > tr:last-child > td,\n.panel > .table-bordered > tfoot > tr:last-child > td,\n.panel > .table-responsive > .table-bordered > tfoot > tr:last-child > td,\n.panel > .table-bordered > tbody > tr:last-child > th,\n.panel > .table-responsive > .table-bordered > tbody > tr:last-child > th,\n.panel > .table-bordered > tfoot > tr:last-child > th,\n.panel > .table-responsive > .table-bordered > tfoot > tr:last-child > th {\n  border-bottom: 0;\n}\n.panel > .table-responsive {\n  border: 0;\n  margin-bottom: 0;\n}\n.panel-group {\n  margin-bottom: 20px;\n}\n.panel-group .panel {\n  margin-bottom: 0;\n  border-radius: 4px;\n  overflow: hidden;\n}\n.panel-group .panel + .panel {\n  margin-top: 5px;\n}\n.panel-group .panel-heading {\n  border-bottom: 0;\n}\n.panel-group .panel-heading + .panel-collapse .panel-body {\n  border-top: 1px solid #dddddd;\n}\n.panel-group .panel-footer {\n  border-top: 0;\n}\n.panel-group .panel-footer + .panel-collapse .panel-body {\n  border-bottom: 1px solid #dddddd;\n}\n.panel-default {\n  border-color: #dddddd;\n}\n.panel-default > .panel-heading {\n  color: #333333;\n  background-color: #f5f5f5;\n  border-color: #dddddd;\n}\n.panel-default > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #dddddd;\n}\n.panel-default > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #dddddd;\n}\n.panel-primary {\n  border-color: #428bca;\n}\n.panel-primary > .panel-heading {\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #428bca;\n}\n.panel-primary > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #428bca;\n}\n.panel-primary > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #428bca;\n}\n.panel-success {\n  border-color: #d6e9c6;\n}\n.panel-success > .panel-heading {\n  color: #3c763d;\n  background-color: #dff0d8;\n  border-color: #d6e9c6;\n}\n.panel-success > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #d6e9c6;\n}\n.panel-success > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #d6e9c6;\n}\n.panel-info {\n  border-color: #bce8f1;\n}\n.panel-info > .panel-heading {\n  color: #31708f;\n  background-color: #d9edf7;\n  border-color: #bce8f1;\n}\n.panel-info > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #bce8f1;\n}\n.panel-info > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #bce8f1;\n}\n.panel-warning {\n  border-color: #faebcc;\n}\n.panel-warning > .panel-heading {\n  color: #8a6d3b;\n  background-color: #fcf8e3;\n  border-color: #faebcc;\n}\n.panel-warning > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #faebcc;\n}\n.panel-warning > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #faebcc;\n}\n.panel-danger {\n  border-color: #ebccd1;\n}\n.panel-danger > .panel-heading {\n  color: #a94442;\n  background-color: #f2dede;\n  border-color: #ebccd1;\n}\n.panel-danger > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #ebccd1;\n}\n.panel-danger > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #ebccd1;\n}\n.well {\n  min-height: 20px;\n  padding: 19px;\n  margin-bottom: 20px;\n  background-color: #f5f5f5;\n  border: 1px solid #e3e3e3;\n  border-radius: 4px;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);\n}\n.well blockquote {\n  border-color: #ddd;\n  border-color: rgba(0, 0, 0, 0.15);\n}\n.well-lg {\n  padding: 24px;\n  border-radius: 6px;\n}\n.well-sm {\n  padding: 9px;\n  border-radius: 3px;\n}\n.close {\n  float: right;\n  font-size: 21px;\n  font-weight: bold;\n  line-height: 1;\n  color: #000000;\n  text-shadow: 0 1px 0 #ffffff;\n  opacity: 0.2;\n  filter: alpha(opacity=20);\n}\n.close:hover,\n.close:focus {\n  color: #000000;\n  text-decoration: none;\n  cursor: pointer;\n  opacity: 0.5;\n  filter: alpha(opacity=50);\n}\nbutton.close {\n  padding: 0;\n  cursor: pointer;\n  background: transparent;\n  border: 0;\n  -webkit-appearance: none;\n}\n.modal-open {\n  overflow: hidden;\n}\n.modal {\n  display: none;\n  overflow: auto;\n  overflow-y: scroll;\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1050;\n  -webkit-overflow-scrolling: touch;\n  outline: 0;\n}\n.modal.fade .modal-dialog {\n  -webkit-transform: translate(0, -25%);\n  -ms-transform: translate(0, -25%);\n  transform: translate(0, -25%);\n  -webkit-transition: -webkit-transform 0.3s ease-out;\n  -moz-transition: -moz-transform 0.3s ease-out;\n  -o-transition: -o-transform 0.3s ease-out;\n  transition: transform 0.3s ease-out;\n}\n.modal.in .modal-dialog {\n  -webkit-transform: translate(0, 0);\n  -ms-transform: translate(0, 0);\n  transform: translate(0, 0);\n}\n.modal-dialog {\n  position: relative;\n  width: auto;\n  margin: 10px;\n}\n.modal-content {\n  position: relative;\n  background-color: #ffffff;\n  border: 1px solid #999999;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 6px;\n  -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);\n  box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);\n  background-clip: padding-box;\n  outline: none;\n}\n.modal-backdrop {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1040;\n  background-color: #000000;\n}\n.modal-backdrop.fade {\n  opacity: 0;\n  filter: alpha(opacity=0);\n}\n.modal-backdrop.in {\n  opacity: 0.5;\n  filter: alpha(opacity=50);\n}\n.modal-header {\n  padding: 15px;\n  border-bottom: 1px solid #e5e5e5;\n  min-height: 16.42857143px;\n}\n.modal-header .close {\n  margin-top: -2px;\n}\n.modal-title {\n  margin: 0;\n  line-height: 1.42857143;\n}\n.modal-body {\n  position: relative;\n  padding: 20px;\n}\n.modal-footer {\n  margin-top: 15px;\n  padding: 19px 20px 20px;\n  text-align: right;\n  border-top: 1px solid #e5e5e5;\n}\n.modal-footer .btn + .btn {\n  margin-left: 5px;\n  margin-bottom: 0;\n}\n.modal-footer .btn-group .btn + .btn {\n  margin-left: -1px;\n}\n.modal-footer .btn-block + .btn-block {\n  margin-left: 0;\n}\n@media (min-width: 768px) {\n  .modal-dialog {\n    width: 600px;\n    margin: 30px auto;\n  }\n  .modal-content {\n    -webkit-box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);\n    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);\n  }\n  .modal-sm {\n    width: 300px;\n  }\n}\n@media (min-width: 992px) {\n  .modal-lg {\n    width: 900px;\n  }\n}\n.tooltip {\n  position: absolute;\n  z-index: 1030;\n  display: block;\n  visibility: visible;\n  font-size: 12px;\n  line-height: 1.4;\n  opacity: 0;\n  filter: alpha(opacity=0);\n}\n.tooltip.in {\n  opacity: 0.9;\n  filter: alpha(opacity=90);\n}\n.tooltip.top {\n  margin-top: -3px;\n  padding: 5px 0;\n}\n.tooltip.right {\n  margin-left: 3px;\n  padding: 0 5px;\n}\n.tooltip.bottom {\n  margin-top: 3px;\n  padding: 5px 0;\n}\n.tooltip.left {\n  margin-left: -3px;\n  padding: 0 5px;\n}\n.tooltip-inner {\n  max-width: 200px;\n  padding: 3px 8px;\n  color: #ffffff;\n  text-align: center;\n  text-decoration: none;\n  background-color: #000000;\n  border-radius: 4px;\n}\n.tooltip-arrow {\n  position: absolute;\n  width: 0;\n  height: 0;\n  border-color: transparent;\n  border-style: solid;\n}\n.tooltip.top .tooltip-arrow {\n  bottom: 0;\n  left: 50%;\n  margin-left: -5px;\n  border-width: 5px 5px 0;\n  border-top-color: #000000;\n}\n.tooltip.top-left .tooltip-arrow {\n  bottom: 0;\n  left: 5px;\n  border-width: 5px 5px 0;\n  border-top-color: #000000;\n}\n.tooltip.top-right .tooltip-arrow {\n  bottom: 0;\n  right: 5px;\n  border-width: 5px 5px 0;\n  border-top-color: #000000;\n}\n.tooltip.right .tooltip-arrow {\n  top: 50%;\n  left: 0;\n  margin-top: -5px;\n  border-width: 5px 5px 5px 0;\n  border-right-color: #000000;\n}\n.tooltip.left .tooltip-arrow {\n  top: 50%;\n  right: 0;\n  margin-top: -5px;\n  border-width: 5px 0 5px 5px;\n  border-left-color: #000000;\n}\n.tooltip.bottom .tooltip-arrow {\n  top: 0;\n  left: 50%;\n  margin-left: -5px;\n  border-width: 0 5px 5px;\n  border-bottom-color: #000000;\n}\n.tooltip.bottom-left .tooltip-arrow {\n  top: 0;\n  left: 5px;\n  border-width: 0 5px 5px;\n  border-bottom-color: #000000;\n}\n.tooltip.bottom-right .tooltip-arrow {\n  top: 0;\n  right: 5px;\n  border-width: 0 5px 5px;\n  border-bottom-color: #000000;\n}\n.popover {\n  position: absolute;\n  top: 0;\n  left: 0;\n  z-index: 1010;\n  display: none;\n  max-width: 276px;\n  padding: 1px;\n  text-align: left;\n  background-color: #ffffff;\n  background-clip: padding-box;\n  border: 1px solid #cccccc;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 6px;\n  -webkit-box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);\n  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);\n  white-space: normal;\n}\n.popover.top {\n  margin-top: -10px;\n}\n.popover.right {\n  margin-left: 10px;\n}\n.popover.bottom {\n  margin-top: 10px;\n}\n.popover.left {\n  margin-left: -10px;\n}\n.popover-title {\n  margin: 0;\n  padding: 8px 14px;\n  font-size: 14px;\n  font-weight: normal;\n  line-height: 18px;\n  background-color: #f7f7f7;\n  border-bottom: 1px solid #ebebeb;\n  border-radius: 5px 5px 0 0;\n}\n.popover-content {\n  padding: 9px 14px;\n}\n.popover > .arrow,\n.popover > .arrow:after {\n  position: absolute;\n  display: block;\n  width: 0;\n  height: 0;\n  border-color: transparent;\n  border-style: solid;\n}\n.popover > .arrow {\n  border-width: 11px;\n}\n.popover > .arrow:after {\n  border-width: 10px;\n  content: \"\";\n}\n.popover.top > .arrow {\n  left: 50%;\n  margin-left: -11px;\n  border-bottom-width: 0;\n  border-top-color: #999999;\n  border-top-color: rgba(0, 0, 0, 0.25);\n  bottom: -11px;\n}\n.popover.top > .arrow:after {\n  content: \" \";\n  bottom: 1px;\n  margin-left: -10px;\n  border-bottom-width: 0;\n  border-top-color: #ffffff;\n}\n.popover.right > .arrow {\n  top: 50%;\n  left: -11px;\n  margin-top: -11px;\n  border-left-width: 0;\n  border-right-color: #999999;\n  border-right-color: rgba(0, 0, 0, 0.25);\n}\n.popover.right > .arrow:after {\n  content: \" \";\n  left: 1px;\n  bottom: -10px;\n  border-left-width: 0;\n  border-right-color: #ffffff;\n}\n.popover.bottom > .arrow {\n  left: 50%;\n  margin-left: -11px;\n  border-top-width: 0;\n  border-bottom-color: #999999;\n  border-bottom-color: rgba(0, 0, 0, 0.25);\n  top: -11px;\n}\n.popover.bottom > .arrow:after {\n  content: \" \";\n  top: 1px;\n  margin-left: -10px;\n  border-top-width: 0;\n  border-bottom-color: #ffffff;\n}\n.popover.left > .arrow {\n  top: 50%;\n  right: -11px;\n  margin-top: -11px;\n  border-right-width: 0;\n  border-left-color: #999999;\n  border-left-color: rgba(0, 0, 0, 0.25);\n}\n.popover.left > .arrow:after {\n  content: \" \";\n  right: 1px;\n  border-right-width: 0;\n  border-left-color: #ffffff;\n  bottom: -10px;\n}\n.carousel {\n  position: relative;\n}\n.carousel-inner {\n  position: relative;\n  overflow: hidden;\n  width: 100%;\n}\n.carousel-inner > .item {\n  display: none;\n  position: relative;\n  -webkit-transition: 0.6s ease-in-out left;\n  transition: 0.6s ease-in-out left;\n}\n.carousel-inner > .item > img,\n.carousel-inner > .item > a > img {\n  line-height: 1;\n}\n.carousel-inner > .active,\n.carousel-inner > .next,\n.carousel-inner > .prev {\n  display: block;\n}\n.carousel-inner > .active {\n  left: 0;\n}\n.carousel-inner > .next,\n.carousel-inner > .prev {\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n.carousel-inner > .next {\n  left: 100%;\n}\n.carousel-inner > .prev {\n  left: -100%;\n}\n.carousel-inner > .next.left,\n.carousel-inner > .prev.right {\n  left: 0;\n}\n.carousel-inner > .active.left {\n  left: -100%;\n}\n.carousel-inner > .active.right {\n  left: 100%;\n}\n.carousel-control {\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 15%;\n  opacity: 0.5;\n  filter: alpha(opacity=50);\n  font-size: 20px;\n  color: #ffffff;\n  text-align: center;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);\n}\n.carousel-control.left {\n  background-image: -webkit-linear-gradient(left, color-stop(rgba(0, 0, 0, 0.5) 0%), color-stop(rgba(0, 0, 0, 0.0001) 100%));\n  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.0001) 100%);\n  background-repeat: repeat-x;\n  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#80000000', endColorstr='#00000000', GradientType=1);\n}\n.carousel-control.right {\n  left: auto;\n  right: 0;\n  background-image: -webkit-linear-gradient(left, color-stop(rgba(0, 0, 0, 0.0001) 0%), color-stop(rgba(0, 0, 0, 0.5) 100%));\n  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.0001) 0%, rgba(0, 0, 0, 0.5) 100%);\n  background-repeat: repeat-x;\n  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00000000', endColorstr='#80000000', GradientType=1);\n}\n.carousel-control:hover,\n.carousel-control:focus {\n  outline: none;\n  color: #ffffff;\n  text-decoration: none;\n  opacity: 0.9;\n  filter: alpha(opacity=90);\n}\n.carousel-control .icon-prev,\n.carousel-control .icon-next,\n.carousel-control .glyphicon-chevron-left,\n.carousel-control .glyphicon-chevron-right {\n  position: absolute;\n  top: 50%;\n  z-index: 5;\n  display: inline-block;\n}\n.carousel-control .icon-prev,\n.carousel-control .glyphicon-chevron-left {\n  left: 50%;\n}\n.carousel-control .icon-next,\n.carousel-control .glyphicon-chevron-right {\n  right: 50%;\n}\n.carousel-control .icon-prev,\n.carousel-control .icon-next {\n  width: 20px;\n  height: 20px;\n  margin-top: -10px;\n  margin-left: -10px;\n  font-family: serif;\n}\n.carousel-control .icon-prev:before {\n  content: '\\2039';\n}\n.carousel-control .icon-next:before {\n  content: '\\203a';\n}\n.carousel-indicators {\n  position: absolute;\n  bottom: 10px;\n  left: 50%;\n  z-index: 15;\n  width: 60%;\n  margin-left: -30%;\n  padding-left: 0;\n  list-style: none;\n  text-align: center;\n}\n.carousel-indicators li {\n  display: inline-block;\n  width: 10px;\n  height: 10px;\n  margin: 1px;\n  text-indent: -999px;\n  border: 1px solid #ffffff;\n  border-radius: 10px;\n  cursor: pointer;\n  background-color: #000 \\9;\n  background-color: rgba(0, 0, 0, 0);\n}\n.carousel-indicators .active {\n  margin: 0;\n  width: 12px;\n  height: 12px;\n  background-color: #ffffff;\n}\n.carousel-caption {\n  position: absolute;\n  left: 15%;\n  right: 15%;\n  bottom: 20px;\n  z-index: 10;\n  padding-top: 20px;\n  padding-bottom: 20px;\n  color: #ffffff;\n  text-align: center;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);\n}\n.carousel-caption .btn {\n  text-shadow: none;\n}\n@media screen and (min-width: 768px) {\n  .carousel-control .glyphicon-chevron-left,\n  .carousel-control .glyphicon-chevron-right,\n  .carousel-control .icon-prev,\n  .carousel-control .icon-next {\n    width: 30px;\n    height: 30px;\n    margin-top: -15px;\n    margin-left: -15px;\n    font-size: 30px;\n  }\n  .carousel-caption {\n    left: 20%;\n    right: 20%;\n    padding-bottom: 30px;\n  }\n  .carousel-indicators {\n    bottom: 20px;\n  }\n}\n.clearfix:before,\n.clearfix:after,\n.container:before,\n.container:after,\n.container-fluid:before,\n.container-fluid:after,\n.row:before,\n.row:after,\n.form-horizontal .form-group:before,\n.form-horizontal .form-group:after,\n.btn-toolbar:before,\n.btn-toolbar:after,\n.btn-group-vertical > .btn-group:before,\n.btn-group-vertical > .btn-group:after,\n.nav:before,\n.nav:after,\n.navbar:before,\n.navbar:after,\n.navbar-header:before,\n.navbar-header:after,\n.navbar-collapse:before,\n.navbar-collapse:after,\n.pager:before,\n.pager:after,\n.panel-body:before,\n.panel-body:after,\n.modal-footer:before,\n.modal-footer:after {\n  content: \" \";\n  display: table;\n}\n.clearfix:after,\n.container:after,\n.container-fluid:after,\n.row:after,\n.form-horizontal .form-group:after,\n.btn-toolbar:after,\n.btn-group-vertical > .btn-group:after,\n.nav:after,\n.navbar:after,\n.navbar-header:after,\n.navbar-collapse:after,\n.pager:after,\n.panel-body:after,\n.modal-footer:after {\n  clear: both;\n}\n.center-block {\n  display: block;\n  margin-left: auto;\n  margin-right: auto;\n}\n.pull-right {\n  float: right !important;\n}\n.pull-left {\n  float: left !important;\n}\n.hide {\n  display: none !important;\n}\n.show {\n  display: block !important;\n}\n.invisible {\n  visibility: hidden;\n}\n.text-hide {\n  font: 0/0 a;\n  color: transparent;\n  text-shadow: none;\n  background-color: transparent;\n  border: 0;\n}\n.hidden {\n  display: none !important;\n  visibility: hidden !important;\n}\n.affix {\n  position: fixed;\n}\n@-ms-viewport {\n  width: device-width;\n}\n.visible-xs,\n.visible-sm,\n.visible-md,\n.visible-lg {\n  display: none !important;\n}\n@media (max-width: 767px) {\n  .visible-xs {\n    display: block !important;\n  }\n  table.visible-xs {\n    display: table;\n  }\n  tr.visible-xs {\n    display: table-row !important;\n  }\n  th.visible-xs,\n  td.visible-xs {\n    display: table-cell !important;\n  }\n}\n@media (min-width: 768px) and (max-width: 991px) {\n  .visible-sm {\n    display: block !important;\n  }\n  table.visible-sm {\n    display: table;\n  }\n  tr.visible-sm {\n    display: table-row !important;\n  }\n  th.visible-sm,\n  td.visible-sm {\n    display: table-cell !important;\n  }\n}\n@media (min-width: 992px) and (max-width: 1199px) {\n  .visible-md {\n    display: block !important;\n  }\n  table.visible-md {\n    display: table;\n  }\n  tr.visible-md {\n    display: table-row !important;\n  }\n  th.visible-md,\n  td.visible-md {\n    display: table-cell !important;\n  }\n}\n@media (min-width: 1200px) {\n  .visible-lg {\n    display: block !important;\n  }\n  table.visible-lg {\n    display: table;\n  }\n  tr.visible-lg {\n    display: table-row !important;\n  }\n  th.visible-lg,\n  td.visible-lg {\n    display: table-cell !important;\n  }\n}\n@media (max-width: 767px) {\n  .hidden-xs {\n    display: none !important;\n  }\n}\n@media (min-width: 768px) and (max-width: 991px) {\n  .hidden-sm {\n    display: none !important;\n  }\n}\n@media (min-width: 992px) and (max-width: 1199px) {\n  .hidden-md {\n    display: none !important;\n  }\n}\n@media (min-width: 1200px) {\n  .hidden-lg {\n    display: none !important;\n  }\n}\n.visible-print {\n  display: none !important;\n}\n@media print {\n  .visible-print {\n    display: block !important;\n  }\n  table.visible-print {\n    display: table;\n  }\n  tr.visible-print {\n    display: table-row !important;\n  }\n  th.visible-print,\n  td.visible-print {\n    display: table-cell !important;\n  }\n}\n@media print {\n  .hidden-print {\n    display: none !important;\n  }\n}\n/*\nDocument   : jquery.pnotify.default.css\nCreated on : Nov 23, 2009, 3:14:10 PM\nAuthor     : Hunter Perrin\nVersion    : 1.2.0\nLink       : http://pinesframework.org/pnotify/\nDescription:\n\tDefault styling for Pines Notify jQuery plugin.\n*/\n/* -- Notice */\n.ui-pnotify {\n  top: 25px;\n  right: 25px;\n  position: absolute;\n  height: auto;\n  /* Ensures notices are above everything */\n  z-index: 9999;\n}\n/* Hides position: fixed from IE6 */\nhtml > body .ui-pnotify {\n  position: fixed;\n}\n.ui-pnotify .ui-pnotify-shadow {\n  -webkit-box-shadow: 0px 2px 10px rgba(50, 50, 50, 0.5);\n  -moz-box-shadow: 0px 2px 10px rgba(50, 50, 50, 0.5);\n  box-shadow: 0px 2px 10px rgba(50, 50, 50, 0.5);\n}\n.ui-pnotify-container {\n  background-position: 0 0;\n  padding: .8em;\n  height: 100%;\n  margin: 0;\n}\n.ui-pnotify-sharp {\n  -webkit-border-radius: 0;\n  -moz-border-radius: 0;\n  border-radius: 0;\n}\n.ui-pnotify-closer,\n.ui-pnotify-sticker {\n  float: right;\n  margin-left: .2em;\n}\n.ui-pnotify-title {\n  display: block;\n  margin-bottom: .4em;\n}\n.ui-pnotify-text {\n  display: block;\n}\n.ui-pnotify-icon,\n.ui-pnotify-icon span {\n  display: block;\n  float: left;\n  margin-right: .2em;\n}\n/* -- History Pulldown */\n.ui-pnotify-history-container {\n  position: absolute;\n  top: 0;\n  right: 18px;\n  width: 70px;\n  border-top: none;\n  padding: 0;\n  -webkit-border-top-left-radius: 0;\n  -moz-border-top-left-radius: 0;\n  border-top-left-radius: 0;\n  -webkit-border-top-right-radius: 0;\n  -moz-border-top-right-radius: 0;\n  border-top-right-radius: 0;\n  /* Ensures history container is above notices. */\n  z-index: 10000;\n}\n.ui-pnotify-history-container .ui-pnotify-history-header {\n  padding: 2px;\n}\n.ui-pnotify-history-container button {\n  cursor: pointer;\n  display: block;\n  width: 100%;\n}\n.ui-pnotify-history-container .ui-pnotify-history-pulldown {\n  display: block;\n  margin: 0 auto;\n}\n.products-edit-form {\n  padding-top: 10px;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":3}],14:[function(require,module,exports){
var $, Bootstrap, Commands, Marionette, Pnotify, ProductEditView, ProductListView, Products, jQuery;

Marionette = require('backbone.marionette');

$ = require('jquery');

jQuery = require('jquery');

ProductEditView = require('../products/edit/layout.coffee');

ProductListView = require('../products/list/layout.coffee');

window.jQuery = require('jquery');

Bootstrap = require('bootstrap');

Products = require('../../collections/products.coffee');

Commands = require("../../requires/commands.coffee");

Pnotify = require('jquery_pnotify');

$.pnotify.defaults.history = false;

$.pnotify.defaults.styling = "bootstrap";

module.exports = Marionette.Layout.extend({
  template: window.templates['src/app/views/home/layout'],
  className: "col-md-12 home-page-col",
  initialize: function() {
    console.log("views/home/layout.coffee::initialize");
    return this.setCommandHandlers();
  },
  regions: {
    'main': '#main-body',
    'list': "#list"
  },
  events: {
    'mouseenter [tooltip]': 'showTooltip',
    'mouseleave [tooltip]': 'hideTooltip'
  },
  showTooltip: function(event) {
    var error;
    $('[tooltip]').each(function(i, el) {
      var error;
      try {
        return $(el).tooltip();
      } catch (_error) {
        error = _error;
      }
    });
    try {
      return $(event.target).tooltip('show');
    } catch (_error) {
      error = _error;
    }
  },
  hideTooltip: function(event) {
    var error;
    try {
      return $(event.target).tooltip('hide');
    } catch (_error) {
      error = _error;
    }
  },
  onRender: function() {
    var list_view, products;
    products = new Products;
    products.fetch();
    list_view = new ProductListView({
      collection: products
    });
    return this.list.show(list_view);
  },
  setCommandHandlers: function() {
    return Commands.setHandler("src/app/views/home/layout/edit_product", (function(_this) {
      return function(product) {
        var edit_view;
        edit_view = new ProductEditView({
          model: product
        });
        return _this.main.show(edit_view);
      };
    })(this));
  }
});


},{"../../collections/products.coffee":7,"../../requires/commands.coffee":11,"../products/edit/layout.coffee":18,"../products/list/layout.coffee":21,"backbone.marionette":false,"bootstrap":false,"jquery":false,"jquery_pnotify":25}],15:[function(require,module,exports){
var $, Commands, Marionette, Pnotify;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

$ = require('jquery');

Pnotify = require('jquery_pnotify');

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/edit/controls'],
  className: "products-edit-controls",
  initialize: function() {
    return console.log("views/products/edit/controls::initialize");
  },
  events: {
    'click #save': 'saveProduct',
    'click #cancel': 'doClose',
    'click #delete': 'doDelete'
  },
  serializeData: function() {
    return {
      'model': this.model
    };
  },
  doClose: function(event) {
    return Commands.execute("src/app/views/products/edit/layout/close");
  },
  doDelete: function(event) {
    return this.model.destroy({
      success: (function(_this) {
        return function() {
          Commands.execute("models/products/deleted", _this.model);
          _this.doClose();
          return $.pnotify({
            title: "Product deleted",
            text: "Product " + (_this.model.get('title')) + " was deleted",
            type: 'error'
          });
        };
      })(this)
    });
  },
  saveProduct: function(event) {
    console.log("views/products/edit/controls::saveProduct");
    if (this.model.isNew()) {
      Commands.execute("models/products/added_new", this.model);
    }
    this.model.save();
    return this.doClose();
  }
});


},{"../../../requires/commands.coffee":11,"backbone.marionette":false,"jquery":false,"jquery_pnotify":25}],16:[function(require,module,exports){
var $, Commands, Marionette, _;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

$ = require('jquery');

_ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/edit/form_about'],
  className: "products-edit-form ",
  initialize: function() {
    return console.log("views/products/edit/form_about::initialize");
  },
  serializeData: function() {
    return {
      'model': this.model
    };
  },
  events: {
    'change input': 'inputChanged',
    'change textarea': 'textareaChanged'
  },
  inputChanged: function(event) {
    var input;
    console.log("views/products/edit/form_about::inputChanged");
    input = $(event.currentTarget);
    if (!_.isUndefined(input.data('model-attribute'))) {
      return this.model.set(input.data('model-attribute'), input.val());
    }
  },
  textareaChanged: function(event) {
    var textarea;
    console.log("views/products/edit/form_about::textareaChanged");
    textarea = $(event.currentTarget);
    if (!_.isUndefined(textarea.data('model-attribute'))) {
      return this.model.set(textarea.data('model-attribute'), textarea.val());
    }
  }
});


},{"../../../requires/commands.coffee":11,"backbone.marionette":false,"jquery":false,"underscore":4}],17:[function(require,module,exports){
var $, Commands, DaysToShips, Marionette, _;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

$ = require('jquery');

_ = require('underscore');

DaysToShips = require('../../../collections/days_to_ships.coffee');

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/edit/form_delivery'],
  className: "products-edit-form ",
  initialize: function() {
    console.log("views/products/edit/form_delivery::initialize");
    this.days_to_ship_records = new DaysToShips();
    return this.days_to_ship_records.fetch({
      success: (function(_this) {
        return function() {
          console.log("loaded days to ships");
          return _this.render();
        };
      })(this)
    });
  },
  ui: {
    'days_select': '#days_to_ship'
  },
  serializeData: function() {
    return {
      'model': this.model,
      'days_to_ship_records': this.days_to_ship_records
    };
  },
  events: {
    'change input': 'inputChanged',
    'change textarea': 'textareaChanged',
    'change select': 'selectChanged'
  },
  onRender: function() {
    console.log("views/products/edit/form_delivery::onRender");
    console.log(this.model.get('days_to_ship_id'));
    return this.ui.days_select.val(this.model.get('days_to_ship_id'));
  },
  inputChanged: function(event) {
    var input;
    console.log("views/products/edit/form_delivery::inputChanged");
    input = $(event.currentTarget);
    if (!_.isUndefined(input.data('model-attribute'))) {
      return this.model.set(input.data('model-attribute'), input.val());
    }
  },
  textareaChanged: function(event) {
    var textarea;
    console.log("views/products/edit/form_delivery::textareaChanged");
    textarea = $(event.currentTarget);
    if (!_.isUndefined(textarea.data('model-attribute'))) {
      return this.model.set(textarea.data('model-attribute'), textarea.val());
    }
  },
  selectChanged: function(event) {
    var select;
    console.log("views/products/edit/form_delivery::selectChanged");
    select = $(event.currentTarget);
    if (!_.isUndefined(select.data('model-attribute'))) {
      return this.model.set(select.data('model-attribute'), select.val());
    }
  }
});


},{"../../../collections/days_to_ships.coffee":6,"../../../requires/commands.coffee":11,"backbone.marionette":false,"jquery":false,"underscore":4}],18:[function(require,module,exports){
var Commands, ControlsView, FormAboutView, FormDeliveryView, Marionette, TabsView;

Marionette = require('backbone.marionette');

ControlsView = require('./controls.coffee');

FormAboutView = require('./form_about.coffee');

FormDeliveryView = require('./form_delivery.coffee');

TabsView = require('./tabs.coffee');

Commands = require("../../../requires/commands.coffee");

module.exports = Marionette.Layout.extend({
  template: window.templates['src/app/views/products/edit/layout'],
  className: "product-edit-layout",
  initialize: function() {
    console.log("views/products/edit/layout.coffee::initialize");
    this.controls_view = new ControlsView({
      model: this.model
    });
    this.tabs_view = new TabsView({
      model: this.model
    });
    return this.setCommandHandlers();
  },
  regions: {
    'controls': '#controls',
    'tabs': '#tabs',
    'form': '#form'
  },
  tab_constructors: {
    delivery: FormDeliveryView,
    about: FormAboutView
  },
  onRender: function() {
    this.controls.show(this.controls_view);
    return this.tabs.show(this.tabs_view);
  },
  setCommandHandlers: function() {
    Commands.setHandler("src/app/views/products/edit/layout/close", (function(_this) {
      return function() {
        return _this.close();
      };
    })(this));
    Commands.setHandler("src/app/views/products/edit/layout/show_about", (function(_this) {
      return function() {
        var view;
        view = new FormAboutView({
          model: _this.model
        });
        return _this.form.show(view);
      };
    })(this));
    return Commands.setHandler("src/app/views/products/edit/layout/show_tab", (function(_this) {
      return function(tag_name) {
        var view;
        view = new _this.tab_constructors[tag_name]({
          model: _this.model
        });
        return _this.form.show(view);
      };
    })(this));
  }
});


},{"../../../requires/commands.coffee":11,"./controls.coffee":15,"./form_about.coffee":16,"./form_delivery.coffee":17,"./tabs.coffee":19,"backbone.marionette":false}],19:[function(require,module,exports){
var $, Commands, Marionette;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

$ = require('jquery');

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/edit/tabs'],
  className: "products-edit-tabs",
  initialize: function() {
    return console.log("views/products/edit/tabs::initialize");
  },
  serializeData: function() {
    return {
      'model': this.model
    };
  },
  ui: {
    tabs: '.nav-tabs li'
  },
  events: {
    'click .nav-tabs li': 'tabClicked'
  },
  onRender: function() {
    return Commands.execute("src/app/views/products/edit/layout/show_about");
  },
  tabClicked: function(event) {
    var tab, tab_name;
    console.log("views/products/edit/tabs::tabClicked");
    tab = $(event.currentTarget);
    tab_name = tab.data('tab-name');
    console.log(tab_name);
    Commands.execute("src/app/views/products/edit/layout/show_tab", tab.data('tab-name'));
    this.ui.tabs.removeClass('active');
    return tab.addClass('active');
  }
});


},{"../../../requires/commands.coffee":11,"backbone.marionette":false,"jquery":false}],20:[function(require,module,exports){
var $, Commands, Marionette, Product;

Marionette = require('backbone.marionette');

$ = require('jquery');

Product = require('../../../models/product.coffee');

Commands = require("../../../requires/commands.coffee");

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/list/controls'],
  className: "products-list-controls",
  initialize: function() {
    console.log("views/products/list/controls::initialize");
    return this.search_text = "";
  },
  events: {
    'click #add': 'AddProduct'
  },
  serializeData: function() {
    return {
      'collection': this.collection,
      'search_text': this.search_text
    };
  },
  AddProduct: function(event) {
    var product;
    console.log("views/products/list/controls::AddProduct");
    event.stopPropagation();
    product = new Product();
    return Commands.execute("src/app/views/home/layout/edit_product", product);
  }
});


},{"../../../models/product.coffee":10,"../../../requires/commands.coffee":11,"backbone.marionette":false,"jquery":false}],21:[function(require,module,exports){
var $, ControlsView, ListView, Marionette;

Marionette = require('backbone.marionette');

$ = require('jquery');

ControlsView = require('./controls.coffee');

ListView = require('./list.coffee');

module.exports = Marionette.Layout.extend({
  template: window.templates['src/app/views/products/list/layout'],
  className: "products-list-layout",
  initialize: function() {
    console.log("views/products/list/layout::initialize");
    this.controls_view = new ControlsView({
      collection: this.collection
    });
    return this.list_view = new ListView({
      collection: this.collection
    });
  },
  regions: {
    'controls': '#controls',
    "list": '#list'
  },
  onRender: function() {
    this.controls.show(this.controls_view);
    return this.list.show(this.list_view);
  }
});


},{"./controls.coffee":20,"./list.coffee":22,"backbone.marionette":false,"jquery":false}],22:[function(require,module,exports){
var $, Commands, ListItemView, Marionette;

Marionette = require('backbone.marionette');

$ = require('jquery');

ListItemView = require('./list_item.coffee');

Commands = require("../../../requires/commands.coffee");

module.exports = Marionette.CompositeView.extend({
  template: window.templates['src/app/views/products/list/list'],
  className: "products-list-list",
  initialize: function() {
    console.log("views/products/list/list::initialize");
    return this.setCommandHandlers();
  },
  itemViewContainer: '#item-view-container',
  itemView: ListItemView,
  setCommandHandlers: function() {
    Commands.setHandler("models/products/added_new", (function(_this) {
      return function(product) {
        return _this.collection.add(product);
      };
    })(this));
    return Commands.setHandler("src/app/views/products/edit/layout/show_details", (function(_this) {
      return function() {
        var view;
        view = new FormDetailsView({
          model: _this.model
        });
        return _this.form.show(view);
      };
    })(this));
  }
});


},{"../../../requires/commands.coffee":11,"./list_item.coffee":23,"backbone.marionette":false,"jquery":false}],23:[function(require,module,exports){
var Commands, Marionette;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/list/list_item'],
  className: "products-list-list-item",
  tagName: "tr",
  initialize: function() {
    console.log("views/products/list/list_item::initialize");
    return this.search_text = "";
  },
  serializeData: function() {
    return {
      'model': this.model
    };
  },
  modelEvents: {
    'sync': 'render'
  },
  events: {
    'click .edit_link': 'doEdit'
  },
  doEdit: function(event) {
    console.log("views/products/list/list_item::doEdit");
    event.stopPropagation();
    return Commands.execute("src/app/views/home/layout/edit_product", this.model);
  }
});


},{"../../../requires/commands.coffee":11,"backbone.marionette":false}],24:[function(require,module,exports){
(function (global){
(function browserifyShim(module, exports, define, browserify_shim__define__module__export__) {
/*
  Patched version of this adapter to work with Browserify
*/
(function () { /*global _: false, Backbone: false */
    // Generate four random hex digits.
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    // Generate a pseudo-GUID by concatenating random hexadecimal.
    function guid() {
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }

    var Backbone = require('backbone')
    var _ = require('underscore')

     // Naming is a mess!
     var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB ;
     var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || { READ_WRITE: "readwrite" }; // No prefix in moz
     var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange ; // No prefix in moz

     window.IDBCursor = window.IDBCursor || window.webkitIDBCursor ||  window.mozIDBCursor ||  window.msIDBCursor ;


    // Driver object
    // That's the interesting part.
    // There is a driver for each schema provided. The schema is a te combination of name (for the database), a version as well as migrations to reach that
    // version of the database.
    function Driver(schema, ready, nolog) {
        this.schema         = schema;
        this.ready          = ready;
        this.error          = null;
        this.transactions   = []; // Used to list all transactions and keep track of active ones.
        this.db             = null;
        this.nolog          = nolog;
        this.supportOnUpgradeNeeded = false;
        var lastMigrationPathVersion = _.last(this.schema.migrations).version;
        if (!this.nolog) debugLog("opening database " + this.schema.id + " in version #" + lastMigrationPathVersion);
        this.dbRequest      = indexedDB.open(this.schema.id,lastMigrationPathVersion); //schema version need to be an unsigned long

        this.launchMigrationPath = function(dbVersion) {
            var transaction = this.dbRequest.transaction || versionRequest.result;
            var clonedMigrations = _.clone(schema.migrations);
            this.migrate(transaction, clonedMigrations, dbVersion, {
                success: function () {
                    this.ready();
                }.bind(this),
                error: function () {
                    this.error = "Database not up to date. " + dbVersion + " expected was " + lastMigrationPathVersion;
                }.bind(this)
            });
        };

        this.dbRequest.onblocked = function(event){
            if (!this.nolog) debugLog("blocked");
        }

        this.dbRequest.onsuccess = function (e) {
            this.db = e.target.result; // Attach the connection ot the queue.
            if(!this.supportOnUpgradeNeeded)
            {
                var currentIntDBVersion = (parseInt(this.db.version) ||  0); // we need convert beacuse chrome store in integer and ie10 DP4+ in int;
                var lastMigrationInt = (parseInt(lastMigrationPathVersion) || 0);  // And make sure we compare numbers with numbers.

                if (currentIntDBVersion === lastMigrationInt) { //if support new event onupgradeneeded will trigger the ready function
                    // No migration to perform!

                    this.ready();
                } else if (currentIntDBVersion < lastMigrationInt ) {
                    // We need to migrate up to the current migration defined in the database
                    this.launchMigrationPath(currentIntDBVersion);
                } else {
                    // Looks like the IndexedDB is at a higher version than the current driver schema.
                    this.error = "Database version is greater than current code " + currentIntDBVersion + " expected was " + lastMigrationInt;
                }
            };
        }.bind(this);



        this.dbRequest.onerror = function (e) {
            // Failed to open the database
            this.error = "Couldn't not connect to the database"
        }.bind(this);

        this.dbRequest.onabort = function (e) {
            // Failed to open the database
            this.error = "Connection to the database aborted"
        }.bind(this);



        this.dbRequest.onupgradeneeded = function(iDBVersionChangeEvent){
            this.db =iDBVersionChangeEvent.target.transaction.db;

            this.supportOnUpgradeNeeded = true;

            if (!this.nolog) debugLog("onupgradeneeded = " + iDBVersionChangeEvent.oldVersion + " => " + iDBVersionChangeEvent.newVersion);
            this.launchMigrationPath(iDBVersionChangeEvent.oldVersion);


        }.bind(this);
    }

    function debugLog(str) {
        if (typeof window !== "undefined" && typeof window.console !== "undefined" && typeof window.console.log !== "undefined") {
            window.console.log(str);
        }
        else if(console.log !== "undefined") {
            console.log(str)
        }
    }

    // Driver Prototype
    Driver.prototype = {

        // Tracks transactions. Mostly for debugging purposes. TO-IMPROVE
        _track_transaction: function(transaction) {
            this.transactions.push(transaction);
            function removeIt() {
                var idx = this.transactions.indexOf(transaction);
                if (idx !== -1) {this.transactions.splice(idx); }
            };
            transaction.oncomplete = removeIt.bind(this);
            transaction.onabort = removeIt.bind(this);
            transaction.onerror = removeIt.bind(this);
        },

        // Performs all the migrations to reach the right version of the database.
        migrate: function (transaction, migrations, version, options) {
            if (!this.nolog) debugLog("migrate begin version from #" + version);
            var that = this;
            var migration = migrations.shift();
            if (migration) {
                if (!version || version < migration.version) {
                    // We need to apply this migration-
                    if (typeof migration.before == "undefined") {
                        migration.before = function (next) {
                            next();
                        };
                    }
                    if (typeof migration.after == "undefined") {
                        migration.after = function (next) {
                            next();
                        };
                    }
                    // First, let's run the before script
                    if (!this.nolog) debugLog("migrate begin before version #" + migration.version);
                    migration.before(function () {
                        if (!this.nolog) debugLog("migrate done before version #" + migration.version);

                        var continueMigration = function (e) {
                            if (!this.nolog) debugLog("migrate begin migrate version #" + migration.version);

                            migration.migrate(transaction, function () {
                                if (!this.nolog) debugLog("migrate done migrate version #" + migration.version);
                                // Migration successfully appliedn let's go to the next one!
                                if (!this.nolog) debugLog("migrate begin after version #" + migration.version);
                                migration.after(function () {
                                    if (!this.nolog) debugLog("migrate done after version #" + migration.version);
                                    if (!this.nolog) debugLog("Migrated to " + migration.version);

                                    //last modification occurred, need finish
                                    if(migrations.length ==0) {
                                        /*if(this.supportOnUpgradeNeeded){
                                            debugLog("Done migrating");
                                            // No more migration
                                            options.success();
                                        }
                                        else{*/
                                            if (!this.nolog) debugLog("migrate setting transaction.oncomplete to finish  version #" + migration.version);
                                            transaction.oncomplete = function() {
                                                if (!that.nolog) debugLog("migrate done transaction.oncomplete version #" + migration.version);

                                                if (!that.nolog) debugLog("Done migrating");
                                                // No more migration
                                                options.success();
                                            }
                                        //}
                                    }
                                    else
                                    {
                                        if (!this.nolog) debugLog("migrate end from version #" + version + " to " + migration.version);
                                            that.migrate(transaction, migrations, version, options);
                                    }

                                }.bind(this));
                            }.bind(this));
                        }.bind(this);

                        if(!this.supportOnUpgradeNeeded){
                            if (!this.nolog) debugLog("migrate begin setVersion version #" + migration.version);
                            var versionRequest = this.db.setVersion(migration.version);
                            versionRequest.onsuccess = continueMigration;
                            versionRequest.onerror = options.error;
                        }
                        else {
                            continueMigration();
                        }

                    }.bind(this));
                } else {
                    // No need to apply this migration
                    if (!this.nolog) debugLog("Skipping migration " + migration.version);
                    this.migrate(transaction, migrations, version, options);
                }
            }
        },

        // This is the main method, called by the ExecutionQueue when the driver is ready (database open and migration performed)
        execute: function (storeName, method, object, options) {
            if (!this.nolog) debugLog("execute : " + method +  " on " + storeName + " for " + object.id);
            switch (method) {
            case "create":
                this.create(storeName, object, options);
                break;
            case "read":
                if (object.id || object.cid) {
                    this.read(storeName, object, options); // It's a model
                } else {
                    this.query(storeName, object, options); // It's a collection
                }
                break;
            case "update":
                this.update(storeName, object, options); // We may want to check that this is not a collection. TOFIX
                break;
            case "delete":
                if (object.id || object.cid) {
                    this.delete(storeName, object, options);
                } else {
                    this.clear(storeName, object, options);
                }
                break;
            default:
                // Hum what?
            }
        },

        // Writes the json to the storeName in db. It is a create operations, which means it will fail if the key already exists
        // options are just success and error callbacks.
        create: function (storeName, object, options) {
            var writeTransaction = this.db.transaction([storeName], 'readwrite');
            //this._track_transaction(writeTransaction);
            var store = writeTransaction.objectStore(storeName);
            var json = object.toJSON();
            var writeRequest;

            if (json.id === undefined && !store.autoIncrement) json.id = guid();

            writeTransaction.onerror = function (e) {
                options.error(e);
            };
            writeTransaction.oncomplete = function (e) {
                options.success(json);
            };

            if (!store.keyPath)
                writeRequest = store.add(json, json.id);
            else
                writeRequest = store.add(json);
        },

        // Writes the json to the storeName in db. It is an update operation, which means it will overwrite the value if the key already exist
        // options are just success and error callbacks.
        update: function (storeName, object, options) {
            var writeTransaction = this.db.transaction([storeName], 'readwrite');
            //this._track_transaction(writeTransaction);
            var store = writeTransaction.objectStore(storeName);
            var json = object.toJSON();
            var writeRequest;

            if (!json.id) json.id = guid();

            if (!store.keyPath)
              writeRequest = store.put(json, json.id);
            else
              writeRequest = store.put(json);

            writeRequest.onerror = function (e) {
                options.error(e);
            };
            writeTransaction.oncomplete = function (e) {
                options.success(json);
            };
        },

        // Reads from storeName in db with json.id if it's there of with any json.xxxx as long as xxx is an index in storeName
        read: function (storeName, object, options) {
            var readTransaction = this.db.transaction([storeName], "readonly");
            this._track_transaction(readTransaction);

            var store = readTransaction.objectStore(storeName);
            var json = object.toJSON();

            var getRequest = null;
            if (json.id) {
                getRequest = store.get(json.id);
            } else if(options.index) {
                var index = store.index(options.index.name);
                getRequest = index.get(options.index.value);
            } else {
                // We need to find which index we have
                var cardinality = 0; // try to fit the index with most matches
                _.each(store.indexNames, function (key, index) {
                    index = store.index(key);
                    if(typeof index.keyPath === 'string' && 1 > cardinality) {
                        // simple index
                        if (json[index.keyPath] !== undefined) {
                            getRequest = index.get(json[index.keyPath]);
                            cardinality = 1;
                        }
                    } else if(typeof index.keyPath === 'object' && index.keyPath.length > cardinality) {
                        // compound index
                        var valid = true;
                        var keyValue = _.map(index.keyPath, function(keyPart) {
                            valid = valid && json[keyPart] !== undefined;
                            return json[keyPart];
                        });
                        if(valid) {
                            getRequest = index.get(keyValue);
                            cardinality = index.keyPath.length;
                        }
                    }
                });
            }
            if (getRequest) {
                getRequest.onsuccess = function (event) {
                    if (event.target.result) {
                        options.success(event.target.result);
                    } else {
                        options.error("Not Found");
                    }
                };
                getRequest.onerror = function () {
                    options.error("Not Found"); // We couldn't find the record.
                }
            } else {
                options.error("Not Found"); // We couldn't even look for it, as we don't have enough data.
            }
        },

        // Deletes the json.id key and value in storeName from db.
        delete: function (storeName, object, options) {
            var deleteTransaction = this.db.transaction([storeName], 'readwrite');
            //this._track_transaction(deleteTransaction);

            var store = deleteTransaction.objectStore(storeName);
            var json = object.toJSON();

            var deleteRequest = store.delete(json.id);

            deleteTransaction.oncomplete = function (event) {
                options.success(null);
            };
            deleteRequest.onerror = function (event) {
                options.error("Not Deleted");
            };
        },

        // Clears all records for storeName from db.
        clear: function (storeName, object, options) {
            var deleteTransaction = this.db.transaction([storeName], "readwrite");
            //this._track_transaction(deleteTransaction);

            var store = deleteTransaction.objectStore(storeName);

            var deleteRequest = store.clear();
            deleteRequest.onsuccess = function (event) {
                options.success(null);
            };
            deleteRequest.onerror = function (event) {
                options.error("Not Cleared");
            };
        },

        // Performs a query on storeName in db.
        // options may include :
        // - conditions : value of an index, or range for an index
        // - range : range for the primary key
        // - limit : max number of elements to be yielded
        // - offset : skipped items.
        query: function (storeName, collection, options) {
            var elements = [];
            var skipped = 0, processed = 0;
            var queryTransaction = this.db.transaction([storeName], "readonly");
            //this._track_transaction(queryTransaction);

            var readCursor = null;
            var store = queryTransaction.objectStore(storeName);
            var index = null,
                lower = null,
                upper = null,
                bounds = null;

            if (options.conditions) {
                // We have a condition, we need to use it for the cursor
                _.each(store.indexNames, function (key) {
                    if (!readCursor) {
                        index = store.index(key);
                        if (options.conditions[index.keyPath] instanceof Array) {
                            lower = options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1] ? options.conditions[index.keyPath][1] : options.conditions[index.keyPath][0];
                            upper = options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1] ? options.conditions[index.keyPath][0] : options.conditions[index.keyPath][1];
                            bounds = IDBKeyRange.bound(lower, upper, true, true);

                            if (options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1]) {
                                // Looks like we want the DESC order
                                readCursor = index.openCursor(bounds, window.IDBCursor.PREV || "prev");
                            } else {
                                // We want ASC order
                                readCursor = index.openCursor(bounds, window.IDBCursor.NEXT || "next");
                            }
                        } else if (options.conditions[index.keyPath] != undefined) {
                            bounds = IDBKeyRange.only(options.conditions[index.keyPath]);
                            readCursor = index.openCursor(bounds);
                        }
                    }
                });
            } else {
                // No conditions, use the index
                if (options.range) {
                    lower = options.range[0] > options.range[1] ? options.range[1] : options.range[0];
                    upper = options.range[0] > options.range[1] ? options.range[0] : options.range[1];
                    bounds = IDBKeyRange.bound(lower, upper);
                    if (options.range[0] > options.range[1]) {
                        readCursor = store.openCursor(bounds, window.IDBCursor.PREV || "prev");
                    } else {
                        readCursor = store.openCursor(bounds, window.IDBCursor.NEXT || "next");
                    }
                } else {
                    readCursor = store.openCursor();
                }
            }

            if (typeof (readCursor) == "undefined" || !readCursor) {
                options.error("No Cursor");
            } else {
                readCursor.onerror = function(e){
                    options.error("readCursor error", e);
                };
                // Setup a handler for the cursor’s `success` event:
                readCursor.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (!cursor) {
                        if (options.addIndividually || options.clear) {
                            // nothing!
                            // We need to indicate that we're done. But, how?
                            collection.trigger("reset");
                        } else {
                            options.success(elements); // We're done. No more elements.
                        }
                    }
                    else {
                        // Cursor is not over yet.
                        if (options.limit && processed >= options.limit) {
                            // Yet, we have processed enough elements. So, let's just skip.
                            if (bounds && options.conditions[index.keyPath]) {
                                cursor.continue(options.conditions[index.keyPath][1] + 1); /* We need to 'terminate' the cursor cleany, by moving to the end */
                            } else {
                                cursor.continue(); /* We need to 'terminate' the cursor cleany, by moving to the end */
                            }
                        }
                        else if (options.offset && options.offset > skipped) {
                            skipped++;
                            cursor.continue(); /* We need to Moving the cursor forward */
                        } else {
                            // This time, it looks like it's good!
                            if (options.addIndividually) {
                                collection.add(cursor.value);
                            } else if (options.clear) {
                                var deleteRequest = store.delete(cursor.value.id);
                                deleteRequest.onsuccess = function (event) {
                                    elements.push(cursor.value);
                                };
                                deleteRequest.onerror = function (event) {
                                    elements.push(cursor.value);
                                };

                            } else {
                                elements.push(cursor.value);
                            }
                            processed++;
                            cursor.continue();
                        }
                    }
                };
            }
        },
        close :function(){
            if(this.db){
                this.db.close()
;            }
        }
    };

    // ExecutionQueue object
    // The execution queue is an abstraction to buffer up requests to the database.
    // It holds a "driver". When the driver is ready, it just fires up the queue and executes in sync.
    function ExecutionQueue(schema,next,nolog) {
        this.driver     = new Driver(schema, this.ready.bind(this), nolog);
        this.started    = false;
        this.stack      = [];
        this.version    = _.last(schema.migrations).version;
        this.next = next;
    }

    // ExecutionQueue Prototype
    ExecutionQueue.prototype = {
        // Called when the driver is ready
        // It just loops over the elements in the queue and executes them.
        ready: function () {
            this.started = true;
            _.each(this.stack, function (message) {
                this.execute(message);
            }.bind(this));
            this.stack = [];    // fix memory leak
            this.next();
        },

        // Executes a given command on the driver. If not started, just stacks up one more element.
        execute: function (message) {
            if (this.started) {
                this.driver.execute(message[2].storeName || message[1].storeName, message[0], message[1], message[2]); // Upon messages, we execute the query
            } else {
                this.stack.push(message);
            }
        },

        close : function(){
            this.driver.close();
        }
    };

    // Method used by Backbone for sync of data with data store. It was initially designed to work with "server side" APIs, This wrapper makes
    // it work with the local indexedDB stuff. It uses the schema attribute provided by the object.
    // The wrapper keeps an active Executuon Queue for each "schema", and executes querues agains it, based on the object type (collection or
    // single model), but also the method... etc.
    // Keeps track of the connections
    var Databases = {};

    function sync(method, object, options) {

        if(method=="closeall"){
            _.each(Databases,function(database){
                database.close();
            });
            // Clean up active databases object.
            Databases = {}
            return;
        }

        // If a model or a collection does not define a database, fall back on ajaxSync
        if (typeof object.database === 'undefined' && typeof Backbone.ajaxSync === 'function'){
            return Backbone.ajaxSync(method, object, options);
        }

        var schema = object.database;
        if (Databases[schema.id]) {
            if(Databases[schema.id].version != _.last(schema.migrations).version){
                Databases[schema.id].close();
                delete Databases[schema.id];
            }
        }

        var promise;

        if (typeof Backbone.$ === 'undefined' || typeof Backbone.$.Deferred === 'undefined') {
            var noop = function() {};
            var resolve = noop;
            var reject = noop;
        } else {
            var dfd = Backbone.$.Deferred();
            var resolve = dfd.resolve;
            var reject = dfd.reject;

            promise = dfd.promise();
        }

        var success = options.success;
        options.success = function(resp) {
            if (success) success(resp);
            resolve();
            object.trigger('sync', object, resp, options);
        };

        var error = options.error;
        options.error = function(resp) {
            if (error) error(resp);
            reject();
            object.trigger('error', object, resp, options);
        };

        var next = function(){
            Databases[schema.id].execute([method, object, options]);
        };

        if (!Databases[schema.id]) {
              Databases[schema.id] = new ExecutionQueue(schema,next,schema.nolog);
        } else {
            next();
        }

      return promise;
    };


    Backbone.ajaxSync = Backbone.sync;
    Backbone.sync = sync;

    //window.addEventListener("unload",function(){Backbone.sync("closeall")})
})();
; browserify_shim__define__module__export__(typeof backbone_indexeddb != "undefined" ? backbone_indexeddb : window.backbone_indexeddb);

}).call(global, undefined, undefined, undefined, function defineExport(ex) { module.exports = ex; });

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"backbone":false,"underscore":4}],25:[function(require,module,exports){
(function (global){
(function browserifyShim(module, exports, define, browserify_shim__define__module__export__) {
/*
 * jQuery Pines Notify (pnotify) Plugin 1.2.0
 *
 * http://pinesframework.org/pnotify/
 * Copyright (c) 2009-2012 Hunter Perrin
 *
 * Triple license under the GPL, LGPL, and MPL:
 *	  http://www.gnu.org/licenses/gpl.html
 *	  http://www.gnu.org/licenses/lgpl.html
 *	  http://www.mozilla.org/MPL/MPL-1.1.html
 */

var jQuery = require('jquery');

(function($) {


	var history_handle_top,
		timer,
		body,
		jwindow = $(window),
		styling = {
			jqueryui: {
				container: "ui-widget ui-widget-content ui-corner-all",
				notice: "ui-state-highlight",
				// (The actual jQUI notice icon looks terrible.)
				notice_icon: "ui-icon ui-icon-info",
				info: "",
				info_icon: "ui-icon ui-icon-info",
				success: "ui-state-default",
				success_icon: "ui-icon ui-icon-circle-check",
				error: "ui-state-error",
				error_icon: "ui-icon ui-icon-alert",
				closer: "ui-icon ui-icon-close",
				pin_up: "ui-icon ui-icon-pin-w",
				pin_down: "ui-icon ui-icon-pin-s",
				hi_menu: "ui-state-default ui-corner-bottom",
				hi_btn: "ui-state-default ui-corner-all",
				hi_btnhov: "ui-state-hover",
				hi_hnd: "ui-icon ui-icon-grip-dotted-horizontal"
			},
			bootstrap: {
				container: "alert",
				notice: "",
				notice_icon: "fa fa-exclamation",
				info: "alert-info",
				info_icon: "fa fa-info-circle",
				success: "alert-success",
				success_icon: "fa fa-thumbs-o-up",
				error: "alert-danger",
				error_icon: "fa fa-exclamation-triangle",
				closer: "fa fa-times",
				pin_up: "fa fa-pause",
				pin_down: "fa fa-play",
				hi_menu: "well",
				hi_btn: "btn",
				hi_btnhov: "",
				hi_hnd: "fa fa-chevron-down"
			}
		};
	// Set global variables.
	var do_when_ready = function(){
		body = $("body");
		jwindow = $(window);
		// Reposition the notices when the window resizes.
		jwindow.bind('resize', function(){
			if (timer)
				clearTimeout(timer);
			timer = setTimeout($.pnotify_position_all, 10);
		});
	};
	if (document.body)
		do_when_ready();
	else
		$(do_when_ready);
	$.extend({
		pnotify_remove_all: function () {
			var notices_data = jwindow.data("pnotify");
			/* POA: Added null-check */
			if (notices_data && notices_data.length) {
				$.each(notices_data, function(){
					if (this.pnotify_remove)
						this.pnotify_remove();
				});
			}
		},
		pnotify_position_all: function () {
			// This timer is used for queueing this function so it doesn't run
			// repeatedly.
			if (timer)
				clearTimeout(timer);
			timer = null;
			// Get all the notices.
			var notices_data = jwindow.data("pnotify");
			if (!notices_data || !notices_data.length)
				return;
			// Reset the next position data.
			$.each(notices_data, function(){
				var s = this.opts.stack;
				if (!s) return;
				s.nextpos1 = s.firstpos1;
				s.nextpos2 = s.firstpos2;
				s.addpos2 = 0;
				s.animation = true;
			});
			$.each(notices_data, function(){
				this.pnotify_position();
			});
		},
		pnotify: function(options) {
			// Stores what is currently being animated (in or out).
			var animating;

			// Build main options.
			var opts;
			if (typeof options != "object") {
				opts = $.extend({}, $.pnotify.defaults);
				opts.text = options;
			} else {
				opts = $.extend({}, $.pnotify.defaults, options);
			}
			// Translate old pnotify_ style options.
			for (var i in opts) {
				if (typeof i == "string" && i.match(/^pnotify_/))
					opts[i.replace(/^pnotify_/, "")] = opts[i];
			}

			if (opts.before_init) {
				if (opts.before_init(opts) === false)
					return null;
			}

			// This keeps track of the last element the mouse was over, so
			// mouseleave, mouseenter, etc can be called.
			var nonblock_last_elem;
			// This is used to pass events through the notice if it is non-blocking.
			var nonblock_pass = function(e, e_name){
				pnotify.css("display", "none");
				var element_below = document.elementFromPoint(e.clientX, e.clientY);
				pnotify.css("display", "block");
				var jelement_below = $(element_below);
				var cursor_style = jelement_below.css("cursor");
				pnotify.css("cursor", cursor_style != "auto" ? cursor_style : "default");
				// If the element changed, call mouseenter, mouseleave, etc.
				if (!nonblock_last_elem || nonblock_last_elem.get(0) != element_below) {
					if (nonblock_last_elem) {
						dom_event.call(nonblock_last_elem.get(0), "mouseleave", e.originalEvent);
						dom_event.call(nonblock_last_elem.get(0), "mouseout", e.originalEvent);
					}
					dom_event.call(element_below, "mouseenter", e.originalEvent);
					dom_event.call(element_below, "mouseover", e.originalEvent);
				}
				dom_event.call(element_below, e_name, e.originalEvent);
				// Remember the latest element the mouse was over.
				nonblock_last_elem = jelement_below;
			};

			// Get our styling object.
			var styles = styling[opts.styling];

			// Create our widget.
			// Stop animation, reset the removal timer, and show the close
			// button when the user mouses over.
			var pnotify = $("<div />", {
				"class": "ui-pnotify "+opts.addclass,
				"css": {"display": "none"},
				"mouseenter": function(e){
					if (opts.nonblock) e.stopPropagation();
					if (opts.mouse_reset && animating == "out") {
						// If it's animating out, animate back in really quickly.
						pnotify.stop(true);
						animating = "in";
						pnotify.css("height", "auto").animate({"width": opts.width, "opacity": opts.nonblock ? opts.nonblock_opacity : opts.opacity}, "fast");
					}
					if (opts.nonblock) {
						// If it's non-blocking, animate to the other opacity.
						pnotify.animate({"opacity": opts.nonblock_opacity}, "fast");
					}
					// Stop the close timer.
					if (opts.hide && opts.mouse_reset) pnotify.pnotify_cancel_remove();
					// Show the buttons.
					if (opts.sticker && !opts.nonblock) pnotify.sticker.trigger("pnotify_icon").css("visibility", "visible");
					if (opts.closer && !opts.nonblock) pnotify.closer.css("visibility", "visible");
				},
				"mouseleave": function(e){
					if (opts.nonblock) e.stopPropagation();
					nonblock_last_elem = null;
					pnotify.css("cursor", "auto");
					// Animate back to the normal opacity.
					if (opts.nonblock && animating != "out")
						pnotify.animate({"opacity": opts.opacity}, "fast");
					// Start the close timer.
					if (opts.hide && opts.mouse_reset) pnotify.pnotify_queue_remove();
					// Hide the buttons.
					if (opts.sticker_hover)
						pnotify.sticker.css("visibility", "hidden");
					if (opts.closer_hover)
						pnotify.closer.css("visibility", "hidden");
					$.pnotify_position_all();
				},
				"mouseover": function(e){
					if (opts.nonblock) e.stopPropagation();
				},
				"mouseout": function(e){
					if (opts.nonblock) e.stopPropagation();
				},
				"mousemove": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						nonblock_pass(e, "onmousemove");
					}
				},
				"mousedown": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						e.preventDefault();
						nonblock_pass(e, "onmousedown");
					}
				},
				"mouseup": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						e.preventDefault();
						nonblock_pass(e, "onmouseup");
					}
				},
				"click": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						nonblock_pass(e, "onclick");
					}
				},
				"dblclick": function(e){
					if (opts.nonblock) {
						e.stopPropagation();
						nonblock_pass(e, "ondblclick");
					}
				}
			});
			pnotify.opts = opts;
			// Create a container for the notice contents.
			pnotify.container = $("<div />", {"class": styles.container+" ui-pnotify-container "+(opts.type == "error" ? styles.error : (opts.type == "info" ? styles.info : (opts.type == "success" ? styles.success : styles.notice)))})
			.appendTo(pnotify);
			if (opts.cornerclass != "")
				pnotify.container.removeClass("ui-corner-all").addClass(opts.cornerclass);
			// Create a drop shadow.
			if (opts.shadow)
				pnotify.container.addClass("ui-pnotify-shadow");

			// The current version of Pines Notify.
			pnotify.pnotify_version = "1.2.0";

			// This function is for updating the notice.
			pnotify.pnotify = function(options) {
				// Update the notice.
				var old_opts = opts;
				if (typeof options == "string")
					opts.text = options;
				else
					opts = $.extend({}, opts, options);
				// Translate old pnotify_ style options.
				for (var i in opts) {
					if (typeof i == "string" && i.match(/^pnotify_/))
						opts[i.replace(/^pnotify_/, "")] = opts[i];
				}
				pnotify.opts = opts;
				// Update the corner class.
				if (opts.cornerclass != old_opts.cornerclass)
					pnotify.container.removeClass("ui-corner-all").addClass(opts.cornerclass);
				// Update the shadow.
				if (opts.shadow != old_opts.shadow) {
					if (opts.shadow)
						pnotify.container.addClass("ui-pnotify-shadow");
					else
						pnotify.container.removeClass("ui-pnotify-shadow");
				}
				// Update the additional classes.
				if (opts.addclass === false)
					pnotify.removeClass(old_opts.addclass);
				else if (opts.addclass !== old_opts.addclass)
					pnotify.removeClass(old_opts.addclass).addClass(opts.addclass);
				// Update the title.
				if (opts.title === false)
					pnotify.title_container.slideUp("fast");
				else if (opts.title !== old_opts.title) {
					if (opts.title_escape)
						pnotify.title_container.text(opts.title).slideDown(200);
					else
						pnotify.title_container.html(opts.title).slideDown(200);
				}
				// Update the text.
				if (opts.text === false) {
					pnotify.text_container.slideUp("fast");
				} else if (opts.text !== old_opts.text) {
					if (opts.text_escape)
						pnotify.text_container.text(opts.text).slideDown(200);
					else
						pnotify.text_container.html(opts.insert_brs ? String(opts.text).replace(/\n/g, "<br />") : opts.text).slideDown(200);
				}
				// Update values for history menu access.
				pnotify.pnotify_history = opts.history;
				pnotify.pnotify_hide = opts.hide;
				// Change the notice type.
				if (opts.type != old_opts.type)
					pnotify.container.removeClass(styles.error+" "+styles.notice+" "+styles.success+" "+styles.info).addClass(opts.type == "error" ? styles.error : (opts.type == "info" ? styles.info : (opts.type == "success" ? styles.success : styles.notice)));
				if (opts.icon !== old_opts.icon || (opts.icon === true && opts.type != old_opts.type)) {
					// Remove any old icon.
					pnotify.container.find("div.ui-pnotify-icon").remove();
					if (opts.icon !== false) {
						// Build the new icon.
						$("<div />", {"class": "ui-pnotify-icon"})
						.append($("<span />", {"class": opts.icon === true ? (opts.type == "error" ? styles.error_icon : (opts.type == "info" ? styles.info_icon : (opts.type == "success" ? styles.success_icon : styles.notice_icon))) : opts.icon}))
						.prependTo(pnotify.container);
					}
				}
				// Update the width.
				if (opts.width !== old_opts.width)
					pnotify.animate({width: opts.width});
				// Update the minimum height.
				if (opts.min_height !== old_opts.min_height)
					pnotify.container.animate({minHeight: opts.min_height});
				// Update the opacity.
				if (opts.opacity !== old_opts.opacity)
					pnotify.fadeTo(opts.animate_speed, opts.opacity);
				// Update the sticker and closer buttons.
				if (!opts.closer || opts.nonblock)
					pnotify.closer.css("display", "none");
				else
					pnotify.closer.css("display", "block");
				if (!opts.sticker || opts.nonblock)
					pnotify.sticker.css("display", "none");
				else
					pnotify.sticker.css("display", "block");
				// Update the sticker icon.
				pnotify.sticker.trigger("pnotify_icon");
				// Update the hover status of the buttons.
				if (opts.sticker_hover)
					pnotify.sticker.css("visibility", "hidden");
				else if (!opts.nonblock)
					pnotify.sticker.css("visibility", "visible");
				if (opts.closer_hover)
					pnotify.closer.css("visibility", "hidden");
				else if (!opts.nonblock)
					pnotify.closer.css("visibility", "visible");
				// Update the timed hiding.
				if (!opts.hide)
					pnotify.pnotify_cancel_remove();
				else if (!old_opts.hide)
					pnotify.pnotify_queue_remove();
				pnotify.pnotify_queue_position();
				return pnotify;
			};

			// Position the notice. dont_skip_hidden causes the notice to
			// position even if it's not visible.
			pnotify.pnotify_position = function(dont_skip_hidden){
				// Get the notice's stack.
				var s = pnotify.opts.stack;
				if (!s) return;
				if (!s.nextpos1)
					s.nextpos1 = s.firstpos1;
				if (!s.nextpos2)
					s.nextpos2 = s.firstpos2;
				if (!s.addpos2)
					s.addpos2 = 0;
				var hidden = pnotify.css("display") == "none";
				// Skip this notice if it's not shown.
				if (!hidden || dont_skip_hidden) {
					var curpos1, curpos2;
					// Store what will need to be animated.
					var animate = {};
					// Calculate the current pos1 value.
					var csspos1;
					switch (s.dir1) {
						case "down":
							csspos1 = "top";
							break;
						case "up":
							csspos1 = "bottom";
							break;
						case "left":
							csspos1 = "right";
							break;
						case "right":
							csspos1 = "left";
							break;
					}
					curpos1 = parseInt(pnotify.css(csspos1));
					if (isNaN(curpos1))
						curpos1 = 0;
					// Remember the first pos1, so the first visible notice goes there.
					if (typeof s.firstpos1 == "undefined" && !hidden) {
						s.firstpos1 = curpos1;
						s.nextpos1 = s.firstpos1;
					}
					// Calculate the current pos2 value.
					var csspos2;
					switch (s.dir2) {
						case "down":
							csspos2 = "top";
							break;
						case "up":
							csspos2 = "bottom";
							break;
						case "left":
							csspos2 = "right";
							break;
						case "right":
							csspos2 = "left";
							break;
					}
					curpos2 = parseInt(pnotify.css(csspos2));
					if (isNaN(curpos2))
						curpos2 = 0;
					// Remember the first pos2, so the first visible notice goes there.
					if (typeof s.firstpos2 == "undefined" && !hidden) {
						s.firstpos2 = curpos2;
						s.nextpos2 = s.firstpos2;
					}
					// Check that it's not beyond the viewport edge.
					if ((s.dir1 == "down" && s.nextpos1 + pnotify.height() > jwindow.height()) ||
						(s.dir1 == "up" && s.nextpos1 + pnotify.height() > jwindow.height()) ||
						(s.dir1 == "left" && s.nextpos1 + pnotify.width() > jwindow.width()) ||
						(s.dir1 == "right" && s.nextpos1 + pnotify.width() > jwindow.width()) ) {
						// If it is, it needs to go back to the first pos1, and over on pos2.
						s.nextpos1 = s.firstpos1;
						s.nextpos2 += s.addpos2 + (typeof s.spacing2 == "undefined" ? 25 : s.spacing2);
						s.addpos2 = 0;
					}
					// Animate if we're moving on dir2.
					if (s.animation && s.nextpos2 < curpos2) {
						switch (s.dir2) {
							case "down":
								animate.top = s.nextpos2+"px";
								break;
							case "up":
								animate.bottom = s.nextpos2+"px";
								break;
							case "left":
								animate.right = s.nextpos2+"px";
								break;
							case "right":
								animate.left = s.nextpos2+"px";
								break;
						}
					} else
						pnotify.css(csspos2, s.nextpos2+"px");
					// Keep track of the widest/tallest notice in the column/row, so we can push the next column/row.
					switch (s.dir2) {
						case "down":
						case "up":
							if (pnotify.outerHeight(true) > s.addpos2)
								s.addpos2 = pnotify.height();
							break;
						case "left":
						case "right":
							if (pnotify.outerWidth(true) > s.addpos2)
								s.addpos2 = pnotify.width();
							break;
					}
					// Move the notice on dir1.
					if (s.nextpos1) {
						// Animate if we're moving toward the first pos.
						if (s.animation && (curpos1 > s.nextpos1 || animate.top || animate.bottom || animate.right || animate.left)) {
							switch (s.dir1) {
								case "down":
									animate.top = s.nextpos1+"px";
									break;
								case "up":
									animate.bottom = s.nextpos1+"px";
									break;
								case "left":
									animate.right = s.nextpos1+"px";
									break;
								case "right":
									animate.left = s.nextpos1+"px";
									break;
							}
						} else
							pnotify.css(csspos1, s.nextpos1+"px");
					}
					// Run the animation.
					if (animate.top || animate.bottom || animate.right || animate.left)
						pnotify.animate(animate, {duration: 500, queue: false});
					// Calculate the next dir1 position.
					switch (s.dir1) {
						case "down":
						case "up":
							s.nextpos1 += pnotify.height() + (typeof s.spacing1 == "undefined" ? 25 : s.spacing1);
							break;
						case "left":
						case "right":
							s.nextpos1 += pnotify.width() + (typeof s.spacing1 == "undefined" ? 25 : s.spacing1);
							break;
					}
				}
			};

			// Queue the positiona all function so it doesn't run repeatedly and
			// use up resources.
			pnotify.pnotify_queue_position = function(milliseconds){
				if (timer)
					clearTimeout(timer);
				if (!milliseconds)
					milliseconds = 10;
				timer = setTimeout($.pnotify_position_all, milliseconds);
			};

			// Display the notice.
			pnotify.pnotify_display = function() {
				// If the notice is not in the DOM, append it.
				if (!pnotify.parent().length)
					pnotify.appendTo(body);
				// Run callback.
				if (opts.before_open) {
					if (opts.before_open(pnotify) === false)
						return;
				}
				// Try to put it in the right position.
				if (opts.stack.push != "top")
					pnotify.pnotify_position(true);
				// First show it, then set its opacity, then hide it.
				if (opts.animation == "fade" || opts.animation.effect_in == "fade") {
					// If it's fading in, it should start at 0.
					pnotify.show().fadeTo(0, 0).hide();
				} else {
					// Or else it should be set to the opacity.
					if (opts.opacity != 1)
						pnotify.show().fadeTo(0, opts.opacity).hide();
				}
				pnotify.animate_in(function(){
					if (opts.after_open)
						opts.after_open(pnotify);

					pnotify.pnotify_queue_position();

					// Now set it to hide.
					if (opts.hide)
						pnotify.pnotify_queue_remove();
				});
			};

			// Remove the notice.
			pnotify.pnotify_remove = function() {
				if (pnotify.timer) {
					window.clearTimeout(pnotify.timer);
					pnotify.timer = null;
				}
				// Run callback.
				if (opts.before_close) {
					if (opts.before_close(pnotify) === false)
						return;
				}
				pnotify.animate_out(function(){
					if (opts.after_close) {
						if (opts.after_close(pnotify) === false)
							return;
					}
					pnotify.pnotify_queue_position();
					// If we're supposed to remove the notice from the DOM, do it.
					if (opts.remove)
						pnotify.detach();
				});
			};

			// Animate the notice in.
			pnotify.animate_in = function(callback){
				// Declare that the notice is animating in. (Or has completed animating in.)
				animating = "in";
				var animation;
				if (typeof opts.animation.effect_in != "undefined")
					animation = opts.animation.effect_in;
				else
					animation = opts.animation;
				if (animation == "none") {
					pnotify.show();
					callback();
				} else if (animation == "show")
					pnotify.show(opts.animate_speed, callback);
				else if (animation == "fade")
					pnotify.show().fadeTo(opts.animate_speed, opts.opacity, callback);
				else if (animation == "slide")
					pnotify.slideDown(opts.animate_speed, callback);
				else if (typeof animation == "function")
					animation("in", callback, pnotify);
				else
					pnotify.show(animation, (typeof opts.animation.options_in == "object" ? opts.animation.options_in : {}), opts.animate_speed, callback);
			};

			// Animate the notice out.
			pnotify.animate_out = function(callback){
				// Declare that the notice is animating out. (Or has completed animating out.)
				animating = "out";
				var animation;
				if (typeof opts.animation.effect_out != "undefined")
					animation = opts.animation.effect_out;
				else
					animation = opts.animation;
				if (animation == "none") {
					pnotify.hide();
					callback();
				} else if (animation == "show")
					pnotify.hide(opts.animate_speed, callback);
				else if (animation == "fade")
					pnotify.fadeOut(opts.animate_speed, callback);
				else if (animation == "slide")
					pnotify.slideUp(opts.animate_speed, callback);
				else if (typeof animation == "function")
					animation("out", callback, pnotify);
				else
					pnotify.hide(animation, (typeof opts.animation.options_out == "object" ? opts.animation.options_out : {}), opts.animate_speed, callback);
			};

			// Cancel any pending removal timer.
			pnotify.pnotify_cancel_remove = function() {
				if (pnotify.timer)
					window.clearTimeout(pnotify.timer);
			};

			// Queue a removal timer.
			pnotify.pnotify_queue_remove = function() {
				// Cancel any current removal timer.
				pnotify.pnotify_cancel_remove();
				pnotify.timer = window.setTimeout(function(){
					pnotify.pnotify_remove();
				}, (isNaN(opts.delay) ? 0 : opts.delay));
			};

			// Provide a button to close the notice.
			pnotify.closer = $("<div />", {
				"class": "ui-pnotify-closer",
				"css": {"cursor": "pointer", "visibility": opts.closer_hover ? "hidden" : "visible"},
				"click": function(){
					pnotify.pnotify_remove();
					pnotify.sticker.css("visibility", "hidden");
					pnotify.closer.css("visibility", "hidden");
				}
			})
			.append($("<span />", {"class": styles.closer}))
			.appendTo(pnotify.container);
			if (!opts.closer || opts.nonblock)
				pnotify.closer.css("display", "none");

			// Provide a button to stick the notice.
			pnotify.sticker = $("<div />", {
				"class": "ui-pnotify-sticker",
				"css": {"cursor": "pointer", "visibility": opts.sticker_hover ? "hidden" : "visible"},
				"click": function(){
					opts.hide = !opts.hide;
					if (opts.hide)
						pnotify.pnotify_queue_remove();
					else
						pnotify.pnotify_cancel_remove();
					$(this).trigger("pnotify_icon");
				}
			})
			.bind("pnotify_icon", function(){
				$(this).children().removeClass(styles.pin_up+" "+styles.pin_down).addClass(opts.hide ? styles.pin_up : styles.pin_down);
			})
			.append($("<span />", {"class": styles.pin_up}))
			.appendTo(pnotify.container);
			if (!opts.sticker || opts.nonblock)
				pnotify.sticker.css("display", "none");

			// Add the appropriate icon.
			if (opts.icon !== false) {
				$("<div />", {"class": "ui-pnotify-icon"})
				.append($("<span />", {"class": opts.icon === true ? (opts.type == "error" ? styles.error_icon : (opts.type == "info" ? styles.info_icon : (opts.type == "success" ? styles.success_icon : styles.notice_icon))) : opts.icon}))
				.prependTo(pnotify.container);
			}

			// Add a title.
			pnotify.title_container = $("<h4 />", {
				"class": "ui-pnotify-title"
			})
			.appendTo(pnotify.container);
			if (opts.title === false)
				pnotify.title_container.hide();
			else if (opts.title_escape)
				pnotify.title_container.text(opts.title);
			else
				pnotify.title_container.html(opts.title);

			// Add text.
			pnotify.text_container = $("<div />", {
				"class": "ui-pnotify-text"
			})
			.appendTo(pnotify.container);
			if (opts.text === false)
				pnotify.text_container.hide();
			else if (opts.text_escape)
				pnotify.text_container.text(opts.text);
			else
				pnotify.text_container.html(opts.insert_brs ? String(opts.text).replace(/\n/g, "<br />") : opts.text);

			// Set width and min height.
			if (typeof opts.width == "string")
				pnotify.css("width", opts.width);
			if (typeof opts.min_height == "string")
				pnotify.container.css("min-height", opts.min_height);

			// The history variable controls whether the notice gets redisplayed
			// by the history pull down.
			pnotify.pnotify_history = opts.history;
			// The hide variable controls whether the history pull down should
			// queue a removal timer.
			pnotify.pnotify_hide = opts.hide;

			// Add the notice to the notice array.
			var notices_data = jwindow.data("pnotify");
			if (notices_data == null || typeof notices_data != "object")
				notices_data = [];
			if (opts.stack.push == "top")
				notices_data = $.merge([pnotify], notices_data);
			else
				notices_data = $.merge(notices_data, [pnotify]);
			jwindow.data("pnotify", notices_data);
			// Now position all the notices if they are to push to the top.
			if (opts.stack.push == "top")
				pnotify.pnotify_queue_position(1);

			// Run callback.
			if (opts.after_init)
				opts.after_init(pnotify);

			if (opts.history) {
				// If there isn't a history pull down, create one.
				var history_menu = jwindow.data("pnotify_history");
				if (typeof history_menu == "undefined") {
					history_menu = $("<div />", {
						"class": "ui-pnotify-history-container "+styles.hi_menu,
						"mouseleave": function(){
							history_menu.animate({top: "-"+history_handle_top+"px"}, {duration: 100, queue: false});
						}
					})
					.append($("<div />", {"class": "ui-pnotify-history-header", "text": "Redisplay"}))
					.append($("<button />", {
							"class": "ui-pnotify-history-all "+styles.hi_btn,
							"text": "All",
							"mouseenter": function(){
								$(this).addClass(styles.hi_btnhov);
							},
							"mouseleave": function(){
								$(this).removeClass(styles.hi_btnhov);
							},
							"click": function(){
								// Display all notices. (Disregarding non-history notices.)
								$.each(notices_data, function(){
									if (this.pnotify_history) {
										if (this.is(":visible")) {
											if (this.pnotify_hide)
												this.pnotify_queue_remove();
										} else if (this.pnotify_display)
											this.pnotify_display();
									}
								});
								return false;
							}
					}))
					.append($("<button />", {
							"class": "ui-pnotify-history-last "+styles.hi_btn,
							"text": "Last",
							"mouseenter": function(){
								$(this).addClass(styles.hi_btnhov);
							},
							"mouseleave": function(){
								$(this).removeClass(styles.hi_btnhov);
							},
							"click": function(){
								// Look up the last history notice, and display it.
								var i = -1;
								var notice;
								do {
									if (i == -1)
										notice = notices_data.slice(i);
									else
										notice = notices_data.slice(i, i+1);
									if (!notice[0])
										break;
									i--;
								} while (!notice[0].pnotify_history || notice[0].is(":visible"));
								if (!notice[0])
									return false;
								if (notice[0].pnotify_display)
									notice[0].pnotify_display();
								return false;
							}
					}))
					.appendTo(body);

					// Make a handle so the user can pull down the history tab.
					var handle = $("<span />", {
						"class": "ui-pnotify-history-pulldown "+styles.hi_hnd,
						"mouseenter": function(){
							history_menu.animate({top: "0"}, {duration: 100, queue: false});
						}
					})
					.appendTo(history_menu);

					// Get the top of the handle.
					history_handle_top = handle.offset().top + 2;
					// Hide the history pull down up to the top of the handle.
					history_menu.css({top: "-"+history_handle_top+"px"});
					// Save the history pull down.
					jwindow.data("pnotify_history", history_menu);
				}
			}

			// Mark the stack so it won't animate the new notice.
			opts.stack.animation = false;

			// Display the notice.
			pnotify.pnotify_display();

			return pnotify;
		}
	});

	// Some useful regexes.
	var re_on = /^on/,
		re_mouse_events = /^(dbl)?click$|^mouse(move|down|up|over|out|enter|leave)$|^contextmenu$/,
		re_ui_events = /^(focus|blur|select|change|reset)$|^key(press|down|up)$/,
		re_html_events = /^(scroll|resize|(un)?load|abort|error)$/;
	// Fire a DOM event.
	var dom_event = function(e, orig_e){
		var event_object;
		e = e.toLowerCase();
		if (document.createEvent && this.dispatchEvent) {
			// FireFox, Opera, Safari, Chrome
			e = e.replace(re_on, '');
			if (e.match(re_mouse_events)) {
				// This allows the click event to fire on the notice. There is
				// probably a much better way to do it.
				$(this).offset();
				event_object = document.createEvent("MouseEvents");
				event_object.initMouseEvent(
					e, orig_e.bubbles, orig_e.cancelable, orig_e.view, orig_e.detail,
					orig_e.screenX, orig_e.screenY, orig_e.clientX, orig_e.clientY,
					orig_e.ctrlKey, orig_e.altKey, orig_e.shiftKey, orig_e.metaKey, orig_e.button, orig_e.relatedTarget
				);
			} else if (e.match(re_ui_events)) {
				event_object = document.createEvent("UIEvents");
				event_object.initUIEvent(e, orig_e.bubbles, orig_e.cancelable, orig_e.view, orig_e.detail);
			} else if (e.match(re_html_events)) {
				event_object = document.createEvent("HTMLEvents");
				event_object.initEvent(e, orig_e.bubbles, orig_e.cancelable);
			}
			if (!event_object) return;
			this.dispatchEvent(event_object);
		} else {
			// Internet Explorer
			if (!e.match(re_on)) e = "on"+e;
			event_object = document.createEventObject(orig_e);
			this.fireEvent(e, event_object);
		}
	};

	$.pnotify.defaults = {
		// The notice's title.
		title: false,
		// Whether to escape the content of the title. (Not allow HTML.)
		title_escape: false,
		// The notice's text.
		text: false,
		// Whether to escape the content of the text. (Not allow HTML.)
		text_escape: false,
		// What styling classes to use. (Can be either jqueryui or bootstrap.)
		styling: "bootstrap",
		// Additional classes to be added to the notice. (For custom styling.)
		addclass: "",
		// Class to be added to the notice for corner styling.
		cornerclass: "",
		// Create a non-blocking notice. It lets the user click elements underneath it.
		nonblock: false,
		// The opacity of the notice (if it's non-blocking) when the mouse is over it.
		nonblock_opacity: .2,
		// Display a pull down menu to redisplay previous notices, and place the notice in the history.
		history: true,
		// Width of the notice.
		width: "300px",
		// Minimum height of the notice. It will expand to fit content.
		min_height: "16px",
		// Type of the notice. "notice", "info", "success", or "error".
		type: "notice",
		// Set icon to true to use the default icon for the selected style/type, false for no icon, or a string for your own icon class.
		icon: true,
		// The animation to use when displaying and hiding the notice. "none", "show", "fade", and "slide" are built in to jQuery. Others require jQuery UI. Use an object with effect_in and effect_out to use different effects.
		animation: "fade",
		// Speed at which the notice animates in and out. "slow", "def" or "normal", "fast" or number of milliseconds.
		animate_speed: "slow",
		// Opacity of the notice.
		opacity: 1,
		// Display a drop shadow.
		shadow: true,
		// Provide a button for the user to manually close the notice.
		closer: true,
		// Only show the closer button on hover.
		closer_hover: true,
		// Provide a button for the user to manually stick the notice.
		sticker: true,
		// Only show the sticker button on hover.
		sticker_hover: true,
		// After a delay, remove the notice.
		hide: true,
		// Delay in milliseconds before the notice is removed.
		delay: 8000,
		// Reset the hide timer if the mouse moves over the notice.
		mouse_reset: true,
		// Remove the notice's elements from the DOM after it is removed.
		remove: true,
		// Change new lines to br tags.
		insert_brs: true,
		// The stack on which the notices will be placed. Also controls the direction the notices stack.
		stack: {"dir1": "down", "dir2": "left", "push": "bottom", "spacing1": 25, "spacing2": 25}
	};
})(jQuery);
; browserify_shim__define__module__export__(typeof jquery_pnotify != "undefined" ? jquery_pnotify : window.jquery_pnotify);

}).call(global, undefined, undefined, undefined, function defineExport(ex) { module.exports = ex; });

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"jquery":false}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdmFncmFudC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3ZhZ3JhbnQvbm9kZV9tb2R1bGVzL2JhY2tib25lLndyZXFyL2xpYi9iYWNrYm9uZS53cmVxci5qcyIsIi92YWdyYW50L25vZGVfbW9kdWxlcy9sZXNzaWZ5L25vZGVfbW9kdWxlcy9jc3NpZnkvYnJvd3Nlci5qcyIsIi92YWdyYW50L25vZGVfbW9kdWxlcy9sZXNzaWZ5L3RyYW5zZm9ybS5qcyIsIi92YWdyYW50L25vZGVfbW9kdWxlcy91bmRlcnNjb3JlL3VuZGVyc2NvcmUuanMiLCIvdmFncmFudC9zcmMvYXBwLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvY29sbGVjdGlvbnMvZGF5c190b19zaGlwcy5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL2NvbGxlY3Rpb25zL3Byb2R1Y3RzLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvZGF0YWJhc2UvaW5kZXhkYi5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL21vZGVscy9kYXlzX3RvX3NoaXAuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC9tb2RlbHMvcHJvZHVjdC5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvcm91dGVzL2hvbWUuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC9zdHlsZXNoZWV0cy9hcHAubGVzcyIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvaG9tZS9sYXlvdXQuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2NvbnRyb2xzLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2Fib3V0LmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5LmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L3RhYnMuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2NvbnRyb2xzLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvbGlzdC9sYXlvdXQuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2xpc3QuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2xpc3RfaXRlbS5jb2ZmZWUiLCIvdmFncmFudC9zcmMvbGliL3ZlbmRvci9qcy9iYWNrYm9uZS1pbmRleGVkZGIuanMiLCIvdmFncmFudC9zcmMvbGliL3ZlbmRvci9qcy9qcXVlcnkucG5vdGlmeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzl6Q0EsSUFBQSw0Q0FBQTs7QUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLFFBQVIsQ0FBSixDQUFBOztBQUFBLFFBQ0EsR0FBVyxPQUFBLENBQVEsVUFBUixDQURYLENBQUE7O0FBQUEsUUFFUSxDQUFDLENBQVQsR0FBYSxDQUZiLENBQUE7O0FBQUEsVUFHQSxHQUFhLE9BQUEsQ0FBUSxxQkFBUixDQUhiLENBQUE7O0FBQUEsTUFJQSxHQUFTLE9BQUEsQ0FBUSwwQkFBUixDQUpULENBQUE7O0FBQUEsTUFLQSxHQUFTLE9BQUEsQ0FBUSw0QkFBUixDQUxULENBQUE7O0FBQUEsR0FTQSxHQUFVLElBQUEsVUFBVSxDQUFDLFdBQVgsQ0FBQSxDQVRWLENBQUE7O0FBQUEsR0FVRyxDQUFDLGNBQUosQ0FBbUIsU0FBQyxPQUFELEdBQUE7QUFDakIsTUFBQSxTQUFBO0FBQUEsRUFBQSxTQUFBLEdBQVksR0FBQSxDQUFBLE1BQVosQ0FBQTtTQUNBLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBakIsQ0FBdUI7QUFBQSxJQUFFLFNBQUEsRUFBVyxJQUFiO0dBQXZCLEVBRmlCO0FBQUEsQ0FBbkIsQ0FWQSxDQUFBOztBQUFBLEdBZUcsQ0FBQyxLQUFKLENBQUEsQ0FmQSxDQUFBOztBQUFBLE1BaUJNLENBQUMsT0FBUCxHQUFpQixHQWpCakIsQ0FBQTs7OztBQ0RFLElBQUEsZUFBQTs7QUFBQSxRQUFBLEdBQVcsT0FBQSxDQUFRLFVBQVIsQ0FBWCxDQUFBOztBQUFBLFFBQ1EsQ0FBQyxTQUFULEdBQXFCLE9BQUEsQ0FBUSxvQkFBUixDQURyQixDQUFBOztBQUFBLE1BRU0sQ0FBQyxRQUFQLEdBQWtCLE9BQUEsQ0FBUSw0QkFBUixDQUZsQixDQUFBOztBQUFBLEtBR0EsR0FBUSxPQUFBLENBQVEsK0JBQVIsQ0FIUixDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBcEIsQ0FFZjtBQUFBLEVBQUEsU0FBQSxFQUFXLGNBQVg7QUFBQSxFQUVBLFFBQUEsRUFBVSxNQUFNLENBQUMsUUFGakI7QUFBQSxFQUlBLEtBQUEsRUFBTyxLQUpQO0NBRmUsQ0FOakIsQ0FBQTs7OztBQ0FBLElBQUEsZUFBQTs7QUFBQSxRQUFBLEdBQVcsT0FBQSxDQUFRLFVBQVIsQ0FBWCxDQUFBOztBQUFBLFFBQ1EsQ0FBQyxTQUFULEdBQXFCLE9BQUEsQ0FBUSxvQkFBUixDQURyQixDQUFBOztBQUFBLE1BRU0sQ0FBQyxRQUFQLEdBQWtCLE9BQUEsQ0FBUSw0QkFBUixDQUZsQixDQUFBOztBQUFBLEtBR0EsR0FBUSxPQUFBLENBQVEsMEJBQVIsQ0FIUixDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBcEIsQ0FFZjtBQUFBLEVBQUEsU0FBQSxFQUFXLFVBQVg7QUFBQSxFQUVBLFFBQUEsRUFBVSxNQUFNLENBQUMsUUFGakI7QUFBQSxFQUlBLEtBQUEsRUFBTyxLQUpQO0NBRmUsQ0FOakIsQ0FBQTs7OztBQ0NBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCO0FBQUEsRUFDZixFQUFBLEVBQUksZ0JBRFc7QUFBQSxFQUVmLFdBQUEsRUFBYSxzQkFGRTtBQUFBLEVBR2YsVUFBQSxFQUFZO0lBQ1Y7QUFBQSxNQUVFLE9BQUEsRUFBUyxDQUZYO0FBQUEsTUFHRSxPQUFBLEVBQVMsU0FBQyxXQUFELEVBQWMsSUFBZCxHQUFBO0FBQ1AsWUFBQSxLQUFBO0FBQUEsUUFBQSxLQUFBLEdBQVEsV0FBVyxDQUFDLEVBQUUsQ0FBQyxpQkFBZixDQUFpQyxPQUFqQyxFQUEwQztBQUFBLFVBQUMsT0FBQSxFQUFTLElBQVY7U0FBMUMsQ0FBUixDQUFBO0FBQUEsUUFDQSxLQUFLLENBQUMsV0FBTixDQUFrQixZQUFsQixFQUFnQyxPQUFoQyxDQURBLENBQUE7ZUFFQSxJQUFBLENBQUEsRUFITztNQUFBLENBSFg7S0FEVSxFQVVWO0FBQUEsTUFDRSxPQUFBLEVBQVMsQ0FEWDtBQUFBLE1BRUUsT0FBQSxFQUFTLFNBQUMsV0FBRCxFQUFjLElBQWQsR0FBQTtBQUNQLFlBQUEsS0FBQTtBQUFBLFFBQUEsS0FBQSxHQUFRLFdBQVcsQ0FBQyxFQUFFLENBQUMsaUJBQWYsQ0FBaUMsVUFBakMsRUFBNkM7QUFBQSxVQUFDLE9BQUEsRUFBUyxJQUFWO1NBQTdDLENBQVIsQ0FBQTtlQUNBLElBQUEsQ0FBQSxFQUZPO01BQUEsQ0FGWDtLQVZVLEVBZ0JWO0FBQUEsTUFDRSxPQUFBLEVBQVMsQ0FEWDtBQUFBLE1BRUUsT0FBQSxFQUFTLFNBQUMsV0FBRCxFQUFjLElBQWQsR0FBQTtBQUNQLFlBQUEsS0FBQTtBQUFBLFFBQUEsS0FBQSxHQUFRLFdBQVcsQ0FBQyxFQUFFLENBQUMsaUJBQWYsQ0FBaUMsY0FBakMsRUFBaUQ7QUFBQSxVQUFDLE9BQUEsRUFBUyxJQUFWO1NBQWpELENBQVIsQ0FBQTtBQUFBLFFBQ0EsS0FBSyxDQUFDLFdBQU4sQ0FBa0IsV0FBbEIsRUFBK0IsTUFBL0IsQ0FEQSxDQUFBO2VBRUEsSUFBQSxDQUFBLEVBSE87TUFBQSxDQUZYO0tBaEJVO0dBSEc7Q0FBakIsQ0FBQTs7OztBQ0RGLElBQUEsUUFBQTs7QUFBQSxRQUFBLEdBQVcsT0FBQSxDQUFRLFVBQVIsQ0FBWCxDQUFBOztBQUFBLFFBQ1EsQ0FBQyxTQUFULEdBQXFCLE9BQUEsQ0FBUSxvQkFBUixDQURyQixDQUFBOztBQUFBLE1BRU0sQ0FBQyxRQUFQLEdBQWtCLE9BQUEsQ0FBUSw0QkFBUixDQUZsQixDQUFBOztBQUFBLE1BSU0sQ0FBQyxPQUFQLEdBQWlCLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBZixDQUVmO0FBQUEsRUFBQSxTQUFBLEVBQVcsY0FBWDtBQUFBLEVBRUEsUUFBQSxFQUFVLE1BQU0sQ0FBQyxRQUZqQjtBQUFBLEVBSUEsUUFBQSxFQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sRUFBUDtBQUFBLElBQ0EsSUFBQSxFQUFNLENBRE47R0FMRjtDQUZlLENBSmpCLENBQUE7Ozs7QUNBQSxJQUFBLHVCQUFBOztBQUFBLFFBQUEsR0FBVyxPQUFBLENBQVEsVUFBUixDQUFYLENBQUE7O0FBQUEsUUFDUSxDQUFDLFNBQVQsR0FBcUIsT0FBQSxDQUFRLG9CQUFSLENBRHJCLENBQUE7O0FBQUEsTUFFTSxDQUFDLFFBQVAsR0FBa0IsT0FBQSxDQUFRLDRCQUFSLENBRmxCLENBQUE7O0FBQUEsQ0FHQSxHQUFJLE9BQUEsQ0FBUSxZQUFSLENBSEosQ0FBQTs7QUFBQSxVQUlBLEdBQWEsT0FBQSxDQUFRLHVCQUFSLENBSmIsQ0FBQTs7QUFBQSxNQU1NLENBQUMsT0FBUCxHQUFpQixRQUFRLENBQUMsS0FBSyxDQUFDLE1BQWYsQ0FFZjtBQUFBLEVBQUEsU0FBQSxFQUFXLFVBQVg7QUFBQSxFQUVBLFFBQUEsRUFBVSxNQUFNLENBQUMsUUFGakI7QUFBQSxFQUlBLFFBQUEsRUFDRTtBQUFBLElBQUEsS0FBQSxFQUFPLEVBQVA7QUFBQSxJQUNBLEtBQUEsRUFBTyxHQURQO0FBQUEsSUFFQSxZQUFBLEVBQWMsRUFGZDtBQUFBLElBR0EsZUFBQSxFQUFpQixJQUhqQjtHQUxGO0NBRmUsQ0FOakIsQ0FBQTs7OztBQ0FBLElBQUEsS0FBQTs7QUFBQSxLQUFBLEdBQVEsT0FBQSxDQUFRLGdCQUFSLENBQVIsQ0FBQTs7QUFBQSxNQUVNLENBQUMsT0FBUCxHQUFxQixJQUFBLEtBQUssQ0FBQyxRQUFOLENBQUEsQ0FGckIsQ0FBQTs7OztBQ0NBLElBQUEsZ0NBQUE7O0FBQUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxxQkFBUixDQUFiLENBQUE7O0FBQUEsUUFDQSxHQUFXLE9BQUEsQ0FBUSw2QkFBUixDQURYLENBQUE7O0FBQUEsVUFFQSxHQUFhLE9BQUEsQ0FBUSwrQkFBUixDQUZiLENBQUE7O0FBQUEsTUFJTSxDQUFDLE9BQVAsR0FBaUIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFyQixDQUVmO0FBQUEsRUFBQSxVQUFBLEVBQVksU0FBQSxHQUFBO0FBQ1YsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLDZCQUFaLENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLGNBQUQsR0FBc0IsSUFBQSxVQUFVLENBQUMsYUFBWCxDQUFBLENBRHRCLENBQUE7V0FFQSxJQUFDLENBQUEsT0FBRCxHQUFXLElBQUMsQ0FBQSxjQUFjLENBQUMsVUFBaEIsQ0FBMkI7QUFBQSxNQUNwQyxJQUFBLEVBQU0sZ0JBRDhCO0tBQTNCLEVBSEQ7RUFBQSxDQUFaO0FBQUEsRUFPQSxNQUFBLEVBQ0U7QUFBQSxJQUFBLEVBQUEsRUFBSSxVQUFKO0FBQUEsSUFDQSxTQUFBLEVBQVcsWUFEWDtHQVJGO0FBQUEsRUFZQSxRQUFBLEVBQVUsU0FBQSxHQUFBO0FBQ1IsUUFBQSxJQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLDJCQUFaLENBQUEsQ0FBQTtBQUFBLElBQ0EsT0FBTyxDQUFDLEdBQVIsQ0FBWSx1QkFBWixDQURBLENBQUE7QUFBQSxJQUVBLElBQUEsR0FBTyxHQUFBLENBQUEsUUFGUCxDQUFBO1dBR0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBZCxDQUFtQixJQUFuQixFQUpRO0VBQUEsQ0FaVjtBQUFBLEVBa0JBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFDVixJQUFJLElBQUEsVUFBQSxDQUFXO0FBQUEsTUFBQSxLQUFBLEVBQU8sY0FBUDtBQUFBLE1BQXVCLElBQUEsRUFBTSxDQUE3QjtLQUFYLENBQTBDLENBQUMsSUFBM0MsQ0FBQSxDQUFKLENBQUE7QUFBQSxJQUNJLElBQUEsVUFBQSxDQUFXO0FBQUEsTUFBQSxLQUFBLEVBQU8sY0FBUDtBQUFBLE1BQXVCLElBQUEsRUFBTSxDQUE3QjtLQUFYLENBQTBDLENBQUMsSUFBM0MsQ0FBQSxDQURKLENBQUE7QUFBQSxJQUVJLElBQUEsVUFBQSxDQUFXO0FBQUEsTUFBQSxLQUFBLEVBQU8sY0FBUDtBQUFBLE1BQXVCLElBQUEsRUFBTSxDQUE3QjtLQUFYLENBQTBDLENBQUMsSUFBM0MsQ0FBQSxDQUZKLENBQUE7V0FHSSxJQUFBLFVBQUEsQ0FBVztBQUFBLE1BQUEsS0FBQSxFQUFPLGlCQUFQO0FBQUEsTUFBMEIsSUFBQSxFQUFNLEVBQWhDO0tBQVgsQ0FBOEMsQ0FBQyxJQUEvQyxDQUFBLEVBSk07RUFBQSxDQWxCWjtDQUZlLENBSmpCLENBQUE7Ozs7QUNEQTs7QUNDQSxJQUFBLCtGQUFBOztBQUFBLFVBQUEsR0FBYSxPQUFBLENBQVEscUJBQVIsQ0FBYixDQUFBOztBQUFBLENBQ0EsR0FBSSxPQUFBLENBQVEsUUFBUixDQURKLENBQUE7O0FBQUEsTUFFQSxHQUFTLE9BQUEsQ0FBUSxRQUFSLENBRlQsQ0FBQTs7QUFBQSxlQUdBLEdBQWtCLE9BQUEsQ0FBUSxnQ0FBUixDQUhsQixDQUFBOztBQUFBLGVBSUEsR0FBa0IsT0FBQSxDQUFRLGdDQUFSLENBSmxCLENBQUE7O0FBQUEsTUFLTSxDQUFDLE1BQVAsR0FBZ0IsT0FBQSxDQUFRLFFBQVIsQ0FMaEIsQ0FBQTs7QUFBQSxTQU1BLEdBQVksT0FBQSxDQUFRLFdBQVIsQ0FOWixDQUFBOztBQUFBLFFBT0EsR0FBVyxPQUFBLENBQVEsbUNBQVIsQ0FQWCxDQUFBOztBQUFBLFFBUUEsR0FBVyxPQUFBLENBQVEsZ0NBQVIsQ0FSWCxDQUFBOztBQUFBLE9BVUEsR0FBVSxPQUFBLENBQVEsZ0JBQVIsQ0FWVixDQUFBOztBQUFBLENBYUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQW5CLEdBQTZCLEtBYjdCLENBQUE7O0FBQUEsQ0FjQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBbkIsR0FBNkIsV0FkN0IsQ0FBQTs7QUFBQSxNQWlCTSxDQUFDLE9BQVAsR0FBaUIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFsQixDQUNmO0FBQUEsRUFBQSxRQUFBLEVBQVUsTUFBTSxDQUFDLFNBQVUsQ0FBQSwyQkFBQSxDQUEzQjtBQUFBLEVBRUEsU0FBQSxFQUFXLHlCQUZYO0FBQUEsRUFJQSxVQUFBLEVBQVksU0FBQSxHQUFBO0FBQ1YsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLHNDQUFaLENBQUEsQ0FBQTtXQUNBLElBQUMsQ0FBQSxrQkFBRCxDQUFBLEVBRlU7RUFBQSxDQUpaO0FBQUEsRUFRQSxPQUFBLEVBQ0U7QUFBQSxJQUFBLE1BQUEsRUFBUSxZQUFSO0FBQUEsSUFDQSxNQUFBLEVBQVEsT0FEUjtHQVRGO0FBQUEsRUFZQSxNQUFBLEVBQ0U7QUFBQSxJQUFBLHNCQUFBLEVBQXlCLGFBQXpCO0FBQUEsSUFDQSxzQkFBQSxFQUF5QixhQUR6QjtHQWJGO0FBQUEsRUFnQkEsV0FBQSxFQUFhLFNBQUMsS0FBRCxHQUFBO0FBQ1gsUUFBQSxLQUFBO0FBQUEsSUFBQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsSUFBZixDQUFvQixTQUFDLENBQUQsRUFBRyxFQUFILEdBQUE7QUFDbEIsVUFBQSxLQUFBO0FBQUE7ZUFDRSxDQUFBLENBQUUsRUFBRixDQUFLLENBQUMsT0FBTixDQUFBLEVBREY7T0FBQSxjQUFBO0FBRVUsUUFBSixjQUFJLENBRlY7T0FEa0I7SUFBQSxDQUFwQixDQUFBLENBQUE7QUFNQTthQUNFLENBQUEsQ0FBRSxLQUFLLENBQUMsTUFBUixDQUFlLENBQUMsT0FBaEIsQ0FBd0IsTUFBeEIsRUFERjtLQUFBLGNBQUE7QUFFVSxNQUFKLGNBQUksQ0FGVjtLQVBXO0VBQUEsQ0FoQmI7QUFBQSxFQTJCQSxXQUFBLEVBQWEsU0FBQyxLQUFELEdBQUE7QUFDWCxRQUFBLEtBQUE7QUFBQTthQUNFLENBQUEsQ0FBRSxLQUFLLENBQUMsTUFBUixDQUFlLENBQUMsT0FBaEIsQ0FBd0IsTUFBeEIsRUFERjtLQUFBLGNBQUE7QUFFVSxNQUFKLGNBQUksQ0FGVjtLQURXO0VBQUEsQ0EzQmI7QUFBQSxFQWdDQSxRQUFBLEVBQVUsU0FBQSxHQUFBO0FBRVIsUUFBQSxtQkFBQTtBQUFBLElBQUEsUUFBQSxHQUFXLEdBQUEsQ0FBQSxRQUFYLENBQUE7QUFBQSxJQUNBLFFBQVEsQ0FBQyxLQUFULENBQUEsQ0FEQSxDQUFBO0FBQUEsSUFFQSxTQUFBLEdBQWdCLElBQUEsZUFBQSxDQUFnQjtBQUFBLE1BQUEsVUFBQSxFQUFZLFFBQVo7S0FBaEIsQ0FGaEIsQ0FBQTtXQUdBLElBQUMsQ0FBQSxJQUFJLENBQUMsSUFBTixDQUFXLFNBQVgsRUFMUTtFQUFBLENBaENWO0FBQUEsRUF3Q0Esa0JBQUEsRUFBb0IsU0FBQSxHQUFBO1dBQ2xCLFFBQVEsQ0FBQyxVQUFULENBQW9CLHdDQUFwQixFQUE4RCxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxPQUFELEdBQUE7QUFDNUQsWUFBQSxTQUFBO0FBQUEsUUFBQSxTQUFBLEdBQWdCLElBQUEsZUFBQSxDQUFnQjtBQUFBLFVBQUEsS0FBQSxFQUFPLE9BQVA7U0FBaEIsQ0FBaEIsQ0FBQTtlQUNBLEtBQUMsQ0FBQSxJQUFJLENBQUMsSUFBTixDQUFXLFNBQVgsRUFGNEQ7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5RCxFQURrQjtFQUFBLENBeENwQjtDQURlLENBakJqQixDQUFBOzs7O0FDREEsSUFBQSxnQ0FBQTs7QUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLHFCQUFSLENBQWIsQ0FBQTs7QUFBQSxRQUNBLEdBQVcsT0FBQSxDQUFRLG1DQUFSLENBRFgsQ0FBQTs7QUFBQSxDQUVBLEdBQUksT0FBQSxDQUFRLFFBQVIsQ0FGSixDQUFBOztBQUFBLE9BR0EsR0FBVSxPQUFBLENBQVEsZ0JBQVIsQ0FIVixDQUFBOztBQUFBLE1BS00sQ0FBQyxPQUFQLEdBQWlCLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBcEIsQ0FDZjtBQUFBLEVBQUEsUUFBQSxFQUFVLE1BQU0sQ0FBQyxTQUFVLENBQUEsc0NBQUEsQ0FBM0I7QUFBQSxFQUVBLFNBQUEsRUFBVyx3QkFGWDtBQUFBLEVBSUEsVUFBQSxFQUFZLFNBQUEsR0FBQTtXQUNWLE9BQU8sQ0FBQyxHQUFSLENBQVksMENBQVosRUFEVTtFQUFBLENBSlo7QUFBQSxFQU9BLE1BQUEsRUFDRTtBQUFBLElBQUEsYUFBQSxFQUFnQixhQUFoQjtBQUFBLElBQ0EsZUFBQSxFQUFrQixTQURsQjtBQUFBLElBRUEsZUFBQSxFQUFrQixVQUZsQjtHQVJGO0FBQUEsRUFZQSxhQUFBLEVBQWUsU0FBQSxHQUFBO0FBQ2IsV0FBTztBQUFBLE1BQ0wsT0FBQSxFQUFTLElBQUMsQ0FBQSxLQURMO0tBQVAsQ0FEYTtFQUFBLENBWmY7QUFBQSxFQWlCQSxPQUFBLEVBQVMsU0FBQyxLQUFELEdBQUE7V0FFUCxRQUFRLENBQUMsT0FBVCxDQUFpQiwwQ0FBakIsRUFGTztFQUFBLENBakJUO0FBQUEsRUFxQkEsUUFBQSxFQUFVLFNBQUMsS0FBRCxHQUFBO1dBQ1IsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFQLENBQWU7QUFBQSxNQUFBLE9BQUEsRUFBUyxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsU0FBQSxHQUFBO0FBQ3RCLFVBQUEsUUFBUSxDQUFDLE9BQVQsQ0FBaUIseUJBQWpCLEVBQTRDLEtBQUMsQ0FBQSxLQUE3QyxDQUFBLENBQUE7QUFBQSxVQUNBLEtBQUMsQ0FBQSxPQUFELENBQUEsQ0FEQSxDQUFBO2lCQUVBLENBQUMsQ0FBQyxPQUFGLENBQVU7QUFBQSxZQUNSLEtBQUEsRUFBTyxpQkFEQztBQUFBLFlBRVIsSUFBQSxFQUFPLFVBQUEsR0FBUyxDQUFBLEtBQUMsQ0FBQSxLQUFLLENBQUMsR0FBUCxDQUFXLE9BQVgsQ0FBQSxDQUFULEdBQThCLGNBRjdCO0FBQUEsWUFHUixJQUFBLEVBQU0sT0FIRTtXQUFWLEVBSHNCO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBVDtLQUFmLEVBRFE7RUFBQSxDQXJCVjtBQUFBLEVBaUNBLFdBQUEsRUFBYSxTQUFDLEtBQUQsR0FBQTtBQUNYLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSwyQ0FBWixDQUFBLENBQUE7QUFHQSxJQUFBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLENBQUEsQ0FBSDtBQUNFLE1BQUEsUUFBUSxDQUFDLE9BQVQsQ0FBaUIsMkJBQWpCLEVBQThDLElBQUMsQ0FBQSxLQUEvQyxDQUFBLENBREY7S0FIQTtBQUFBLElBTUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFQLENBQUEsQ0FOQSxDQUFBO1dBT0EsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQVJXO0VBQUEsQ0FqQ2I7Q0FEZSxDQUxqQixDQUFBOzs7O0FDQUEsSUFBQSwwQkFBQTs7QUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLHFCQUFSLENBQWIsQ0FBQTs7QUFBQSxRQUNBLEdBQVcsT0FBQSxDQUFRLG1DQUFSLENBRFgsQ0FBQTs7QUFBQSxDQUVBLEdBQUksT0FBQSxDQUFRLFFBQVIsQ0FGSixDQUFBOztBQUFBLENBR0EsR0FBSSxPQUFBLENBQVEsWUFBUixDQUhKLENBQUE7O0FBQUEsTUFLTSxDQUFDLE9BQVAsR0FBaUIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFwQixDQUNmO0FBQUEsRUFBQSxRQUFBLEVBQVUsTUFBTSxDQUFDLFNBQVUsQ0FBQSx3Q0FBQSxDQUEzQjtBQUFBLEVBRUEsU0FBQSxFQUFXLHFCQUZYO0FBQUEsRUFJQSxVQUFBLEVBQVksU0FBQSxHQUFBO1dBQ1YsT0FBTyxDQUFDLEdBQVIsQ0FBWSw0Q0FBWixFQURVO0VBQUEsQ0FKWjtBQUFBLEVBT0EsYUFBQSxFQUFlLFNBQUEsR0FBQTtBQUNiLFdBQU87QUFBQSxNQUNMLE9BQUEsRUFBUyxJQUFDLENBQUEsS0FETDtLQUFQLENBRGE7RUFBQSxDQVBmO0FBQUEsRUFZQSxNQUFBLEVBQ0U7QUFBQSxJQUFBLGNBQUEsRUFBZ0IsY0FBaEI7QUFBQSxJQUNBLGlCQUFBLEVBQW1CLGlCQURuQjtHQWJGO0FBQUEsRUFnQkEsWUFBQSxFQUFjLFNBQUMsS0FBRCxHQUFBO0FBQ1osUUFBQSxLQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLDhDQUFaLENBQUEsQ0FBQTtBQUFBLElBQ0EsS0FBQSxHQUFRLENBQUEsQ0FBRSxLQUFLLENBQUMsYUFBUixDQURSLENBQUE7QUFFQSxJQUFBLElBQUcsQ0FBQSxDQUFFLENBQUMsV0FBRixDQUFjLEtBQUssQ0FBQyxJQUFOLENBQVcsaUJBQVgsQ0FBZCxDQUFKO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsS0FBSyxDQUFDLElBQU4sQ0FBVyxpQkFBWCxDQUFYLEVBQTBDLEtBQUssQ0FBQyxHQUFOLENBQUEsQ0FBMUMsRUFERjtLQUhZO0VBQUEsQ0FoQmQ7QUFBQSxFQXNCQSxlQUFBLEVBQWlCLFNBQUMsS0FBRCxHQUFBO0FBQ2YsUUFBQSxRQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLGlEQUFaLENBQUEsQ0FBQTtBQUFBLElBQ0EsUUFBQSxHQUFXLENBQUEsQ0FBRSxLQUFLLENBQUMsYUFBUixDQURYLENBQUE7QUFFQSxJQUFBLElBQUcsQ0FBQSxDQUFFLENBQUMsV0FBRixDQUFjLFFBQVEsQ0FBQyxJQUFULENBQWMsaUJBQWQsQ0FBZCxDQUFKO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsUUFBUSxDQUFDLElBQVQsQ0FBYyxpQkFBZCxDQUFYLEVBQTZDLFFBQVEsQ0FBQyxHQUFULENBQUEsQ0FBN0MsRUFERjtLQUhlO0VBQUEsQ0F0QmpCO0NBRGUsQ0FMakIsQ0FBQTs7OztBQ0FBLElBQUEsdUNBQUE7O0FBQUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxxQkFBUixDQUFiLENBQUE7O0FBQUEsUUFDQSxHQUFXLE9BQUEsQ0FBUSxtQ0FBUixDQURYLENBQUE7O0FBQUEsQ0FFQSxHQUFJLE9BQUEsQ0FBUSxRQUFSLENBRkosQ0FBQTs7QUFBQSxDQUdBLEdBQUksT0FBQSxDQUFRLFlBQVIsQ0FISixDQUFBOztBQUFBLFdBSUEsR0FBYyxPQUFBLENBQVEsMkNBQVIsQ0FKZCxDQUFBOztBQUFBLE1BTU0sQ0FBQyxPQUFQLEdBQWlCLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBcEIsQ0FDZjtBQUFBLEVBQUEsUUFBQSxFQUFVLE1BQU0sQ0FBQyxTQUFVLENBQUEsMkNBQUEsQ0FBM0I7QUFBQSxFQUVBLFNBQUEsRUFBVyxxQkFGWDtBQUFBLEVBSUEsVUFBQSxFQUFZLFNBQUEsR0FBQTtBQUNWLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSwrQ0FBWixDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxvQkFBRCxHQUE0QixJQUFBLFdBQUEsQ0FBQSxDQUQ1QixDQUFBO1dBRUEsSUFBQyxDQUFBLG9CQUFvQixDQUFDLEtBQXRCLENBQTRCO0FBQUEsTUFBQSxPQUFBLEVBQVMsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtBQUNuQyxVQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksc0JBQVosQ0FBQSxDQUFBO2lCQUNBLEtBQUMsQ0FBQSxNQUFELENBQUEsRUFGbUM7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFUO0tBQTVCLEVBSFU7RUFBQSxDQUpaO0FBQUEsRUFZQSxFQUFBLEVBQ0U7QUFBQSxJQUFBLGFBQUEsRUFBZSxlQUFmO0dBYkY7QUFBQSxFQWVBLGFBQUEsRUFBZSxTQUFBLEdBQUE7QUFDYixXQUFPO0FBQUEsTUFDTCxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBREw7QUFBQSxNQUVMLHNCQUFBLEVBQXdCLElBQUMsQ0FBQSxvQkFGcEI7S0FBUCxDQURhO0VBQUEsQ0FmZjtBQUFBLEVBcUJBLE1BQUEsRUFDRTtBQUFBLElBQUEsY0FBQSxFQUFnQixjQUFoQjtBQUFBLElBQ0EsaUJBQUEsRUFBbUIsaUJBRG5CO0FBQUEsSUFFQSxlQUFBLEVBQWlCLGVBRmpCO0dBdEJGO0FBQUEsRUEwQkEsUUFBQSxFQUFVLFNBQUEsR0FBQTtBQUNSLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSw2Q0FBWixDQUFBLENBQUE7QUFBQSxJQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsaUJBQVgsQ0FBWixDQURBLENBQUE7V0FFQSxJQUFDLENBQUEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFoQixDQUFvQixJQUFDLENBQUEsS0FBSyxDQUFDLEdBQVAsQ0FBVyxpQkFBWCxDQUFwQixFQUhRO0VBQUEsQ0ExQlY7QUFBQSxFQWlDQSxZQUFBLEVBQWMsU0FBQyxLQUFELEdBQUE7QUFDWixRQUFBLEtBQUE7QUFBQSxJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksaURBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxLQUFBLEdBQVEsQ0FBQSxDQUFFLEtBQUssQ0FBQyxhQUFSLENBRFIsQ0FBQTtBQUVBLElBQUEsSUFBRyxDQUFBLENBQUUsQ0FBQyxXQUFGLENBQWMsS0FBSyxDQUFDLElBQU4sQ0FBVyxpQkFBWCxDQUFkLENBQUo7YUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQVAsQ0FBVyxLQUFLLENBQUMsSUFBTixDQUFXLGlCQUFYLENBQVgsRUFBMEMsS0FBSyxDQUFDLEdBQU4sQ0FBQSxDQUExQyxFQURGO0tBSFk7RUFBQSxDQWpDZDtBQUFBLEVBdUNBLGVBQUEsRUFBaUIsU0FBQyxLQUFELEdBQUE7QUFDZixRQUFBLFFBQUE7QUFBQSxJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksb0RBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxRQUFBLEdBQVcsQ0FBQSxDQUFFLEtBQUssQ0FBQyxhQUFSLENBRFgsQ0FBQTtBQUVBLElBQUEsSUFBRyxDQUFBLENBQUUsQ0FBQyxXQUFGLENBQWMsUUFBUSxDQUFDLElBQVQsQ0FBYyxpQkFBZCxDQUFkLENBQUo7YUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQVAsQ0FBVyxRQUFRLENBQUMsSUFBVCxDQUFjLGlCQUFkLENBQVgsRUFBNkMsUUFBUSxDQUFDLEdBQVQsQ0FBQSxDQUE3QyxFQURGO0tBSGU7RUFBQSxDQXZDakI7QUFBQSxFQTZDQSxhQUFBLEVBQWUsU0FBQyxLQUFELEdBQUE7QUFDYixRQUFBLE1BQUE7QUFBQSxJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksa0RBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxNQUFBLEdBQVMsQ0FBQSxDQUFFLEtBQUssQ0FBQyxhQUFSLENBRFQsQ0FBQTtBQUVBLElBQUEsSUFBRyxDQUFBLENBQUUsQ0FBQyxXQUFGLENBQWMsTUFBTSxDQUFDLElBQVAsQ0FBWSxpQkFBWixDQUFkLENBQUo7YUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQVAsQ0FBVyxNQUFNLENBQUMsSUFBUCxDQUFZLGlCQUFaLENBQVgsRUFBMkMsTUFBTSxDQUFDLEdBQVAsQ0FBQSxDQUEzQyxFQURGO0tBSGE7RUFBQSxDQTdDZjtDQURlLENBTmpCLENBQUE7Ozs7QUNDQSxJQUFBLDZFQUFBOztBQUFBLFVBQUEsR0FBYSxPQUFBLENBQVEscUJBQVIsQ0FBYixDQUFBOztBQUFBLFlBQ0EsR0FBZSxPQUFBLENBQVEsbUJBQVIsQ0FEZixDQUFBOztBQUFBLGFBRUEsR0FBZ0IsT0FBQSxDQUFRLHFCQUFSLENBRmhCLENBQUE7O0FBQUEsZ0JBR0EsR0FBbUIsT0FBQSxDQUFRLHdCQUFSLENBSG5CLENBQUE7O0FBQUEsUUFJQSxHQUFXLE9BQUEsQ0FBUSxlQUFSLENBSlgsQ0FBQTs7QUFBQSxRQUtBLEdBQVcsT0FBQSxDQUFRLG1DQUFSLENBTFgsQ0FBQTs7QUFBQSxNQU9NLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsTUFBTSxDQUFDLE1BQWxCLENBQ2Y7QUFBQSxFQUFBLFFBQUEsRUFBVSxNQUFNLENBQUMsU0FBVSxDQUFBLG9DQUFBLENBQTNCO0FBQUEsRUFFQSxTQUFBLEVBQVcscUJBRlg7QUFBQSxFQUlBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFDVixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksK0NBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsYUFBRCxHQUFxQixJQUFBLFlBQUEsQ0FBYTtBQUFBLE1BQUEsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFSO0tBQWIsQ0FEckIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFNBQUQsR0FBaUIsSUFBQSxRQUFBLENBQVM7QUFBQSxNQUFBLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBUjtLQUFULENBRmpCLENBQUE7V0FHQSxJQUFDLENBQUEsa0JBQUQsQ0FBQSxFQUpVO0VBQUEsQ0FKWjtBQUFBLEVBVUEsT0FBQSxFQUNFO0FBQUEsSUFBQSxVQUFBLEVBQVksV0FBWjtBQUFBLElBQ0EsTUFBQSxFQUFRLE9BRFI7QUFBQSxJQUVBLE1BQUEsRUFBUSxPQUZSO0dBWEY7QUFBQSxFQWVBLGdCQUFBLEVBQWtCO0FBQUEsSUFDZixRQUFBLEVBQVUsZ0JBREs7QUFBQSxJQUVmLEtBQUEsRUFBTyxhQUZRO0dBZmxCO0FBQUEsRUFzQkEsUUFBQSxFQUFVLFNBQUEsR0FBQTtBQUNSLElBQUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxJQUFWLENBQWUsSUFBQyxDQUFBLGFBQWhCLENBQUEsQ0FBQTtXQUNBLElBQUMsQ0FBQSxJQUFJLENBQUMsSUFBTixDQUFXLElBQUMsQ0FBQSxTQUFaLEVBRlE7RUFBQSxDQXRCVjtBQUFBLEVBMkJBLGtCQUFBLEVBQW9CLFNBQUEsR0FBQTtBQUVsQixJQUFBLFFBQVEsQ0FBQyxVQUFULENBQW9CLDBDQUFwQixFQUFnRSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQzlELEtBQUMsQ0FBQSxLQUFELENBQUEsRUFEOEQ7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFoRSxDQUFBLENBQUE7QUFBQSxJQUtBLFFBQVEsQ0FBQyxVQUFULENBQW9CLCtDQUFwQixFQUFxRSxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO0FBQ25FLFlBQUEsSUFBQTtBQUFBLFFBQUEsSUFBQSxHQUFXLElBQUEsYUFBQSxDQUFjO0FBQUEsVUFBQSxLQUFBLEVBQU8sS0FBQyxDQUFBLEtBQVI7U0FBZCxDQUFYLENBQUE7ZUFDQSxLQUFDLENBQUEsSUFBSSxDQUFDLElBQU4sQ0FBVyxJQUFYLEVBRm1FO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckUsQ0FMQSxDQUFBO1dBWUEsUUFBUSxDQUFDLFVBQVQsQ0FBb0IsNkNBQXBCLEVBQW1FLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLFFBQUQsR0FBQTtBQUNqRSxZQUFBLElBQUE7QUFBQSxRQUFBLElBQUEsR0FBVyxJQUFBLEtBQUMsQ0FBQSxnQkFBaUIsQ0FBQSxRQUFBLENBQWxCLENBQTRCO0FBQUEsVUFBQSxLQUFBLEVBQU8sS0FBQyxDQUFBLEtBQVI7U0FBNUIsQ0FBWCxDQUFBO2VBQ0EsS0FBQyxDQUFBLElBQUksQ0FBQyxJQUFOLENBQVcsSUFBWCxFQUZpRTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5FLEVBZGtCO0VBQUEsQ0EzQnBCO0NBRGUsQ0FQakIsQ0FBQTs7OztBQ0RBLElBQUEsdUJBQUE7O0FBQUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxxQkFBUixDQUFiLENBQUE7O0FBQUEsUUFDQSxHQUFXLE9BQUEsQ0FBUSxtQ0FBUixDQURYLENBQUE7O0FBQUEsQ0FFQSxHQUFJLE9BQUEsQ0FBUSxRQUFSLENBRkosQ0FBQTs7QUFBQSxNQUlNLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsUUFBUSxDQUFDLE1BQXBCLENBQ2Y7QUFBQSxFQUFBLFFBQUEsRUFBVSxNQUFNLENBQUMsU0FBVSxDQUFBLGtDQUFBLENBQTNCO0FBQUEsRUFFQSxTQUFBLEVBQVcsb0JBRlg7QUFBQSxFQUlBLFVBQUEsRUFBWSxTQUFBLEdBQUE7V0FDVixPQUFPLENBQUMsR0FBUixDQUFZLHNDQUFaLEVBRFU7RUFBQSxDQUpaO0FBQUEsRUFPQSxhQUFBLEVBQWUsU0FBQSxHQUFBO0FBQ2IsV0FBTztBQUFBLE1BQ0wsT0FBQSxFQUFTLElBQUMsQ0FBQSxLQURMO0tBQVAsQ0FEYTtFQUFBLENBUGY7QUFBQSxFQVlBLEVBQUEsRUFDRTtBQUFBLElBQUEsSUFBQSxFQUFNLGNBQU47R0FiRjtBQUFBLEVBZUEsTUFBQSxFQUNFO0FBQUEsSUFBQSxvQkFBQSxFQUF1QixZQUF2QjtHQWhCRjtBQUFBLEVBa0JBLFFBQUEsRUFBVSxTQUFBLEdBQUE7V0FFUixRQUFRLENBQUMsT0FBVCxDQUFpQiwrQ0FBakIsRUFGUTtFQUFBLENBbEJWO0FBQUEsRUF1QkEsVUFBQSxFQUFZLFNBQUMsS0FBRCxHQUFBO0FBQ1YsUUFBQSxhQUFBO0FBQUEsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLHNDQUFaLENBQUEsQ0FBQTtBQUFBLElBRUEsR0FBQSxHQUFNLENBQUEsQ0FBRSxLQUFLLENBQUMsYUFBUixDQUZOLENBQUE7QUFBQSxJQUdBLFFBQUEsR0FBVyxHQUFHLENBQUMsSUFBSixDQUFTLFVBQVQsQ0FIWCxDQUFBO0FBQUEsSUFJQSxPQUFPLENBQUMsR0FBUixDQUFZLFFBQVosQ0FKQSxDQUFBO0FBQUEsSUFLQSxRQUFRLENBQUMsT0FBVCxDQUFpQiw2Q0FBakIsRUFBZ0UsR0FBRyxDQUFDLElBQUosQ0FBUyxVQUFULENBQWhFLENBTEEsQ0FBQTtBQUFBLElBUUEsSUFBQyxDQUFBLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVCxDQUFxQixRQUFyQixDQVJBLENBQUE7V0FTQSxHQUFHLENBQUMsUUFBSixDQUFhLFFBQWIsRUFWVTtFQUFBLENBdkJaO0NBRGUsQ0FKakIsQ0FBQTs7OztBQ0FBLElBQUEsZ0NBQUE7O0FBQUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxxQkFBUixDQUFiLENBQUE7O0FBQUEsQ0FDQSxHQUFJLE9BQUEsQ0FBUSxRQUFSLENBREosQ0FBQTs7QUFBQSxPQUVBLEdBQVUsT0FBQSxDQUFRLGdDQUFSLENBRlYsQ0FBQTs7QUFBQSxRQUdBLEdBQVcsT0FBQSxDQUFRLG1DQUFSLENBSFgsQ0FBQTs7QUFBQSxNQUtNLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsUUFBUSxDQUFDLE1BQXBCLENBQ2Y7QUFBQSxFQUFBLFFBQUEsRUFBVSxNQUFNLENBQUMsU0FBVSxDQUFBLHNDQUFBLENBQTNCO0FBQUEsRUFFQSxTQUFBLEVBQVcsd0JBRlg7QUFBQSxFQUlBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFDVixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksMENBQVosQ0FBQSxDQUFBO1dBQ0EsSUFBQyxDQUFBLFdBQUQsR0FBZSxHQUZMO0VBQUEsQ0FKWjtBQUFBLEVBUUEsTUFBQSxFQUNFO0FBQUEsSUFBQSxZQUFBLEVBQWUsWUFBZjtHQVRGO0FBQUEsRUFXQSxhQUFBLEVBQWUsU0FBQSxHQUFBO0FBQ2IsV0FBTztBQUFBLE1BQ0wsWUFBQSxFQUFjLElBQUMsQ0FBQSxVQURWO0FBQUEsTUFFTCxhQUFBLEVBQWUsSUFBQyxDQUFBLFdBRlg7S0FBUCxDQURhO0VBQUEsQ0FYZjtBQUFBLEVBaUJBLFVBQUEsRUFBWSxTQUFDLEtBQUQsR0FBQTtBQUNWLFFBQUEsT0FBQTtBQUFBLElBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSwwQ0FBWixDQUFBLENBQUE7QUFBQSxJQUNBLEtBQUssQ0FBQyxlQUFOLENBQUEsQ0FEQSxDQUFBO0FBQUEsSUFFQSxPQUFBLEdBQWMsSUFBQSxPQUFBLENBQUEsQ0FGZCxDQUFBO1dBSUEsUUFBUSxDQUFDLE9BQVQsQ0FBaUIsd0NBQWpCLEVBQTJELE9BQTNELEVBTFU7RUFBQSxDQWpCWjtDQURlLENBTGpCLENBQUE7Ozs7QUNBQSxJQUFBLHFDQUFBOztBQUFBLFVBQUEsR0FBYSxPQUFBLENBQVEscUJBQVIsQ0FBYixDQUFBOztBQUFBLENBQ0EsR0FBSSxPQUFBLENBQVEsUUFBUixDQURKLENBQUE7O0FBQUEsWUFFQSxHQUFlLE9BQUEsQ0FBUSxtQkFBUixDQUZmLENBQUE7O0FBQUEsUUFHQSxHQUFXLE9BQUEsQ0FBUSxlQUFSLENBSFgsQ0FBQTs7QUFBQSxNQUtNLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsTUFBTSxDQUFDLE1BQWxCLENBQ2Y7QUFBQSxFQUFBLFFBQUEsRUFBVSxNQUFNLENBQUMsU0FBVSxDQUFBLG9DQUFBLENBQTNCO0FBQUEsRUFFQSxTQUFBLEVBQVcsc0JBRlg7QUFBQSxFQUlBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFDVixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksd0NBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsYUFBRCxHQUFxQixJQUFBLFlBQUEsQ0FBYTtBQUFBLE1BQUEsVUFBQSxFQUFZLElBQUMsQ0FBQSxVQUFiO0tBQWIsQ0FEckIsQ0FBQTtXQUVBLElBQUMsQ0FBQSxTQUFELEdBQWlCLElBQUEsUUFBQSxDQUFTO0FBQUEsTUFBQSxVQUFBLEVBQVksSUFBQyxDQUFBLFVBQWI7S0FBVCxFQUhQO0VBQUEsQ0FKWjtBQUFBLEVBUUEsT0FBQSxFQUNFO0FBQUEsSUFBQSxVQUFBLEVBQVksV0FBWjtBQUFBLElBQ0EsTUFBQSxFQUFRLE9BRFI7R0FURjtBQUFBLEVBWUEsUUFBQSxFQUFVLFNBQUEsR0FBQTtBQUNSLElBQUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxJQUFWLENBQWUsSUFBQyxDQUFBLGFBQWhCLENBQUEsQ0FBQTtXQUNBLElBQUMsQ0FBQSxJQUFJLENBQUMsSUFBTixDQUFXLElBQUMsQ0FBQSxTQUFaLEVBRlE7RUFBQSxDQVpWO0NBRGUsQ0FMakIsQ0FBQTs7OztBQ0FBLElBQUEscUNBQUE7O0FBQUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxxQkFBUixDQUFiLENBQUE7O0FBQUEsQ0FDQSxHQUFJLE9BQUEsQ0FBUSxRQUFSLENBREosQ0FBQTs7QUFBQSxZQUVBLEdBQWUsT0FBQSxDQUFRLG9CQUFSLENBRmYsQ0FBQTs7QUFBQSxRQUdBLEdBQVcsT0FBQSxDQUFRLG1DQUFSLENBSFgsQ0FBQTs7QUFBQSxNQUtNLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsYUFBYSxDQUFDLE1BQXpCLENBQ2Y7QUFBQSxFQUFBLFFBQUEsRUFBVSxNQUFNLENBQUMsU0FBVSxDQUFBLGtDQUFBLENBQTNCO0FBQUEsRUFFQSxTQUFBLEVBQVcsb0JBRlg7QUFBQSxFQUlBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFDVixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksc0NBQVosQ0FBQSxDQUFBO1dBQ0EsSUFBQyxDQUFBLGtCQUFELENBQUEsRUFGVTtFQUFBLENBSlo7QUFBQSxFQVFBLGlCQUFBLEVBQW1CLHNCQVJuQjtBQUFBLEVBVUEsUUFBQSxFQUFVLFlBVlY7QUFBQSxFQWFBLGtCQUFBLEVBQW9CLFNBQUEsR0FBQTtBQUVsQixJQUFBLFFBQVEsQ0FBQyxVQUFULENBQW9CLDJCQUFwQixFQUFpRCxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxPQUFELEdBQUE7ZUFDL0MsS0FBQyxDQUFBLFVBQVUsQ0FBQyxHQUFaLENBQWdCLE9BQWhCLEVBRCtDO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBakQsQ0FBQSxDQUFBO1dBS0EsUUFBUSxDQUFDLFVBQVQsQ0FBb0IsaURBQXBCLEVBQXVFLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFBLEdBQUE7QUFDckUsWUFBQSxJQUFBO0FBQUEsUUFBQSxJQUFBLEdBQVcsSUFBQSxlQUFBLENBQWdCO0FBQUEsVUFBQSxLQUFBLEVBQU8sS0FBQyxDQUFBLEtBQVI7U0FBaEIsQ0FBWCxDQUFBO2VBQ0EsS0FBQyxDQUFBLElBQUksQ0FBQyxJQUFOLENBQVcsSUFBWCxFQUZxRTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZFLEVBUGtCO0VBQUEsQ0FicEI7Q0FEZSxDQUxqQixDQUFBOzs7O0FDQUEsSUFBQSxvQkFBQTs7QUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLHFCQUFSLENBQWIsQ0FBQTs7QUFBQSxRQUNBLEdBQVcsT0FBQSxDQUFRLG1DQUFSLENBRFgsQ0FBQTs7QUFBQSxNQUlNLENBQUMsT0FBUCxHQUFpQixVQUFVLENBQUMsUUFBUSxDQUFDLE1BQXBCLENBQ2Y7QUFBQSxFQUFBLFFBQUEsRUFBVSxNQUFNLENBQUMsU0FBVSxDQUFBLHVDQUFBLENBQTNCO0FBQUEsRUFFQSxTQUFBLEVBQVcseUJBRlg7QUFBQSxFQUlBLE9BQUEsRUFBUyxJQUpUO0FBQUEsRUFNQSxVQUFBLEVBQVksU0FBQSxHQUFBO0FBQ1YsSUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLDJDQUFaLENBQUEsQ0FBQTtXQUNBLElBQUMsQ0FBQSxXQUFELEdBQWUsR0FGTDtFQUFBLENBTlo7QUFBQSxFQVVBLGFBQUEsRUFBZSxTQUFBLEdBQUE7QUFDYixXQUFPO0FBQUEsTUFDTCxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBREw7S0FBUCxDQURhO0VBQUEsQ0FWZjtBQUFBLEVBZUEsV0FBQSxFQUNFO0FBQUEsSUFBQSxNQUFBLEVBQVMsUUFBVDtHQWhCRjtBQUFBLEVBa0JBLE1BQUEsRUFDRTtBQUFBLElBQUEsa0JBQUEsRUFBb0IsUUFBcEI7R0FuQkY7QUFBQSxFQXFCQSxNQUFBLEVBQVEsU0FBQyxLQUFELEdBQUE7QUFDTixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksdUNBQVosQ0FBQSxDQUFBO0FBQUEsSUFDQSxLQUFLLENBQUMsZUFBTixDQUFBLENBREEsQ0FBQTtXQUdBLFFBQVEsQ0FBQyxPQUFULENBQWlCLHdDQUFqQixFQUEyRCxJQUFDLENBQUEsS0FBNUQsRUFKTTtFQUFBLENBckJSO0NBRGUsQ0FKakIsQ0FBQTs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIEJhY2tib25lLldyZXFyIChCYWNrYm9uZS5NYXJpb25ldHRlKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdjEuMi4xXG4vL1xuLy8gQ29weXJpZ2h0IChjKTIwMTQgRGVyaWNrIEJhaWxleSwgTXV0ZWQgU29sdXRpb25zLCBMTEMuXG4vLyBEaXN0cmlidXRlZCB1bmRlciBNSVQgbGljZW5zZVxuLy9cbi8vIGh0dHA6Ly9naXRodWIuY29tL21hcmlvbmV0dGVqcy9iYWNrYm9uZS53cmVxclxuXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbJ2V4cG9ydHMnLCAnYmFja2JvbmUnLCAndW5kZXJzY29yZSddLCBmdW5jdGlvbihleHBvcnRzLCBCYWNrYm9uZSwgXykge1xuICAgICAgZmFjdG9yeShleHBvcnRzLCBCYWNrYm9uZSwgXyk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcbiAgICB2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcbiAgICBmYWN0b3J5KGV4cG9ydHMsIEJhY2tib25lLCBfKTtcbiAgfSBlbHNlIHtcbiAgICBmYWN0b3J5KHt9LCByb290LkJhY2tib25lLCByb290Ll8pO1xuICB9XG5cbn0odGhpcywgZnVuY3Rpb24oV3JlcXIsIEJhY2tib25lLCBfKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIEJhY2tib25lLldyZXFyID0gV3JlcXI7XG5cbiAgLy8gSGFuZGxlcnNcbi8vIC0tLS0tLS0tXG4vLyBBIHJlZ2lzdHJ5IG9mIGZ1bmN0aW9ucyB0byBjYWxsLCBnaXZlbiBhIG5hbWVcblxuV3JlcXIuSGFuZGxlcnMgPSAoZnVuY3Rpb24oQmFja2JvbmUsIF8pe1xuICBcInVzZSBzdHJpY3RcIjtcbiAgXG4gIC8vIENvbnN0cnVjdG9yXG4gIC8vIC0tLS0tLS0tLS0tXG5cbiAgdmFyIEhhbmRsZXJzID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLl93cmVxckhhbmRsZXJzID0ge307XG4gICAgXG4gICAgaWYgKF8uaXNGdW5jdGlvbih0aGlzLmluaXRpYWxpemUpKXtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG4gIH07XG5cbiAgSGFuZGxlcnMuZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kO1xuXG4gIC8vIEluc3RhbmNlIE1lbWJlcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIF8uZXh0ZW5kKEhhbmRsZXJzLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzLCB7XG5cbiAgICAvLyBBZGQgbXVsdGlwbGUgaGFuZGxlcnMgdXNpbmcgYW4gb2JqZWN0IGxpdGVyYWwgY29uZmlndXJhdGlvblxuICAgIHNldEhhbmRsZXJzOiBmdW5jdGlvbihoYW5kbGVycyl7XG4gICAgICBfLmVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uKGhhbmRsZXIsIG5hbWUpe1xuICAgICAgICB2YXIgY29udGV4dCA9IG51bGw7XG5cbiAgICAgICAgaWYgKF8uaXNPYmplY3QoaGFuZGxlcikgJiYgIV8uaXNGdW5jdGlvbihoYW5kbGVyKSl7XG4gICAgICAgICAgY29udGV4dCA9IGhhbmRsZXIuY29udGV4dDtcbiAgICAgICAgICBoYW5kbGVyID0gaGFuZGxlci5jYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0SGFuZGxlcihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvLyBBZGQgYSBoYW5kbGVyIGZvciB0aGUgZ2l2ZW4gbmFtZSwgd2l0aCBhblxuICAgIC8vIG9wdGlvbmFsIGNvbnRleHQgdG8gcnVuIHRoZSBoYW5kbGVyIHdpdGhpblxuICAgIHNldEhhbmRsZXI6IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpe1xuICAgICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgY2FsbGJhY2s6IGhhbmRsZXIsXG4gICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX3dyZXFySGFuZGxlcnNbbmFtZV0gPSBjb25maWc7XG5cbiAgICAgIHRoaXMudHJpZ2dlcihcImhhbmRsZXI6YWRkXCIsIG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICAvLyBEZXRlcm1pbmUgd2hldGhlciBvciBub3QgYSBoYW5kbGVyIGlzIHJlZ2lzdGVyZWRcbiAgICBoYXNIYW5kbGVyOiBmdW5jdGlvbihuYW1lKXtcbiAgICAgIHJldHVybiAhISB0aGlzLl93cmVxckhhbmRsZXJzW25hbWVdO1xuICAgIH0sXG5cbiAgICAvLyBHZXQgdGhlIGN1cnJlbnRseSByZWdpc3RlcmVkIGhhbmRsZXIgZm9yXG4gICAgLy8gdGhlIHNwZWNpZmllZCBuYW1lLiBUaHJvd3MgYW4gZXhjZXB0aW9uIGlmXG4gICAgLy8gbm8gaGFuZGxlciBpcyBmb3VuZC5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbihuYW1lKXtcbiAgICAgIHZhciBjb25maWcgPSB0aGlzLl93cmVxckhhbmRsZXJzW25hbWVdO1xuXG4gICAgICBpZiAoIWNvbmZpZyl7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBjb25maWcuY2FsbGJhY2suYXBwbHkoY29uZmlnLmNvbnRleHQsIGFyZ3MpO1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgLy8gUmVtb3ZlIGEgaGFuZGxlciBmb3IgdGhlIHNwZWNpZmllZCBuYW1lXG4gICAgcmVtb3ZlSGFuZGxlcjogZnVuY3Rpb24obmFtZSl7XG4gICAgICBkZWxldGUgdGhpcy5fd3JlcXJIYW5kbGVyc1tuYW1lXTtcbiAgICB9LFxuXG4gICAgLy8gUmVtb3ZlIGFsbCBoYW5kbGVycyBmcm9tIHRoaXMgcmVnaXN0cnlcbiAgICByZW1vdmVBbGxIYW5kbGVyczogZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMuX3dyZXFySGFuZGxlcnMgPSB7fTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBIYW5kbGVycztcbn0pKEJhY2tib25lLCBfKTtcblxuICAvLyBXcmVxci5Db21tYW5kU3RvcmFnZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBTdG9yZSBhbmQgcmV0cmlldmUgY29tbWFuZHMgZm9yIGV4ZWN1dGlvbi5cbldyZXFyLkNvbW1hbmRTdG9yYWdlID0gKGZ1bmN0aW9uKCl7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIENvbnN0cnVjdG9yIGZ1bmN0aW9uXG4gIHZhciBDb21tYW5kU3RvcmFnZSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5fY29tbWFuZHMgPSB7fTtcblxuICAgIGlmIChfLmlzRnVuY3Rpb24odGhpcy5pbml0aWFsaXplKSl7XG4gICAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgfVxuICB9O1xuXG4gIC8vIEluc3RhbmNlIG1ldGhvZHNcbiAgXy5leHRlbmQoQ29tbWFuZFN0b3JhZ2UucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAgIC8vIEdldCBhbiBvYmplY3QgbGl0ZXJhbCBieSBjb21tYW5kIG5hbWUsIHRoYXQgY29udGFpbnNcbiAgICAvLyB0aGUgYGNvbW1hbmROYW1lYCBhbmQgdGhlIGBpbnN0YW5jZXNgIG9mIGFsbCBjb21tYW5kc1xuICAgIC8vIHJlcHJlc2VudGVkIGFzIGFuIGFycmF5IG9mIGFyZ3VtZW50cyB0byBwcm9jZXNzXG4gICAgZ2V0Q29tbWFuZHM6IGZ1bmN0aW9uKGNvbW1hbmROYW1lKXtcbiAgICAgIHZhciBjb21tYW5kcyA9IHRoaXMuX2NvbW1hbmRzW2NvbW1hbmROYW1lXTtcblxuICAgICAgLy8gd2UgZG9uJ3QgaGF2ZSBpdCwgc28gYWRkIGl0XG4gICAgICBpZiAoIWNvbW1hbmRzKXtcblxuICAgICAgICAvLyBidWlsZCB0aGUgY29uZmlndXJhdGlvblxuICAgICAgICBjb21tYW5kcyA9IHtcbiAgICAgICAgICBjb21tYW5kOiBjb21tYW5kTmFtZSwgXG4gICAgICAgICAgaW5zdGFuY2VzOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHN0b3JlIGl0XG4gICAgICAgIHRoaXMuX2NvbW1hbmRzW2NvbW1hbmROYW1lXSA9IGNvbW1hbmRzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29tbWFuZHM7XG4gICAgfSxcblxuICAgIC8vIEFkZCBhIGNvbW1hbmQgYnkgbmFtZSwgdG8gdGhlIHN0b3JhZ2UgYW5kIHN0b3JlIHRoZVxuICAgIC8vIGFyZ3MgZm9yIHRoZSBjb21tYW5kXG4gICAgYWRkQ29tbWFuZDogZnVuY3Rpb24oY29tbWFuZE5hbWUsIGFyZ3Mpe1xuICAgICAgdmFyIGNvbW1hbmQgPSB0aGlzLmdldENvbW1hbmRzKGNvbW1hbmROYW1lKTtcbiAgICAgIGNvbW1hbmQuaW5zdGFuY2VzLnB1c2goYXJncyk7XG4gICAgfSxcblxuICAgIC8vIENsZWFyIGFsbCBjb21tYW5kcyBmb3IgdGhlIGdpdmVuIGBjb21tYW5kTmFtZWBcbiAgICBjbGVhckNvbW1hbmRzOiBmdW5jdGlvbihjb21tYW5kTmFtZSl7XG4gICAgICB2YXIgY29tbWFuZCA9IHRoaXMuZ2V0Q29tbWFuZHMoY29tbWFuZE5hbWUpO1xuICAgICAgY29tbWFuZC5pbnN0YW5jZXMgPSBbXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBDb21tYW5kU3RvcmFnZTtcbn0pKCk7XG5cbiAgLy8gV3JlcXIuQ29tbWFuZHNcbi8vIC0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gQSBzaW1wbGUgY29tbWFuZCBwYXR0ZXJuIGltcGxlbWVudGF0aW9uLiBSZWdpc3RlciBhIGNvbW1hbmRcbi8vIGhhbmRsZXIgYW5kIGV4ZWN1dGUgaXQuXG5XcmVxci5Db21tYW5kcyA9IChmdW5jdGlvbihXcmVxcil7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHJldHVybiBXcmVxci5IYW5kbGVycy5leHRlbmQoe1xuICAgIC8vIGRlZmF1bHQgc3RvcmFnZSB0eXBlXG4gICAgc3RvcmFnZVR5cGU6IFdyZXFyLkNvbW1hbmRTdG9yYWdlLFxuXG4gICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgdGhpcy5faW5pdGlhbGl6ZVN0b3JhZ2UodGhpcy5vcHRpb25zKTtcbiAgICAgIHRoaXMub24oXCJoYW5kbGVyOmFkZFwiLCB0aGlzLl9leGVjdXRlQ29tbWFuZHMsIHRoaXMpO1xuXG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBXcmVxci5IYW5kbGVycy5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSxcblxuICAgIC8vIEV4ZWN1dGUgYSBuYW1lZCBjb21tYW5kIHdpdGggdGhlIHN1cHBsaWVkIGFyZ3NcbiAgICBleGVjdXRlOiBmdW5jdGlvbihuYW1lLCBhcmdzKXtcbiAgICAgIG5hbWUgPSBhcmd1bWVudHNbMF07XG4gICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgICAgaWYgKHRoaXMuaGFzSGFuZGxlcihuYW1lKSl7XG4gICAgICAgIHRoaXMuZ2V0SGFuZGxlcihuYW1lKS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc3RvcmFnZS5hZGRDb21tYW5kKG5hbWUsIGFyZ3MpO1xuICAgICAgfVxuXG4gICAgfSxcblxuICAgIC8vIEludGVybmFsIG1ldGhvZCB0byBoYW5kbGUgYnVsayBleGVjdXRpb24gb2Ygc3RvcmVkIGNvbW1hbmRzXG4gICAgX2V4ZWN1dGVDb21tYW5kczogZnVuY3Rpb24obmFtZSwgaGFuZGxlciwgY29udGV4dCl7XG4gICAgICB2YXIgY29tbWFuZCA9IHRoaXMuc3RvcmFnZS5nZXRDb21tYW5kcyhuYW1lKTtcblxuICAgICAgLy8gbG9vcCB0aHJvdWdoIGFuZCBleGVjdXRlIGFsbCB0aGUgc3RvcmVkIGNvbW1hbmQgaW5zdGFuY2VzXG4gICAgICBfLmVhY2goY29tbWFuZC5pbnN0YW5jZXMsIGZ1bmN0aW9uKGFyZ3Mpe1xuICAgICAgICBoYW5kbGVyLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RvcmFnZS5jbGVhckNvbW1hbmRzKG5hbWUpO1xuICAgIH0sXG5cbiAgICAvLyBJbnRlcm5hbCBtZXRob2QgdG8gaW5pdGlhbGl6ZSBzdG9yYWdlIGVpdGhlciBmcm9tIHRoZSB0eXBlJ3NcbiAgICAvLyBgc3RvcmFnZVR5cGVgIG9yIHRoZSBpbnN0YW5jZSBgb3B0aW9ucy5zdG9yYWdlVHlwZWAuXG4gICAgX2luaXRpYWxpemVTdG9yYWdlOiBmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgIHZhciBzdG9yYWdlO1xuXG4gICAgICB2YXIgU3RvcmFnZVR5cGUgPSBvcHRpb25zLnN0b3JhZ2VUeXBlIHx8IHRoaXMuc3RvcmFnZVR5cGU7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKFN0b3JhZ2VUeXBlKSl7XG4gICAgICAgIHN0b3JhZ2UgPSBuZXcgU3RvcmFnZVR5cGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0b3JhZ2UgPSBTdG9yYWdlVHlwZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdG9yYWdlID0gc3RvcmFnZTtcbiAgICB9XG4gIH0pO1xuXG59KShXcmVxcik7XG5cbiAgLy8gV3JlcXIuUmVxdWVzdFJlc3BvbnNlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBBIHNpbXBsZSByZXF1ZXN0L3Jlc3BvbnNlIGltcGxlbWVudGF0aW9uLiBSZWdpc3RlciBhXG4vLyByZXF1ZXN0IGhhbmRsZXIsIGFuZCByZXR1cm4gYSByZXNwb25zZSBmcm9tIGl0XG5XcmVxci5SZXF1ZXN0UmVzcG9uc2UgPSAoZnVuY3Rpb24oV3JlcXIpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICByZXR1cm4gV3JlcXIuSGFuZGxlcnMuZXh0ZW5kKHtcbiAgICByZXF1ZXN0OiBmdW5jdGlvbigpe1xuICAgICAgdmFyIG5hbWUgPSBhcmd1bWVudHNbMF07XG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBpZiAodGhpcy5oYXNIYW5kbGVyKG5hbWUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEhhbmRsZXIobmFtZSkuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxufSkoV3JlcXIpO1xuXG4gIC8vIEV2ZW50IEFnZ3JlZ2F0b3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS1cbi8vIEEgcHViLXN1YiBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byBkZWNvdXBsZSB2YXJpb3VzIHBhcnRzXG4vLyBvZiBhbiBhcHBsaWNhdGlvbiB0aHJvdWdoIGV2ZW50LWRyaXZlbiBhcmNoaXRlY3R1cmUuXG5cbldyZXFyLkV2ZW50QWdncmVnYXRvciA9IChmdW5jdGlvbihCYWNrYm9uZSwgXyl7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgRUEgPSBmdW5jdGlvbigpe307XG5cbiAgLy8gQ29weSB0aGUgYGV4dGVuZGAgZnVuY3Rpb24gdXNlZCBieSBCYWNrYm9uZSdzIGNsYXNzZXNcbiAgRUEuZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kO1xuXG4gIC8vIENvcHkgdGhlIGJhc2ljIEJhY2tib25lLkV2ZW50cyBvbiB0byB0aGUgZXZlbnQgYWdncmVnYXRvclxuICBfLmV4dGVuZChFQS5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cyk7XG5cbiAgcmV0dXJuIEVBO1xufSkoQmFja2JvbmUsIF8pO1xuXG4gIC8vIFdyZXFyLkNoYW5uZWxcbi8vIC0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gQW4gb2JqZWN0IHRoYXQgd3JhcHMgdGhlIHRocmVlIG1lc3NhZ2luZyBzeXN0ZW1zOlxuLy8gRXZlbnRBZ2dyZWdhdG9yLCBSZXF1ZXN0UmVzcG9uc2UsIENvbW1hbmRzXG5XcmVxci5DaGFubmVsID0gKGZ1bmN0aW9uKFdyZXFyKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIENoYW5uZWwgPSBmdW5jdGlvbihjaGFubmVsTmFtZSkge1xuICAgIHRoaXMudmVudCAgICAgICAgPSBuZXcgQmFja2JvbmUuV3JlcXIuRXZlbnRBZ2dyZWdhdG9yKCk7XG4gICAgdGhpcy5yZXFyZXMgICAgICA9IG5ldyBCYWNrYm9uZS5XcmVxci5SZXF1ZXN0UmVzcG9uc2UoKTtcbiAgICB0aGlzLmNvbW1hbmRzICAgID0gbmV3IEJhY2tib25lLldyZXFyLkNvbW1hbmRzKCk7XG4gICAgdGhpcy5jaGFubmVsTmFtZSA9IGNoYW5uZWxOYW1lO1xuICB9O1xuXG4gIF8uZXh0ZW5kKENoYW5uZWwucHJvdG90eXBlLCB7XG5cbiAgICAvLyBSZW1vdmUgYWxsIGhhbmRsZXJzIGZyb20gdGhlIG1lc3NhZ2luZyBzeXN0ZW1zIG9mIHRoaXMgY2hhbm5lbFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudmVudC5vZmYoKTtcbiAgICAgIHRoaXMudmVudC5zdG9wTGlzdGVuaW5nKCk7XG4gICAgICB0aGlzLnJlcXJlcy5yZW1vdmVBbGxIYW5kbGVycygpO1xuICAgICAgdGhpcy5jb21tYW5kcy5yZW1vdmVBbGxIYW5kbGVycygpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIENvbm5lY3QgYSBoYXNoIG9mIGV2ZW50czsgb25lIGZvciBlYWNoIG1lc3NhZ2luZyBzeXN0ZW1cbiAgICBjb25uZWN0RXZlbnRzOiBmdW5jdGlvbihoYXNoLCBjb250ZXh0KSB7XG4gICAgICB0aGlzLl9jb25uZWN0KCd2ZW50JywgaGFzaCwgY29udGV4dCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgY29ubmVjdENvbW1hbmRzOiBmdW5jdGlvbihoYXNoLCBjb250ZXh0KSB7XG4gICAgICB0aGlzLl9jb25uZWN0KCdjb21tYW5kcycsIGhhc2gsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGNvbm5lY3RSZXF1ZXN0czogZnVuY3Rpb24oaGFzaCwgY29udGV4dCkge1xuICAgICAgdGhpcy5fY29ubmVjdCgncmVxcmVzJywgaGFzaCwgY29udGV4dCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gQXR0YWNoIHRoZSBoYW5kbGVycyB0byBhIGdpdmVuIG1lc3NhZ2Ugc3lzdGVtIGB0eXBlYFxuICAgIF9jb25uZWN0OiBmdW5jdGlvbih0eXBlLCBoYXNoLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWhhc2gpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0ID0gY29udGV4dCB8fCB0aGlzO1xuICAgICAgdmFyIG1ldGhvZCA9ICh0eXBlID09PSAndmVudCcpID8gJ29uJyA6ICdzZXRIYW5kbGVyJztcblxuICAgICAgXy5lYWNoKGhhc2gsIGZ1bmN0aW9uKGZuLCBldmVudE5hbWUpIHtcbiAgICAgICAgdGhpc1t0eXBlXVttZXRob2RdKGV2ZW50TmFtZSwgXy5iaW5kKGZuLCBjb250ZXh0KSk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgcmV0dXJuIENoYW5uZWw7XG59KShXcmVxcik7XG5cbiAgLy8gV3JlcXIuUmFkaW9cbi8vIC0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gQW4gb2JqZWN0IHRoYXQgbGV0cyB5b3UgY29tbXVuaWNhdGUgd2l0aCBtYW55IGNoYW5uZWxzLlxuV3JlcXIucmFkaW8gPSAoZnVuY3Rpb24oV3JlcXIpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgUmFkaW8gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jaGFubmVscyA9IHt9O1xuICAgIHRoaXMudmVudCA9IHt9O1xuICAgIHRoaXMuY29tbWFuZHMgPSB7fTtcbiAgICB0aGlzLnJlcXJlcyA9IHt9O1xuICAgIHRoaXMuX3Byb3h5TWV0aG9kcygpO1xuICB9O1xuXG4gIF8uZXh0ZW5kKFJhZGlvLnByb3RvdHlwZSwge1xuXG4gICAgY2hhbm5lbDogZnVuY3Rpb24oY2hhbm5lbE5hbWUpIHtcbiAgICAgIGlmICghY2hhbm5lbE5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaGFubmVsIG11c3QgcmVjZWl2ZSBhIG5hbWUnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX2dldENoYW5uZWwoIGNoYW5uZWxOYW1lICk7XG4gICAgfSxcblxuICAgIF9nZXRDaGFubmVsOiBmdW5jdGlvbihjaGFubmVsTmFtZSkge1xuICAgICAgdmFyIGNoYW5uZWwgPSB0aGlzLl9jaGFubmVsc1tjaGFubmVsTmFtZV07XG5cbiAgICAgIGlmKCFjaGFubmVsKSB7XG4gICAgICAgIGNoYW5uZWwgPSBuZXcgV3JlcXIuQ2hhbm5lbChjaGFubmVsTmFtZSk7XG4gICAgICAgIHRoaXMuX2NoYW5uZWxzW2NoYW5uZWxOYW1lXSA9IGNoYW5uZWw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjaGFubmVsO1xuICAgIH0sXG5cbiAgICBfcHJveHlNZXRob2RzOiBmdW5jdGlvbigpIHtcbiAgICAgIF8uZWFjaChbJ3ZlbnQnLCAnY29tbWFuZHMnLCAncmVxcmVzJ10sIGZ1bmN0aW9uKHN5c3RlbSkge1xuICAgICAgICBfLmVhY2goIG1lc3NhZ2VTeXN0ZW1zW3N5c3RlbV0sIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgICAgIHRoaXNbc3lzdGVtXVttZXRob2RdID0gcHJveHlNZXRob2QodGhpcywgc3lzdGVtLCBtZXRob2QpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cblxuICB2YXIgbWVzc2FnZVN5c3RlbXMgPSB7XG4gICAgdmVudDogW1xuICAgICAgJ29uJyxcbiAgICAgICdvZmYnLFxuICAgICAgJ3RyaWdnZXInLFxuICAgICAgJ29uY2UnLFxuICAgICAgJ3N0b3BMaXN0ZW5pbmcnLFxuICAgICAgJ2xpc3RlblRvJyxcbiAgICAgICdsaXN0ZW5Ub09uY2UnXG4gICAgXSxcblxuICAgIGNvbW1hbmRzOiBbXG4gICAgICAnZXhlY3V0ZScsXG4gICAgICAnc2V0SGFuZGxlcicsXG4gICAgICAnc2V0SGFuZGxlcnMnLFxuICAgICAgJ3JlbW92ZUhhbmRsZXInLFxuICAgICAgJ3JlbW92ZUFsbEhhbmRsZXJzJ1xuICAgIF0sXG5cbiAgICByZXFyZXM6IFtcbiAgICAgICdyZXF1ZXN0JyxcbiAgICAgICdzZXRIYW5kbGVyJyxcbiAgICAgICdzZXRIYW5kbGVycycsXG4gICAgICAncmVtb3ZlSGFuZGxlcicsXG4gICAgICAncmVtb3ZlQWxsSGFuZGxlcnMnXG4gICAgXVxuICB9O1xuXG4gIHZhciBwcm94eU1ldGhvZCA9IGZ1bmN0aW9uKHJhZGlvLCBzeXN0ZW0sIG1ldGhvZCkge1xuICAgIHJldHVybiBmdW5jdGlvbihjaGFubmVsTmFtZSkge1xuICAgICAgdmFyIG1lc3NhZ2VTeXN0ZW0gPSByYWRpby5fZ2V0Q2hhbm5lbChjaGFubmVsTmFtZSlbc3lzdGVtXTtcbiAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgICAgbWVzc2FnZVN5c3RlbVttZXRob2RdLmFwcGx5KG1lc3NhZ2VTeXN0ZW0sIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgcmV0dXJuIG5ldyBSYWRpbygpO1xuXG59KShXcmVxcik7XG5cblxufSkpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3NzKSB7XG4gIHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcblxuICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgfSBlbHNlIHtcbiAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgfVxuICBcbiAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5ieVVybCA9IGZ1bmN0aW9uKHVybCkge1xuICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgICBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuXG4gIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICBsaW5rLmhyZWYgPSB1cmw7XG4gIFxuICBoZWFkLmFwcGVuZENoaWxkKGxpbmspO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2Nzc2lmeScpO1xuIiwiLy8gICAgIFVuZGVyc2NvcmUuanMgMS42LjBcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTQgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCBpbiB0aGUgYnJvd3Nlciwgb3IgYGV4cG9ydHNgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNi4wJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0b3IgdG8gZWFjaCBlbGVtZW50LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbWFwYCBpZiBhdmFpbGFibGUuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlTWFwICYmIG9iai5tYXAgPT09IG5hdGl2ZU1hcCkgcmV0dXJuIG9iai5tYXAoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2UgJiYgb2JqLnJlZHVjZSA9PT0gbmF0aXZlUmVkdWNlKSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlKGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2UoaXRlcmF0b3IpO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IHZhbHVlO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZVJpZ2h0YCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlUmlnaHQgJiYgb2JqLnJlZHVjZVJpZ2h0ID09PSBuYXRpdmVSZWR1Y2VSaWdodCkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvcik7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09ICtsZW5ndGgpIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaW5kZXggPSBrZXlzID8ga2V5c1stLWxlbmd0aF0gOiAtLWxlbmd0aDtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gb2JqW2luZGV4XTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCBvYmpbaW5kZXhdLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZpbHRlcmAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZUZpbHRlciAmJiBvYmouZmlsdGVyID09PSBuYXRpdmVGaWx0ZXIpIHJldHVybiBvYmouZmlsdGVyKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZXZlcnlgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlRXZlcnkgJiYgb2JqLmV2ZXJ5ID09PSBuYXRpdmVFdmVyeSkgcmV0dXJuIG9iai5ldmVyeShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghKHJlc3VsdCA9IHJlc3VsdCAmJiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgc29tZWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICB2YXIgYW55ID0gXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlU29tZSAmJiBvYmouc29tZSA9PT0gbmF0aXZlU29tZSkgcmV0dXJuIG9iai5zb21lKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHJlc3VsdCB8fCAocmVzdWx0ID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIHZhbHVlICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCB0YXJnZXQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBvYmouaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgcmV0dXJuIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIChpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdKS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgb3IgKGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICAvLyBDYW4ndCBvcHRpbWl6ZSBhcnJheXMgb2YgaW50ZWdlcnMgbG9uZ2VyIHRoYW4gNjUsNTM1IGVsZW1lbnRzLlxuICAvLyBTZWUgW1dlYktpdCBCdWcgODA3OTddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MDc5NylcbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IC1JbmZpbml0eSwgbGFzdENvbXB1dGVkID0gLUluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPiBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbi5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhbiBhcnJheSwgdXNpbmcgdGhlIG1vZGVybiB2ZXJzaW9uIG9mIHRoZVxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGxvb2t1cCBpdGVyYXRvcnMuXG4gIHZhciBsb29rdXBJdGVyYXRvciA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBfLmlkZW50aXR5O1xuICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gICAgcmV0dXJuIF8ucHJvcGVydHkodmFsdWUpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRvci5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIGtleSwgdmFsdWUpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSkgOiByZXN1bHRba2V5XSA9IFt2YWx1ZV07XG4gIH0pO1xuXG4gIC8vIEluZGV4ZXMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiwgc2ltaWxhciB0byBgZ3JvdXBCeWAsIGJ1dCBmb3JcbiAgLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLlxuICBfLmluZGV4QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXkpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSsrIDogcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICBpZiAobiA8IDApIHJldHVybiBbXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aFxuICAvLyBgXy5tYXBgLlxuICBfLmluaXRpYWwgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgYXJyYXkubGVuZ3RoIC0gKChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgTWF0aC5tYXgoYXJyYXkubGVuZ3RoIC0gbiwgMCkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqXG4gIC8vIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5yZXN0ID0gXy50YWlsID0gXy5kcm9wID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgb3V0cHV0KSB7XG4gICAgaWYgKHNoYWxsb3cgJiYgXy5ldmVyeShpbnB1dCwgXy5pc0FycmF5KSkge1xuICAgICAgcmV0dXJuIGNvbmNhdC5hcHBseShvdXRwdXQsIGlucHV0KTtcbiAgICB9XG4gICAgZWFjaChpbnB1dCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIHNoYWxsb3cgPyBwdXNoLmFwcGx5KG91dHB1dCwgdmFsdWUpIDogZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgb3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIC8vIEZsYXR0ZW4gb3V0IGFuIGFycmF5LCBlaXRoZXIgcmVjdXJzaXZlbHkgKGJ5IGRlZmF1bHQpLCBvciBqdXN0IG9uZSBsZXZlbC5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gU3BsaXQgYW4gYXJyYXkgaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihhcnJheSwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgIChwcmVkaWNhdGUoZWxlbSkgPyBwYXNzIDogZmFpbCkucHVzaChlbGVtKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRvcjtcbiAgICAgIGl0ZXJhdG9yID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaW5pdGlhbCA9IGl0ZXJhdG9yID8gXy5tYXAoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSA6IGFycmF5O1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICBlYWNoKGluaXRpYWwsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgaWYgKGlzU29ydGVkID8gKCFpbmRleCB8fCBzZWVuW3NlZW4ubGVuZ3RoIC0gMV0gIT09IHZhbHVlKSA6ICFfLmNvbnRhaW5zKHNlZW4sIHZhbHVlKSkge1xuICAgICAgICBzZWVuLnB1c2godmFsdWUpO1xuICAgICAgICByZXN1bHRzLnB1c2goYXJyYXlbaW5kZXhdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKF8uZmxhdHRlbihhcmd1bWVudHMsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoXy51bmlxKGFycmF5KSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIF8uZXZlcnkocmVzdCwgZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF8uY29udGFpbnMob3RoZXIsIGl0ZW0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCAnbGVuZ3RoJykuY29uY2F0KDApKTtcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdHNbaV0gPSBfLnBsdWNrKGFyZ3VtZW50cywgJycgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydHMgbGlzdHMgaW50byBvYmplY3RzLiBQYXNzIGVpdGhlciBhIHNpbmdsZSBhcnJheSBvZiBgW2tleSwgdmFsdWVdYFxuICAvLyBwYWlycywgb3IgdHdvIHBhcmFsbGVsIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGggLS0gb25lIG9mIGtleXMsIGFuZCBvbmUgb2ZcbiAgLy8gdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICBfLm9iamVjdCA9IGZ1bmN0aW9uKGxpc3QsIHZhbHVlcykge1xuICAgIGlmIChsaXN0ID09IG51bGwpIHJldHVybiB7fTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBseSB1cyB3aXRoIGluZGV4T2YgKEknbSBsb29raW5nIGF0IHlvdSwgKipNU0lFKiopLFxuICAvLyB3ZSBuZWVkIHRoaXMgZnVuY3Rpb24uIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW5cbiAgLy8gaXRlbSBpbiBhbiBhcnJheSwgb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgIGkgPSAoaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbGFzdEluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgXy5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBmcm9tKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaGFzSW5kZXggPSBmcm9tICE9IG51bGw7XG4gICAgaWYgKG5hdGl2ZUxhc3RJbmRleE9mICYmIGFycmF5Lmxhc3RJbmRleE9mID09PSBuYXRpdmVMYXN0SW5kZXhPZikge1xuICAgICAgcmV0dXJuIGhhc0luZGV4ID8gYXJyYXkubGFzdEluZGV4T2YoaXRlbSwgZnJvbSkgOiBhcnJheS5sYXN0SW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgdmFyIGkgPSAoaGFzSW5kZXggPyBmcm9tIDogYXJyYXkubGVuZ3RoKTtcbiAgICB3aGlsZSAoaS0tKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gYXJndW1lbnRzWzJdIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHZhciByYW5nZSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgd2hpbGUoaWR4IDwgbGVuZ3RoKSB7XG4gICAgICByYW5nZVtpZHgrK10gPSBzdGFydDtcbiAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV1c2FibGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHByb3RvdHlwZSBzZXR0aW5nLlxuICB2YXIgY3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICB2YXIgYXJncywgYm91bmQ7XG4gICAgaWYgKG5hdGl2ZUJpbmQgJiYgZnVuYy5iaW5kID09PSBuYXRpdmVCaW5kKSByZXR1cm4gbmF0aXZlQmluZC5hcHBseShmdW5jLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgYm91bmQpKSByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICB2YXIgc2VsZiA9IG5ldyBjdG9yO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBvc2l0aW9uID0gMDtcbiAgICAgIHZhciBhcmdzID0gYm91bmRBcmdzLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJncy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJnc1tpXSA9PT0gXykgYXJnc1tpXSA9IGFyZ3VtZW50c1twb3NpdGlvbisrXTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChwb3NpdGlvbiA8IGFyZ3VtZW50cy5sZW5ndGgpIGFyZ3MucHVzaChhcmd1bWVudHNbcG9zaXRpb24rK10pO1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGZ1bmNzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChmdW5jcy5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGVhY2goZnVuY3MsIGZ1bmN0aW9uKGYpIHsgb2JqW2ZdID0gXy5iaW5kKG9ialtmXSwgb2JqKTsgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IHt9O1xuICAgIGhhc2hlciB8fCAoaGFzaGVyID0gXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIF8uaGFzKG1lbW8sIGtleSkgPyBtZW1vW2tleV0gOiAobWVtb1trZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpOyB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gXy5kZWxheS5hcHBseShfLCBbZnVuYywgMV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZVxuICAvLyBkdXJpbmcgYSBnaXZlbiB3aW5kb3cgb2YgdGltZS4gTm9ybWFsbHksIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbCBydW5cbiAgLy8gYXMgbXVjaCBhcyBpdCBjYW4sIHdpdGhvdXQgZXZlciBnb2luZyBtb3JlIHRoYW4gb25jZSBwZXIgYHdhaXRgIGR1cmF0aW9uO1xuICAvLyBidXQgaWYgeW91J2QgbGlrZSB0byBkaXNhYmxlIHRoZSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgcGFzc1xuICAvLyBge2xlYWRpbmc6IGZhbHNlfWAuIFRvIGRpc2FibGUgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlLCBkaXR0by5cbiAgXy50aHJvdHRsZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCwgYXJncywgcmVzdWx0O1xuICAgIHZhciB0aW1lb3V0ID0gbnVsbDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub3cgPSBfLm5vdygpO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICAgIGlmIChsYXN0IDwgd2FpdCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gXy5ub3coKTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgZm9yICh2YXIgaSA9IGZ1bmNzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGFyZ3MgPSBbZnVuY3NbaV0uYXBwbHkodGhpcywgYXJncyldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYWZ0ZXIgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYSBsaXN0IG9mIGBba2V5LCB2YWx1ZV1gIHBhaXJzLlxuICBfLnBhaXJzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHBhaXJzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ucGljayA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBlYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmICghXy5jb250YWlucyhrZXlzLCBrZXkpKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgICAvLyBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuIGEgIT0gK2EgPyBiICE9ICtiIDogKGEgPT0gMCA/IDEgLyBhID09IDEgLyBiIDogYSA9PSArYik7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT0gK2I7XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb21wYXJlZCBieSB0aGVpciBzb3VyY2UgcGF0dGVybnMgYW5kIGZsYWdzLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgICAgcmV0dXJuIGEuc291cmNlID09IGIuc291cmNlICYmXG4gICAgICAgICAgICAgICBhLmdsb2JhbCA9PSBiLmdsb2JhbCAmJlxuICAgICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICAgIGEuaWdub3JlQ2FzZSA9PSBiLmlnbm9yZUNhc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiAoYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcikpXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIF8uY29uc3RhbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLnByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmogPT09IGF0dHJzKSByZXR1cm4gdHJ1ZTsgLy9hdm9pZCBjb21wYXJpbmcgYW4gb2JqZWN0IHRvIGl0c2VsZi5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gQSAocG9zc2libHkgZmFzdGVyKSB3YXkgdG8gZ2V0IHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBhbiBpbnRlZ2VyLlxuICBfLm5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7J1xuICAgIH1cbiAgfTtcbiAgZW50aXR5TWFwLnVuZXNjYXBlID0gXy5pbnZlcnQoZW50aXR5TWFwLmVzY2FwZSk7XG5cbiAgLy8gUmVnZXhlcyBjb250YWluaW5nIHRoZSBrZXlzIGFuZCB2YWx1ZXMgbGlzdGVkIGltbWVkaWF0ZWx5IGFib3ZlLlxuICB2YXIgZW50aXR5UmVnZXhlcyA9IHtcbiAgICBlc2NhcGU6ICAgbmV3IFJlZ0V4cCgnWycgKyBfLmtleXMoZW50aXR5TWFwLmVzY2FwZSkuam9pbignJykgKyAnXScsICdnJyksXG4gICAgdW5lc2NhcGU6IG5ldyBSZWdFeHAoJygnICsgXy5rZXlzKGVudGl0eU1hcC51bmVzY2FwZSkuam9pbignfCcpICsgJyknLCAnZycpXG4gIH07XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICBfLmVhY2goWydlc2NhcGUnLCAndW5lc2NhcGUnXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgX1ttZXRob2RdID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiAoJycgKyBzdHJpbmcpLnJlcGxhY2UoZW50aXR5UmVnZXhlc1ttZXRob2RdLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4gZW50aXR5TWFwW21ldGhvZF1bbWF0Y2hdO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxuICAvLyBBTUQgcmVnaXN0cmF0aW9uIGhhcHBlbnMgYXQgdGhlIGVuZCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIEFNRCBsb2FkZXJzXG4gIC8vIHRoYXQgbWF5IG5vdCBlbmZvcmNlIG5leHQtdHVybiBzZW1hbnRpY3Mgb24gbW9kdWxlcy4gRXZlbiB0aG91Z2ggZ2VuZXJhbFxuICAvLyBwcmFjdGljZSBmb3IgQU1EIHJlZ2lzdHJhdGlvbiBpcyB0byBiZSBhbm9ueW1vdXMsIHVuZGVyc2NvcmUgcmVnaXN0ZXJzXG4gIC8vIGFzIGEgbmFtZWQgbW9kdWxlIGJlY2F1c2UsIGxpa2UgalF1ZXJ5LCBpdCBpcyBhIGJhc2UgbGlicmFyeSB0aGF0IGlzXG4gIC8vIHBvcHVsYXIgZW5vdWdoIHRvIGJlIGJ1bmRsZWQgaW4gYSB0aGlyZCBwYXJ0eSBsaWIsIGJ1dCBub3QgYmUgcGFydCBvZlxuICAvLyBhbiBBTUQgbG9hZCByZXF1ZXN0LiBUaG9zZSBjYXNlcyBjb3VsZCBnZW5lcmF0ZSBhbiBlcnJvciB3aGVuIGFuXG4gIC8vIGFub255bW91cyBkZWZpbmUoKSBpcyBjYWxsZWQgb3V0c2lkZSBvZiBhIGxvYWRlciByZXF1ZXN0LlxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKCd1bmRlcnNjb3JlJywgW10sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF87XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCIjIFZlbmRvcnNcbiQgPSByZXF1aXJlICdqcXVlcnknXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuQmFja2JvbmUuJCA9ICRcbk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuUm91dGVzID0gcmVxdWlyZSAnLi9hcHAvcm91dGVzL2hvbWUuY29mZmVlJ1xuU3R5bGVzID0gcmVxdWlyZSBcIi4vYXBwL3N0eWxlc2hlZXRzL2FwcC5sZXNzXCJcblxuXG4jIGFwcCBib290c3RyYXBcbmFwcCA9IG5ldyBNYXJpb25ldHRlLkFwcGxpY2F0aW9uKClcbmFwcC5hZGRJbml0aWFsaXplcigob3B0aW9ucykgLT5cbiAgYXBwUm91dGVyID0gbmV3IFJvdXRlc1xuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHsgcHVzaFN0YXRlOiB0cnVlIH0pXG4pXG5cbmFwcC5zdGFydCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcDtcblxuIiwiICBCYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuICBCYWNrYm9uZS5JbmRleGVkREIgPSByZXF1aXJlICdiYWNrYm9uZV9pbmRleGVkZGInXG4gIHdpbmRvdy5EYXRhYmFzZSA9IHJlcXVpcmUgJy4uL2RhdGFiYXNlL2luZGV4ZGIuY29mZmVlJ1xuICBNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9kYXlzX3RvX3NoaXAuY29mZmVlJ1xuXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZFxuXG4gICAgc3RvcmVOYW1lOiAnZGF5c190b19zaGlwJ1xuXG4gICAgZGF0YWJhc2U6IHdpbmRvdy5EYXRhYmFzZVxuXG4gICAgbW9kZWw6IE1vZGVsXG5cbiIsIiAgQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcbiAgQmFja2JvbmUuSW5kZXhlZERCID0gcmVxdWlyZSAnYmFja2JvbmVfaW5kZXhlZGRiJ1xuICB3aW5kb3cuRGF0YWJhc2UgPSByZXF1aXJlICcuLi9kYXRhYmFzZS9pbmRleGRiLmNvZmZlZSdcbiAgTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvcHJvZHVjdC5jb2ZmZWUnXG5cblxuICBtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kXG5cbiAgICBzdG9yZU5hbWU6ICdwcm9kdWN0cydcblxuICAgIGRhdGFiYXNlOiB3aW5kb3cuRGF0YWJhc2VcblxuICAgIG1vZGVsOiBNb2RlbFxuXG4iLCIgICMgU2V0IHVwIERhdGFiYXNlXG4gIG1vZHVsZS5leHBvcnRzID0ge1xuICAgIGlkOiAnbm90aHMtZGF0YWJhc2UnLFxuICAgIGRlc2NyaXB0aW9uOiAnTk9USFMgTG9jYWwgRGF0YWJhc2UnLFxuICAgIG1pZ3JhdGlvbnM6IFtcbiAgICAgIHtcblxuICAgICAgICB2ZXJzaW9uOiAxLFxuICAgICAgICBtaWdyYXRlOiAodHJhbnNhY3Rpb24sIG5leHQpIC0+XG4gICAgICAgICAgc3RvcmUgPSB0cmFuc2FjdGlvbi5kYi5jcmVhdGVPYmplY3RTdG9yZSgndXNlcnMnLCB7a2V5UGF0aDogXCJpZFwifSlcbiAgICAgICAgICBzdG9yZS5jcmVhdGVJbmRleCgnZW1haWxJbmRleCcsICdlbWFpbCcpXG4gICAgICAgICAgbmV4dCgpXG5cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHZlcnNpb246IDIsXG4gICAgICAgIG1pZ3JhdGU6ICh0cmFuc2FjdGlvbiwgbmV4dCkgLT5cbiAgICAgICAgICBzdG9yZSA9IHRyYW5zYWN0aW9uLmRiLmNyZWF0ZU9iamVjdFN0b3JlKCdwcm9kdWN0cycsIHtrZXlQYXRoOiBcImlkXCJ9KVxuICAgICAgICAgIG5leHQoKVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdmVyc2lvbjogMyxcbiAgICAgICAgbWlncmF0ZTogKHRyYW5zYWN0aW9uLCBuZXh0KSAtPlxuICAgICAgICAgIHN0b3JlID0gdHJhbnNhY3Rpb24uZGIuY3JlYXRlT2JqZWN0U3RvcmUoJ2RheXNfdG9fc2hpcCcsIHtrZXlQYXRoOiBcImlkXCJ9KVxuICAgICAgICAgIHN0b3JlLmNyZWF0ZUluZGV4KCdkYXlzSW5kZXgnLCAnZGF5cycpXG4gICAgICAgICAgbmV4dCgpXG4gICAgICB9XG4gICAgXVxuICB9IiwiQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcbkJhY2tib25lLkluZGV4ZWREQiA9IHJlcXVpcmUgJ2JhY2tib25lX2luZGV4ZWRkYidcbndpbmRvdy5EYXRhYmFzZSA9IHJlcXVpcmUgJy4uL2RhdGFiYXNlL2luZGV4ZGIuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gIHN0b3JlTmFtZTogJ2RheXNfdG9fc2hpcCdcblxuICBkYXRhYmFzZTogd2luZG93LkRhdGFiYXNlXG5cbiAgZGVmYXVsdHM6XG4gICAgdGl0bGU6IFwiXCJcbiAgICBkYXlzOiAxXG4iLCJCYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuQmFja2JvbmUuSW5kZXhlZERCID0gcmVxdWlyZSAnYmFja2JvbmVfaW5kZXhlZGRiJ1xud2luZG93LkRhdGFiYXNlID0gcmVxdWlyZSAnLi4vZGF0YWJhc2UvaW5kZXhkYi5jb2ZmZWUnXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkRheXNUb1NoaXAgPSByZXF1aXJlICcuL2RheXNfdG9fc2hpcC5jb2ZmZWUnXG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kXG5cbiAgc3RvcmVOYW1lOiAncHJvZHVjdHMnXG5cbiAgZGF0YWJhc2U6IHdpbmRvdy5EYXRhYmFzZVxuXG4gIGRlZmF1bHRzOlxuICAgIHRpdGxlOiBcIlwiXG4gICAgcHJpY2U6IDAuMFxuICAgIGludHJvZHVjdGlvbjogXCJcIlxuICAgIGRheXNfdG9fc2hpcF9pZDogbnVsbFxuXG5cblxuIiwiV3JlcXIgPSByZXF1aXJlICdiYWNrYm9uZS53cmVxcidcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgV3JlcXIuQ29tbWFuZHMoKVxuXG4iLCIjIEhvbWUgUGFnZSBSb3V0ZXJcbk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuVmlld0hvbWUgPSByZXF1aXJlICcuLi92aWV3cy9ob21lL2xheW91dC5jb2ZmZWUnXG5EYXlzVG9TaGlwID0gcmVxdWlyZSAnLi4vbW9kZWxzL2RheXNfdG9fc2hpcC5jb2ZmZWUnXG5cbm1vZHVsZS5leHBvcnRzID0gTWFyaW9uZXR0ZS5BcHBSb3V0ZXIuZXh0ZW5kXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcIkFwcC5Sb3V0ZXMuSG9tZTo6aW5pdGlhbGl6ZVwiKVxuICAgIEByZWdpb25fbWFuYWdlciA9IG5ldyBNYXJpb25ldHRlLlJlZ2lvbk1hbmFnZXIoKVxuICAgIEByZWdpb25zID0gQHJlZ2lvbl9tYW5hZ2VyLmFkZFJlZ2lvbnMoe1xuICAgICAgaG9tZTogXCIjaG9tZS1wYWdlLXJvd1wiXG4gICAgICB9KVxuXG4gIHJvdXRlczpcbiAgICBcIlwiOiBcImhvbWVTaG93XCJcbiAgICBcImZhY3RvcnlcIjogXCJydW5GYWN0b3J5XCJcblxuXG4gIGhvbWVTaG93OiAtPlxuICAgIGNvbnNvbGUubG9nKFwiQXBwLlJvdXRlcy5Ib21lOjpob21lU2hvd1wiKVxuICAgIGNvbnNvbGUubG9nKFwiV291bGQgaGF2ZSBzaG93biBob21lXCIpXG4gICAgdmlldyA9IG5ldyBWaWV3SG9tZVxuICAgIEByZWdpb25zLmhvbWUuc2hvdyh2aWV3KVxuXG4gIHJ1bkZhY3Rvcnk6IC0+XG4gICAgbmV3IERheXNUb1NoaXAodGl0bGU6IFwidXAgdG8gMiBEYXlzXCIsIGRheXM6IDIpLnNhdmUoKVxuICAgIG5ldyBEYXlzVG9TaGlwKHRpdGxlOiBcInVwIHRvIDQgRGF5c1wiLCBkYXlzOiA0KS5zYXZlKClcbiAgICBuZXcgRGF5c1RvU2hpcCh0aXRsZTogXCJ1cCB0byBhIHdlZWtcIiwgZGF5czogNykuc2F2ZSgpXG4gICAgbmV3IERheXNUb1NoaXAodGl0bGU6IFwidXAgdG8gdHdvIHdlZWtzXCIsIGRheXM6IDE0KS5zYXZlKClcblxuIiwidmFyIGNzcyA9IFwiLyohIG5vcm1hbGl6ZS5jc3MgdjMuMC4wIHwgTUlUIExpY2Vuc2UgfCBnaXQuaW8vbm9ybWFsaXplICovXFxuaHRtbCB7XFxuICBmb250LWZhbWlseTogc2Fucy1zZXJpZjtcXG4gIC1tcy10ZXh0LXNpemUtYWRqdXN0OiAxMDAlO1xcbiAgLXdlYmtpdC10ZXh0LXNpemUtYWRqdXN0OiAxMDAlO1xcbn1cXG5ib2R5IHtcXG4gIG1hcmdpbjogMDtcXG59XFxuYXJ0aWNsZSxcXG5hc2lkZSxcXG5kZXRhaWxzLFxcbmZpZ2NhcHRpb24sXFxuZmlndXJlLFxcbmZvb3RlcixcXG5oZWFkZXIsXFxuaGdyb3VwLFxcbm1haW4sXFxubmF2LFxcbnNlY3Rpb24sXFxuc3VtbWFyeSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuYXVkaW8sXFxuY2FudmFzLFxcbnByb2dyZXNzLFxcbnZpZGVvIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHZlcnRpY2FsLWFsaWduOiBiYXNlbGluZTtcXG59XFxuYXVkaW86bm90KFtjb250cm9sc10pIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxuICBoZWlnaHQ6IDA7XFxufVxcbltoaWRkZW5dLFxcbnRlbXBsYXRlIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcbmEge1xcbiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XFxufVxcbmE6YWN0aXZlLFxcbmE6aG92ZXIge1xcbiAgb3V0bGluZTogMDtcXG59XFxuYWJiclt0aXRsZV0ge1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZDtcXG59XFxuYixcXG5zdHJvbmcge1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxufVxcbmRmbiB7XFxuICBmb250LXN0eWxlOiBpdGFsaWM7XFxufVxcbmgxIHtcXG4gIGZvbnQtc2l6ZTogMmVtO1xcbiAgbWFyZ2luOiAwLjY3ZW0gMDtcXG59XFxubWFyayB7XFxuICBiYWNrZ3JvdW5kOiAjZmYwO1xcbiAgY29sb3I6ICMwMDA7XFxufVxcbnNtYWxsIHtcXG4gIGZvbnQtc2l6ZTogODAlO1xcbn1cXG5zdWIsXFxuc3VwIHtcXG4gIGZvbnQtc2l6ZTogNzUlO1xcbiAgbGluZS1oZWlnaHQ6IDA7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYmFzZWxpbmU7XFxufVxcbnN1cCB7XFxuICB0b3A6IC0wLjVlbTtcXG59XFxuc3ViIHtcXG4gIGJvdHRvbTogLTAuMjVlbTtcXG59XFxuaW1nIHtcXG4gIGJvcmRlcjogMDtcXG59XFxuc3ZnOm5vdCg6cm9vdCkge1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG59XFxuZmlndXJlIHtcXG4gIG1hcmdpbjogMWVtIDQwcHg7XFxufVxcbmhyIHtcXG4gIC1tb3otYm94LXNpemluZzogY29udGVudC1ib3g7XFxuICBib3gtc2l6aW5nOiBjb250ZW50LWJveDtcXG4gIGhlaWdodDogMDtcXG59XFxucHJlIHtcXG4gIG92ZXJmbG93OiBhdXRvO1xcbn1cXG5jb2RlLFxcbmtiZCxcXG5wcmUsXFxuc2FtcCB7XFxuICBmb250LWZhbWlseTogbW9ub3NwYWNlLCBtb25vc3BhY2U7XFxuICBmb250LXNpemU6IDFlbTtcXG59XFxuYnV0dG9uLFxcbmlucHV0LFxcbm9wdGdyb3VwLFxcbnNlbGVjdCxcXG50ZXh0YXJlYSB7XFxuICBjb2xvcjogaW5oZXJpdDtcXG4gIGZvbnQ6IGluaGVyaXQ7XFxuICBtYXJnaW46IDA7XFxufVxcbmJ1dHRvbiB7XFxuICBvdmVyZmxvdzogdmlzaWJsZTtcXG59XFxuYnV0dG9uLFxcbnNlbGVjdCB7XFxuICB0ZXh0LXRyYW5zZm9ybTogbm9uZTtcXG59XFxuYnV0dG9uLFxcbmh0bWwgaW5wdXRbdHlwZT1cXFwiYnV0dG9uXFxcIl0sXFxuaW5wdXRbdHlwZT1cXFwicmVzZXRcXFwiXSxcXG5pbnB1dFt0eXBlPVxcXCJzdWJtaXRcXFwiXSB7XFxuICAtd2Via2l0LWFwcGVhcmFuY2U6IGJ1dHRvbjtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuYnV0dG9uW2Rpc2FibGVkXSxcXG5odG1sIGlucHV0W2Rpc2FibGVkXSB7XFxuICBjdXJzb3I6IGRlZmF1bHQ7XFxufVxcbmJ1dHRvbjo6LW1vei1mb2N1cy1pbm5lcixcXG5pbnB1dDo6LW1vei1mb2N1cy1pbm5lciB7XFxuICBib3JkZXI6IDA7XFxuICBwYWRkaW5nOiAwO1xcbn1cXG5pbnB1dCB7XFxuICBsaW5lLWhlaWdodDogbm9ybWFsO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdLFxcbmlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl0ge1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIHBhZGRpbmc6IDA7XFxufVxcbmlucHV0W3R5cGU9XFxcIm51bWJlclxcXCJdOjotd2Via2l0LWlubmVyLXNwaW4tYnV0dG9uLFxcbmlucHV0W3R5cGU9XFxcIm51bWJlclxcXCJdOjotd2Via2l0LW91dGVyLXNwaW4tYnV0dG9uIHtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuaW5wdXRbdHlwZT1cXFwic2VhcmNoXFxcIl0ge1xcbiAgLXdlYmtpdC1hcHBlYXJhbmNlOiB0ZXh0ZmllbGQ7XFxuICAtbW96LWJveC1zaXppbmc6IGNvbnRlbnQtYm94O1xcbiAgLXdlYmtpdC1ib3gtc2l6aW5nOiBjb250ZW50LWJveDtcXG4gIGJveC1zaXppbmc6IGNvbnRlbnQtYm94O1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJzZWFyY2hcXFwiXTo6LXdlYmtpdC1zZWFyY2gtY2FuY2VsLWJ1dHRvbixcXG5pbnB1dFt0eXBlPVxcXCJzZWFyY2hcXFwiXTo6LXdlYmtpdC1zZWFyY2gtZGVjb3JhdGlvbiB7XFxuICAtd2Via2l0LWFwcGVhcmFuY2U6IG5vbmU7XFxufVxcbmZpZWxkc2V0IHtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNjMGMwYzA7XFxuICBtYXJnaW46IDAgMnB4O1xcbiAgcGFkZGluZzogMC4zNWVtIDAuNjI1ZW0gMC43NWVtO1xcbn1cXG5sZWdlbmQge1xcbiAgYm9yZGVyOiAwO1xcbiAgcGFkZGluZzogMDtcXG59XFxudGV4dGFyZWEge1xcbiAgb3ZlcmZsb3c6IGF1dG87XFxufVxcbm9wdGdyb3VwIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG50YWJsZSB7XFxuICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xcbiAgYm9yZGVyLXNwYWNpbmc6IDA7XFxufVxcbnRkLFxcbnRoIHtcXG4gIHBhZGRpbmc6IDA7XFxufVxcbkBtZWRpYSBwcmludCB7XFxuICAqIHtcXG4gICAgdGV4dC1zaGFkb3c6IG5vbmUgIWltcG9ydGFudDtcXG4gICAgY29sb3I6ICMwMDAgIWltcG9ydGFudDtcXG4gICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQgIWltcG9ydGFudDtcXG4gICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50O1xcbiAgfVxcbiAgYSxcXG4gIGE6dmlzaXRlZCB7XFxuICAgIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xcbiAgfVxcbiAgYVtocmVmXTphZnRlciB7XFxuICAgIGNvbnRlbnQ6IFxcXCIgKFxcXCIgYXR0cihocmVmKSBcXFwiKVxcXCI7XFxuICB9XFxuICBhYmJyW3RpdGxlXTphZnRlciB7XFxuICAgIGNvbnRlbnQ6IFxcXCIgKFxcXCIgYXR0cih0aXRsZSkgXFxcIilcXFwiO1xcbiAgfVxcbiAgYVtocmVmXj1cXFwiamF2YXNjcmlwdDpcXFwiXTphZnRlcixcXG4gIGFbaHJlZl49XFxcIiNcXFwiXTphZnRlciB7XFxuICAgIGNvbnRlbnQ6IFxcXCJcXFwiO1xcbiAgfVxcbiAgcHJlLFxcbiAgYmxvY2txdW90ZSB7XFxuICAgIGJvcmRlcjogMXB4IHNvbGlkICM5OTk7XFxuICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZDtcXG4gIH1cXG4gIHRoZWFkIHtcXG4gICAgZGlzcGxheTogdGFibGUtaGVhZGVyLWdyb3VwO1xcbiAgfVxcbiAgdHIsXFxuICBpbWcge1xcbiAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQ7XFxuICB9XFxuICBpbWcge1xcbiAgICBtYXgtd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcXG4gIH1cXG4gIHAsXFxuICBoMixcXG4gIGgzIHtcXG4gICAgb3JwaGFuczogMztcXG4gICAgd2lkb3dzOiAzO1xcbiAgfVxcbiAgaDIsXFxuICBoMyB7XFxuICAgIHBhZ2UtYnJlYWstYWZ0ZXI6IGF2b2lkO1xcbiAgfVxcbiAgc2VsZWN0IHtcXG4gICAgYmFja2dyb3VuZDogI2ZmZiAhaW1wb3J0YW50O1xcbiAgfVxcbiAgLm5hdmJhciB7XFxuICAgIGRpc3BsYXk6IG5vbmU7XFxuICB9XFxuICAudGFibGUgdGQsXFxuICAudGFibGUgdGgge1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmICFpbXBvcnRhbnQ7XFxuICB9XFxuICAuYnRuID4gLmNhcmV0LFxcbiAgLmRyb3B1cCA+IC5idG4gPiAuY2FyZXQge1xcbiAgICBib3JkZXItdG9wLWNvbG9yOiAjMDAwICFpbXBvcnRhbnQ7XFxuICB9XFxuICAubGFiZWwge1xcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjMDAwO1xcbiAgfVxcbiAgLnRhYmxlIHtcXG4gICAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZSAhaW1wb3J0YW50O1xcbiAgfVxcbiAgLnRhYmxlLWJvcmRlcmVkIHRoLFxcbiAgLnRhYmxlLWJvcmRlcmVkIHRkIHtcXG4gICAgYm9yZGVyOiAxcHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG4qIHtcXG4gIC13ZWJraXQtYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxufVxcbio6YmVmb3JlLFxcbio6YWZ0ZXIge1xcbiAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG59XFxuaHRtbCB7XFxuICBmb250LXNpemU6IDYyLjUlO1xcbiAgLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOiByZ2JhKDAsIDAsIDAsIDApO1xcbn1cXG5ib2R5IHtcXG4gIGZvbnQtZmFtaWx5OiBcXFwiSGVsdmV0aWNhIE5ldWVcXFwiLCBIZWx2ZXRpY2EsIEFyaWFsLCBzYW5zLXNlcmlmO1xcbiAgZm9udC1zaXplOiAxNHB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxufVxcbmlucHV0LFxcbmJ1dHRvbixcXG5zZWxlY3QsXFxudGV4dGFyZWEge1xcbiAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XFxuICBmb250LXNpemU6IGluaGVyaXQ7XFxuICBsaW5lLWhlaWdodDogaW5oZXJpdDtcXG59XFxuYSB7XFxuICBjb2xvcjogIzQyOGJjYTtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG59XFxuYTpob3ZlcixcXG5hOmZvY3VzIHtcXG4gIGNvbG9yOiAjMmE2NDk2O1xcbiAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XFxufVxcbmE6Zm9jdXMge1xcbiAgb3V0bGluZTogdGhpbiBkb3R0ZWQ7XFxuICBvdXRsaW5lOiA1cHggYXV0byAtd2Via2l0LWZvY3VzLXJpbmctY29sb3I7XFxuICBvdXRsaW5lLW9mZnNldDogLTJweDtcXG59XFxuZmlndXJlIHtcXG4gIG1hcmdpbjogMDtcXG59XFxuaW1nIHtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxufVxcbi5pbWctcmVzcG9uc2l2ZSxcXG4udGh1bWJuYWlsID4gaW1nLFxcbi50aHVtYm5haWwgYSA+IGltZyxcXG4uY2Fyb3VzZWwtaW5uZXIgPiAuaXRlbSA+IGltZyxcXG4uY2Fyb3VzZWwtaW5uZXIgPiAuaXRlbSA+IGEgPiBpbWcge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBtYXgtd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbi5pbWctcm91bmRlZCB7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxufVxcbi5pbWctdGh1bWJuYWlsIHtcXG4gIHBhZGRpbmc6IDRweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxuICAtd2Via2l0LXRyYW5zaXRpb246IGFsbCAwLjJzIGVhc2UtaW4tb3V0O1xcbiAgdHJhbnNpdGlvbjogYWxsIDAuMnMgZWFzZS1pbi1vdXQ7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBtYXgtd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbi5pbWctY2lyY2xlIHtcXG4gIGJvcmRlci1yYWRpdXM6IDUwJTtcXG59XFxuaHIge1xcbiAgbWFyZ2luLXRvcDogMjBweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBib3JkZXI6IDA7XFxuICBib3JkZXItdG9wOiAxcHggc29saWQgI2VlZWVlZTtcXG59XFxuLnNyLW9ubHkge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgd2lkdGg6IDFweDtcXG4gIGhlaWdodDogMXB4O1xcbiAgbWFyZ2luOiAtMXB4O1xcbiAgcGFkZGluZzogMDtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxuICBjbGlwOiByZWN0KDAsIDAsIDAsIDApO1xcbiAgYm9yZGVyOiAwO1xcbn1cXG5oMSxcXG5oMixcXG5oMyxcXG5oNCxcXG5oNSxcXG5oNixcXG4uaDEsXFxuLmgyLFxcbi5oMyxcXG4uaDQsXFxuLmg1LFxcbi5oNiB7XFxuICBmb250LWZhbWlseTogaW5oZXJpdDtcXG4gIGZvbnQtd2VpZ2h0OiA1MDA7XFxuICBsaW5lLWhlaWdodDogMS4xO1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbmgxIHNtYWxsLFxcbmgyIHNtYWxsLFxcbmgzIHNtYWxsLFxcbmg0IHNtYWxsLFxcbmg1IHNtYWxsLFxcbmg2IHNtYWxsLFxcbi5oMSBzbWFsbCxcXG4uaDIgc21hbGwsXFxuLmgzIHNtYWxsLFxcbi5oNCBzbWFsbCxcXG4uaDUgc21hbGwsXFxuLmg2IHNtYWxsLFxcbmgxIC5zbWFsbCxcXG5oMiAuc21hbGwsXFxuaDMgLnNtYWxsLFxcbmg0IC5zbWFsbCxcXG5oNSAuc21hbGwsXFxuaDYgLnNtYWxsLFxcbi5oMSAuc21hbGwsXFxuLmgyIC5zbWFsbCxcXG4uaDMgLnNtYWxsLFxcbi5oNCAuc21hbGwsXFxuLmg1IC5zbWFsbCxcXG4uaDYgLnNtYWxsIHtcXG4gIGZvbnQtd2VpZ2h0OiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMTtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbn1cXG5oMSxcXG4uaDEsXFxuaDIsXFxuLmgyLFxcbmgzLFxcbi5oMyB7XFxuICBtYXJnaW4tdG9wOiAyMHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMTBweDtcXG59XFxuaDEgc21hbGwsXFxuLmgxIHNtYWxsLFxcbmgyIHNtYWxsLFxcbi5oMiBzbWFsbCxcXG5oMyBzbWFsbCxcXG4uaDMgc21hbGwsXFxuaDEgLnNtYWxsLFxcbi5oMSAuc21hbGwsXFxuaDIgLnNtYWxsLFxcbi5oMiAuc21hbGwsXFxuaDMgLnNtYWxsLFxcbi5oMyAuc21hbGwge1xcbiAgZm9udC1zaXplOiA2NSU7XFxufVxcbmg0LFxcbi5oNCxcXG5oNSxcXG4uaDUsXFxuaDYsXFxuLmg2IHtcXG4gIG1hcmdpbi10b3A6IDEwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAxMHB4O1xcbn1cXG5oNCBzbWFsbCxcXG4uaDQgc21hbGwsXFxuaDUgc21hbGwsXFxuLmg1IHNtYWxsLFxcbmg2IHNtYWxsLFxcbi5oNiBzbWFsbCxcXG5oNCAuc21hbGwsXFxuLmg0IC5zbWFsbCxcXG5oNSAuc21hbGwsXFxuLmg1IC5zbWFsbCxcXG5oNiAuc21hbGwsXFxuLmg2IC5zbWFsbCB7XFxuICBmb250LXNpemU6IDc1JTtcXG59XFxuaDEsXFxuLmgxIHtcXG4gIGZvbnQtc2l6ZTogMzZweDtcXG59XFxuaDIsXFxuLmgyIHtcXG4gIGZvbnQtc2l6ZTogMzBweDtcXG59XFxuaDMsXFxuLmgzIHtcXG4gIGZvbnQtc2l6ZTogMjRweDtcXG59XFxuaDQsXFxuLmg0IHtcXG4gIGZvbnQtc2l6ZTogMThweDtcXG59XFxuaDUsXFxuLmg1IHtcXG4gIGZvbnQtc2l6ZTogMTRweDtcXG59XFxuaDYsXFxuLmg2IHtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG59XFxucCB7XFxuICBtYXJnaW46IDAgMCAxMHB4O1xcbn1cXG4ubGVhZCB7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgZm9udC1zaXplOiAxNnB4O1xcbiAgZm9udC13ZWlnaHQ6IDIwMDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQ7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmxlYWQge1xcbiAgICBmb250LXNpemU6IDIxcHg7XFxuICB9XFxufVxcbnNtYWxsLFxcbi5zbWFsbCB7XFxuICBmb250LXNpemU6IDg1JTtcXG59XFxuY2l0ZSB7XFxuICBmb250LXN0eWxlOiBub3JtYWw7XFxufVxcbi50ZXh0LWxlZnQge1xcbiAgdGV4dC1hbGlnbjogbGVmdDtcXG59XFxuLnRleHQtcmlnaHQge1xcbiAgdGV4dC1hbGlnbjogcmlnaHQ7XFxufVxcbi50ZXh0LWNlbnRlciB7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxufVxcbi50ZXh0LWp1c3RpZnkge1xcbiAgdGV4dC1hbGlnbjoganVzdGlmeTtcXG59XFxuLnRleHQtbXV0ZWQge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi50ZXh0LXByaW1hcnkge1xcbiAgY29sb3I6ICM0MjhiY2E7XFxufVxcbmEudGV4dC1wcmltYXJ5OmhvdmVyIHtcXG4gIGNvbG9yOiAjMzA3MWE5O1xcbn1cXG4udGV4dC1zdWNjZXNzIHtcXG4gIGNvbG9yOiAjM2M3NjNkO1xcbn1cXG5hLnRleHQtc3VjY2Vzczpob3ZlciB7XFxuICBjb2xvcjogIzJiNTQyYztcXG59XFxuLnRleHQtaW5mbyB7XFxuICBjb2xvcjogIzMxNzA4ZjtcXG59XFxuYS50ZXh0LWluZm86aG92ZXIge1xcbiAgY29sb3I6ICMyNDUyNjk7XFxufVxcbi50ZXh0LXdhcm5pbmcge1xcbiAgY29sb3I6ICM4YTZkM2I7XFxufVxcbmEudGV4dC13YXJuaW5nOmhvdmVyIHtcXG4gIGNvbG9yOiAjNjY1MTJjO1xcbn1cXG4udGV4dC1kYW5nZXIge1xcbiAgY29sb3I6ICNhOTQ0NDI7XFxufVxcbmEudGV4dC1kYW5nZXI6aG92ZXIge1xcbiAgY29sb3I6ICM4NDM1MzQ7XFxufVxcbi5iZy1wcmltYXJ5IHtcXG4gIGNvbG9yOiAjZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG59XFxuYS5iZy1wcmltYXJ5OmhvdmVyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMzMDcxYTk7XFxufVxcbi5iZy1zdWNjZXNzIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZmYwZDg7XFxufVxcbmEuYmctc3VjY2Vzczpob3ZlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjYzFlMmIzO1xcbn1cXG4uYmctaW5mbyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDllZGY3O1xcbn1cXG5hLmJnLWluZm86aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2FmZDllZTtcXG59XFxuLmJnLXdhcm5pbmcge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZjZjhlMztcXG59XFxuYS5iZy13YXJuaW5nOmhvdmVyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmN2VjYjU7XFxufVxcbi5iZy1kYW5nZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YyZGVkZTtcXG59XFxuYS5iZy1kYW5nZXI6aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2U0YjliOTtcXG59XFxuLnBhZ2UtaGVhZGVyIHtcXG4gIHBhZGRpbmctYm90dG9tOiA5cHg7XFxuICBtYXJnaW46IDQwcHggMCAyMHB4O1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWVlZWU7XFxufVxcbnVsLFxcbm9sIHtcXG4gIG1hcmdpbi10b3A6IDA7XFxuICBtYXJnaW4tYm90dG9tOiAxMHB4O1xcbn1cXG51bCB1bCxcXG5vbCB1bCxcXG51bCBvbCxcXG5vbCBvbCB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbn1cXG4ubGlzdC11bnN0eWxlZCB7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbn1cXG4ubGlzdC1pbmxpbmUge1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIG1hcmdpbi1sZWZ0OiAtNXB4O1xcbn1cXG4ubGlzdC1pbmxpbmUgPiBsaSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBwYWRkaW5nLWxlZnQ6IDVweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDVweDtcXG59XFxuZGwge1xcbiAgbWFyZ2luLXRvcDogMDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxufVxcbmR0LFxcbmRkIHtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbn1cXG5kdCB7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG59XFxuZGQge1xcbiAgbWFyZ2luLWxlZnQ6IDA7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmRsLWhvcml6b250YWwgZHQge1xcbiAgICBmbG9hdDogbGVmdDtcXG4gICAgd2lkdGg6IDE2MHB4O1xcbiAgICBjbGVhcjogbGVmdDtcXG4gICAgdGV4dC1hbGlnbjogcmlnaHQ7XFxuICAgIG92ZXJmbG93OiBoaWRkZW47XFxuICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzO1xcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbiAgfVxcbiAgLmRsLWhvcml6b250YWwgZGQge1xcbiAgICBtYXJnaW4tbGVmdDogMTgwcHg7XFxuICB9XFxufVxcbmFiYnJbdGl0bGVdLFxcbmFiYnJbZGF0YS1vcmlnaW5hbC10aXRsZV0ge1xcbiAgY3Vyc29yOiBoZWxwO1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZCAjOTk5OTk5O1xcbn1cXG4uaW5pdGlhbGlzbSB7XFxuICBmb250LXNpemU6IDkwJTtcXG4gIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XFxufVxcbmJsb2NrcXVvdGUge1xcbiAgcGFkZGluZzogMTBweCAyMHB4O1xcbiAgbWFyZ2luOiAwIDAgMjBweDtcXG4gIGZvbnQtc2l6ZTogMTcuNXB4O1xcbiAgYm9yZGVyLWxlZnQ6IDVweCBzb2xpZCAjZWVlZWVlO1xcbn1cXG5ibG9ja3F1b3RlIHA6bGFzdC1jaGlsZCxcXG5ibG9ja3F1b3RlIHVsOmxhc3QtY2hpbGQsXFxuYmxvY2txdW90ZSBvbDpsYXN0LWNoaWxkIHtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxufVxcbmJsb2NrcXVvdGUgZm9vdGVyLFxcbmJsb2NrcXVvdGUgc21hbGwsXFxuYmxvY2txdW90ZSAuc21hbGwge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBmb250LXNpemU6IDgwJTtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbmJsb2NrcXVvdGUgZm9vdGVyOmJlZm9yZSxcXG5ibG9ja3F1b3RlIHNtYWxsOmJlZm9yZSxcXG5ibG9ja3F1b3RlIC5zbWFsbDpiZWZvcmUge1xcbiAgY29udGVudDogJ1xcXFwyMDE0IFxcXFwwMEEwJztcXG59XFxuLmJsb2NrcXVvdGUtcmV2ZXJzZSxcXG5ibG9ja3F1b3RlLnB1bGwtcmlnaHQge1xcbiAgcGFkZGluZy1yaWdodDogMTVweDtcXG4gIHBhZGRpbmctbGVmdDogMDtcXG4gIGJvcmRlci1yaWdodDogNXB4IHNvbGlkICNlZWVlZWU7XFxuICBib3JkZXItbGVmdDogMDtcXG4gIHRleHQtYWxpZ246IHJpZ2h0O1xcbn1cXG4uYmxvY2txdW90ZS1yZXZlcnNlIGZvb3RlcjpiZWZvcmUsXFxuYmxvY2txdW90ZS5wdWxsLXJpZ2h0IGZvb3RlcjpiZWZvcmUsXFxuLmJsb2NrcXVvdGUtcmV2ZXJzZSBzbWFsbDpiZWZvcmUsXFxuYmxvY2txdW90ZS5wdWxsLXJpZ2h0IHNtYWxsOmJlZm9yZSxcXG4uYmxvY2txdW90ZS1yZXZlcnNlIC5zbWFsbDpiZWZvcmUsXFxuYmxvY2txdW90ZS5wdWxsLXJpZ2h0IC5zbWFsbDpiZWZvcmUge1xcbiAgY29udGVudDogJyc7XFxufVxcbi5ibG9ja3F1b3RlLXJldmVyc2UgZm9vdGVyOmFmdGVyLFxcbmJsb2NrcXVvdGUucHVsbC1yaWdodCBmb290ZXI6YWZ0ZXIsXFxuLmJsb2NrcXVvdGUtcmV2ZXJzZSBzbWFsbDphZnRlcixcXG5ibG9ja3F1b3RlLnB1bGwtcmlnaHQgc21hbGw6YWZ0ZXIsXFxuLmJsb2NrcXVvdGUtcmV2ZXJzZSAuc21hbGw6YWZ0ZXIsXFxuYmxvY2txdW90ZS5wdWxsLXJpZ2h0IC5zbWFsbDphZnRlciB7XFxuICBjb250ZW50OiAnXFxcXDAwQTAgXFxcXDIwMTQnO1xcbn1cXG5ibG9ja3F1b3RlOmJlZm9yZSxcXG5ibG9ja3F1b3RlOmFmdGVyIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFwiO1xcbn1cXG5hZGRyZXNzIHtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBmb250LXN0eWxlOiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG59XFxuY29kZSxcXG5rYmQsXFxucHJlLFxcbnNhbXAge1xcbiAgZm9udC1mYW1pbHk6IE1lbmxvLCBNb25hY28sIENvbnNvbGFzLCBcXFwiQ291cmllciBOZXdcXFwiLCBtb25vc3BhY2U7XFxufVxcbmNvZGUge1xcbiAgcGFkZGluZzogMnB4IDRweDtcXG4gIGZvbnQtc2l6ZTogOTAlO1xcbiAgY29sb3I6ICNjNzI1NGU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjlmMmY0O1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxua2JkIHtcXG4gIHBhZGRpbmc6IDJweCA0cHg7XFxuICBmb250LXNpemU6IDkwJTtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMzMzMzMztcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgLTFweCAwIHJnYmEoMCwgMCwgMCwgMC4yNSk7XFxufVxcbnByZSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBhZGRpbmc6IDkuNXB4O1xcbiAgbWFyZ2luOiAwIDAgMTBweDtcXG4gIGZvbnQtc2l6ZTogMTNweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgd29yZC1icmVhazogYnJlYWstYWxsO1xcbiAgd29yZC13cmFwOiBicmVhay13b3JkO1xcbiAgY29sb3I6ICMzMzMzMzM7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2NjY2NjYztcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxucHJlIGNvZGUge1xcbiAgcGFkZGluZzogMDtcXG4gIGZvbnQtc2l6ZTogaW5oZXJpdDtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbiAgd2hpdGUtc3BhY2U6IHByZS13cmFwO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4ucHJlLXNjcm9sbGFibGUge1xcbiAgbWF4LWhlaWdodDogMzQwcHg7XFxuICBvdmVyZmxvdy15OiBzY3JvbGw7XFxufVxcbi5jb250YWluZXIge1xcbiAgbWFyZ2luLXJpZ2h0OiBhdXRvO1xcbiAgbWFyZ2luLWxlZnQ6IGF1dG87XFxuICBwYWRkaW5nLWxlZnQ6IDE1cHg7XFxuICBwYWRkaW5nLXJpZ2h0OiAxNXB4O1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5jb250YWluZXIge1xcbiAgICB3aWR0aDogNzUwcHg7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA5OTJweCkge1xcbiAgLmNvbnRhaW5lciB7XFxuICAgIHdpZHRoOiA5NzBweDtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDEyMDBweCkge1xcbiAgLmNvbnRhaW5lciB7XFxuICAgIHdpZHRoOiAxMTcwcHg7XFxuICB9XFxufVxcbi5jb250YWluZXItZmx1aWQge1xcbiAgbWFyZ2luLXJpZ2h0OiBhdXRvO1xcbiAgbWFyZ2luLWxlZnQ6IGF1dG87XFxuICBwYWRkaW5nLWxlZnQ6IDE1cHg7XFxuICBwYWRkaW5nLXJpZ2h0OiAxNXB4O1xcbn1cXG4ucm93IHtcXG4gIG1hcmdpbi1sZWZ0OiAtMTVweDtcXG4gIG1hcmdpbi1yaWdodDogLTE1cHg7XFxufVxcbi5jb2wteHMtMSwgLmNvbC1zbS0xLCAuY29sLW1kLTEsIC5jb2wtbGctMSwgLmNvbC14cy0yLCAuY29sLXNtLTIsIC5jb2wtbWQtMiwgLmNvbC1sZy0yLCAuY29sLXhzLTMsIC5jb2wtc20tMywgLmNvbC1tZC0zLCAuY29sLWxnLTMsIC5jb2wteHMtNCwgLmNvbC1zbS00LCAuY29sLW1kLTQsIC5jb2wtbGctNCwgLmNvbC14cy01LCAuY29sLXNtLTUsIC5jb2wtbWQtNSwgLmNvbC1sZy01LCAuY29sLXhzLTYsIC5jb2wtc20tNiwgLmNvbC1tZC02LCAuY29sLWxnLTYsIC5jb2wteHMtNywgLmNvbC1zbS03LCAuY29sLW1kLTcsIC5jb2wtbGctNywgLmNvbC14cy04LCAuY29sLXNtLTgsIC5jb2wtbWQtOCwgLmNvbC1sZy04LCAuY29sLXhzLTksIC5jb2wtc20tOSwgLmNvbC1tZC05LCAuY29sLWxnLTksIC5jb2wteHMtMTAsIC5jb2wtc20tMTAsIC5jb2wtbWQtMTAsIC5jb2wtbGctMTAsIC5jb2wteHMtMTEsIC5jb2wtc20tMTEsIC5jb2wtbWQtMTEsIC5jb2wtbGctMTEsIC5jb2wteHMtMTIsIC5jb2wtc20tMTIsIC5jb2wtbWQtMTIsIC5jb2wtbGctMTIge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgbWluLWhlaWdodDogMXB4O1xcbiAgcGFkZGluZy1sZWZ0OiAxNXB4O1xcbiAgcGFkZGluZy1yaWdodDogMTVweDtcXG59XFxuLmNvbC14cy0xLCAuY29sLXhzLTIsIC5jb2wteHMtMywgLmNvbC14cy00LCAuY29sLXhzLTUsIC5jb2wteHMtNiwgLmNvbC14cy03LCAuY29sLXhzLTgsIC5jb2wteHMtOSwgLmNvbC14cy0xMCwgLmNvbC14cy0xMSwgLmNvbC14cy0xMiB7XFxuICBmbG9hdDogbGVmdDtcXG59XFxuLmNvbC14cy0xMiB7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuLmNvbC14cy0xMSB7XFxuICB3aWR0aDogOTEuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLTEwIHtcXG4gIHdpZHRoOiA4My4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtOSB7XFxuICB3aWR0aDogNzUlO1xcbn1cXG4uY29sLXhzLTgge1xcbiAgd2lkdGg6IDY2LjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy03IHtcXG4gIHdpZHRoOiA1OC4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtNiB7XFxuICB3aWR0aDogNTAlO1xcbn1cXG4uY29sLXhzLTUge1xcbiAgd2lkdGg6IDQxLjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy00IHtcXG4gIHdpZHRoOiAzMy4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtMyB7XFxuICB3aWR0aDogMjUlO1xcbn1cXG4uY29sLXhzLTIge1xcbiAgd2lkdGg6IDE2LjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy0xIHtcXG4gIHdpZHRoOiA4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdWxsLTEyIHtcXG4gIHJpZ2h0OiAxMDAlO1xcbn1cXG4uY29sLXhzLXB1bGwtMTEge1xcbiAgcmlnaHQ6IDkxLjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdWxsLTEwIHtcXG4gIHJpZ2h0OiA4My4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtcHVsbC05IHtcXG4gIHJpZ2h0OiA3NSU7XFxufVxcbi5jb2wteHMtcHVsbC04IHtcXG4gIHJpZ2h0OiA2Ni42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtcHVsbC03IHtcXG4gIHJpZ2h0OiA1OC4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtcHVsbC02IHtcXG4gIHJpZ2h0OiA1MCU7XFxufVxcbi5jb2wteHMtcHVsbC01IHtcXG4gIHJpZ2h0OiA0MS42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtcHVsbC00IHtcXG4gIHJpZ2h0OiAzMy4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtcHVsbC0zIHtcXG4gIHJpZ2h0OiAyNSU7XFxufVxcbi5jb2wteHMtcHVsbC0yIHtcXG4gIHJpZ2h0OiAxNi42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtcHVsbC0xIHtcXG4gIHJpZ2h0OiA4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdWxsLTAge1xcbiAgcmlnaHQ6IDAlO1xcbn1cXG4uY29sLXhzLXB1c2gtMTIge1xcbiAgbGVmdDogMTAwJTtcXG59XFxuLmNvbC14cy1wdXNoLTExIHtcXG4gIGxlZnQ6IDkxLjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdXNoLTEwIHtcXG4gIGxlZnQ6IDgzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdXNoLTkge1xcbiAgbGVmdDogNzUlO1xcbn1cXG4uY29sLXhzLXB1c2gtOCB7XFxuICBsZWZ0OiA2Ni42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtcHVzaC03IHtcXG4gIGxlZnQ6IDU4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdXNoLTYge1xcbiAgbGVmdDogNTAlO1xcbn1cXG4uY29sLXhzLXB1c2gtNSB7XFxuICBsZWZ0OiA0MS42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtcHVzaC00IHtcXG4gIGxlZnQ6IDMzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdXNoLTMge1xcbiAgbGVmdDogMjUlO1xcbn1cXG4uY29sLXhzLXB1c2gtMiB7XFxuICBsZWZ0OiAxNi42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtcHVzaC0xIHtcXG4gIGxlZnQ6IDguMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLXB1c2gtMCB7XFxuICBsZWZ0OiAwJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtMTIge1xcbiAgbWFyZ2luLWxlZnQ6IDEwMCU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTExIHtcXG4gIG1hcmdpbi1sZWZ0OiA5MS42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTEwIHtcXG4gIG1hcmdpbi1sZWZ0OiA4My4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTkge1xcbiAgbWFyZ2luLWxlZnQ6IDc1JTtcXG59XFxuLmNvbC14cy1vZmZzZXQtOCB7XFxuICBtYXJnaW4tbGVmdDogNjYuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLW9mZnNldC03IHtcXG4gIG1hcmdpbi1sZWZ0OiA1OC4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTYge1xcbiAgbWFyZ2luLWxlZnQ6IDUwJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtNSB7XFxuICBtYXJnaW4tbGVmdDogNDEuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLW9mZnNldC00IHtcXG4gIG1hcmdpbi1sZWZ0OiAzMy4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTMge1xcbiAgbWFyZ2luLWxlZnQ6IDI1JTtcXG59XFxuLmNvbC14cy1vZmZzZXQtMiB7XFxuICBtYXJnaW4tbGVmdDogMTYuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLW9mZnNldC0xIHtcXG4gIG1hcmdpbi1sZWZ0OiA4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtMCB7XFxuICBtYXJnaW4tbGVmdDogMCU7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmNvbC1zbS0xLCAuY29sLXNtLTIsIC5jb2wtc20tMywgLmNvbC1zbS00LCAuY29sLXNtLTUsIC5jb2wtc20tNiwgLmNvbC1zbS03LCAuY29sLXNtLTgsIC5jb2wtc20tOSwgLmNvbC1zbS0xMCwgLmNvbC1zbS0xMSwgLmNvbC1zbS0xMiB7XFxuICAgIGZsb2F0OiBsZWZ0O1xcbiAgfVxcbiAgLmNvbC1zbS0xMiB7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1zbS0xMSB7XFxuICAgIHdpZHRoOiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLTEwIHtcXG4gICAgd2lkdGg6IDgzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tOSB7XFxuICAgIHdpZHRoOiA3NSU7XFxuICB9XFxuICAuY29sLXNtLTgge1xcbiAgICB3aWR0aDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS03IHtcXG4gICAgd2lkdGg6IDU4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tNiB7XFxuICAgIHdpZHRoOiA1MCU7XFxuICB9XFxuICAuY29sLXNtLTUge1xcbiAgICB3aWR0aDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS00IHtcXG4gICAgd2lkdGg6IDMzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tMyB7XFxuICAgIHdpZHRoOiAyNSU7XFxuICB9XFxuICAuY29sLXNtLTIge1xcbiAgICB3aWR0aDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS0xIHtcXG4gICAgd2lkdGg6IDguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTEyIHtcXG4gICAgcmlnaHQ6IDEwMCU7XFxuICB9XFxuICAuY29sLXNtLXB1bGwtMTEge1xcbiAgICByaWdodDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTEwIHtcXG4gICAgcmlnaHQ6IDgzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC05IHtcXG4gICAgcmlnaHQ6IDc1JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC04IHtcXG4gICAgcmlnaHQ6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC03IHtcXG4gICAgcmlnaHQ6IDU4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC02IHtcXG4gICAgcmlnaHQ6IDUwJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC01IHtcXG4gICAgcmlnaHQ6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC00IHtcXG4gICAgcmlnaHQ6IDMzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC0zIHtcXG4gICAgcmlnaHQ6IDI1JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC0yIHtcXG4gICAgcmlnaHQ6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC0xIHtcXG4gICAgcmlnaHQ6IDguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTAge1xcbiAgICByaWdodDogMCU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtMTIge1xcbiAgICBsZWZ0OiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTExIHtcXG4gICAgbGVmdDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTEwIHtcXG4gICAgbGVmdDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTkge1xcbiAgICBsZWZ0OiA3NSU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtOCB7XFxuICAgIGxlZnQ6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC03IHtcXG4gICAgbGVmdDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTYge1xcbiAgICBsZWZ0OiA1MCU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtNSB7XFxuICAgIGxlZnQ6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC00IHtcXG4gICAgbGVmdDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTMge1xcbiAgICBsZWZ0OiAyNSU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtMiB7XFxuICAgIGxlZnQ6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC0xIHtcXG4gICAgbGVmdDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtMCB7XFxuICAgIGxlZnQ6IDAlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtMTIge1xcbiAgICBtYXJnaW4tbGVmdDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTExIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTEwIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDgzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTkge1xcbiAgICBtYXJnaW4tbGVmdDogNzUlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtOCB7XFxuICAgIG1hcmdpbi1sZWZ0OiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC03IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDU4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTYge1xcbiAgICBtYXJnaW4tbGVmdDogNTAlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtNSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC00IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDMzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTMge1xcbiAgICBtYXJnaW4tbGVmdDogMjUlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtMiB7XFxuICAgIG1hcmdpbi1sZWZ0OiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC0xIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtMCB7XFxuICAgIG1hcmdpbi1sZWZ0OiAwJTtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDk5MnB4KSB7XFxuICAuY29sLW1kLTEsIC5jb2wtbWQtMiwgLmNvbC1tZC0zLCAuY29sLW1kLTQsIC5jb2wtbWQtNSwgLmNvbC1tZC02LCAuY29sLW1kLTcsIC5jb2wtbWQtOCwgLmNvbC1tZC05LCAuY29sLW1kLTEwLCAuY29sLW1kLTExLCAuY29sLW1kLTEyIHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICB9XFxuICAuY29sLW1kLTEyIHtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICB9XFxuICAuY29sLW1kLTExIHtcXG4gICAgd2lkdGg6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtMTAge1xcbiAgICB3aWR0aDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC05IHtcXG4gICAgd2lkdGg6IDc1JTtcXG4gIH1cXG4gIC5jb2wtbWQtOCB7XFxuICAgIHdpZHRoOiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLTcge1xcbiAgICB3aWR0aDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC02IHtcXG4gICAgd2lkdGg6IDUwJTtcXG4gIH1cXG4gIC5jb2wtbWQtNSB7XFxuICAgIHdpZHRoOiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLTQge1xcbiAgICB3aWR0aDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC0zIHtcXG4gICAgd2lkdGg6IDI1JTtcXG4gIH1cXG4gIC5jb2wtbWQtMiB7XFxuICAgIHdpZHRoOiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLTEge1xcbiAgICB3aWR0aDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtMTIge1xcbiAgICByaWdodDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVsbC0xMSB7XFxuICAgIHJpZ2h0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtMTAge1xcbiAgICByaWdodDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTkge1xcbiAgICByaWdodDogNzUlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTgge1xcbiAgICByaWdodDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTcge1xcbiAgICByaWdodDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTYge1xcbiAgICByaWdodDogNTAlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTUge1xcbiAgICByaWdodDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTQge1xcbiAgICByaWdodDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTMge1xcbiAgICByaWdodDogMjUlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTIge1xcbiAgICByaWdodDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTEge1xcbiAgICByaWdodDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtMCB7XFxuICAgIHJpZ2h0OiAwJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC0xMiB7XFxuICAgIGxlZnQ6IDEwMCU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtMTEge1xcbiAgICBsZWZ0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtMTAge1xcbiAgICBsZWZ0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtOSB7XFxuICAgIGxlZnQ6IDc1JTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC04IHtcXG4gICAgbGVmdDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTcge1xcbiAgICBsZWZ0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtNiB7XFxuICAgIGxlZnQ6IDUwJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC01IHtcXG4gICAgbGVmdDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTQge1xcbiAgICBsZWZ0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtMyB7XFxuICAgIGxlZnQ6IDI1JTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC0yIHtcXG4gICAgbGVmdDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTEge1xcbiAgICBsZWZ0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC0wIHtcXG4gICAgbGVmdDogMCU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC0xMiB7XFxuICAgIG1hcmdpbi1sZWZ0OiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtMTEge1xcbiAgICBtYXJnaW4tbGVmdDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtMTAge1xcbiAgICBtYXJnaW4tbGVmdDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtOSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA3NSU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC04IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTcge1xcbiAgICBtYXJnaW4tbGVmdDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtNiB7XFxuICAgIG1hcmdpbi1sZWZ0OiA1MCU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC01IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTQge1xcbiAgICBtYXJnaW4tbGVmdDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtMyB7XFxuICAgIG1hcmdpbi1sZWZ0OiAyNSU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC0yIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTEge1xcbiAgICBtYXJnaW4tbGVmdDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC0wIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDAlO1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogMTIwMHB4KSB7XFxuICAuY29sLWxnLTEsIC5jb2wtbGctMiwgLmNvbC1sZy0zLCAuY29sLWxnLTQsIC5jb2wtbGctNSwgLmNvbC1sZy02LCAuY29sLWxnLTcsIC5jb2wtbGctOCwgLmNvbC1sZy05LCAuY29sLWxnLTEwLCAuY29sLWxnLTExLCAuY29sLWxnLTEyIHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICB9XFxuICAuY29sLWxnLTEyIHtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICB9XFxuICAuY29sLWxnLTExIHtcXG4gICAgd2lkdGg6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctMTAge1xcbiAgICB3aWR0aDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy05IHtcXG4gICAgd2lkdGg6IDc1JTtcXG4gIH1cXG4gIC5jb2wtbGctOCB7XFxuICAgIHdpZHRoOiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLTcge1xcbiAgICB3aWR0aDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy02IHtcXG4gICAgd2lkdGg6IDUwJTtcXG4gIH1cXG4gIC5jb2wtbGctNSB7XFxuICAgIHdpZHRoOiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLTQge1xcbiAgICB3aWR0aDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy0zIHtcXG4gICAgd2lkdGg6IDI1JTtcXG4gIH1cXG4gIC5jb2wtbGctMiB7XFxuICAgIHdpZHRoOiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLTEge1xcbiAgICB3aWR0aDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtMTIge1xcbiAgICByaWdodDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVsbC0xMSB7XFxuICAgIHJpZ2h0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtMTAge1xcbiAgICByaWdodDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTkge1xcbiAgICByaWdodDogNzUlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTgge1xcbiAgICByaWdodDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTcge1xcbiAgICByaWdodDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTYge1xcbiAgICByaWdodDogNTAlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTUge1xcbiAgICByaWdodDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTQge1xcbiAgICByaWdodDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTMge1xcbiAgICByaWdodDogMjUlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTIge1xcbiAgICByaWdodDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTEge1xcbiAgICByaWdodDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtMCB7XFxuICAgIHJpZ2h0OiAwJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC0xMiB7XFxuICAgIGxlZnQ6IDEwMCU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtMTEge1xcbiAgICBsZWZ0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtMTAge1xcbiAgICBsZWZ0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtOSB7XFxuICAgIGxlZnQ6IDc1JTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC04IHtcXG4gICAgbGVmdDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTcge1xcbiAgICBsZWZ0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtNiB7XFxuICAgIGxlZnQ6IDUwJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC01IHtcXG4gICAgbGVmdDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTQge1xcbiAgICBsZWZ0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtMyB7XFxuICAgIGxlZnQ6IDI1JTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC0yIHtcXG4gICAgbGVmdDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTEge1xcbiAgICBsZWZ0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC0wIHtcXG4gICAgbGVmdDogMCU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC0xMiB7XFxuICAgIG1hcmdpbi1sZWZ0OiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtMTEge1xcbiAgICBtYXJnaW4tbGVmdDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtMTAge1xcbiAgICBtYXJnaW4tbGVmdDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtOSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA3NSU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC04IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTcge1xcbiAgICBtYXJnaW4tbGVmdDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtNiB7XFxuICAgIG1hcmdpbi1sZWZ0OiA1MCU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC01IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTQge1xcbiAgICBtYXJnaW4tbGVmdDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtMyB7XFxuICAgIG1hcmdpbi1sZWZ0OiAyNSU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC0yIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTEge1xcbiAgICBtYXJnaW4tbGVmdDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC0wIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDAlO1xcbiAgfVxcbn1cXG50YWJsZSB7XFxuICBtYXgtd2lkdGg6IDEwMCU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxudGgge1xcbiAgdGV4dC1hbGlnbjogbGVmdDtcXG59XFxuLnRhYmxlIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG59XFxuLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRoLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0aCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGgsXFxuLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRkLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0ZCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGQge1xcbiAgcGFkZGluZzogOHB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICB2ZXJ0aWNhbC1hbGlnbjogdG9wO1xcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNkZGRkZGQ7XFxufVxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0aCB7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYm90dG9tO1xcbiAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNkZGRkZGQ7XFxufVxcbi50YWJsZSA+IGNhcHRpb24gKyB0aGVhZCA+IHRyOmZpcnN0LWNoaWxkID4gdGgsXFxuLnRhYmxlID4gY29sZ3JvdXAgKyB0aGVhZCA+IHRyOmZpcnN0LWNoaWxkID4gdGgsXFxuLnRhYmxlID4gdGhlYWQ6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCA+IHRoLFxcbi50YWJsZSA+IGNhcHRpb24gKyB0aGVhZCA+IHRyOmZpcnN0LWNoaWxkID4gdGQsXFxuLnRhYmxlID4gY29sZ3JvdXAgKyB0aGVhZCA+IHRyOmZpcnN0LWNoaWxkID4gdGQsXFxuLnRhYmxlID4gdGhlYWQ6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCA+IHRkIHtcXG4gIGJvcmRlci10b3A6IDA7XFxufVxcbi50YWJsZSA+IHRib2R5ICsgdGJvZHkge1xcbiAgYm9yZGVyLXRvcDogMnB4IHNvbGlkICNkZGRkZGQ7XFxufVxcbi50YWJsZSAudGFibGUge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLnRhYmxlLWNvbmRlbnNlZCA+IHRoZWFkID4gdHIgPiB0aCxcXG4udGFibGUtY29uZGVuc2VkID4gdGJvZHkgPiB0ciA+IHRoLFxcbi50YWJsZS1jb25kZW5zZWQgPiB0Zm9vdCA+IHRyID4gdGgsXFxuLnRhYmxlLWNvbmRlbnNlZCA+IHRoZWFkID4gdHIgPiB0ZCxcXG4udGFibGUtY29uZGVuc2VkID4gdGJvZHkgPiB0ciA+IHRkLFxcbi50YWJsZS1jb25kZW5zZWQgPiB0Zm9vdCA+IHRyID4gdGQge1xcbiAgcGFkZGluZzogNXB4O1xcbn1cXG4udGFibGUtYm9yZGVyZWQge1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoLFxcbi50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0aCxcXG4udGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGgsXFxuLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkLFxcbi50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0ZCxcXG4udGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQge1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoLFxcbi50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0ZCB7XFxuICBib3JkZXItYm90dG9tLXdpZHRoOiAycHg7XFxufVxcbi50YWJsZS1zdHJpcGVkID4gdGJvZHkgPiB0cjpudGgtY2hpbGQob2RkKSA+IHRkLFxcbi50YWJsZS1zdHJpcGVkID4gdGJvZHkgPiB0cjpudGgtY2hpbGQob2RkKSA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmOWY5Zjk7XFxufVxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHI6aG92ZXIgPiB0ZCxcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyOmhvdmVyID4gdGgge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG59XFxudGFibGUgY29sW2NsYXNzKj1cXFwiY29sLVxcXCJdIHtcXG4gIHBvc2l0aW9uOiBzdGF0aWM7XFxuICBmbG9hdDogbm9uZTtcXG4gIGRpc3BsYXk6IHRhYmxlLWNvbHVtbjtcXG59XFxudGFibGUgdGRbY2xhc3MqPVxcXCJjb2wtXFxcIl0sXFxudGFibGUgdGhbY2xhc3MqPVxcXCJjb2wtXFxcIl0ge1xcbiAgcG9zaXRpb246IHN0YXRpYztcXG4gIGZsb2F0OiBub25lO1xcbiAgZGlzcGxheTogdGFibGUtY2VsbDtcXG59XFxuLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRkLmFjdGl2ZSxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGQuYWN0aXZlLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0ZC5hY3RpdmUsXFxuLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRoLmFjdGl2ZSxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGguYWN0aXZlLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0aC5hY3RpdmUsXFxuLnRhYmxlID4gdGhlYWQgPiB0ci5hY3RpdmUgPiB0ZCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLmFjdGl2ZSA+IHRkLFxcbi50YWJsZSA+IHRmb290ID4gdHIuYWN0aXZlID4gdGQsXFxuLnRhYmxlID4gdGhlYWQgPiB0ci5hY3RpdmUgPiB0aCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLmFjdGl2ZSA+IHRoLFxcbi50YWJsZSA+IHRmb290ID4gdHIuYWN0aXZlID4gdGgge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG59XFxuLnRhYmxlLWhvdmVyID4gdGJvZHkgPiB0ciA+IHRkLmFjdGl2ZTpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGguYWN0aXZlOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIuYWN0aXZlOmhvdmVyID4gdGQsXFxuLnRhYmxlLWhvdmVyID4gdGJvZHkgPiB0ci5hY3RpdmU6aG92ZXIgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZThlOGU4O1xcbn1cXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGQuc3VjY2VzcyxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGQuc3VjY2VzcyxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGQuc3VjY2VzcyxcXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGguc3VjY2VzcyxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGguc3VjY2VzcyxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGguc3VjY2VzcyxcXG4udGFibGUgPiB0aGVhZCA+IHRyLnN1Y2Nlc3MgPiB0ZCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLnN1Y2Nlc3MgPiB0ZCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLnN1Y2Nlc3MgPiB0ZCxcXG4udGFibGUgPiB0aGVhZCA+IHRyLnN1Y2Nlc3MgPiB0aCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLnN1Y2Nlc3MgPiB0aCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLnN1Y2Nlc3MgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZGZmMGQ4O1xcbn1cXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGQuc3VjY2Vzczpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGguc3VjY2Vzczpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLnN1Y2Nlc3M6aG92ZXIgPiB0ZCxcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLnN1Y2Nlc3M6aG92ZXIgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDBlOWM2O1xcbn1cXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGQuaW5mbyxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGQuaW5mbyxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGQuaW5mbyxcXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGguaW5mbyxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGguaW5mbyxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGguaW5mbyxcXG4udGFibGUgPiB0aGVhZCA+IHRyLmluZm8gPiB0ZCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLmluZm8gPiB0ZCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLmluZm8gPiB0ZCxcXG4udGFibGUgPiB0aGVhZCA+IHRyLmluZm8gPiB0aCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLmluZm8gPiB0aCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLmluZm8gPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDllZGY3O1xcbn1cXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGQuaW5mbzpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGguaW5mbzpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLmluZm86aG92ZXIgPiB0ZCxcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLmluZm86aG92ZXIgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjYzRlM2YzO1xcbn1cXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGQud2FybmluZyxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGQud2FybmluZyxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGQud2FybmluZyxcXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGgud2FybmluZyxcXG4udGFibGUgPiB0Ym9keSA+IHRyID4gdGgud2FybmluZyxcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGgud2FybmluZyxcXG4udGFibGUgPiB0aGVhZCA+IHRyLndhcm5pbmcgPiB0ZCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLndhcm5pbmcgPiB0ZCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLndhcm5pbmcgPiB0ZCxcXG4udGFibGUgPiB0aGVhZCA+IHRyLndhcm5pbmcgPiB0aCxcXG4udGFibGUgPiB0Ym9keSA+IHRyLndhcm5pbmcgPiB0aCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLndhcm5pbmcgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmNmOGUzO1xcbn1cXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGQud2FybmluZzpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGgud2FybmluZzpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLndhcm5pbmc6aG92ZXIgPiB0ZCxcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLndhcm5pbmc6aG92ZXIgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmFmMmNjO1xcbn1cXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGQuZGFuZ2VyLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0ZC5kYW5nZXIsXFxuLnRhYmxlID4gdGZvb3QgPiB0ciA+IHRkLmRhbmdlcixcXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGguZGFuZ2VyLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0aC5kYW5nZXIsXFxuLnRhYmxlID4gdGZvb3QgPiB0ciA+IHRoLmRhbmdlcixcXG4udGFibGUgPiB0aGVhZCA+IHRyLmRhbmdlciA+IHRkLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuZGFuZ2VyID4gdGQsXFxuLnRhYmxlID4gdGZvb3QgPiB0ci5kYW5nZXIgPiB0ZCxcXG4udGFibGUgPiB0aGVhZCA+IHRyLmRhbmdlciA+IHRoLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuZGFuZ2VyID4gdGgsXFxuLnRhYmxlID4gdGZvb3QgPiB0ci5kYW5nZXIgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjJkZWRlO1xcbn1cXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGQuZGFuZ2VyOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0aC5kYW5nZXI6aG92ZXIsXFxuLnRhYmxlLWhvdmVyID4gdGJvZHkgPiB0ci5kYW5nZXI6aG92ZXIgPiB0ZCxcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLmRhbmdlcjpob3ZlciA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlYmNjY2M7XFxufVxcbkBtZWRpYSAobWF4LXdpZHRoOiA3NjdweCkge1xcbiAgLnRhYmxlLXJlc3BvbnNpdmUge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgbWFyZ2luLWJvdHRvbTogMTVweDtcXG4gICAgb3ZlcmZsb3cteTogaGlkZGVuO1xcbiAgICBvdmVyZmxvdy14OiBzY3JvbGw7XFxuICAgIC1tcy1vdmVyZmxvdy1zdHlsZTogLW1zLWF1dG9oaWRpbmctc2Nyb2xsYmFyO1xcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbiAgICAtd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzogdG91Y2g7XFxuICB9XFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZSB7XFxuICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICB9XFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZSA+IHRoZWFkID4gdHIgPiB0aCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlID4gdGJvZHkgPiB0ciA+IHRoLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUgPiB0Zm9vdCA+IHRyID4gdGgsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZSA+IHRoZWFkID4gdHIgPiB0ZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlID4gdGJvZHkgPiB0ciA+IHRkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUgPiB0Zm9vdCA+IHRyID4gdGQge1xcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbiAgfVxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQge1xcbiAgICBib3JkZXI6IDA7XFxuICB9XFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0aDpmaXJzdC1jaGlsZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRoOmZpcnN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGg6Zmlyc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0ZDpmaXJzdC1jaGlsZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRkOmZpcnN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQ6Zmlyc3QtY2hpbGQge1xcbiAgICBib3JkZXItbGVmdDogMDtcXG4gIH1cXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoOmxhc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0aDpsYXN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGg6bGFzdC1jaGlsZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkOmxhc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0ZDpsYXN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQ6bGFzdC1jaGlsZCB7XFxuICAgIGJvcmRlci1yaWdodDogMDtcXG4gIH1cXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0cjpsYXN0LWNoaWxkID4gdGgsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHI6bGFzdC1jaGlsZCA+IHRoLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmxhc3QtY2hpbGQgPiB0ZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0cjpsYXN0LWNoaWxkID4gdGQge1xcbiAgICBib3JkZXItYm90dG9tOiAwO1xcbiAgfVxcbn1cXG5maWVsZHNldCB7XFxuICBwYWRkaW5nOiAwO1xcbiAgbWFyZ2luOiAwO1xcbiAgYm9yZGVyOiAwO1xcbiAgbWluLXdpZHRoOiAwO1xcbn1cXG5sZWdlbmQge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMTAwJTtcXG4gIHBhZGRpbmc6IDA7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgZm9udC1zaXplOiAyMXB4O1xcbiAgbGluZS1oZWlnaHQ6IGluaGVyaXQ7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIGJvcmRlcjogMDtcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZTVlNWU1O1xcbn1cXG5sYWJlbCB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBtYXJnaW4tYm90dG9tOiA1cHg7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG59XFxuaW5wdXRbdHlwZT1cXFwic2VhcmNoXFxcIl0ge1xcbiAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG59XFxuaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXSxcXG5pbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdIHtcXG4gIG1hcmdpbjogNHB4IDAgMDtcXG4gIG1hcmdpbi10b3A6IDFweCBcXFxcOTtcXG4gIC8qIElFOC05ICovXFxuICBsaW5lLWhlaWdodDogbm9ybWFsO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJmaWxlXFxcIl0ge1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbmlucHV0W3R5cGU9XFxcInJhbmdlXFxcIl0ge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuc2VsZWN0W211bHRpcGxlXSxcXG5zZWxlY3Rbc2l6ZV0ge1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJmaWxlXFxcIl06Zm9jdXMsXFxuaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXTpmb2N1cyxcXG5pbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdOmZvY3VzIHtcXG4gIG91dGxpbmU6IHRoaW4gZG90dGVkO1xcbiAgb3V0bGluZTogNXB4IGF1dG8gLXdlYmtpdC1mb2N1cy1yaW5nLWNvbG9yO1xcbiAgb3V0bGluZS1vZmZzZXQ6IC0ycHg7XFxufVxcbm91dHB1dCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBhZGRpbmctdG9wOiA3cHg7XFxuICBmb250LXNpemU6IDE0cHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGNvbG9yOiAjNTU1NTU1O1xcbn1cXG4uZm9ybS1jb250cm9sIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDM0cHg7XFxuICBwYWRkaW5nOiA2cHggMTJweDtcXG4gIGZvbnQtc2l6ZTogMTRweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgY29sb3I6ICM1NTU1NTU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNjY2NjY2M7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KTtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KTtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIGVhc2UtaW4tb3V0IC4xNXMsIGJveC1zaGFkb3cgZWFzZS1pbi1vdXQgLjE1cztcXG4gIHRyYW5zaXRpb246IGJvcmRlci1jb2xvciBlYXNlLWluLW91dCAuMTVzLCBib3gtc2hhZG93IGVhc2UtaW4tb3V0IC4xNXM7XFxufVxcbi5mb3JtLWNvbnRyb2w6Zm9jdXMge1xcbiAgYm9yZGVyLWNvbG9yOiAjNjZhZmU5O1xcbiAgb3V0bGluZTogMDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwwLDAsLjA3NSksIDAgMCA4cHggcmdiYSgxMDIsIDE3NSwgMjMzLCAwLjYpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwwLDAsLjA3NSksIDAgMCA4cHggcmdiYSgxMDIsIDE3NSwgMjMzLCAwLjYpO1xcbn1cXG4uZm9ybS1jb250cm9sOjotbW96LXBsYWNlaG9sZGVyIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbiAgb3BhY2l0eTogMTtcXG59XFxuLmZvcm0tY29udHJvbDotbXMtaW5wdXQtcGxhY2Vob2xkZXIge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5mb3JtLWNvbnRyb2w6Oi13ZWJraXQtaW5wdXQtcGxhY2Vob2xkZXIge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5mb3JtLWNvbnRyb2xbZGlzYWJsZWRdLFxcbi5mb3JtLWNvbnRyb2xbcmVhZG9ubHldLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuZm9ybS1jb250cm9sIHtcXG4gIGN1cnNvcjogbm90LWFsbG93ZWQ7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlZWVlO1xcbiAgb3BhY2l0eTogMTtcXG59XFxudGV4dGFyZWEuZm9ybS1jb250cm9sIHtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuaW5wdXRbdHlwZT1cXFwic2VhcmNoXFxcIl0ge1xcbiAgLXdlYmtpdC1hcHBlYXJhbmNlOiBub25lO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJkYXRlXFxcIl0ge1xcbiAgbGluZS1oZWlnaHQ6IDM0cHg7XFxufVxcbi5mb3JtLWdyb3VwIHtcXG4gIG1hcmdpbi1ib3R0b206IDE1cHg7XFxufVxcbi5yYWRpbyxcXG4uY2hlY2tib3gge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBtaW4taGVpZ2h0OiAyMHB4O1xcbiAgbWFyZ2luLXRvcDogMTBweDtcXG4gIG1hcmdpbi1ib3R0b206IDEwcHg7XFxuICBwYWRkaW5nLWxlZnQ6IDIwcHg7XFxufVxcbi5yYWRpbyBsYWJlbCxcXG4uY2hlY2tib3ggbGFiZWwge1xcbiAgZGlzcGxheTogaW5saW5lO1xcbiAgZm9udC13ZWlnaHQ6IG5vcm1hbDtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuLnJhZGlvIGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl0sXFxuLnJhZGlvLWlubGluZSBpbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdLFxcbi5jaGVja2JveCBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdLFxcbi5jaGVja2JveC1pbmxpbmUgaW5wdXRbdHlwZT1cXFwiY2hlY2tib3hcXFwiXSB7XFxuICBmbG9hdDogbGVmdDtcXG4gIG1hcmdpbi1sZWZ0OiAtMjBweDtcXG59XFxuLnJhZGlvICsgLnJhZGlvLFxcbi5jaGVja2JveCArIC5jaGVja2JveCB7XFxuICBtYXJnaW4tdG9wOiAtNXB4O1xcbn1cXG4ucmFkaW8taW5saW5lLFxcbi5jaGVja2JveC1pbmxpbmUge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgcGFkZGluZy1sZWZ0OiAyMHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG4ucmFkaW8taW5saW5lICsgLnJhZGlvLWlubGluZSxcXG4uY2hlY2tib3gtaW5saW5lICsgLmNoZWNrYm94LWlubGluZSB7XFxuICBtYXJnaW4tdG9wOiAwO1xcbiAgbWFyZ2luLWxlZnQ6IDEwcHg7XFxufVxcbmlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl1bZGlzYWJsZWRdLFxcbmlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl1bZGlzYWJsZWRdLFxcbi5yYWRpb1tkaXNhYmxlZF0sXFxuLnJhZGlvLWlubGluZVtkaXNhYmxlZF0sXFxuLmNoZWNrYm94W2Rpc2FibGVkXSxcXG4uY2hlY2tib3gtaW5saW5lW2Rpc2FibGVkXSxcXG5maWVsZHNldFtkaXNhYmxlZF0gaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXSxcXG5maWVsZHNldFtkaXNhYmxlZF0gaW5wdXRbdHlwZT1cXFwiY2hlY2tib3hcXFwiXSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLnJhZGlvLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAucmFkaW8taW5saW5lLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuY2hlY2tib3gsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5jaGVja2JveC1pbmxpbmUge1xcbiAgY3Vyc29yOiBub3QtYWxsb3dlZDtcXG59XFxuLmlucHV0LXNtIHtcXG4gIGhlaWdodDogMzBweDtcXG4gIHBhZGRpbmc6IDVweCAxMHB4O1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNTtcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG59XFxuc2VsZWN0LmlucHV0LXNtIHtcXG4gIGhlaWdodDogMzBweDtcXG4gIGxpbmUtaGVpZ2h0OiAzMHB4O1xcbn1cXG50ZXh0YXJlYS5pbnB1dC1zbSxcXG5zZWxlY3RbbXVsdGlwbGVdLmlucHV0LXNtIHtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuLmlucHV0LWxnIHtcXG4gIGhlaWdodDogNDZweDtcXG4gIHBhZGRpbmc6IDEwcHggMTZweDtcXG4gIGZvbnQtc2l6ZTogMThweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjMzO1xcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xcbn1cXG5zZWxlY3QuaW5wdXQtbGcge1xcbiAgaGVpZ2h0OiA0NnB4O1xcbiAgbGluZS1oZWlnaHQ6IDQ2cHg7XFxufVxcbnRleHRhcmVhLmlucHV0LWxnLFxcbnNlbGVjdFttdWx0aXBsZV0uaW5wdXQtbGcge1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG4uaGFzLWZlZWRiYWNrIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG59XFxuLmhhcy1mZWVkYmFjayAuZm9ybS1jb250cm9sIHtcXG4gIHBhZGRpbmctcmlnaHQ6IDQyLjVweDtcXG59XFxuLmhhcy1mZWVkYmFjayAuZm9ybS1jb250cm9sLWZlZWRiYWNrIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMjVweDtcXG4gIHJpZ2h0OiAwO1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMzRweDtcXG4gIGhlaWdodDogMzRweDtcXG4gIGxpbmUtaGVpZ2h0OiAzNHB4O1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG4uaGFzLXN1Y2Nlc3MgLmhlbHAtYmxvY2ssXFxuLmhhcy1zdWNjZXNzIC5jb250cm9sLWxhYmVsLFxcbi5oYXMtc3VjY2VzcyAucmFkaW8sXFxuLmhhcy1zdWNjZXNzIC5jaGVja2JveCxcXG4uaGFzLXN1Y2Nlc3MgLnJhZGlvLWlubGluZSxcXG4uaGFzLXN1Y2Nlc3MgLmNoZWNrYm94LWlubGluZSB7XFxuICBjb2xvcjogIzNjNzYzZDtcXG59XFxuLmhhcy1zdWNjZXNzIC5mb3JtLWNvbnRyb2wge1xcbiAgYm9yZGVyLWNvbG9yOiAjM2M3NjNkO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSk7XFxufVxcbi5oYXMtc3VjY2VzcyAuZm9ybS1jb250cm9sOmZvY3VzIHtcXG4gIGJvcmRlci1jb2xvcjogIzJiNTQyYztcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpLCAwIDAgNnB4ICM2N2IxNjg7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSksIDAgMCA2cHggIzY3YjE2ODtcXG59XFxuLmhhcy1zdWNjZXNzIC5pbnB1dC1ncm91cC1hZGRvbiB7XFxuICBjb2xvcjogIzNjNzYzZDtcXG4gIGJvcmRlci1jb2xvcjogIzNjNzYzZDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZmYwZDg7XFxufVxcbi5oYXMtc3VjY2VzcyAuZm9ybS1jb250cm9sLWZlZWRiYWNrIHtcXG4gIGNvbG9yOiAjM2M3NjNkO1xcbn1cXG4uaGFzLXdhcm5pbmcgLmhlbHAtYmxvY2ssXFxuLmhhcy13YXJuaW5nIC5jb250cm9sLWxhYmVsLFxcbi5oYXMtd2FybmluZyAucmFkaW8sXFxuLmhhcy13YXJuaW5nIC5jaGVja2JveCxcXG4uaGFzLXdhcm5pbmcgLnJhZGlvLWlubGluZSxcXG4uaGFzLXdhcm5pbmcgLmNoZWNrYm94LWlubGluZSB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG59XFxuLmhhcy13YXJuaW5nIC5mb3JtLWNvbnRyb2wge1xcbiAgYm9yZGVyLWNvbG9yOiAjOGE2ZDNiO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSk7XFxufVxcbi5oYXMtd2FybmluZyAuZm9ybS1jb250cm9sOmZvY3VzIHtcXG4gIGJvcmRlci1jb2xvcjogIzY2NTEyYztcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpLCAwIDAgNnB4ICNjMGExNmI7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSksIDAgMCA2cHggI2MwYTE2YjtcXG59XFxuLmhhcy13YXJuaW5nIC5pbnB1dC1ncm91cC1hZGRvbiB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG4gIGJvcmRlci1jb2xvcjogIzhhNmQzYjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmY2Y4ZTM7XFxufVxcbi5oYXMtd2FybmluZyAuZm9ybS1jb250cm9sLWZlZWRiYWNrIHtcXG4gIGNvbG9yOiAjOGE2ZDNiO1xcbn1cXG4uaGFzLWVycm9yIC5oZWxwLWJsb2NrLFxcbi5oYXMtZXJyb3IgLmNvbnRyb2wtbGFiZWwsXFxuLmhhcy1lcnJvciAucmFkaW8sXFxuLmhhcy1lcnJvciAuY2hlY2tib3gsXFxuLmhhcy1lcnJvciAucmFkaW8taW5saW5lLFxcbi5oYXMtZXJyb3IgLmNoZWNrYm94LWlubGluZSB7XFxuICBjb2xvcjogI2E5NDQ0MjtcXG59XFxuLmhhcy1lcnJvciAuZm9ybS1jb250cm9sIHtcXG4gIGJvcmRlci1jb2xvcjogI2E5NDQ0MjtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpO1xcbn1cXG4uaGFzLWVycm9yIC5mb3JtLWNvbnRyb2w6Zm9jdXMge1xcbiAgYm9yZGVyLWNvbG9yOiAjODQzNTM0O1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSksIDAgMCA2cHggI2NlODQ4MztcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KSwgMCAwIDZweCAjY2U4NDgzO1xcbn1cXG4uaGFzLWVycm9yIC5pbnB1dC1ncm91cC1hZGRvbiB7XFxuICBjb2xvcjogI2E5NDQ0MjtcXG4gIGJvcmRlci1jb2xvcjogI2E5NDQ0MjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmMmRlZGU7XFxufVxcbi5oYXMtZXJyb3IgLmZvcm0tY29udHJvbC1mZWVkYmFjayB7XFxuICBjb2xvcjogI2E5NDQ0MjtcXG59XFxuLmZvcm0tY29udHJvbC1zdGF0aWMge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuLmhlbHAtYmxvY2sge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBtYXJnaW4tdG9wOiA1cHg7XFxuICBtYXJnaW4tYm90dG9tOiAxMHB4O1xcbiAgY29sb3I6ICM3MzczNzM7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmZvcm0taW5saW5lIC5mb3JtLWdyb3VwIHtcXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLmZvcm0taW5saW5lIC5mb3JtLWNvbnRyb2wge1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIHdpZHRoOiBhdXRvO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLmZvcm0taW5saW5lIC5pbnB1dC1ncm91cCA+IC5mb3JtLWNvbnRyb2wge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gIH1cXG4gIC5mb3JtLWlubGluZSAuY29udHJvbC1sYWJlbCB7XFxuICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICB9XFxuICAuZm9ybS1pbmxpbmUgLnJhZGlvLFxcbiAgLmZvcm0taW5saW5lIC5jaGVja2JveCB7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgbWFyZ2luLXRvcDogMDtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gICAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLmZvcm0taW5saW5lIC5yYWRpbyBpbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdLFxcbiAgLmZvcm0taW5saW5lIC5jaGVja2JveCBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdIHtcXG4gICAgZmxvYXQ6IG5vbmU7XFxuICAgIG1hcmdpbi1sZWZ0OiAwO1xcbiAgfVxcbiAgLmZvcm0taW5saW5lIC5oYXMtZmVlZGJhY2sgLmZvcm0tY29udHJvbC1mZWVkYmFjayB7XFxuICAgIHRvcDogMDtcXG4gIH1cXG59XFxuLmZvcm0taG9yaXpvbnRhbCAuY29udHJvbC1sYWJlbCxcXG4uZm9ybS1ob3Jpem9udGFsIC5yYWRpbyxcXG4uZm9ybS1ob3Jpem9udGFsIC5jaGVja2JveCxcXG4uZm9ybS1ob3Jpem9udGFsIC5yYWRpby1pbmxpbmUsXFxuLmZvcm0taG9yaXpvbnRhbCAuY2hlY2tib3gtaW5saW5lIHtcXG4gIG1hcmdpbi10b3A6IDA7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgcGFkZGluZy10b3A6IDdweDtcXG59XFxuLmZvcm0taG9yaXpvbnRhbCAucmFkaW8sXFxuLmZvcm0taG9yaXpvbnRhbCAuY2hlY2tib3gge1xcbiAgbWluLWhlaWdodDogMjdweDtcXG59XFxuLmZvcm0taG9yaXpvbnRhbCAuZm9ybS1ncm91cCB7XFxuICBtYXJnaW4tbGVmdDogLTE1cHg7XFxuICBtYXJnaW4tcmlnaHQ6IC0xNXB4O1xcbn1cXG4uZm9ybS1ob3Jpem9udGFsIC5mb3JtLWNvbnRyb2wtc3RhdGljIHtcXG4gIHBhZGRpbmctdG9wOiA3cHg7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmZvcm0taG9yaXpvbnRhbCAuY29udHJvbC1sYWJlbCB7XFxuICAgIHRleHQtYWxpZ246IHJpZ2h0O1xcbiAgfVxcbn1cXG4uZm9ybS1ob3Jpem9udGFsIC5oYXMtZmVlZGJhY2sgLmZvcm0tY29udHJvbC1mZWVkYmFjayB7XFxuICB0b3A6IDA7XFxuICByaWdodDogMTVweDtcXG59XFxuLmJ0biB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgZm9udC13ZWlnaHQ6IG5vcm1hbDtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xcbiAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbiAgcGFkZGluZzogNnB4IDEycHg7XFxuICBmb250LXNpemU6IDE0cHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7XFxuICAtbW96LXVzZXItc2VsZWN0OiBub25lO1xcbiAgLW1zLXVzZXItc2VsZWN0OiBub25lO1xcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxufVxcbi5idG46Zm9jdXMsXFxuLmJ0bjphY3RpdmU6Zm9jdXMsXFxuLmJ0bi5hY3RpdmU6Zm9jdXMge1xcbiAgb3V0bGluZTogdGhpbiBkb3R0ZWQ7XFxuICBvdXRsaW5lOiA1cHggYXV0byAtd2Via2l0LWZvY3VzLXJpbmctY29sb3I7XFxuICBvdXRsaW5lLW9mZnNldDogLTJweDtcXG59XFxuLmJ0bjpob3ZlcixcXG4uYnRuOmZvY3VzIHtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbn1cXG4uYnRuOmFjdGl2ZSxcXG4uYnRuLmFjdGl2ZSB7XFxuICBvdXRsaW5lOiAwO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAzcHggNXB4IHJnYmEoMCwgMCwgMCwgMC4xMjUpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAzcHggNXB4IHJnYmEoMCwgMCwgMCwgMC4xMjUpO1xcbn1cXG4uYnRuLmRpc2FibGVkLFxcbi5idG5bZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuIHtcXG4gIGN1cnNvcjogbm90LWFsbG93ZWQ7XFxuICBwb2ludGVyLWV2ZW50czogbm9uZTtcXG4gIG9wYWNpdHk6IDAuNjU7XFxuICBmaWx0ZXI6IGFscGhhKG9wYWNpdHk9NjUpO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBub25lO1xcbiAgYm94LXNoYWRvdzogbm9uZTtcXG59XFxuLmJ0bi1kZWZhdWx0IHtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlci1jb2xvcjogI2NjY2NjYztcXG59XFxuLmJ0bi1kZWZhdWx0OmhvdmVyLFxcbi5idG4tZGVmYXVsdDpmb2N1cyxcXG4uYnRuLWRlZmF1bHQ6YWN0aXZlLFxcbi5idG4tZGVmYXVsdC5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4tZGVmYXVsdCB7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlYmViZWI7XFxuICBib3JkZXItY29sb3I6ICNhZGFkYWQ7XFxufVxcbi5idG4tZGVmYXVsdDphY3RpdmUsXFxuLmJ0bi1kZWZhdWx0LmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1kZWZhdWx0IHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxufVxcbi5idG4tZGVmYXVsdC5kaXNhYmxlZCxcXG4uYnRuLWRlZmF1bHRbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWRlZmF1bHQsXFxuLmJ0bi1kZWZhdWx0LmRpc2FibGVkOmhvdmVyLFxcbi5idG4tZGVmYXVsdFtkaXNhYmxlZF06aG92ZXIsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGVmYXVsdDpob3ZlcixcXG4uYnRuLWRlZmF1bHQuZGlzYWJsZWQ6Zm9jdXMsXFxuLmJ0bi1kZWZhdWx0W2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kZWZhdWx0OmZvY3VzLFxcbi5idG4tZGVmYXVsdC5kaXNhYmxlZDphY3RpdmUsXFxuLmJ0bi1kZWZhdWx0W2Rpc2FibGVkXTphY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGVmYXVsdDphY3RpdmUsXFxuLmJ0bi1kZWZhdWx0LmRpc2FibGVkLmFjdGl2ZSxcXG4uYnRuLWRlZmF1bHRbZGlzYWJsZWRdLmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kZWZhdWx0LmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYm9yZGVyLWNvbG9yOiAjY2NjY2NjO1xcbn1cXG4uYnRuLWRlZmF1bHQgLmJhZGdlIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMzMzMzMztcXG59XFxuLmJ0bi1wcmltYXJ5IHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG4gIGJvcmRlci1jb2xvcjogIzM1N2ViZDtcXG59XFxuLmJ0bi1wcmltYXJ5OmhvdmVyLFxcbi5idG4tcHJpbWFyeTpmb2N1cyxcXG4uYnRuLXByaW1hcnk6YWN0aXZlLFxcbi5idG4tcHJpbWFyeS5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4tcHJpbWFyeSB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMzMjc2YjE7XFxuICBib3JkZXItY29sb3I6ICMyODVlOGU7XFxufVxcbi5idG4tcHJpbWFyeTphY3RpdmUsXFxuLmJ0bi1wcmltYXJ5LmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1wcmltYXJ5IHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxufVxcbi5idG4tcHJpbWFyeS5kaXNhYmxlZCxcXG4uYnRuLXByaW1hcnlbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXByaW1hcnksXFxuLmJ0bi1wcmltYXJ5LmRpc2FibGVkOmhvdmVyLFxcbi5idG4tcHJpbWFyeVtkaXNhYmxlZF06aG92ZXIsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tcHJpbWFyeTpob3ZlcixcXG4uYnRuLXByaW1hcnkuZGlzYWJsZWQ6Zm9jdXMsXFxuLmJ0bi1wcmltYXJ5W2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1wcmltYXJ5OmZvY3VzLFxcbi5idG4tcHJpbWFyeS5kaXNhYmxlZDphY3RpdmUsXFxuLmJ0bi1wcmltYXJ5W2Rpc2FibGVkXTphY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tcHJpbWFyeTphY3RpdmUsXFxuLmJ0bi1wcmltYXJ5LmRpc2FibGVkLmFjdGl2ZSxcXG4uYnRuLXByaW1hcnlbZGlzYWJsZWRdLmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1wcmltYXJ5LmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbiAgYm9yZGVyLWNvbG9yOiAjMzU3ZWJkO1xcbn1cXG4uYnRuLXByaW1hcnkgLmJhZGdlIHtcXG4gIGNvbG9yOiAjNDI4YmNhO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLmJ0bi1zdWNjZXNzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzVjYjg1YztcXG4gIGJvcmRlci1jb2xvcjogIzRjYWU0YztcXG59XFxuLmJ0bi1zdWNjZXNzOmhvdmVyLFxcbi5idG4tc3VjY2Vzczpmb2N1cyxcXG4uYnRuLXN1Y2Nlc3M6YWN0aXZlLFxcbi5idG4tc3VjY2Vzcy5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4tc3VjY2VzcyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM0N2E0NDc7XFxuICBib3JkZXItY29sb3I6ICMzOTg0Mzk7XFxufVxcbi5idG4tc3VjY2VzczphY3RpdmUsXFxuLmJ0bi1zdWNjZXNzLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1zdWNjZXNzIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxufVxcbi5idG4tc3VjY2Vzcy5kaXNhYmxlZCxcXG4uYnRuLXN1Y2Nlc3NbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXN1Y2Nlc3MsXFxuLmJ0bi1zdWNjZXNzLmRpc2FibGVkOmhvdmVyLFxcbi5idG4tc3VjY2Vzc1tkaXNhYmxlZF06aG92ZXIsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tc3VjY2Vzczpob3ZlcixcXG4uYnRuLXN1Y2Nlc3MuZGlzYWJsZWQ6Zm9jdXMsXFxuLmJ0bi1zdWNjZXNzW2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1zdWNjZXNzOmZvY3VzLFxcbi5idG4tc3VjY2Vzcy5kaXNhYmxlZDphY3RpdmUsXFxuLmJ0bi1zdWNjZXNzW2Rpc2FibGVkXTphY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tc3VjY2VzczphY3RpdmUsXFxuLmJ0bi1zdWNjZXNzLmRpc2FibGVkLmFjdGl2ZSxcXG4uYnRuLXN1Y2Nlc3NbZGlzYWJsZWRdLmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1zdWNjZXNzLmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWNiODVjO1xcbiAgYm9yZGVyLWNvbG9yOiAjNGNhZTRjO1xcbn1cXG4uYnRuLXN1Y2Nlc3MgLmJhZGdlIHtcXG4gIGNvbG9yOiAjNWNiODVjO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLmJ0bi1pbmZvIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzViYzBkZTtcXG4gIGJvcmRlci1jb2xvcjogIzQ2YjhkYTtcXG59XFxuLmJ0bi1pbmZvOmhvdmVyLFxcbi5idG4taW5mbzpmb2N1cyxcXG4uYnRuLWluZm86YWN0aXZlLFxcbi5idG4taW5mby5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4taW5mbyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMzOWIzZDc7XFxuICBib3JkZXItY29sb3I6ICMyNjlhYmM7XFxufVxcbi5idG4taW5mbzphY3RpdmUsXFxuLmJ0bi1pbmZvLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1pbmZvIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxufVxcbi5idG4taW5mby5kaXNhYmxlZCxcXG4uYnRuLWluZm9bZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWluZm8sXFxuLmJ0bi1pbmZvLmRpc2FibGVkOmhvdmVyLFxcbi5idG4taW5mb1tkaXNhYmxlZF06aG92ZXIsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4taW5mbzpob3ZlcixcXG4uYnRuLWluZm8uZGlzYWJsZWQ6Zm9jdXMsXFxuLmJ0bi1pbmZvW2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1pbmZvOmZvY3VzLFxcbi5idG4taW5mby5kaXNhYmxlZDphY3RpdmUsXFxuLmJ0bi1pbmZvW2Rpc2FibGVkXTphY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4taW5mbzphY3RpdmUsXFxuLmJ0bi1pbmZvLmRpc2FibGVkLmFjdGl2ZSxcXG4uYnRuLWluZm9bZGlzYWJsZWRdLmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1pbmZvLmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWJjMGRlO1xcbiAgYm9yZGVyLWNvbG9yOiAjNDZiOGRhO1xcbn1cXG4uYnRuLWluZm8gLmJhZGdlIHtcXG4gIGNvbG9yOiAjNWJjMGRlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLmJ0bi13YXJuaW5nIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YwYWQ0ZTtcXG4gIGJvcmRlci1jb2xvcjogI2VlYTIzNjtcXG59XFxuLmJ0bi13YXJuaW5nOmhvdmVyLFxcbi5idG4td2FybmluZzpmb2N1cyxcXG4uYnRuLXdhcm5pbmc6YWN0aXZlLFxcbi5idG4td2FybmluZy5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4td2FybmluZyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZDljMjg7XFxuICBib3JkZXItY29sb3I6ICNkNTg1MTI7XFxufVxcbi5idG4td2FybmluZzphY3RpdmUsXFxuLmJ0bi13YXJuaW5nLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi13YXJuaW5nIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxufVxcbi5idG4td2FybmluZy5kaXNhYmxlZCxcXG4uYnRuLXdhcm5pbmdbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXdhcm5pbmcsXFxuLmJ0bi13YXJuaW5nLmRpc2FibGVkOmhvdmVyLFxcbi5idG4td2FybmluZ1tkaXNhYmxlZF06aG92ZXIsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4td2FybmluZzpob3ZlcixcXG4uYnRuLXdhcm5pbmcuZGlzYWJsZWQ6Zm9jdXMsXFxuLmJ0bi13YXJuaW5nW2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi13YXJuaW5nOmZvY3VzLFxcbi5idG4td2FybmluZy5kaXNhYmxlZDphY3RpdmUsXFxuLmJ0bi13YXJuaW5nW2Rpc2FibGVkXTphY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4td2FybmluZzphY3RpdmUsXFxuLmJ0bi13YXJuaW5nLmRpc2FibGVkLmFjdGl2ZSxcXG4uYnRuLXdhcm5pbmdbZGlzYWJsZWRdLmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi13YXJuaW5nLmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjBhZDRlO1xcbiAgYm9yZGVyLWNvbG9yOiAjZWVhMjM2O1xcbn1cXG4uYnRuLXdhcm5pbmcgLmJhZGdlIHtcXG4gIGNvbG9yOiAjZjBhZDRlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLmJ0bi1kYW5nZXIge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDk1MzRmO1xcbiAgYm9yZGVyLWNvbG9yOiAjZDQzZjNhO1xcbn1cXG4uYnRuLWRhbmdlcjpob3ZlcixcXG4uYnRuLWRhbmdlcjpmb2N1cyxcXG4uYnRuLWRhbmdlcjphY3RpdmUsXFxuLmJ0bi1kYW5nZXIuYWN0aXZlLFxcbi5vcGVuIC5kcm9wZG93bi10b2dnbGUuYnRuLWRhbmdlciB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkMjMyMmQ7XFxuICBib3JkZXItY29sb3I6ICNhYzI5MjU7XFxufVxcbi5idG4tZGFuZ2VyOmFjdGl2ZSxcXG4uYnRuLWRhbmdlci5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4tZGFuZ2VyIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxufVxcbi5idG4tZGFuZ2VyLmRpc2FibGVkLFxcbi5idG4tZGFuZ2VyW2Rpc2FibGVkXSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kYW5nZXIsXFxuLmJ0bi1kYW5nZXIuZGlzYWJsZWQ6aG92ZXIsXFxuLmJ0bi1kYW5nZXJbZGlzYWJsZWRdOmhvdmVyLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWRhbmdlcjpob3ZlcixcXG4uYnRuLWRhbmdlci5kaXNhYmxlZDpmb2N1cyxcXG4uYnRuLWRhbmdlcltkaXNhYmxlZF06Zm9jdXMsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGFuZ2VyOmZvY3VzLFxcbi5idG4tZGFuZ2VyLmRpc2FibGVkOmFjdGl2ZSxcXG4uYnRuLWRhbmdlcltkaXNhYmxlZF06YWN0aXZlLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWRhbmdlcjphY3RpdmUsXFxuLmJ0bi1kYW5nZXIuZGlzYWJsZWQuYWN0aXZlLFxcbi5idG4tZGFuZ2VyW2Rpc2FibGVkXS5hY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGFuZ2VyLmFjdGl2ZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDk1MzRmO1xcbiAgYm9yZGVyLWNvbG9yOiAjZDQzZjNhO1xcbn1cXG4uYnRuLWRhbmdlciAuYmFkZ2Uge1xcbiAgY29sb3I6ICNkOTUzNGY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uYnRuLWxpbmsge1xcbiAgY29sb3I6ICM0MjhiY2E7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLmJ0bi1saW5rLFxcbi5idG4tbGluazphY3RpdmUsXFxuLmJ0bi1saW5rW2Rpc2FibGVkXSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1saW5rIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBub25lO1xcbiAgYm94LXNoYWRvdzogbm9uZTtcXG59XFxuLmJ0bi1saW5rLFxcbi5idG4tbGluazpob3ZlcixcXG4uYnRuLWxpbms6Zm9jdXMsXFxuLmJ0bi1saW5rOmFjdGl2ZSB7XFxuICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG4uYnRuLWxpbms6aG92ZXIsXFxuLmJ0bi1saW5rOmZvY3VzIHtcXG4gIGNvbG9yOiAjMmE2NDk2O1xcbiAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxuLmJ0bi1saW5rW2Rpc2FibGVkXTpob3ZlcixcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1saW5rOmhvdmVyLFxcbi5idG4tbGlua1tkaXNhYmxlZF06Zm9jdXMsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tbGluazpmb2N1cyB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG59XFxuLmJ0bi1sZyxcXG4uYnRuLWdyb3VwLWxnID4gLmJ0biB7XFxuICBwYWRkaW5nOiAxMHB4IDE2cHg7XFxuICBmb250LXNpemU6IDE4cHg7XFxuICBsaW5lLWhlaWdodDogMS4zMztcXG4gIGJvcmRlci1yYWRpdXM6IDZweDtcXG59XFxuLmJ0bi1zbSxcXG4uYnRuLWdyb3VwLXNtID4gLmJ0biB7XFxuICBwYWRkaW5nOiA1cHggMTBweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjU7XFxuICBib3JkZXItcmFkaXVzOiAzcHg7XFxufVxcbi5idG4teHMsXFxuLmJ0bi1ncm91cC14cyA+IC5idG4ge1xcbiAgcGFkZGluZzogMXB4IDVweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjU7XFxuICBib3JkZXItcmFkaXVzOiAzcHg7XFxufVxcbi5idG4tYmxvY2sge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMTAwJTtcXG4gIHBhZGRpbmctbGVmdDogMDtcXG4gIHBhZGRpbmctcmlnaHQ6IDA7XFxufVxcbi5idG4tYmxvY2sgKyAuYnRuLWJsb2NrIHtcXG4gIG1hcmdpbi10b3A6IDVweDtcXG59XFxuaW5wdXRbdHlwZT1cXFwic3VibWl0XFxcIl0uYnRuLWJsb2NrLFxcbmlucHV0W3R5cGU9XFxcInJlc2V0XFxcIl0uYnRuLWJsb2NrLFxcbmlucHV0W3R5cGU9XFxcImJ1dHRvblxcXCJdLmJ0bi1ibG9jayB7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuLmZhZGUge1xcbiAgb3BhY2l0eTogMDtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogb3BhY2l0eSAwLjE1cyBsaW5lYXI7XFxuICB0cmFuc2l0aW9uOiBvcGFjaXR5IDAuMTVzIGxpbmVhcjtcXG59XFxuLmZhZGUuaW4ge1xcbiAgb3BhY2l0eTogMTtcXG59XFxuLmNvbGxhcHNlIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcbi5jb2xsYXBzZS5pbiB7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuLmNvbGxhcHNpbmcge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgaGVpZ2h0OiAwO1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogaGVpZ2h0IDAuMzVzIGVhc2U7XFxuICB0cmFuc2l0aW9uOiBoZWlnaHQgMC4zNXMgZWFzZTtcXG59XFxuQGZvbnQtZmFjZSB7XFxuICBmb250LWZhbWlseTogJ0dseXBoaWNvbnMgSGFsZmxpbmdzJztcXG4gIHNyYzogdXJsKCcuLi9mb250cy9nbHlwaGljb25zLWhhbGZsaW5ncy1yZWd1bGFyLmVvdCcpO1xcbiAgc3JjOiB1cmwoJy4uL2ZvbnRzL2dseXBoaWNvbnMtaGFsZmxpbmdzLXJlZ3VsYXIuZW90PyNpZWZpeCcpIGZvcm1hdCgnZW1iZWRkZWQtb3BlbnR5cGUnKSwgdXJsKCcuLi9mb250cy9nbHlwaGljb25zLWhhbGZsaW5ncy1yZWd1bGFyLndvZmYnKSBmb3JtYXQoJ3dvZmYnKSwgdXJsKCcuLi9mb250cy9nbHlwaGljb25zLWhhbGZsaW5ncy1yZWd1bGFyLnR0ZicpIGZvcm1hdCgndHJ1ZXR5cGUnKSwgdXJsKCcuLi9mb250cy9nbHlwaGljb25zLWhhbGZsaW5ncy1yZWd1bGFyLnN2ZyNnbHlwaGljb25zX2hhbGZsaW5nc3JlZ3VsYXInKSBmb3JtYXQoJ3N2ZycpO1xcbn1cXG4uZ2x5cGhpY29uIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHRvcDogMXB4O1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgZm9udC1mYW1pbHk6ICdHbHlwaGljb25zIEhhbGZsaW5ncyc7XFxuICBmb250LXN0eWxlOiBub3JtYWw7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgbGluZS1oZWlnaHQ6IDE7XFxuICAtd2Via2l0LWZvbnQtc21vb3RoaW5nOiBhbnRpYWxpYXNlZDtcXG4gIC1tb3otb3N4LWZvbnQtc21vb3RoaW5nOiBncmF5c2NhbGU7XFxufVxcbi5nbHlwaGljb24tYXN0ZXJpc2s6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMmFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBsdXM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMmJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWV1cm86YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMjBhY1xcXCI7XFxufVxcbi5nbHlwaGljb24tbWludXM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMjIxMlxcXCI7XFxufVxcbi5nbHlwaGljb24tY2xvdWQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMjYwMVxcXCI7XFxufVxcbi5nbHlwaGljb24tZW52ZWxvcGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMjcwOVxcXCI7XFxufVxcbi5nbHlwaGljb24tcGVuY2lsOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXDI3MGZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWdsYXNzOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLW11c2ljOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNlYXJjaDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDAzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1oZWFydDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDA1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zdGFyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXN0YXItZW1wdHk6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAwN1xcXCI7XFxufVxcbi5nbHlwaGljb24tdXNlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDA4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1maWxtOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRoLWxhcmdlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMTBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRoOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMTFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRoLWxpc3Q6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxMlxcXCI7XFxufVxcbi5nbHlwaGljb24tb2s6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxM1xcXCI7XFxufVxcbi5nbHlwaGljb24tcmVtb3ZlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMTRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXpvb20taW46YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxNVxcXCI7XFxufVxcbi5nbHlwaGljb24tem9vbS1vdXQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxNlxcXCI7XFxufVxcbi5nbHlwaGljb24tb2ZmOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMTdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNpZ25hbDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDE4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jb2c6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxOVxcXCI7XFxufVxcbi5nbHlwaGljb24tdHJhc2g6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyMFxcXCI7XFxufVxcbi5nbHlwaGljb24taG9tZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDIxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1maWxlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMjJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRpbWU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyM1xcXCI7XFxufVxcbi5nbHlwaGljb24tcm9hZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDI0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1kb3dubG9hZC1hbHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyNVxcXCI7XFxufVxcbi5nbHlwaGljb24tZG93bmxvYWQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyNlxcXCI7XFxufVxcbi5nbHlwaGljb24tdXBsb2FkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMjdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWluYm94OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMjhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBsYXktY2lyY2xlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMjlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlcGVhdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDMwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZWZyZXNoOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWxpc3QtYWx0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWxvY2s6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzM1xcXCI7XFxufVxcbi5nbHlwaGljb24tZmxhZzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDM0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oZWFkcGhvbmVzOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXZvbHVtZS1vZmY6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzNlxcXCI7XFxufVxcbi5nbHlwaGljb24tdm9sdW1lLWRvd246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzN1xcXCI7XFxufVxcbi5nbHlwaGljb24tdm9sdW1lLXVwOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXFyY29kZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDM5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1iYXJjb2RlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNDBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRhZzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQxXFxcIjtcXG59XFxuLmdseXBoaWNvbi10YWdzOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNDJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWJvb2s6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0M1xcXCI7XFxufVxcbi5nbHlwaGljb24tYm9va21hcms6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0NFxcXCI7XFxufVxcbi5nbHlwaGljb24tcHJpbnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0NVxcXCI7XFxufVxcbi5nbHlwaGljb24tY2FtZXJhOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNDZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZvbnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0N1xcXCI7XFxufVxcbi5nbHlwaGljb24tYm9sZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQ4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1pdGFsaWM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0OVxcXCI7XFxufVxcbi5nbHlwaGljb24tdGV4dC1oZWlnaHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1MFxcXCI7XFxufVxcbi5nbHlwaGljb24tdGV4dC13aWR0aDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDUxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hbGlnbi1sZWZ0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNTJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFsaWduLWNlbnRlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDUzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hbGlnbi1yaWdodDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDU0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1hbGlnbi1qdXN0aWZ5OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNTVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWxpc3Q6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1NlxcXCI7XFxufVxcbi5nbHlwaGljb24taW5kZW50LWxlZnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1N1xcXCI7XFxufVxcbi5nbHlwaGljb24taW5kZW50LXJpZ2h0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNThcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZhY2V0aW1lLXZpZGVvOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNTlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBpY3R1cmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA2MFxcXCI7XFxufVxcbi5nbHlwaGljb24tbWFwLW1hcmtlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDYyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hZGp1c3Q6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA2M1xcXCI7XFxufVxcbi5nbHlwaGljb24tdGludDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDY0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1lZGl0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNjVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNoYXJlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNjZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNoZWNrOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNjdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLW1vdmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA2OFxcXCI7XFxufVxcbi5nbHlwaGljb24tc3RlcC1iYWNrd2FyZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDY5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1mYXN0LWJhY2t3YXJkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNzBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWJhY2t3YXJkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNzFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBsYXk6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3MlxcXCI7XFxufVxcbi5nbHlwaGljb24tcGF1c2U6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3M1xcXCI7XFxufVxcbi5nbHlwaGljb24tc3RvcDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDc0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1mb3J3YXJkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNzVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZhc3QtZm9yd2FyZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDc2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zdGVwLWZvcndhcmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3N1xcXCI7XFxufVxcbi5nbHlwaGljb24tZWplY3Q6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3OFxcXCI7XFxufVxcbi5nbHlwaGljb24tY2hldnJvbi1sZWZ0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNzlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNoZXZyb24tcmlnaHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4MFxcXCI7XFxufVxcbi5nbHlwaGljb24tcGx1cy1zaWduOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwODFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLW1pbnVzLXNpZ246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4MlxcXCI7XFxufVxcbi5nbHlwaGljb24tcmVtb3ZlLXNpZ246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4M1xcXCI7XFxufVxcbi5nbHlwaGljb24tb2stc2lnbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDg0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1xdWVzdGlvbi1zaWduOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwODVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWluZm8tc2lnbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDg2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zY3JlZW5zaG90OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwODdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlbW92ZS1jaXJjbGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4OFxcXCI7XFxufVxcbi5nbHlwaGljb24tb2stY2lyY2xlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwODlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWJhbi1jaXJjbGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA5MFxcXCI7XFxufVxcbi5nbHlwaGljb24tYXJyb3ctbGVmdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDkxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hcnJvdy1yaWdodDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDkyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hcnJvdy11cDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDkzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hcnJvdy1kb3duOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwOTRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNoYXJlLWFsdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDk1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZXNpemUtZnVsbDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDk2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZXNpemUtc21hbGw6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA5N1xcXCI7XFxufVxcbi5nbHlwaGljb24tZXhjbGFtYXRpb24tc2lnbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTAxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1naWZ0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWxlYWY6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEwM1xcXCI7XFxufVxcbi5nbHlwaGljb24tZmlyZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTA0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1leWUtb3BlbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTA1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1leWUtY2xvc2U6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEwNlxcXCI7XFxufVxcbi5nbHlwaGljb24td2FybmluZy1zaWduOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBsYW5lOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNhbGVuZGFyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJhbmRvbTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTEwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jb21tZW50OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLW1hZ25ldDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTEyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jaGV2cm9uLXVwOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNoZXZyb24tZG93bjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTE0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZXR3ZWV0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNob3BwaW5nLWNhcnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTExNlxcXCI7XFxufVxcbi5nbHlwaGljb24tZm9sZGVyLWNsb3NlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZvbGRlci1vcGVuOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMThcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlc2l6ZS12ZXJ0aWNhbDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTE5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZXNpemUtaG9yaXpvbnRhbDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTIwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1oZGQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEyMVxcXCI7XFxufVxcbi5nbHlwaGljb24tYnVsbGhvcm46YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEyMlxcXCI7XFxufVxcbi5nbHlwaGljb24tYmVsbDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTIzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jZXJ0aWZpY2F0ZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTI0XFxcIjtcXG59XFxuLmdseXBoaWNvbi10aHVtYnMtdXA6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEyNVxcXCI7XFxufVxcbi5nbHlwaGljb24tdGh1bWJzLWRvd246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEyNlxcXCI7XFxufVxcbi5nbHlwaGljb24taGFuZC1yaWdodDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTI3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oYW5kLWxlZnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEyOFxcXCI7XFxufVxcbi5nbHlwaGljb24taGFuZC11cDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTI5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oYW5kLWRvd246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEzMFxcXCI7XFxufVxcbi5nbHlwaGljb24tY2lyY2xlLWFycm93LXJpZ2h0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNpcmNsZS1hcnJvdy1sZWZ0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNpcmNsZS1hcnJvdy11cDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTMzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jaXJjbGUtYXJyb3ctZG93bjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTM0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1nbG9iZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTM1XFxcIjtcXG59XFxuLmdseXBoaWNvbi13cmVuY2g6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEzNlxcXCI7XFxufVxcbi5nbHlwaGljb24tdGFza3M6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEzN1xcXCI7XFxufVxcbi5nbHlwaGljb24tZmlsdGVyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWJyaWVmY2FzZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTM5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1mdWxsc2NyZWVuOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNDBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWRhc2hib2FyZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1wYXBlcmNsaXA6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE0MlxcXCI7XFxufVxcbi5nbHlwaGljb24taGVhcnQtZW1wdHk6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE0M1xcXCI7XFxufVxcbi5nbHlwaGljb24tbGluazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQ0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1waG9uZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQ1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1wdXNocGluOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNDZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXVzZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQ4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1nYnA6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE0OVxcXCI7XFxufVxcbi5nbHlwaGljb24tc29ydDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTUwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3J0LWJ5LWFscGhhYmV0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNTFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvcnQtYnktYWxwaGFiZXQtYWx0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNTJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvcnQtYnktb3JkZXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1M1xcXCI7XFxufVxcbi5nbHlwaGljb24tc29ydC1ieS1vcmRlci1hbHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1NFxcXCI7XFxufVxcbi5nbHlwaGljb24tc29ydC1ieS1hdHRyaWJ1dGVzOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNTVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvcnQtYnktYXR0cmlidXRlcy1hbHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1NlxcXCI7XFxufVxcbi5nbHlwaGljb24tdW5jaGVja2VkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNTdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWV4cGFuZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTU4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jb2xsYXBzZS1kb3duOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNTlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNvbGxhcHNlLXVwOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWxvZy1pbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTYxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1mbGFzaDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTYyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1sb2ctb3V0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLW5ldy13aW5kb3c6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE2NFxcXCI7XFxufVxcbi5nbHlwaGljb24tcmVjb3JkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNhdmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE2NlxcXCI7XFxufVxcbi5nbHlwaGljb24tb3BlbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTY3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zYXZlZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTY4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1pbXBvcnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE2OVxcXCI7XFxufVxcbi5nbHlwaGljb24tZXhwb3J0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNzBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNlbmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3MVxcXCI7XFxufVxcbi5nbHlwaGljb24tZmxvcHB5LWRpc2s6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3MlxcXCI7XFxufVxcbi5nbHlwaGljb24tZmxvcHB5LXNhdmVkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNzNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZsb3BweS1yZW1vdmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3NFxcXCI7XFxufVxcbi5nbHlwaGljb24tZmxvcHB5LXNhdmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3NVxcXCI7XFxufVxcbi5nbHlwaGljb24tZmxvcHB5LW9wZW46YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3NlxcXCI7XFxufVxcbi5nbHlwaGljb24tY3JlZGl0LWNhcmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3N1xcXCI7XFxufVxcbi5nbHlwaGljb24tdHJhbnNmZXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3OFxcXCI7XFxufVxcbi5nbHlwaGljb24tY3V0bGVyeTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTc5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oZWFkZXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4MFxcXCI7XFxufVxcbi5nbHlwaGljb24tY29tcHJlc3NlZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTgxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1lYXJwaG9uZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTgyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1waG9uZS1hbHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4M1xcXCI7XFxufVxcbi5nbHlwaGljb24tdG93ZXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4NFxcXCI7XFxufVxcbi5nbHlwaGljb24tc3RhdHM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4NVxcXCI7XFxufVxcbi5nbHlwaGljb24tc2QtdmlkZW86YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4NlxcXCI7XFxufVxcbi5nbHlwaGljb24taGQtdmlkZW86YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4N1xcXCI7XFxufVxcbi5nbHlwaGljb24tc3VidGl0bGVzOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxODhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvdW5kLXN0ZXJlbzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTg5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3VuZC1kb2xieTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTkwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3VuZC01LTE6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE5MVxcXCI7XFxufVxcbi5nbHlwaGljb24tc291bmQtNi0xOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvdW5kLTctMTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTkzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jb3B5cmlnaHQtbWFyazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTk0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZWdpc3RyYXRpb24tbWFyazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTk1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jbG91ZC1kb3dubG9hZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTk3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jbG91ZC11cGxvYWQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE5OFxcXCI7XFxufVxcbi5nbHlwaGljb24tdHJlZS1jb25pZmVyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRyZWUtZGVjaWR1b3VzOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUyMDBcXFwiO1xcbn1cXG4uY2FyZXQge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgd2lkdGg6IDA7XFxuICBoZWlnaHQ6IDA7XFxuICBtYXJnaW4tbGVmdDogMnB4O1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIGJvcmRlci10b3A6IDRweCBzb2xpZDtcXG4gIGJvcmRlci1yaWdodDogNHB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCB0cmFuc3BhcmVudDtcXG59XFxuLmRyb3Bkb3duIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG59XFxuLmRyb3Bkb3duLXRvZ2dsZTpmb2N1cyB7XFxuICBvdXRsaW5lOiAwO1xcbn1cXG4uZHJvcGRvd24tbWVudSB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDEwMCU7XFxuICBsZWZ0OiAwO1xcbiAgei1pbmRleDogMTAwMDtcXG4gIGRpc3BsYXk6IG5vbmU7XFxuICBmbG9hdDogbGVmdDtcXG4gIG1pbi13aWR0aDogMTYwcHg7XFxuICBwYWRkaW5nOiA1cHggMDtcXG4gIG1hcmdpbjogMnB4IDAgMDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxuICBmb250LXNpemU6IDE0cHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2NjY2NjYztcXG4gIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC4xNSk7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IDAgNnB4IDEycHggcmdiYSgwLCAwLCAwLCAwLjE3NSk7XFxuICBib3gtc2hhZG93OiAwIDZweCAxMnB4IHJnYmEoMCwgMCwgMCwgMC4xNzUpO1xcbiAgYmFja2dyb3VuZC1jbGlwOiBwYWRkaW5nLWJveDtcXG59XFxuLmRyb3Bkb3duLW1lbnUucHVsbC1yaWdodCB7XFxuICByaWdodDogMDtcXG4gIGxlZnQ6IGF1dG87XFxufVxcbi5kcm9wZG93bi1tZW51IC5kaXZpZGVyIHtcXG4gIGhlaWdodDogMXB4O1xcbiAgbWFyZ2luOiA5cHggMDtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTVlNWU1O1xcbn1cXG4uZHJvcGRvd24tbWVudSA+IGxpID4gYSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBhZGRpbmc6IDNweCAyMHB4O1xcbiAgY2xlYXI6IGJvdGg7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxufVxcbi5kcm9wZG93bi1tZW51ID4gbGkgPiBhOmhvdmVyLFxcbi5kcm9wZG93bi1tZW51ID4gbGkgPiBhOmZvY3VzIHtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGNvbG9yOiAjMjYyNjI2O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG59XFxuLmRyb3Bkb3duLW1lbnUgPiAuYWN0aXZlID4gYSxcXG4uZHJvcGRvd24tbWVudSA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbi5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBvdXRsaW5lOiAwO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG59XFxuLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhLFxcbi5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYTpob3ZlcixcXG4uZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYTpob3ZlcixcXG4uZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGE6Zm9jdXMge1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xcbiAgZmlsdGVyOiBwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuZ3JhZGllbnQoZW5hYmxlZCA9IGZhbHNlKTtcXG4gIGN1cnNvcjogbm90LWFsbG93ZWQ7XFxufVxcbi5vcGVuID4gLmRyb3Bkb3duLW1lbnUge1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5vcGVuID4gYSB7XFxuICBvdXRsaW5lOiAwO1xcbn1cXG4uZHJvcGRvd24tbWVudS1yaWdodCB7XFxuICBsZWZ0OiBhdXRvO1xcbiAgcmlnaHQ6IDA7XFxufVxcbi5kcm9wZG93bi1tZW51LWxlZnQge1xcbiAgbGVmdDogMDtcXG4gIHJpZ2h0OiBhdXRvO1xcbn1cXG4uZHJvcGRvd24taGVhZGVyIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZzogM3B4IDIwcHg7XFxuICBmb250LXNpemU6IDEycHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbn1cXG4uZHJvcGRvd24tYmFja2Ryb3Age1xcbiAgcG9zaXRpb246IGZpeGVkO1xcbiAgbGVmdDogMDtcXG4gIHJpZ2h0OiAwO1xcbiAgYm90dG9tOiAwO1xcbiAgdG9wOiAwO1xcbiAgei1pbmRleDogOTkwO1xcbn1cXG4ucHVsbC1yaWdodCA+IC5kcm9wZG93bi1tZW51IHtcXG4gIHJpZ2h0OiAwO1xcbiAgbGVmdDogYXV0bztcXG59XFxuLmRyb3B1cCAuY2FyZXQsXFxuLm5hdmJhci1maXhlZC1ib3R0b20gLmRyb3Bkb3duIC5jYXJldCB7XFxuICBib3JkZXItdG9wOiAwO1xcbiAgYm9yZGVyLWJvdHRvbTogNHB4IHNvbGlkO1xcbiAgY29udGVudDogXFxcIlxcXCI7XFxufVxcbi5kcm9wdXAgLmRyb3Bkb3duLW1lbnUsXFxuLm5hdmJhci1maXhlZC1ib3R0b20gLmRyb3Bkb3duIC5kcm9wZG93bi1tZW51IHtcXG4gIHRvcDogYXV0bztcXG4gIGJvdHRvbTogMTAwJTtcXG4gIG1hcmdpbi1ib3R0b206IDFweDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLXJpZ2h0IC5kcm9wZG93bi1tZW51IHtcXG4gICAgbGVmdDogYXV0bztcXG4gICAgcmlnaHQ6IDA7XFxuICB9XFxuICAubmF2YmFyLXJpZ2h0IC5kcm9wZG93bi1tZW51LWxlZnQge1xcbiAgICBsZWZ0OiAwO1xcbiAgICByaWdodDogYXV0bztcXG4gIH1cXG59XFxuLmJ0bi1ncm91cCxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGZsb2F0OiBsZWZ0O1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bjpob3ZlcixcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bjpob3ZlcixcXG4uYnRuLWdyb3VwID4gLmJ0bjpmb2N1cyxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bjpmb2N1cyxcXG4uYnRuLWdyb3VwID4gLmJ0bjphY3RpdmUsXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG46YWN0aXZlLFxcbi5idG4tZ3JvdXAgPiAuYnRuLmFjdGl2ZSxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi5hY3RpdmUge1xcbiAgei1pbmRleDogMjtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG46Zm9jdXMsXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG46Zm9jdXMge1xcbiAgb3V0bGluZTogbm9uZTtcXG59XFxuLmJ0bi1ncm91cCAuYnRuICsgLmJ0bixcXG4uYnRuLWdyb3VwIC5idG4gKyAuYnRuLWdyb3VwLFxcbi5idG4tZ3JvdXAgLmJ0bi1ncm91cCArIC5idG4sXFxuLmJ0bi1ncm91cCAuYnRuLWdyb3VwICsgLmJ0bi1ncm91cCB7XFxuICBtYXJnaW4tbGVmdDogLTFweDtcXG59XFxuLmJ0bi10b29sYmFyIHtcXG4gIG1hcmdpbi1sZWZ0OiAtNXB4O1xcbn1cXG4uYnRuLXRvb2xiYXIgLmJ0bi1ncm91cCxcXG4uYnRuLXRvb2xiYXIgLmlucHV0LWdyb3VwIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbn1cXG4uYnRuLXRvb2xiYXIgPiAuYnRuLFxcbi5idG4tdG9vbGJhciA+IC5idG4tZ3JvdXAsXFxuLmJ0bi10b29sYmFyID4gLmlucHV0LWdyb3VwIHtcXG4gIG1hcmdpbi1sZWZ0OiA1cHg7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuOm5vdCg6Zmlyc3QtY2hpbGQpOm5vdCg6bGFzdC1jaGlsZCk6bm90KC5kcm9wZG93bi10b2dnbGUpIHtcXG4gIGJvcmRlci1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuOmZpcnN0LWNoaWxkIHtcXG4gIG1hcmdpbi1sZWZ0OiAwO1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bjpmaXJzdC1jaGlsZDpub3QoOmxhc3QtY2hpbGQpOm5vdCguZHJvcGRvd24tdG9nZ2xlKSB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMDtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bjpsYXN0LWNoaWxkOm5vdCg6Zmlyc3QtY2hpbGQpLFxcbi5idG4tZ3JvdXAgPiAuZHJvcGRvd24tdG9nZ2xlOm5vdCg6Zmlyc3QtY2hpbGQpIHtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bi1ncm91cCB7XFxuICBmbG9hdDogbGVmdDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG4tZ3JvdXA6bm90KDpmaXJzdC1jaGlsZCk6bm90KDpsYXN0LWNoaWxkKSA+IC5idG4ge1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG4tZ3JvdXA6Zmlyc3QtY2hpbGQgPiAuYnRuOmxhc3QtY2hpbGQsXFxuLmJ0bi1ncm91cCA+IC5idG4tZ3JvdXA6Zmlyc3QtY2hpbGQgPiAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuLWdyb3VwOmxhc3QtY2hpbGQgPiAuYnRuOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwIC5kcm9wZG93bi10b2dnbGU6YWN0aXZlLFxcbi5idG4tZ3JvdXAub3BlbiAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIG91dGxpbmU6IDA7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuICsgLmRyb3Bkb3duLXRvZ2dsZSB7XFxuICBwYWRkaW5nLWxlZnQ6IDhweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDhweDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG4tbGcgKyAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIHBhZGRpbmctbGVmdDogMTJweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDEycHg7XFxufVxcbi5idG4tZ3JvdXAub3BlbiAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAzcHggNXB4IHJnYmEoMCwgMCwgMCwgMC4xMjUpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAzcHggNXB4IHJnYmEoMCwgMCwgMCwgMC4xMjUpO1xcbn1cXG4uYnRuLWdyb3VwLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4tbGluayB7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IG5vbmU7XFxuICBib3gtc2hhZG93OiBub25lO1xcbn1cXG4uYnRuIC5jYXJldCB7XFxuICBtYXJnaW4tbGVmdDogMDtcXG59XFxuLmJ0bi1sZyAuY2FyZXQge1xcbiAgYm9yZGVyLXdpZHRoOiA1cHggNXB4IDA7XFxuICBib3JkZXItYm90dG9tLXdpZHRoOiAwO1xcbn1cXG4uZHJvcHVwIC5idG4tbGcgLmNhcmV0IHtcXG4gIGJvcmRlci13aWR0aDogMCA1cHggNXB4O1xcbn1cXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bixcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cCxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cCA+IC5idG4ge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBmbG9hdDogbm9uZTtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgbWF4LXdpZHRoOiAxMDAlO1xcbn1cXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cCA+IC5idG4ge1xcbiAgZmxvYXQ6IG5vbmU7XFxufVxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuICsgLmJ0bixcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0biArIC5idG4tZ3JvdXAsXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXAgKyAuYnRuLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwICsgLmJ0bi1ncm91cCB7XFxuICBtYXJnaW4tdG9wOiAtMXB4O1xcbiAgbWFyZ2luLWxlZnQ6IDA7XFxufVxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuOm5vdCg6Zmlyc3QtY2hpbGQpOm5vdCg6bGFzdC1jaGlsZCkge1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG46Zmlyc3QtY2hpbGQ6bm90KDpsYXN0LWNoaWxkKSB7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogNHB4O1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bjpsYXN0LWNoaWxkOm5vdCg6Zmlyc3QtY2hpbGQpIHtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDRweDtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXA6bm90KDpmaXJzdC1jaGlsZCk6bm90KDpsYXN0LWNoaWxkKSA+IC5idG4ge1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXA6Zmlyc3QtY2hpbGQ6bm90KDpsYXN0LWNoaWxkKSA+IC5idG46bGFzdC1jaGlsZCxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cDpmaXJzdC1jaGlsZDpub3QoOmxhc3QtY2hpbGQpID4gLmRyb3Bkb3duLXRvZ2dsZSB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwOmxhc3QtY2hpbGQ6bm90KDpmaXJzdC1jaGlsZCkgPiAuYnRuOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cC1qdXN0aWZpZWQge1xcbiAgZGlzcGxheTogdGFibGU7XFxuICB3aWR0aDogMTAwJTtcXG4gIHRhYmxlLWxheW91dDogZml4ZWQ7XFxuICBib3JkZXItY29sbGFwc2U6IHNlcGFyYXRlO1xcbn1cXG4uYnRuLWdyb3VwLWp1c3RpZmllZCA+IC5idG4sXFxuLmJ0bi1ncm91cC1qdXN0aWZpZWQgPiAuYnRuLWdyb3VwIHtcXG4gIGZsb2F0OiBub25lO1xcbiAgZGlzcGxheTogdGFibGUtY2VsbDtcXG4gIHdpZHRoOiAxJTtcXG59XFxuLmJ0bi1ncm91cC1qdXN0aWZpZWQgPiAuYnRuLWdyb3VwIC5idG4ge1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcbltkYXRhLXRvZ2dsZT1cXFwiYnV0dG9uc1xcXCJdID4gLmJ0biA+IGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl0sXFxuW2RhdGEtdG9nZ2xlPVxcXCJidXR0b25zXFxcIl0gPiAuYnRuID4gaW5wdXRbdHlwZT1cXFwiY2hlY2tib3hcXFwiXSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG4uaW5wdXQtZ3JvdXAge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogdGFibGU7XFxuICBib3JkZXItY29sbGFwc2U6IHNlcGFyYXRlO1xcbn1cXG4uaW5wdXQtZ3JvdXBbY2xhc3MqPVxcXCJjb2wtXFxcIl0ge1xcbiAgZmxvYXQ6IG5vbmU7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBwYWRkaW5nLXJpZ2h0OiAwO1xcbn1cXG4uaW5wdXQtZ3JvdXAgLmZvcm0tY29udHJvbCB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB6LWluZGV4OiAyO1xcbiAgZmxvYXQ6IGxlZnQ7XFxuICB3aWR0aDogMTAwJTtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxufVxcbi5pbnB1dC1ncm91cC1sZyA+IC5mb3JtLWNvbnRyb2wsXFxuLmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbi5pbnB1dC1ncm91cC1sZyA+IC5pbnB1dC1ncm91cC1idG4gPiAuYnRuIHtcXG4gIGhlaWdodDogNDZweDtcXG4gIHBhZGRpbmc6IDEwcHggMTZweDtcXG4gIGZvbnQtc2l6ZTogMThweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjMzO1xcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xcbn1cXG5zZWxlY3QuaW5wdXQtZ3JvdXAtbGcgPiAuZm9ybS1jb250cm9sLFxcbnNlbGVjdC5pbnB1dC1ncm91cC1sZyA+IC5pbnB1dC1ncm91cC1hZGRvbixcXG5zZWxlY3QuaW5wdXQtZ3JvdXAtbGcgPiAuaW5wdXQtZ3JvdXAtYnRuID4gLmJ0biB7XFxuICBoZWlnaHQ6IDQ2cHg7XFxuICBsaW5lLWhlaWdodDogNDZweDtcXG59XFxudGV4dGFyZWEuaW5wdXQtZ3JvdXAtbGcgPiAuZm9ybS1jb250cm9sLFxcbnRleHRhcmVhLmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbnRleHRhcmVhLmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWJ0biA+IC5idG4sXFxuc2VsZWN0W211bHRpcGxlXS5pbnB1dC1ncm91cC1sZyA+IC5mb3JtLWNvbnRyb2wsXFxuc2VsZWN0W211bHRpcGxlXS5pbnB1dC1ncm91cC1sZyA+IC5pbnB1dC1ncm91cC1hZGRvbixcXG5zZWxlY3RbbXVsdGlwbGVdLmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWJ0biA+IC5idG4ge1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG4uaW5wdXQtZ3JvdXAtc20gPiAuZm9ybS1jb250cm9sLFxcbi5pbnB1dC1ncm91cC1zbSA+IC5pbnB1dC1ncm91cC1hZGRvbixcXG4uaW5wdXQtZ3JvdXAtc20gPiAuaW5wdXQtZ3JvdXAtYnRuID4gLmJ0biB7XFxuICBoZWlnaHQ6IDMwcHg7XFxuICBwYWRkaW5nOiA1cHggMTBweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjU7XFxuICBib3JkZXItcmFkaXVzOiAzcHg7XFxufVxcbnNlbGVjdC5pbnB1dC1ncm91cC1zbSA+IC5mb3JtLWNvbnRyb2wsXFxuc2VsZWN0LmlucHV0LWdyb3VwLXNtID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbnNlbGVjdC5pbnB1dC1ncm91cC1zbSA+IC5pbnB1dC1ncm91cC1idG4gPiAuYnRuIHtcXG4gIGhlaWdodDogMzBweDtcXG4gIGxpbmUtaGVpZ2h0OiAzMHB4O1xcbn1cXG50ZXh0YXJlYS5pbnB1dC1ncm91cC1zbSA+IC5mb3JtLWNvbnRyb2wsXFxudGV4dGFyZWEuaW5wdXQtZ3JvdXAtc20gPiAuaW5wdXQtZ3JvdXAtYWRkb24sXFxudGV4dGFyZWEuaW5wdXQtZ3JvdXAtc20gPiAuaW5wdXQtZ3JvdXAtYnRuID4gLmJ0bixcXG5zZWxlY3RbbXVsdGlwbGVdLmlucHV0LWdyb3VwLXNtID4gLmZvcm0tY29udHJvbCxcXG5zZWxlY3RbbXVsdGlwbGVdLmlucHV0LWdyb3VwLXNtID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbnNlbGVjdFttdWx0aXBsZV0uaW5wdXQtZ3JvdXAtc20gPiAuaW5wdXQtZ3JvdXAtYnRuID4gLmJ0biB7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbixcXG4uaW5wdXQtZ3JvdXAtYnRuLFxcbi5pbnB1dC1ncm91cCAuZm9ybS1jb250cm9sIHtcXG4gIGRpc3BsYXk6IHRhYmxlLWNlbGw7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbjpub3QoOmZpcnN0LWNoaWxkKTpub3QoOmxhc3QtY2hpbGQpLFxcbi5pbnB1dC1ncm91cC1idG46bm90KDpmaXJzdC1jaGlsZCk6bm90KDpsYXN0LWNoaWxkKSxcXG4uaW5wdXQtZ3JvdXAgLmZvcm0tY29udHJvbDpub3QoOmZpcnN0LWNoaWxkKTpub3QoOmxhc3QtY2hpbGQpIHtcXG4gIGJvcmRlci1yYWRpdXM6IDA7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbixcXG4uaW5wdXQtZ3JvdXAtYnRuIHtcXG4gIHdpZHRoOiAxJTtcXG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxuICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbn1cXG4uaW5wdXQtZ3JvdXAtYWRkb24ge1xcbiAgcGFkZGluZzogNnB4IDEycHg7XFxuICBmb250LXNpemU6IDE0cHg7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgbGluZS1oZWlnaHQ6IDE7XFxuICBjb2xvcjogIzU1NTU1NTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZWVlZWU7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjY2NjY2NjO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4uaW5wdXQtZ3JvdXAtYWRkb24uaW5wdXQtc20ge1xcbiAgcGFkZGluZzogNXB4IDEwcHg7XFxuICBmb250LXNpemU6IDEycHg7XFxuICBib3JkZXItcmFkaXVzOiAzcHg7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbi5pbnB1dC1sZyB7XFxuICBwYWRkaW5nOiAxMHB4IDE2cHg7XFxuICBmb250LXNpemU6IDE4cHg7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbiBpbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdLFxcbi5pbnB1dC1ncm91cC1hZGRvbiBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdIHtcXG4gIG1hcmdpbi10b3A6IDA7XFxufVxcbi5pbnB1dC1ncm91cCAuZm9ybS1jb250cm9sOmZpcnN0LWNoaWxkLFxcbi5pbnB1dC1ncm91cC1hZGRvbjpmaXJzdC1jaGlsZCxcXG4uaW5wdXQtZ3JvdXAtYnRuOmZpcnN0LWNoaWxkID4gLmJ0bixcXG4uaW5wdXQtZ3JvdXAtYnRuOmZpcnN0LWNoaWxkID4gLmJ0bi1ncm91cCA+IC5idG4sXFxuLmlucHV0LWdyb3VwLWJ0bjpmaXJzdC1jaGlsZCA+IC5kcm9wZG93bi10b2dnbGUsXFxuLmlucHV0LWdyb3VwLWJ0bjpsYXN0LWNoaWxkID4gLmJ0bjpub3QoOmxhc3QtY2hpbGQpOm5vdCguZHJvcGRvd24tdG9nZ2xlKSxcXG4uaW5wdXQtZ3JvdXAtYnRuOmxhc3QtY2hpbGQgPiAuYnRuLWdyb3VwOm5vdCg6bGFzdC1jaGlsZCkgPiAuYnRuIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbjpmaXJzdC1jaGlsZCB7XFxuICBib3JkZXItcmlnaHQ6IDA7XFxufVxcbi5pbnB1dC1ncm91cCAuZm9ybS1jb250cm9sOmxhc3QtY2hpbGQsXFxuLmlucHV0LWdyb3VwLWFkZG9uOmxhc3QtY2hpbGQsXFxuLmlucHV0LWdyb3VwLWJ0bjpsYXN0LWNoaWxkID4gLmJ0bixcXG4uaW5wdXQtZ3JvdXAtYnRuOmxhc3QtY2hpbGQgPiAuYnRuLWdyb3VwID4gLmJ0bixcXG4uaW5wdXQtZ3JvdXAtYnRuOmxhc3QtY2hpbGQgPiAuZHJvcGRvd24tdG9nZ2xlLFxcbi5pbnB1dC1ncm91cC1idG46Zmlyc3QtY2hpbGQgPiAuYnRuOm5vdCg6Zmlyc3QtY2hpbGQpLFxcbi5pbnB1dC1ncm91cC1idG46Zmlyc3QtY2hpbGQgPiAuYnRuLWdyb3VwOm5vdCg6Zmlyc3QtY2hpbGQpID4gLmJ0biB7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMDtcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uOmxhc3QtY2hpbGQge1xcbiAgYm9yZGVyLWxlZnQ6IDA7XFxufVxcbi5pbnB1dC1ncm91cC1idG4ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZm9udC1zaXplOiAwO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG59XFxuLmlucHV0LWdyb3VwLWJ0biA+IC5idG4ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG4uaW5wdXQtZ3JvdXAtYnRuID4gLmJ0biArIC5idG4ge1xcbiAgbWFyZ2luLWxlZnQ6IC0xcHg7XFxufVxcbi5pbnB1dC1ncm91cC1idG4gPiAuYnRuOmhvdmVyLFxcbi5pbnB1dC1ncm91cC1idG4gPiAuYnRuOmZvY3VzLFxcbi5pbnB1dC1ncm91cC1idG4gPiAuYnRuOmFjdGl2ZSB7XFxuICB6LWluZGV4OiAyO1xcbn1cXG4uaW5wdXQtZ3JvdXAtYnRuOmZpcnN0LWNoaWxkID4gLmJ0bixcXG4uaW5wdXQtZ3JvdXAtYnRuOmZpcnN0LWNoaWxkID4gLmJ0bi1ncm91cCB7XFxuICBtYXJnaW4tcmlnaHQ6IC0xcHg7XFxufVxcbi5pbnB1dC1ncm91cC1idG46bGFzdC1jaGlsZCA+IC5idG4sXFxuLmlucHV0LWdyb3VwLWJ0bjpsYXN0LWNoaWxkID4gLmJ0bi1ncm91cCB7XFxuICBtYXJnaW4tbGVmdDogLTFweDtcXG59XFxuLm5hdiB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG59XFxuLm5hdiA+IGxpIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG4ubmF2ID4gbGkgPiBhIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZzogMTBweCAxNXB4O1xcbn1cXG4ubmF2ID4gbGkgPiBhOmhvdmVyLFxcbi5uYXYgPiBsaSA+IGE6Zm9jdXMge1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VlZWVlZTtcXG59XFxuLm5hdiA+IGxpLmRpc2FibGVkID4gYSB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLm5hdiA+IGxpLmRpc2FibGVkID4gYTpob3ZlcixcXG4ubmF2ID4gbGkuZGlzYWJsZWQgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xcbn1cXG4ubmF2IC5vcGVuID4gYSxcXG4ubmF2IC5vcGVuID4gYTpob3ZlcixcXG4ubmF2IC5vcGVuID4gYTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlZWVlO1xcbiAgYm9yZGVyLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4ubmF2IC5uYXYtZGl2aWRlciB7XFxuICBoZWlnaHQ6IDFweDtcXG4gIG1hcmdpbjogOXB4IDA7XFxuICBvdmVyZmxvdzogaGlkZGVuO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2U1ZTVlNTtcXG59XFxuLm5hdiA+IGxpID4gYSA+IGltZyB7XFxuICBtYXgtd2lkdGg6IG5vbmU7XFxufVxcbi5uYXYtdGFicyB7XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLm5hdi10YWJzID4gbGkge1xcbiAgZmxvYXQ6IGxlZnQ7XFxuICBtYXJnaW4tYm90dG9tOiAtMXB4O1xcbn1cXG4ubmF2LXRhYnMgPiBsaSA+IGEge1xcbiAgbWFyZ2luLXJpZ2h0OiAycHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLXJhZGl1czogNHB4IDRweCAwIDA7XFxufVxcbi5uYXYtdGFicyA+IGxpID4gYTpob3ZlciB7XFxuICBib3JkZXItY29sb3I6ICNlZWVlZWUgI2VlZWVlZSAjZGRkZGRkO1xcbn1cXG4ubmF2LXRhYnMgPiBsaS5hY3RpdmUgPiBhLFxcbi5uYXYtdGFicyA+IGxpLmFjdGl2ZSA+IGE6aG92ZXIsXFxuLm5hdi10YWJzID4gbGkuYWN0aXZlID4gYTpmb2N1cyB7XFxuICBjb2xvcjogIzU1NTU1NTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBjdXJzb3I6IGRlZmF1bHQ7XFxufVxcbi5uYXYtdGFicy5uYXYtanVzdGlmaWVkIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgYm9yZGVyLWJvdHRvbTogMDtcXG59XFxuLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiBsaSB7XFxuICBmbG9hdDogbm9uZTtcXG59XFxuLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiBsaSA+IGEge1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgbWFyZ2luLWJvdHRvbTogNXB4O1xcbn1cXG4ubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IC5kcm9wZG93biAuZHJvcGRvd24tbWVudSB7XFxuICB0b3A6IGF1dG87XFxuICBsZWZ0OiBhdXRvO1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gbGkge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1jZWxsO1xcbiAgICB3aWR0aDogMSU7XFxuICB9XFxuICAubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IGxpID4gYSB7XFxuICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICB9XFxufVxcbi5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gIG1hcmdpbi1yaWdodDogMDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiAuYWN0aXZlID4gYSxcXG4ubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbi5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IGxpID4gYSB7XFxuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZGRkZGRkO1xcbiAgICBib3JkZXItcmFkaXVzOiA0cHggNHB4IDAgMDtcXG4gIH1cXG4gIC5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGEsXFxuICAubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbiAgLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICAgIGJvcmRlci1ib3R0b20tY29sb3I6ICNmZmZmZmY7XFxuICB9XFxufVxcbi5uYXYtcGlsbHMgPiBsaSB7XFxuICBmbG9hdDogbGVmdDtcXG59XFxuLm5hdi1waWxscyA+IGxpID4gYSB7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxufVxcbi5uYXYtcGlsbHMgPiBsaSArIGxpIHtcXG4gIG1hcmdpbi1sZWZ0OiAycHg7XFxufVxcbi5uYXYtcGlsbHMgPiBsaS5hY3RpdmUgPiBhLFxcbi5uYXYtcGlsbHMgPiBsaS5hY3RpdmUgPiBhOmhvdmVyLFxcbi5uYXYtcGlsbHMgPiBsaS5hY3RpdmUgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG59XFxuLm5hdi1zdGFja2VkID4gbGkge1xcbiAgZmxvYXQ6IG5vbmU7XFxufVxcbi5uYXYtc3RhY2tlZCA+IGxpICsgbGkge1xcbiAgbWFyZ2luLXRvcDogMnB4O1xcbiAgbWFyZ2luLWxlZnQ6IDA7XFxufVxcbi5uYXYtanVzdGlmaWVkIHtcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4ubmF2LWp1c3RpZmllZCA+IGxpIHtcXG4gIGZsb2F0OiBub25lO1xcbn1cXG4ubmF2LWp1c3RpZmllZCA+IGxpID4gYSB7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICBtYXJnaW4tYm90dG9tOiA1cHg7XFxufVxcbi5uYXYtanVzdGlmaWVkID4gLmRyb3Bkb3duIC5kcm9wZG93bi1tZW51IHtcXG4gIHRvcDogYXV0bztcXG4gIGxlZnQ6IGF1dG87XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdi1qdXN0aWZpZWQgPiBsaSB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLWNlbGw7XFxuICAgIHdpZHRoOiAxJTtcXG4gIH1cXG4gIC5uYXYtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIH1cXG59XFxuLm5hdi10YWJzLWp1c3RpZmllZCB7XFxuICBib3JkZXItYm90dG9tOiAwO1xcbn1cXG4ubmF2LXRhYnMtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gIG1hcmdpbi1yaWdodDogMDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLm5hdi10YWJzLWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhLFxcbi5uYXYtdGFicy1qdXN0aWZpZWQgPiAuYWN0aXZlID4gYTpob3ZlcixcXG4ubmF2LXRhYnMtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2LXRhYnMtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICAgIGJvcmRlci1yYWRpdXM6IDRweCA0cHggMCAwO1xcbiAgfVxcbiAgLm5hdi10YWJzLWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhLFxcbiAgLm5hdi10YWJzLWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbiAgLm5hdi10YWJzLWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhOmZvY3VzIHtcXG4gICAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2ZmZmZmZjtcXG4gIH1cXG59XFxuLnRhYi1jb250ZW50ID4gLnRhYi1wYW5lIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcbi50YWItY29udGVudCA+IC5hY3RpdmUge1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5uYXYtdGFicyAuZHJvcGRvd24tbWVudSB7XFxuICBtYXJnaW4tdG9wOiAtMXB4O1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4ubmF2YmFyIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIG1pbi1oZWlnaHQ6IDUwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhciB7XFxuICAgIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLWhlYWRlciB7XFxuICAgIGZsb2F0OiBsZWZ0O1xcbiAgfVxcbn1cXG4ubmF2YmFyLWNvbGxhcHNlIHtcXG4gIG1heC1oZWlnaHQ6IDM0MHB4O1xcbiAgb3ZlcmZsb3cteDogdmlzaWJsZTtcXG4gIHBhZGRpbmctcmlnaHQ6IDE1cHg7XFxuICBwYWRkaW5nLWxlZnQ6IDE1cHg7XFxuICBib3JkZXItdG9wOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAwIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKTtcXG4gIC13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOiB0b3VjaDtcXG59XFxuLm5hdmJhci1jb2xsYXBzZS5pbiB7XFxuICBvdmVyZmxvdy15OiBhdXRvO1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItY29sbGFwc2Uge1xcbiAgICB3aWR0aDogYXV0bztcXG4gICAgYm9yZGVyLXRvcDogMDtcXG4gICAgYm94LXNoYWRvdzogbm9uZTtcXG4gIH1cXG4gIC5uYXZiYXItY29sbGFwc2UuY29sbGFwc2Uge1xcbiAgICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50O1xcbiAgICBoZWlnaHQ6IGF1dG8gIWltcG9ydGFudDtcXG4gICAgcGFkZGluZy1ib3R0b206IDA7XFxuICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XFxuICB9XFxuICAubmF2YmFyLWNvbGxhcHNlLmluIHtcXG4gICAgb3ZlcmZsb3cteTogdmlzaWJsZTtcXG4gIH1cXG4gIC5uYXZiYXItZml4ZWQtdG9wIC5uYXZiYXItY29sbGFwc2UsXFxuICAubmF2YmFyLXN0YXRpYy10b3AgLm5hdmJhci1jb2xsYXBzZSxcXG4gIC5uYXZiYXItZml4ZWQtYm90dG9tIC5uYXZiYXItY29sbGFwc2Uge1xcbiAgICBwYWRkaW5nLWxlZnQ6IDA7XFxuICAgIHBhZGRpbmctcmlnaHQ6IDA7XFxuICB9XFxufVxcbi5jb250YWluZXIgPiAubmF2YmFyLWhlYWRlcixcXG4uY29udGFpbmVyLWZsdWlkID4gLm5hdmJhci1oZWFkZXIsXFxuLmNvbnRhaW5lciA+IC5uYXZiYXItY29sbGFwc2UsXFxuLmNvbnRhaW5lci1mbHVpZCA+IC5uYXZiYXItY29sbGFwc2Uge1xcbiAgbWFyZ2luLXJpZ2h0OiAtMTVweDtcXG4gIG1hcmdpbi1sZWZ0OiAtMTVweDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuY29udGFpbmVyID4gLm5hdmJhci1oZWFkZXIsXFxuICAuY29udGFpbmVyLWZsdWlkID4gLm5hdmJhci1oZWFkZXIsXFxuICAuY29udGFpbmVyID4gLm5hdmJhci1jb2xsYXBzZSxcXG4gIC5jb250YWluZXItZmx1aWQgPiAubmF2YmFyLWNvbGxhcHNlIHtcXG4gICAgbWFyZ2luLXJpZ2h0OiAwO1xcbiAgICBtYXJnaW4tbGVmdDogMDtcXG4gIH1cXG59XFxuLm5hdmJhci1zdGF0aWMtdG9wIHtcXG4gIHotaW5kZXg6IDEwMDA7XFxuICBib3JkZXItd2lkdGg6IDAgMCAxcHg7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhci1zdGF0aWMtdG9wIHtcXG4gICAgYm9yZGVyLXJhZGl1czogMDtcXG4gIH1cXG59XFxuLm5hdmJhci1maXhlZC10b3AsXFxuLm5hdmJhci1maXhlZC1ib3R0b20ge1xcbiAgcG9zaXRpb246IGZpeGVkO1xcbiAgcmlnaHQ6IDA7XFxuICBsZWZ0OiAwO1xcbiAgei1pbmRleDogMTAzMDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLWZpeGVkLXRvcCxcXG4gIC5uYXZiYXItZml4ZWQtYm90dG9tIHtcXG4gICAgYm9yZGVyLXJhZGl1czogMDtcXG4gIH1cXG59XFxuLm5hdmJhci1maXhlZC10b3Age1xcbiAgdG9wOiAwO1xcbiAgYm9yZGVyLXdpZHRoOiAwIDAgMXB4O1xcbn1cXG4ubmF2YmFyLWZpeGVkLWJvdHRvbSB7XFxuICBib3R0b206IDA7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgYm9yZGVyLXdpZHRoOiAxcHggMCAwO1xcbn1cXG4ubmF2YmFyLWJyYW5kIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbiAgcGFkZGluZzogMTVweCAxNXB4O1xcbiAgZm9udC1zaXplOiAxOHB4O1xcbiAgbGluZS1oZWlnaHQ6IDIwcHg7XFxuICBoZWlnaHQ6IDUwcHg7XFxufVxcbi5uYXZiYXItYnJhbmQ6aG92ZXIsXFxuLm5hdmJhci1icmFuZDpmb2N1cyB7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhciA+IC5jb250YWluZXIgLm5hdmJhci1icmFuZCxcXG4gIC5uYXZiYXIgPiAuY29udGFpbmVyLWZsdWlkIC5uYXZiYXItYnJhbmQge1xcbiAgICBtYXJnaW4tbGVmdDogLTE1cHg7XFxuICB9XFxufVxcbi5uYXZiYXItdG9nZ2xlIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGZsb2F0OiByaWdodDtcXG4gIG1hcmdpbi1yaWdodDogMTVweDtcXG4gIHBhZGRpbmc6IDlweCAxMHB4O1xcbiAgbWFyZ2luLXRvcDogOHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogOHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xcbiAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxufVxcbi5uYXZiYXItdG9nZ2xlOmZvY3VzIHtcXG4gIG91dGxpbmU6IG5vbmU7XFxufVxcbi5uYXZiYXItdG9nZ2xlIC5pY29uLWJhciB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHdpZHRoOiAyMnB4O1xcbiAgaGVpZ2h0OiAycHg7XFxuICBib3JkZXItcmFkaXVzOiAxcHg7XFxufVxcbi5uYXZiYXItdG9nZ2xlIC5pY29uLWJhciArIC5pY29uLWJhciB7XFxuICBtYXJnaW4tdG9wOiA0cHg7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhci10b2dnbGUge1xcbiAgICBkaXNwbGF5OiBub25lO1xcbiAgfVxcbn1cXG4ubmF2YmFyLW5hdiB7XFxuICBtYXJnaW46IDcuNXB4IC0xNXB4O1xcbn1cXG4ubmF2YmFyLW5hdiA+IGxpID4gYSB7XFxuICBwYWRkaW5nLXRvcDogMTBweDtcXG4gIHBhZGRpbmctYm90dG9tOiAxMHB4O1xcbiAgbGluZS1oZWlnaHQ6IDIwcHg7XFxufVxcbkBtZWRpYSAobWF4LXdpZHRoOiA3NjdweCkge1xcbiAgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUge1xcbiAgICBwb3NpdGlvbjogc3RhdGljO1xcbiAgICBmbG9hdDogbm9uZTtcXG4gICAgd2lkdGg6IGF1dG87XFxuICAgIG1hcmdpbi10b3A6IDA7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgICBib3JkZXI6IDA7XFxuICAgIGJveC1zaGFkb3c6IG5vbmU7XFxuICB9XFxuICAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYSxcXG4gIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51IC5kcm9wZG93bi1oZWFkZXIge1xcbiAgICBwYWRkaW5nOiA1cHggMTVweCA1cHggMjVweDtcXG4gIH1cXG4gIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhIHtcXG4gICAgbGluZS1oZWlnaHQ6IDIwcHg7XFxuICB9XFxuICAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYTpob3ZlcixcXG4gIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhOmZvY3VzIHtcXG4gICAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLW5hdiB7XFxuICAgIGZsb2F0OiBsZWZ0O1xcbiAgICBtYXJnaW46IDA7XFxuICB9XFxuICAubmF2YmFyLW5hdiA+IGxpIHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICB9XFxuICAubmF2YmFyLW5hdiA+IGxpID4gYSB7XFxuICAgIHBhZGRpbmctdG9wOiAxNXB4O1xcbiAgICBwYWRkaW5nLWJvdHRvbTogMTVweDtcXG4gIH1cXG4gIC5uYXZiYXItbmF2Lm5hdmJhci1yaWdodDpsYXN0LWNoaWxkIHtcXG4gICAgbWFyZ2luLXJpZ2h0OiAtMTVweDtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLWxlZnQge1xcbiAgICBmbG9hdDogbGVmdCAhaW1wb3J0YW50O1xcbiAgfVxcbiAgLm5hdmJhci1yaWdodCB7XFxuICAgIGZsb2F0OiByaWdodCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG4ubmF2YmFyLWZvcm0ge1xcbiAgbWFyZ2luLWxlZnQ6IC0xNXB4O1xcbiAgbWFyZ2luLXJpZ2h0OiAtMTVweDtcXG4gIHBhZGRpbmc6IDEwcHggMTVweDtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSksIDAgMXB4IDAgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSksIDAgMXB4IDAgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xcbiAgbWFyZ2luLXRvcDogOHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogOHB4O1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItZm9ybSAuZm9ybS1ncm91cCB7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIH1cXG4gIC5uYXZiYXItZm9ybSAuZm9ybS1jb250cm9sIHtcXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgICB3aWR0aDogYXV0bztcXG4gICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIH1cXG4gIC5uYXZiYXItZm9ybSAuaW5wdXQtZ3JvdXAgPiAuZm9ybS1jb250cm9sIHtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICB9XFxuICAubmF2YmFyLWZvcm0gLmNvbnRyb2wtbGFiZWwge1xcbiAgICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLm5hdmJhci1mb3JtIC5yYWRpbyxcXG4gIC5uYXZiYXItZm9ybSAuY2hlY2tib3gge1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIG1hcmdpbi10b3A6IDA7XFxuICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICAgIHBhZGRpbmctbGVmdDogMDtcXG4gICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIH1cXG4gIC5uYXZiYXItZm9ybSAucmFkaW8gaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXSxcXG4gIC5uYXZiYXItZm9ybSAuY2hlY2tib3ggaW5wdXRbdHlwZT1cXFwiY2hlY2tib3hcXFwiXSB7XFxuICAgIGZsb2F0OiBub25lO1xcbiAgICBtYXJnaW4tbGVmdDogMDtcXG4gIH1cXG4gIC5uYXZiYXItZm9ybSAuaGFzLWZlZWRiYWNrIC5mb3JtLWNvbnRyb2wtZmVlZGJhY2sge1xcbiAgICB0b3A6IDA7XFxuICB9XFxufVxcbkBtZWRpYSAobWF4LXdpZHRoOiA3NjdweCkge1xcbiAgLm5hdmJhci1mb3JtIC5mb3JtLWdyb3VwIHtcXG4gICAgbWFyZ2luLWJvdHRvbTogNXB4O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItZm9ybSB7XFxuICAgIHdpZHRoOiBhdXRvO1xcbiAgICBib3JkZXI6IDA7XFxuICAgIG1hcmdpbi1sZWZ0OiAwO1xcbiAgICBtYXJnaW4tcmlnaHQ6IDA7XFxuICAgIHBhZGRpbmctdG9wOiAwO1xcbiAgICBwYWRkaW5nLWJvdHRvbTogMDtcXG4gICAgLXdlYmtpdC1ib3gtc2hhZG93OiBub25lO1xcbiAgICBib3gtc2hhZG93OiBub25lO1xcbiAgfVxcbiAgLm5hdmJhci1mb3JtLm5hdmJhci1yaWdodDpsYXN0LWNoaWxkIHtcXG4gICAgbWFyZ2luLXJpZ2h0OiAtMTVweDtcXG4gIH1cXG59XFxuLm5hdmJhci1uYXYgPiBsaSA+IC5kcm9wZG93bi1tZW51IHtcXG4gIG1hcmdpbi10b3A6IDA7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5uYXZiYXItZml4ZWQtYm90dG9tIC5uYXZiYXItbmF2ID4gbGkgPiAuZHJvcGRvd24tbWVudSB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5uYXZiYXItYnRuIHtcXG4gIG1hcmdpbi10b3A6IDhweDtcXG4gIG1hcmdpbi1ib3R0b206IDhweDtcXG59XFxuLm5hdmJhci1idG4uYnRuLXNtIHtcXG4gIG1hcmdpbi10b3A6IDEwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAxMHB4O1xcbn1cXG4ubmF2YmFyLWJ0bi5idG4teHMge1xcbiAgbWFyZ2luLXRvcDogMTRweDtcXG4gIG1hcmdpbi1ib3R0b206IDE0cHg7XFxufVxcbi5uYXZiYXItdGV4dCB7XFxuICBtYXJnaW4tdG9wOiAxNXB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMTVweDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLXRleHQge1xcbiAgICBmbG9hdDogbGVmdDtcXG4gICAgbWFyZ2luLWxlZnQ6IDE1cHg7XFxuICAgIG1hcmdpbi1yaWdodDogMTVweDtcXG4gIH1cXG4gIC5uYXZiYXItdGV4dC5uYXZiYXItcmlnaHQ6bGFzdC1jaGlsZCB7XFxuICAgIG1hcmdpbi1yaWdodDogMDtcXG4gIH1cXG59XFxuLm5hdmJhci1kZWZhdWx0IHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7XFxuICBib3JkZXItY29sb3I6ICNlN2U3ZTc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLWJyYW5kIHtcXG4gIGNvbG9yOiAjNzc3Nzc3O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1icmFuZDpob3ZlcixcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1icmFuZDpmb2N1cyB7XFxuICBjb2xvcjogIzVlNWU1ZTtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci10ZXh0IHtcXG4gIGNvbG9yOiAjNzc3Nzc3O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiBsaSA+IGEge1xcbiAgY29sb3I6ICM3Nzc3Nzc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IGxpID4gYTpob3ZlcixcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiBsaSA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICMzMzMzMzM7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLmFjdGl2ZSA+IGEsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICM1NTU1NTU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTdlN2U3O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAuZGlzYWJsZWQgPiBhLFxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IC5kaXNhYmxlZCA+IGE6aG92ZXIsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLmRpc2FibGVkID4gYTpmb2N1cyB7XFxuICBjb2xvcjogI2NjY2NjYztcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci10b2dnbGUge1xcbiAgYm9yZGVyLWNvbG9yOiAjZGRkZGRkO1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci10b2dnbGU6aG92ZXIsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItdG9nZ2xlOmZvY3VzIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZGRkZGQ7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLXRvZ2dsZSAuaWNvbi1iYXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzg4ODg4ODtcXG59XFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItY29sbGFwc2UsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItZm9ybSB7XFxuICBib3JkZXItY29sb3I6ICNlN2U3ZTc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IC5vcGVuID4gYSxcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAub3BlbiA+IGE6aG92ZXIsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLm9wZW4gPiBhOmZvY3VzIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlN2U3ZTc7XFxuICBjb2xvcjogIzU1NTU1NTtcXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XFxuICAubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGEge1xcbiAgICBjb2xvcjogIzc3Nzc3NztcXG4gIH1cXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYTpob3ZlcixcXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYTpmb2N1cyB7XFxuICAgIGNvbG9yOiAjMzMzMzMzO1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIH1cXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5hY3RpdmUgPiBhLFxcbiAgLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuICAubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICAgIGNvbG9yOiAjNTU1NTU1O1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTdlN2U3O1xcbiAgfVxcbiAgLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYSxcXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGE6aG92ZXIsXFxuICAubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhOmZvY3VzIHtcXG4gICAgY29sb3I6ICNjY2NjY2M7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgfVxcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1saW5rIHtcXG4gIGNvbG9yOiAjNzc3Nzc3O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1saW5rOmhvdmVyIHtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbn1cXG4ubmF2YmFyLWludmVyc2Uge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzIyMjIyMjtcXG4gIGJvcmRlci1jb2xvcjogIzA4MDgwODtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItYnJhbmQge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLWJyYW5kOmhvdmVyLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLWJyYW5kOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLXRleHQge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IGxpID4gYSB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gbGkgPiBhOmhvdmVyLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IGxpID4gYTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAuYWN0aXZlID4gYSxcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAuYWN0aXZlID4gYTpob3ZlcixcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMwODA4MDg7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5kaXNhYmxlZCA+IGEsXFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gLmRpc2FibGVkID4gYTpob3ZlcixcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAuZGlzYWJsZWQgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjNDQ0NDQ0O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLXRvZ2dsZSB7XFxuICBib3JkZXItY29sb3I6ICMzMzMzMzM7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLXRvZ2dsZTpob3ZlcixcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci10b2dnbGU6Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMzMzMzMztcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItdG9nZ2xlIC5pY29uLWJhciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1jb2xsYXBzZSxcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1mb3JtIHtcXG4gIGJvcmRlci1jb2xvcjogIzEwMTAxMDtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gLm9wZW4gPiBhLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5vcGVuID4gYTpob3ZlcixcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAub3BlbiA+IGE6Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzA4MDgwODtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbn1cXG5AbWVkaWEgKG1heC13aWR0aDogNzY3cHgpIHtcXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5kcm9wZG93bi1oZWFkZXIge1xcbiAgICBib3JkZXItY29sb3I6ICMwODA4MDg7XFxuICB9XFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgLmRpdmlkZXIge1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDgwODA4O1xcbiAgfVxcbiAgLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhIHtcXG4gICAgY29sb3I6ICM5OTk5OTk7XFxuICB9XFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGE6aG92ZXIsXFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGE6Zm9jdXMge1xcbiAgICBjb2xvcjogI2ZmZmZmZjtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICB9XFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuYWN0aXZlID4gYSxcXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbiAgLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgICBjb2xvcjogI2ZmZmZmZjtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogIzA4MDgwODtcXG4gIH1cXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGEsXFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbiAgLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYTpmb2N1cyB7XFxuICAgIGNvbG9yOiAjNDQ0NDQ0O1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIH1cXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbGluayB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbGluazpob3ZlciB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG59XFxuLmJyZWFkY3J1bWIge1xcbiAgcGFkZGluZzogOHB4IDE1cHg7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxufVxcbi5icmVhZGNydW1iID4gbGkge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbn1cXG4uYnJlYWRjcnVtYiA+IGxpICsgbGk6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCIvXFxcXDAwYTBcXFwiO1xcbiAgcGFkZGluZzogMCA1cHg7XFxuICBjb2xvcjogI2NjY2NjYztcXG59XFxuLmJyZWFkY3J1bWIgPiAuYWN0aXZlIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbn1cXG4ucGFnaW5hdGlvbiB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBtYXJnaW46IDIwcHggMDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLnBhZ2luYXRpb24gPiBsaSB7XFxuICBkaXNwbGF5OiBpbmxpbmU7XFxufVxcbi5wYWdpbmF0aW9uID4gbGkgPiBhLFxcbi5wYWdpbmF0aW9uID4gbGkgPiBzcGFuIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGZsb2F0OiBsZWZ0O1xcbiAgcGFkZGluZzogNnB4IDEycHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGNvbG9yOiAjNDI4YmNhO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICBtYXJnaW4tbGVmdDogLTFweDtcXG59XFxuLnBhZ2luYXRpb24gPiBsaTpmaXJzdC1jaGlsZCA+IGEsXFxuLnBhZ2luYXRpb24gPiBsaTpmaXJzdC1jaGlsZCA+IHNwYW4ge1xcbiAgbWFyZ2luLWxlZnQ6IDA7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiA0cHg7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiA0cHg7XFxufVxcbi5wYWdpbmF0aW9uID4gbGk6bGFzdC1jaGlsZCA+IGEsXFxuLnBhZ2luYXRpb24gPiBsaTpsYXN0LWNoaWxkID4gc3BhbiB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogNHB4O1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDRweDtcXG59XFxuLnBhZ2luYXRpb24gPiBsaSA+IGE6aG92ZXIsXFxuLnBhZ2luYXRpb24gPiBsaSA+IHNwYW46aG92ZXIsXFxuLnBhZ2luYXRpb24gPiBsaSA+IGE6Zm9jdXMsXFxuLnBhZ2luYXRpb24gPiBsaSA+IHNwYW46Zm9jdXMge1xcbiAgY29sb3I6ICMyYTY0OTY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlZWVlO1xcbiAgYm9yZGVyLWNvbG9yOiAjZGRkZGRkO1xcbn1cXG4ucGFnaW5hdGlvbiA+IC5hY3RpdmUgPiBhLFxcbi5wYWdpbmF0aW9uID4gLmFjdGl2ZSA+IHNwYW4sXFxuLnBhZ2luYXRpb24gPiAuYWN0aXZlID4gYTpob3ZlcixcXG4ucGFnaW5hdGlvbiA+IC5hY3RpdmUgPiBzcGFuOmhvdmVyLFxcbi5wYWdpbmF0aW9uID4gLmFjdGl2ZSA+IGE6Zm9jdXMsXFxuLnBhZ2luYXRpb24gPiAuYWN0aXZlID4gc3Bhbjpmb2N1cyB7XFxuICB6LWluZGV4OiAyO1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbiAgYm9yZGVyLWNvbG9yOiAjNDI4YmNhO1xcbiAgY3Vyc29yOiBkZWZhdWx0O1xcbn1cXG4ucGFnaW5hdGlvbiA+IC5kaXNhYmxlZCA+IHNwYW4sXFxuLnBhZ2luYXRpb24gPiAuZGlzYWJsZWQgPiBzcGFuOmhvdmVyLFxcbi5wYWdpbmF0aW9uID4gLmRpc2FibGVkID4gc3Bhbjpmb2N1cyxcXG4ucGFnaW5hdGlvbiA+IC5kaXNhYmxlZCA+IGEsXFxuLnBhZ2luYXRpb24gPiAuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbi5wYWdpbmF0aW9uID4gLmRpc2FibGVkID4gYTpmb2N1cyB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXItY29sb3I6ICNkZGRkZGQ7XFxuICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xcbn1cXG4ucGFnaW5hdGlvbi1sZyA+IGxpID4gYSxcXG4ucGFnaW5hdGlvbi1sZyA+IGxpID4gc3BhbiB7XFxuICBwYWRkaW5nOiAxMHB4IDE2cHg7XFxuICBmb250LXNpemU6IDE4cHg7XFxufVxcbi5wYWdpbmF0aW9uLWxnID4gbGk6Zmlyc3QtY2hpbGQgPiBhLFxcbi5wYWdpbmF0aW9uLWxnID4gbGk6Zmlyc3QtY2hpbGQgPiBzcGFuIHtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDZweDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDZweDtcXG59XFxuLnBhZ2luYXRpb24tbGcgPiBsaTpsYXN0LWNoaWxkID4gYSxcXG4ucGFnaW5hdGlvbi1sZyA+IGxpOmxhc3QtY2hpbGQgPiBzcGFuIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiA2cHg7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogNnB4O1xcbn1cXG4ucGFnaW5hdGlvbi1zbSA+IGxpID4gYSxcXG4ucGFnaW5hdGlvbi1zbSA+IGxpID4gc3BhbiB7XFxuICBwYWRkaW5nOiA1cHggMTBweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG59XFxuLnBhZ2luYXRpb24tc20gPiBsaTpmaXJzdC1jaGlsZCA+IGEsXFxuLnBhZ2luYXRpb24tc20gPiBsaTpmaXJzdC1jaGlsZCA+IHNwYW4ge1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogM3B4O1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFnaW5hdGlvbi1zbSA+IGxpOmxhc3QtY2hpbGQgPiBhLFxcbi5wYWdpbmF0aW9uLXNtID4gbGk6bGFzdC1jaGlsZCA+IHNwYW4ge1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDNweDtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAzcHg7XFxufVxcbi5wYWdlciB7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBtYXJnaW46IDIwcHggMDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxufVxcbi5wYWdlciBsaSB7XFxuICBkaXNwbGF5OiBpbmxpbmU7XFxufVxcbi5wYWdlciBsaSA+IGEsXFxuLnBhZ2VyIGxpID4gc3BhbiB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBwYWRkaW5nOiA1cHggMTRweDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbiAgYm9yZGVyLXJhZGl1czogMTVweDtcXG59XFxuLnBhZ2VyIGxpID4gYTpob3ZlcixcXG4ucGFnZXIgbGkgPiBhOmZvY3VzIHtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZWVlZWU7XFxufVxcbi5wYWdlciAubmV4dCA+IGEsXFxuLnBhZ2VyIC5uZXh0ID4gc3BhbiB7XFxuICBmbG9hdDogcmlnaHQ7XFxufVxcbi5wYWdlciAucHJldmlvdXMgPiBhLFxcbi5wYWdlciAucHJldmlvdXMgPiBzcGFuIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbn1cXG4ucGFnZXIgLmRpc2FibGVkID4gYSxcXG4ucGFnZXIgLmRpc2FibGVkID4gYTpob3ZlcixcXG4ucGFnZXIgLmRpc2FibGVkID4gYTpmb2N1cyxcXG4ucGFnZXIgLmRpc2FibGVkID4gc3BhbiB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xcbn1cXG4ubGFiZWwge1xcbiAgZGlzcGxheTogaW5saW5lO1xcbiAgcGFkZGluZzogLjJlbSAuNmVtIC4zZW07XFxuICBmb250LXNpemU6IDc1JTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgbGluZS1oZWlnaHQ6IDE7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYmFzZWxpbmU7XFxuICBib3JkZXItcmFkaXVzOiAuMjVlbTtcXG59XFxuLmxhYmVsW2hyZWZdOmhvdmVyLFxcbi5sYWJlbFtocmVmXTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuLmxhYmVsOmVtcHR5IHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcbi5idG4gLmxhYmVsIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHRvcDogLTFweDtcXG59XFxuLmxhYmVsLWRlZmF1bHQge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzk5OTk5OTtcXG59XFxuLmxhYmVsLWRlZmF1bHRbaHJlZl06aG92ZXIsXFxuLmxhYmVsLWRlZmF1bHRbaHJlZl06Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzgwODA4MDtcXG59XFxuLmxhYmVsLXByaW1hcnkge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG59XFxuLmxhYmVsLXByaW1hcnlbaHJlZl06aG92ZXIsXFxuLmxhYmVsLXByaW1hcnlbaHJlZl06Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMwNzFhOTtcXG59XFxuLmxhYmVsLXN1Y2Nlc3Mge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzVjYjg1YztcXG59XFxuLmxhYmVsLXN1Y2Nlc3NbaHJlZl06aG92ZXIsXFxuLmxhYmVsLXN1Y2Nlc3NbaHJlZl06Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQ0OWQ0NDtcXG59XFxuLmxhYmVsLWluZm8ge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzViYzBkZTtcXG59XFxuLmxhYmVsLWluZm9baHJlZl06aG92ZXIsXFxuLmxhYmVsLWluZm9baHJlZl06Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMxYjBkNTtcXG59XFxuLmxhYmVsLXdhcm5pbmcge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YwYWQ0ZTtcXG59XFxuLmxhYmVsLXdhcm5pbmdbaHJlZl06aG92ZXIsXFxuLmxhYmVsLXdhcm5pbmdbaHJlZl06Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VjOTcxZjtcXG59XFxuLmxhYmVsLWRhbmdlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDk1MzRmO1xcbn1cXG4ubGFiZWwtZGFuZ2VyW2hyZWZdOmhvdmVyLFxcbi5sYWJlbC1kYW5nZXJbaHJlZl06Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2M5MzAyYztcXG59XFxuLmJhZGdlIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIG1pbi13aWR0aDogMTBweDtcXG4gIHBhZGRpbmc6IDNweCA3cHg7XFxuICBmb250LXNpemU6IDEycHg7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgbGluZS1oZWlnaHQ6IDE7XFxuICB2ZXJ0aWNhbC1hbGlnbjogYmFzZWxpbmU7XFxuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzk5OTk5OTtcXG4gIGJvcmRlci1yYWRpdXM6IDEwcHg7XFxufVxcbi5iYWRnZTplbXB0eSB7XFxuICBkaXNwbGF5OiBub25lO1xcbn1cXG4uYnRuIC5iYWRnZSB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB0b3A6IC0xcHg7XFxufVxcbi5idG4teHMgLmJhZGdlIHtcXG4gIHRvcDogMDtcXG4gIHBhZGRpbmc6IDFweCA1cHg7XFxufVxcbmEuYmFkZ2U6aG92ZXIsXFxuYS5iYWRnZTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlID4gLmJhZGdlLFxcbi5uYXYtcGlsbHMgPiAuYWN0aXZlID4gYSA+IC5iYWRnZSB7XFxuICBjb2xvcjogIzQyOGJjYTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxufVxcbi5uYXYtcGlsbHMgPiBsaSA+IGEgPiAuYmFkZ2Uge1xcbiAgbWFyZ2luLWxlZnQ6IDNweDtcXG59XFxuLmp1bWJvdHJvbiB7XFxuICBwYWRkaW5nOiAzMHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMzBweDtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VlZWVlZTtcXG59XFxuLmp1bWJvdHJvbiBoMSxcXG4uanVtYm90cm9uIC5oMSB7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuLmp1bWJvdHJvbiBwIHtcXG4gIG1hcmdpbi1ib3R0b206IDE1cHg7XFxuICBmb250LXNpemU6IDIxcHg7XFxuICBmb250LXdlaWdodDogMjAwO1xcbn1cXG4uY29udGFpbmVyIC5qdW1ib3Ryb24ge1xcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xcbn1cXG4uanVtYm90cm9uIC5jb250YWluZXIge1xcbiAgbWF4LXdpZHRoOiAxMDAlO1xcbn1cXG5AbWVkaWEgc2NyZWVuIGFuZCAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmp1bWJvdHJvbiB7XFxuICAgIHBhZGRpbmctdG9wOiA0OHB4O1xcbiAgICBwYWRkaW5nLWJvdHRvbTogNDhweDtcXG4gIH1cXG4gIC5jb250YWluZXIgLmp1bWJvdHJvbiB7XFxuICAgIHBhZGRpbmctbGVmdDogNjBweDtcXG4gICAgcGFkZGluZy1yaWdodDogNjBweDtcXG4gIH1cXG4gIC5qdW1ib3Ryb24gaDEsXFxuICAuanVtYm90cm9uIC5oMSB7XFxuICAgIGZvbnQtc2l6ZTogNjNweDtcXG4gIH1cXG59XFxuLnRodW1ibmFpbCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBhZGRpbmc6IDRweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgLXdlYmtpdC10cmFuc2l0aW9uOiBhbGwgMC4ycyBlYXNlLWluLW91dDtcXG4gIHRyYW5zaXRpb246IGFsbCAwLjJzIGVhc2UtaW4tb3V0O1xcbn1cXG4udGh1bWJuYWlsID4gaW1nLFxcbi50aHVtYm5haWwgYSA+IGltZyB7XFxuICBtYXJnaW4tbGVmdDogYXV0bztcXG4gIG1hcmdpbi1yaWdodDogYXV0bztcXG59XFxuYS50aHVtYm5haWw6aG92ZXIsXFxuYS50aHVtYm5haWw6Zm9jdXMsXFxuYS50aHVtYm5haWwuYWN0aXZlIHtcXG4gIGJvcmRlci1jb2xvcjogIzQyOGJjYTtcXG59XFxuLnRodW1ibmFpbCAuY2FwdGlvbiB7XFxuICBwYWRkaW5nOiA5cHg7XFxuICBjb2xvcjogIzMzMzMzMztcXG59XFxuLmFsZXJ0IHtcXG4gIHBhZGRpbmc6IDE1cHg7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxufVxcbi5hbGVydCBoNCB7XFxuICBtYXJnaW4tdG9wOiAwO1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbi5hbGVydCAuYWxlcnQtbGluayB7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG59XFxuLmFsZXJ0ID4gcCxcXG4uYWxlcnQgPiB1bCB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbn1cXG4uYWxlcnQgPiBwICsgcCB7XFxuICBtYXJnaW4tdG9wOiA1cHg7XFxufVxcbi5hbGVydC1kaXNtaXNzYWJsZSB7XFxuICBwYWRkaW5nLXJpZ2h0OiAzNXB4O1xcbn1cXG4uYWxlcnQtZGlzbWlzc2FibGUgLmNsb3NlIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHRvcDogLTJweDtcXG4gIHJpZ2h0OiAtMjFweDtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG4uYWxlcnQtc3VjY2VzcyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZGZmMGQ4O1xcbiAgYm9yZGVyLWNvbG9yOiAjZDZlOWM2O1xcbiAgY29sb3I6ICMzYzc2M2Q7XFxufVxcbi5hbGVydC1zdWNjZXNzIGhyIHtcXG4gIGJvcmRlci10b3AtY29sb3I6ICNjOWUyYjM7XFxufVxcbi5hbGVydC1zdWNjZXNzIC5hbGVydC1saW5rIHtcXG4gIGNvbG9yOiAjMmI1NDJjO1xcbn1cXG4uYWxlcnQtaW5mbyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDllZGY3O1xcbiAgYm9yZGVyLWNvbG9yOiAjYmNlOGYxO1xcbiAgY29sb3I6ICMzMTcwOGY7XFxufVxcbi5hbGVydC1pbmZvIGhyIHtcXG4gIGJvcmRlci10b3AtY29sb3I6ICNhNmUxZWM7XFxufVxcbi5hbGVydC1pbmZvIC5hbGVydC1saW5rIHtcXG4gIGNvbG9yOiAjMjQ1MjY5O1xcbn1cXG4uYWxlcnQtd2FybmluZyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmNmOGUzO1xcbiAgYm9yZGVyLWNvbG9yOiAjZmFlYmNjO1xcbiAgY29sb3I6ICM4YTZkM2I7XFxufVxcbi5hbGVydC13YXJuaW5nIGhyIHtcXG4gIGJvcmRlci10b3AtY29sb3I6ICNmN2UxYjU7XFxufVxcbi5hbGVydC13YXJuaW5nIC5hbGVydC1saW5rIHtcXG4gIGNvbG9yOiAjNjY1MTJjO1xcbn1cXG4uYWxlcnQtZGFuZ2VyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmMmRlZGU7XFxuICBib3JkZXItY29sb3I6ICNlYmNjZDE7XFxuICBjb2xvcjogI2E5NDQ0MjtcXG59XFxuLmFsZXJ0LWRhbmdlciBociB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjZTRiOWMwO1xcbn1cXG4uYWxlcnQtZGFuZ2VyIC5hbGVydC1saW5rIHtcXG4gIGNvbG9yOiAjODQzNTM0O1xcbn1cXG5ALXdlYmtpdC1rZXlmcmFtZXMgcHJvZ3Jlc3MtYmFyLXN0cmlwZXMge1xcbiAgZnJvbSB7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IDQwcHggMDtcXG4gIH1cXG4gIHRvIHtcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogMCAwO1xcbiAgfVxcbn1cXG5Aa2V5ZnJhbWVzIHByb2dyZXNzLWJhci1zdHJpcGVzIHtcXG4gIGZyb20ge1xcbiAgICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiA0MHB4IDA7XFxuICB9XFxuICB0byB7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IDAgMDtcXG4gIH1cXG59XFxuLnByb2dyZXNzIHtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxuICBoZWlnaHQ6IDIwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4xKTtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMSk7XFxufVxcbi5wcm9ncmVzcy1iYXIge1xcbiAgZmxvYXQ6IGxlZnQ7XFxuICB3aWR0aDogMCU7XFxuICBoZWlnaHQ6IDEwMCU7XFxuICBmb250LXNpemU6IDEycHg7XFxuICBsaW5lLWhlaWdodDogMjBweDtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAtMXB4IDAgcmdiYSgwLCAwLCAwLCAwLjE1KTtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgLTFweCAwIHJnYmEoMCwgMCwgMCwgMC4xNSk7XFxuICAtd2Via2l0LXRyYW5zaXRpb246IHdpZHRoIDAuNnMgZWFzZTtcXG4gIHRyYW5zaXRpb246IHdpZHRoIDAuNnMgZWFzZTtcXG59XFxuLnByb2dyZXNzLXN0cmlwZWQgLnByb2dyZXNzLWJhciB7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiAtd2Via2l0LWxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxuICBiYWNrZ3JvdW5kLXNpemU6IDQwcHggNDBweDtcXG59XFxuLnByb2dyZXNzLmFjdGl2ZSAucHJvZ3Jlc3MtYmFyIHtcXG4gIC13ZWJraXQtYW5pbWF0aW9uOiBwcm9ncmVzcy1iYXItc3RyaXBlcyAycyBsaW5lYXIgaW5maW5pdGU7XFxuICBhbmltYXRpb246IHByb2dyZXNzLWJhci1zdHJpcGVzIDJzIGxpbmVhciBpbmZpbml0ZTtcXG59XFxuLnByb2dyZXNzLWJhci1zdWNjZXNzIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM1Y2I4NWM7XFxufVxcbi5wcm9ncmVzcy1zdHJpcGVkIC5wcm9ncmVzcy1iYXItc3VjY2VzcyB7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiAtd2Via2l0LWxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxufVxcbi5wcm9ncmVzcy1iYXItaW5mbyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWJjMGRlO1xcbn1cXG4ucHJvZ3Jlc3Mtc3RyaXBlZCAucHJvZ3Jlc3MtYmFyLWluZm8ge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogLXdlYmtpdC1saW5lYXItZ3JhZGllbnQoNDVkZWcsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgMjUlLCB0cmFuc3BhcmVudCAyNSUsIHRyYW5zcGFyZW50IDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNzUlLCB0cmFuc3BhcmVudCA3NSUsIHRyYW5zcGFyZW50KTtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbn1cXG4ucHJvZ3Jlc3MtYmFyLXdhcm5pbmcge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YwYWQ0ZTtcXG59XFxuLnByb2dyZXNzLXN0cmlwZWQgLnByb2dyZXNzLWJhci13YXJuaW5nIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IC13ZWJraXQtbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoNDVkZWcsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgMjUlLCB0cmFuc3BhcmVudCAyNSUsIHRyYW5zcGFyZW50IDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNzUlLCB0cmFuc3BhcmVudCA3NSUsIHRyYW5zcGFyZW50KTtcXG59XFxuLnByb2dyZXNzLWJhci1kYW5nZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Q5NTM0ZjtcXG59XFxuLnByb2dyZXNzLXN0cmlwZWQgLnByb2dyZXNzLWJhci1kYW5nZXIge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogLXdlYmtpdC1saW5lYXItZ3JhZGllbnQoNDVkZWcsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgMjUlLCB0cmFuc3BhcmVudCAyNSUsIHRyYW5zcGFyZW50IDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNzUlLCB0cmFuc3BhcmVudCA3NSUsIHRyYW5zcGFyZW50KTtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbn1cXG4ubWVkaWEsXFxuLm1lZGlhLWJvZHkge1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIHpvb206IDE7XFxufVxcbi5tZWRpYSxcXG4ubWVkaWEgLm1lZGlhIHtcXG4gIG1hcmdpbi10b3A6IDE1cHg7XFxufVxcbi5tZWRpYTpmaXJzdC1jaGlsZCB7XFxuICBtYXJnaW4tdG9wOiAwO1xcbn1cXG4ubWVkaWEtb2JqZWN0IHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG4ubWVkaWEtaGVhZGluZyB7XFxuICBtYXJnaW46IDAgMCA1cHg7XFxufVxcbi5tZWRpYSA+IC5wdWxsLWxlZnQge1xcbiAgbWFyZ2luLXJpZ2h0OiAxMHB4O1xcbn1cXG4ubWVkaWEgPiAucHVsbC1yaWdodCB7XFxuICBtYXJnaW4tbGVmdDogMTBweDtcXG59XFxuLm1lZGlhLWxpc3Qge1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG59XFxuLmxpc3QtZ3JvdXAge1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG4gIHBhZGRpbmctbGVmdDogMDtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbSB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHBhZGRpbmc6IDEwcHggMTVweDtcXG4gIG1hcmdpbi1ib3R0b206IC0xcHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbTpmaXJzdC1jaGlsZCB7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogNHB4O1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogNHB4O1xcbn1cXG4ubGlzdC1ncm91cC1pdGVtOmxhc3QtY2hpbGQge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiA0cHg7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiA0cHg7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0gPiAuYmFkZ2Uge1xcbiAgZmxvYXQ6IHJpZ2h0O1xcbn1cXG4ubGlzdC1ncm91cC1pdGVtID4gLmJhZGdlICsgLmJhZGdlIHtcXG4gIG1hcmdpbi1yaWdodDogNXB4O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbSB7XFxuICBjb2xvcjogIzU1NTU1NTtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0gLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nIHtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbTpob3ZlcixcXG5hLmxpc3QtZ3JvdXAtaXRlbTpmb2N1cyB7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmUsXFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLmFjdGl2ZTpmb2N1cyB7XFxuICB6LWluZGV4OiAyO1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbiAgYm9yZGVyLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmUgLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nLFxcbmEubGlzdC1ncm91cC1pdGVtLmFjdGl2ZTpob3ZlciAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcsXFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlOmZvY3VzIC5saXN0LWdyb3VwLWl0ZW0taGVhZGluZyB7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlIC5saXN0LWdyb3VwLWl0ZW0tdGV4dCxcXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmU6aG92ZXIgLmxpc3QtZ3JvdXAtaXRlbS10ZXh0LFxcbmEubGlzdC1ncm91cC1pdGVtLmFjdGl2ZTpmb2N1cyAubGlzdC1ncm91cC1pdGVtLXRleHQge1xcbiAgY29sb3I6ICNlMWVkZjc7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0tc3VjY2VzcyB7XFxuICBjb2xvcjogIzNjNzYzZDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZmYwZDg7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3Mge1xcbiAgY29sb3I6ICMzYzc2M2Q7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3MgLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1zdWNjZXNzOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3M6Zm9jdXMge1xcbiAgY29sb3I6ICMzYzc2M2Q7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDBlOWM2O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1zdWNjZXNzLmFjdGl2ZSxcXG5hLmxpc3QtZ3JvdXAtaXRlbS1zdWNjZXNzLmFjdGl2ZTpob3ZlcixcXG5hLmxpc3QtZ3JvdXAtaXRlbS1zdWNjZXNzLmFjdGl2ZTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMzYzc2M2Q7XFxuICBib3JkZXItY29sb3I6ICMzYzc2M2Q7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0taW5mbyB7XFxuICBjb2xvcjogIzMxNzA4ZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOWVkZjc7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLWluZm8ge1xcbiAgY29sb3I6ICMzMTcwOGY7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLWluZm8gLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1pbmZvOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLWluZm86Zm9jdXMge1xcbiAgY29sb3I6ICMzMTcwOGY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjYzRlM2YzO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1pbmZvLmFjdGl2ZSxcXG5hLmxpc3QtZ3JvdXAtaXRlbS1pbmZvLmFjdGl2ZTpob3ZlcixcXG5hLmxpc3QtZ3JvdXAtaXRlbS1pbmZvLmFjdGl2ZTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMzMTcwOGY7XFxuICBib3JkZXItY29sb3I6ICMzMTcwOGY7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0td2FybmluZyB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmY2Y4ZTM7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmcge1xcbiAgY29sb3I6ICM4YTZkM2I7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmcgLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS13YXJuaW5nOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmc6Zm9jdXMge1xcbiAgY29sb3I6ICM4YTZkM2I7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmFmMmNjO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS13YXJuaW5nLmFjdGl2ZSxcXG5hLmxpc3QtZ3JvdXAtaXRlbS13YXJuaW5nLmFjdGl2ZTpob3ZlcixcXG5hLmxpc3QtZ3JvdXAtaXRlbS13YXJuaW5nLmFjdGl2ZTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM4YTZkM2I7XFxuICBib3JkZXItY29sb3I6ICM4YTZkM2I7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0tZGFuZ2VyIHtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YyZGVkZTtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0tZGFuZ2VyIHtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXIgLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXI6aG92ZXIsXFxuYS5saXN0LWdyb3VwLWl0ZW0tZGFuZ2VyOmZvY3VzIHtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ViY2NjYztcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0tZGFuZ2VyLmFjdGl2ZSxcXG5hLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXIuYWN0aXZlOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLWRhbmdlci5hY3RpdmU6Zm9jdXMge1xcbiAgY29sb3I6ICNmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjYTk0NDQyO1xcbiAgYm9yZGVyLWNvbG9yOiAjYTk0NDQyO1xcbn1cXG4ubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcge1xcbiAgbWFyZ2luLXRvcDogMDtcXG4gIG1hcmdpbi1ib3R0b206IDVweDtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbS10ZXh0IHtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBsaW5lLWhlaWdodDogMS4zO1xcbn1cXG4ucGFuZWwge1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNSk7XFxuICBib3gtc2hhZG93OiAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA1KTtcXG59XFxuLnBhbmVsLWJvZHkge1xcbiAgcGFkZGluZzogMTVweDtcXG59XFxuLnBhbmVsLWhlYWRpbmcge1xcbiAgcGFkZGluZzogMTBweCAxNXB4O1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDNweDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsLWhlYWRpbmcgPiAuZHJvcGRvd24gLmRyb3Bkb3duLXRvZ2dsZSB7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuLnBhbmVsLXRpdGxlIHtcXG4gIG1hcmdpbi10b3A6IDA7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgZm9udC1zaXplOiAxNnB4O1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbi5wYW5lbC10aXRsZSA+IGEge1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbi5wYW5lbC1mb290ZXIge1xcbiAgcGFkZGluZzogMTBweCAxNXB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkZGRkO1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDNweDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLmxpc3QtZ3JvdXAge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuLnBhbmVsID4gLmxpc3QtZ3JvdXAgLmxpc3QtZ3JvdXAtaXRlbSB7XFxuICBib3JkZXItd2lkdGg6IDFweCAwO1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLnBhbmVsID4gLmxpc3QtZ3JvdXA6Zmlyc3QtY2hpbGQgLmxpc3QtZ3JvdXAtaXRlbTpmaXJzdC1jaGlsZCB7XFxuICBib3JkZXItdG9wOiAwO1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDNweDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLmxpc3QtZ3JvdXA6bGFzdC1jaGlsZCAubGlzdC1ncm91cC1pdGVtOmxhc3QtY2hpbGQge1xcbiAgYm9yZGVyLWJvdHRvbTogMDtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAzcHg7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiAzcHg7XFxufVxcbi5wYW5lbC1oZWFkaW5nICsgLmxpc3QtZ3JvdXAgLmxpc3QtZ3JvdXAtaXRlbTpmaXJzdC1jaGlsZCB7XFxuICBib3JkZXItdG9wLXdpZHRoOiAwO1xcbn1cXG4ucGFuZWwgPiAudGFibGUsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmZpcnN0LWNoaWxkID4gLnRhYmxlOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAzcHg7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAzcHg7XFxufVxcbi5wYW5lbCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRoZWFkOmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0Ym9keTpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRoZWFkOmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0Ym9keTpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGhlYWQ6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmZpcnN0LWNoaWxkID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGhlYWQ6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpmaXJzdC1jaGlsZCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmZpcnN0LWNoaWxkID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0aDpsYXN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAzcHg7XFxufVxcbi5wYW5lbCA+IC50YWJsZTpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogM3B4O1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGZvb3Q6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGZvb3Q6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Ym9keTpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpsYXN0LWNoaWxkID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Ym9keTpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRmb290Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRmb290Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Ym9keTpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Zm9vdDpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRmb290Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Ym9keTpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Zm9vdDpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRmb290Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmxhc3QtY2hpbGQge1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLnBhbmVsLWJvZHkgKyAudGFibGUsXFxuLnBhbmVsID4gLnBhbmVsLWJvZHkgKyAudGFibGUtcmVzcG9uc2l2ZSB7XFxuICBib3JkZXItdG9wOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLnBhbmVsID4gLnRhYmxlID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0aCxcXG4ucGFuZWwgPiAudGFibGUgPiB0Ym9keTpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRkIHtcXG4gIGJvcmRlci10b3A6IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCB7XFxuICBib3JkZXI6IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0ciA+IHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0ciA+IHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0ciA+IHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0ciA+IHRkOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci1sZWZ0OiAwO1xcbn1cXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0ciA+IHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0ciA+IHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQ6bGFzdC1jaGlsZCB7XFxuICBib3JkZXItcmlnaHQ6IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHI6Zmlyc3QtY2hpbGQgPiB0ZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHI6Zmlyc3QtY2hpbGQgPiB0ZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmZpcnN0LWNoaWxkID4gdGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmZpcnN0LWNoaWxkID4gdGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0cjpmaXJzdC1jaGlsZCA+IHRoLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0cjpmaXJzdC1jaGlsZCA+IHRoLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6Zmlyc3QtY2hpbGQgPiB0aCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6Zmlyc3QtY2hpbGQgPiB0aCB7XFxuICBib3JkZXItYm90dG9tOiAwO1xcbn1cXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmxhc3QtY2hpbGQgPiB0ZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6bGFzdC1jaGlsZCA+IHRkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHI6bGFzdC1jaGlsZCA+IHRkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0cjpsYXN0LWNoaWxkID4gdGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0cjpsYXN0LWNoaWxkID4gdGgsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmxhc3QtY2hpbGQgPiB0aCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyOmxhc3QtY2hpbGQgPiB0aCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHI6bGFzdC1jaGlsZCA+IHRoIHtcXG4gIGJvcmRlci1ib3R0b206IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlIHtcXG4gIGJvcmRlcjogMDtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxufVxcbi5wYW5lbC1ncm91cCB7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbn1cXG4ucGFuZWwtZ3JvdXAgLnBhbmVsIHtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxuICBvdmVyZmxvdzogaGlkZGVuO1xcbn1cXG4ucGFuZWwtZ3JvdXAgLnBhbmVsICsgLnBhbmVsIHtcXG4gIG1hcmdpbi10b3A6IDVweDtcXG59XFxuLnBhbmVsLWdyb3VwIC5wYW5lbC1oZWFkaW5nIHtcXG4gIGJvcmRlci1ib3R0b206IDA7XFxufVxcbi5wYW5lbC1ncm91cCAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLnBhbmVsLWdyb3VwIC5wYW5lbC1mb290ZXIge1xcbiAgYm9yZGVyLXRvcDogMDtcXG59XFxuLnBhbmVsLWdyb3VwIC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkZGRkZGQ7XFxufVxcbi5wYW5lbC1kZWZhdWx0IHtcXG4gIGJvcmRlci1jb2xvcjogI2RkZGRkZDtcXG59XFxuLnBhbmVsLWRlZmF1bHQgPiAucGFuZWwtaGVhZGluZyB7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7XFxuICBib3JkZXItY29sb3I6ICNkZGRkZGQ7XFxufVxcbi5wYW5lbC1kZWZhdWx0ID4gLnBhbmVsLWhlYWRpbmcgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2RkZGRkZDtcXG59XFxuLnBhbmVsLWRlZmF1bHQgPiAucGFuZWwtZm9vdGVyICsgLnBhbmVsLWNvbGxhcHNlIC5wYW5lbC1ib2R5IHtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICNkZGRkZGQ7XFxufVxcbi5wYW5lbC1wcmltYXJ5IHtcXG4gIGJvcmRlci1jb2xvcjogIzQyOGJjYTtcXG59XFxuLnBhbmVsLXByaW1hcnkgPiAucGFuZWwtaGVhZGluZyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM0MjhiY2E7XFxuICBib3JkZXItY29sb3I6ICM0MjhiY2E7XFxufVxcbi5wYW5lbC1wcmltYXJ5ID4gLnBhbmVsLWhlYWRpbmcgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogIzQyOGJjYTtcXG59XFxuLnBhbmVsLXByaW1hcnkgPiAucGFuZWwtZm9vdGVyICsgLnBhbmVsLWNvbGxhcHNlIC5wYW5lbC1ib2R5IHtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICM0MjhiY2E7XFxufVxcbi5wYW5lbC1zdWNjZXNzIHtcXG4gIGJvcmRlci1jb2xvcjogI2Q2ZTljNjtcXG59XFxuLnBhbmVsLXN1Y2Nlc3MgPiAucGFuZWwtaGVhZGluZyB7XFxuICBjb2xvcjogIzNjNzYzZDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZmYwZDg7XFxuICBib3JkZXItY29sb3I6ICNkNmU5YzY7XFxufVxcbi5wYW5lbC1zdWNjZXNzID4gLnBhbmVsLWhlYWRpbmcgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2Q2ZTljNjtcXG59XFxuLnBhbmVsLXN1Y2Nlc3MgPiAucGFuZWwtZm9vdGVyICsgLnBhbmVsLWNvbGxhcHNlIC5wYW5lbC1ib2R5IHtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICNkNmU5YzY7XFxufVxcbi5wYW5lbC1pbmZvIHtcXG4gIGJvcmRlci1jb2xvcjogI2JjZThmMTtcXG59XFxuLnBhbmVsLWluZm8gPiAucGFuZWwtaGVhZGluZyB7XFxuICBjb2xvcjogIzMxNzA4ZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOWVkZjc7XFxuICBib3JkZXItY29sb3I6ICNiY2U4ZjE7XFxufVxcbi5wYW5lbC1pbmZvID4gLnBhbmVsLWhlYWRpbmcgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2JjZThmMTtcXG59XFxuLnBhbmVsLWluZm8gPiAucGFuZWwtZm9vdGVyICsgLnBhbmVsLWNvbGxhcHNlIC5wYW5lbC1ib2R5IHtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICNiY2U4ZjE7XFxufVxcbi5wYW5lbC13YXJuaW5nIHtcXG4gIGJvcmRlci1jb2xvcjogI2ZhZWJjYztcXG59XFxuLnBhbmVsLXdhcm5pbmcgPiAucGFuZWwtaGVhZGluZyB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmY2Y4ZTM7XFxuICBib3JkZXItY29sb3I6ICNmYWViY2M7XFxufVxcbi5wYW5lbC13YXJuaW5nID4gLnBhbmVsLWhlYWRpbmcgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2ZhZWJjYztcXG59XFxuLnBhbmVsLXdhcm5pbmcgPiAucGFuZWwtZm9vdGVyICsgLnBhbmVsLWNvbGxhcHNlIC5wYW5lbC1ib2R5IHtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICNmYWViY2M7XFxufVxcbi5wYW5lbC1kYW5nZXIge1xcbiAgYm9yZGVyLWNvbG9yOiAjZWJjY2QxO1xcbn1cXG4ucGFuZWwtZGFuZ2VyID4gLnBhbmVsLWhlYWRpbmcge1xcbiAgY29sb3I6ICNhOTQ0NDI7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjJkZWRlO1xcbiAgYm9yZGVyLWNvbG9yOiAjZWJjY2QxO1xcbn1cXG4ucGFuZWwtZGFuZ2VyID4gLnBhbmVsLWhlYWRpbmcgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2ViY2NkMTtcXG59XFxuLnBhbmVsLWRhbmdlciA+IC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2ViY2NkMTtcXG59XFxuLndlbGwge1xcbiAgbWluLWhlaWdodDogMjBweDtcXG4gIHBhZGRpbmc6IDE5cHg7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNlM2UzZTM7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDUpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNSk7XFxufVxcbi53ZWxsIGJsb2NrcXVvdGUge1xcbiAgYm9yZGVyLWNvbG9yOiAjZGRkO1xcbiAgYm9yZGVyLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMTUpO1xcbn1cXG4ud2VsbC1sZyB7XFxuICBwYWRkaW5nOiAyNHB4O1xcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xcbn1cXG4ud2VsbC1zbSB7XFxuICBwYWRkaW5nOiA5cHg7XFxuICBib3JkZXItcmFkaXVzOiAzcHg7XFxufVxcbi5jbG9zZSB7XFxuICBmbG9hdDogcmlnaHQ7XFxuICBmb250LXNpemU6IDIxcHg7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIGxpbmUtaGVpZ2h0OiAxO1xcbiAgY29sb3I6ICMwMDAwMDA7XFxuICB0ZXh0LXNoYWRvdzogMCAxcHggMCAjZmZmZmZmO1xcbiAgb3BhY2l0eTogMC4yO1xcbiAgZmlsdGVyOiBhbHBoYShvcGFjaXR5PTIwKTtcXG59XFxuLmNsb3NlOmhvdmVyLFxcbi5jbG9zZTpmb2N1cyB7XFxuICBjb2xvcjogIzAwMDAwMDtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIG9wYWNpdHk6IDAuNTtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT01MCk7XFxufVxcbmJ1dHRvbi5jbG9zZSB7XFxuICBwYWRkaW5nOiAwO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XFxuICBib3JkZXI6IDA7XFxuICAtd2Via2l0LWFwcGVhcmFuY2U6IG5vbmU7XFxufVxcbi5tb2RhbC1vcGVuIHtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxufVxcbi5tb2RhbCB7XFxuICBkaXNwbGF5OiBub25lO1xcbiAgb3ZlcmZsb3c6IGF1dG87XFxuICBvdmVyZmxvdy15OiBzY3JvbGw7XFxuICBwb3NpdGlvbjogZml4ZWQ7XFxuICB0b3A6IDA7XFxuICByaWdodDogMDtcXG4gIGJvdHRvbTogMDtcXG4gIGxlZnQ6IDA7XFxuICB6LWluZGV4OiAxMDUwO1xcbiAgLXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6IHRvdWNoO1xcbiAgb3V0bGluZTogMDtcXG59XFxuLm1vZGFsLmZhZGUgLm1vZGFsLWRpYWxvZyB7XFxuICAtd2Via2l0LXRyYW5zZm9ybTogdHJhbnNsYXRlKDAsIC0yNSUpO1xcbiAgLW1zLXRyYW5zZm9ybTogdHJhbnNsYXRlKDAsIC0yNSUpO1xcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTI1JSk7XFxuICAtd2Via2l0LXRyYW5zaXRpb246IC13ZWJraXQtdHJhbnNmb3JtIDAuM3MgZWFzZS1vdXQ7XFxuICAtbW96LXRyYW5zaXRpb246IC1tb3otdHJhbnNmb3JtIDAuM3MgZWFzZS1vdXQ7XFxuICAtby10cmFuc2l0aW9uOiAtby10cmFuc2Zvcm0gMC4zcyBlYXNlLW91dDtcXG4gIHRyYW5zaXRpb246IHRyYW5zZm9ybSAwLjNzIGVhc2Utb3V0O1xcbn1cXG4ubW9kYWwuaW4gLm1vZGFsLWRpYWxvZyB7XFxuICAtd2Via2l0LXRyYW5zZm9ybTogdHJhbnNsYXRlKDAsIDApO1xcbiAgLW1zLXRyYW5zZm9ybTogdHJhbnNsYXRlKDAsIDApO1xcbiAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgMCk7XFxufVxcbi5tb2RhbC1kaWFsb2cge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgd2lkdGg6IGF1dG87XFxuICBtYXJnaW46IDEwcHg7XFxufVxcbi5tb2RhbC1jb250ZW50IHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjOTk5OTk5O1xcbiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjIpO1xcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiAwIDNweCA5cHggcmdiYSgwLCAwLCAwLCAwLjUpO1xcbiAgYm94LXNoYWRvdzogMCAzcHggOXB4IHJnYmEoMCwgMCwgMCwgMC41KTtcXG4gIGJhY2tncm91bmQtY2xpcDogcGFkZGluZy1ib3g7XFxuICBvdXRsaW5lOiBub25lO1xcbn1cXG4ubW9kYWwtYmFja2Ryb3Age1xcbiAgcG9zaXRpb246IGZpeGVkO1xcbiAgdG9wOiAwO1xcbiAgcmlnaHQ6IDA7XFxuICBib3R0b206IDA7XFxuICBsZWZ0OiAwO1xcbiAgei1pbmRleDogMTA0MDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMwMDAwMDA7XFxufVxcbi5tb2RhbC1iYWNrZHJvcC5mYWRlIHtcXG4gIG9wYWNpdHk6IDA7XFxuICBmaWx0ZXI6IGFscGhhKG9wYWNpdHk9MCk7XFxufVxcbi5tb2RhbC1iYWNrZHJvcC5pbiB7XFxuICBvcGFjaXR5OiAwLjU7XFxuICBmaWx0ZXI6IGFscGhhKG9wYWNpdHk9NTApO1xcbn1cXG4ubW9kYWwtaGVhZGVyIHtcXG4gIHBhZGRpbmc6IDE1cHg7XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2U1ZTVlNTtcXG4gIG1pbi1oZWlnaHQ6IDE2LjQyODU3MTQzcHg7XFxufVxcbi5tb2RhbC1oZWFkZXIgLmNsb3NlIHtcXG4gIG1hcmdpbi10b3A6IC0ycHg7XFxufVxcbi5tb2RhbC10aXRsZSB7XFxuICBtYXJnaW46IDA7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG59XFxuLm1vZGFsLWJvZHkge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgcGFkZGluZzogMjBweDtcXG59XFxuLm1vZGFsLWZvb3RlciB7XFxuICBtYXJnaW4tdG9wOiAxNXB4O1xcbiAgcGFkZGluZzogMTlweCAyMHB4IDIwcHg7XFxuICB0ZXh0LWFsaWduOiByaWdodDtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCAjZTVlNWU1O1xcbn1cXG4ubW9kYWwtZm9vdGVyIC5idG4gKyAuYnRuIHtcXG4gIG1hcmdpbi1sZWZ0OiA1cHg7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbn1cXG4ubW9kYWwtZm9vdGVyIC5idG4tZ3JvdXAgLmJ0biArIC5idG4ge1xcbiAgbWFyZ2luLWxlZnQ6IC0xcHg7XFxufVxcbi5tb2RhbC1mb290ZXIgLmJ0bi1ibG9jayArIC5idG4tYmxvY2sge1xcbiAgbWFyZ2luLWxlZnQ6IDA7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm1vZGFsLWRpYWxvZyB7XFxuICAgIHdpZHRoOiA2MDBweDtcXG4gICAgbWFyZ2luOiAzMHB4IGF1dG87XFxuICB9XFxuICAubW9kYWwtY29udGVudCB7XFxuICAgIC13ZWJraXQtYm94LXNoYWRvdzogMCA1cHggMTVweCByZ2JhKDAsIDAsIDAsIDAuNSk7XFxuICAgIGJveC1zaGFkb3c6IDAgNXB4IDE1cHggcmdiYSgwLCAwLCAwLCAwLjUpO1xcbiAgfVxcbiAgLm1vZGFsLXNtIHtcXG4gICAgd2lkdGg6IDMwMHB4O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogOTkycHgpIHtcXG4gIC5tb2RhbC1sZyB7XFxuICAgIHdpZHRoOiA5MDBweDtcXG4gIH1cXG59XFxuLnRvb2x0aXAge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgei1pbmRleDogMTAzMDtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgdmlzaWJpbGl0eTogdmlzaWJsZTtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQ7XFxuICBvcGFjaXR5OiAwO1xcbiAgZmlsdGVyOiBhbHBoYShvcGFjaXR5PTApO1xcbn1cXG4udG9vbHRpcC5pbiB7XFxuICBvcGFjaXR5OiAwLjk7XFxuICBmaWx0ZXI6IGFscGhhKG9wYWNpdHk9OTApO1xcbn1cXG4udG9vbHRpcC50b3Age1xcbiAgbWFyZ2luLXRvcDogLTNweDtcXG4gIHBhZGRpbmc6IDVweCAwO1xcbn1cXG4udG9vbHRpcC5yaWdodCB7XFxuICBtYXJnaW4tbGVmdDogM3B4O1xcbiAgcGFkZGluZzogMCA1cHg7XFxufVxcbi50b29sdGlwLmJvdHRvbSB7XFxuICBtYXJnaW4tdG9wOiAzcHg7XFxuICBwYWRkaW5nOiA1cHggMDtcXG59XFxuLnRvb2x0aXAubGVmdCB7XFxuICBtYXJnaW4tbGVmdDogLTNweDtcXG4gIHBhZGRpbmc6IDAgNXB4O1xcbn1cXG4udG9vbHRpcC1pbm5lciB7XFxuICBtYXgtd2lkdGg6IDIwMHB4O1xcbiAgcGFkZGluZzogM3B4IDhweDtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzAwMDAwMDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLnRvb2x0aXAtYXJyb3cge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgd2lkdGg6IDA7XFxuICBoZWlnaHQ6IDA7XFxuICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLXN0eWxlOiBzb2xpZDtcXG59XFxuLnRvb2x0aXAudG9wIC50b29sdGlwLWFycm93IHtcXG4gIGJvdHRvbTogMDtcXG4gIGxlZnQ6IDUwJTtcXG4gIG1hcmdpbi1sZWZ0OiAtNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiA1cHggNXB4IDA7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjMDAwMDAwO1xcbn1cXG4udG9vbHRpcC50b3AtbGVmdCAudG9vbHRpcC1hcnJvdyB7XFxuICBib3R0b206IDA7XFxuICBsZWZ0OiA1cHg7XFxuICBib3JkZXItd2lkdGg6IDVweCA1cHggMDtcXG4gIGJvcmRlci10b3AtY29sb3I6ICMwMDAwMDA7XFxufVxcbi50b29sdGlwLnRvcC1yaWdodCAudG9vbHRpcC1hcnJvdyB7XFxuICBib3R0b206IDA7XFxuICByaWdodDogNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiA1cHggNXB4IDA7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjMDAwMDAwO1xcbn1cXG4udG9vbHRpcC5yaWdodCAudG9vbHRpcC1hcnJvdyB7XFxuICB0b3A6IDUwJTtcXG4gIGxlZnQ6IDA7XFxuICBtYXJnaW4tdG9wOiAtNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiA1cHggNXB4IDVweCAwO1xcbiAgYm9yZGVyLXJpZ2h0LWNvbG9yOiAjMDAwMDAwO1xcbn1cXG4udG9vbHRpcC5sZWZ0IC50b29sdGlwLWFycm93IHtcXG4gIHRvcDogNTAlO1xcbiAgcmlnaHQ6IDA7XFxuICBtYXJnaW4tdG9wOiAtNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiA1cHggMCA1cHggNXB4O1xcbiAgYm9yZGVyLWxlZnQtY29sb3I6ICMwMDAwMDA7XFxufVxcbi50b29sdGlwLmJvdHRvbSAudG9vbHRpcC1hcnJvdyB7XFxuICB0b3A6IDA7XFxuICBsZWZ0OiA1MCU7XFxuICBtYXJnaW4tbGVmdDogLTVweDtcXG4gIGJvcmRlci13aWR0aDogMCA1cHggNXB4O1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogIzAwMDAwMDtcXG59XFxuLnRvb2x0aXAuYm90dG9tLWxlZnQgLnRvb2x0aXAtYXJyb3cge1xcbiAgdG9wOiAwO1xcbiAgbGVmdDogNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiAwIDVweCA1cHg7XFxuICBib3JkZXItYm90dG9tLWNvbG9yOiAjMDAwMDAwO1xcbn1cXG4udG9vbHRpcC5ib3R0b20tcmlnaHQgLnRvb2x0aXAtYXJyb3cge1xcbiAgdG9wOiAwO1xcbiAgcmlnaHQ6IDVweDtcXG4gIGJvcmRlci13aWR0aDogMCA1cHggNXB4O1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogIzAwMDAwMDtcXG59XFxuLnBvcG92ZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwO1xcbiAgbGVmdDogMDtcXG4gIHotaW5kZXg6IDEwMTA7XFxuICBkaXNwbGF5OiBub25lO1xcbiAgbWF4LXdpZHRoOiAyNzZweDtcXG4gIHBhZGRpbmc6IDFweDtcXG4gIHRleHQtYWxpZ246IGxlZnQ7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jbGlwOiBwYWRkaW5nLWJveDtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNjY2NjY2M7XFxuICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuMik7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IDAgNXB4IDEwcHggcmdiYSgwLCAwLCAwLCAwLjIpO1xcbiAgYm94LXNoYWRvdzogMCA1cHggMTBweCByZ2JhKDAsIDAsIDAsIDAuMik7XFxuICB3aGl0ZS1zcGFjZTogbm9ybWFsO1xcbn1cXG4ucG9wb3Zlci50b3Age1xcbiAgbWFyZ2luLXRvcDogLTEwcHg7XFxufVxcbi5wb3BvdmVyLnJpZ2h0IHtcXG4gIG1hcmdpbi1sZWZ0OiAxMHB4O1xcbn1cXG4ucG9wb3Zlci5ib3R0b20ge1xcbiAgbWFyZ2luLXRvcDogMTBweDtcXG59XFxuLnBvcG92ZXIubGVmdCB7XFxuICBtYXJnaW4tbGVmdDogLTEwcHg7XFxufVxcbi5wb3BvdmVyLXRpdGxlIHtcXG4gIG1hcmdpbjogMDtcXG4gIHBhZGRpbmc6IDhweCAxNHB4O1xcbiAgZm9udC1zaXplOiAxNHB4O1xcbiAgZm9udC13ZWlnaHQ6IG5vcm1hbDtcXG4gIGxpbmUtaGVpZ2h0OiAxOHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y3ZjdmNztcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZWJlYmViO1xcbiAgYm9yZGVyLXJhZGl1czogNXB4IDVweCAwIDA7XFxufVxcbi5wb3BvdmVyLWNvbnRlbnQge1xcbiAgcGFkZGluZzogOXB4IDE0cHg7XFxufVxcbi5wb3BvdmVyID4gLmFycm93LFxcbi5wb3BvdmVyID4gLmFycm93OmFmdGVyIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgd2lkdGg6IDA7XFxuICBoZWlnaHQ6IDA7XFxuICBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLXN0eWxlOiBzb2xpZDtcXG59XFxuLnBvcG92ZXIgPiAuYXJyb3cge1xcbiAgYm9yZGVyLXdpZHRoOiAxMXB4O1xcbn1cXG4ucG9wb3ZlciA+IC5hcnJvdzphZnRlciB7XFxuICBib3JkZXItd2lkdGg6IDEwcHg7XFxuICBjb250ZW50OiBcXFwiXFxcIjtcXG59XFxuLnBvcG92ZXIudG9wID4gLmFycm93IHtcXG4gIGxlZnQ6IDUwJTtcXG4gIG1hcmdpbi1sZWZ0OiAtMTFweDtcXG4gIGJvcmRlci1ib3R0b20td2lkdGg6IDA7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjOTk5OTk5O1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjI1KTtcXG4gIGJvdHRvbTogLTExcHg7XFxufVxcbi5wb3BvdmVyLnRvcCA+IC5hcnJvdzphZnRlciB7XFxuICBjb250ZW50OiBcXFwiIFxcXCI7XFxuICBib3R0b206IDFweDtcXG4gIG1hcmdpbi1sZWZ0OiAtMTBweDtcXG4gIGJvcmRlci1ib3R0b20td2lkdGg6IDA7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4ucG9wb3Zlci5yaWdodCA+IC5hcnJvdyB7XFxuICB0b3A6IDUwJTtcXG4gIGxlZnQ6IC0xMXB4O1xcbiAgbWFyZ2luLXRvcDogLTExcHg7XFxuICBib3JkZXItbGVmdC13aWR0aDogMDtcXG4gIGJvcmRlci1yaWdodC1jb2xvcjogIzk5OTk5OTtcXG4gIGJvcmRlci1yaWdodC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjI1KTtcXG59XFxuLnBvcG92ZXIucmlnaHQgPiAuYXJyb3c6YWZ0ZXIge1xcbiAgY29udGVudDogXFxcIiBcXFwiO1xcbiAgbGVmdDogMXB4O1xcbiAgYm90dG9tOiAtMTBweDtcXG4gIGJvcmRlci1sZWZ0LXdpZHRoOiAwO1xcbiAgYm9yZGVyLXJpZ2h0LWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4ucG9wb3Zlci5ib3R0b20gPiAuYXJyb3cge1xcbiAgbGVmdDogNTAlO1xcbiAgbWFyZ2luLWxlZnQ6IC0xMXB4O1xcbiAgYm9yZGVyLXRvcC13aWR0aDogMDtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICM5OTk5OTk7XFxuICBib3JkZXItYm90dG9tLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMjUpO1xcbiAgdG9wOiAtMTFweDtcXG59XFxuLnBvcG92ZXIuYm90dG9tID4gLmFycm93OmFmdGVyIHtcXG4gIGNvbnRlbnQ6IFxcXCIgXFxcIjtcXG4gIHRvcDogMXB4O1xcbiAgbWFyZ2luLWxlZnQ6IC0xMHB4O1xcbiAgYm9yZGVyLXRvcC13aWR0aDogMDtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICNmZmZmZmY7XFxufVxcbi5wb3BvdmVyLmxlZnQgPiAuYXJyb3cge1xcbiAgdG9wOiA1MCU7XFxuICByaWdodDogLTExcHg7XFxuICBtYXJnaW4tdG9wOiAtMTFweDtcXG4gIGJvcmRlci1yaWdodC13aWR0aDogMDtcXG4gIGJvcmRlci1sZWZ0LWNvbG9yOiAjOTk5OTk5O1xcbiAgYm9yZGVyLWxlZnQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4yNSk7XFxufVxcbi5wb3BvdmVyLmxlZnQgPiAuYXJyb3c6YWZ0ZXIge1xcbiAgY29udGVudDogXFxcIiBcXFwiO1xcbiAgcmlnaHQ6IDFweDtcXG4gIGJvcmRlci1yaWdodC13aWR0aDogMDtcXG4gIGJvcmRlci1sZWZ0LWNvbG9yOiAjZmZmZmZmO1xcbiAgYm90dG9tOiAtMTBweDtcXG59XFxuLmNhcm91c2VsIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG59XFxuLmNhcm91c2VsLWlubmVyIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxuICB3aWR0aDogMTAwJTtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLml0ZW0ge1xcbiAgZGlzcGxheTogbm9uZTtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogMC42cyBlYXNlLWluLW91dCBsZWZ0O1xcbiAgdHJhbnNpdGlvbjogMC42cyBlYXNlLWluLW91dCBsZWZ0O1xcbn1cXG4uY2Fyb3VzZWwtaW5uZXIgPiAuaXRlbSA+IGltZyxcXG4uY2Fyb3VzZWwtaW5uZXIgPiAuaXRlbSA+IGEgPiBpbWcge1xcbiAgbGluZS1oZWlnaHQ6IDE7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5hY3RpdmUsXFxuLmNhcm91c2VsLWlubmVyID4gLm5leHQsXFxuLmNhcm91c2VsLWlubmVyID4gLnByZXYge1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5hY3RpdmUge1xcbiAgbGVmdDogMDtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLm5leHQsXFxuLmNhcm91c2VsLWlubmVyID4gLnByZXYge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwO1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5uZXh0IHtcXG4gIGxlZnQ6IDEwMCU7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5wcmV2IHtcXG4gIGxlZnQ6IC0xMDAlO1xcbn1cXG4uY2Fyb3VzZWwtaW5uZXIgPiAubmV4dC5sZWZ0LFxcbi5jYXJvdXNlbC1pbm5lciA+IC5wcmV2LnJpZ2h0IHtcXG4gIGxlZnQ6IDA7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5hY3RpdmUubGVmdCB7XFxuICBsZWZ0OiAtMTAwJTtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLmFjdGl2ZS5yaWdodCB7XFxuICBsZWZ0OiAxMDAlO1xcbn1cXG4uY2Fyb3VzZWwtY29udHJvbCB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDA7XFxuICBsZWZ0OiAwO1xcbiAgYm90dG9tOiAwO1xcbiAgd2lkdGg6IDE1JTtcXG4gIG9wYWNpdHk6IDAuNTtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT01MCk7XFxuICBmb250LXNpemU6IDIwcHg7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHRleHQtc2hhZG93OiAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjYpO1xcbn1cXG4uY2Fyb3VzZWwtY29udHJvbC5sZWZ0IHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IC13ZWJraXQtbGluZWFyLWdyYWRpZW50KGxlZnQsIGNvbG9yLXN0b3AocmdiYSgwLCAwLCAwLCAwLjUpIDAlKSwgY29sb3Itc3RvcChyZ2JhKDAsIDAsIDAsIDAuMDAwMSkgMTAwJSkpO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCByZ2JhKDAsIDAsIDAsIDAuNSkgMCUsIHJnYmEoMCwgMCwgMCwgMC4wMDAxKSAxMDAlKTtcXG4gIGJhY2tncm91bmQtcmVwZWF0OiByZXBlYXQteDtcXG4gIGZpbHRlcjogcHJvZ2lkOkRYSW1hZ2VUcmFuc2Zvcm0uTWljcm9zb2Z0LmdyYWRpZW50KHN0YXJ0Q29sb3JzdHI9JyM4MDAwMDAwMCcsIGVuZENvbG9yc3RyPScjMDAwMDAwMDAnLCBHcmFkaWVudFR5cGU9MSk7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sLnJpZ2h0IHtcXG4gIGxlZnQ6IGF1dG87XFxuICByaWdodDogMDtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IC13ZWJraXQtbGluZWFyLWdyYWRpZW50KGxlZnQsIGNvbG9yLXN0b3AocmdiYSgwLCAwLCAwLCAwLjAwMDEpIDAlKSwgY29sb3Itc3RvcChyZ2JhKDAsIDAsIDAsIDAuNSkgMTAwJSkpO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCByZ2JhKDAsIDAsIDAsIDAuMDAwMSkgMCUsIHJnYmEoMCwgMCwgMCwgMC41KSAxMDAlKTtcXG4gIGJhY2tncm91bmQtcmVwZWF0OiByZXBlYXQteDtcXG4gIGZpbHRlcjogcHJvZ2lkOkRYSW1hZ2VUcmFuc2Zvcm0uTWljcm9zb2Z0LmdyYWRpZW50KHN0YXJ0Q29sb3JzdHI9JyMwMDAwMDAwMCcsIGVuZENvbG9yc3RyPScjODAwMDAwMDAnLCBHcmFkaWVudFR5cGU9MSk7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sOmhvdmVyLFxcbi5jYXJvdXNlbC1jb250cm9sOmZvY3VzIHtcXG4gIG91dGxpbmU6IG5vbmU7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIG9wYWNpdHk6IDAuOTtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT05MCk7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sIC5pY29uLXByZXYsXFxuLmNhcm91c2VsLWNvbnRyb2wgLmljb24tbmV4dCxcXG4uY2Fyb3VzZWwtY29udHJvbCAuZ2x5cGhpY29uLWNoZXZyb24tbGVmdCxcXG4uY2Fyb3VzZWwtY29udHJvbCAuZ2x5cGhpY29uLWNoZXZyb24tcmlnaHQge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiA1MCU7XFxuICB6LWluZGV4OiA1O1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbn1cXG4uY2Fyb3VzZWwtY29udHJvbCAuaWNvbi1wcmV2LFxcbi5jYXJvdXNlbC1jb250cm9sIC5nbHlwaGljb24tY2hldnJvbi1sZWZ0IHtcXG4gIGxlZnQ6IDUwJTtcXG59XFxuLmNhcm91c2VsLWNvbnRyb2wgLmljb24tbmV4dCxcXG4uY2Fyb3VzZWwtY29udHJvbCAuZ2x5cGhpY29uLWNoZXZyb24tcmlnaHQge1xcbiAgcmlnaHQ6IDUwJTtcXG59XFxuLmNhcm91c2VsLWNvbnRyb2wgLmljb24tcHJldixcXG4uY2Fyb3VzZWwtY29udHJvbCAuaWNvbi1uZXh0IHtcXG4gIHdpZHRoOiAyMHB4O1xcbiAgaGVpZ2h0OiAyMHB4O1xcbiAgbWFyZ2luLXRvcDogLTEwcHg7XFxuICBtYXJnaW4tbGVmdDogLTEwcHg7XFxuICBmb250LWZhbWlseTogc2VyaWY7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sIC5pY29uLXByZXY6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6ICdcXFxcMjAzOSc7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sIC5pY29uLW5leHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6ICdcXFxcMjAzYSc7XFxufVxcbi5jYXJvdXNlbC1pbmRpY2F0b3JzIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGJvdHRvbTogMTBweDtcXG4gIGxlZnQ6IDUwJTtcXG4gIHotaW5kZXg6IDE1O1xcbiAgd2lkdGg6IDYwJTtcXG4gIG1hcmdpbi1sZWZ0OiAtMzAlO1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuLmNhcm91c2VsLWluZGljYXRvcnMgbGkge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgd2lkdGg6IDEwcHg7XFxuICBoZWlnaHQ6IDEwcHg7XFxuICBtYXJnaW46IDFweDtcXG4gIHRleHQtaW5kZW50OiAtOTk5cHg7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZmZmZmZmO1xcbiAgYm9yZGVyLXJhZGl1czogMTBweDtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMwMDAgXFxcXDk7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDApO1xcbn1cXG4uY2Fyb3VzZWwtaW5kaWNhdG9ycyAuYWN0aXZlIHtcXG4gIG1hcmdpbjogMDtcXG4gIHdpZHRoOiAxMnB4O1xcbiAgaGVpZ2h0OiAxMnB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLmNhcm91c2VsLWNhcHRpb24ge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgbGVmdDogMTUlO1xcbiAgcmlnaHQ6IDE1JTtcXG4gIGJvdHRvbTogMjBweDtcXG4gIHotaW5kZXg6IDEwO1xcbiAgcGFkZGluZy10b3A6IDIwcHg7XFxuICBwYWRkaW5nLWJvdHRvbTogMjBweDtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdGV4dC1zaGFkb3c6IDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuNik7XFxufVxcbi5jYXJvdXNlbC1jYXB0aW9uIC5idG4ge1xcbiAgdGV4dC1zaGFkb3c6IG5vbmU7XFxufVxcbkBtZWRpYSBzY3JlZW4gYW5kIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuY2Fyb3VzZWwtY29udHJvbCAuZ2x5cGhpY29uLWNoZXZyb24tbGVmdCxcXG4gIC5jYXJvdXNlbC1jb250cm9sIC5nbHlwaGljb24tY2hldnJvbi1yaWdodCxcXG4gIC5jYXJvdXNlbC1jb250cm9sIC5pY29uLXByZXYsXFxuICAuY2Fyb3VzZWwtY29udHJvbCAuaWNvbi1uZXh0IHtcXG4gICAgd2lkdGg6IDMwcHg7XFxuICAgIGhlaWdodDogMzBweDtcXG4gICAgbWFyZ2luLXRvcDogLTE1cHg7XFxuICAgIG1hcmdpbi1sZWZ0OiAtMTVweDtcXG4gICAgZm9udC1zaXplOiAzMHB4O1xcbiAgfVxcbiAgLmNhcm91c2VsLWNhcHRpb24ge1xcbiAgICBsZWZ0OiAyMCU7XFxuICAgIHJpZ2h0OiAyMCU7XFxuICAgIHBhZGRpbmctYm90dG9tOiAzMHB4O1xcbiAgfVxcbiAgLmNhcm91c2VsLWluZGljYXRvcnMge1xcbiAgICBib3R0b206IDIwcHg7XFxuICB9XFxufVxcbi5jbGVhcmZpeDpiZWZvcmUsXFxuLmNsZWFyZml4OmFmdGVyLFxcbi5jb250YWluZXI6YmVmb3JlLFxcbi5jb250YWluZXI6YWZ0ZXIsXFxuLmNvbnRhaW5lci1mbHVpZDpiZWZvcmUsXFxuLmNvbnRhaW5lci1mbHVpZDphZnRlcixcXG4ucm93OmJlZm9yZSxcXG4ucm93OmFmdGVyLFxcbi5mb3JtLWhvcml6b250YWwgLmZvcm0tZ3JvdXA6YmVmb3JlLFxcbi5mb3JtLWhvcml6b250YWwgLmZvcm0tZ3JvdXA6YWZ0ZXIsXFxuLmJ0bi10b29sYmFyOmJlZm9yZSxcXG4uYnRuLXRvb2xiYXI6YWZ0ZXIsXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXA6YmVmb3JlLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwOmFmdGVyLFxcbi5uYXY6YmVmb3JlLFxcbi5uYXY6YWZ0ZXIsXFxuLm5hdmJhcjpiZWZvcmUsXFxuLm5hdmJhcjphZnRlcixcXG4ubmF2YmFyLWhlYWRlcjpiZWZvcmUsXFxuLm5hdmJhci1oZWFkZXI6YWZ0ZXIsXFxuLm5hdmJhci1jb2xsYXBzZTpiZWZvcmUsXFxuLm5hdmJhci1jb2xsYXBzZTphZnRlcixcXG4ucGFnZXI6YmVmb3JlLFxcbi5wYWdlcjphZnRlcixcXG4ucGFuZWwtYm9keTpiZWZvcmUsXFxuLnBhbmVsLWJvZHk6YWZ0ZXIsXFxuLm1vZGFsLWZvb3RlcjpiZWZvcmUsXFxuLm1vZGFsLWZvb3RlcjphZnRlciB7XFxuICBjb250ZW50OiBcXFwiIFxcXCI7XFxuICBkaXNwbGF5OiB0YWJsZTtcXG59XFxuLmNsZWFyZml4OmFmdGVyLFxcbi5jb250YWluZXI6YWZ0ZXIsXFxuLmNvbnRhaW5lci1mbHVpZDphZnRlcixcXG4ucm93OmFmdGVyLFxcbi5mb3JtLWhvcml6b250YWwgLmZvcm0tZ3JvdXA6YWZ0ZXIsXFxuLmJ0bi10b29sYmFyOmFmdGVyLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwOmFmdGVyLFxcbi5uYXY6YWZ0ZXIsXFxuLm5hdmJhcjphZnRlcixcXG4ubmF2YmFyLWhlYWRlcjphZnRlcixcXG4ubmF2YmFyLWNvbGxhcHNlOmFmdGVyLFxcbi5wYWdlcjphZnRlcixcXG4ucGFuZWwtYm9keTphZnRlcixcXG4ubW9kYWwtZm9vdGVyOmFmdGVyIHtcXG4gIGNsZWFyOiBib3RoO1xcbn1cXG4uY2VudGVyLWJsb2NrIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgbWFyZ2luLWxlZnQ6IGF1dG87XFxuICBtYXJnaW4tcmlnaHQ6IGF1dG87XFxufVxcbi5wdWxsLXJpZ2h0IHtcXG4gIGZsb2F0OiByaWdodCAhaW1wb3J0YW50O1xcbn1cXG4ucHVsbC1sZWZ0IHtcXG4gIGZsb2F0OiBsZWZ0ICFpbXBvcnRhbnQ7XFxufVxcbi5oaWRlIHtcXG4gIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcXG59XFxuLnNob3cge1xcbiAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcXG59XFxuLmludmlzaWJsZSB7XFxuICB2aXNpYmlsaXR5OiBoaWRkZW47XFxufVxcbi50ZXh0LWhpZGUge1xcbiAgZm9udDogMC8wIGE7XFxuICBjb2xvcjogdHJhbnNwYXJlbnQ7XFxuICB0ZXh0LXNoYWRvdzogbm9uZTtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyOiAwO1xcbn1cXG4uaGlkZGVuIHtcXG4gIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcXG4gIHZpc2liaWxpdHk6IGhpZGRlbiAhaW1wb3J0YW50O1xcbn1cXG4uYWZmaXgge1xcbiAgcG9zaXRpb246IGZpeGVkO1xcbn1cXG5ALW1zLXZpZXdwb3J0IHtcXG4gIHdpZHRoOiBkZXZpY2Utd2lkdGg7XFxufVxcbi52aXNpYmxlLXhzLFxcbi52aXNpYmxlLXNtLFxcbi52aXNpYmxlLW1kLFxcbi52aXNpYmxlLWxnIHtcXG4gIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XFxuICAudmlzaWJsZS14cyB7XFxuICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7XFxuICB9XFxuICB0YWJsZS52aXNpYmxlLXhzIHtcXG4gICAgZGlzcGxheTogdGFibGU7XFxuICB9XFxuICB0ci52aXNpYmxlLXhzIHtcXG4gICAgZGlzcGxheTogdGFibGUtcm93ICFpbXBvcnRhbnQ7XFxuICB9XFxuICB0aC52aXNpYmxlLXhzLFxcbiAgdGQudmlzaWJsZS14cyB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLWNlbGwgIWltcG9ydGFudDtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSBhbmQgKG1heC13aWR0aDogOTkxcHgpIHtcXG4gIC52aXNpYmxlLXNtIHtcXG4gICAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRhYmxlLnZpc2libGUtc20ge1xcbiAgICBkaXNwbGF5OiB0YWJsZTtcXG4gIH1cXG4gIHRyLnZpc2libGUtc20ge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1yb3cgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRoLnZpc2libGUtc20sXFxuICB0ZC52aXNpYmxlLXNtIHtcXG4gICAgZGlzcGxheTogdGFibGUtY2VsbCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogOTkycHgpIGFuZCAobWF4LXdpZHRoOiAxMTk5cHgpIHtcXG4gIC52aXNpYmxlLW1kIHtcXG4gICAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRhYmxlLnZpc2libGUtbWQge1xcbiAgICBkaXNwbGF5OiB0YWJsZTtcXG4gIH1cXG4gIHRyLnZpc2libGUtbWQge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1yb3cgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRoLnZpc2libGUtbWQsXFxuICB0ZC52aXNpYmxlLW1kIHtcXG4gICAgZGlzcGxheTogdGFibGUtY2VsbCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogMTIwMHB4KSB7XFxuICAudmlzaWJsZS1sZyB7XFxuICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7XFxuICB9XFxuICB0YWJsZS52aXNpYmxlLWxnIHtcXG4gICAgZGlzcGxheTogdGFibGU7XFxuICB9XFxuICB0ci52aXNpYmxlLWxnIHtcXG4gICAgZGlzcGxheTogdGFibGUtcm93ICFpbXBvcnRhbnQ7XFxuICB9XFxuICB0aC52aXNpYmxlLWxnLFxcbiAgdGQudmlzaWJsZS1sZyB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLWNlbGwgIWltcG9ydGFudDtcXG4gIH1cXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XFxuICAuaGlkZGVuLXhzIHtcXG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIGFuZCAobWF4LXdpZHRoOiA5OTFweCkge1xcbiAgLmhpZGRlbi1zbSB7XFxuICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDk5MnB4KSBhbmQgKG1heC13aWR0aDogMTE5OXB4KSB7XFxuICAuaGlkZGVuLW1kIHtcXG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogMTIwMHB4KSB7XFxuICAuaGlkZGVuLWxnIHtcXG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG4udmlzaWJsZS1wcmludCB7XFxuICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XFxufVxcbkBtZWRpYSBwcmludCB7XFxuICAudmlzaWJsZS1wcmludCB7XFxuICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7XFxuICB9XFxuICB0YWJsZS52aXNpYmxlLXByaW50IHtcXG4gICAgZGlzcGxheTogdGFibGU7XFxuICB9XFxuICB0ci52aXNpYmxlLXByaW50IHtcXG4gICAgZGlzcGxheTogdGFibGUtcm93ICFpbXBvcnRhbnQ7XFxuICB9XFxuICB0aC52aXNpYmxlLXByaW50LFxcbiAgdGQudmlzaWJsZS1wcmludCB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLWNlbGwgIWltcG9ydGFudDtcXG4gIH1cXG59XFxuQG1lZGlhIHByaW50IHtcXG4gIC5oaWRkZW4tcHJpbnQge1xcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbi8qXFxuRG9jdW1lbnQgICA6IGpxdWVyeS5wbm90aWZ5LmRlZmF1bHQuY3NzXFxuQ3JlYXRlZCBvbiA6IE5vdiAyMywgMjAwOSwgMzoxNDoxMCBQTVxcbkF1dGhvciAgICAgOiBIdW50ZXIgUGVycmluXFxuVmVyc2lvbiAgICA6IDEuMi4wXFxuTGluayAgICAgICA6IGh0dHA6Ly9waW5lc2ZyYW1ld29yay5vcmcvcG5vdGlmeS9cXG5EZXNjcmlwdGlvbjpcXG5cXHREZWZhdWx0IHN0eWxpbmcgZm9yIFBpbmVzIE5vdGlmeSBqUXVlcnkgcGx1Z2luLlxcbiovXFxuLyogLS0gTm90aWNlICovXFxuLnVpLXBub3RpZnkge1xcbiAgdG9wOiAyNXB4O1xcbiAgcmlnaHQ6IDI1cHg7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBoZWlnaHQ6IGF1dG87XFxuICAvKiBFbnN1cmVzIG5vdGljZXMgYXJlIGFib3ZlIGV2ZXJ5dGhpbmcgKi9cXG4gIHotaW5kZXg6IDk5OTk7XFxufVxcbi8qIEhpZGVzIHBvc2l0aW9uOiBmaXhlZCBmcm9tIElFNiAqL1xcbmh0bWwgPiBib2R5IC51aS1wbm90aWZ5IHtcXG4gIHBvc2l0aW9uOiBmaXhlZDtcXG59XFxuLnVpLXBub3RpZnkgLnVpLXBub3RpZnktc2hhZG93IHtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogMHB4IDJweCAxMHB4IHJnYmEoNTAsIDUwLCA1MCwgMC41KTtcXG4gIC1tb3otYm94LXNoYWRvdzogMHB4IDJweCAxMHB4IHJnYmEoNTAsIDUwLCA1MCwgMC41KTtcXG4gIGJveC1zaGFkb3c6IDBweCAycHggMTBweCByZ2JhKDUwLCA1MCwgNTAsIDAuNSk7XFxufVxcbi51aS1wbm90aWZ5LWNvbnRhaW5lciB7XFxuICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiAwIDA7XFxuICBwYWRkaW5nOiAuOGVtO1xcbiAgaGVpZ2h0OiAxMDAlO1xcbiAgbWFyZ2luOiAwO1xcbn1cXG4udWktcG5vdGlmeS1zaGFycCB7XFxuICAtd2Via2l0LWJvcmRlci1yYWRpdXM6IDA7XFxuICAtbW96LWJvcmRlci1yYWRpdXM6IDA7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4udWktcG5vdGlmeS1jbG9zZXIsXFxuLnVpLXBub3RpZnktc3RpY2tlciB7XFxuICBmbG9hdDogcmlnaHQ7XFxuICBtYXJnaW4tbGVmdDogLjJlbTtcXG59XFxuLnVpLXBub3RpZnktdGl0bGUge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBtYXJnaW4tYm90dG9tOiAuNGVtO1xcbn1cXG4udWktcG5vdGlmeS10ZXh0IHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG4udWktcG5vdGlmeS1pY29uLFxcbi51aS1wbm90aWZ5LWljb24gc3BhbiB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIGZsb2F0OiBsZWZ0O1xcbiAgbWFyZ2luLXJpZ2h0OiAuMmVtO1xcbn1cXG4vKiAtLSBIaXN0b3J5IFB1bGxkb3duICovXFxuLnVpLXBub3RpZnktaGlzdG9yeS1jb250YWluZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwO1xcbiAgcmlnaHQ6IDE4cHg7XFxuICB3aWR0aDogNzBweDtcXG4gIGJvcmRlci10b3A6IG5vbmU7XFxuICBwYWRkaW5nOiAwO1xcbiAgLXdlYmtpdC1ib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbiAgLW1vei1ib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMDtcXG4gIC13ZWJraXQtYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxuICAtbW96LWJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxuICAvKiBFbnN1cmVzIGhpc3RvcnkgY29udGFpbmVyIGlzIGFib3ZlIG5vdGljZXMuICovXFxuICB6LWluZGV4OiAxMDAwMDtcXG59XFxuLnVpLXBub3RpZnktaGlzdG9yeS1jb250YWluZXIgLnVpLXBub3RpZnktaGlzdG9yeS1oZWFkZXIge1xcbiAgcGFkZGluZzogMnB4O1xcbn1cXG4udWktcG5vdGlmeS1oaXN0b3J5LWNvbnRhaW5lciBidXR0b24ge1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuLnVpLXBub3RpZnktaGlzdG9yeS1jb250YWluZXIgLnVpLXBub3RpZnktaGlzdG9yeS1wdWxsZG93biB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIG1hcmdpbjogMCBhdXRvO1xcbn1cXG4ucHJvZHVjdHMtZWRpdC1mb3JtIHtcXG4gIHBhZGRpbmctdG9wOiAxMHB4O1xcbn1cXG5cIjsocmVxdWlyZSgnbGVzc2lmeScpKShjc3MpOyBtb2R1bGUuZXhwb3J0cyA9IGNzczsiLCIjIEhvbWUgcGFnZSBsYXlvdXRcbk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcbmpRdWVyeSA9IHJlcXVpcmUgJ2pxdWVyeSdcblByb2R1Y3RFZGl0VmlldyA9IHJlcXVpcmUgJy4uL3Byb2R1Y3RzL2VkaXQvbGF5b3V0LmNvZmZlZSdcblByb2R1Y3RMaXN0VmlldyA9IHJlcXVpcmUgJy4uL3Byb2R1Y3RzL2xpc3QvbGF5b3V0LmNvZmZlZSdcbndpbmRvdy5qUXVlcnkgPSByZXF1aXJlICdqcXVlcnknXG5Cb290c3RyYXAgPSByZXF1aXJlICdib290c3RyYXAnXG5Qcm9kdWN0cyA9IHJlcXVpcmUgJy4uLy4uL2NvbGxlY3Rpb25zL3Byb2R1Y3RzLmNvZmZlZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG5cblBub3RpZnkgPSByZXF1aXJlICdqcXVlcnlfcG5vdGlmeSdcblxuIyBTZXQgdXAgbm90aWZpY2F0aW9uc1xuJC5wbm90aWZ5LmRlZmF1bHRzLmhpc3RvcnkgPSBmYWxzZVxuJC5wbm90aWZ5LmRlZmF1bHRzLnN0eWxpbmcgPSBcImJvb3RzdHJhcFwiXG5cblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkxheW91dC5leHRlbmRcbiAgdGVtcGxhdGU6IHdpbmRvdy50ZW1wbGF0ZXNbJ3NyYy9hcHAvdmlld3MvaG9tZS9sYXlvdXQnXVxuXG4gIGNsYXNzTmFtZTogXCJjb2wtbWQtMTIgaG9tZS1wYWdlLWNvbFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL2hvbWUvbGF5b3V0LmNvZmZlZTo6aW5pdGlhbGl6ZVwiKVxuICAgIEBzZXRDb21tYW5kSGFuZGxlcnMoKVxuXG4gIHJlZ2lvbnM6XG4gICAgJ21haW4nOiAnI21haW4tYm9keSdcbiAgICAnbGlzdCc6IFwiI2xpc3RcIlxuXG4gIGV2ZW50czpcbiAgICAnbW91c2VlbnRlciBbdG9vbHRpcF0nIDogJ3Nob3dUb29sdGlwJ1xuICAgICdtb3VzZWxlYXZlIFt0b29sdGlwXScgOiAnaGlkZVRvb2x0aXAnXG5cbiAgc2hvd1Rvb2x0aXA6IChldmVudCkgLT5cbiAgICAkKCdbdG9vbHRpcF0nKS5lYWNoKChpLGVsKSAtPlxuICAgICAgdHJ5XG4gICAgICAgICQoZWwpLnRvb2x0aXAoKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgIClcblxuICAgIHRyeVxuICAgICAgJChldmVudC50YXJnZXQpLnRvb2x0aXAoJ3Nob3cnKVxuICAgIGNhdGNoIGVycm9yXG5cbiAgaGlkZVRvb2x0aXA6IChldmVudCkgLT5cbiAgICB0cnlcbiAgICAgICQoZXZlbnQudGFyZ2V0KS50b29sdGlwKCdoaWRlJylcbiAgICBjYXRjaCBlcnJvclxuXG4gIG9uUmVuZGVyOiAtPlxuICAgICMgc2hvdyB0aGUgcHJvZHVjdCBsaXN0IHZpZXdcbiAgICBwcm9kdWN0cyA9IG5ldyBQcm9kdWN0c1xuICAgIHByb2R1Y3RzLmZldGNoKClcbiAgICBsaXN0X3ZpZXcgPSBuZXcgUHJvZHVjdExpc3RWaWV3KGNvbGxlY3Rpb246IHByb2R1Y3RzKVxuICAgIEBsaXN0LnNob3cobGlzdF92aWV3KVxuXG4gICMgU2V0IHVwIGNvbW1hbmQgaGFuZGxlcnNcbiAgc2V0Q29tbWFuZEhhbmRsZXJzOiAtPlxuICAgIENvbW1hbmRzLnNldEhhbmRsZXIoXCJzcmMvYXBwL3ZpZXdzL2hvbWUvbGF5b3V0L2VkaXRfcHJvZHVjdFwiLCAocHJvZHVjdCkgPT5cbiAgICAgIGVkaXRfdmlldyA9IG5ldyBQcm9kdWN0RWRpdFZpZXcobW9kZWw6IHByb2R1Y3QpXG4gICAgICBAbWFpbi5zaG93KGVkaXRfdmlldylcbiAgICApXG5cblxuXG4iLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuUG5vdGlmeSA9IHJlcXVpcmUgJ2pxdWVyeV9wbm90aWZ5J1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvY29udHJvbHMnXVxuXG4gIGNsYXNzTmFtZTogXCJwcm9kdWN0cy1lZGl0LWNvbnRyb2xzXCJcblxuICBpbml0aWFsaXplOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9jb250cm9sczo6aW5pdGlhbGl6ZVwiKVxuXG4gIGV2ZW50czpcbiAgICAnY2xpY2sgI3NhdmUnIDogJ3NhdmVQcm9kdWN0J1xuICAgICdjbGljayAjY2FuY2VsJyA6ICdkb0Nsb3NlJ1xuICAgICdjbGljayAjZGVsZXRlJyA6ICdkb0RlbGV0ZSdcblxuICBzZXJpYWxpemVEYXRhOiAtPlxuICAgIHJldHVybiB7XG4gICAgICAnbW9kZWwnOiBAbW9kZWxcbiAgICB9XG5cbiAgZG9DbG9zZTogKGV2ZW50KSAtPlxuICAgICMgQXNrIHRoZSBwYXJlbnQgbGF5b3V0IHRvIGNsb3NlXG4gICAgQ29tbWFuZHMuZXhlY3V0ZShcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvY2xvc2VcIilcblxuICBkb0RlbGV0ZTogKGV2ZW50KSAtPlxuICAgIEBtb2RlbC5kZXN0cm95KHN1Y2Nlc3M6ID0+XG4gICAgICBDb21tYW5kcy5leGVjdXRlKFwibW9kZWxzL3Byb2R1Y3RzL2RlbGV0ZWRcIiwgQG1vZGVsKVxuICAgICAgQGRvQ2xvc2UoKVxuICAgICAgJC5wbm90aWZ5KHtcbiAgICAgICAgdGl0bGU6IFwiUHJvZHVjdCBkZWxldGVkXCIsXG4gICAgICAgIHRleHQ6IFwiUHJvZHVjdCAje0Btb2RlbC5nZXQoJ3RpdGxlJyl9IHdhcyBkZWxldGVkXCIsXG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG5cbiAgICAgICAgfSlcbiAgICApXG5cbiAgc2F2ZVByb2R1Y3Q6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvY29udHJvbHM6OnNhdmVQcm9kdWN0XCIpXG5cbiAgICAjIGlmIGEgbmV3IG1vZGVsIHNlbmQgb3V0IHRoZSBtZXNzYWdlIGZvciBhbnkgaW50ZXJlc3RlZCBwYXJ0aWVzXG4gICAgaWYgQG1vZGVsLmlzTmV3KClcbiAgICAgIENvbW1hbmRzLmV4ZWN1dGUoXCJtb2RlbHMvcHJvZHVjdHMvYWRkZWRfbmV3XCIsIEBtb2RlbClcblxuICAgIEBtb2RlbC5zYXZlKClcbiAgICBAZG9DbG9zZSgpXG4iLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5cbm1vZHVsZS5leHBvcnRzID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmRcbiAgdGVtcGxhdGU6IHdpbmRvdy50ZW1wbGF0ZXNbJ3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2Fib3V0J11cblxuICBjbGFzc05hbWU6IFwicHJvZHVjdHMtZWRpdC1mb3JtIFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9hYm91dDo6aW5pdGlhbGl6ZVwiKVxuXG4gIHNlcmlhbGl6ZURhdGE6IC0+XG4gICAgcmV0dXJuIHtcbiAgICAgICdtb2RlbCc6IEBtb2RlbFxuICAgIH1cblxuICBldmVudHM6XG4gICAgJ2NoYW5nZSBpbnB1dCc6ICdpbnB1dENoYW5nZWQnXG4gICAgJ2NoYW5nZSB0ZXh0YXJlYSc6ICd0ZXh0YXJlYUNoYW5nZWQnXG5cbiAgaW5wdXRDaGFuZ2VkOiAoZXZlbnQpIC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fYWJvdXQ6OmlucHV0Q2hhbmdlZFwiKVxuICAgIGlucHV0ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgIGlmICFfLmlzVW5kZWZpbmVkKGlucHV0LmRhdGEoJ21vZGVsLWF0dHJpYnV0ZScpKVxuICAgICAgQG1vZGVsLnNldChpbnB1dC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSwgaW5wdXQudmFsKCkpXG5cbiAgdGV4dGFyZWFDaGFuZ2VkOiAoZXZlbnQpIC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fYWJvdXQ6OnRleHRhcmVhQ2hhbmdlZFwiKVxuICAgIHRleHRhcmVhID0gJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgIGlmICFfLmlzVW5kZWZpbmVkKHRleHRhcmVhLmRhdGEoJ21vZGVsLWF0dHJpYnV0ZScpKVxuICAgICAgQG1vZGVsLnNldCh0ZXh0YXJlYS5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSwgdGV4dGFyZWEudmFsKCkpXG4iLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5EYXlzVG9TaGlwcyA9IHJlcXVpcmUgJy4uLy4uLy4uL2NvbGxlY3Rpb25zL2RheXNfdG9fc2hpcHMuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9kZWxpdmVyeSddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWVkaXQtZm9ybSBcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fZGVsaXZlcnk6OmluaXRpYWxpemVcIilcbiAgICBAZGF5c190b19zaGlwX3JlY29yZHMgPSBuZXcgRGF5c1RvU2hpcHMoKVxuICAgIEBkYXlzX3RvX3NoaXBfcmVjb3Jkcy5mZXRjaChzdWNjZXNzOiA9PlxuICAgICAgY29uc29sZS5sb2cgXCJsb2FkZWQgZGF5cyB0byBzaGlwc1wiXG4gICAgICBAcmVuZGVyKClcbiAgICApXG5cbiAgdWk6XG4gICAgJ2RheXNfc2VsZWN0JzogJyNkYXlzX3RvX3NoaXAnXG5cbiAgc2VyaWFsaXplRGF0YTogLT5cbiAgICByZXR1cm4ge1xuICAgICAgJ21vZGVsJzogQG1vZGVsLFxuICAgICAgJ2RheXNfdG9fc2hpcF9yZWNvcmRzJzogQGRheXNfdG9fc2hpcF9yZWNvcmRzXG4gICAgfVxuXG4gIGV2ZW50czpcbiAgICAnY2hhbmdlIGlucHV0JzogJ2lucHV0Q2hhbmdlZCdcbiAgICAnY2hhbmdlIHRleHRhcmVhJzogJ3RleHRhcmVhQ2hhbmdlZCdcbiAgICAnY2hhbmdlIHNlbGVjdCc6ICdzZWxlY3RDaGFuZ2VkJ1xuXG4gIG9uUmVuZGVyOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5OjpvblJlbmRlclwiKVxuICAgIGNvbnNvbGUubG9nKEBtb2RlbC5nZXQoJ2RheXNfdG9fc2hpcF9pZCcpKVxuICAgIEB1aS5kYXlzX3NlbGVjdC52YWwoQG1vZGVsLmdldCgnZGF5c190b19zaGlwX2lkJykpXG5cblxuXG4gIGlucHV0Q2hhbmdlZDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5OjppbnB1dENoYW5nZWRcIilcbiAgICBpbnB1dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZChpbnB1dC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSlcbiAgICAgIEBtb2RlbC5zZXQoaW5wdXQuZGF0YSgnbW9kZWwtYXR0cmlidXRlJyksIGlucHV0LnZhbCgpKVxuXG4gIHRleHRhcmVhQ2hhbmdlZDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5Ojp0ZXh0YXJlYUNoYW5nZWRcIilcbiAgICB0ZXh0YXJlYSA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZCh0ZXh0YXJlYS5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSlcbiAgICAgIEBtb2RlbC5zZXQodGV4dGFyZWEuZGF0YSgnbW9kZWwtYXR0cmlidXRlJyksIHRleHRhcmVhLnZhbCgpKVxuXG4gIHNlbGVjdENoYW5nZWQ6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9kZWxpdmVyeTo6c2VsZWN0Q2hhbmdlZFwiKVxuICAgIHNlbGVjdCA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZChzZWxlY3QuZGF0YSgnbW9kZWwtYXR0cmlidXRlJykpXG4gICAgICBAbW9kZWwuc2V0KHNlbGVjdC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSwgc2VsZWN0LnZhbCgpKVxuIiwiIyBIb21lIHBhZ2UgbGF5b3V0XG5NYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbnRyb2xzVmlldyA9IHJlcXVpcmUgJy4vY29udHJvbHMuY29mZmVlJ1xuRm9ybUFib3V0VmlldyA9IHJlcXVpcmUgJy4vZm9ybV9hYm91dC5jb2ZmZWUnXG5Gb3JtRGVsaXZlcnlWaWV3ID0gcmVxdWlyZSAnLi9mb3JtX2RlbGl2ZXJ5LmNvZmZlZSdcblRhYnNWaWV3ID0gcmVxdWlyZSAnLi90YWJzLmNvZmZlZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG5cbm1vZHVsZS5leHBvcnRzID0gTWFyaW9uZXR0ZS5MYXlvdXQuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0J11cblxuICBjbGFzc05hbWU6IFwicHJvZHVjdC1lZGl0LWxheW91dFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0LmNvZmZlZTo6aW5pdGlhbGl6ZVwiKVxuICAgIEBjb250cm9sc192aWV3ID0gbmV3IENvbnRyb2xzVmlldyhtb2RlbDogQG1vZGVsKVxuICAgIEB0YWJzX3ZpZXcgPSBuZXcgVGFic1ZpZXcobW9kZWw6IEBtb2RlbClcbiAgICBAc2V0Q29tbWFuZEhhbmRsZXJzKClcblxuICByZWdpb25zOlxuICAgICdjb250cm9scyc6ICcjY29udHJvbHMnXG4gICAgJ3RhYnMnOiAnI3RhYnMnXG4gICAgJ2Zvcm0nOiAnI2Zvcm0nXG5cbiAgdGFiX2NvbnN0cnVjdG9yczoge1xuICAgICBkZWxpdmVyeTogRm9ybURlbGl2ZXJ5Vmlld1xuICAgICBhYm91dDogRm9ybUFib3V0Vmlld1xuICAgICAjIHRhYjogRm9ybURlbGl2ZXJ5Vmlld1xuICAgICAjIHRhYjogRm9ybURlbGl2ZXJ5Vmlld1xuICB9XG5cbiAgb25SZW5kZXI6IC0+XG4gICAgQGNvbnRyb2xzLnNob3coQGNvbnRyb2xzX3ZpZXcpXG4gICAgQHRhYnMuc2hvdyhAdGFic192aWV3KVxuXG4gICMgU2V0IHVwIGNvbW1hbmQgaGFuZGxlcnNcbiAgc2V0Q29tbWFuZEhhbmRsZXJzOiAtPlxuICAgICMgY2xvc2UgY29tbWFuZFxuICAgIENvbW1hbmRzLnNldEhhbmRsZXIoXCJzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0L2Nsb3NlXCIsICgpID0+XG4gICAgICBAY2xvc2UoKVxuICAgIClcblxuICAgICMgU2hvdyBhYm91dCBmb3JtXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvc2hvd19hYm91dFwiLCAoKSA9PlxuICAgICAgdmlldyA9IG5ldyBGb3JtQWJvdXRWaWV3KG1vZGVsOiBAbW9kZWwpXG4gICAgICBAZm9ybS5zaG93KHZpZXcpXG4gICAgKVxuXG5cbiAgICAjIFNob3cgdGFiXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvc2hvd190YWJcIiwgKHRhZ19uYW1lKSA9PlxuICAgICAgdmlldyA9IG5ldyBAdGFiX2NvbnN0cnVjdG9yc1t0YWdfbmFtZV0obW9kZWw6IEBtb2RlbClcbiAgICAgIEBmb3JtLnNob3codmlldylcbiAgICApXG5cblxuIiwiTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG5Db21tYW5kcyA9IHJlcXVpcmUgXCIuLi8uLi8uLi9yZXF1aXJlcy9jb21tYW5kcy5jb2ZmZWVcIlxuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L3RhYnMnXVxuXG4gIGNsYXNzTmFtZTogXCJwcm9kdWN0cy1lZGl0LXRhYnNcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L3RhYnM6OmluaXRpYWxpemVcIilcblxuICBzZXJpYWxpemVEYXRhOiAtPlxuICAgIHJldHVybiB7XG4gICAgICAnbW9kZWwnOiBAbW9kZWxcbiAgICB9XG5cbiAgdWk6XG4gICAgdGFiczogJy5uYXYtdGFicyBsaVxuICAgICdcbiAgZXZlbnRzOlxuICAgICdjbGljayAubmF2LXRhYnMgbGknIDogJ3RhYkNsaWNrZWQnXG5cbiAgb25SZW5kZXI6IC0+XG4gICAgIyBXaGVuIHN0YXJ0aW5nIGFzayBmb3IgdGhlIGRldGFpbHMgdmlldyB0byBiZSBzaG93blxuICAgIENvbW1hbmRzLmV4ZWN1dGUoXCJzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0L3Nob3dfYWJvdXRcIilcblxuXG4gIHRhYkNsaWNrZWQ6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvdGFiczo6dGFiQ2xpY2tlZFwiKVxuXG4gICAgdGFiID0gJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgIHRhYl9uYW1lID0gdGFiLmRhdGEoJ3RhYi1uYW1lJylcbiAgICBjb25zb2xlLmxvZyh0YWJfbmFtZSlcbiAgICBDb21tYW5kcy5leGVjdXRlKFwic3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2xheW91dC9zaG93X3RhYlwiLCB0YWIuZGF0YSgndGFiLW5hbWUnKSlcblxuICAgICMgU2V0IHdobyBpcyB0aGUgYWN0aXZlIHRhYlxuICAgIEB1aS50YWJzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgIHRhYi5hZGRDbGFzcygnYWN0aXZlJykiLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbiQgPSByZXF1aXJlICdqcXVlcnknXG5Qcm9kdWN0ID0gcmVxdWlyZSAnLi4vLi4vLi4vbW9kZWxzL3Byb2R1Y3QuY29mZmVlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2NvbnRyb2xzJ11cblxuICBjbGFzc05hbWU6IFwicHJvZHVjdHMtbGlzdC1jb250cm9sc1wiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2xpc3QvY29udHJvbHM6OmluaXRpYWxpemVcIilcbiAgICBAc2VhcmNoX3RleHQgPSBcIlwiXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayAjYWRkJyA6ICdBZGRQcm9kdWN0J1xuXG4gIHNlcmlhbGl6ZURhdGE6IC0+XG4gICAgcmV0dXJuIHtcbiAgICAgICdjb2xsZWN0aW9uJzogQGNvbGxlY3Rpb24sXG4gICAgICAnc2VhcmNoX3RleHQnOiBAc2VhcmNoX3RleHRcbiAgICB9XG5cbiAgQWRkUHJvZHVjdDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvbGlzdC9jb250cm9sczo6QWRkUHJvZHVjdFwiKVxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgcHJvZHVjdCA9IG5ldyBQcm9kdWN0KClcbiAgICAjIFNlbmQgdGhlIG1lc3NhZ2UgdG8gZWRpdCB0aGlzIHByb2R1Y3RcbiAgICBDb21tYW5kcy5leGVjdXRlKFwic3JjL2FwcC92aWV3cy9ob21lL2xheW91dC9lZGl0X3Byb2R1Y3RcIiwgcHJvZHVjdClcbiIsIk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcbkNvbnRyb2xzVmlldyA9IHJlcXVpcmUgJy4vY29udHJvbHMuY29mZmVlJ1xuTGlzdFZpZXcgPSByZXF1aXJlICcuL2xpc3QuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuTGF5b3V0LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2xheW91dCddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWxpc3QtbGF5b3V0XCJcblxuICBpbml0aWFsaXplOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvbGlzdC9sYXlvdXQ6OmluaXRpYWxpemVcIilcbiAgICBAY29udHJvbHNfdmlldyA9IG5ldyBDb250cm9sc1ZpZXcoY29sbGVjdGlvbjogQGNvbGxlY3Rpb24pXG4gICAgQGxpc3RfdmlldyA9IG5ldyBMaXN0Vmlldyhjb2xsZWN0aW9uOiBAY29sbGVjdGlvbilcbiAgcmVnaW9uczpcbiAgICAnY29udHJvbHMnOiAnI2NvbnRyb2xzJ1xuICAgIFwibGlzdFwiOiAnI2xpc3QnXG5cbiAgb25SZW5kZXI6IC0+XG4gICAgQGNvbnRyb2xzLnNob3coQGNvbnRyb2xzX3ZpZXcpXG4gICAgQGxpc3Quc2hvdyhAbGlzdF92aWV3KVxuXG5cblxuIiwiTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuTGlzdEl0ZW1WaWV3ID0gcmVxdWlyZSAnLi9saXN0X2l0ZW0uY29mZmVlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2xpc3QvbGlzdCddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWxpc3QtbGlzdFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2xpc3QvbGlzdDo6aW5pdGlhbGl6ZVwiKVxuICAgIEBzZXRDb21tYW5kSGFuZGxlcnMoKVxuXG4gIGl0ZW1WaWV3Q29udGFpbmVyOiAnI2l0ZW0tdmlldy1jb250YWluZXInXG5cbiAgaXRlbVZpZXc6IExpc3RJdGVtVmlld1xuXG4gICMgU2V0IHVwIGNvbW1hbmQgaGFuZGxlcnNcbiAgc2V0Q29tbWFuZEhhbmRsZXJzOiAtPlxuICAgICMgQSBuZXcgcHJvZHVjdCBoYXMgYmVlbiBhZGRlZCwgYWRkIGl0IHRvIHRoZSBjb2xsZWN0aW9uXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcIm1vZGVscy9wcm9kdWN0cy9hZGRlZF9uZXdcIiwgKHByb2R1Y3QpID0+XG4gICAgICBAY29sbGVjdGlvbi5hZGQocHJvZHVjdClcbiAgICApXG5cbiAgICAjIFNob3cgZGV0YWlscyBmb3JtXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvc2hvd19kZXRhaWxzXCIsICgpID0+XG4gICAgICB2aWV3ID0gbmV3IEZvcm1EZXRhaWxzVmlldyhtb2RlbDogQG1vZGVsKVxuICAgICAgQGZvcm0uc2hvdyh2aWV3KVxuICAgIClcbiIsIk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2xpc3QvbGlzdF9pdGVtJ11cblxuICBjbGFzc05hbWU6IFwicHJvZHVjdHMtbGlzdC1saXN0LWl0ZW1cIlxuXG4gIHRhZ05hbWU6IFwidHJcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9saXN0L2xpc3RfaXRlbTo6aW5pdGlhbGl6ZVwiKVxuICAgIEBzZWFyY2hfdGV4dCA9IFwiXCJcblxuICBzZXJpYWxpemVEYXRhOiAtPlxuICAgIHJldHVybiB7XG4gICAgICAnbW9kZWwnOiBAbW9kZWxcbiAgICB9XG5cbiAgbW9kZWxFdmVudHM6XG4gICAgJ3N5bmMnOiAgJ3JlbmRlcidcblxuICBldmVudHM6XG4gICAgJ2NsaWNrIC5lZGl0X2xpbmsnOiAnZG9FZGl0J1xuXG4gIGRvRWRpdDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvbGlzdC9saXN0X2l0ZW06OmRvRWRpdFwiKVxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgIyBTZW5kIHRoZSBtZXNzYWdlIHRvIGVkaXQgdGhpcyBwcm9kdWN0XG4gICAgQ29tbWFuZHMuZXhlY3V0ZShcInNyYy9hcHAvdmlld3MvaG9tZS9sYXlvdXQvZWRpdF9wcm9kdWN0XCIsIEBtb2RlbClcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbihmdW5jdGlvbiBicm93c2VyaWZ5U2hpbShtb2R1bGUsIGV4cG9ydHMsIGRlZmluZSwgYnJvd3NlcmlmeV9zaGltX19kZWZpbmVfX21vZHVsZV9fZXhwb3J0X18pIHtcbi8qXG4gIFBhdGNoZWQgdmVyc2lvbiBvZiB0aGlzIGFkYXB0ZXIgdG8gd29yayB3aXRoIEJyb3dzZXJpZnlcbiovXG4oZnVuY3Rpb24gKCkgeyAvKmdsb2JhbCBfOiBmYWxzZSwgQmFja2JvbmU6IGZhbHNlICovXG4gICAgLy8gR2VuZXJhdGUgZm91ciByYW5kb20gaGV4IGRpZ2l0cy5cbiAgICBmdW5jdGlvbiBTNCgpIHtcbiAgICAgICAgcmV0dXJuICgoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApIHwgMCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygxKTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBhIHBzZXVkby1HVUlEIGJ5IGNvbmNhdGVuYXRpbmcgcmFuZG9tIGhleGFkZWNpbWFsLlxuICAgIGZ1bmN0aW9uIGd1aWQoKSB7XG4gICAgICAgIHJldHVybiAoUzQoKSArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBTNCgpICsgUzQoKSk7XG4gICAgfVxuXG4gICAgdmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKVxuICAgIHZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5cbiAgICAgLy8gTmFtaW5nIGlzIGEgbWVzcyFcbiAgICAgdmFyIGluZGV4ZWREQiA9IHdpbmRvdy5pbmRleGVkREIgfHwgd2luZG93LndlYmtpdEluZGV4ZWREQiB8fCB3aW5kb3cubW96SW5kZXhlZERCIHx8IHdpbmRvdy5tc0luZGV4ZWREQiA7XG4gICAgIHZhciBJREJUcmFuc2FjdGlvbiA9IHdpbmRvdy5JREJUcmFuc2FjdGlvbiB8fCB3aW5kb3cud2Via2l0SURCVHJhbnNhY3Rpb24gfHwgeyBSRUFEX1dSSVRFOiBcInJlYWR3cml0ZVwiIH07IC8vIE5vIHByZWZpeCBpbiBtb3pcbiAgICAgdmFyIElEQktleVJhbmdlID0gd2luZG93LklEQktleVJhbmdlIHx8IHdpbmRvdy53ZWJraXRJREJLZXlSYW5nZSA7IC8vIE5vIHByZWZpeCBpbiBtb3pcblxuICAgICB3aW5kb3cuSURCQ3Vyc29yID0gd2luZG93LklEQkN1cnNvciB8fCB3aW5kb3cud2Via2l0SURCQ3Vyc29yIHx8ICB3aW5kb3cubW96SURCQ3Vyc29yIHx8ICB3aW5kb3cubXNJREJDdXJzb3IgO1xuXG5cbiAgICAvLyBEcml2ZXIgb2JqZWN0XG4gICAgLy8gVGhhdCdzIHRoZSBpbnRlcmVzdGluZyBwYXJ0LlxuICAgIC8vIFRoZXJlIGlzIGEgZHJpdmVyIGZvciBlYWNoIHNjaGVtYSBwcm92aWRlZC4gVGhlIHNjaGVtYSBpcyBhIHRlIGNvbWJpbmF0aW9uIG9mIG5hbWUgKGZvciB0aGUgZGF0YWJhc2UpLCBhIHZlcnNpb24gYXMgd2VsbCBhcyBtaWdyYXRpb25zIHRvIHJlYWNoIHRoYXRcbiAgICAvLyB2ZXJzaW9uIG9mIHRoZSBkYXRhYmFzZS5cbiAgICBmdW5jdGlvbiBEcml2ZXIoc2NoZW1hLCByZWFkeSwgbm9sb2cpIHtcbiAgICAgICAgdGhpcy5zY2hlbWEgICAgICAgICA9IHNjaGVtYTtcbiAgICAgICAgdGhpcy5yZWFkeSAgICAgICAgICA9IHJlYWR5O1xuICAgICAgICB0aGlzLmVycm9yICAgICAgICAgID0gbnVsbDtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbnMgICA9IFtdOyAvLyBVc2VkIHRvIGxpc3QgYWxsIHRyYW5zYWN0aW9ucyBhbmQga2VlcCB0cmFjayBvZiBhY3RpdmUgb25lcy5cbiAgICAgICAgdGhpcy5kYiAgICAgICAgICAgICA9IG51bGw7XG4gICAgICAgIHRoaXMubm9sb2cgICAgICAgICAgPSBub2xvZztcbiAgICAgICAgdGhpcy5zdXBwb3J0T25VcGdyYWRlTmVlZGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBsYXN0TWlncmF0aW9uUGF0aFZlcnNpb24gPSBfLmxhc3QodGhpcy5zY2hlbWEubWlncmF0aW9ucykudmVyc2lvbjtcbiAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm9wZW5pbmcgZGF0YWJhc2UgXCIgKyB0aGlzLnNjaGVtYS5pZCArIFwiIGluIHZlcnNpb24gI1wiICsgbGFzdE1pZ3JhdGlvblBhdGhWZXJzaW9uKTtcbiAgICAgICAgdGhpcy5kYlJlcXVlc3QgICAgICA9IGluZGV4ZWREQi5vcGVuKHRoaXMuc2NoZW1hLmlkLGxhc3RNaWdyYXRpb25QYXRoVmVyc2lvbik7IC8vc2NoZW1hIHZlcnNpb24gbmVlZCB0byBiZSBhbiB1bnNpZ25lZCBsb25nXG5cbiAgICAgICAgdGhpcy5sYXVuY2hNaWdyYXRpb25QYXRoID0gZnVuY3Rpb24oZGJWZXJzaW9uKSB7XG4gICAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSB0aGlzLmRiUmVxdWVzdC50cmFuc2FjdGlvbiB8fCB2ZXJzaW9uUmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICB2YXIgY2xvbmVkTWlncmF0aW9ucyA9IF8uY2xvbmUoc2NoZW1hLm1pZ3JhdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy5taWdyYXRlKHRyYW5zYWN0aW9uLCBjbG9uZWRNaWdyYXRpb25zLCBkYlZlcnNpb24sIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZHkoKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvciA9IFwiRGF0YWJhc2Ugbm90IHVwIHRvIGRhdGUuIFwiICsgZGJWZXJzaW9uICsgXCIgZXhwZWN0ZWQgd2FzIFwiICsgbGFzdE1pZ3JhdGlvblBhdGhWZXJzaW9uO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kYlJlcXVlc3Qub25ibG9ja2VkID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcImJsb2NrZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRiUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5kYiA9IGUudGFyZ2V0LnJlc3VsdDsgLy8gQXR0YWNoIHRoZSBjb25uZWN0aW9uIG90IHRoZSBxdWV1ZS5cbiAgICAgICAgICAgIGlmKCF0aGlzLnN1cHBvcnRPblVwZ3JhZGVOZWVkZWQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbnREQlZlcnNpb24gPSAocGFyc2VJbnQodGhpcy5kYi52ZXJzaW9uKSB8fCAgMCk7IC8vIHdlIG5lZWQgY29udmVydCBiZWFjdXNlIGNocm9tZSBzdG9yZSBpbiBpbnRlZ2VyIGFuZCBpZTEwIERQNCsgaW4gaW50O1xuICAgICAgICAgICAgICAgIHZhciBsYXN0TWlncmF0aW9uSW50ID0gKHBhcnNlSW50KGxhc3RNaWdyYXRpb25QYXRoVmVyc2lvbikgfHwgMCk7ICAvLyBBbmQgbWFrZSBzdXJlIHdlIGNvbXBhcmUgbnVtYmVycyB3aXRoIG51bWJlcnMuXG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEludERCVmVyc2lvbiA9PT0gbGFzdE1pZ3JhdGlvbkludCkgeyAvL2lmIHN1cHBvcnQgbmV3IGV2ZW50IG9udXBncmFkZW5lZWRlZCB3aWxsIHRyaWdnZXIgdGhlIHJlYWR5IGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIG1pZ3JhdGlvbiB0byBwZXJmb3JtIVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZHkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRJbnREQlZlcnNpb24gPCBsYXN0TWlncmF0aW9uSW50ICkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIG1pZ3JhdGUgdXAgdG8gdGhlIGN1cnJlbnQgbWlncmF0aW9uIGRlZmluZWQgaW4gdGhlIGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF1bmNoTWlncmF0aW9uUGF0aChjdXJyZW50SW50REJWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBMb29rcyBsaWtlIHRoZSBJbmRleGVkREIgaXMgYXQgYSBoaWdoZXIgdmVyc2lvbiB0aGFuIHRoZSBjdXJyZW50IGRyaXZlciBzY2hlbWEuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBcIkRhdGFiYXNlIHZlcnNpb24gaXMgZ3JlYXRlciB0aGFuIGN1cnJlbnQgY29kZSBcIiArIGN1cnJlbnRJbnREQlZlcnNpb24gKyBcIiBleHBlY3RlZCB3YXMgXCIgKyBsYXN0TWlncmF0aW9uSW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuXG5cbiAgICAgICAgdGhpcy5kYlJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAvLyBGYWlsZWQgdG8gb3BlbiB0aGUgZGF0YWJhc2VcbiAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBcIkNvdWxkbid0IG5vdCBjb25uZWN0IHRvIHRoZSBkYXRhYmFzZVwiXG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLmRiUmVxdWVzdC5vbmFib3J0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIC8vIEZhaWxlZCB0byBvcGVuIHRoZSBkYXRhYmFzZVxuICAgICAgICAgICAgdGhpcy5lcnJvciA9IFwiQ29ubmVjdGlvbiB0byB0aGUgZGF0YWJhc2UgYWJvcnRlZFwiXG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuXG5cbiAgICAgICAgdGhpcy5kYlJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oaURCVmVyc2lvbkNoYW5nZUV2ZW50KXtcbiAgICAgICAgICAgIHRoaXMuZGIgPWlEQlZlcnNpb25DaGFuZ2VFdmVudC50YXJnZXQudHJhbnNhY3Rpb24uZGI7XG5cbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydE9uVXBncmFkZU5lZWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJvbnVwZ3JhZGVuZWVkZWQgPSBcIiArIGlEQlZlcnNpb25DaGFuZ2VFdmVudC5vbGRWZXJzaW9uICsgXCIgPT4gXCIgKyBpREJWZXJzaW9uQ2hhbmdlRXZlbnQubmV3VmVyc2lvbik7XG4gICAgICAgICAgICB0aGlzLmxhdW5jaE1pZ3JhdGlvblBhdGgoaURCVmVyc2lvbkNoYW5nZUV2ZW50Lm9sZFZlcnNpb24pO1xuXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlYnVnTG9nKHN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2Ygd2luZG93LmNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIHdpbmRvdy5jb25zb2xlLmxvZyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgd2luZG93LmNvbnNvbGUubG9nKHN0cik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihjb25zb2xlLmxvZyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coc3RyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRHJpdmVyIFByb3RvdHlwZVxuICAgIERyaXZlci5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLy8gVHJhY2tzIHRyYW5zYWN0aW9ucy4gTW9zdGx5IGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuIFRPLUlNUFJPVkVcbiAgICAgICAgX3RyYWNrX3RyYW5zYWN0aW9uOiBmdW5jdGlvbih0cmFuc2FjdGlvbikge1xuICAgICAgICAgICAgdGhpcy50cmFuc2FjdGlvbnMucHVzaCh0cmFuc2FjdGlvbik7XG4gICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVJdCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdGhpcy50cmFuc2FjdGlvbnMuaW5kZXhPZih0cmFuc2FjdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHt0aGlzLnRyYW5zYWN0aW9ucy5zcGxpY2UoaWR4KTsgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSByZW1vdmVJdC5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25hYm9ydCA9IHJlbW92ZUl0LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gcmVtb3ZlSXQuYmluZCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBQZXJmb3JtcyBhbGwgdGhlIG1pZ3JhdGlvbnMgdG8gcmVhY2ggdGhlIHJpZ2h0IHZlcnNpb24gb2YgdGhlIGRhdGFiYXNlLlxuICAgICAgICBtaWdyYXRlOiBmdW5jdGlvbiAodHJhbnNhY3Rpb24sIG1pZ3JhdGlvbnMsIHZlcnNpb24sIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGJlZ2luIHZlcnNpb24gZnJvbSAjXCIgKyB2ZXJzaW9uKTtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIHZhciBtaWdyYXRpb24gPSBtaWdyYXRpb25zLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobWlncmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2ZXJzaW9uIHx8IHZlcnNpb24gPCBtaWdyYXRpb24udmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGFwcGx5IHRoaXMgbWlncmF0aW9uLVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1pZ3JhdGlvbi5iZWZvcmUgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlncmF0aW9uLmJlZm9yZSA9IGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1pZ3JhdGlvbi5hZnRlciA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaWdyYXRpb24uYWZ0ZXIgPSBmdW5jdGlvbiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gRmlyc3QsIGxldCdzIHJ1biB0aGUgYmVmb3JlIHNjcmlwdFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwibWlncmF0ZSBiZWdpbiBiZWZvcmUgdmVyc2lvbiAjXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIG1pZ3JhdGlvbi5iZWZvcmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgZG9uZSBiZWZvcmUgdmVyc2lvbiAjXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250aW51ZU1pZ3JhdGlvbiA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgYmVnaW4gbWlncmF0ZSB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZ3JhdGlvbi5taWdyYXRlKHRyYW5zYWN0aW9uLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGRvbmUgbWlncmF0ZSB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWlncmF0aW9uIHN1Y2Nlc3NmdWxseSBhcHBsaWVkbiBsZXQncyBnbyB0byB0aGUgbmV4dCBvbmUhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGJlZ2luIGFmdGVyIHZlcnNpb24gI1wiICsgbWlncmF0aW9uLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWdyYXRpb24uYWZ0ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgZG9uZSBhZnRlciB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJNaWdyYXRlZCB0byBcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9sYXN0IG1vZGlmaWNhdGlvbiBvY2N1cnJlZCwgbmVlZCBmaW5pc2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG1pZ3JhdGlvbnMubGVuZ3RoID09MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qaWYodGhpcy5zdXBwb3J0T25VcGdyYWRlTmVlZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdMb2coXCJEb25lIG1pZ3JhdGluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gbW9yZSBtaWdyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2V7Ki9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgc2V0dGluZyB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlIHRvIGZpbmlzaCAgdmVyc2lvbiAjXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGRvbmUgdHJhbnNhY3Rpb24ub25jb21wbGV0ZSB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0Lm5vbG9nKSBkZWJ1Z0xvZyhcIkRvbmUgbWlncmF0aW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gbW9yZSBtaWdyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy99XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgZW5kIGZyb20gdmVyc2lvbiAjXCIgKyB2ZXJzaW9uICsgXCIgdG8gXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubWlncmF0ZSh0cmFuc2FjdGlvbiwgbWlncmF0aW9ucywgdmVyc2lvbiwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZighdGhpcy5zdXBwb3J0T25VcGdyYWRlTmVlZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwibWlncmF0ZSBiZWdpbiBzZXRWZXJzaW9uIHZlcnNpb24gI1wiICsgbWlncmF0aW9uLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2ZXJzaW9uUmVxdWVzdCA9IHRoaXMuZGIuc2V0VmVyc2lvbihtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvblJlcXVlc3Qub25zdWNjZXNzID0gY29udGludWVNaWdyYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvblJlcXVlc3Qub25lcnJvciA9IG9wdGlvbnMuZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZU1pZ3JhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gbmVlZCB0byBhcHBseSB0aGlzIG1pZ3JhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwiU2tpcHBpbmcgbWlncmF0aW9uIFwiICsgbWlncmF0aW9uLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1pZ3JhdGUodHJhbnNhY3Rpb24sIG1pZ3JhdGlvbnMsIHZlcnNpb24sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUaGlzIGlzIHRoZSBtYWluIG1ldGhvZCwgY2FsbGVkIGJ5IHRoZSBFeGVjdXRpb25RdWV1ZSB3aGVuIHRoZSBkcml2ZXIgaXMgcmVhZHkgKGRhdGFiYXNlIG9wZW4gYW5kIG1pZ3JhdGlvbiBwZXJmb3JtZWQpXG4gICAgICAgIGV4ZWN1dGU6IGZ1bmN0aW9uIChzdG9yZU5hbWUsIG1ldGhvZCwgb2JqZWN0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwiZXhlY3V0ZSA6IFwiICsgbWV0aG9kICsgIFwiIG9uIFwiICsgc3RvcmVOYW1lICsgXCIgZm9yIFwiICsgb2JqZWN0LmlkKTtcbiAgICAgICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlIFwiY3JlYXRlXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGUoc3RvcmVOYW1lLCBvYmplY3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInJlYWRcIjpcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LmlkIHx8IG9iamVjdC5jaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTsgLy8gSXQncyBhIG1vZGVsXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5xdWVyeShzdG9yZU5hbWUsIG9iamVjdCwgb3B0aW9ucyk7IC8vIEl0J3MgYSBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTsgLy8gV2UgbWF5IHdhbnQgdG8gY2hlY2sgdGhhdCB0aGlzIGlzIG5vdCBhIGNvbGxlY3Rpb24uIFRPRklYXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5pZCB8fCBvYmplY3QuY2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEh1bSB3aGF0P1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFdyaXRlcyB0aGUganNvbiB0byB0aGUgc3RvcmVOYW1lIGluIGRiLiBJdCBpcyBhIGNyZWF0ZSBvcGVyYXRpb25zLCB3aGljaCBtZWFucyBpdCB3aWxsIGZhaWwgaWYgdGhlIGtleSBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAvLyBvcHRpb25zIGFyZSBqdXN0IHN1Y2Nlc3MgYW5kIGVycm9yIGNhbGxiYWNrcy5cbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAoc3RvcmVOYW1lLCBvYmplY3QsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciB3cml0ZVRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgJ3JlYWR3cml0ZScpO1xuICAgICAgICAgICAgLy90aGlzLl90cmFja190cmFuc2FjdGlvbih3cml0ZVRyYW5zYWN0aW9uKTtcbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHdyaXRlVHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIHZhciBqc29uID0gb2JqZWN0LnRvSlNPTigpO1xuICAgICAgICAgICAgdmFyIHdyaXRlUmVxdWVzdDtcblxuICAgICAgICAgICAgaWYgKGpzb24uaWQgPT09IHVuZGVmaW5lZCAmJiAhc3RvcmUuYXV0b0luY3JlbWVudCkganNvbi5pZCA9IGd1aWQoKTtcblxuICAgICAgICAgICAgd3JpdGVUcmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdyaXRlVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKGpzb24pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCFzdG9yZS5rZXlQYXRoKVxuICAgICAgICAgICAgICAgIHdyaXRlUmVxdWVzdCA9IHN0b3JlLmFkZChqc29uLCBqc29uLmlkKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB3cml0ZVJlcXVlc3QgPSBzdG9yZS5hZGQoanNvbik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gV3JpdGVzIHRoZSBqc29uIHRvIHRoZSBzdG9yZU5hbWUgaW4gZGIuIEl0IGlzIGFuIHVwZGF0ZSBvcGVyYXRpb24sIHdoaWNoIG1lYW5zIGl0IHdpbGwgb3ZlcndyaXRlIHRoZSB2YWx1ZSBpZiB0aGUga2V5IGFscmVhZHkgZXhpc3RcbiAgICAgICAgLy8gb3B0aW9ucyBhcmUganVzdCBzdWNjZXNzIGFuZCBlcnJvciBjYWxsYmFja3MuXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgd3JpdGVUcmFuc2FjdGlvbiA9IHRoaXMuZGIudHJhbnNhY3Rpb24oW3N0b3JlTmFtZV0sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgICAgIC8vdGhpcy5fdHJhY2tfdHJhbnNhY3Rpb24od3JpdGVUcmFuc2FjdGlvbik7XG4gICAgICAgICAgICB2YXIgc3RvcmUgPSB3cml0ZVRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHN0b3JlTmFtZSk7XG4gICAgICAgICAgICB2YXIganNvbiA9IG9iamVjdC50b0pTT04oKTtcbiAgICAgICAgICAgIHZhciB3cml0ZVJlcXVlc3Q7XG5cbiAgICAgICAgICAgIGlmICghanNvbi5pZCkganNvbi5pZCA9IGd1aWQoKTtcblxuICAgICAgICAgICAgaWYgKCFzdG9yZS5rZXlQYXRoKVxuICAgICAgICAgICAgICB3cml0ZVJlcXVlc3QgPSBzdG9yZS5wdXQoanNvbiwganNvbi5pZCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHdyaXRlUmVxdWVzdCA9IHN0b3JlLnB1dChqc29uKTtcblxuICAgICAgICAgICAgd3JpdGVSZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd3JpdGVUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3MoanNvbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFJlYWRzIGZyb20gc3RvcmVOYW1lIGluIGRiIHdpdGgganNvbi5pZCBpZiBpdCdzIHRoZXJlIG9mIHdpdGggYW55IGpzb24ueHh4eCBhcyBsb25nIGFzIHh4eCBpcyBhbiBpbmRleCBpbiBzdG9yZU5hbWVcbiAgICAgICAgcmVhZDogZnVuY3Rpb24gKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgcmVhZFRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgXCJyZWFkb25seVwiKTtcbiAgICAgICAgICAgIHRoaXMuX3RyYWNrX3RyYW5zYWN0aW9uKHJlYWRUcmFuc2FjdGlvbik7XG5cbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHJlYWRUcmFuc2FjdGlvbi5vYmplY3RTdG9yZShzdG9yZU5hbWUpO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBvYmplY3QudG9KU09OKCk7XG5cbiAgICAgICAgICAgIHZhciBnZXRSZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChqc29uLmlkKSB7XG4gICAgICAgICAgICAgICAgZ2V0UmVxdWVzdCA9IHN0b3JlLmdldChqc29uLmlkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihvcHRpb25zLmluZGV4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gc3RvcmUuaW5kZXgob3B0aW9ucy5pbmRleC5uYW1lKTtcbiAgICAgICAgICAgICAgICBnZXRSZXF1ZXN0ID0gaW5kZXguZ2V0KG9wdGlvbnMuaW5kZXgudmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgd2hpY2ggaW5kZXggd2UgaGF2ZVxuICAgICAgICAgICAgICAgIHZhciBjYXJkaW5hbGl0eSA9IDA7IC8vIHRyeSB0byBmaXQgdGhlIGluZGV4IHdpdGggbW9zdCBtYXRjaGVzXG4gICAgICAgICAgICAgICAgXy5lYWNoKHN0b3JlLmluZGV4TmFtZXMsIGZ1bmN0aW9uIChrZXksIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gc3RvcmUuaW5kZXgoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGluZGV4LmtleVBhdGggPT09ICdzdHJpbmcnICYmIDEgPiBjYXJkaW5hbGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2ltcGxlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoanNvbltpbmRleC5rZXlQYXRoXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmVxdWVzdCA9IGluZGV4LmdldChqc29uW2luZGV4LmtleVBhdGhdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih0eXBlb2YgaW5kZXgua2V5UGF0aCA9PT0gJ29iamVjdCcgJiYgaW5kZXgua2V5UGF0aC5sZW5ndGggPiBjYXJkaW5hbGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29tcG91bmQgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5VmFsdWUgPSBfLm1hcChpbmRleC5rZXlQYXRoLCBmdW5jdGlvbihrZXlQYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB2YWxpZCAmJiBqc29uW2tleVBhcnRdICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGpzb25ba2V5UGFydF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmVxdWVzdCA9IGluZGV4LmdldChrZXlWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHkgPSBpbmRleC5rZXlQYXRoLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdldFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICBnZXRSZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihcIk5vdCBGb3VuZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZ2V0UmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwiTm90IEZvdW5kXCIpOyAvLyBXZSBjb3VsZG4ndCBmaW5kIHRoZSByZWNvcmQuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwiTm90IEZvdW5kXCIpOyAvLyBXZSBjb3VsZG4ndCBldmVuIGxvb2sgZm9yIGl0LCBhcyB3ZSBkb24ndCBoYXZlIGVub3VnaCBkYXRhLlxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIERlbGV0ZXMgdGhlIGpzb24uaWQga2V5IGFuZCB2YWx1ZSBpbiBzdG9yZU5hbWUgZnJvbSBkYi5cbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbiAoc3RvcmVOYW1lLCBvYmplY3QsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWxldGVUcmFuc2FjdGlvbiA9IHRoaXMuZGIudHJhbnNhY3Rpb24oW3N0b3JlTmFtZV0sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgICAgIC8vdGhpcy5fdHJhY2tfdHJhbnNhY3Rpb24oZGVsZXRlVHJhbnNhY3Rpb24pO1xuXG4gICAgICAgICAgICB2YXIgc3RvcmUgPSBkZWxldGVUcmFuc2FjdGlvbi5vYmplY3RTdG9yZShzdG9yZU5hbWUpO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBvYmplY3QudG9KU09OKCk7XG5cbiAgICAgICAgICAgIHZhciBkZWxldGVSZXF1ZXN0ID0gc3RvcmUuZGVsZXRlKGpzb24uaWQpO1xuXG4gICAgICAgICAgICBkZWxldGVUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKG51bGwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRlbGV0ZVJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoXCJOb3QgRGVsZXRlZFwiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gQ2xlYXJzIGFsbCByZWNvcmRzIGZvciBzdG9yZU5hbWUgZnJvbSBkYi5cbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uIChzdG9yZU5hbWUsIG9iamVjdCwgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGRlbGV0ZVRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgXCJyZWFkd3JpdGVcIik7XG4gICAgICAgICAgICAvL3RoaXMuX3RyYWNrX3RyYW5zYWN0aW9uKGRlbGV0ZVRyYW5zYWN0aW9uKTtcblxuICAgICAgICAgICAgdmFyIHN0b3JlID0gZGVsZXRlVHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcblxuICAgICAgICAgICAgdmFyIGRlbGV0ZVJlcXVlc3QgPSBzdG9yZS5jbGVhcigpO1xuICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3MobnVsbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihcIk5vdCBDbGVhcmVkXCIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBQZXJmb3JtcyBhIHF1ZXJ5IG9uIHN0b3JlTmFtZSBpbiBkYi5cbiAgICAgICAgLy8gb3B0aW9ucyBtYXkgaW5jbHVkZSA6XG4gICAgICAgIC8vIC0gY29uZGl0aW9ucyA6IHZhbHVlIG9mIGFuIGluZGV4LCBvciByYW5nZSBmb3IgYW4gaW5kZXhcbiAgICAgICAgLy8gLSByYW5nZSA6IHJhbmdlIGZvciB0aGUgcHJpbWFyeSBrZXlcbiAgICAgICAgLy8gLSBsaW1pdCA6IG1heCBudW1iZXIgb2YgZWxlbWVudHMgdG8gYmUgeWllbGRlZFxuICAgICAgICAvLyAtIG9mZnNldCA6IHNraXBwZWQgaXRlbXMuXG4gICAgICAgIHF1ZXJ5OiBmdW5jdGlvbiAoc3RvcmVOYW1lLCBjb2xsZWN0aW9uLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBza2lwcGVkID0gMCwgcHJvY2Vzc2VkID0gMDtcbiAgICAgICAgICAgIHZhciBxdWVyeVRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgXCJyZWFkb25seVwiKTtcbiAgICAgICAgICAgIC8vdGhpcy5fdHJhY2tfdHJhbnNhY3Rpb24ocXVlcnlUcmFuc2FjdGlvbik7XG5cbiAgICAgICAgICAgIHZhciByZWFkQ3Vyc29yID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHF1ZXJ5VHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG51bGwsXG4gICAgICAgICAgICAgICAgbG93ZXIgPSBudWxsLFxuICAgICAgICAgICAgICAgIHVwcGVyID0gbnVsbCxcbiAgICAgICAgICAgICAgICBib3VuZHMgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5jb25kaXRpb25zKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIGNvbmRpdGlvbiwgd2UgbmVlZCB0byB1c2UgaXQgZm9yIHRoZSBjdXJzb3JcbiAgICAgICAgICAgICAgICBfLmVhY2goc3RvcmUuaW5kZXhOYW1lcywgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRDdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gc3RvcmUuaW5kZXgoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmNvbmRpdGlvbnNbaW5kZXgua2V5UGF0aF0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvd2VyID0gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdID4gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdID8gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdIDogb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwcGVyID0gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdID4gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdID8gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdIDogb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IElEQktleVJhbmdlLmJvdW5kKGxvd2VyLCB1cHBlciwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdID4gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvb2tzIGxpa2Ugd2Ugd2FudCB0aGUgREVTQyBvcmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gaW5kZXgub3BlbkN1cnNvcihib3VuZHMsIHdpbmRvdy5JREJDdXJzb3IuUFJFViB8fCBcInByZXZcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2FudCBBU0Mgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZEN1cnNvciA9IGluZGV4Lm9wZW5DdXJzb3IoYm91bmRzLCB3aW5kb3cuSURCQ3Vyc29yLk5FWFQgfHwgXCJuZXh0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IElEQktleVJhbmdlLm9ubHkob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gaW5kZXgub3BlbkN1cnNvcihib3VuZHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIGNvbmRpdGlvbnMsIHVzZSB0aGUgaW5kZXhcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBsb3dlciA9IG9wdGlvbnMucmFuZ2VbMF0gPiBvcHRpb25zLnJhbmdlWzFdID8gb3B0aW9ucy5yYW5nZVsxXSA6IG9wdGlvbnMucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgIHVwcGVyID0gb3B0aW9ucy5yYW5nZVswXSA+IG9wdGlvbnMucmFuZ2VbMV0gPyBvcHRpb25zLnJhbmdlWzBdIDogb3B0aW9ucy5yYW5nZVsxXTtcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gSURCS2V5UmFuZ2UuYm91bmQobG93ZXIsIHVwcGVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucmFuZ2VbMF0gPiBvcHRpb25zLnJhbmdlWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gc3RvcmUub3BlbkN1cnNvcihib3VuZHMsIHdpbmRvdy5JREJDdXJzb3IuUFJFViB8fCBcInByZXZcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gc3RvcmUub3BlbkN1cnNvcihib3VuZHMsIHdpbmRvdy5JREJDdXJzb3IuTkVYVCB8fCBcIm5leHRcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gc3RvcmUub3BlbkN1cnNvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiAocmVhZEN1cnNvcikgPT0gXCJ1bmRlZmluZWRcIiB8fCAhcmVhZEN1cnNvcikge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoXCJObyBDdXJzb3JcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlYWRDdXJzb3Iub25lcnJvciA9IGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwicmVhZEN1cnNvciBlcnJvclwiLCBlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIFNldHVwIGEgaGFuZGxlciBmb3IgdGhlIGN1cnNvcuKAmXMgYHN1Y2Nlc3NgIGV2ZW50OlxuICAgICAgICAgICAgICAgIHJlYWRDdXJzb3Iub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IGUudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFkZEluZGl2aWR1YWxseSB8fCBvcHRpb25zLmNsZWFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm90aGluZyFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGluZGljYXRlIHRoYXQgd2UncmUgZG9uZS4gQnV0LCBob3c/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbi50cmlnZ2VyKFwicmVzZXRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyhlbGVtZW50cyk7IC8vIFdlJ3JlIGRvbmUuIE5vIG1vcmUgZWxlbWVudHMuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDdXJzb3IgaXMgbm90IG92ZXIgeWV0LlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMubGltaXQgJiYgcHJvY2Vzc2VkID49IG9wdGlvbnMubGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBZZXQsIHdlIGhhdmUgcHJvY2Vzc2VkIGVub3VnaCBlbGVtZW50cy4gU28sIGxldCdzIGp1c3Qgc2tpcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYm91bmRzICYmIG9wdGlvbnMuY29uZGl0aW9uc1tpbmRleC5rZXlQYXRoXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdICsgMSk7IC8qIFdlIG5lZWQgdG8gJ3Rlcm1pbmF0ZScgdGhlIGN1cnNvciBjbGVhbnksIGJ5IG1vdmluZyB0byB0aGUgZW5kICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7IC8qIFdlIG5lZWQgdG8gJ3Rlcm1pbmF0ZScgdGhlIGN1cnNvciBjbGVhbnksIGJ5IG1vdmluZyB0byB0aGUgZW5kICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAob3B0aW9ucy5vZmZzZXQgJiYgb3B0aW9ucy5vZmZzZXQgPiBza2lwcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpOyAvKiBXZSBuZWVkIHRvIE1vdmluZyB0aGUgY3Vyc29yIGZvcndhcmQgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyB0aW1lLCBpdCBsb29rcyBsaWtlIGl0J3MgZ29vZCFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hZGRJbmRpdmlkdWFsbHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbi5hZGQoY3Vyc29yLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY2xlYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGV0ZVJlcXVlc3QgPSBzdG9yZS5kZWxldGUoY3Vyc29yLnZhbHVlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goY3Vyc29yLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGN1cnNvci52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGN1cnNvci52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2UgOmZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZih0aGlzLmRiKXtcbiAgICAgICAgICAgICAgICB0aGlzLmRiLmNsb3NlKClcbjsgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gRXhlY3V0aW9uUXVldWUgb2JqZWN0XG4gICAgLy8gVGhlIGV4ZWN1dGlvbiBxdWV1ZSBpcyBhbiBhYnN0cmFjdGlvbiB0byBidWZmZXIgdXAgcmVxdWVzdHMgdG8gdGhlIGRhdGFiYXNlLlxuICAgIC8vIEl0IGhvbGRzIGEgXCJkcml2ZXJcIi4gV2hlbiB0aGUgZHJpdmVyIGlzIHJlYWR5LCBpdCBqdXN0IGZpcmVzIHVwIHRoZSBxdWV1ZSBhbmQgZXhlY3V0ZXMgaW4gc3luYy5cbiAgICBmdW5jdGlvbiBFeGVjdXRpb25RdWV1ZShzY2hlbWEsbmV4dCxub2xvZykge1xuICAgICAgICB0aGlzLmRyaXZlciAgICAgPSBuZXcgRHJpdmVyKHNjaGVtYSwgdGhpcy5yZWFkeS5iaW5kKHRoaXMpLCBub2xvZyk7XG4gICAgICAgIHRoaXMuc3RhcnRlZCAgICA9IGZhbHNlO1xuICAgICAgICB0aGlzLnN0YWNrICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy52ZXJzaW9uICAgID0gXy5sYXN0KHNjaGVtYS5taWdyYXRpb25zKS52ZXJzaW9uO1xuICAgICAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIH1cblxuICAgIC8vIEV4ZWN1dGlvblF1ZXVlIFByb3RvdHlwZVxuICAgIEV4ZWN1dGlvblF1ZXVlLnByb3RvdHlwZSA9IHtcbiAgICAgICAgLy8gQ2FsbGVkIHdoZW4gdGhlIGRyaXZlciBpcyByZWFkeVxuICAgICAgICAvLyBJdCBqdXN0IGxvb3BzIG92ZXIgdGhlIGVsZW1lbnRzIGluIHRoZSBxdWV1ZSBhbmQgZXhlY3V0ZXMgdGhlbS5cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICBfLmVhY2godGhpcy5zdGFjaywgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGUobWVzc2FnZSk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5zdGFjayA9IFtdOyAgICAvLyBmaXggbWVtb3J5IGxlYWtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEV4ZWN1dGVzIGEgZ2l2ZW4gY29tbWFuZCBvbiB0aGUgZHJpdmVyLiBJZiBub3Qgc3RhcnRlZCwganVzdCBzdGFja3MgdXAgb25lIG1vcmUgZWxlbWVudC5cbiAgICAgICAgZXhlY3V0ZTogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRyaXZlci5leGVjdXRlKG1lc3NhZ2VbMl0uc3RvcmVOYW1lIHx8IG1lc3NhZ2VbMV0uc3RvcmVOYW1lLCBtZXNzYWdlWzBdLCBtZXNzYWdlWzFdLCBtZXNzYWdlWzJdKTsgLy8gVXBvbiBtZXNzYWdlcywgd2UgZXhlY3V0ZSB0aGUgcXVlcnlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNsb3NlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuZHJpdmVyLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gTWV0aG9kIHVzZWQgYnkgQmFja2JvbmUgZm9yIHN5bmMgb2YgZGF0YSB3aXRoIGRhdGEgc3RvcmUuIEl0IHdhcyBpbml0aWFsbHkgZGVzaWduZWQgdG8gd29yayB3aXRoIFwic2VydmVyIHNpZGVcIiBBUElzLCBUaGlzIHdyYXBwZXIgbWFrZXNcbiAgICAvLyBpdCB3b3JrIHdpdGggdGhlIGxvY2FsIGluZGV4ZWREQiBzdHVmZi4gSXQgdXNlcyB0aGUgc2NoZW1hIGF0dHJpYnV0ZSBwcm92aWRlZCBieSB0aGUgb2JqZWN0LlxuICAgIC8vIFRoZSB3cmFwcGVyIGtlZXBzIGFuIGFjdGl2ZSBFeGVjdXR1b24gUXVldWUgZm9yIGVhY2ggXCJzY2hlbWFcIiwgYW5kIGV4ZWN1dGVzIHF1ZXJ1ZXMgYWdhaW5zIGl0LCBiYXNlZCBvbiB0aGUgb2JqZWN0IHR5cGUgKGNvbGxlY3Rpb24gb3JcbiAgICAvLyBzaW5nbGUgbW9kZWwpLCBidXQgYWxzbyB0aGUgbWV0aG9kLi4uIGV0Yy5cbiAgICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgY29ubmVjdGlvbnNcbiAgICB2YXIgRGF0YWJhc2VzID0ge307XG5cbiAgICBmdW5jdGlvbiBzeW5jKG1ldGhvZCwgb2JqZWN0LCBvcHRpb25zKSB7XG5cbiAgICAgICAgaWYobWV0aG9kPT1cImNsb3NlYWxsXCIpe1xuICAgICAgICAgICAgXy5lYWNoKERhdGFiYXNlcyxmdW5jdGlvbihkYXRhYmFzZSl7XG4gICAgICAgICAgICAgICAgZGF0YWJhc2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYWN0aXZlIGRhdGFiYXNlcyBvYmplY3QuXG4gICAgICAgICAgICBEYXRhYmFzZXMgPSB7fVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgYSBtb2RlbCBvciBhIGNvbGxlY3Rpb24gZG9lcyBub3QgZGVmaW5lIGEgZGF0YWJhc2UsIGZhbGwgYmFjayBvbiBhamF4U3luY1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5kYXRhYmFzZSA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEJhY2tib25lLmFqYXhTeW5jID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5hamF4U3luYyhtZXRob2QsIG9iamVjdCwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2NoZW1hID0gb2JqZWN0LmRhdGFiYXNlO1xuICAgICAgICBpZiAoRGF0YWJhc2VzW3NjaGVtYS5pZF0pIHtcbiAgICAgICAgICAgIGlmKERhdGFiYXNlc1tzY2hlbWEuaWRdLnZlcnNpb24gIT0gXy5sYXN0KHNjaGVtYS5taWdyYXRpb25zKS52ZXJzaW9uKXtcbiAgICAgICAgICAgICAgICBEYXRhYmFzZXNbc2NoZW1hLmlkXS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBEYXRhYmFzZXNbc2NoZW1hLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9taXNlO1xuXG4gICAgICAgIGlmICh0eXBlb2YgQmFja2JvbmUuJCA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIEJhY2tib25lLiQuRGVmZXJyZWQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgICAgICB2YXIgcmVzb2x2ZSA9IG5vb3A7XG4gICAgICAgICAgICB2YXIgcmVqZWN0ID0gbm9vcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkZmQgPSBCYWNrYm9uZS4kLkRlZmVycmVkKCk7XG4gICAgICAgICAgICB2YXIgcmVzb2x2ZSA9IGRmZC5yZXNvbHZlO1xuICAgICAgICAgICAgdmFyIHJlamVjdCA9IGRmZC5yZWplY3Q7XG5cbiAgICAgICAgICAgIHByb21pc2UgPSBkZmQucHJvbWlzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gICAgICAgIG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzKSBzdWNjZXNzKHJlc3ApO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgb2JqZWN0LnRyaWdnZXIoJ3N5bmMnLCBvYmplY3QsIHJlc3AsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBlcnJvciA9IG9wdGlvbnMuZXJyb3I7XG4gICAgICAgIG9wdGlvbnMuZXJyb3IgPSBmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIGVycm9yKHJlc3ApO1xuICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICBvYmplY3QudHJpZ2dlcignZXJyb3InLCBvYmplY3QsIHJlc3AsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIERhdGFiYXNlc1tzY2hlbWEuaWRdLmV4ZWN1dGUoW21ldGhvZCwgb2JqZWN0LCBvcHRpb25zXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCFEYXRhYmFzZXNbc2NoZW1hLmlkXSkge1xuICAgICAgICAgICAgICBEYXRhYmFzZXNbc2NoZW1hLmlkXSA9IG5ldyBFeGVjdXRpb25RdWV1ZShzY2hlbWEsbmV4dCxzY2hlbWEubm9sb2cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cblxuICAgIEJhY2tib25lLmFqYXhTeW5jID0gQmFja2JvbmUuc3luYztcbiAgICBCYWNrYm9uZS5zeW5jID0gc3luYztcblxuICAgIC8vd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ1bmxvYWRcIixmdW5jdGlvbigpe0JhY2tib25lLnN5bmMoXCJjbG9zZWFsbFwiKX0pXG59KSgpO1xuOyBicm93c2VyaWZ5X3NoaW1fX2RlZmluZV9fbW9kdWxlX19leHBvcnRfXyh0eXBlb2YgYmFja2JvbmVfaW5kZXhlZGRiICE9IFwidW5kZWZpbmVkXCIgPyBiYWNrYm9uZV9pbmRleGVkZGIgOiB3aW5kb3cuYmFja2JvbmVfaW5kZXhlZGRiKTtcblxufSkuY2FsbChnbG9iYWwsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGZ1bmN0aW9uIGRlZmluZUV4cG9ydChleCkgeyBtb2R1bGUuZXhwb3J0cyA9IGV4OyB9KTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24gYnJvd3NlcmlmeVNoaW0obW9kdWxlLCBleHBvcnRzLCBkZWZpbmUsIGJyb3dzZXJpZnlfc2hpbV9fZGVmaW5lX19tb2R1bGVfX2V4cG9ydF9fKSB7XG4vKlxuICogalF1ZXJ5IFBpbmVzIE5vdGlmeSAocG5vdGlmeSkgUGx1Z2luIDEuMi4wXG4gKlxuICogaHR0cDovL3BpbmVzZnJhbWV3b3JrLm9yZy9wbm90aWZ5L1xuICogQ29weXJpZ2h0IChjKSAyMDA5LTIwMTIgSHVudGVyIFBlcnJpblxuICpcbiAqIFRyaXBsZSBsaWNlbnNlIHVuZGVyIHRoZSBHUEwsIExHUEwsIGFuZCBNUEw6XG4gKlx0ICBodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvZ3BsLmh0bWxcbiAqXHQgIGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy9sZ3BsLmh0bWxcbiAqXHQgIGh0dHA6Ly93d3cubW96aWxsYS5vcmcvTVBML01QTC0xLjEuaHRtbFxuICovXG5cbnZhciBqUXVlcnkgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuKGZ1bmN0aW9uKCQpIHtcblxuXG5cdHZhciBoaXN0b3J5X2hhbmRsZV90b3AsXG5cdFx0dGltZXIsXG5cdFx0Ym9keSxcblx0XHRqd2luZG93ID0gJCh3aW5kb3cpLFxuXHRcdHN0eWxpbmcgPSB7XG5cdFx0XHRqcXVlcnl1aToge1xuXHRcdFx0XHRjb250YWluZXI6IFwidWktd2lkZ2V0IHVpLXdpZGdldC1jb250ZW50IHVpLWNvcm5lci1hbGxcIixcblx0XHRcdFx0bm90aWNlOiBcInVpLXN0YXRlLWhpZ2hsaWdodFwiLFxuXHRcdFx0XHQvLyAoVGhlIGFjdHVhbCBqUVVJIG5vdGljZSBpY29uIGxvb2tzIHRlcnJpYmxlLilcblx0XHRcdFx0bm90aWNlX2ljb246IFwidWktaWNvbiB1aS1pY29uLWluZm9cIixcblx0XHRcdFx0aW5mbzogXCJcIixcblx0XHRcdFx0aW5mb19pY29uOiBcInVpLWljb24gdWktaWNvbi1pbmZvXCIsXG5cdFx0XHRcdHN1Y2Nlc3M6IFwidWktc3RhdGUtZGVmYXVsdFwiLFxuXHRcdFx0XHRzdWNjZXNzX2ljb246IFwidWktaWNvbiB1aS1pY29uLWNpcmNsZS1jaGVja1wiLFxuXHRcdFx0XHRlcnJvcjogXCJ1aS1zdGF0ZS1lcnJvclwiLFxuXHRcdFx0XHRlcnJvcl9pY29uOiBcInVpLWljb24gdWktaWNvbi1hbGVydFwiLFxuXHRcdFx0XHRjbG9zZXI6IFwidWktaWNvbiB1aS1pY29uLWNsb3NlXCIsXG5cdFx0XHRcdHBpbl91cDogXCJ1aS1pY29uIHVpLWljb24tcGluLXdcIixcblx0XHRcdFx0cGluX2Rvd246IFwidWktaWNvbiB1aS1pY29uLXBpbi1zXCIsXG5cdFx0XHRcdGhpX21lbnU6IFwidWktc3RhdGUtZGVmYXVsdCB1aS1jb3JuZXItYm90dG9tXCIsXG5cdFx0XHRcdGhpX2J0bjogXCJ1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGxcIixcblx0XHRcdFx0aGlfYnRuaG92OiBcInVpLXN0YXRlLWhvdmVyXCIsXG5cdFx0XHRcdGhpX2huZDogXCJ1aS1pY29uIHVpLWljb24tZ3JpcC1kb3R0ZWQtaG9yaXpvbnRhbFwiXG5cdFx0XHR9LFxuXHRcdFx0Ym9vdHN0cmFwOiB7XG5cdFx0XHRcdGNvbnRhaW5lcjogXCJhbGVydFwiLFxuXHRcdFx0XHRub3RpY2U6IFwiXCIsXG5cdFx0XHRcdG5vdGljZV9pY29uOiBcImZhIGZhLWV4Y2xhbWF0aW9uXCIsXG5cdFx0XHRcdGluZm86IFwiYWxlcnQtaW5mb1wiLFxuXHRcdFx0XHRpbmZvX2ljb246IFwiZmEgZmEtaW5mby1jaXJjbGVcIixcblx0XHRcdFx0c3VjY2VzczogXCJhbGVydC1zdWNjZXNzXCIsXG5cdFx0XHRcdHN1Y2Nlc3NfaWNvbjogXCJmYSBmYS10aHVtYnMtby11cFwiLFxuXHRcdFx0XHRlcnJvcjogXCJhbGVydC1kYW5nZXJcIixcblx0XHRcdFx0ZXJyb3JfaWNvbjogXCJmYSBmYS1leGNsYW1hdGlvbi10cmlhbmdsZVwiLFxuXHRcdFx0XHRjbG9zZXI6IFwiZmEgZmEtdGltZXNcIixcblx0XHRcdFx0cGluX3VwOiBcImZhIGZhLXBhdXNlXCIsXG5cdFx0XHRcdHBpbl9kb3duOiBcImZhIGZhLXBsYXlcIixcblx0XHRcdFx0aGlfbWVudTogXCJ3ZWxsXCIsXG5cdFx0XHRcdGhpX2J0bjogXCJidG5cIixcblx0XHRcdFx0aGlfYnRuaG92OiBcIlwiLFxuXHRcdFx0XHRoaV9obmQ6IFwiZmEgZmEtY2hldnJvbi1kb3duXCJcblx0XHRcdH1cblx0XHR9O1xuXHQvLyBTZXQgZ2xvYmFsIHZhcmlhYmxlcy5cblx0dmFyIGRvX3doZW5fcmVhZHkgPSBmdW5jdGlvbigpe1xuXHRcdGJvZHkgPSAkKFwiYm9keVwiKTtcblx0XHRqd2luZG93ID0gJCh3aW5kb3cpO1xuXHRcdC8vIFJlcG9zaXRpb24gdGhlIG5vdGljZXMgd2hlbiB0aGUgd2luZG93IHJlc2l6ZXMuXG5cdFx0andpbmRvdy5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKHRpbWVyKVxuXHRcdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCQucG5vdGlmeV9wb3NpdGlvbl9hbGwsIDEwKTtcblx0XHR9KTtcblx0fTtcblx0aWYgKGRvY3VtZW50LmJvZHkpXG5cdFx0ZG9fd2hlbl9yZWFkeSgpO1xuXHRlbHNlXG5cdFx0JChkb193aGVuX3JlYWR5KTtcblx0JC5leHRlbmQoe1xuXHRcdHBub3RpZnlfcmVtb3ZlX2FsbDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIG5vdGljZXNfZGF0YSA9IGp3aW5kb3cuZGF0YShcInBub3RpZnlcIik7XG5cdFx0XHQvKiBQT0E6IEFkZGVkIG51bGwtY2hlY2sgKi9cblx0XHRcdGlmIChub3RpY2VzX2RhdGEgJiYgbm90aWNlc19kYXRhLmxlbmd0aCkge1xuXHRcdFx0XHQkLmVhY2gobm90aWNlc19kYXRhLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGlmICh0aGlzLnBub3RpZnlfcmVtb3ZlKVxuXHRcdFx0XHRcdFx0dGhpcy5wbm90aWZ5X3JlbW92ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHBub3RpZnlfcG9zaXRpb25fYWxsOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBUaGlzIHRpbWVyIGlzIHVzZWQgZm9yIHF1ZXVlaW5nIHRoaXMgZnVuY3Rpb24gc28gaXQgZG9lc24ndCBydW5cblx0XHRcdC8vIHJlcGVhdGVkbHkuXG5cdFx0XHRpZiAodGltZXIpXG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdFx0XHR0aW1lciA9IG51bGw7XG5cdFx0XHQvLyBHZXQgYWxsIHRoZSBub3RpY2VzLlxuXHRcdFx0dmFyIG5vdGljZXNfZGF0YSA9IGp3aW5kb3cuZGF0YShcInBub3RpZnlcIik7XG5cdFx0XHRpZiAoIW5vdGljZXNfZGF0YSB8fCAhbm90aWNlc19kYXRhLmxlbmd0aClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Ly8gUmVzZXQgdGhlIG5leHQgcG9zaXRpb24gZGF0YS5cblx0XHRcdCQuZWFjaChub3RpY2VzX2RhdGEsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBzID0gdGhpcy5vcHRzLnN0YWNrO1xuXHRcdFx0XHRpZiAoIXMpIHJldHVybjtcblx0XHRcdFx0cy5uZXh0cG9zMSA9IHMuZmlyc3Rwb3MxO1xuXHRcdFx0XHRzLm5leHRwb3MyID0gcy5maXJzdHBvczI7XG5cdFx0XHRcdHMuYWRkcG9zMiA9IDA7XG5cdFx0XHRcdHMuYW5pbWF0aW9uID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdFx0JC5lYWNoKG5vdGljZXNfZGF0YSwgZnVuY3Rpb24oKXtcblx0XHRcdFx0dGhpcy5wbm90aWZ5X3Bvc2l0aW9uKCk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHBub3RpZnk6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRcdC8vIFN0b3JlcyB3aGF0IGlzIGN1cnJlbnRseSBiZWluZyBhbmltYXRlZCAoaW4gb3Igb3V0KS5cblx0XHRcdHZhciBhbmltYXRpbmc7XG5cblx0XHRcdC8vIEJ1aWxkIG1haW4gb3B0aW9ucy5cblx0XHRcdHZhciBvcHRzO1xuXHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zICE9IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHt9LCAkLnBub3RpZnkuZGVmYXVsdHMpO1xuXHRcdFx0XHRvcHRzLnRleHQgPSBvcHRpb25zO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHt9LCAkLnBub3RpZnkuZGVmYXVsdHMsIG9wdGlvbnMpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gVHJhbnNsYXRlIG9sZCBwbm90aWZ5XyBzdHlsZSBvcHRpb25zLlxuXHRcdFx0Zm9yICh2YXIgaSBpbiBvcHRzKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgaSA9PSBcInN0cmluZ1wiICYmIGkubWF0Y2goL15wbm90aWZ5Xy8pKVxuXHRcdFx0XHRcdG9wdHNbaS5yZXBsYWNlKC9ecG5vdGlmeV8vLCBcIlwiKV0gPSBvcHRzW2ldO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob3B0cy5iZWZvcmVfaW5pdCkge1xuXHRcdFx0XHRpZiAob3B0cy5iZWZvcmVfaW5pdChvcHRzKSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRoaXMga2VlcHMgdHJhY2sgb2YgdGhlIGxhc3QgZWxlbWVudCB0aGUgbW91c2Ugd2FzIG92ZXIsIHNvXG5cdFx0XHQvLyBtb3VzZWxlYXZlLCBtb3VzZWVudGVyLCBldGMgY2FuIGJlIGNhbGxlZC5cblx0XHRcdHZhciBub25ibG9ja19sYXN0X2VsZW07XG5cdFx0XHQvLyBUaGlzIGlzIHVzZWQgdG8gcGFzcyBldmVudHMgdGhyb3VnaCB0aGUgbm90aWNlIGlmIGl0IGlzIG5vbi1ibG9ja2luZy5cblx0XHRcdHZhciBub25ibG9ja19wYXNzID0gZnVuY3Rpb24oZSwgZV9uYW1lKXtcblx0XHRcdFx0cG5vdGlmeS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblx0XHRcdFx0dmFyIGVsZW1lbnRfYmVsb3cgPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcblx0XHRcdFx0cG5vdGlmeS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG5cdFx0XHRcdHZhciBqZWxlbWVudF9iZWxvdyA9ICQoZWxlbWVudF9iZWxvdyk7XG5cdFx0XHRcdHZhciBjdXJzb3Jfc3R5bGUgPSBqZWxlbWVudF9iZWxvdy5jc3MoXCJjdXJzb3JcIik7XG5cdFx0XHRcdHBub3RpZnkuY3NzKFwiY3Vyc29yXCIsIGN1cnNvcl9zdHlsZSAhPSBcImF1dG9cIiA/IGN1cnNvcl9zdHlsZSA6IFwiZGVmYXVsdFwiKTtcblx0XHRcdFx0Ly8gSWYgdGhlIGVsZW1lbnQgY2hhbmdlZCwgY2FsbCBtb3VzZWVudGVyLCBtb3VzZWxlYXZlLCBldGMuXG5cdFx0XHRcdGlmICghbm9uYmxvY2tfbGFzdF9lbGVtIHx8IG5vbmJsb2NrX2xhc3RfZWxlbS5nZXQoMCkgIT0gZWxlbWVudF9iZWxvdykge1xuXHRcdFx0XHRcdGlmIChub25ibG9ja19sYXN0X2VsZW0pIHtcblx0XHRcdFx0XHRcdGRvbV9ldmVudC5jYWxsKG5vbmJsb2NrX2xhc3RfZWxlbS5nZXQoMCksIFwibW91c2VsZWF2ZVwiLCBlLm9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHRcdFx0ZG9tX2V2ZW50LmNhbGwobm9uYmxvY2tfbGFzdF9lbGVtLmdldCgwKSwgXCJtb3VzZW91dFwiLCBlLm9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkb21fZXZlbnQuY2FsbChlbGVtZW50X2JlbG93LCBcIm1vdXNlZW50ZXJcIiwgZS5vcmlnaW5hbEV2ZW50KTtcblx0XHRcdFx0XHRkb21fZXZlbnQuY2FsbChlbGVtZW50X2JlbG93LCBcIm1vdXNlb3ZlclwiLCBlLm9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvbV9ldmVudC5jYWxsKGVsZW1lbnRfYmVsb3csIGVfbmFtZSwgZS5vcmlnaW5hbEV2ZW50KTtcblx0XHRcdFx0Ly8gUmVtZW1iZXIgdGhlIGxhdGVzdCBlbGVtZW50IHRoZSBtb3VzZSB3YXMgb3Zlci5cblx0XHRcdFx0bm9uYmxvY2tfbGFzdF9lbGVtID0gamVsZW1lbnRfYmVsb3c7XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBHZXQgb3VyIHN0eWxpbmcgb2JqZWN0LlxuXHRcdFx0dmFyIHN0eWxlcyA9IHN0eWxpbmdbb3B0cy5zdHlsaW5nXTtcblxuXHRcdFx0Ly8gQ3JlYXRlIG91ciB3aWRnZXQuXG5cdFx0XHQvLyBTdG9wIGFuaW1hdGlvbiwgcmVzZXQgdGhlIHJlbW92YWwgdGltZXIsIGFuZCBzaG93IHRoZSBjbG9zZVxuXHRcdFx0Ly8gYnV0dG9uIHdoZW4gdGhlIHVzZXIgbW91c2VzIG92ZXIuXG5cdFx0XHR2YXIgcG5vdGlmeSA9ICQoXCI8ZGl2IC8+XCIsIHtcblx0XHRcdFx0XCJjbGFzc1wiOiBcInVpLXBub3RpZnkgXCIrb3B0cy5hZGRjbGFzcyxcblx0XHRcdFx0XCJjc3NcIjoge1wiZGlzcGxheVwiOiBcIm5vbmVcIn0sXG5cdFx0XHRcdFwibW91c2VlbnRlclwiOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAob3B0cy5ub25ibG9jaykgZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRpZiAob3B0cy5tb3VzZV9yZXNldCAmJiBhbmltYXRpbmcgPT0gXCJvdXRcIikge1xuXHRcdFx0XHRcdFx0Ly8gSWYgaXQncyBhbmltYXRpbmcgb3V0LCBhbmltYXRlIGJhY2sgaW4gcmVhbGx5IHF1aWNrbHkuXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnN0b3AodHJ1ZSk7XG5cdFx0XHRcdFx0XHRhbmltYXRpbmcgPSBcImluXCI7XG5cdFx0XHRcdFx0XHRwbm90aWZ5LmNzcyhcImhlaWdodFwiLCBcImF1dG9cIikuYW5pbWF0ZSh7XCJ3aWR0aFwiOiBvcHRzLndpZHRoLCBcIm9wYWNpdHlcIjogb3B0cy5ub25ibG9jayA/IG9wdHMubm9uYmxvY2tfb3BhY2l0eSA6IG9wdHMub3BhY2l0eX0sIFwiZmFzdFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIHtcblx0XHRcdFx0XHRcdC8vIElmIGl0J3Mgbm9uLWJsb2NraW5nLCBhbmltYXRlIHRvIHRoZSBvdGhlciBvcGFjaXR5LlxuXHRcdFx0XHRcdFx0cG5vdGlmeS5hbmltYXRlKHtcIm9wYWNpdHlcIjogb3B0cy5ub25ibG9ja19vcGFjaXR5fSwgXCJmYXN0XCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBTdG9wIHRoZSBjbG9zZSB0aW1lci5cblx0XHRcdFx0XHRpZiAob3B0cy5oaWRlICYmIG9wdHMubW91c2VfcmVzZXQpIHBub3RpZnkucG5vdGlmeV9jYW5jZWxfcmVtb3ZlKCk7XG5cdFx0XHRcdFx0Ly8gU2hvdyB0aGUgYnV0dG9ucy5cblx0XHRcdFx0XHRpZiAob3B0cy5zdGlja2VyICYmICFvcHRzLm5vbmJsb2NrKSBwbm90aWZ5LnN0aWNrZXIudHJpZ2dlcihcInBub3RpZnlfaWNvblwiKS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcblx0XHRcdFx0XHRpZiAob3B0cy5jbG9zZXIgJiYgIW9wdHMubm9uYmxvY2spIHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRcIm1vdXNlbGVhdmVcIjogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0bm9uYmxvY2tfbGFzdF9lbGVtID0gbnVsbDtcblx0XHRcdFx0XHRwbm90aWZ5LmNzcyhcImN1cnNvclwiLCBcImF1dG9cIik7XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBiYWNrIHRvIHRoZSBub3JtYWwgb3BhY2l0eS5cblx0XHRcdFx0XHRpZiAob3B0cy5ub25ibG9jayAmJiBhbmltYXRpbmcgIT0gXCJvdXRcIilcblx0XHRcdFx0XHRcdHBub3RpZnkuYW5pbWF0ZSh7XCJvcGFjaXR5XCI6IG9wdHMub3BhY2l0eX0sIFwiZmFzdFwiKTtcblx0XHRcdFx0XHQvLyBTdGFydCB0aGUgY2xvc2UgdGltZXIuXG5cdFx0XHRcdFx0aWYgKG9wdHMuaGlkZSAmJiBvcHRzLm1vdXNlX3Jlc2V0KSBwbm90aWZ5LnBub3RpZnlfcXVldWVfcmVtb3ZlKCk7XG5cdFx0XHRcdFx0Ly8gSGlkZSB0aGUgYnV0dG9ucy5cblx0XHRcdFx0XHRpZiAob3B0cy5zdGlja2VyX2hvdmVyKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5zdGlja2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdFx0aWYgKG9wdHMuY2xvc2VyX2hvdmVyKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5jbG9zZXIuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHRcdFx0XHQkLnBub3RpZnlfcG9zaXRpb25fYWxsKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibW91c2VvdmVyXCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRcIm1vdXNlb3V0XCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRcIm1vdXNlbW92ZVwiOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAob3B0cy5ub25ibG9jaykge1xuXHRcdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRcdG5vbmJsb2NrX3Bhc3MoZSwgXCJvbm1vdXNlbW92ZVwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibW91c2Vkb3duXCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSB7XG5cdFx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0bm9uYmxvY2tfcGFzcyhlLCBcIm9ubW91c2Vkb3duXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0XCJtb3VzZXVwXCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSB7XG5cdFx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0bm9uYmxvY2tfcGFzcyhlLCBcIm9ubW91c2V1cFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiY2xpY2tcIjogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIHtcblx0XHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHRub25ibG9ja19wYXNzKGUsIFwib25jbGlja1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZGJsY2xpY2tcIjogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIHtcblx0XHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHRub25ibG9ja19wYXNzKGUsIFwib25kYmxjbGlja1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cG5vdGlmeS5vcHRzID0gb3B0cztcblx0XHRcdC8vIENyZWF0ZSBhIGNvbnRhaW5lciBmb3IgdGhlIG5vdGljZSBjb250ZW50cy5cblx0XHRcdHBub3RpZnkuY29udGFpbmVyID0gJChcIjxkaXYgLz5cIiwge1wiY2xhc3NcIjogc3R5bGVzLmNvbnRhaW5lcitcIiB1aS1wbm90aWZ5LWNvbnRhaW5lciBcIisob3B0cy50eXBlID09IFwiZXJyb3JcIiA/IHN0eWxlcy5lcnJvciA6IChvcHRzLnR5cGUgPT0gXCJpbmZvXCIgPyBzdHlsZXMuaW5mbyA6IChvcHRzLnR5cGUgPT0gXCJzdWNjZXNzXCIgPyBzdHlsZXMuc3VjY2VzcyA6IHN0eWxlcy5ub3RpY2UpKSl9KVxuXHRcdFx0LmFwcGVuZFRvKHBub3RpZnkpO1xuXHRcdFx0aWYgKG9wdHMuY29ybmVyY2xhc3MgIT0gXCJcIilcblx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJ1aS1jb3JuZXItYWxsXCIpLmFkZENsYXNzKG9wdHMuY29ybmVyY2xhc3MpO1xuXHRcdFx0Ly8gQ3JlYXRlIGEgZHJvcCBzaGFkb3cuXG5cdFx0XHRpZiAob3B0cy5zaGFkb3cpXG5cdFx0XHRcdHBub3RpZnkuY29udGFpbmVyLmFkZENsYXNzKFwidWktcG5vdGlmeS1zaGFkb3dcIik7XG5cblx0XHRcdC8vIFRoZSBjdXJyZW50IHZlcnNpb24gb2YgUGluZXMgTm90aWZ5LlxuXHRcdFx0cG5vdGlmeS5wbm90aWZ5X3ZlcnNpb24gPSBcIjEuMi4wXCI7XG5cblx0XHRcdC8vIFRoaXMgZnVuY3Rpb24gaXMgZm9yIHVwZGF0aW5nIHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnkgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgbm90aWNlLlxuXHRcdFx0XHR2YXIgb2xkX29wdHMgPSBvcHRzO1xuXHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMgPT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRvcHRzLnRleHQgPSBvcHRpb25zO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHt9LCBvcHRzLCBvcHRpb25zKTtcblx0XHRcdFx0Ly8gVHJhbnNsYXRlIG9sZCBwbm90aWZ5XyBzdHlsZSBvcHRpb25zLlxuXHRcdFx0XHRmb3IgKHZhciBpIGluIG9wdHMpIHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGkgPT0gXCJzdHJpbmdcIiAmJiBpLm1hdGNoKC9ecG5vdGlmeV8vKSlcblx0XHRcdFx0XHRcdG9wdHNbaS5yZXBsYWNlKC9ecG5vdGlmeV8vLCBcIlwiKV0gPSBvcHRzW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBub3RpZnkub3B0cyA9IG9wdHM7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgY29ybmVyIGNsYXNzLlxuXHRcdFx0XHRpZiAob3B0cy5jb3JuZXJjbGFzcyAhPSBvbGRfb3B0cy5jb3JuZXJjbGFzcylcblx0XHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcInVpLWNvcm5lci1hbGxcIikuYWRkQ2xhc3Mob3B0cy5jb3JuZXJjbGFzcyk7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc2hhZG93LlxuXHRcdFx0XHRpZiAob3B0cy5zaGFkb3cgIT0gb2xkX29wdHMuc2hhZG93KSB7XG5cdFx0XHRcdFx0aWYgKG9wdHMuc2hhZG93KVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIuYWRkQ2xhc3MoXCJ1aS1wbm90aWZ5LXNoYWRvd1wiKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcInVpLXBub3RpZnktc2hhZG93XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgYWRkaXRpb25hbCBjbGFzc2VzLlxuXHRcdFx0XHRpZiAob3B0cy5hZGRjbGFzcyA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0cG5vdGlmeS5yZW1vdmVDbGFzcyhvbGRfb3B0cy5hZGRjbGFzcyk7XG5cdFx0XHRcdGVsc2UgaWYgKG9wdHMuYWRkY2xhc3MgIT09IG9sZF9vcHRzLmFkZGNsYXNzKVxuXHRcdFx0XHRcdHBub3RpZnkucmVtb3ZlQ2xhc3Mob2xkX29wdHMuYWRkY2xhc3MpLmFkZENsYXNzKG9wdHMuYWRkY2xhc3MpO1xuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRpdGxlLlxuXHRcdFx0XHRpZiAob3B0cy50aXRsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0cG5vdGlmeS50aXRsZV9jb250YWluZXIuc2xpZGVVcChcImZhc3RcIik7XG5cdFx0XHRcdGVsc2UgaWYgKG9wdHMudGl0bGUgIT09IG9sZF9vcHRzLnRpdGxlKSB7XG5cdFx0XHRcdFx0aWYgKG9wdHMudGl0bGVfZXNjYXBlKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS50aXRsZV9jb250YWluZXIudGV4dChvcHRzLnRpdGxlKS5zbGlkZURvd24oMjAwKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnRpdGxlX2NvbnRhaW5lci5odG1sKG9wdHMudGl0bGUpLnNsaWRlRG93bigyMDApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdGV4dC5cblx0XHRcdFx0aWYgKG9wdHMudGV4dCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRwbm90aWZ5LnRleHRfY29udGFpbmVyLnNsaWRlVXAoXCJmYXN0XCIpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKG9wdHMudGV4dCAhPT0gb2xkX29wdHMudGV4dCkge1xuXHRcdFx0XHRcdGlmIChvcHRzLnRleHRfZXNjYXBlKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS50ZXh0X2NvbnRhaW5lci50ZXh0KG9wdHMudGV4dCkuc2xpZGVEb3duKDIwMCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cG5vdGlmeS50ZXh0X2NvbnRhaW5lci5odG1sKG9wdHMuaW5zZXJ0X2JycyA/IFN0cmluZyhvcHRzLnRleHQpLnJlcGxhY2UoL1xcbi9nLCBcIjxiciAvPlwiKSA6IG9wdHMudGV4dCkuc2xpZGVEb3duKDIwMCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gVXBkYXRlIHZhbHVlcyBmb3IgaGlzdG9yeSBtZW51IGFjY2Vzcy5cblx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X2hpc3RvcnkgPSBvcHRzLmhpc3Rvcnk7XG5cdFx0XHRcdHBub3RpZnkucG5vdGlmeV9oaWRlID0gb3B0cy5oaWRlO1xuXHRcdFx0XHQvLyBDaGFuZ2UgdGhlIG5vdGljZSB0eXBlLlxuXHRcdFx0XHRpZiAob3B0cy50eXBlICE9IG9sZF9vcHRzLnR5cGUpXG5cdFx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIucmVtb3ZlQ2xhc3Moc3R5bGVzLmVycm9yK1wiIFwiK3N0eWxlcy5ub3RpY2UrXCIgXCIrc3R5bGVzLnN1Y2Nlc3MrXCIgXCIrc3R5bGVzLmluZm8pLmFkZENsYXNzKG9wdHMudHlwZSA9PSBcImVycm9yXCIgPyBzdHlsZXMuZXJyb3IgOiAob3B0cy50eXBlID09IFwiaW5mb1wiID8gc3R5bGVzLmluZm8gOiAob3B0cy50eXBlID09IFwic3VjY2Vzc1wiID8gc3R5bGVzLnN1Y2Nlc3MgOiBzdHlsZXMubm90aWNlKSkpO1xuXHRcdFx0XHRpZiAob3B0cy5pY29uICE9PSBvbGRfb3B0cy5pY29uIHx8IChvcHRzLmljb24gPT09IHRydWUgJiYgb3B0cy50eXBlICE9IG9sZF9vcHRzLnR5cGUpKSB7XG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIGFueSBvbGQgaWNvbi5cblx0XHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5maW5kKFwiZGl2LnVpLXBub3RpZnktaWNvblwiKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRpZiAob3B0cy5pY29uICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdFx0Ly8gQnVpbGQgdGhlIG5ldyBpY29uLlxuXHRcdFx0XHRcdFx0JChcIjxkaXYgLz5cIiwge1wiY2xhc3NcIjogXCJ1aS1wbm90aWZ5LWljb25cIn0pXG5cdFx0XHRcdFx0XHQuYXBwZW5kKCQoXCI8c3BhbiAvPlwiLCB7XCJjbGFzc1wiOiBvcHRzLmljb24gPT09IHRydWUgPyAob3B0cy50eXBlID09IFwiZXJyb3JcIiA/IHN0eWxlcy5lcnJvcl9pY29uIDogKG9wdHMudHlwZSA9PSBcImluZm9cIiA/IHN0eWxlcy5pbmZvX2ljb24gOiAob3B0cy50eXBlID09IFwic3VjY2Vzc1wiID8gc3R5bGVzLnN1Y2Nlc3NfaWNvbiA6IHN0eWxlcy5ub3RpY2VfaWNvbikpKSA6IG9wdHMuaWNvbn0pKVxuXHRcdFx0XHRcdFx0LnByZXBlbmRUbyhwbm90aWZ5LmNvbnRhaW5lcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgd2lkdGguXG5cdFx0XHRcdGlmIChvcHRzLndpZHRoICE9PSBvbGRfb3B0cy53aWR0aClcblx0XHRcdFx0XHRwbm90aWZ5LmFuaW1hdGUoe3dpZHRoOiBvcHRzLndpZHRofSk7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgbWluaW11bSBoZWlnaHQuXG5cdFx0XHRcdGlmIChvcHRzLm1pbl9oZWlnaHQgIT09IG9sZF9vcHRzLm1pbl9oZWlnaHQpXG5cdFx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIuYW5pbWF0ZSh7bWluSGVpZ2h0OiBvcHRzLm1pbl9oZWlnaHR9KTtcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBvcGFjaXR5LlxuXHRcdFx0XHRpZiAob3B0cy5vcGFjaXR5ICE9PSBvbGRfb3B0cy5vcGFjaXR5KVxuXHRcdFx0XHRcdHBub3RpZnkuZmFkZVRvKG9wdHMuYW5pbWF0ZV9zcGVlZCwgb3B0cy5vcGFjaXR5KTtcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBzdGlja2VyIGFuZCBjbG9zZXIgYnV0dG9ucy5cblx0XHRcdFx0aWYgKCFvcHRzLmNsb3NlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cG5vdGlmeS5jbG9zZXIuY3NzKFwiZGlzcGxheVwiLCBcImJsb2NrXCIpO1xuXHRcdFx0XHRpZiAoIW9wdHMuc3RpY2tlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RpY2tlciBpY29uLlxuXHRcdFx0XHRwbm90aWZ5LnN0aWNrZXIudHJpZ2dlcihcInBub3RpZnlfaWNvblwiKTtcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBob3ZlciBzdGF0dXMgb2YgdGhlIGJ1dHRvbnMuXG5cdFx0XHRcdGlmIChvcHRzLnN0aWNrZXJfaG92ZXIpXG5cdFx0XHRcdFx0cG5vdGlmeS5zdGlja2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdGVsc2UgaWYgKCFvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcblx0XHRcdFx0aWYgKG9wdHMuY2xvc2VyX2hvdmVyKVxuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdGVsc2UgaWYgKCFvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRpbWVkIGhpZGluZy5cblx0XHRcdFx0aWYgKCFvcHRzLmhpZGUpXG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X2NhbmNlbF9yZW1vdmUoKTtcblx0XHRcdFx0ZWxzZSBpZiAoIW9sZF9vcHRzLmhpZGUpXG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3F1ZXVlX3JlbW92ZSgpO1xuXHRcdFx0XHRwbm90aWZ5LnBub3RpZnlfcXVldWVfcG9zaXRpb24oKTtcblx0XHRcdFx0cmV0dXJuIHBub3RpZnk7XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBQb3NpdGlvbiB0aGUgbm90aWNlLiBkb250X3NraXBfaGlkZGVuIGNhdXNlcyB0aGUgbm90aWNlIHRvXG5cdFx0XHQvLyBwb3NpdGlvbiBldmVuIGlmIGl0J3Mgbm90IHZpc2libGUuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfcG9zaXRpb24gPSBmdW5jdGlvbihkb250X3NraXBfaGlkZGVuKXtcblx0XHRcdFx0Ly8gR2V0IHRoZSBub3RpY2UncyBzdGFjay5cblx0XHRcdFx0dmFyIHMgPSBwbm90aWZ5Lm9wdHMuc3RhY2s7XG5cdFx0XHRcdGlmICghcykgcmV0dXJuO1xuXHRcdFx0XHRpZiAoIXMubmV4dHBvczEpXG5cdFx0XHRcdFx0cy5uZXh0cG9zMSA9IHMuZmlyc3Rwb3MxO1xuXHRcdFx0XHRpZiAoIXMubmV4dHBvczIpXG5cdFx0XHRcdFx0cy5uZXh0cG9zMiA9IHMuZmlyc3Rwb3MyO1xuXHRcdFx0XHRpZiAoIXMuYWRkcG9zMilcblx0XHRcdFx0XHRzLmFkZHBvczIgPSAwO1xuXHRcdFx0XHR2YXIgaGlkZGVuID0gcG5vdGlmeS5jc3MoXCJkaXNwbGF5XCIpID09IFwibm9uZVwiO1xuXHRcdFx0XHQvLyBTa2lwIHRoaXMgbm90aWNlIGlmIGl0J3Mgbm90IHNob3duLlxuXHRcdFx0XHRpZiAoIWhpZGRlbiB8fCBkb250X3NraXBfaGlkZGVuKSB7XG5cdFx0XHRcdFx0dmFyIGN1cnBvczEsIGN1cnBvczI7XG5cdFx0XHRcdFx0Ly8gU3RvcmUgd2hhdCB3aWxsIG5lZWQgdG8gYmUgYW5pbWF0ZWQuXG5cdFx0XHRcdFx0dmFyIGFuaW1hdGUgPSB7fTtcblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIGN1cnJlbnQgcG9zMSB2YWx1ZS5cblx0XHRcdFx0XHR2YXIgY3NzcG9zMTtcblx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMSkge1xuXHRcdFx0XHRcdFx0Y2FzZSBcImRvd25cIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMSA9IFwidG9wXCI7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcInVwXCI6XG5cdFx0XHRcdFx0XHRcdGNzc3BvczEgPSBcImJvdHRvbVwiO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgXCJsZWZ0XCI6XG5cdFx0XHRcdFx0XHRcdGNzc3BvczEgPSBcInJpZ2h0XCI7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcInJpZ2h0XCI6XG5cdFx0XHRcdFx0XHRcdGNzc3BvczEgPSBcImxlZnRcIjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGN1cnBvczEgPSBwYXJzZUludChwbm90aWZ5LmNzcyhjc3Nwb3MxKSk7XG5cdFx0XHRcdFx0aWYgKGlzTmFOKGN1cnBvczEpKVxuXHRcdFx0XHRcdFx0Y3VycG9zMSA9IDA7XG5cdFx0XHRcdFx0Ly8gUmVtZW1iZXIgdGhlIGZpcnN0IHBvczEsIHNvIHRoZSBmaXJzdCB2aXNpYmxlIG5vdGljZSBnb2VzIHRoZXJlLlxuXHRcdFx0XHRcdGlmICh0eXBlb2Ygcy5maXJzdHBvczEgPT0gXCJ1bmRlZmluZWRcIiAmJiAhaGlkZGVuKSB7XG5cdFx0XHRcdFx0XHRzLmZpcnN0cG9zMSA9IGN1cnBvczE7XG5cdFx0XHRcdFx0XHRzLm5leHRwb3MxID0gcy5maXJzdHBvczE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgY3VycmVudCBwb3MyIHZhbHVlLlxuXHRcdFx0XHRcdHZhciBjc3Nwb3MyO1xuXHRcdFx0XHRcdHN3aXRjaCAocy5kaXIyKSB7XG5cdFx0XHRcdFx0XHRjYXNlIFwiZG93blwiOlxuXHRcdFx0XHRcdFx0XHRjc3Nwb3MyID0gXCJ0b3BcIjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIFwidXBcIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMiA9IFwiYm90dG9tXCI7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMiA9IFwicmlnaHRcIjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIFwicmlnaHRcIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMiA9IFwibGVmdFwiO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y3VycG9zMiA9IHBhcnNlSW50KHBub3RpZnkuY3NzKGNzc3BvczIpKTtcblx0XHRcdFx0XHRpZiAoaXNOYU4oY3VycG9zMikpXG5cdFx0XHRcdFx0XHRjdXJwb3MyID0gMDtcblx0XHRcdFx0XHQvLyBSZW1lbWJlciB0aGUgZmlyc3QgcG9zMiwgc28gdGhlIGZpcnN0IHZpc2libGUgbm90aWNlIGdvZXMgdGhlcmUuXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBzLmZpcnN0cG9zMiA9PSBcInVuZGVmaW5lZFwiICYmICFoaWRkZW4pIHtcblx0XHRcdFx0XHRcdHMuZmlyc3Rwb3MyID0gY3VycG9zMjtcblx0XHRcdFx0XHRcdHMubmV4dHBvczIgPSBzLmZpcnN0cG9zMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgdGhhdCBpdCdzIG5vdCBiZXlvbmQgdGhlIHZpZXdwb3J0IGVkZ2UuXG5cdFx0XHRcdFx0aWYgKChzLmRpcjEgPT0gXCJkb3duXCIgJiYgcy5uZXh0cG9zMSArIHBub3RpZnkuaGVpZ2h0KCkgPiBqd2luZG93LmhlaWdodCgpKSB8fFxuXHRcdFx0XHRcdFx0KHMuZGlyMSA9PSBcInVwXCIgJiYgcy5uZXh0cG9zMSArIHBub3RpZnkuaGVpZ2h0KCkgPiBqd2luZG93LmhlaWdodCgpKSB8fFxuXHRcdFx0XHRcdFx0KHMuZGlyMSA9PSBcImxlZnRcIiAmJiBzLm5leHRwb3MxICsgcG5vdGlmeS53aWR0aCgpID4gandpbmRvdy53aWR0aCgpKSB8fFxuXHRcdFx0XHRcdFx0KHMuZGlyMSA9PSBcInJpZ2h0XCIgJiYgcy5uZXh0cG9zMSArIHBub3RpZnkud2lkdGgoKSA+IGp3aW5kb3cud2lkdGgoKSkgKSB7XG5cdFx0XHRcdFx0XHQvLyBJZiBpdCBpcywgaXQgbmVlZHMgdG8gZ28gYmFjayB0byB0aGUgZmlyc3QgcG9zMSwgYW5kIG92ZXIgb24gcG9zMi5cblx0XHRcdFx0XHRcdHMubmV4dHBvczEgPSBzLmZpcnN0cG9zMTtcblx0XHRcdFx0XHRcdHMubmV4dHBvczIgKz0gcy5hZGRwb3MyICsgKHR5cGVvZiBzLnNwYWNpbmcyID09IFwidW5kZWZpbmVkXCIgPyAyNSA6IHMuc3BhY2luZzIpO1xuXHRcdFx0XHRcdFx0cy5hZGRwb3MyID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBpZiB3ZSdyZSBtb3Zpbmcgb24gZGlyMi5cblx0XHRcdFx0XHRpZiAocy5hbmltYXRpb24gJiYgcy5uZXh0cG9zMiA8IGN1cnBvczIpIHtcblx0XHRcdFx0XHRcdHN3aXRjaCAocy5kaXIyKSB7XG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJkb3duXCI6XG5cdFx0XHRcdFx0XHRcdFx0YW5pbWF0ZS50b3AgPSBzLm5leHRwb3MyK1wicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSBcInVwXCI6XG5cdFx0XHRcdFx0XHRcdFx0YW5pbWF0ZS5ib3R0b20gPSBzLm5leHRwb3MyK1wicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdFx0XHRhbmltYXRlLnJpZ2h0ID0gcy5uZXh0cG9zMitcInB4XCI7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJyaWdodFwiOlxuXHRcdFx0XHRcdFx0XHRcdGFuaW1hdGUubGVmdCA9IHMubmV4dHBvczIrXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5jc3MoY3NzcG9zMiwgcy5uZXh0cG9zMitcInB4XCIpO1xuXHRcdFx0XHRcdC8vIEtlZXAgdHJhY2sgb2YgdGhlIHdpZGVzdC90YWxsZXN0IG5vdGljZSBpbiB0aGUgY29sdW1uL3Jvdywgc28gd2UgY2FuIHB1c2ggdGhlIG5leHQgY29sdW1uL3Jvdy5cblx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMikge1xuXHRcdFx0XHRcdFx0Y2FzZSBcImRvd25cIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJ1cFwiOlxuXHRcdFx0XHRcdFx0XHRpZiAocG5vdGlmeS5vdXRlckhlaWdodCh0cnVlKSA+IHMuYWRkcG9zMilcblx0XHRcdFx0XHRcdFx0XHRzLmFkZHBvczIgPSBwbm90aWZ5LmhlaWdodCgpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgXCJsZWZ0XCI6XG5cdFx0XHRcdFx0XHRjYXNlIFwicmlnaHRcIjpcblx0XHRcdFx0XHRcdFx0aWYgKHBub3RpZnkub3V0ZXJXaWR0aCh0cnVlKSA+IHMuYWRkcG9zMilcblx0XHRcdFx0XHRcdFx0XHRzLmFkZHBvczIgPSBwbm90aWZ5LndpZHRoKCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBNb3ZlIHRoZSBub3RpY2Ugb24gZGlyMS5cblx0XHRcdFx0XHRpZiAocy5uZXh0cG9zMSkge1xuXHRcdFx0XHRcdFx0Ly8gQW5pbWF0ZSBpZiB3ZSdyZSBtb3ZpbmcgdG93YXJkIHRoZSBmaXJzdCBwb3MuXG5cdFx0XHRcdFx0XHRpZiAocy5hbmltYXRpb24gJiYgKGN1cnBvczEgPiBzLm5leHRwb3MxIHx8IGFuaW1hdGUudG9wIHx8IGFuaW1hdGUuYm90dG9tIHx8IGFuaW1hdGUucmlnaHQgfHwgYW5pbWF0ZS5sZWZ0KSkge1xuXHRcdFx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMSkge1xuXHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJkb3duXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRhbmltYXRlLnRvcCA9IHMubmV4dHBvczErXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSBcInVwXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRhbmltYXRlLmJvdHRvbSA9IHMubmV4dHBvczErXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdFx0XHRcdGFuaW1hdGUucmlnaHQgPSBzLm5leHRwb3MxK1wicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJyaWdodFwiOlxuXHRcdFx0XHRcdFx0XHRcdFx0YW5pbWF0ZS5sZWZ0ID0gcy5uZXh0cG9zMStcInB4XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlXG5cdFx0XHRcdFx0XHRcdHBub3RpZnkuY3NzKGNzc3BvczEsIHMubmV4dHBvczErXCJweFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gUnVuIHRoZSBhbmltYXRpb24uXG5cdFx0XHRcdFx0aWYgKGFuaW1hdGUudG9wIHx8IGFuaW1hdGUuYm90dG9tIHx8IGFuaW1hdGUucmlnaHQgfHwgYW5pbWF0ZS5sZWZ0KVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5hbmltYXRlKGFuaW1hdGUsIHtkdXJhdGlvbjogNTAwLCBxdWV1ZTogZmFsc2V9KTtcblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIG5leHQgZGlyMSBwb3NpdGlvbi5cblx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMSkge1xuXHRcdFx0XHRcdFx0Y2FzZSBcImRvd25cIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJ1cFwiOlxuXHRcdFx0XHRcdFx0XHRzLm5leHRwb3MxICs9IHBub3RpZnkuaGVpZ2h0KCkgKyAodHlwZW9mIHMuc3BhY2luZzEgPT0gXCJ1bmRlZmluZWRcIiA/IDI1IDogcy5zcGFjaW5nMSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJyaWdodFwiOlxuXHRcdFx0XHRcdFx0XHRzLm5leHRwb3MxICs9IHBub3RpZnkud2lkdGgoKSArICh0eXBlb2Ygcy5zcGFjaW5nMSA9PSBcInVuZGVmaW5lZFwiID8gMjUgOiBzLnNwYWNpbmcxKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBRdWV1ZSB0aGUgcG9zaXRpb25hIGFsbCBmdW5jdGlvbiBzbyBpdCBkb2Vzbid0IHJ1biByZXBlYXRlZGx5IGFuZFxuXHRcdFx0Ly8gdXNlIHVwIHJlc291cmNlcy5cblx0XHRcdHBub3RpZnkucG5vdGlmeV9xdWV1ZV9wb3NpdGlvbiA9IGZ1bmN0aW9uKG1pbGxpc2Vjb25kcyl7XG5cdFx0XHRcdGlmICh0aW1lcilcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdFx0XHRpZiAoIW1pbGxpc2Vjb25kcylcblx0XHRcdFx0XHRtaWxsaXNlY29uZHMgPSAxMDtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCQucG5vdGlmeV9wb3NpdGlvbl9hbGwsIG1pbGxpc2Vjb25kcyk7XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBEaXNwbGF5IHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfZGlzcGxheSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBJZiB0aGUgbm90aWNlIGlzIG5vdCBpbiB0aGUgRE9NLCBhcHBlbmQgaXQuXG5cdFx0XHRcdGlmICghcG5vdGlmeS5wYXJlbnQoKS5sZW5ndGgpXG5cdFx0XHRcdFx0cG5vdGlmeS5hcHBlbmRUbyhib2R5KTtcblx0XHRcdFx0Ly8gUnVuIGNhbGxiYWNrLlxuXHRcdFx0XHRpZiAob3B0cy5iZWZvcmVfb3Blbikge1xuXHRcdFx0XHRcdGlmIChvcHRzLmJlZm9yZV9vcGVuKHBub3RpZnkpID09PSBmYWxzZSlcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBUcnkgdG8gcHV0IGl0IGluIHRoZSByaWdodCBwb3NpdGlvbi5cblx0XHRcdFx0aWYgKG9wdHMuc3RhY2sucHVzaCAhPSBcInRvcFwiKVxuXHRcdFx0XHRcdHBub3RpZnkucG5vdGlmeV9wb3NpdGlvbih0cnVlKTtcblx0XHRcdFx0Ly8gRmlyc3Qgc2hvdyBpdCwgdGhlbiBzZXQgaXRzIG9wYWNpdHksIHRoZW4gaGlkZSBpdC5cblx0XHRcdFx0aWYgKG9wdHMuYW5pbWF0aW9uID09IFwiZmFkZVwiIHx8IG9wdHMuYW5pbWF0aW9uLmVmZmVjdF9pbiA9PSBcImZhZGVcIikge1xuXHRcdFx0XHRcdC8vIElmIGl0J3MgZmFkaW5nIGluLCBpdCBzaG91bGQgc3RhcnQgYXQgMC5cblx0XHRcdFx0XHRwbm90aWZ5LnNob3coKS5mYWRlVG8oMCwgMCkuaGlkZSgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIE9yIGVsc2UgaXQgc2hvdWxkIGJlIHNldCB0byB0aGUgb3BhY2l0eS5cblx0XHRcdFx0XHRpZiAob3B0cy5vcGFjaXR5ICE9IDEpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnNob3coKS5mYWRlVG8oMCwgb3B0cy5vcGFjaXR5KS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG5vdGlmeS5hbmltYXRlX2luKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0aWYgKG9wdHMuYWZ0ZXJfb3Blbilcblx0XHRcdFx0XHRcdG9wdHMuYWZ0ZXJfb3Blbihwbm90aWZ5KTtcblxuXHRcdFx0XHRcdHBub3RpZnkucG5vdGlmeV9xdWV1ZV9wb3NpdGlvbigpO1xuXG5cdFx0XHRcdFx0Ly8gTm93IHNldCBpdCB0byBoaWRlLlxuXHRcdFx0XHRcdGlmIChvcHRzLmhpZGUpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnBub3RpZnlfcXVldWVfcmVtb3ZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblxuXHRcdFx0Ly8gUmVtb3ZlIHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfcmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChwbm90aWZ5LnRpbWVyKSB7XG5cdFx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChwbm90aWZ5LnRpbWVyKTtcblx0XHRcdFx0XHRwbm90aWZ5LnRpbWVyID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBSdW4gY2FsbGJhY2suXG5cdFx0XHRcdGlmIChvcHRzLmJlZm9yZV9jbG9zZSkge1xuXHRcdFx0XHRcdGlmIChvcHRzLmJlZm9yZV9jbG9zZShwbm90aWZ5KSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0cG5vdGlmeS5hbmltYXRlX291dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGlmIChvcHRzLmFmdGVyX2Nsb3NlKSB7XG5cdFx0XHRcdFx0XHRpZiAob3B0cy5hZnRlcl9jbG9zZShwbm90aWZ5KSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3F1ZXVlX3Bvc2l0aW9uKCk7XG5cdFx0XHRcdFx0Ly8gSWYgd2UncmUgc3VwcG9zZWQgdG8gcmVtb3ZlIHRoZSBub3RpY2UgZnJvbSB0aGUgRE9NLCBkbyBpdC5cblx0XHRcdFx0XHRpZiAob3B0cy5yZW1vdmUpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LmRldGFjaCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cblx0XHRcdC8vIEFuaW1hdGUgdGhlIG5vdGljZSBpbi5cblx0XHRcdHBub3RpZnkuYW5pbWF0ZV9pbiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0XHRcdFx0Ly8gRGVjbGFyZSB0aGF0IHRoZSBub3RpY2UgaXMgYW5pbWF0aW5nIGluLiAoT3IgaGFzIGNvbXBsZXRlZCBhbmltYXRpbmcgaW4uKVxuXHRcdFx0XHRhbmltYXRpbmcgPSBcImluXCI7XG5cdFx0XHRcdHZhciBhbmltYXRpb247XG5cdFx0XHRcdGlmICh0eXBlb2Ygb3B0cy5hbmltYXRpb24uZWZmZWN0X2luICE9IFwidW5kZWZpbmVkXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uID0gb3B0cy5hbmltYXRpb24uZWZmZWN0X2luO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0YW5pbWF0aW9uID0gb3B0cy5hbmltYXRpb247XG5cdFx0XHRcdGlmIChhbmltYXRpb24gPT0gXCJub25lXCIpIHtcblx0XHRcdFx0XHRwbm90aWZ5LnNob3coKTtcblx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGFuaW1hdGlvbiA9PSBcInNob3dcIilcblx0XHRcdFx0XHRwbm90aWZ5LnNob3cob3B0cy5hbmltYXRlX3NwZWVkLCBjYWxsYmFjayk7XG5cdFx0XHRcdGVsc2UgaWYgKGFuaW1hdGlvbiA9PSBcImZhZGVcIilcblx0XHRcdFx0XHRwbm90aWZ5LnNob3coKS5mYWRlVG8ob3B0cy5hbmltYXRlX3NwZWVkLCBvcHRzLm9wYWNpdHksIGNhbGxiYWNrKTtcblx0XHRcdFx0ZWxzZSBpZiAoYW5pbWF0aW9uID09IFwic2xpZGVcIilcblx0XHRcdFx0XHRwbm90aWZ5LnNsaWRlRG93bihvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGFuaW1hdGlvbiA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uKFwiaW5cIiwgY2FsbGJhY2ssIHBub3RpZnkpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cG5vdGlmeS5zaG93KGFuaW1hdGlvbiwgKHR5cGVvZiBvcHRzLmFuaW1hdGlvbi5vcHRpb25zX2luID09IFwib2JqZWN0XCIgPyBvcHRzLmFuaW1hdGlvbi5vcHRpb25zX2luIDoge30pLCBvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIEFuaW1hdGUgdGhlIG5vdGljZSBvdXQuXG5cdFx0XHRwbm90aWZ5LmFuaW1hdGVfb3V0ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXHRcdFx0XHQvLyBEZWNsYXJlIHRoYXQgdGhlIG5vdGljZSBpcyBhbmltYXRpbmcgb3V0LiAoT3IgaGFzIGNvbXBsZXRlZCBhbmltYXRpbmcgb3V0Lilcblx0XHRcdFx0YW5pbWF0aW5nID0gXCJvdXRcIjtcblx0XHRcdFx0dmFyIGFuaW1hdGlvbjtcblx0XHRcdFx0aWYgKHR5cGVvZiBvcHRzLmFuaW1hdGlvbi5lZmZlY3Rfb3V0ICE9IFwidW5kZWZpbmVkXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uID0gb3B0cy5hbmltYXRpb24uZWZmZWN0X291dDtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGFuaW1hdGlvbiA9IG9wdHMuYW5pbWF0aW9uO1xuXHRcdFx0XHRpZiAoYW5pbWF0aW9uID09IFwibm9uZVwiKSB7XG5cdFx0XHRcdFx0cG5vdGlmeS5oaWRlKCk7XG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0fSBlbHNlIGlmIChhbmltYXRpb24gPT0gXCJzaG93XCIpXG5cdFx0XHRcdFx0cG5vdGlmeS5oaWRlKG9wdHMuYW5pbWF0ZV9zcGVlZCwgY2FsbGJhY2spO1xuXHRcdFx0XHRlbHNlIGlmIChhbmltYXRpb24gPT0gXCJmYWRlXCIpXG5cdFx0XHRcdFx0cG5vdGlmeS5mYWRlT3V0KG9wdHMuYW5pbWF0ZV9zcGVlZCwgY2FsbGJhY2spO1xuXHRcdFx0XHRlbHNlIGlmIChhbmltYXRpb24gPT0gXCJzbGlkZVwiKVxuXHRcdFx0XHRcdHBub3RpZnkuc2xpZGVVcChvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGFuaW1hdGlvbiA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uKFwib3V0XCIsIGNhbGxiYWNrLCBwbm90aWZ5KTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHBub3RpZnkuaGlkZShhbmltYXRpb24sICh0eXBlb2Ygb3B0cy5hbmltYXRpb24ub3B0aW9uc19vdXQgPT0gXCJvYmplY3RcIiA/IG9wdHMuYW5pbWF0aW9uLm9wdGlvbnNfb3V0IDoge30pLCBvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIENhbmNlbCBhbnkgcGVuZGluZyByZW1vdmFsIHRpbWVyLlxuXHRcdFx0cG5vdGlmeS5wbm90aWZ5X2NhbmNlbF9yZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHBub3RpZnkudGltZXIpXG5cdFx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChwbm90aWZ5LnRpbWVyKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIFF1ZXVlIGEgcmVtb3ZhbCB0aW1lci5cblx0XHRcdHBub3RpZnkucG5vdGlmeV9xdWV1ZV9yZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gQ2FuY2VsIGFueSBjdXJyZW50IHJlbW92YWwgdGltZXIuXG5cdFx0XHRcdHBub3RpZnkucG5vdGlmeV9jYW5jZWxfcmVtb3ZlKCk7XG5cdFx0XHRcdHBub3RpZnkudGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHBub3RpZnkucG5vdGlmeV9yZW1vdmUoKTtcblx0XHRcdFx0fSwgKGlzTmFOKG9wdHMuZGVsYXkpID8gMCA6IG9wdHMuZGVsYXkpKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIFByb3ZpZGUgYSBidXR0b24gdG8gY2xvc2UgdGhlIG5vdGljZS5cblx0XHRcdHBub3RpZnkuY2xvc2VyID0gJChcIjxkaXYgLz5cIiwge1xuXHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1jbG9zZXJcIixcblx0XHRcdFx0XCJjc3NcIjoge1wiY3Vyc29yXCI6IFwicG9pbnRlclwiLCBcInZpc2liaWxpdHlcIjogb3B0cy5jbG9zZXJfaG92ZXIgPyBcImhpZGRlblwiIDogXCJ2aXNpYmxlXCJ9LFxuXHRcdFx0XHRcImNsaWNrXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3JlbW92ZSgpO1xuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuYXBwZW5kKCQoXCI8c3BhbiAvPlwiLCB7XCJjbGFzc1wiOiBzdHlsZXMuY2xvc2VyfSkpXG5cdFx0XHQuYXBwZW5kVG8ocG5vdGlmeS5jb250YWluZXIpO1xuXHRcdFx0aWYgKCFvcHRzLmNsb3NlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRwbm90aWZ5LmNsb3Nlci5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblxuXHRcdFx0Ly8gUHJvdmlkZSBhIGJ1dHRvbiB0byBzdGljayB0aGUgbm90aWNlLlxuXHRcdFx0cG5vdGlmeS5zdGlja2VyID0gJChcIjxkaXYgLz5cIiwge1xuXHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1zdGlja2VyXCIsXG5cdFx0XHRcdFwiY3NzXCI6IHtcImN1cnNvclwiOiBcInBvaW50ZXJcIiwgXCJ2aXNpYmlsaXR5XCI6IG9wdHMuc3RpY2tlcl9ob3ZlciA/IFwiaGlkZGVuXCIgOiBcInZpc2libGVcIn0sXG5cdFx0XHRcdFwiY2xpY2tcIjogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRvcHRzLmhpZGUgPSAhb3B0cy5oaWRlO1xuXHRcdFx0XHRcdGlmIChvcHRzLmhpZGUpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnBub3RpZnlfcXVldWVfcmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X2NhbmNlbF9yZW1vdmUoKTtcblx0XHRcdFx0XHQkKHRoaXMpLnRyaWdnZXIoXCJwbm90aWZ5X2ljb25cIik7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuYmluZChcInBub3RpZnlfaWNvblwiLCBmdW5jdGlvbigpe1xuXHRcdFx0XHQkKHRoaXMpLmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3Moc3R5bGVzLnBpbl91cCtcIiBcIitzdHlsZXMucGluX2Rvd24pLmFkZENsYXNzKG9wdHMuaGlkZSA/IHN0eWxlcy5waW5fdXAgOiBzdHlsZXMucGluX2Rvd24pO1xuXHRcdFx0fSlcblx0XHRcdC5hcHBlbmQoJChcIjxzcGFuIC8+XCIsIHtcImNsYXNzXCI6IHN0eWxlcy5waW5fdXB9KSlcblx0XHRcdC5hcHBlbmRUbyhwbm90aWZ5LmNvbnRhaW5lcik7XG5cdFx0XHRpZiAoIW9wdHMuc3RpY2tlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRwbm90aWZ5LnN0aWNrZXIuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG5cblx0XHRcdC8vIEFkZCB0aGUgYXBwcm9wcmlhdGUgaWNvbi5cblx0XHRcdGlmIChvcHRzLmljb24gIT09IGZhbHNlKSB7XG5cdFx0XHRcdCQoXCI8ZGl2IC8+XCIsIHtcImNsYXNzXCI6IFwidWktcG5vdGlmeS1pY29uXCJ9KVxuXHRcdFx0XHQuYXBwZW5kKCQoXCI8c3BhbiAvPlwiLCB7XCJjbGFzc1wiOiBvcHRzLmljb24gPT09IHRydWUgPyAob3B0cy50eXBlID09IFwiZXJyb3JcIiA/IHN0eWxlcy5lcnJvcl9pY29uIDogKG9wdHMudHlwZSA9PSBcImluZm9cIiA/IHN0eWxlcy5pbmZvX2ljb24gOiAob3B0cy50eXBlID09IFwic3VjY2Vzc1wiID8gc3R5bGVzLnN1Y2Nlc3NfaWNvbiA6IHN0eWxlcy5ub3RpY2VfaWNvbikpKSA6IG9wdHMuaWNvbn0pKVxuXHRcdFx0XHQucHJlcGVuZFRvKHBub3RpZnkuY29udGFpbmVyKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQWRkIGEgdGl0bGUuXG5cdFx0XHRwbm90aWZ5LnRpdGxlX2NvbnRhaW5lciA9ICQoXCI8aDQgLz5cIiwge1xuXHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS10aXRsZVwiXG5cdFx0XHR9KVxuXHRcdFx0LmFwcGVuZFRvKHBub3RpZnkuY29udGFpbmVyKTtcblx0XHRcdGlmIChvcHRzLnRpdGxlID09PSBmYWxzZSlcblx0XHRcdFx0cG5vdGlmeS50aXRsZV9jb250YWluZXIuaGlkZSgpO1xuXHRcdFx0ZWxzZSBpZiAob3B0cy50aXRsZV9lc2NhcGUpXG5cdFx0XHRcdHBub3RpZnkudGl0bGVfY29udGFpbmVyLnRleHQob3B0cy50aXRsZSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHBub3RpZnkudGl0bGVfY29udGFpbmVyLmh0bWwob3B0cy50aXRsZSk7XG5cblx0XHRcdC8vIEFkZCB0ZXh0LlxuXHRcdFx0cG5vdGlmeS50ZXh0X2NvbnRhaW5lciA9ICQoXCI8ZGl2IC8+XCIsIHtcblx0XHRcdFx0XCJjbGFzc1wiOiBcInVpLXBub3RpZnktdGV4dFwiXG5cdFx0XHR9KVxuXHRcdFx0LmFwcGVuZFRvKHBub3RpZnkuY29udGFpbmVyKTtcblx0XHRcdGlmIChvcHRzLnRleHQgPT09IGZhbHNlKVxuXHRcdFx0XHRwbm90aWZ5LnRleHRfY29udGFpbmVyLmhpZGUoKTtcblx0XHRcdGVsc2UgaWYgKG9wdHMudGV4dF9lc2NhcGUpXG5cdFx0XHRcdHBub3RpZnkudGV4dF9jb250YWluZXIudGV4dChvcHRzLnRleHQpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRwbm90aWZ5LnRleHRfY29udGFpbmVyLmh0bWwob3B0cy5pbnNlcnRfYnJzID8gU3RyaW5nKG9wdHMudGV4dCkucmVwbGFjZSgvXFxuL2csIFwiPGJyIC8+XCIpIDogb3B0cy50ZXh0KTtcblxuXHRcdFx0Ly8gU2V0IHdpZHRoIGFuZCBtaW4gaGVpZ2h0LlxuXHRcdFx0aWYgKHR5cGVvZiBvcHRzLndpZHRoID09IFwic3RyaW5nXCIpXG5cdFx0XHRcdHBub3RpZnkuY3NzKFwid2lkdGhcIiwgb3B0cy53aWR0aCk7XG5cdFx0XHRpZiAodHlwZW9mIG9wdHMubWluX2hlaWdodCA9PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5jc3MoXCJtaW4taGVpZ2h0XCIsIG9wdHMubWluX2hlaWdodCk7XG5cblx0XHRcdC8vIFRoZSBoaXN0b3J5IHZhcmlhYmxlIGNvbnRyb2xzIHdoZXRoZXIgdGhlIG5vdGljZSBnZXRzIHJlZGlzcGxheWVkXG5cdFx0XHQvLyBieSB0aGUgaGlzdG9yeSBwdWxsIGRvd24uXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfaGlzdG9yeSA9IG9wdHMuaGlzdG9yeTtcblx0XHRcdC8vIFRoZSBoaWRlIHZhcmlhYmxlIGNvbnRyb2xzIHdoZXRoZXIgdGhlIGhpc3RvcnkgcHVsbCBkb3duIHNob3VsZFxuXHRcdFx0Ly8gcXVldWUgYSByZW1vdmFsIHRpbWVyLlxuXHRcdFx0cG5vdGlmeS5wbm90aWZ5X2hpZGUgPSBvcHRzLmhpZGU7XG5cblx0XHRcdC8vIEFkZCB0aGUgbm90aWNlIHRvIHRoZSBub3RpY2UgYXJyYXkuXG5cdFx0XHR2YXIgbm90aWNlc19kYXRhID0gandpbmRvdy5kYXRhKFwicG5vdGlmeVwiKTtcblx0XHRcdGlmIChub3RpY2VzX2RhdGEgPT0gbnVsbCB8fCB0eXBlb2Ygbm90aWNlc19kYXRhICE9IFwib2JqZWN0XCIpXG5cdFx0XHRcdG5vdGljZXNfZGF0YSA9IFtdO1xuXHRcdFx0aWYgKG9wdHMuc3RhY2sucHVzaCA9PSBcInRvcFwiKVxuXHRcdFx0XHRub3RpY2VzX2RhdGEgPSAkLm1lcmdlKFtwbm90aWZ5XSwgbm90aWNlc19kYXRhKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0bm90aWNlc19kYXRhID0gJC5tZXJnZShub3RpY2VzX2RhdGEsIFtwbm90aWZ5XSk7XG5cdFx0XHRqd2luZG93LmRhdGEoXCJwbm90aWZ5XCIsIG5vdGljZXNfZGF0YSk7XG5cdFx0XHQvLyBOb3cgcG9zaXRpb24gYWxsIHRoZSBub3RpY2VzIGlmIHRoZXkgYXJlIHRvIHB1c2ggdG8gdGhlIHRvcC5cblx0XHRcdGlmIChvcHRzLnN0YWNrLnB1c2ggPT0gXCJ0b3BcIilcblx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3F1ZXVlX3Bvc2l0aW9uKDEpO1xuXG5cdFx0XHQvLyBSdW4gY2FsbGJhY2suXG5cdFx0XHRpZiAob3B0cy5hZnRlcl9pbml0KVxuXHRcdFx0XHRvcHRzLmFmdGVyX2luaXQocG5vdGlmeSk7XG5cblx0XHRcdGlmIChvcHRzLmhpc3RvcnkpIHtcblx0XHRcdFx0Ly8gSWYgdGhlcmUgaXNuJ3QgYSBoaXN0b3J5IHB1bGwgZG93biwgY3JlYXRlIG9uZS5cblx0XHRcdFx0dmFyIGhpc3RvcnlfbWVudSA9IGp3aW5kb3cuZGF0YShcInBub3RpZnlfaGlzdG9yeVwiKTtcblx0XHRcdFx0aWYgKHR5cGVvZiBoaXN0b3J5X21lbnUgPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRcdGhpc3RvcnlfbWVudSA9ICQoXCI8ZGl2IC8+XCIsIHtcblx0XHRcdFx0XHRcdFwiY2xhc3NcIjogXCJ1aS1wbm90aWZ5LWhpc3RvcnktY29udGFpbmVyIFwiK3N0eWxlcy5oaV9tZW51LFxuXHRcdFx0XHRcdFx0XCJtb3VzZWxlYXZlXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdGhpc3RvcnlfbWVudS5hbmltYXRlKHt0b3A6IFwiLVwiK2hpc3RvcnlfaGFuZGxlX3RvcCtcInB4XCJ9LCB7ZHVyYXRpb246IDEwMCwgcXVldWU6IGZhbHNlfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuYXBwZW5kKCQoXCI8ZGl2IC8+XCIsIHtcImNsYXNzXCI6IFwidWktcG5vdGlmeS1oaXN0b3J5LWhlYWRlclwiLCBcInRleHRcIjogXCJSZWRpc3BsYXlcIn0pKVxuXHRcdFx0XHRcdC5hcHBlbmQoJChcIjxidXR0b24gLz5cIiwge1xuXHRcdFx0XHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1oaXN0b3J5LWFsbCBcIitzdHlsZXMuaGlfYnRuLFxuXHRcdFx0XHRcdFx0XHRcInRleHRcIjogXCJBbGxcIixcblx0XHRcdFx0XHRcdFx0XCJtb3VzZWVudGVyXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcyhzdHlsZXMuaGlfYnRuaG92KTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XCJtb3VzZWxlYXZlXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcyhzdHlsZXMuaGlfYnRuaG92KTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XCJjbGlja1wiOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdC8vIERpc3BsYXkgYWxsIG5vdGljZXMuIChEaXNyZWdhcmRpbmcgbm9uLWhpc3Rvcnkgbm90aWNlcy4pXG5cdFx0XHRcdFx0XHRcdFx0JC5lYWNoKG5vdGljZXNfZGF0YSwgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLnBub3RpZnlfaGlzdG9yeSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5pcyhcIjp2aXNpYmxlXCIpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucG5vdGlmeV9oaWRlKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbm90aWZ5X3F1ZXVlX3JlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMucG5vdGlmeV9kaXNwbGF5KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucG5vdGlmeV9kaXNwbGF5KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkpXG5cdFx0XHRcdFx0LmFwcGVuZCgkKFwiPGJ1dHRvbiAvPlwiLCB7XG5cdFx0XHRcdFx0XHRcdFwiY2xhc3NcIjogXCJ1aS1wbm90aWZ5LWhpc3RvcnktbGFzdCBcIitzdHlsZXMuaGlfYnRuLFxuXHRcdFx0XHRcdFx0XHRcInRleHRcIjogXCJMYXN0XCIsXG5cdFx0XHRcdFx0XHRcdFwibW91c2VlbnRlclwiOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3Moc3R5bGVzLmhpX2J0bmhvdik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFwibW91c2VsZWF2ZVwiOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlQ2xhc3Moc3R5bGVzLmhpX2J0bmhvdik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFwiY2xpY2tcIjogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHQvLyBMb29rIHVwIHRoZSBsYXN0IGhpc3Rvcnkgbm90aWNlLCBhbmQgZGlzcGxheSBpdC5cblx0XHRcdFx0XHRcdFx0XHR2YXIgaSA9IC0xO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBub3RpY2U7XG5cdFx0XHRcdFx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGkgPT0gLTEpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5vdGljZSA9IG5vdGljZXNfZGF0YS5zbGljZShpKTtcblx0XHRcdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0XHRcdFx0bm90aWNlID0gbm90aWNlc19kYXRhLnNsaWNlKGksIGkrMSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIW5vdGljZVswXSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRpLS07XG5cdFx0XHRcdFx0XHRcdFx0fSB3aGlsZSAoIW5vdGljZVswXS5wbm90aWZ5X2hpc3RvcnkgfHwgbm90aWNlWzBdLmlzKFwiOnZpc2libGVcIikpO1xuXHRcdFx0XHRcdFx0XHRcdGlmICghbm90aWNlWzBdKVxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChub3RpY2VbMF0ucG5vdGlmeV9kaXNwbGF5KVxuXHRcdFx0XHRcdFx0XHRcdFx0bm90aWNlWzBdLnBub3RpZnlfZGlzcGxheSgpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKVxuXHRcdFx0XHRcdC5hcHBlbmRUbyhib2R5KTtcblxuXHRcdFx0XHRcdC8vIE1ha2UgYSBoYW5kbGUgc28gdGhlIHVzZXIgY2FuIHB1bGwgZG93biB0aGUgaGlzdG9yeSB0YWIuXG5cdFx0XHRcdFx0dmFyIGhhbmRsZSA9ICQoXCI8c3BhbiAvPlwiLCB7XG5cdFx0XHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1oaXN0b3J5LXB1bGxkb3duIFwiK3N0eWxlcy5oaV9obmQsXG5cdFx0XHRcdFx0XHRcIm1vdXNlZW50ZXJcIjogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0aGlzdG9yeV9tZW51LmFuaW1hdGUoe3RvcDogXCIwXCJ9LCB7ZHVyYXRpb246IDEwMCwgcXVldWU6IGZhbHNlfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuYXBwZW5kVG8oaGlzdG9yeV9tZW51KTtcblxuXHRcdFx0XHRcdC8vIEdldCB0aGUgdG9wIG9mIHRoZSBoYW5kbGUuXG5cdFx0XHRcdFx0aGlzdG9yeV9oYW5kbGVfdG9wID0gaGFuZGxlLm9mZnNldCgpLnRvcCArIDI7XG5cdFx0XHRcdFx0Ly8gSGlkZSB0aGUgaGlzdG9yeSBwdWxsIGRvd24gdXAgdG8gdGhlIHRvcCBvZiB0aGUgaGFuZGxlLlxuXHRcdFx0XHRcdGhpc3RvcnlfbWVudS5jc3Moe3RvcDogXCItXCIraGlzdG9yeV9oYW5kbGVfdG9wK1wicHhcIn0pO1xuXHRcdFx0XHRcdC8vIFNhdmUgdGhlIGhpc3RvcnkgcHVsbCBkb3duLlxuXHRcdFx0XHRcdGp3aW5kb3cuZGF0YShcInBub3RpZnlfaGlzdG9yeVwiLCBoaXN0b3J5X21lbnUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1hcmsgdGhlIHN0YWNrIHNvIGl0IHdvbid0IGFuaW1hdGUgdGhlIG5ldyBub3RpY2UuXG5cdFx0XHRvcHRzLnN0YWNrLmFuaW1hdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHQvLyBEaXNwbGF5IHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfZGlzcGxheSgpO1xuXG5cdFx0XHRyZXR1cm4gcG5vdGlmeTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFNvbWUgdXNlZnVsIHJlZ2V4ZXMuXG5cdHZhciByZV9vbiA9IC9eb24vLFxuXHRcdHJlX21vdXNlX2V2ZW50cyA9IC9eKGRibCk/Y2xpY2skfF5tb3VzZShtb3ZlfGRvd258dXB8b3ZlcnxvdXR8ZW50ZXJ8bGVhdmUpJHxeY29udGV4dG1lbnUkLyxcblx0XHRyZV91aV9ldmVudHMgPSAvXihmb2N1c3xibHVyfHNlbGVjdHxjaGFuZ2V8cmVzZXQpJHxea2V5KHByZXNzfGRvd258dXApJC8sXG5cdFx0cmVfaHRtbF9ldmVudHMgPSAvXihzY3JvbGx8cmVzaXplfCh1bik/bG9hZHxhYm9ydHxlcnJvcikkLztcblx0Ly8gRmlyZSBhIERPTSBldmVudC5cblx0dmFyIGRvbV9ldmVudCA9IGZ1bmN0aW9uKGUsIG9yaWdfZSl7XG5cdFx0dmFyIGV2ZW50X29iamVjdDtcblx0XHRlID0gZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCAmJiB0aGlzLmRpc3BhdGNoRXZlbnQpIHtcblx0XHRcdC8vIEZpcmVGb3gsIE9wZXJhLCBTYWZhcmksIENocm9tZVxuXHRcdFx0ZSA9IGUucmVwbGFjZShyZV9vbiwgJycpO1xuXHRcdFx0aWYgKGUubWF0Y2gocmVfbW91c2VfZXZlbnRzKSkge1xuXHRcdFx0XHQvLyBUaGlzIGFsbG93cyB0aGUgY2xpY2sgZXZlbnQgdG8gZmlyZSBvbiB0aGUgbm90aWNlLiBUaGVyZSBpc1xuXHRcdFx0XHQvLyBwcm9iYWJseSBhIG11Y2ggYmV0dGVyIHdheSB0byBkbyBpdC5cblx0XHRcdFx0JCh0aGlzKS5vZmZzZXQoKTtcblx0XHRcdFx0ZXZlbnRfb2JqZWN0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdFx0ZXZlbnRfb2JqZWN0LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcdGUsIG9yaWdfZS5idWJibGVzLCBvcmlnX2UuY2FuY2VsYWJsZSwgb3JpZ19lLnZpZXcsIG9yaWdfZS5kZXRhaWwsXG5cdFx0XHRcdFx0b3JpZ19lLnNjcmVlblgsIG9yaWdfZS5zY3JlZW5ZLCBvcmlnX2UuY2xpZW50WCwgb3JpZ19lLmNsaWVudFksXG5cdFx0XHRcdFx0b3JpZ19lLmN0cmxLZXksIG9yaWdfZS5hbHRLZXksIG9yaWdfZS5zaGlmdEtleSwgb3JpZ19lLm1ldGFLZXksIG9yaWdfZS5idXR0b24sIG9yaWdfZS5yZWxhdGVkVGFyZ2V0XG5cdFx0XHRcdCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUubWF0Y2gocmVfdWlfZXZlbnRzKSkge1xuXHRcdFx0XHRldmVudF9vYmplY3QgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIlVJRXZlbnRzXCIpO1xuXHRcdFx0XHRldmVudF9vYmplY3QuaW5pdFVJRXZlbnQoZSwgb3JpZ19lLmJ1YmJsZXMsIG9yaWdfZS5jYW5jZWxhYmxlLCBvcmlnX2Uudmlldywgb3JpZ19lLmRldGFpbCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUubWF0Y2gocmVfaHRtbF9ldmVudHMpKSB7XG5cdFx0XHRcdGV2ZW50X29iamVjdCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiSFRNTEV2ZW50c1wiKTtcblx0XHRcdFx0ZXZlbnRfb2JqZWN0LmluaXRFdmVudChlLCBvcmlnX2UuYnViYmxlcywgb3JpZ19lLmNhbmNlbGFibGUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFldmVudF9vYmplY3QpIHJldHVybjtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudChldmVudF9vYmplY3QpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBJbnRlcm5ldCBFeHBsb3JlclxuXHRcdFx0aWYgKCFlLm1hdGNoKHJlX29uKSkgZSA9IFwib25cIitlO1xuXHRcdFx0ZXZlbnRfb2JqZWN0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3Qob3JpZ19lKTtcblx0XHRcdHRoaXMuZmlyZUV2ZW50KGUsIGV2ZW50X29iamVjdCk7XG5cdFx0fVxuXHR9O1xuXG5cdCQucG5vdGlmeS5kZWZhdWx0cyA9IHtcblx0XHQvLyBUaGUgbm90aWNlJ3MgdGl0bGUuXG5cdFx0dGl0bGU6IGZhbHNlLFxuXHRcdC8vIFdoZXRoZXIgdG8gZXNjYXBlIHRoZSBjb250ZW50IG9mIHRoZSB0aXRsZS4gKE5vdCBhbGxvdyBIVE1MLilcblx0XHR0aXRsZV9lc2NhcGU6IGZhbHNlLFxuXHRcdC8vIFRoZSBub3RpY2UncyB0ZXh0LlxuXHRcdHRleHQ6IGZhbHNlLFxuXHRcdC8vIFdoZXRoZXIgdG8gZXNjYXBlIHRoZSBjb250ZW50IG9mIHRoZSB0ZXh0LiAoTm90IGFsbG93IEhUTUwuKVxuXHRcdHRleHRfZXNjYXBlOiBmYWxzZSxcblx0XHQvLyBXaGF0IHN0eWxpbmcgY2xhc3NlcyB0byB1c2UuIChDYW4gYmUgZWl0aGVyIGpxdWVyeXVpIG9yIGJvb3RzdHJhcC4pXG5cdFx0c3R5bGluZzogXCJib290c3RyYXBcIixcblx0XHQvLyBBZGRpdGlvbmFsIGNsYXNzZXMgdG8gYmUgYWRkZWQgdG8gdGhlIG5vdGljZS4gKEZvciBjdXN0b20gc3R5bGluZy4pXG5cdFx0YWRkY2xhc3M6IFwiXCIsXG5cdFx0Ly8gQ2xhc3MgdG8gYmUgYWRkZWQgdG8gdGhlIG5vdGljZSBmb3IgY29ybmVyIHN0eWxpbmcuXG5cdFx0Y29ybmVyY2xhc3M6IFwiXCIsXG5cdFx0Ly8gQ3JlYXRlIGEgbm9uLWJsb2NraW5nIG5vdGljZS4gSXQgbGV0cyB0aGUgdXNlciBjbGljayBlbGVtZW50cyB1bmRlcm5lYXRoIGl0LlxuXHRcdG5vbmJsb2NrOiBmYWxzZSxcblx0XHQvLyBUaGUgb3BhY2l0eSBvZiB0aGUgbm90aWNlIChpZiBpdCdzIG5vbi1ibG9ja2luZykgd2hlbiB0aGUgbW91c2UgaXMgb3ZlciBpdC5cblx0XHRub25ibG9ja19vcGFjaXR5OiAuMixcblx0XHQvLyBEaXNwbGF5IGEgcHVsbCBkb3duIG1lbnUgdG8gcmVkaXNwbGF5IHByZXZpb3VzIG5vdGljZXMsIGFuZCBwbGFjZSB0aGUgbm90aWNlIGluIHRoZSBoaXN0b3J5LlxuXHRcdGhpc3Rvcnk6IHRydWUsXG5cdFx0Ly8gV2lkdGggb2YgdGhlIG5vdGljZS5cblx0XHR3aWR0aDogXCIzMDBweFwiLFxuXHRcdC8vIE1pbmltdW0gaGVpZ2h0IG9mIHRoZSBub3RpY2UuIEl0IHdpbGwgZXhwYW5kIHRvIGZpdCBjb250ZW50LlxuXHRcdG1pbl9oZWlnaHQ6IFwiMTZweFwiLFxuXHRcdC8vIFR5cGUgb2YgdGhlIG5vdGljZS4gXCJub3RpY2VcIiwgXCJpbmZvXCIsIFwic3VjY2Vzc1wiLCBvciBcImVycm9yXCIuXG5cdFx0dHlwZTogXCJub3RpY2VcIixcblx0XHQvLyBTZXQgaWNvbiB0byB0cnVlIHRvIHVzZSB0aGUgZGVmYXVsdCBpY29uIGZvciB0aGUgc2VsZWN0ZWQgc3R5bGUvdHlwZSwgZmFsc2UgZm9yIG5vIGljb24sIG9yIGEgc3RyaW5nIGZvciB5b3VyIG93biBpY29uIGNsYXNzLlxuXHRcdGljb246IHRydWUsXG5cdFx0Ly8gVGhlIGFuaW1hdGlvbiB0byB1c2Ugd2hlbiBkaXNwbGF5aW5nIGFuZCBoaWRpbmcgdGhlIG5vdGljZS4gXCJub25lXCIsIFwic2hvd1wiLCBcImZhZGVcIiwgYW5kIFwic2xpZGVcIiBhcmUgYnVpbHQgaW4gdG8galF1ZXJ5LiBPdGhlcnMgcmVxdWlyZSBqUXVlcnkgVUkuIFVzZSBhbiBvYmplY3Qgd2l0aCBlZmZlY3RfaW4gYW5kIGVmZmVjdF9vdXQgdG8gdXNlIGRpZmZlcmVudCBlZmZlY3RzLlxuXHRcdGFuaW1hdGlvbjogXCJmYWRlXCIsXG5cdFx0Ly8gU3BlZWQgYXQgd2hpY2ggdGhlIG5vdGljZSBhbmltYXRlcyBpbiBhbmQgb3V0LiBcInNsb3dcIiwgXCJkZWZcIiBvciBcIm5vcm1hbFwiLCBcImZhc3RcIiBvciBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLlxuXHRcdGFuaW1hdGVfc3BlZWQ6IFwic2xvd1wiLFxuXHRcdC8vIE9wYWNpdHkgb2YgdGhlIG5vdGljZS5cblx0XHRvcGFjaXR5OiAxLFxuXHRcdC8vIERpc3BsYXkgYSBkcm9wIHNoYWRvdy5cblx0XHRzaGFkb3c6IHRydWUsXG5cdFx0Ly8gUHJvdmlkZSBhIGJ1dHRvbiBmb3IgdGhlIHVzZXIgdG8gbWFudWFsbHkgY2xvc2UgdGhlIG5vdGljZS5cblx0XHRjbG9zZXI6IHRydWUsXG5cdFx0Ly8gT25seSBzaG93IHRoZSBjbG9zZXIgYnV0dG9uIG9uIGhvdmVyLlxuXHRcdGNsb3Nlcl9ob3ZlcjogdHJ1ZSxcblx0XHQvLyBQcm92aWRlIGEgYnV0dG9uIGZvciB0aGUgdXNlciB0byBtYW51YWxseSBzdGljayB0aGUgbm90aWNlLlxuXHRcdHN0aWNrZXI6IHRydWUsXG5cdFx0Ly8gT25seSBzaG93IHRoZSBzdGlja2VyIGJ1dHRvbiBvbiBob3Zlci5cblx0XHRzdGlja2VyX2hvdmVyOiB0cnVlLFxuXHRcdC8vIEFmdGVyIGEgZGVsYXksIHJlbW92ZSB0aGUgbm90aWNlLlxuXHRcdGhpZGU6IHRydWUsXG5cdFx0Ly8gRGVsYXkgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSB0aGUgbm90aWNlIGlzIHJlbW92ZWQuXG5cdFx0ZGVsYXk6IDgwMDAsXG5cdFx0Ly8gUmVzZXQgdGhlIGhpZGUgdGltZXIgaWYgdGhlIG1vdXNlIG1vdmVzIG92ZXIgdGhlIG5vdGljZS5cblx0XHRtb3VzZV9yZXNldDogdHJ1ZSxcblx0XHQvLyBSZW1vdmUgdGhlIG5vdGljZSdzIGVsZW1lbnRzIGZyb20gdGhlIERPTSBhZnRlciBpdCBpcyByZW1vdmVkLlxuXHRcdHJlbW92ZTogdHJ1ZSxcblx0XHQvLyBDaGFuZ2UgbmV3IGxpbmVzIHRvIGJyIHRhZ3MuXG5cdFx0aW5zZXJ0X2JyczogdHJ1ZSxcblx0XHQvLyBUaGUgc3RhY2sgb24gd2hpY2ggdGhlIG5vdGljZXMgd2lsbCBiZSBwbGFjZWQuIEFsc28gY29udHJvbHMgdGhlIGRpcmVjdGlvbiB0aGUgbm90aWNlcyBzdGFjay5cblx0XHRzdGFjazoge1wiZGlyMVwiOiBcImRvd25cIiwgXCJkaXIyXCI6IFwibGVmdFwiLCBcInB1c2hcIjogXCJib3R0b21cIiwgXCJzcGFjaW5nMVwiOiAyNSwgXCJzcGFjaW5nMlwiOiAyNX1cblx0fTtcbn0pKGpRdWVyeSk7XG47IGJyb3dzZXJpZnlfc2hpbV9fZGVmaW5lX19tb2R1bGVfX2V4cG9ydF9fKHR5cGVvZiBqcXVlcnlfcG5vdGlmeSAhPSBcInVuZGVmaW5lZFwiID8ganF1ZXJ5X3Bub3RpZnkgOiB3aW5kb3cuanF1ZXJ5X3Bub3RpZnkpO1xuXG59KS5jYWxsKGdsb2JhbCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZnVuY3Rpb24gZGVmaW5lRXhwb3J0KGV4KSB7IG1vZHVsZS5leHBvcnRzID0gZXg7IH0pO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
