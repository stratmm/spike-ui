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


},{"./app/routes/home.coffee":14,"./app/stylesheets/app.less":15,"backbone":false,"backbone.marionette":false,"jquery":false}],6:[function(require,module,exports){
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


},{"../database/indexdb.coffee":9,"../models/days_to_ship.coffee":10,"backbone":false,"backbone_indexeddb":27}],7:[function(require,module,exports){
var Backbone, Model;

Backbone = require('backbone');

Backbone.IndexedDB = require('backbone_indexeddb');

window.Database = require('../database/indexdb.coffee');

Model = require('../models/product_type.coffee');

module.exports = Backbone.Collection.extend({
  storeName: 'product_types',
  database: window.Database,
  model: Model
});


},{"../database/indexdb.coffee":9,"../models/product_type.coffee":12,"backbone":false,"backbone_indexeddb":27}],8:[function(require,module,exports){
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


},{"../database/indexdb.coffee":9,"../models/product.coffee":11,"backbone":false,"backbone_indexeddb":27}],9:[function(require,module,exports){
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
    }, {
      version: 4,
      migrate: function(transaction, next) {
        var store;
        store = transaction.db.createObjectStore('product_types', {
          keyPath: "id"
        });
        return next();
      }
    }
  ]
};


},{}],10:[function(require,module,exports){
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


},{"../database/indexdb.coffee":9,"backbone":false,"backbone_indexeddb":27}],11:[function(require,module,exports){
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
    days_to_ship_id: null,
    sentence: "",
    product_type_id: null
  }
});


},{"../database/indexdb.coffee":9,"./days_to_ship.coffee":10,"backbone":false,"backbone_indexeddb":27,"underscore":4}],12:[function(require,module,exports){
var Backbone;

Backbone = require('backbone');

Backbone.IndexedDB = require('backbone_indexeddb');

window.Database = require('../database/indexdb.coffee');

module.exports = Backbone.Model.extend({
  storeName: 'product_types',
  database: window.Database,
  defaults: {
    title: "",
    image_url: ""
  }
});


},{"../database/indexdb.coffee":9,"backbone":false,"backbone_indexeddb":27}],13:[function(require,module,exports){
var Wreqr;

Wreqr = require('backbone.wreqr');

module.exports = new Wreqr.Commands();


},{"backbone.wreqr":1}],14:[function(require,module,exports){
var DaysToShip, Marionette, ProductType, ViewHome;

Marionette = require('backbone.marionette');

ViewHome = require('../views/home/layout.coffee');

DaysToShip = require('../models/days_to_ship.coffee');

ProductType = require('../models/product_type');

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
    new DaysToShip({
      title: "up to two weeks",
      days: 14
    }).save();
    new ProductType({
      title: "Experience"
    }).save();
    new ProductType({
      title: "Physical Product"
    }).save();
    return new ProductType({
      title: "Subscription"
    }).save();
  }
});


},{"../models/days_to_ship.coffee":10,"../models/product_type":12,"../views/home/layout.coffee":16,"backbone.marionette":false}],15:[function(require,module,exports){
var css = "/*! normalize.css v3.0.0 | MIT License | git.io/normalize */\nhtml {\n  font-family: sans-serif;\n  -ms-text-size-adjust: 100%;\n  -webkit-text-size-adjust: 100%;\n}\nbody {\n  margin: 0;\n}\narticle,\naside,\ndetails,\nfigcaption,\nfigure,\nfooter,\nheader,\nhgroup,\nmain,\nnav,\nsection,\nsummary {\n  display: block;\n}\naudio,\ncanvas,\nprogress,\nvideo {\n  display: inline-block;\n  vertical-align: baseline;\n}\naudio:not([controls]) {\n  display: none;\n  height: 0;\n}\n[hidden],\ntemplate {\n  display: none;\n}\na {\n  background: transparent;\n}\na:active,\na:hover {\n  outline: 0;\n}\nabbr[title] {\n  border-bottom: 1px dotted;\n}\nb,\nstrong {\n  font-weight: bold;\n}\ndfn {\n  font-style: italic;\n}\nh1 {\n  font-size: 2em;\n  margin: 0.67em 0;\n}\nmark {\n  background: #ff0;\n  color: #000;\n}\nsmall {\n  font-size: 80%;\n}\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\nsup {\n  top: -0.5em;\n}\nsub {\n  bottom: -0.25em;\n}\nimg {\n  border: 0;\n}\nsvg:not(:root) {\n  overflow: hidden;\n}\nfigure {\n  margin: 1em 40px;\n}\nhr {\n  -moz-box-sizing: content-box;\n  box-sizing: content-box;\n  height: 0;\n}\npre {\n  overflow: auto;\n}\ncode,\nkbd,\npre,\nsamp {\n  font-family: monospace, monospace;\n  font-size: 1em;\n}\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  color: inherit;\n  font: inherit;\n  margin: 0;\n}\nbutton {\n  overflow: visible;\n}\nbutton,\nselect {\n  text-transform: none;\n}\nbutton,\nhtml input[type=\"button\"],\ninput[type=\"reset\"],\ninput[type=\"submit\"] {\n  -webkit-appearance: button;\n  cursor: pointer;\n}\nbutton[disabled],\nhtml input[disabled] {\n  cursor: default;\n}\nbutton::-moz-focus-inner,\ninput::-moz-focus-inner {\n  border: 0;\n  padding: 0;\n}\ninput {\n  line-height: normal;\n}\ninput[type=\"checkbox\"],\ninput[type=\"radio\"] {\n  box-sizing: border-box;\n  padding: 0;\n}\ninput[type=\"number\"]::-webkit-inner-spin-button,\ninput[type=\"number\"]::-webkit-outer-spin-button {\n  height: auto;\n}\ninput[type=\"search\"] {\n  -webkit-appearance: textfield;\n  -moz-box-sizing: content-box;\n  -webkit-box-sizing: content-box;\n  box-sizing: content-box;\n}\ninput[type=\"search\"]::-webkit-search-cancel-button,\ninput[type=\"search\"]::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\nfieldset {\n  border: 1px solid #c0c0c0;\n  margin: 0 2px;\n  padding: 0.35em 0.625em 0.75em;\n}\nlegend {\n  border: 0;\n  padding: 0;\n}\ntextarea {\n  overflow: auto;\n}\noptgroup {\n  font-weight: bold;\n}\ntable {\n  border-collapse: collapse;\n  border-spacing: 0;\n}\ntd,\nth {\n  padding: 0;\n}\n@media print {\n  * {\n    text-shadow: none !important;\n    color: #000 !important;\n    background: transparent !important;\n    box-shadow: none !important;\n  }\n  a,\n  a:visited {\n    text-decoration: underline;\n  }\n  a[href]:after {\n    content: \" (\" attr(href) \")\";\n  }\n  abbr[title]:after {\n    content: \" (\" attr(title) \")\";\n  }\n  a[href^=\"javascript:\"]:after,\n  a[href^=\"#\"]:after {\n    content: \"\";\n  }\n  pre,\n  blockquote {\n    border: 1px solid #999;\n    page-break-inside: avoid;\n  }\n  thead {\n    display: table-header-group;\n  }\n  tr,\n  img {\n    page-break-inside: avoid;\n  }\n  img {\n    max-width: 100% !important;\n  }\n  p,\n  h2,\n  h3 {\n    orphans: 3;\n    widows: 3;\n  }\n  h2,\n  h3 {\n    page-break-after: avoid;\n  }\n  select {\n    background: #fff !important;\n  }\n  .navbar {\n    display: none;\n  }\n  .table td,\n  .table th {\n    background-color: #fff !important;\n  }\n  .btn > .caret,\n  .dropup > .btn > .caret {\n    border-top-color: #000 !important;\n  }\n  .label {\n    border: 1px solid #000;\n  }\n  .table {\n    border-collapse: collapse !important;\n  }\n  .table-bordered th,\n  .table-bordered td {\n    border: 1px solid #ddd !important;\n  }\n}\n* {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n}\n*:before,\n*:after {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n}\nhtml {\n  font-size: 62.5%;\n  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n}\nbody {\n  font-family: \"Helvetica Neue\", Helvetica, Arial, sans-serif;\n  font-size: 14px;\n  line-height: 1.42857143;\n  color: #333333;\n  background-color: #ffffff;\n}\ninput,\nbutton,\nselect,\ntextarea {\n  font-family: inherit;\n  font-size: inherit;\n  line-height: inherit;\n}\na {\n  color: #428bca;\n  text-decoration: none;\n}\na:hover,\na:focus {\n  color: #2a6496;\n  text-decoration: underline;\n}\na:focus {\n  outline: thin dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\nfigure {\n  margin: 0;\n}\nimg {\n  vertical-align: middle;\n}\n.img-responsive,\n.thumbnail > img,\n.thumbnail a > img,\n.carousel-inner > .item > img,\n.carousel-inner > .item > a > img {\n  display: block;\n  max-width: 100%;\n  height: auto;\n}\n.img-rounded {\n  border-radius: 6px;\n}\n.img-thumbnail {\n  padding: 4px;\n  line-height: 1.42857143;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-radius: 4px;\n  -webkit-transition: all 0.2s ease-in-out;\n  transition: all 0.2s ease-in-out;\n  display: inline-block;\n  max-width: 100%;\n  height: auto;\n}\n.img-circle {\n  border-radius: 50%;\n}\nhr {\n  margin-top: 20px;\n  margin-bottom: 20px;\n  border: 0;\n  border-top: 1px solid #eeeeee;\n}\n.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  border: 0;\n}\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\n.h1,\n.h2,\n.h3,\n.h4,\n.h5,\n.h6 {\n  font-family: inherit;\n  font-weight: 500;\n  line-height: 1.1;\n  color: inherit;\n}\nh1 small,\nh2 small,\nh3 small,\nh4 small,\nh5 small,\nh6 small,\n.h1 small,\n.h2 small,\n.h3 small,\n.h4 small,\n.h5 small,\n.h6 small,\nh1 .small,\nh2 .small,\nh3 .small,\nh4 .small,\nh5 .small,\nh6 .small,\n.h1 .small,\n.h2 .small,\n.h3 .small,\n.h4 .small,\n.h5 .small,\n.h6 .small {\n  font-weight: normal;\n  line-height: 1;\n  color: #999999;\n}\nh1,\n.h1,\nh2,\n.h2,\nh3,\n.h3 {\n  margin-top: 20px;\n  margin-bottom: 10px;\n}\nh1 small,\n.h1 small,\nh2 small,\n.h2 small,\nh3 small,\n.h3 small,\nh1 .small,\n.h1 .small,\nh2 .small,\n.h2 .small,\nh3 .small,\n.h3 .small {\n  font-size: 65%;\n}\nh4,\n.h4,\nh5,\n.h5,\nh6,\n.h6 {\n  margin-top: 10px;\n  margin-bottom: 10px;\n}\nh4 small,\n.h4 small,\nh5 small,\n.h5 small,\nh6 small,\n.h6 small,\nh4 .small,\n.h4 .small,\nh5 .small,\n.h5 .small,\nh6 .small,\n.h6 .small {\n  font-size: 75%;\n}\nh1,\n.h1 {\n  font-size: 36px;\n}\nh2,\n.h2 {\n  font-size: 30px;\n}\nh3,\n.h3 {\n  font-size: 24px;\n}\nh4,\n.h4 {\n  font-size: 18px;\n}\nh5,\n.h5 {\n  font-size: 14px;\n}\nh6,\n.h6 {\n  font-size: 12px;\n}\np {\n  margin: 0 0 10px;\n}\n.lead {\n  margin-bottom: 20px;\n  font-size: 16px;\n  font-weight: 200;\n  line-height: 1.4;\n}\n@media (min-width: 768px) {\n  .lead {\n    font-size: 21px;\n  }\n}\nsmall,\n.small {\n  font-size: 85%;\n}\ncite {\n  font-style: normal;\n}\n.text-left {\n  text-align: left;\n}\n.text-right {\n  text-align: right;\n}\n.text-center {\n  text-align: center;\n}\n.text-justify {\n  text-align: justify;\n}\n.text-muted {\n  color: #999999;\n}\n.text-primary {\n  color: #428bca;\n}\na.text-primary:hover {\n  color: #3071a9;\n}\n.text-success {\n  color: #3c763d;\n}\na.text-success:hover {\n  color: #2b542c;\n}\n.text-info {\n  color: #31708f;\n}\na.text-info:hover {\n  color: #245269;\n}\n.text-warning {\n  color: #8a6d3b;\n}\na.text-warning:hover {\n  color: #66512c;\n}\n.text-danger {\n  color: #a94442;\n}\na.text-danger:hover {\n  color: #843534;\n}\n.bg-primary {\n  color: #fff;\n  background-color: #428bca;\n}\na.bg-primary:hover {\n  background-color: #3071a9;\n}\n.bg-success {\n  background-color: #dff0d8;\n}\na.bg-success:hover {\n  background-color: #c1e2b3;\n}\n.bg-info {\n  background-color: #d9edf7;\n}\na.bg-info:hover {\n  background-color: #afd9ee;\n}\n.bg-warning {\n  background-color: #fcf8e3;\n}\na.bg-warning:hover {\n  background-color: #f7ecb5;\n}\n.bg-danger {\n  background-color: #f2dede;\n}\na.bg-danger:hover {\n  background-color: #e4b9b9;\n}\n.page-header {\n  padding-bottom: 9px;\n  margin: 40px 0 20px;\n  border-bottom: 1px solid #eeeeee;\n}\nul,\nol {\n  margin-top: 0;\n  margin-bottom: 10px;\n}\nul ul,\nol ul,\nul ol,\nol ol {\n  margin-bottom: 0;\n}\n.list-unstyled {\n  padding-left: 0;\n  list-style: none;\n}\n.list-inline {\n  padding-left: 0;\n  list-style: none;\n  margin-left: -5px;\n}\n.list-inline > li {\n  display: inline-block;\n  padding-left: 5px;\n  padding-right: 5px;\n}\ndl {\n  margin-top: 0;\n  margin-bottom: 20px;\n}\ndt,\ndd {\n  line-height: 1.42857143;\n}\ndt {\n  font-weight: bold;\n}\ndd {\n  margin-left: 0;\n}\n@media (min-width: 768px) {\n  .dl-horizontal dt {\n    float: left;\n    width: 160px;\n    clear: left;\n    text-align: right;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  .dl-horizontal dd {\n    margin-left: 180px;\n  }\n}\nabbr[title],\nabbr[data-original-title] {\n  cursor: help;\n  border-bottom: 1px dotted #999999;\n}\n.initialism {\n  font-size: 90%;\n  text-transform: uppercase;\n}\nblockquote {\n  padding: 10px 20px;\n  margin: 0 0 20px;\n  font-size: 17.5px;\n  border-left: 5px solid #eeeeee;\n}\nblockquote p:last-child,\nblockquote ul:last-child,\nblockquote ol:last-child {\n  margin-bottom: 0;\n}\nblockquote footer,\nblockquote small,\nblockquote .small {\n  display: block;\n  font-size: 80%;\n  line-height: 1.42857143;\n  color: #999999;\n}\nblockquote footer:before,\nblockquote small:before,\nblockquote .small:before {\n  content: '\\2014 \\00A0';\n}\n.blockquote-reverse,\nblockquote.pull-right {\n  padding-right: 15px;\n  padding-left: 0;\n  border-right: 5px solid #eeeeee;\n  border-left: 0;\n  text-align: right;\n}\n.blockquote-reverse footer:before,\nblockquote.pull-right footer:before,\n.blockquote-reverse small:before,\nblockquote.pull-right small:before,\n.blockquote-reverse .small:before,\nblockquote.pull-right .small:before {\n  content: '';\n}\n.blockquote-reverse footer:after,\nblockquote.pull-right footer:after,\n.blockquote-reverse small:after,\nblockquote.pull-right small:after,\n.blockquote-reverse .small:after,\nblockquote.pull-right .small:after {\n  content: '\\00A0 \\2014';\n}\nblockquote:before,\nblockquote:after {\n  content: \"\";\n}\naddress {\n  margin-bottom: 20px;\n  font-style: normal;\n  line-height: 1.42857143;\n}\ncode,\nkbd,\npre,\nsamp {\n  font-family: Menlo, Monaco, Consolas, \"Courier New\", monospace;\n}\ncode {\n  padding: 2px 4px;\n  font-size: 90%;\n  color: #c7254e;\n  background-color: #f9f2f4;\n  white-space: nowrap;\n  border-radius: 4px;\n}\nkbd {\n  padding: 2px 4px;\n  font-size: 90%;\n  color: #ffffff;\n  background-color: #333333;\n  border-radius: 3px;\n  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);\n}\npre {\n  display: block;\n  padding: 9.5px;\n  margin: 0 0 10px;\n  font-size: 13px;\n  line-height: 1.42857143;\n  word-break: break-all;\n  word-wrap: break-word;\n  color: #333333;\n  background-color: #f5f5f5;\n  border: 1px solid #cccccc;\n  border-radius: 4px;\n}\npre code {\n  padding: 0;\n  font-size: inherit;\n  color: inherit;\n  white-space: pre-wrap;\n  background-color: transparent;\n  border-radius: 0;\n}\n.pre-scrollable {\n  max-height: 340px;\n  overflow-y: scroll;\n}\n.container {\n  margin-right: auto;\n  margin-left: auto;\n  padding-left: 15px;\n  padding-right: 15px;\n}\n@media (min-width: 768px) {\n  .container {\n    width: 750px;\n  }\n}\n@media (min-width: 992px) {\n  .container {\n    width: 970px;\n  }\n}\n@media (min-width: 1200px) {\n  .container {\n    width: 1170px;\n  }\n}\n.container-fluid {\n  margin-right: auto;\n  margin-left: auto;\n  padding-left: 15px;\n  padding-right: 15px;\n}\n.row {\n  margin-left: -15px;\n  margin-right: -15px;\n}\n.col-xs-1, .col-sm-1, .col-md-1, .col-lg-1, .col-xs-2, .col-sm-2, .col-md-2, .col-lg-2, .col-xs-3, .col-sm-3, .col-md-3, .col-lg-3, .col-xs-4, .col-sm-4, .col-md-4, .col-lg-4, .col-xs-5, .col-sm-5, .col-md-5, .col-lg-5, .col-xs-6, .col-sm-6, .col-md-6, .col-lg-6, .col-xs-7, .col-sm-7, .col-md-7, .col-lg-7, .col-xs-8, .col-sm-8, .col-md-8, .col-lg-8, .col-xs-9, .col-sm-9, .col-md-9, .col-lg-9, .col-xs-10, .col-sm-10, .col-md-10, .col-lg-10, .col-xs-11, .col-sm-11, .col-md-11, .col-lg-11, .col-xs-12, .col-sm-12, .col-md-12, .col-lg-12 {\n  position: relative;\n  min-height: 1px;\n  padding-left: 15px;\n  padding-right: 15px;\n}\n.col-xs-1, .col-xs-2, .col-xs-3, .col-xs-4, .col-xs-5, .col-xs-6, .col-xs-7, .col-xs-8, .col-xs-9, .col-xs-10, .col-xs-11, .col-xs-12 {\n  float: left;\n}\n.col-xs-12 {\n  width: 100%;\n}\n.col-xs-11 {\n  width: 91.66666667%;\n}\n.col-xs-10 {\n  width: 83.33333333%;\n}\n.col-xs-9 {\n  width: 75%;\n}\n.col-xs-8 {\n  width: 66.66666667%;\n}\n.col-xs-7 {\n  width: 58.33333333%;\n}\n.col-xs-6 {\n  width: 50%;\n}\n.col-xs-5 {\n  width: 41.66666667%;\n}\n.col-xs-4 {\n  width: 33.33333333%;\n}\n.col-xs-3 {\n  width: 25%;\n}\n.col-xs-2 {\n  width: 16.66666667%;\n}\n.col-xs-1 {\n  width: 8.33333333%;\n}\n.col-xs-pull-12 {\n  right: 100%;\n}\n.col-xs-pull-11 {\n  right: 91.66666667%;\n}\n.col-xs-pull-10 {\n  right: 83.33333333%;\n}\n.col-xs-pull-9 {\n  right: 75%;\n}\n.col-xs-pull-8 {\n  right: 66.66666667%;\n}\n.col-xs-pull-7 {\n  right: 58.33333333%;\n}\n.col-xs-pull-6 {\n  right: 50%;\n}\n.col-xs-pull-5 {\n  right: 41.66666667%;\n}\n.col-xs-pull-4 {\n  right: 33.33333333%;\n}\n.col-xs-pull-3 {\n  right: 25%;\n}\n.col-xs-pull-2 {\n  right: 16.66666667%;\n}\n.col-xs-pull-1 {\n  right: 8.33333333%;\n}\n.col-xs-pull-0 {\n  right: 0%;\n}\n.col-xs-push-12 {\n  left: 100%;\n}\n.col-xs-push-11 {\n  left: 91.66666667%;\n}\n.col-xs-push-10 {\n  left: 83.33333333%;\n}\n.col-xs-push-9 {\n  left: 75%;\n}\n.col-xs-push-8 {\n  left: 66.66666667%;\n}\n.col-xs-push-7 {\n  left: 58.33333333%;\n}\n.col-xs-push-6 {\n  left: 50%;\n}\n.col-xs-push-5 {\n  left: 41.66666667%;\n}\n.col-xs-push-4 {\n  left: 33.33333333%;\n}\n.col-xs-push-3 {\n  left: 25%;\n}\n.col-xs-push-2 {\n  left: 16.66666667%;\n}\n.col-xs-push-1 {\n  left: 8.33333333%;\n}\n.col-xs-push-0 {\n  left: 0%;\n}\n.col-xs-offset-12 {\n  margin-left: 100%;\n}\n.col-xs-offset-11 {\n  margin-left: 91.66666667%;\n}\n.col-xs-offset-10 {\n  margin-left: 83.33333333%;\n}\n.col-xs-offset-9 {\n  margin-left: 75%;\n}\n.col-xs-offset-8 {\n  margin-left: 66.66666667%;\n}\n.col-xs-offset-7 {\n  margin-left: 58.33333333%;\n}\n.col-xs-offset-6 {\n  margin-left: 50%;\n}\n.col-xs-offset-5 {\n  margin-left: 41.66666667%;\n}\n.col-xs-offset-4 {\n  margin-left: 33.33333333%;\n}\n.col-xs-offset-3 {\n  margin-left: 25%;\n}\n.col-xs-offset-2 {\n  margin-left: 16.66666667%;\n}\n.col-xs-offset-1 {\n  margin-left: 8.33333333%;\n}\n.col-xs-offset-0 {\n  margin-left: 0%;\n}\n@media (min-width: 768px) {\n  .col-sm-1, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6, .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-10, .col-sm-11, .col-sm-12 {\n    float: left;\n  }\n  .col-sm-12 {\n    width: 100%;\n  }\n  .col-sm-11 {\n    width: 91.66666667%;\n  }\n  .col-sm-10 {\n    width: 83.33333333%;\n  }\n  .col-sm-9 {\n    width: 75%;\n  }\n  .col-sm-8 {\n    width: 66.66666667%;\n  }\n  .col-sm-7 {\n    width: 58.33333333%;\n  }\n  .col-sm-6 {\n    width: 50%;\n  }\n  .col-sm-5 {\n    width: 41.66666667%;\n  }\n  .col-sm-4 {\n    width: 33.33333333%;\n  }\n  .col-sm-3 {\n    width: 25%;\n  }\n  .col-sm-2 {\n    width: 16.66666667%;\n  }\n  .col-sm-1 {\n    width: 8.33333333%;\n  }\n  .col-sm-pull-12 {\n    right: 100%;\n  }\n  .col-sm-pull-11 {\n    right: 91.66666667%;\n  }\n  .col-sm-pull-10 {\n    right: 83.33333333%;\n  }\n  .col-sm-pull-9 {\n    right: 75%;\n  }\n  .col-sm-pull-8 {\n    right: 66.66666667%;\n  }\n  .col-sm-pull-7 {\n    right: 58.33333333%;\n  }\n  .col-sm-pull-6 {\n    right: 50%;\n  }\n  .col-sm-pull-5 {\n    right: 41.66666667%;\n  }\n  .col-sm-pull-4 {\n    right: 33.33333333%;\n  }\n  .col-sm-pull-3 {\n    right: 25%;\n  }\n  .col-sm-pull-2 {\n    right: 16.66666667%;\n  }\n  .col-sm-pull-1 {\n    right: 8.33333333%;\n  }\n  .col-sm-pull-0 {\n    right: 0%;\n  }\n  .col-sm-push-12 {\n    left: 100%;\n  }\n  .col-sm-push-11 {\n    left: 91.66666667%;\n  }\n  .col-sm-push-10 {\n    left: 83.33333333%;\n  }\n  .col-sm-push-9 {\n    left: 75%;\n  }\n  .col-sm-push-8 {\n    left: 66.66666667%;\n  }\n  .col-sm-push-7 {\n    left: 58.33333333%;\n  }\n  .col-sm-push-6 {\n    left: 50%;\n  }\n  .col-sm-push-5 {\n    left: 41.66666667%;\n  }\n  .col-sm-push-4 {\n    left: 33.33333333%;\n  }\n  .col-sm-push-3 {\n    left: 25%;\n  }\n  .col-sm-push-2 {\n    left: 16.66666667%;\n  }\n  .col-sm-push-1 {\n    left: 8.33333333%;\n  }\n  .col-sm-push-0 {\n    left: 0%;\n  }\n  .col-sm-offset-12 {\n    margin-left: 100%;\n  }\n  .col-sm-offset-11 {\n    margin-left: 91.66666667%;\n  }\n  .col-sm-offset-10 {\n    margin-left: 83.33333333%;\n  }\n  .col-sm-offset-9 {\n    margin-left: 75%;\n  }\n  .col-sm-offset-8 {\n    margin-left: 66.66666667%;\n  }\n  .col-sm-offset-7 {\n    margin-left: 58.33333333%;\n  }\n  .col-sm-offset-6 {\n    margin-left: 50%;\n  }\n  .col-sm-offset-5 {\n    margin-left: 41.66666667%;\n  }\n  .col-sm-offset-4 {\n    margin-left: 33.33333333%;\n  }\n  .col-sm-offset-3 {\n    margin-left: 25%;\n  }\n  .col-sm-offset-2 {\n    margin-left: 16.66666667%;\n  }\n  .col-sm-offset-1 {\n    margin-left: 8.33333333%;\n  }\n  .col-sm-offset-0 {\n    margin-left: 0%;\n  }\n}\n@media (min-width: 992px) {\n  .col-md-1, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-7, .col-md-8, .col-md-9, .col-md-10, .col-md-11, .col-md-12 {\n    float: left;\n  }\n  .col-md-12 {\n    width: 100%;\n  }\n  .col-md-11 {\n    width: 91.66666667%;\n  }\n  .col-md-10 {\n    width: 83.33333333%;\n  }\n  .col-md-9 {\n    width: 75%;\n  }\n  .col-md-8 {\n    width: 66.66666667%;\n  }\n  .col-md-7 {\n    width: 58.33333333%;\n  }\n  .col-md-6 {\n    width: 50%;\n  }\n  .col-md-5 {\n    width: 41.66666667%;\n  }\n  .col-md-4 {\n    width: 33.33333333%;\n  }\n  .col-md-3 {\n    width: 25%;\n  }\n  .col-md-2 {\n    width: 16.66666667%;\n  }\n  .col-md-1 {\n    width: 8.33333333%;\n  }\n  .col-md-pull-12 {\n    right: 100%;\n  }\n  .col-md-pull-11 {\n    right: 91.66666667%;\n  }\n  .col-md-pull-10 {\n    right: 83.33333333%;\n  }\n  .col-md-pull-9 {\n    right: 75%;\n  }\n  .col-md-pull-8 {\n    right: 66.66666667%;\n  }\n  .col-md-pull-7 {\n    right: 58.33333333%;\n  }\n  .col-md-pull-6 {\n    right: 50%;\n  }\n  .col-md-pull-5 {\n    right: 41.66666667%;\n  }\n  .col-md-pull-4 {\n    right: 33.33333333%;\n  }\n  .col-md-pull-3 {\n    right: 25%;\n  }\n  .col-md-pull-2 {\n    right: 16.66666667%;\n  }\n  .col-md-pull-1 {\n    right: 8.33333333%;\n  }\n  .col-md-pull-0 {\n    right: 0%;\n  }\n  .col-md-push-12 {\n    left: 100%;\n  }\n  .col-md-push-11 {\n    left: 91.66666667%;\n  }\n  .col-md-push-10 {\n    left: 83.33333333%;\n  }\n  .col-md-push-9 {\n    left: 75%;\n  }\n  .col-md-push-8 {\n    left: 66.66666667%;\n  }\n  .col-md-push-7 {\n    left: 58.33333333%;\n  }\n  .col-md-push-6 {\n    left: 50%;\n  }\n  .col-md-push-5 {\n    left: 41.66666667%;\n  }\n  .col-md-push-4 {\n    left: 33.33333333%;\n  }\n  .col-md-push-3 {\n    left: 25%;\n  }\n  .col-md-push-2 {\n    left: 16.66666667%;\n  }\n  .col-md-push-1 {\n    left: 8.33333333%;\n  }\n  .col-md-push-0 {\n    left: 0%;\n  }\n  .col-md-offset-12 {\n    margin-left: 100%;\n  }\n  .col-md-offset-11 {\n    margin-left: 91.66666667%;\n  }\n  .col-md-offset-10 {\n    margin-left: 83.33333333%;\n  }\n  .col-md-offset-9 {\n    margin-left: 75%;\n  }\n  .col-md-offset-8 {\n    margin-left: 66.66666667%;\n  }\n  .col-md-offset-7 {\n    margin-left: 58.33333333%;\n  }\n  .col-md-offset-6 {\n    margin-left: 50%;\n  }\n  .col-md-offset-5 {\n    margin-left: 41.66666667%;\n  }\n  .col-md-offset-4 {\n    margin-left: 33.33333333%;\n  }\n  .col-md-offset-3 {\n    margin-left: 25%;\n  }\n  .col-md-offset-2 {\n    margin-left: 16.66666667%;\n  }\n  .col-md-offset-1 {\n    margin-left: 8.33333333%;\n  }\n  .col-md-offset-0 {\n    margin-left: 0%;\n  }\n}\n@media (min-width: 1200px) {\n  .col-lg-1, .col-lg-2, .col-lg-3, .col-lg-4, .col-lg-5, .col-lg-6, .col-lg-7, .col-lg-8, .col-lg-9, .col-lg-10, .col-lg-11, .col-lg-12 {\n    float: left;\n  }\n  .col-lg-12 {\n    width: 100%;\n  }\n  .col-lg-11 {\n    width: 91.66666667%;\n  }\n  .col-lg-10 {\n    width: 83.33333333%;\n  }\n  .col-lg-9 {\n    width: 75%;\n  }\n  .col-lg-8 {\n    width: 66.66666667%;\n  }\n  .col-lg-7 {\n    width: 58.33333333%;\n  }\n  .col-lg-6 {\n    width: 50%;\n  }\n  .col-lg-5 {\n    width: 41.66666667%;\n  }\n  .col-lg-4 {\n    width: 33.33333333%;\n  }\n  .col-lg-3 {\n    width: 25%;\n  }\n  .col-lg-2 {\n    width: 16.66666667%;\n  }\n  .col-lg-1 {\n    width: 8.33333333%;\n  }\n  .col-lg-pull-12 {\n    right: 100%;\n  }\n  .col-lg-pull-11 {\n    right: 91.66666667%;\n  }\n  .col-lg-pull-10 {\n    right: 83.33333333%;\n  }\n  .col-lg-pull-9 {\n    right: 75%;\n  }\n  .col-lg-pull-8 {\n    right: 66.66666667%;\n  }\n  .col-lg-pull-7 {\n    right: 58.33333333%;\n  }\n  .col-lg-pull-6 {\n    right: 50%;\n  }\n  .col-lg-pull-5 {\n    right: 41.66666667%;\n  }\n  .col-lg-pull-4 {\n    right: 33.33333333%;\n  }\n  .col-lg-pull-3 {\n    right: 25%;\n  }\n  .col-lg-pull-2 {\n    right: 16.66666667%;\n  }\n  .col-lg-pull-1 {\n    right: 8.33333333%;\n  }\n  .col-lg-pull-0 {\n    right: 0%;\n  }\n  .col-lg-push-12 {\n    left: 100%;\n  }\n  .col-lg-push-11 {\n    left: 91.66666667%;\n  }\n  .col-lg-push-10 {\n    left: 83.33333333%;\n  }\n  .col-lg-push-9 {\n    left: 75%;\n  }\n  .col-lg-push-8 {\n    left: 66.66666667%;\n  }\n  .col-lg-push-7 {\n    left: 58.33333333%;\n  }\n  .col-lg-push-6 {\n    left: 50%;\n  }\n  .col-lg-push-5 {\n    left: 41.66666667%;\n  }\n  .col-lg-push-4 {\n    left: 33.33333333%;\n  }\n  .col-lg-push-3 {\n    left: 25%;\n  }\n  .col-lg-push-2 {\n    left: 16.66666667%;\n  }\n  .col-lg-push-1 {\n    left: 8.33333333%;\n  }\n  .col-lg-push-0 {\n    left: 0%;\n  }\n  .col-lg-offset-12 {\n    margin-left: 100%;\n  }\n  .col-lg-offset-11 {\n    margin-left: 91.66666667%;\n  }\n  .col-lg-offset-10 {\n    margin-left: 83.33333333%;\n  }\n  .col-lg-offset-9 {\n    margin-left: 75%;\n  }\n  .col-lg-offset-8 {\n    margin-left: 66.66666667%;\n  }\n  .col-lg-offset-7 {\n    margin-left: 58.33333333%;\n  }\n  .col-lg-offset-6 {\n    margin-left: 50%;\n  }\n  .col-lg-offset-5 {\n    margin-left: 41.66666667%;\n  }\n  .col-lg-offset-4 {\n    margin-left: 33.33333333%;\n  }\n  .col-lg-offset-3 {\n    margin-left: 25%;\n  }\n  .col-lg-offset-2 {\n    margin-left: 16.66666667%;\n  }\n  .col-lg-offset-1 {\n    margin-left: 8.33333333%;\n  }\n  .col-lg-offset-0 {\n    margin-left: 0%;\n  }\n}\ntable {\n  max-width: 100%;\n  background-color: transparent;\n}\nth {\n  text-align: left;\n}\n.table {\n  width: 100%;\n  margin-bottom: 20px;\n}\n.table > thead > tr > th,\n.table > tbody > tr > th,\n.table > tfoot > tr > th,\n.table > thead > tr > td,\n.table > tbody > tr > td,\n.table > tfoot > tr > td {\n  padding: 8px;\n  line-height: 1.42857143;\n  vertical-align: top;\n  border-top: 1px solid #dddddd;\n}\n.table > thead > tr > th {\n  vertical-align: bottom;\n  border-bottom: 2px solid #dddddd;\n}\n.table > caption + thead > tr:first-child > th,\n.table > colgroup + thead > tr:first-child > th,\n.table > thead:first-child > tr:first-child > th,\n.table > caption + thead > tr:first-child > td,\n.table > colgroup + thead > tr:first-child > td,\n.table > thead:first-child > tr:first-child > td {\n  border-top: 0;\n}\n.table > tbody + tbody {\n  border-top: 2px solid #dddddd;\n}\n.table .table {\n  background-color: #ffffff;\n}\n.table-condensed > thead > tr > th,\n.table-condensed > tbody > tr > th,\n.table-condensed > tfoot > tr > th,\n.table-condensed > thead > tr > td,\n.table-condensed > tbody > tr > td,\n.table-condensed > tfoot > tr > td {\n  padding: 5px;\n}\n.table-bordered {\n  border: 1px solid #dddddd;\n}\n.table-bordered > thead > tr > th,\n.table-bordered > tbody > tr > th,\n.table-bordered > tfoot > tr > th,\n.table-bordered > thead > tr > td,\n.table-bordered > tbody > tr > td,\n.table-bordered > tfoot > tr > td {\n  border: 1px solid #dddddd;\n}\n.table-bordered > thead > tr > th,\n.table-bordered > thead > tr > td {\n  border-bottom-width: 2px;\n}\n.table-striped > tbody > tr:nth-child(odd) > td,\n.table-striped > tbody > tr:nth-child(odd) > th {\n  background-color: #f9f9f9;\n}\n.table-hover > tbody > tr:hover > td,\n.table-hover > tbody > tr:hover > th {\n  background-color: #f5f5f5;\n}\ntable col[class*=\"col-\"] {\n  position: static;\n  float: none;\n  display: table-column;\n}\ntable td[class*=\"col-\"],\ntable th[class*=\"col-\"] {\n  position: static;\n  float: none;\n  display: table-cell;\n}\n.table > thead > tr > td.active,\n.table > tbody > tr > td.active,\n.table > tfoot > tr > td.active,\n.table > thead > tr > th.active,\n.table > tbody > tr > th.active,\n.table > tfoot > tr > th.active,\n.table > thead > tr.active > td,\n.table > tbody > tr.active > td,\n.table > tfoot > tr.active > td,\n.table > thead > tr.active > th,\n.table > tbody > tr.active > th,\n.table > tfoot > tr.active > th {\n  background-color: #f5f5f5;\n}\n.table-hover > tbody > tr > td.active:hover,\n.table-hover > tbody > tr > th.active:hover,\n.table-hover > tbody > tr.active:hover > td,\n.table-hover > tbody > tr.active:hover > th {\n  background-color: #e8e8e8;\n}\n.table > thead > tr > td.success,\n.table > tbody > tr > td.success,\n.table > tfoot > tr > td.success,\n.table > thead > tr > th.success,\n.table > tbody > tr > th.success,\n.table > tfoot > tr > th.success,\n.table > thead > tr.success > td,\n.table > tbody > tr.success > td,\n.table > tfoot > tr.success > td,\n.table > thead > tr.success > th,\n.table > tbody > tr.success > th,\n.table > tfoot > tr.success > th {\n  background-color: #dff0d8;\n}\n.table-hover > tbody > tr > td.success:hover,\n.table-hover > tbody > tr > th.success:hover,\n.table-hover > tbody > tr.success:hover > td,\n.table-hover > tbody > tr.success:hover > th {\n  background-color: #d0e9c6;\n}\n.table > thead > tr > td.info,\n.table > tbody > tr > td.info,\n.table > tfoot > tr > td.info,\n.table > thead > tr > th.info,\n.table > tbody > tr > th.info,\n.table > tfoot > tr > th.info,\n.table > thead > tr.info > td,\n.table > tbody > tr.info > td,\n.table > tfoot > tr.info > td,\n.table > thead > tr.info > th,\n.table > tbody > tr.info > th,\n.table > tfoot > tr.info > th {\n  background-color: #d9edf7;\n}\n.table-hover > tbody > tr > td.info:hover,\n.table-hover > tbody > tr > th.info:hover,\n.table-hover > tbody > tr.info:hover > td,\n.table-hover > tbody > tr.info:hover > th {\n  background-color: #c4e3f3;\n}\n.table > thead > tr > td.warning,\n.table > tbody > tr > td.warning,\n.table > tfoot > tr > td.warning,\n.table > thead > tr > th.warning,\n.table > tbody > tr > th.warning,\n.table > tfoot > tr > th.warning,\n.table > thead > tr.warning > td,\n.table > tbody > tr.warning > td,\n.table > tfoot > tr.warning > td,\n.table > thead > tr.warning > th,\n.table > tbody > tr.warning > th,\n.table > tfoot > tr.warning > th {\n  background-color: #fcf8e3;\n}\n.table-hover > tbody > tr > td.warning:hover,\n.table-hover > tbody > tr > th.warning:hover,\n.table-hover > tbody > tr.warning:hover > td,\n.table-hover > tbody > tr.warning:hover > th {\n  background-color: #faf2cc;\n}\n.table > thead > tr > td.danger,\n.table > tbody > tr > td.danger,\n.table > tfoot > tr > td.danger,\n.table > thead > tr > th.danger,\n.table > tbody > tr > th.danger,\n.table > tfoot > tr > th.danger,\n.table > thead > tr.danger > td,\n.table > tbody > tr.danger > td,\n.table > tfoot > tr.danger > td,\n.table > thead > tr.danger > th,\n.table > tbody > tr.danger > th,\n.table > tfoot > tr.danger > th {\n  background-color: #f2dede;\n}\n.table-hover > tbody > tr > td.danger:hover,\n.table-hover > tbody > tr > th.danger:hover,\n.table-hover > tbody > tr.danger:hover > td,\n.table-hover > tbody > tr.danger:hover > th {\n  background-color: #ebcccc;\n}\n@media (max-width: 767px) {\n  .table-responsive {\n    width: 100%;\n    margin-bottom: 15px;\n    overflow-y: hidden;\n    overflow-x: scroll;\n    -ms-overflow-style: -ms-autohiding-scrollbar;\n    border: 1px solid #dddddd;\n    -webkit-overflow-scrolling: touch;\n  }\n  .table-responsive > .table {\n    margin-bottom: 0;\n  }\n  .table-responsive > .table > thead > tr > th,\n  .table-responsive > .table > tbody > tr > th,\n  .table-responsive > .table > tfoot > tr > th,\n  .table-responsive > .table > thead > tr > td,\n  .table-responsive > .table > tbody > tr > td,\n  .table-responsive > .table > tfoot > tr > td {\n    white-space: nowrap;\n  }\n  .table-responsive > .table-bordered {\n    border: 0;\n  }\n  .table-responsive > .table-bordered > thead > tr > th:first-child,\n  .table-responsive > .table-bordered > tbody > tr > th:first-child,\n  .table-responsive > .table-bordered > tfoot > tr > th:first-child,\n  .table-responsive > .table-bordered > thead > tr > td:first-child,\n  .table-responsive > .table-bordered > tbody > tr > td:first-child,\n  .table-responsive > .table-bordered > tfoot > tr > td:first-child {\n    border-left: 0;\n  }\n  .table-responsive > .table-bordered > thead > tr > th:last-child,\n  .table-responsive > .table-bordered > tbody > tr > th:last-child,\n  .table-responsive > .table-bordered > tfoot > tr > th:last-child,\n  .table-responsive > .table-bordered > thead > tr > td:last-child,\n  .table-responsive > .table-bordered > tbody > tr > td:last-child,\n  .table-responsive > .table-bordered > tfoot > tr > td:last-child {\n    border-right: 0;\n  }\n  .table-responsive > .table-bordered > tbody > tr:last-child > th,\n  .table-responsive > .table-bordered > tfoot > tr:last-child > th,\n  .table-responsive > .table-bordered > tbody > tr:last-child > td,\n  .table-responsive > .table-bordered > tfoot > tr:last-child > td {\n    border-bottom: 0;\n  }\n}\nfieldset {\n  padding: 0;\n  margin: 0;\n  border: 0;\n  min-width: 0;\n}\nlegend {\n  display: block;\n  width: 100%;\n  padding: 0;\n  margin-bottom: 20px;\n  font-size: 21px;\n  line-height: inherit;\n  color: #333333;\n  border: 0;\n  border-bottom: 1px solid #e5e5e5;\n}\nlabel {\n  display: inline-block;\n  margin-bottom: 5px;\n  font-weight: bold;\n}\ninput[type=\"search\"] {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n}\ninput[type=\"radio\"],\ninput[type=\"checkbox\"] {\n  margin: 4px 0 0;\n  margin-top: 1px \\9;\n  /* IE8-9 */\n  line-height: normal;\n}\ninput[type=\"file\"] {\n  display: block;\n}\ninput[type=\"range\"] {\n  display: block;\n  width: 100%;\n}\nselect[multiple],\nselect[size] {\n  height: auto;\n}\ninput[type=\"file\"]:focus,\ninput[type=\"radio\"]:focus,\ninput[type=\"checkbox\"]:focus {\n  outline: thin dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\noutput {\n  display: block;\n  padding-top: 7px;\n  font-size: 14px;\n  line-height: 1.42857143;\n  color: #555555;\n}\n.form-control {\n  display: block;\n  width: 100%;\n  height: 34px;\n  padding: 6px 12px;\n  font-size: 14px;\n  line-height: 1.42857143;\n  color: #555555;\n  background-color: #ffffff;\n  background-image: none;\n  border: 1px solid #cccccc;\n  border-radius: 4px;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  -webkit-transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;\n  transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;\n}\n.form-control:focus {\n  border-color: #66afe9;\n  outline: 0;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, 0.6);\n  box-shadow: inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, 0.6);\n}\n.form-control::-moz-placeholder {\n  color: #999999;\n  opacity: 1;\n}\n.form-control:-ms-input-placeholder {\n  color: #999999;\n}\n.form-control::-webkit-input-placeholder {\n  color: #999999;\n}\n.form-control[disabled],\n.form-control[readonly],\nfieldset[disabled] .form-control {\n  cursor: not-allowed;\n  background-color: #eeeeee;\n  opacity: 1;\n}\ntextarea.form-control {\n  height: auto;\n}\ninput[type=\"search\"] {\n  -webkit-appearance: none;\n}\ninput[type=\"date\"] {\n  line-height: 34px;\n}\n.form-group {\n  margin-bottom: 15px;\n}\n.radio,\n.checkbox {\n  display: block;\n  min-height: 20px;\n  margin-top: 10px;\n  margin-bottom: 10px;\n  padding-left: 20px;\n}\n.radio label,\n.checkbox label {\n  display: inline;\n  font-weight: normal;\n  cursor: pointer;\n}\n.radio input[type=\"radio\"],\n.radio-inline input[type=\"radio\"],\n.checkbox input[type=\"checkbox\"],\n.checkbox-inline input[type=\"checkbox\"] {\n  float: left;\n  margin-left: -20px;\n}\n.radio + .radio,\n.checkbox + .checkbox {\n  margin-top: -5px;\n}\n.radio-inline,\n.checkbox-inline {\n  display: inline-block;\n  padding-left: 20px;\n  margin-bottom: 0;\n  vertical-align: middle;\n  font-weight: normal;\n  cursor: pointer;\n}\n.radio-inline + .radio-inline,\n.checkbox-inline + .checkbox-inline {\n  margin-top: 0;\n  margin-left: 10px;\n}\ninput[type=\"radio\"][disabled],\ninput[type=\"checkbox\"][disabled],\n.radio[disabled],\n.radio-inline[disabled],\n.checkbox[disabled],\n.checkbox-inline[disabled],\nfieldset[disabled] input[type=\"radio\"],\nfieldset[disabled] input[type=\"checkbox\"],\nfieldset[disabled] .radio,\nfieldset[disabled] .radio-inline,\nfieldset[disabled] .checkbox,\nfieldset[disabled] .checkbox-inline {\n  cursor: not-allowed;\n}\n.input-sm {\n  height: 30px;\n  padding: 5px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\nselect.input-sm {\n  height: 30px;\n  line-height: 30px;\n}\ntextarea.input-sm,\nselect[multiple].input-sm {\n  height: auto;\n}\n.input-lg {\n  height: 46px;\n  padding: 10px 16px;\n  font-size: 18px;\n  line-height: 1.33;\n  border-radius: 6px;\n}\nselect.input-lg {\n  height: 46px;\n  line-height: 46px;\n}\ntextarea.input-lg,\nselect[multiple].input-lg {\n  height: auto;\n}\n.has-feedback {\n  position: relative;\n}\n.has-feedback .form-control {\n  padding-right: 42.5px;\n}\n.has-feedback .form-control-feedback {\n  position: absolute;\n  top: 25px;\n  right: 0;\n  display: block;\n  width: 34px;\n  height: 34px;\n  line-height: 34px;\n  text-align: center;\n}\n.has-success .help-block,\n.has-success .control-label,\n.has-success .radio,\n.has-success .checkbox,\n.has-success .radio-inline,\n.has-success .checkbox-inline {\n  color: #3c763d;\n}\n.has-success .form-control {\n  border-color: #3c763d;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n}\n.has-success .form-control:focus {\n  border-color: #2b542c;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #67b168;\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #67b168;\n}\n.has-success .input-group-addon {\n  color: #3c763d;\n  border-color: #3c763d;\n  background-color: #dff0d8;\n}\n.has-success .form-control-feedback {\n  color: #3c763d;\n}\n.has-warning .help-block,\n.has-warning .control-label,\n.has-warning .radio,\n.has-warning .checkbox,\n.has-warning .radio-inline,\n.has-warning .checkbox-inline {\n  color: #8a6d3b;\n}\n.has-warning .form-control {\n  border-color: #8a6d3b;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n}\n.has-warning .form-control:focus {\n  border-color: #66512c;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #c0a16b;\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #c0a16b;\n}\n.has-warning .input-group-addon {\n  color: #8a6d3b;\n  border-color: #8a6d3b;\n  background-color: #fcf8e3;\n}\n.has-warning .form-control-feedback {\n  color: #8a6d3b;\n}\n.has-error .help-block,\n.has-error .control-label,\n.has-error .radio,\n.has-error .checkbox,\n.has-error .radio-inline,\n.has-error .checkbox-inline {\n  color: #a94442;\n}\n.has-error .form-control {\n  border-color: #a94442;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\n}\n.has-error .form-control:focus {\n  border-color: #843534;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #ce8483;\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 6px #ce8483;\n}\n.has-error .input-group-addon {\n  color: #a94442;\n  border-color: #a94442;\n  background-color: #f2dede;\n}\n.has-error .form-control-feedback {\n  color: #a94442;\n}\n.form-control-static {\n  margin-bottom: 0;\n}\n.help-block {\n  display: block;\n  margin-top: 5px;\n  margin-bottom: 10px;\n  color: #737373;\n}\n@media (min-width: 768px) {\n  .form-inline .form-group {\n    display: inline-block;\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .form-inline .form-control {\n    display: inline-block;\n    width: auto;\n    vertical-align: middle;\n  }\n  .form-inline .input-group > .form-control {\n    width: 100%;\n  }\n  .form-inline .control-label {\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .form-inline .radio,\n  .form-inline .checkbox {\n    display: inline-block;\n    margin-top: 0;\n    margin-bottom: 0;\n    padding-left: 0;\n    vertical-align: middle;\n  }\n  .form-inline .radio input[type=\"radio\"],\n  .form-inline .checkbox input[type=\"checkbox\"] {\n    float: none;\n    margin-left: 0;\n  }\n  .form-inline .has-feedback .form-control-feedback {\n    top: 0;\n  }\n}\n.form-horizontal .control-label,\n.form-horizontal .radio,\n.form-horizontal .checkbox,\n.form-horizontal .radio-inline,\n.form-horizontal .checkbox-inline {\n  margin-top: 0;\n  margin-bottom: 0;\n  padding-top: 7px;\n}\n.form-horizontal .radio,\n.form-horizontal .checkbox {\n  min-height: 27px;\n}\n.form-horizontal .form-group {\n  margin-left: -15px;\n  margin-right: -15px;\n}\n.form-horizontal .form-control-static {\n  padding-top: 7px;\n}\n@media (min-width: 768px) {\n  .form-horizontal .control-label {\n    text-align: right;\n  }\n}\n.form-horizontal .has-feedback .form-control-feedback {\n  top: 0;\n  right: 15px;\n}\n.btn {\n  display: inline-block;\n  margin-bottom: 0;\n  font-weight: normal;\n  text-align: center;\n  vertical-align: middle;\n  cursor: pointer;\n  background-image: none;\n  border: 1px solid transparent;\n  white-space: nowrap;\n  padding: 6px 12px;\n  font-size: 14px;\n  line-height: 1.42857143;\n  border-radius: 4px;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n.btn:focus,\n.btn:active:focus,\n.btn.active:focus {\n  outline: thin dotted;\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\n.btn:hover,\n.btn:focus {\n  color: #333333;\n  text-decoration: none;\n}\n.btn:active,\n.btn.active {\n  outline: 0;\n  background-image: none;\n  -webkit-box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n}\n.btn.disabled,\n.btn[disabled],\nfieldset[disabled] .btn {\n  cursor: not-allowed;\n  pointer-events: none;\n  opacity: 0.65;\n  filter: alpha(opacity=65);\n  -webkit-box-shadow: none;\n  box-shadow: none;\n}\n.btn-default {\n  color: #333333;\n  background-color: #ffffff;\n  border-color: #cccccc;\n}\n.btn-default:hover,\n.btn-default:focus,\n.btn-default:active,\n.btn-default.active,\n.open .dropdown-toggle.btn-default {\n  color: #333333;\n  background-color: #ebebeb;\n  border-color: #adadad;\n}\n.btn-default:active,\n.btn-default.active,\n.open .dropdown-toggle.btn-default {\n  background-image: none;\n}\n.btn-default.disabled,\n.btn-default[disabled],\nfieldset[disabled] .btn-default,\n.btn-default.disabled:hover,\n.btn-default[disabled]:hover,\nfieldset[disabled] .btn-default:hover,\n.btn-default.disabled:focus,\n.btn-default[disabled]:focus,\nfieldset[disabled] .btn-default:focus,\n.btn-default.disabled:active,\n.btn-default[disabled]:active,\nfieldset[disabled] .btn-default:active,\n.btn-default.disabled.active,\n.btn-default[disabled].active,\nfieldset[disabled] .btn-default.active {\n  background-color: #ffffff;\n  border-color: #cccccc;\n}\n.btn-default .badge {\n  color: #ffffff;\n  background-color: #333333;\n}\n.btn-primary {\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #357ebd;\n}\n.btn-primary:hover,\n.btn-primary:focus,\n.btn-primary:active,\n.btn-primary.active,\n.open .dropdown-toggle.btn-primary {\n  color: #ffffff;\n  background-color: #3276b1;\n  border-color: #285e8e;\n}\n.btn-primary:active,\n.btn-primary.active,\n.open .dropdown-toggle.btn-primary {\n  background-image: none;\n}\n.btn-primary.disabled,\n.btn-primary[disabled],\nfieldset[disabled] .btn-primary,\n.btn-primary.disabled:hover,\n.btn-primary[disabled]:hover,\nfieldset[disabled] .btn-primary:hover,\n.btn-primary.disabled:focus,\n.btn-primary[disabled]:focus,\nfieldset[disabled] .btn-primary:focus,\n.btn-primary.disabled:active,\n.btn-primary[disabled]:active,\nfieldset[disabled] .btn-primary:active,\n.btn-primary.disabled.active,\n.btn-primary[disabled].active,\nfieldset[disabled] .btn-primary.active {\n  background-color: #428bca;\n  border-color: #357ebd;\n}\n.btn-primary .badge {\n  color: #428bca;\n  background-color: #ffffff;\n}\n.btn-success {\n  color: #ffffff;\n  background-color: #5cb85c;\n  border-color: #4cae4c;\n}\n.btn-success:hover,\n.btn-success:focus,\n.btn-success:active,\n.btn-success.active,\n.open .dropdown-toggle.btn-success {\n  color: #ffffff;\n  background-color: #47a447;\n  border-color: #398439;\n}\n.btn-success:active,\n.btn-success.active,\n.open .dropdown-toggle.btn-success {\n  background-image: none;\n}\n.btn-success.disabled,\n.btn-success[disabled],\nfieldset[disabled] .btn-success,\n.btn-success.disabled:hover,\n.btn-success[disabled]:hover,\nfieldset[disabled] .btn-success:hover,\n.btn-success.disabled:focus,\n.btn-success[disabled]:focus,\nfieldset[disabled] .btn-success:focus,\n.btn-success.disabled:active,\n.btn-success[disabled]:active,\nfieldset[disabled] .btn-success:active,\n.btn-success.disabled.active,\n.btn-success[disabled].active,\nfieldset[disabled] .btn-success.active {\n  background-color: #5cb85c;\n  border-color: #4cae4c;\n}\n.btn-success .badge {\n  color: #5cb85c;\n  background-color: #ffffff;\n}\n.btn-info {\n  color: #ffffff;\n  background-color: #5bc0de;\n  border-color: #46b8da;\n}\n.btn-info:hover,\n.btn-info:focus,\n.btn-info:active,\n.btn-info.active,\n.open .dropdown-toggle.btn-info {\n  color: #ffffff;\n  background-color: #39b3d7;\n  border-color: #269abc;\n}\n.btn-info:active,\n.btn-info.active,\n.open .dropdown-toggle.btn-info {\n  background-image: none;\n}\n.btn-info.disabled,\n.btn-info[disabled],\nfieldset[disabled] .btn-info,\n.btn-info.disabled:hover,\n.btn-info[disabled]:hover,\nfieldset[disabled] .btn-info:hover,\n.btn-info.disabled:focus,\n.btn-info[disabled]:focus,\nfieldset[disabled] .btn-info:focus,\n.btn-info.disabled:active,\n.btn-info[disabled]:active,\nfieldset[disabled] .btn-info:active,\n.btn-info.disabled.active,\n.btn-info[disabled].active,\nfieldset[disabled] .btn-info.active {\n  background-color: #5bc0de;\n  border-color: #46b8da;\n}\n.btn-info .badge {\n  color: #5bc0de;\n  background-color: #ffffff;\n}\n.btn-warning {\n  color: #ffffff;\n  background-color: #f0ad4e;\n  border-color: #eea236;\n}\n.btn-warning:hover,\n.btn-warning:focus,\n.btn-warning:active,\n.btn-warning.active,\n.open .dropdown-toggle.btn-warning {\n  color: #ffffff;\n  background-color: #ed9c28;\n  border-color: #d58512;\n}\n.btn-warning:active,\n.btn-warning.active,\n.open .dropdown-toggle.btn-warning {\n  background-image: none;\n}\n.btn-warning.disabled,\n.btn-warning[disabled],\nfieldset[disabled] .btn-warning,\n.btn-warning.disabled:hover,\n.btn-warning[disabled]:hover,\nfieldset[disabled] .btn-warning:hover,\n.btn-warning.disabled:focus,\n.btn-warning[disabled]:focus,\nfieldset[disabled] .btn-warning:focus,\n.btn-warning.disabled:active,\n.btn-warning[disabled]:active,\nfieldset[disabled] .btn-warning:active,\n.btn-warning.disabled.active,\n.btn-warning[disabled].active,\nfieldset[disabled] .btn-warning.active {\n  background-color: #f0ad4e;\n  border-color: #eea236;\n}\n.btn-warning .badge {\n  color: #f0ad4e;\n  background-color: #ffffff;\n}\n.btn-danger {\n  color: #ffffff;\n  background-color: #d9534f;\n  border-color: #d43f3a;\n}\n.btn-danger:hover,\n.btn-danger:focus,\n.btn-danger:active,\n.btn-danger.active,\n.open .dropdown-toggle.btn-danger {\n  color: #ffffff;\n  background-color: #d2322d;\n  border-color: #ac2925;\n}\n.btn-danger:active,\n.btn-danger.active,\n.open .dropdown-toggle.btn-danger {\n  background-image: none;\n}\n.btn-danger.disabled,\n.btn-danger[disabled],\nfieldset[disabled] .btn-danger,\n.btn-danger.disabled:hover,\n.btn-danger[disabled]:hover,\nfieldset[disabled] .btn-danger:hover,\n.btn-danger.disabled:focus,\n.btn-danger[disabled]:focus,\nfieldset[disabled] .btn-danger:focus,\n.btn-danger.disabled:active,\n.btn-danger[disabled]:active,\nfieldset[disabled] .btn-danger:active,\n.btn-danger.disabled.active,\n.btn-danger[disabled].active,\nfieldset[disabled] .btn-danger.active {\n  background-color: #d9534f;\n  border-color: #d43f3a;\n}\n.btn-danger .badge {\n  color: #d9534f;\n  background-color: #ffffff;\n}\n.btn-link {\n  color: #428bca;\n  font-weight: normal;\n  cursor: pointer;\n  border-radius: 0;\n}\n.btn-link,\n.btn-link:active,\n.btn-link[disabled],\nfieldset[disabled] .btn-link {\n  background-color: transparent;\n  -webkit-box-shadow: none;\n  box-shadow: none;\n}\n.btn-link,\n.btn-link:hover,\n.btn-link:focus,\n.btn-link:active {\n  border-color: transparent;\n}\n.btn-link:hover,\n.btn-link:focus {\n  color: #2a6496;\n  text-decoration: underline;\n  background-color: transparent;\n}\n.btn-link[disabled]:hover,\nfieldset[disabled] .btn-link:hover,\n.btn-link[disabled]:focus,\nfieldset[disabled] .btn-link:focus {\n  color: #999999;\n  text-decoration: none;\n}\n.btn-lg,\n.btn-group-lg > .btn {\n  padding: 10px 16px;\n  font-size: 18px;\n  line-height: 1.33;\n  border-radius: 6px;\n}\n.btn-sm,\n.btn-group-sm > .btn {\n  padding: 5px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\n.btn-xs,\n.btn-group-xs > .btn {\n  padding: 1px 5px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\n.btn-block {\n  display: block;\n  width: 100%;\n  padding-left: 0;\n  padding-right: 0;\n}\n.btn-block + .btn-block {\n  margin-top: 5px;\n}\ninput[type=\"submit\"].btn-block,\ninput[type=\"reset\"].btn-block,\ninput[type=\"button\"].btn-block {\n  width: 100%;\n}\n.fade {\n  opacity: 0;\n  -webkit-transition: opacity 0.15s linear;\n  transition: opacity 0.15s linear;\n}\n.fade.in {\n  opacity: 1;\n}\n.collapse {\n  display: none;\n}\n.collapse.in {\n  display: block;\n}\n.collapsing {\n  position: relative;\n  height: 0;\n  overflow: hidden;\n  -webkit-transition: height 0.35s ease;\n  transition: height 0.35s ease;\n}\n@font-face {\n  font-family: 'Glyphicons Halflings';\n  src: url('../fonts/glyphicons-halflings-regular.eot');\n  src: url('../fonts/glyphicons-halflings-regular.eot?#iefix') format('embedded-opentype'), url('../fonts/glyphicons-halflings-regular.woff') format('woff'), url('../fonts/glyphicons-halflings-regular.ttf') format('truetype'), url('../fonts/glyphicons-halflings-regular.svg#glyphicons_halflingsregular') format('svg');\n}\n.glyphicon {\n  position: relative;\n  top: 1px;\n  display: inline-block;\n  font-family: 'Glyphicons Halflings';\n  font-style: normal;\n  font-weight: normal;\n  line-height: 1;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n.glyphicon-asterisk:before {\n  content: \"\\2a\";\n}\n.glyphicon-plus:before {\n  content: \"\\2b\";\n}\n.glyphicon-euro:before {\n  content: \"\\20ac\";\n}\n.glyphicon-minus:before {\n  content: \"\\2212\";\n}\n.glyphicon-cloud:before {\n  content: \"\\2601\";\n}\n.glyphicon-envelope:before {\n  content: \"\\2709\";\n}\n.glyphicon-pencil:before {\n  content: \"\\270f\";\n}\n.glyphicon-glass:before {\n  content: \"\\e001\";\n}\n.glyphicon-music:before {\n  content: \"\\e002\";\n}\n.glyphicon-search:before {\n  content: \"\\e003\";\n}\n.glyphicon-heart:before {\n  content: \"\\e005\";\n}\n.glyphicon-star:before {\n  content: \"\\e006\";\n}\n.glyphicon-star-empty:before {\n  content: \"\\e007\";\n}\n.glyphicon-user:before {\n  content: \"\\e008\";\n}\n.glyphicon-film:before {\n  content: \"\\e009\";\n}\n.glyphicon-th-large:before {\n  content: \"\\e010\";\n}\n.glyphicon-th:before {\n  content: \"\\e011\";\n}\n.glyphicon-th-list:before {\n  content: \"\\e012\";\n}\n.glyphicon-ok:before {\n  content: \"\\e013\";\n}\n.glyphicon-remove:before {\n  content: \"\\e014\";\n}\n.glyphicon-zoom-in:before {\n  content: \"\\e015\";\n}\n.glyphicon-zoom-out:before {\n  content: \"\\e016\";\n}\n.glyphicon-off:before {\n  content: \"\\e017\";\n}\n.glyphicon-signal:before {\n  content: \"\\e018\";\n}\n.glyphicon-cog:before {\n  content: \"\\e019\";\n}\n.glyphicon-trash:before {\n  content: \"\\e020\";\n}\n.glyphicon-home:before {\n  content: \"\\e021\";\n}\n.glyphicon-file:before {\n  content: \"\\e022\";\n}\n.glyphicon-time:before {\n  content: \"\\e023\";\n}\n.glyphicon-road:before {\n  content: \"\\e024\";\n}\n.glyphicon-download-alt:before {\n  content: \"\\e025\";\n}\n.glyphicon-download:before {\n  content: \"\\e026\";\n}\n.glyphicon-upload:before {\n  content: \"\\e027\";\n}\n.glyphicon-inbox:before {\n  content: \"\\e028\";\n}\n.glyphicon-play-circle:before {\n  content: \"\\e029\";\n}\n.glyphicon-repeat:before {\n  content: \"\\e030\";\n}\n.glyphicon-refresh:before {\n  content: \"\\e031\";\n}\n.glyphicon-list-alt:before {\n  content: \"\\e032\";\n}\n.glyphicon-lock:before {\n  content: \"\\e033\";\n}\n.glyphicon-flag:before {\n  content: \"\\e034\";\n}\n.glyphicon-headphones:before {\n  content: \"\\e035\";\n}\n.glyphicon-volume-off:before {\n  content: \"\\e036\";\n}\n.glyphicon-volume-down:before {\n  content: \"\\e037\";\n}\n.glyphicon-volume-up:before {\n  content: \"\\e038\";\n}\n.glyphicon-qrcode:before {\n  content: \"\\e039\";\n}\n.glyphicon-barcode:before {\n  content: \"\\e040\";\n}\n.glyphicon-tag:before {\n  content: \"\\e041\";\n}\n.glyphicon-tags:before {\n  content: \"\\e042\";\n}\n.glyphicon-book:before {\n  content: \"\\e043\";\n}\n.glyphicon-bookmark:before {\n  content: \"\\e044\";\n}\n.glyphicon-print:before {\n  content: \"\\e045\";\n}\n.glyphicon-camera:before {\n  content: \"\\e046\";\n}\n.glyphicon-font:before {\n  content: \"\\e047\";\n}\n.glyphicon-bold:before {\n  content: \"\\e048\";\n}\n.glyphicon-italic:before {\n  content: \"\\e049\";\n}\n.glyphicon-text-height:before {\n  content: \"\\e050\";\n}\n.glyphicon-text-width:before {\n  content: \"\\e051\";\n}\n.glyphicon-align-left:before {\n  content: \"\\e052\";\n}\n.glyphicon-align-center:before {\n  content: \"\\e053\";\n}\n.glyphicon-align-right:before {\n  content: \"\\e054\";\n}\n.glyphicon-align-justify:before {\n  content: \"\\e055\";\n}\n.glyphicon-list:before {\n  content: \"\\e056\";\n}\n.glyphicon-indent-left:before {\n  content: \"\\e057\";\n}\n.glyphicon-indent-right:before {\n  content: \"\\e058\";\n}\n.glyphicon-facetime-video:before {\n  content: \"\\e059\";\n}\n.glyphicon-picture:before {\n  content: \"\\e060\";\n}\n.glyphicon-map-marker:before {\n  content: \"\\e062\";\n}\n.glyphicon-adjust:before {\n  content: \"\\e063\";\n}\n.glyphicon-tint:before {\n  content: \"\\e064\";\n}\n.glyphicon-edit:before {\n  content: \"\\e065\";\n}\n.glyphicon-share:before {\n  content: \"\\e066\";\n}\n.glyphicon-check:before {\n  content: \"\\e067\";\n}\n.glyphicon-move:before {\n  content: \"\\e068\";\n}\n.glyphicon-step-backward:before {\n  content: \"\\e069\";\n}\n.glyphicon-fast-backward:before {\n  content: \"\\e070\";\n}\n.glyphicon-backward:before {\n  content: \"\\e071\";\n}\n.glyphicon-play:before {\n  content: \"\\e072\";\n}\n.glyphicon-pause:before {\n  content: \"\\e073\";\n}\n.glyphicon-stop:before {\n  content: \"\\e074\";\n}\n.glyphicon-forward:before {\n  content: \"\\e075\";\n}\n.glyphicon-fast-forward:before {\n  content: \"\\e076\";\n}\n.glyphicon-step-forward:before {\n  content: \"\\e077\";\n}\n.glyphicon-eject:before {\n  content: \"\\e078\";\n}\n.glyphicon-chevron-left:before {\n  content: \"\\e079\";\n}\n.glyphicon-chevron-right:before {\n  content: \"\\e080\";\n}\n.glyphicon-plus-sign:before {\n  content: \"\\e081\";\n}\n.glyphicon-minus-sign:before {\n  content: \"\\e082\";\n}\n.glyphicon-remove-sign:before {\n  content: \"\\e083\";\n}\n.glyphicon-ok-sign:before {\n  content: \"\\e084\";\n}\n.glyphicon-question-sign:before {\n  content: \"\\e085\";\n}\n.glyphicon-info-sign:before {\n  content: \"\\e086\";\n}\n.glyphicon-screenshot:before {\n  content: \"\\e087\";\n}\n.glyphicon-remove-circle:before {\n  content: \"\\e088\";\n}\n.glyphicon-ok-circle:before {\n  content: \"\\e089\";\n}\n.glyphicon-ban-circle:before {\n  content: \"\\e090\";\n}\n.glyphicon-arrow-left:before {\n  content: \"\\e091\";\n}\n.glyphicon-arrow-right:before {\n  content: \"\\e092\";\n}\n.glyphicon-arrow-up:before {\n  content: \"\\e093\";\n}\n.glyphicon-arrow-down:before {\n  content: \"\\e094\";\n}\n.glyphicon-share-alt:before {\n  content: \"\\e095\";\n}\n.glyphicon-resize-full:before {\n  content: \"\\e096\";\n}\n.glyphicon-resize-small:before {\n  content: \"\\e097\";\n}\n.glyphicon-exclamation-sign:before {\n  content: \"\\e101\";\n}\n.glyphicon-gift:before {\n  content: \"\\e102\";\n}\n.glyphicon-leaf:before {\n  content: \"\\e103\";\n}\n.glyphicon-fire:before {\n  content: \"\\e104\";\n}\n.glyphicon-eye-open:before {\n  content: \"\\e105\";\n}\n.glyphicon-eye-close:before {\n  content: \"\\e106\";\n}\n.glyphicon-warning-sign:before {\n  content: \"\\e107\";\n}\n.glyphicon-plane:before {\n  content: \"\\e108\";\n}\n.glyphicon-calendar:before {\n  content: \"\\e109\";\n}\n.glyphicon-random:before {\n  content: \"\\e110\";\n}\n.glyphicon-comment:before {\n  content: \"\\e111\";\n}\n.glyphicon-magnet:before {\n  content: \"\\e112\";\n}\n.glyphicon-chevron-up:before {\n  content: \"\\e113\";\n}\n.glyphicon-chevron-down:before {\n  content: \"\\e114\";\n}\n.glyphicon-retweet:before {\n  content: \"\\e115\";\n}\n.glyphicon-shopping-cart:before {\n  content: \"\\e116\";\n}\n.glyphicon-folder-close:before {\n  content: \"\\e117\";\n}\n.glyphicon-folder-open:before {\n  content: \"\\e118\";\n}\n.glyphicon-resize-vertical:before {\n  content: \"\\e119\";\n}\n.glyphicon-resize-horizontal:before {\n  content: \"\\e120\";\n}\n.glyphicon-hdd:before {\n  content: \"\\e121\";\n}\n.glyphicon-bullhorn:before {\n  content: \"\\e122\";\n}\n.glyphicon-bell:before {\n  content: \"\\e123\";\n}\n.glyphicon-certificate:before {\n  content: \"\\e124\";\n}\n.glyphicon-thumbs-up:before {\n  content: \"\\e125\";\n}\n.glyphicon-thumbs-down:before {\n  content: \"\\e126\";\n}\n.glyphicon-hand-right:before {\n  content: \"\\e127\";\n}\n.glyphicon-hand-left:before {\n  content: \"\\e128\";\n}\n.glyphicon-hand-up:before {\n  content: \"\\e129\";\n}\n.glyphicon-hand-down:before {\n  content: \"\\e130\";\n}\n.glyphicon-circle-arrow-right:before {\n  content: \"\\e131\";\n}\n.glyphicon-circle-arrow-left:before {\n  content: \"\\e132\";\n}\n.glyphicon-circle-arrow-up:before {\n  content: \"\\e133\";\n}\n.glyphicon-circle-arrow-down:before {\n  content: \"\\e134\";\n}\n.glyphicon-globe:before {\n  content: \"\\e135\";\n}\n.glyphicon-wrench:before {\n  content: \"\\e136\";\n}\n.glyphicon-tasks:before {\n  content: \"\\e137\";\n}\n.glyphicon-filter:before {\n  content: \"\\e138\";\n}\n.glyphicon-briefcase:before {\n  content: \"\\e139\";\n}\n.glyphicon-fullscreen:before {\n  content: \"\\e140\";\n}\n.glyphicon-dashboard:before {\n  content: \"\\e141\";\n}\n.glyphicon-paperclip:before {\n  content: \"\\e142\";\n}\n.glyphicon-heart-empty:before {\n  content: \"\\e143\";\n}\n.glyphicon-link:before {\n  content: \"\\e144\";\n}\n.glyphicon-phone:before {\n  content: \"\\e145\";\n}\n.glyphicon-pushpin:before {\n  content: \"\\e146\";\n}\n.glyphicon-usd:before {\n  content: \"\\e148\";\n}\n.glyphicon-gbp:before {\n  content: \"\\e149\";\n}\n.glyphicon-sort:before {\n  content: \"\\e150\";\n}\n.glyphicon-sort-by-alphabet:before {\n  content: \"\\e151\";\n}\n.glyphicon-sort-by-alphabet-alt:before {\n  content: \"\\e152\";\n}\n.glyphicon-sort-by-order:before {\n  content: \"\\e153\";\n}\n.glyphicon-sort-by-order-alt:before {\n  content: \"\\e154\";\n}\n.glyphicon-sort-by-attributes:before {\n  content: \"\\e155\";\n}\n.glyphicon-sort-by-attributes-alt:before {\n  content: \"\\e156\";\n}\n.glyphicon-unchecked:before {\n  content: \"\\e157\";\n}\n.glyphicon-expand:before {\n  content: \"\\e158\";\n}\n.glyphicon-collapse-down:before {\n  content: \"\\e159\";\n}\n.glyphicon-collapse-up:before {\n  content: \"\\e160\";\n}\n.glyphicon-log-in:before {\n  content: \"\\e161\";\n}\n.glyphicon-flash:before {\n  content: \"\\e162\";\n}\n.glyphicon-log-out:before {\n  content: \"\\e163\";\n}\n.glyphicon-new-window:before {\n  content: \"\\e164\";\n}\n.glyphicon-record:before {\n  content: \"\\e165\";\n}\n.glyphicon-save:before {\n  content: \"\\e166\";\n}\n.glyphicon-open:before {\n  content: \"\\e167\";\n}\n.glyphicon-saved:before {\n  content: \"\\e168\";\n}\n.glyphicon-import:before {\n  content: \"\\e169\";\n}\n.glyphicon-export:before {\n  content: \"\\e170\";\n}\n.glyphicon-send:before {\n  content: \"\\e171\";\n}\n.glyphicon-floppy-disk:before {\n  content: \"\\e172\";\n}\n.glyphicon-floppy-saved:before {\n  content: \"\\e173\";\n}\n.glyphicon-floppy-remove:before {\n  content: \"\\e174\";\n}\n.glyphicon-floppy-save:before {\n  content: \"\\e175\";\n}\n.glyphicon-floppy-open:before {\n  content: \"\\e176\";\n}\n.glyphicon-credit-card:before {\n  content: \"\\e177\";\n}\n.glyphicon-transfer:before {\n  content: \"\\e178\";\n}\n.glyphicon-cutlery:before {\n  content: \"\\e179\";\n}\n.glyphicon-header:before {\n  content: \"\\e180\";\n}\n.glyphicon-compressed:before {\n  content: \"\\e181\";\n}\n.glyphicon-earphone:before {\n  content: \"\\e182\";\n}\n.glyphicon-phone-alt:before {\n  content: \"\\e183\";\n}\n.glyphicon-tower:before {\n  content: \"\\e184\";\n}\n.glyphicon-stats:before {\n  content: \"\\e185\";\n}\n.glyphicon-sd-video:before {\n  content: \"\\e186\";\n}\n.glyphicon-hd-video:before {\n  content: \"\\e187\";\n}\n.glyphicon-subtitles:before {\n  content: \"\\e188\";\n}\n.glyphicon-sound-stereo:before {\n  content: \"\\e189\";\n}\n.glyphicon-sound-dolby:before {\n  content: \"\\e190\";\n}\n.glyphicon-sound-5-1:before {\n  content: \"\\e191\";\n}\n.glyphicon-sound-6-1:before {\n  content: \"\\e192\";\n}\n.glyphicon-sound-7-1:before {\n  content: \"\\e193\";\n}\n.glyphicon-copyright-mark:before {\n  content: \"\\e194\";\n}\n.glyphicon-registration-mark:before {\n  content: \"\\e195\";\n}\n.glyphicon-cloud-download:before {\n  content: \"\\e197\";\n}\n.glyphicon-cloud-upload:before {\n  content: \"\\e198\";\n}\n.glyphicon-tree-conifer:before {\n  content: \"\\e199\";\n}\n.glyphicon-tree-deciduous:before {\n  content: \"\\e200\";\n}\n.caret {\n  display: inline-block;\n  width: 0;\n  height: 0;\n  margin-left: 2px;\n  vertical-align: middle;\n  border-top: 4px solid;\n  border-right: 4px solid transparent;\n  border-left: 4px solid transparent;\n}\n.dropdown {\n  position: relative;\n}\n.dropdown-toggle:focus {\n  outline: 0;\n}\n.dropdown-menu {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  z-index: 1000;\n  display: none;\n  float: left;\n  min-width: 160px;\n  padding: 5px 0;\n  margin: 2px 0 0;\n  list-style: none;\n  font-size: 14px;\n  background-color: #ffffff;\n  border: 1px solid #cccccc;\n  border: 1px solid rgba(0, 0, 0, 0.15);\n  border-radius: 4px;\n  -webkit-box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);\n  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);\n  background-clip: padding-box;\n}\n.dropdown-menu.pull-right {\n  right: 0;\n  left: auto;\n}\n.dropdown-menu .divider {\n  height: 1px;\n  margin: 9px 0;\n  overflow: hidden;\n  background-color: #e5e5e5;\n}\n.dropdown-menu > li > a {\n  display: block;\n  padding: 3px 20px;\n  clear: both;\n  font-weight: normal;\n  line-height: 1.42857143;\n  color: #333333;\n  white-space: nowrap;\n}\n.dropdown-menu > li > a:hover,\n.dropdown-menu > li > a:focus {\n  text-decoration: none;\n  color: #262626;\n  background-color: #f5f5f5;\n}\n.dropdown-menu > .active > a,\n.dropdown-menu > .active > a:hover,\n.dropdown-menu > .active > a:focus {\n  color: #ffffff;\n  text-decoration: none;\n  outline: 0;\n  background-color: #428bca;\n}\n.dropdown-menu > .disabled > a,\n.dropdown-menu > .disabled > a:hover,\n.dropdown-menu > .disabled > a:focus {\n  color: #999999;\n}\n.dropdown-menu > .disabled > a:hover,\n.dropdown-menu > .disabled > a:focus {\n  text-decoration: none;\n  background-color: transparent;\n  background-image: none;\n  filter: progid:DXImageTransform.Microsoft.gradient(enabled = false);\n  cursor: not-allowed;\n}\n.open > .dropdown-menu {\n  display: block;\n}\n.open > a {\n  outline: 0;\n}\n.dropdown-menu-right {\n  left: auto;\n  right: 0;\n}\n.dropdown-menu-left {\n  left: 0;\n  right: auto;\n}\n.dropdown-header {\n  display: block;\n  padding: 3px 20px;\n  font-size: 12px;\n  line-height: 1.42857143;\n  color: #999999;\n}\n.dropdown-backdrop {\n  position: fixed;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  top: 0;\n  z-index: 990;\n}\n.pull-right > .dropdown-menu {\n  right: 0;\n  left: auto;\n}\n.dropup .caret,\n.navbar-fixed-bottom .dropdown .caret {\n  border-top: 0;\n  border-bottom: 4px solid;\n  content: \"\";\n}\n.dropup .dropdown-menu,\n.navbar-fixed-bottom .dropdown .dropdown-menu {\n  top: auto;\n  bottom: 100%;\n  margin-bottom: 1px;\n}\n@media (min-width: 768px) {\n  .navbar-right .dropdown-menu {\n    left: auto;\n    right: 0;\n  }\n  .navbar-right .dropdown-menu-left {\n    left: 0;\n    right: auto;\n  }\n}\n.btn-group,\n.btn-group-vertical {\n  position: relative;\n  display: inline-block;\n  vertical-align: middle;\n}\n.btn-group > .btn,\n.btn-group-vertical > .btn {\n  position: relative;\n  float: left;\n}\n.btn-group > .btn:hover,\n.btn-group-vertical > .btn:hover,\n.btn-group > .btn:focus,\n.btn-group-vertical > .btn:focus,\n.btn-group > .btn:active,\n.btn-group-vertical > .btn:active,\n.btn-group > .btn.active,\n.btn-group-vertical > .btn.active {\n  z-index: 2;\n}\n.btn-group > .btn:focus,\n.btn-group-vertical > .btn:focus {\n  outline: none;\n}\n.btn-group .btn + .btn,\n.btn-group .btn + .btn-group,\n.btn-group .btn-group + .btn,\n.btn-group .btn-group + .btn-group {\n  margin-left: -1px;\n}\n.btn-toolbar {\n  margin-left: -5px;\n}\n.btn-toolbar .btn-group,\n.btn-toolbar .input-group {\n  float: left;\n}\n.btn-toolbar > .btn,\n.btn-toolbar > .btn-group,\n.btn-toolbar > .input-group {\n  margin-left: 5px;\n}\n.btn-group > .btn:not(:first-child):not(:last-child):not(.dropdown-toggle) {\n  border-radius: 0;\n}\n.btn-group > .btn:first-child {\n  margin-left: 0;\n}\n.btn-group > .btn:first-child:not(:last-child):not(.dropdown-toggle) {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.btn-group > .btn:last-child:not(:first-child),\n.btn-group > .dropdown-toggle:not(:first-child) {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group > .btn-group {\n  float: left;\n}\n.btn-group > .btn-group:not(:first-child):not(:last-child) > .btn {\n  border-radius: 0;\n}\n.btn-group > .btn-group:first-child > .btn:last-child,\n.btn-group > .btn-group:first-child > .dropdown-toggle {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.btn-group > .btn-group:last-child > .btn:first-child {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group .dropdown-toggle:active,\n.btn-group.open .dropdown-toggle {\n  outline: 0;\n}\n.btn-group > .btn + .dropdown-toggle {\n  padding-left: 8px;\n  padding-right: 8px;\n}\n.btn-group > .btn-lg + .dropdown-toggle {\n  padding-left: 12px;\n  padding-right: 12px;\n}\n.btn-group.open .dropdown-toggle {\n  -webkit-box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n  box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);\n}\n.btn-group.open .dropdown-toggle.btn-link {\n  -webkit-box-shadow: none;\n  box-shadow: none;\n}\n.btn .caret {\n  margin-left: 0;\n}\n.btn-lg .caret {\n  border-width: 5px 5px 0;\n  border-bottom-width: 0;\n}\n.dropup .btn-lg .caret {\n  border-width: 0 5px 5px;\n}\n.btn-group-vertical > .btn,\n.btn-group-vertical > .btn-group,\n.btn-group-vertical > .btn-group > .btn {\n  display: block;\n  float: none;\n  width: 100%;\n  max-width: 100%;\n}\n.btn-group-vertical > .btn-group > .btn {\n  float: none;\n}\n.btn-group-vertical > .btn + .btn,\n.btn-group-vertical > .btn + .btn-group,\n.btn-group-vertical > .btn-group + .btn,\n.btn-group-vertical > .btn-group + .btn-group {\n  margin-top: -1px;\n  margin-left: 0;\n}\n.btn-group-vertical > .btn:not(:first-child):not(:last-child) {\n  border-radius: 0;\n}\n.btn-group-vertical > .btn:first-child:not(:last-child) {\n  border-top-right-radius: 4px;\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.btn-group-vertical > .btn:last-child:not(:first-child) {\n  border-bottom-left-radius: 4px;\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group-vertical > .btn-group:not(:first-child):not(:last-child) > .btn {\n  border-radius: 0;\n}\n.btn-group-vertical > .btn-group:first-child:not(:last-child) > .btn:last-child,\n.btn-group-vertical > .btn-group:first-child:not(:last-child) > .dropdown-toggle {\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.btn-group-vertical > .btn-group:last-child:not(:first-child) > .btn:first-child {\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.btn-group-justified {\n  display: table;\n  width: 100%;\n  table-layout: fixed;\n  border-collapse: separate;\n}\n.btn-group-justified > .btn,\n.btn-group-justified > .btn-group {\n  float: none;\n  display: table-cell;\n  width: 1%;\n}\n.btn-group-justified > .btn-group .btn {\n  width: 100%;\n}\n[data-toggle=\"buttons\"] > .btn > input[type=\"radio\"],\n[data-toggle=\"buttons\"] > .btn > input[type=\"checkbox\"] {\n  display: none;\n}\n.input-group {\n  position: relative;\n  display: table;\n  border-collapse: separate;\n}\n.input-group[class*=\"col-\"] {\n  float: none;\n  padding-left: 0;\n  padding-right: 0;\n}\n.input-group .form-control {\n  position: relative;\n  z-index: 2;\n  float: left;\n  width: 100%;\n  margin-bottom: 0;\n}\n.input-group-lg > .form-control,\n.input-group-lg > .input-group-addon,\n.input-group-lg > .input-group-btn > .btn {\n  height: 46px;\n  padding: 10px 16px;\n  font-size: 18px;\n  line-height: 1.33;\n  border-radius: 6px;\n}\nselect.input-group-lg > .form-control,\nselect.input-group-lg > .input-group-addon,\nselect.input-group-lg > .input-group-btn > .btn {\n  height: 46px;\n  line-height: 46px;\n}\ntextarea.input-group-lg > .form-control,\ntextarea.input-group-lg > .input-group-addon,\ntextarea.input-group-lg > .input-group-btn > .btn,\nselect[multiple].input-group-lg > .form-control,\nselect[multiple].input-group-lg > .input-group-addon,\nselect[multiple].input-group-lg > .input-group-btn > .btn {\n  height: auto;\n}\n.input-group-sm > .form-control,\n.input-group-sm > .input-group-addon,\n.input-group-sm > .input-group-btn > .btn {\n  height: 30px;\n  padding: 5px 10px;\n  font-size: 12px;\n  line-height: 1.5;\n  border-radius: 3px;\n}\nselect.input-group-sm > .form-control,\nselect.input-group-sm > .input-group-addon,\nselect.input-group-sm > .input-group-btn > .btn {\n  height: 30px;\n  line-height: 30px;\n}\ntextarea.input-group-sm > .form-control,\ntextarea.input-group-sm > .input-group-addon,\ntextarea.input-group-sm > .input-group-btn > .btn,\nselect[multiple].input-group-sm > .form-control,\nselect[multiple].input-group-sm > .input-group-addon,\nselect[multiple].input-group-sm > .input-group-btn > .btn {\n  height: auto;\n}\n.input-group-addon,\n.input-group-btn,\n.input-group .form-control {\n  display: table-cell;\n}\n.input-group-addon:not(:first-child):not(:last-child),\n.input-group-btn:not(:first-child):not(:last-child),\n.input-group .form-control:not(:first-child):not(:last-child) {\n  border-radius: 0;\n}\n.input-group-addon,\n.input-group-btn {\n  width: 1%;\n  white-space: nowrap;\n  vertical-align: middle;\n}\n.input-group-addon {\n  padding: 6px 12px;\n  font-size: 14px;\n  font-weight: normal;\n  line-height: 1;\n  color: #555555;\n  text-align: center;\n  background-color: #eeeeee;\n  border: 1px solid #cccccc;\n  border-radius: 4px;\n}\n.input-group-addon.input-sm {\n  padding: 5px 10px;\n  font-size: 12px;\n  border-radius: 3px;\n}\n.input-group-addon.input-lg {\n  padding: 10px 16px;\n  font-size: 18px;\n  border-radius: 6px;\n}\n.input-group-addon input[type=\"radio\"],\n.input-group-addon input[type=\"checkbox\"] {\n  margin-top: 0;\n}\n.input-group .form-control:first-child,\n.input-group-addon:first-child,\n.input-group-btn:first-child > .btn,\n.input-group-btn:first-child > .btn-group > .btn,\n.input-group-btn:first-child > .dropdown-toggle,\n.input-group-btn:last-child > .btn:not(:last-child):not(.dropdown-toggle),\n.input-group-btn:last-child > .btn-group:not(:last-child) > .btn {\n  border-bottom-right-radius: 0;\n  border-top-right-radius: 0;\n}\n.input-group-addon:first-child {\n  border-right: 0;\n}\n.input-group .form-control:last-child,\n.input-group-addon:last-child,\n.input-group-btn:last-child > .btn,\n.input-group-btn:last-child > .btn-group > .btn,\n.input-group-btn:last-child > .dropdown-toggle,\n.input-group-btn:first-child > .btn:not(:first-child),\n.input-group-btn:first-child > .btn-group:not(:first-child) > .btn {\n  border-bottom-left-radius: 0;\n  border-top-left-radius: 0;\n}\n.input-group-addon:last-child {\n  border-left: 0;\n}\n.input-group-btn {\n  position: relative;\n  font-size: 0;\n  white-space: nowrap;\n}\n.input-group-btn > .btn {\n  position: relative;\n}\n.input-group-btn > .btn + .btn {\n  margin-left: -1px;\n}\n.input-group-btn > .btn:hover,\n.input-group-btn > .btn:focus,\n.input-group-btn > .btn:active {\n  z-index: 2;\n}\n.input-group-btn:first-child > .btn,\n.input-group-btn:first-child > .btn-group {\n  margin-right: -1px;\n}\n.input-group-btn:last-child > .btn,\n.input-group-btn:last-child > .btn-group {\n  margin-left: -1px;\n}\n.nav {\n  margin-bottom: 0;\n  padding-left: 0;\n  list-style: none;\n}\n.nav > li {\n  position: relative;\n  display: block;\n}\n.nav > li > a {\n  position: relative;\n  display: block;\n  padding: 10px 15px;\n}\n.nav > li > a:hover,\n.nav > li > a:focus {\n  text-decoration: none;\n  background-color: #eeeeee;\n}\n.nav > li.disabled > a {\n  color: #999999;\n}\n.nav > li.disabled > a:hover,\n.nav > li.disabled > a:focus {\n  color: #999999;\n  text-decoration: none;\n  background-color: transparent;\n  cursor: not-allowed;\n}\n.nav .open > a,\n.nav .open > a:hover,\n.nav .open > a:focus {\n  background-color: #eeeeee;\n  border-color: #428bca;\n}\n.nav .nav-divider {\n  height: 1px;\n  margin: 9px 0;\n  overflow: hidden;\n  background-color: #e5e5e5;\n}\n.nav > li > a > img {\n  max-width: none;\n}\n.nav-tabs {\n  border-bottom: 1px solid #dddddd;\n}\n.nav-tabs > li {\n  float: left;\n  margin-bottom: -1px;\n}\n.nav-tabs > li > a {\n  margin-right: 2px;\n  line-height: 1.42857143;\n  border: 1px solid transparent;\n  border-radius: 4px 4px 0 0;\n}\n.nav-tabs > li > a:hover {\n  border-color: #eeeeee #eeeeee #dddddd;\n}\n.nav-tabs > li.active > a,\n.nav-tabs > li.active > a:hover,\n.nav-tabs > li.active > a:focus {\n  color: #555555;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-bottom-color: transparent;\n  cursor: default;\n}\n.nav-tabs.nav-justified {\n  width: 100%;\n  border-bottom: 0;\n}\n.nav-tabs.nav-justified > li {\n  float: none;\n}\n.nav-tabs.nav-justified > li > a {\n  text-align: center;\n  margin-bottom: 5px;\n}\n.nav-tabs.nav-justified > .dropdown .dropdown-menu {\n  top: auto;\n  left: auto;\n}\n@media (min-width: 768px) {\n  .nav-tabs.nav-justified > li {\n    display: table-cell;\n    width: 1%;\n  }\n  .nav-tabs.nav-justified > li > a {\n    margin-bottom: 0;\n  }\n}\n.nav-tabs.nav-justified > li > a {\n  margin-right: 0;\n  border-radius: 4px;\n}\n.nav-tabs.nav-justified > .active > a,\n.nav-tabs.nav-justified > .active > a:hover,\n.nav-tabs.nav-justified > .active > a:focus {\n  border: 1px solid #dddddd;\n}\n@media (min-width: 768px) {\n  .nav-tabs.nav-justified > li > a {\n    border-bottom: 1px solid #dddddd;\n    border-radius: 4px 4px 0 0;\n  }\n  .nav-tabs.nav-justified > .active > a,\n  .nav-tabs.nav-justified > .active > a:hover,\n  .nav-tabs.nav-justified > .active > a:focus {\n    border-bottom-color: #ffffff;\n  }\n}\n.nav-pills > li {\n  float: left;\n}\n.nav-pills > li > a {\n  border-radius: 4px;\n}\n.nav-pills > li + li {\n  margin-left: 2px;\n}\n.nav-pills > li.active > a,\n.nav-pills > li.active > a:hover,\n.nav-pills > li.active > a:focus {\n  color: #ffffff;\n  background-color: #428bca;\n}\n.nav-stacked > li {\n  float: none;\n}\n.nav-stacked > li + li {\n  margin-top: 2px;\n  margin-left: 0;\n}\n.nav-justified {\n  width: 100%;\n}\n.nav-justified > li {\n  float: none;\n}\n.nav-justified > li > a {\n  text-align: center;\n  margin-bottom: 5px;\n}\n.nav-justified > .dropdown .dropdown-menu {\n  top: auto;\n  left: auto;\n}\n@media (min-width: 768px) {\n  .nav-justified > li {\n    display: table-cell;\n    width: 1%;\n  }\n  .nav-justified > li > a {\n    margin-bottom: 0;\n  }\n}\n.nav-tabs-justified {\n  border-bottom: 0;\n}\n.nav-tabs-justified > li > a {\n  margin-right: 0;\n  border-radius: 4px;\n}\n.nav-tabs-justified > .active > a,\n.nav-tabs-justified > .active > a:hover,\n.nav-tabs-justified > .active > a:focus {\n  border: 1px solid #dddddd;\n}\n@media (min-width: 768px) {\n  .nav-tabs-justified > li > a {\n    border-bottom: 1px solid #dddddd;\n    border-radius: 4px 4px 0 0;\n  }\n  .nav-tabs-justified > .active > a,\n  .nav-tabs-justified > .active > a:hover,\n  .nav-tabs-justified > .active > a:focus {\n    border-bottom-color: #ffffff;\n  }\n}\n.tab-content > .tab-pane {\n  display: none;\n}\n.tab-content > .active {\n  display: block;\n}\n.nav-tabs .dropdown-menu {\n  margin-top: -1px;\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.navbar {\n  position: relative;\n  min-height: 50px;\n  margin-bottom: 20px;\n  border: 1px solid transparent;\n}\n@media (min-width: 768px) {\n  .navbar {\n    border-radius: 4px;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-header {\n    float: left;\n  }\n}\n.navbar-collapse {\n  max-height: 340px;\n  overflow-x: visible;\n  padding-right: 15px;\n  padding-left: 15px;\n  border-top: 1px solid transparent;\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);\n  -webkit-overflow-scrolling: touch;\n}\n.navbar-collapse.in {\n  overflow-y: auto;\n}\n@media (min-width: 768px) {\n  .navbar-collapse {\n    width: auto;\n    border-top: 0;\n    box-shadow: none;\n  }\n  .navbar-collapse.collapse {\n    display: block !important;\n    height: auto !important;\n    padding-bottom: 0;\n    overflow: visible !important;\n  }\n  .navbar-collapse.in {\n    overflow-y: visible;\n  }\n  .navbar-fixed-top .navbar-collapse,\n  .navbar-static-top .navbar-collapse,\n  .navbar-fixed-bottom .navbar-collapse {\n    padding-left: 0;\n    padding-right: 0;\n  }\n}\n.container > .navbar-header,\n.container-fluid > .navbar-header,\n.container > .navbar-collapse,\n.container-fluid > .navbar-collapse {\n  margin-right: -15px;\n  margin-left: -15px;\n}\n@media (min-width: 768px) {\n  .container > .navbar-header,\n  .container-fluid > .navbar-header,\n  .container > .navbar-collapse,\n  .container-fluid > .navbar-collapse {\n    margin-right: 0;\n    margin-left: 0;\n  }\n}\n.navbar-static-top {\n  z-index: 1000;\n  border-width: 0 0 1px;\n}\n@media (min-width: 768px) {\n  .navbar-static-top {\n    border-radius: 0;\n  }\n}\n.navbar-fixed-top,\n.navbar-fixed-bottom {\n  position: fixed;\n  right: 0;\n  left: 0;\n  z-index: 1030;\n}\n@media (min-width: 768px) {\n  .navbar-fixed-top,\n  .navbar-fixed-bottom {\n    border-radius: 0;\n  }\n}\n.navbar-fixed-top {\n  top: 0;\n  border-width: 0 0 1px;\n}\n.navbar-fixed-bottom {\n  bottom: 0;\n  margin-bottom: 0;\n  border-width: 1px 0 0;\n}\n.navbar-brand {\n  float: left;\n  padding: 15px 15px;\n  font-size: 18px;\n  line-height: 20px;\n  height: 50px;\n}\n.navbar-brand:hover,\n.navbar-brand:focus {\n  text-decoration: none;\n}\n@media (min-width: 768px) {\n  .navbar > .container .navbar-brand,\n  .navbar > .container-fluid .navbar-brand {\n    margin-left: -15px;\n  }\n}\n.navbar-toggle {\n  position: relative;\n  float: right;\n  margin-right: 15px;\n  padding: 9px 10px;\n  margin-top: 8px;\n  margin-bottom: 8px;\n  background-color: transparent;\n  background-image: none;\n  border: 1px solid transparent;\n  border-radius: 4px;\n}\n.navbar-toggle:focus {\n  outline: none;\n}\n.navbar-toggle .icon-bar {\n  display: block;\n  width: 22px;\n  height: 2px;\n  border-radius: 1px;\n}\n.navbar-toggle .icon-bar + .icon-bar {\n  margin-top: 4px;\n}\n@media (min-width: 768px) {\n  .navbar-toggle {\n    display: none;\n  }\n}\n.navbar-nav {\n  margin: 7.5px -15px;\n}\n.navbar-nav > li > a {\n  padding-top: 10px;\n  padding-bottom: 10px;\n  line-height: 20px;\n}\n@media (max-width: 767px) {\n  .navbar-nav .open .dropdown-menu {\n    position: static;\n    float: none;\n    width: auto;\n    margin-top: 0;\n    background-color: transparent;\n    border: 0;\n    box-shadow: none;\n  }\n  .navbar-nav .open .dropdown-menu > li > a,\n  .navbar-nav .open .dropdown-menu .dropdown-header {\n    padding: 5px 15px 5px 25px;\n  }\n  .navbar-nav .open .dropdown-menu > li > a {\n    line-height: 20px;\n  }\n  .navbar-nav .open .dropdown-menu > li > a:hover,\n  .navbar-nav .open .dropdown-menu > li > a:focus {\n    background-image: none;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-nav {\n    float: left;\n    margin: 0;\n  }\n  .navbar-nav > li {\n    float: left;\n  }\n  .navbar-nav > li > a {\n    padding-top: 15px;\n    padding-bottom: 15px;\n  }\n  .navbar-nav.navbar-right:last-child {\n    margin-right: -15px;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-left {\n    float: left !important;\n  }\n  .navbar-right {\n    float: right !important;\n  }\n}\n.navbar-form {\n  margin-left: -15px;\n  margin-right: -15px;\n  padding: 10px 15px;\n  border-top: 1px solid transparent;\n  border-bottom: 1px solid transparent;\n  -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1);\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 0 rgba(255, 255, 255, 0.1);\n  margin-top: 8px;\n  margin-bottom: 8px;\n}\n@media (min-width: 768px) {\n  .navbar-form .form-group {\n    display: inline-block;\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .navbar-form .form-control {\n    display: inline-block;\n    width: auto;\n    vertical-align: middle;\n  }\n  .navbar-form .input-group > .form-control {\n    width: 100%;\n  }\n  .navbar-form .control-label {\n    margin-bottom: 0;\n    vertical-align: middle;\n  }\n  .navbar-form .radio,\n  .navbar-form .checkbox {\n    display: inline-block;\n    margin-top: 0;\n    margin-bottom: 0;\n    padding-left: 0;\n    vertical-align: middle;\n  }\n  .navbar-form .radio input[type=\"radio\"],\n  .navbar-form .checkbox input[type=\"checkbox\"] {\n    float: none;\n    margin-left: 0;\n  }\n  .navbar-form .has-feedback .form-control-feedback {\n    top: 0;\n  }\n}\n@media (max-width: 767px) {\n  .navbar-form .form-group {\n    margin-bottom: 5px;\n  }\n}\n@media (min-width: 768px) {\n  .navbar-form {\n    width: auto;\n    border: 0;\n    margin-left: 0;\n    margin-right: 0;\n    padding-top: 0;\n    padding-bottom: 0;\n    -webkit-box-shadow: none;\n    box-shadow: none;\n  }\n  .navbar-form.navbar-right:last-child {\n    margin-right: -15px;\n  }\n}\n.navbar-nav > li > .dropdown-menu {\n  margin-top: 0;\n  border-top-right-radius: 0;\n  border-top-left-radius: 0;\n}\n.navbar-fixed-bottom .navbar-nav > li > .dropdown-menu {\n  border-bottom-right-radius: 0;\n  border-bottom-left-radius: 0;\n}\n.navbar-btn {\n  margin-top: 8px;\n  margin-bottom: 8px;\n}\n.navbar-btn.btn-sm {\n  margin-top: 10px;\n  margin-bottom: 10px;\n}\n.navbar-btn.btn-xs {\n  margin-top: 14px;\n  margin-bottom: 14px;\n}\n.navbar-text {\n  margin-top: 15px;\n  margin-bottom: 15px;\n}\n@media (min-width: 768px) {\n  .navbar-text {\n    float: left;\n    margin-left: 15px;\n    margin-right: 15px;\n  }\n  .navbar-text.navbar-right:last-child {\n    margin-right: 0;\n  }\n}\n.navbar-default {\n  background-color: #f8f8f8;\n  border-color: #e7e7e7;\n}\n.navbar-default .navbar-brand {\n  color: #777777;\n}\n.navbar-default .navbar-brand:hover,\n.navbar-default .navbar-brand:focus {\n  color: #5e5e5e;\n  background-color: transparent;\n}\n.navbar-default .navbar-text {\n  color: #777777;\n}\n.navbar-default .navbar-nav > li > a {\n  color: #777777;\n}\n.navbar-default .navbar-nav > li > a:hover,\n.navbar-default .navbar-nav > li > a:focus {\n  color: #333333;\n  background-color: transparent;\n}\n.navbar-default .navbar-nav > .active > a,\n.navbar-default .navbar-nav > .active > a:hover,\n.navbar-default .navbar-nav > .active > a:focus {\n  color: #555555;\n  background-color: #e7e7e7;\n}\n.navbar-default .navbar-nav > .disabled > a,\n.navbar-default .navbar-nav > .disabled > a:hover,\n.navbar-default .navbar-nav > .disabled > a:focus {\n  color: #cccccc;\n  background-color: transparent;\n}\n.navbar-default .navbar-toggle {\n  border-color: #dddddd;\n}\n.navbar-default .navbar-toggle:hover,\n.navbar-default .navbar-toggle:focus {\n  background-color: #dddddd;\n}\n.navbar-default .navbar-toggle .icon-bar {\n  background-color: #888888;\n}\n.navbar-default .navbar-collapse,\n.navbar-default .navbar-form {\n  border-color: #e7e7e7;\n}\n.navbar-default .navbar-nav > .open > a,\n.navbar-default .navbar-nav > .open > a:hover,\n.navbar-default .navbar-nav > .open > a:focus {\n  background-color: #e7e7e7;\n  color: #555555;\n}\n@media (max-width: 767px) {\n  .navbar-default .navbar-nav .open .dropdown-menu > li > a {\n    color: #777777;\n  }\n  .navbar-default .navbar-nav .open .dropdown-menu > li > a:hover,\n  .navbar-default .navbar-nav .open .dropdown-menu > li > a:focus {\n    color: #333333;\n    background-color: transparent;\n  }\n  .navbar-default .navbar-nav .open .dropdown-menu > .active > a,\n  .navbar-default .navbar-nav .open .dropdown-menu > .active > a:hover,\n  .navbar-default .navbar-nav .open .dropdown-menu > .active > a:focus {\n    color: #555555;\n    background-color: #e7e7e7;\n  }\n  .navbar-default .navbar-nav .open .dropdown-menu > .disabled > a,\n  .navbar-default .navbar-nav .open .dropdown-menu > .disabled > a:hover,\n  .navbar-default .navbar-nav .open .dropdown-menu > .disabled > a:focus {\n    color: #cccccc;\n    background-color: transparent;\n  }\n}\n.navbar-default .navbar-link {\n  color: #777777;\n}\n.navbar-default .navbar-link:hover {\n  color: #333333;\n}\n.navbar-inverse {\n  background-color: #222222;\n  border-color: #080808;\n}\n.navbar-inverse .navbar-brand {\n  color: #999999;\n}\n.navbar-inverse .navbar-brand:hover,\n.navbar-inverse .navbar-brand:focus {\n  color: #ffffff;\n  background-color: transparent;\n}\n.navbar-inverse .navbar-text {\n  color: #999999;\n}\n.navbar-inverse .navbar-nav > li > a {\n  color: #999999;\n}\n.navbar-inverse .navbar-nav > li > a:hover,\n.navbar-inverse .navbar-nav > li > a:focus {\n  color: #ffffff;\n  background-color: transparent;\n}\n.navbar-inverse .navbar-nav > .active > a,\n.navbar-inverse .navbar-nav > .active > a:hover,\n.navbar-inverse .navbar-nav > .active > a:focus {\n  color: #ffffff;\n  background-color: #080808;\n}\n.navbar-inverse .navbar-nav > .disabled > a,\n.navbar-inverse .navbar-nav > .disabled > a:hover,\n.navbar-inverse .navbar-nav > .disabled > a:focus {\n  color: #444444;\n  background-color: transparent;\n}\n.navbar-inverse .navbar-toggle {\n  border-color: #333333;\n}\n.navbar-inverse .navbar-toggle:hover,\n.navbar-inverse .navbar-toggle:focus {\n  background-color: #333333;\n}\n.navbar-inverse .navbar-toggle .icon-bar {\n  background-color: #ffffff;\n}\n.navbar-inverse .navbar-collapse,\n.navbar-inverse .navbar-form {\n  border-color: #101010;\n}\n.navbar-inverse .navbar-nav > .open > a,\n.navbar-inverse .navbar-nav > .open > a:hover,\n.navbar-inverse .navbar-nav > .open > a:focus {\n  background-color: #080808;\n  color: #ffffff;\n}\n@media (max-width: 767px) {\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .dropdown-header {\n    border-color: #080808;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu .divider {\n    background-color: #080808;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > li > a {\n    color: #999999;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > li > a:hover,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > li > a:focus {\n    color: #ffffff;\n    background-color: transparent;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .active > a,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .active > a:hover,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .active > a:focus {\n    color: #ffffff;\n    background-color: #080808;\n  }\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .disabled > a,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .disabled > a:hover,\n  .navbar-inverse .navbar-nav .open .dropdown-menu > .disabled > a:focus {\n    color: #444444;\n    background-color: transparent;\n  }\n}\n.navbar-inverse .navbar-link {\n  color: #999999;\n}\n.navbar-inverse .navbar-link:hover {\n  color: #ffffff;\n}\n.breadcrumb {\n  padding: 8px 15px;\n  margin-bottom: 20px;\n  list-style: none;\n  background-color: #f5f5f5;\n  border-radius: 4px;\n}\n.breadcrumb > li {\n  display: inline-block;\n}\n.breadcrumb > li + li:before {\n  content: \"/\\00a0\";\n  padding: 0 5px;\n  color: #cccccc;\n}\n.breadcrumb > .active {\n  color: #999999;\n}\n.pagination {\n  display: inline-block;\n  padding-left: 0;\n  margin: 20px 0;\n  border-radius: 4px;\n}\n.pagination > li {\n  display: inline;\n}\n.pagination > li > a,\n.pagination > li > span {\n  position: relative;\n  float: left;\n  padding: 6px 12px;\n  line-height: 1.42857143;\n  text-decoration: none;\n  color: #428bca;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  margin-left: -1px;\n}\n.pagination > li:first-child > a,\n.pagination > li:first-child > span {\n  margin-left: 0;\n  border-bottom-left-radius: 4px;\n  border-top-left-radius: 4px;\n}\n.pagination > li:last-child > a,\n.pagination > li:last-child > span {\n  border-bottom-right-radius: 4px;\n  border-top-right-radius: 4px;\n}\n.pagination > li > a:hover,\n.pagination > li > span:hover,\n.pagination > li > a:focus,\n.pagination > li > span:focus {\n  color: #2a6496;\n  background-color: #eeeeee;\n  border-color: #dddddd;\n}\n.pagination > .active > a,\n.pagination > .active > span,\n.pagination > .active > a:hover,\n.pagination > .active > span:hover,\n.pagination > .active > a:focus,\n.pagination > .active > span:focus {\n  z-index: 2;\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #428bca;\n  cursor: default;\n}\n.pagination > .disabled > span,\n.pagination > .disabled > span:hover,\n.pagination > .disabled > span:focus,\n.pagination > .disabled > a,\n.pagination > .disabled > a:hover,\n.pagination > .disabled > a:focus {\n  color: #999999;\n  background-color: #ffffff;\n  border-color: #dddddd;\n  cursor: not-allowed;\n}\n.pagination-lg > li > a,\n.pagination-lg > li > span {\n  padding: 10px 16px;\n  font-size: 18px;\n}\n.pagination-lg > li:first-child > a,\n.pagination-lg > li:first-child > span {\n  border-bottom-left-radius: 6px;\n  border-top-left-radius: 6px;\n}\n.pagination-lg > li:last-child > a,\n.pagination-lg > li:last-child > span {\n  border-bottom-right-radius: 6px;\n  border-top-right-radius: 6px;\n}\n.pagination-sm > li > a,\n.pagination-sm > li > span {\n  padding: 5px 10px;\n  font-size: 12px;\n}\n.pagination-sm > li:first-child > a,\n.pagination-sm > li:first-child > span {\n  border-bottom-left-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.pagination-sm > li:last-child > a,\n.pagination-sm > li:last-child > span {\n  border-bottom-right-radius: 3px;\n  border-top-right-radius: 3px;\n}\n.pager {\n  padding-left: 0;\n  margin: 20px 0;\n  list-style: none;\n  text-align: center;\n}\n.pager li {\n  display: inline;\n}\n.pager li > a,\n.pager li > span {\n  display: inline-block;\n  padding: 5px 14px;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-radius: 15px;\n}\n.pager li > a:hover,\n.pager li > a:focus {\n  text-decoration: none;\n  background-color: #eeeeee;\n}\n.pager .next > a,\n.pager .next > span {\n  float: right;\n}\n.pager .previous > a,\n.pager .previous > span {\n  float: left;\n}\n.pager .disabled > a,\n.pager .disabled > a:hover,\n.pager .disabled > a:focus,\n.pager .disabled > span {\n  color: #999999;\n  background-color: #ffffff;\n  cursor: not-allowed;\n}\n.label {\n  display: inline;\n  padding: .2em .6em .3em;\n  font-size: 75%;\n  font-weight: bold;\n  line-height: 1;\n  color: #ffffff;\n  text-align: center;\n  white-space: nowrap;\n  vertical-align: baseline;\n  border-radius: .25em;\n}\n.label[href]:hover,\n.label[href]:focus {\n  color: #ffffff;\n  text-decoration: none;\n  cursor: pointer;\n}\n.label:empty {\n  display: none;\n}\n.btn .label {\n  position: relative;\n  top: -1px;\n}\n.label-default {\n  background-color: #999999;\n}\n.label-default[href]:hover,\n.label-default[href]:focus {\n  background-color: #808080;\n}\n.label-primary {\n  background-color: #428bca;\n}\n.label-primary[href]:hover,\n.label-primary[href]:focus {\n  background-color: #3071a9;\n}\n.label-success {\n  background-color: #5cb85c;\n}\n.label-success[href]:hover,\n.label-success[href]:focus {\n  background-color: #449d44;\n}\n.label-info {\n  background-color: #5bc0de;\n}\n.label-info[href]:hover,\n.label-info[href]:focus {\n  background-color: #31b0d5;\n}\n.label-warning {\n  background-color: #f0ad4e;\n}\n.label-warning[href]:hover,\n.label-warning[href]:focus {\n  background-color: #ec971f;\n}\n.label-danger {\n  background-color: #d9534f;\n}\n.label-danger[href]:hover,\n.label-danger[href]:focus {\n  background-color: #c9302c;\n}\n.badge {\n  display: inline-block;\n  min-width: 10px;\n  padding: 3px 7px;\n  font-size: 12px;\n  font-weight: bold;\n  color: #ffffff;\n  line-height: 1;\n  vertical-align: baseline;\n  white-space: nowrap;\n  text-align: center;\n  background-color: #999999;\n  border-radius: 10px;\n}\n.badge:empty {\n  display: none;\n}\n.btn .badge {\n  position: relative;\n  top: -1px;\n}\n.btn-xs .badge {\n  top: 0;\n  padding: 1px 5px;\n}\na.badge:hover,\na.badge:focus {\n  color: #ffffff;\n  text-decoration: none;\n  cursor: pointer;\n}\na.list-group-item.active > .badge,\n.nav-pills > .active > a > .badge {\n  color: #428bca;\n  background-color: #ffffff;\n}\n.nav-pills > li > a > .badge {\n  margin-left: 3px;\n}\n.jumbotron {\n  padding: 30px;\n  margin-bottom: 30px;\n  color: inherit;\n  background-color: #eeeeee;\n}\n.jumbotron h1,\n.jumbotron .h1 {\n  color: inherit;\n}\n.jumbotron p {\n  margin-bottom: 15px;\n  font-size: 21px;\n  font-weight: 200;\n}\n.container .jumbotron {\n  border-radius: 6px;\n}\n.jumbotron .container {\n  max-width: 100%;\n}\n@media screen and (min-width: 768px) {\n  .jumbotron {\n    padding-top: 48px;\n    padding-bottom: 48px;\n  }\n  .container .jumbotron {\n    padding-left: 60px;\n    padding-right: 60px;\n  }\n  .jumbotron h1,\n  .jumbotron .h1 {\n    font-size: 63px;\n  }\n}\n.thumbnail {\n  display: block;\n  padding: 4px;\n  margin-bottom: 20px;\n  line-height: 1.42857143;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n  border-radius: 4px;\n  -webkit-transition: all 0.2s ease-in-out;\n  transition: all 0.2s ease-in-out;\n}\n.thumbnail > img,\n.thumbnail a > img {\n  margin-left: auto;\n  margin-right: auto;\n}\na.thumbnail:hover,\na.thumbnail:focus,\na.thumbnail.active {\n  border-color: #428bca;\n}\n.thumbnail .caption {\n  padding: 9px;\n  color: #333333;\n}\n.alert {\n  padding: 15px;\n  margin-bottom: 20px;\n  border: 1px solid transparent;\n  border-radius: 4px;\n}\n.alert h4 {\n  margin-top: 0;\n  color: inherit;\n}\n.alert .alert-link {\n  font-weight: bold;\n}\n.alert > p,\n.alert > ul {\n  margin-bottom: 0;\n}\n.alert > p + p {\n  margin-top: 5px;\n}\n.alert-dismissable {\n  padding-right: 35px;\n}\n.alert-dismissable .close {\n  position: relative;\n  top: -2px;\n  right: -21px;\n  color: inherit;\n}\n.alert-success {\n  background-color: #dff0d8;\n  border-color: #d6e9c6;\n  color: #3c763d;\n}\n.alert-success hr {\n  border-top-color: #c9e2b3;\n}\n.alert-success .alert-link {\n  color: #2b542c;\n}\n.alert-info {\n  background-color: #d9edf7;\n  border-color: #bce8f1;\n  color: #31708f;\n}\n.alert-info hr {\n  border-top-color: #a6e1ec;\n}\n.alert-info .alert-link {\n  color: #245269;\n}\n.alert-warning {\n  background-color: #fcf8e3;\n  border-color: #faebcc;\n  color: #8a6d3b;\n}\n.alert-warning hr {\n  border-top-color: #f7e1b5;\n}\n.alert-warning .alert-link {\n  color: #66512c;\n}\n.alert-danger {\n  background-color: #f2dede;\n  border-color: #ebccd1;\n  color: #a94442;\n}\n.alert-danger hr {\n  border-top-color: #e4b9c0;\n}\n.alert-danger .alert-link {\n  color: #843534;\n}\n@-webkit-keyframes progress-bar-stripes {\n  from {\n    background-position: 40px 0;\n  }\n  to {\n    background-position: 0 0;\n  }\n}\n@keyframes progress-bar-stripes {\n  from {\n    background-position: 40px 0;\n  }\n  to {\n    background-position: 0 0;\n  }\n}\n.progress {\n  overflow: hidden;\n  height: 20px;\n  margin-bottom: 20px;\n  background-color: #f5f5f5;\n  border-radius: 4px;\n  -webkit-box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n.progress-bar {\n  float: left;\n  width: 0%;\n  height: 100%;\n  font-size: 12px;\n  line-height: 20px;\n  color: #ffffff;\n  text-align: center;\n  background-color: #428bca;\n  -webkit-box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.15);\n  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.15);\n  -webkit-transition: width 0.6s ease;\n  transition: width 0.6s ease;\n}\n.progress-striped .progress-bar {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-size: 40px 40px;\n}\n.progress.active .progress-bar {\n  -webkit-animation: progress-bar-stripes 2s linear infinite;\n  animation: progress-bar-stripes 2s linear infinite;\n}\n.progress-bar-success {\n  background-color: #5cb85c;\n}\n.progress-striped .progress-bar-success {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.progress-bar-info {\n  background-color: #5bc0de;\n}\n.progress-striped .progress-bar-info {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.progress-bar-warning {\n  background-color: #f0ad4e;\n}\n.progress-striped .progress-bar-warning {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.progress-bar-danger {\n  background-color: #d9534f;\n}\n.progress-striped .progress-bar-danger {\n  background-image: -webkit-linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent);\n}\n.media,\n.media-body {\n  overflow: hidden;\n  zoom: 1;\n}\n.media,\n.media .media {\n  margin-top: 15px;\n}\n.media:first-child {\n  margin-top: 0;\n}\n.media-object {\n  display: block;\n}\n.media-heading {\n  margin: 0 0 5px;\n}\n.media > .pull-left {\n  margin-right: 10px;\n}\n.media > .pull-right {\n  margin-left: 10px;\n}\n.media-list {\n  padding-left: 0;\n  list-style: none;\n}\n.list-group {\n  margin-bottom: 20px;\n  padding-left: 0;\n}\n.list-group-item {\n  position: relative;\n  display: block;\n  padding: 10px 15px;\n  margin-bottom: -1px;\n  background-color: #ffffff;\n  border: 1px solid #dddddd;\n}\n.list-group-item:first-child {\n  border-top-right-radius: 4px;\n  border-top-left-radius: 4px;\n}\n.list-group-item:last-child {\n  margin-bottom: 0;\n  border-bottom-right-radius: 4px;\n  border-bottom-left-radius: 4px;\n}\n.list-group-item > .badge {\n  float: right;\n}\n.list-group-item > .badge + .badge {\n  margin-right: 5px;\n}\na.list-group-item {\n  color: #555555;\n}\na.list-group-item .list-group-item-heading {\n  color: #333333;\n}\na.list-group-item:hover,\na.list-group-item:focus {\n  text-decoration: none;\n  background-color: #f5f5f5;\n}\na.list-group-item.active,\na.list-group-item.active:hover,\na.list-group-item.active:focus {\n  z-index: 2;\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #428bca;\n}\na.list-group-item.active .list-group-item-heading,\na.list-group-item.active:hover .list-group-item-heading,\na.list-group-item.active:focus .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item.active .list-group-item-text,\na.list-group-item.active:hover .list-group-item-text,\na.list-group-item.active:focus .list-group-item-text {\n  color: #e1edf7;\n}\n.list-group-item-success {\n  color: #3c763d;\n  background-color: #dff0d8;\n}\na.list-group-item-success {\n  color: #3c763d;\n}\na.list-group-item-success .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-success:hover,\na.list-group-item-success:focus {\n  color: #3c763d;\n  background-color: #d0e9c6;\n}\na.list-group-item-success.active,\na.list-group-item-success.active:hover,\na.list-group-item-success.active:focus {\n  color: #fff;\n  background-color: #3c763d;\n  border-color: #3c763d;\n}\n.list-group-item-info {\n  color: #31708f;\n  background-color: #d9edf7;\n}\na.list-group-item-info {\n  color: #31708f;\n}\na.list-group-item-info .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-info:hover,\na.list-group-item-info:focus {\n  color: #31708f;\n  background-color: #c4e3f3;\n}\na.list-group-item-info.active,\na.list-group-item-info.active:hover,\na.list-group-item-info.active:focus {\n  color: #fff;\n  background-color: #31708f;\n  border-color: #31708f;\n}\n.list-group-item-warning {\n  color: #8a6d3b;\n  background-color: #fcf8e3;\n}\na.list-group-item-warning {\n  color: #8a6d3b;\n}\na.list-group-item-warning .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-warning:hover,\na.list-group-item-warning:focus {\n  color: #8a6d3b;\n  background-color: #faf2cc;\n}\na.list-group-item-warning.active,\na.list-group-item-warning.active:hover,\na.list-group-item-warning.active:focus {\n  color: #fff;\n  background-color: #8a6d3b;\n  border-color: #8a6d3b;\n}\n.list-group-item-danger {\n  color: #a94442;\n  background-color: #f2dede;\n}\na.list-group-item-danger {\n  color: #a94442;\n}\na.list-group-item-danger .list-group-item-heading {\n  color: inherit;\n}\na.list-group-item-danger:hover,\na.list-group-item-danger:focus {\n  color: #a94442;\n  background-color: #ebcccc;\n}\na.list-group-item-danger.active,\na.list-group-item-danger.active:hover,\na.list-group-item-danger.active:focus {\n  color: #fff;\n  background-color: #a94442;\n  border-color: #a94442;\n}\n.list-group-item-heading {\n  margin-top: 0;\n  margin-bottom: 5px;\n}\n.list-group-item-text {\n  margin-bottom: 0;\n  line-height: 1.3;\n}\n.panel {\n  margin-bottom: 20px;\n  background-color: #ffffff;\n  border: 1px solid transparent;\n  border-radius: 4px;\n  -webkit-box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);\n  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);\n}\n.panel-body {\n  padding: 15px;\n}\n.panel-heading {\n  padding: 10px 15px;\n  border-bottom: 1px solid transparent;\n  border-top-right-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.panel-heading > .dropdown .dropdown-toggle {\n  color: inherit;\n}\n.panel-title {\n  margin-top: 0;\n  margin-bottom: 0;\n  font-size: 16px;\n  color: inherit;\n}\n.panel-title > a {\n  color: inherit;\n}\n.panel-footer {\n  padding: 10px 15px;\n  background-color: #f5f5f5;\n  border-top: 1px solid #dddddd;\n  border-bottom-right-radius: 3px;\n  border-bottom-left-radius: 3px;\n}\n.panel > .list-group {\n  margin-bottom: 0;\n}\n.panel > .list-group .list-group-item {\n  border-width: 1px 0;\n  border-radius: 0;\n}\n.panel > .list-group:first-child .list-group-item:first-child {\n  border-top: 0;\n  border-top-right-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.panel > .list-group:last-child .list-group-item:last-child {\n  border-bottom: 0;\n  border-bottom-right-radius: 3px;\n  border-bottom-left-radius: 3px;\n}\n.panel-heading + .list-group .list-group-item:first-child {\n  border-top-width: 0;\n}\n.panel > .table,\n.panel > .table-responsive > .table {\n  margin-bottom: 0;\n}\n.panel > .table:first-child,\n.panel > .table-responsive:first-child > .table:first-child {\n  border-top-right-radius: 3px;\n  border-top-left-radius: 3px;\n}\n.panel > .table:first-child > thead:first-child > tr:first-child td:first-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child td:first-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child td:first-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child td:first-child,\n.panel > .table:first-child > thead:first-child > tr:first-child th:first-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child th:first-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child th:first-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child th:first-child {\n  border-top-left-radius: 3px;\n}\n.panel > .table:first-child > thead:first-child > tr:first-child td:last-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child td:last-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child td:last-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child td:last-child,\n.panel > .table:first-child > thead:first-child > tr:first-child th:last-child,\n.panel > .table-responsive:first-child > .table:first-child > thead:first-child > tr:first-child th:last-child,\n.panel > .table:first-child > tbody:first-child > tr:first-child th:last-child,\n.panel > .table-responsive:first-child > .table:first-child > tbody:first-child > tr:first-child th:last-child {\n  border-top-right-radius: 3px;\n}\n.panel > .table:last-child,\n.panel > .table-responsive:last-child > .table:last-child {\n  border-bottom-right-radius: 3px;\n  border-bottom-left-radius: 3px;\n}\n.panel > .table:last-child > tbody:last-child > tr:last-child td:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child td:first-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child td:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child td:first-child,\n.panel > .table:last-child > tbody:last-child > tr:last-child th:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child th:first-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child th:first-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child th:first-child {\n  border-bottom-left-radius: 3px;\n}\n.panel > .table:last-child > tbody:last-child > tr:last-child td:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child td:last-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child td:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child td:last-child,\n.panel > .table:last-child > tbody:last-child > tr:last-child th:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tbody:last-child > tr:last-child th:last-child,\n.panel > .table:last-child > tfoot:last-child > tr:last-child th:last-child,\n.panel > .table-responsive:last-child > .table:last-child > tfoot:last-child > tr:last-child th:last-child {\n  border-bottom-right-radius: 3px;\n}\n.panel > .panel-body + .table,\n.panel > .panel-body + .table-responsive {\n  border-top: 1px solid #dddddd;\n}\n.panel > .table > tbody:first-child > tr:first-child th,\n.panel > .table > tbody:first-child > tr:first-child td {\n  border-top: 0;\n}\n.panel > .table-bordered,\n.panel > .table-responsive > .table-bordered {\n  border: 0;\n}\n.panel > .table-bordered > thead > tr > th:first-child,\n.panel > .table-responsive > .table-bordered > thead > tr > th:first-child,\n.panel > .table-bordered > tbody > tr > th:first-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > th:first-child,\n.panel > .table-bordered > tfoot > tr > th:first-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > th:first-child,\n.panel > .table-bordered > thead > tr > td:first-child,\n.panel > .table-responsive > .table-bordered > thead > tr > td:first-child,\n.panel > .table-bordered > tbody > tr > td:first-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > td:first-child,\n.panel > .table-bordered > tfoot > tr > td:first-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > td:first-child {\n  border-left: 0;\n}\n.panel > .table-bordered > thead > tr > th:last-child,\n.panel > .table-responsive > .table-bordered > thead > tr > th:last-child,\n.panel > .table-bordered > tbody > tr > th:last-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > th:last-child,\n.panel > .table-bordered > tfoot > tr > th:last-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > th:last-child,\n.panel > .table-bordered > thead > tr > td:last-child,\n.panel > .table-responsive > .table-bordered > thead > tr > td:last-child,\n.panel > .table-bordered > tbody > tr > td:last-child,\n.panel > .table-responsive > .table-bordered > tbody > tr > td:last-child,\n.panel > .table-bordered > tfoot > tr > td:last-child,\n.panel > .table-responsive > .table-bordered > tfoot > tr > td:last-child {\n  border-right: 0;\n}\n.panel > .table-bordered > thead > tr:first-child > td,\n.panel > .table-responsive > .table-bordered > thead > tr:first-child > td,\n.panel > .table-bordered > tbody > tr:first-child > td,\n.panel > .table-responsive > .table-bordered > tbody > tr:first-child > td,\n.panel > .table-bordered > thead > tr:first-child > th,\n.panel > .table-responsive > .table-bordered > thead > tr:first-child > th,\n.panel > .table-bordered > tbody > tr:first-child > th,\n.panel > .table-responsive > .table-bordered > tbody > tr:first-child > th {\n  border-bottom: 0;\n}\n.panel > .table-bordered > tbody > tr:last-child > td,\n.panel > .table-responsive > .table-bordered > tbody > tr:last-child > td,\n.panel > .table-bordered > tfoot > tr:last-child > td,\n.panel > .table-responsive > .table-bordered > tfoot > tr:last-child > td,\n.panel > .table-bordered > tbody > tr:last-child > th,\n.panel > .table-responsive > .table-bordered > tbody > tr:last-child > th,\n.panel > .table-bordered > tfoot > tr:last-child > th,\n.panel > .table-responsive > .table-bordered > tfoot > tr:last-child > th {\n  border-bottom: 0;\n}\n.panel > .table-responsive {\n  border: 0;\n  margin-bottom: 0;\n}\n.panel-group {\n  margin-bottom: 20px;\n}\n.panel-group .panel {\n  margin-bottom: 0;\n  border-radius: 4px;\n  overflow: hidden;\n}\n.panel-group .panel + .panel {\n  margin-top: 5px;\n}\n.panel-group .panel-heading {\n  border-bottom: 0;\n}\n.panel-group .panel-heading + .panel-collapse .panel-body {\n  border-top: 1px solid #dddddd;\n}\n.panel-group .panel-footer {\n  border-top: 0;\n}\n.panel-group .panel-footer + .panel-collapse .panel-body {\n  border-bottom: 1px solid #dddddd;\n}\n.panel-default {\n  border-color: #dddddd;\n}\n.panel-default > .panel-heading {\n  color: #333333;\n  background-color: #f5f5f5;\n  border-color: #dddddd;\n}\n.panel-default > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #dddddd;\n}\n.panel-default > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #dddddd;\n}\n.panel-primary {\n  border-color: #428bca;\n}\n.panel-primary > .panel-heading {\n  color: #ffffff;\n  background-color: #428bca;\n  border-color: #428bca;\n}\n.panel-primary > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #428bca;\n}\n.panel-primary > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #428bca;\n}\n.panel-success {\n  border-color: #d6e9c6;\n}\n.panel-success > .panel-heading {\n  color: #3c763d;\n  background-color: #dff0d8;\n  border-color: #d6e9c6;\n}\n.panel-success > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #d6e9c6;\n}\n.panel-success > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #d6e9c6;\n}\n.panel-info {\n  border-color: #bce8f1;\n}\n.panel-info > .panel-heading {\n  color: #31708f;\n  background-color: #d9edf7;\n  border-color: #bce8f1;\n}\n.panel-info > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #bce8f1;\n}\n.panel-info > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #bce8f1;\n}\n.panel-warning {\n  border-color: #faebcc;\n}\n.panel-warning > .panel-heading {\n  color: #8a6d3b;\n  background-color: #fcf8e3;\n  border-color: #faebcc;\n}\n.panel-warning > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #faebcc;\n}\n.panel-warning > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #faebcc;\n}\n.panel-danger {\n  border-color: #ebccd1;\n}\n.panel-danger > .panel-heading {\n  color: #a94442;\n  background-color: #f2dede;\n  border-color: #ebccd1;\n}\n.panel-danger > .panel-heading + .panel-collapse .panel-body {\n  border-top-color: #ebccd1;\n}\n.panel-danger > .panel-footer + .panel-collapse .panel-body {\n  border-bottom-color: #ebccd1;\n}\n.well {\n  min-height: 20px;\n  padding: 19px;\n  margin-bottom: 20px;\n  background-color: #f5f5f5;\n  border: 1px solid #e3e3e3;\n  border-radius: 4px;\n  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);\n}\n.well blockquote {\n  border-color: #ddd;\n  border-color: rgba(0, 0, 0, 0.15);\n}\n.well-lg {\n  padding: 24px;\n  border-radius: 6px;\n}\n.well-sm {\n  padding: 9px;\n  border-radius: 3px;\n}\n.close {\n  float: right;\n  font-size: 21px;\n  font-weight: bold;\n  line-height: 1;\n  color: #000000;\n  text-shadow: 0 1px 0 #ffffff;\n  opacity: 0.2;\n  filter: alpha(opacity=20);\n}\n.close:hover,\n.close:focus {\n  color: #000000;\n  text-decoration: none;\n  cursor: pointer;\n  opacity: 0.5;\n  filter: alpha(opacity=50);\n}\nbutton.close {\n  padding: 0;\n  cursor: pointer;\n  background: transparent;\n  border: 0;\n  -webkit-appearance: none;\n}\n.modal-open {\n  overflow: hidden;\n}\n.modal {\n  display: none;\n  overflow: auto;\n  overflow-y: scroll;\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1050;\n  -webkit-overflow-scrolling: touch;\n  outline: 0;\n}\n.modal.fade .modal-dialog {\n  -webkit-transform: translate(0, -25%);\n  -ms-transform: translate(0, -25%);\n  transform: translate(0, -25%);\n  -webkit-transition: -webkit-transform 0.3s ease-out;\n  -moz-transition: -moz-transform 0.3s ease-out;\n  -o-transition: -o-transform 0.3s ease-out;\n  transition: transform 0.3s ease-out;\n}\n.modal.in .modal-dialog {\n  -webkit-transform: translate(0, 0);\n  -ms-transform: translate(0, 0);\n  transform: translate(0, 0);\n}\n.modal-dialog {\n  position: relative;\n  width: auto;\n  margin: 10px;\n}\n.modal-content {\n  position: relative;\n  background-color: #ffffff;\n  border: 1px solid #999999;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 6px;\n  -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);\n  box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);\n  background-clip: padding-box;\n  outline: none;\n}\n.modal-backdrop {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1040;\n  background-color: #000000;\n}\n.modal-backdrop.fade {\n  opacity: 0;\n  filter: alpha(opacity=0);\n}\n.modal-backdrop.in {\n  opacity: 0.5;\n  filter: alpha(opacity=50);\n}\n.modal-header {\n  padding: 15px;\n  border-bottom: 1px solid #e5e5e5;\n  min-height: 16.42857143px;\n}\n.modal-header .close {\n  margin-top: -2px;\n}\n.modal-title {\n  margin: 0;\n  line-height: 1.42857143;\n}\n.modal-body {\n  position: relative;\n  padding: 20px;\n}\n.modal-footer {\n  margin-top: 15px;\n  padding: 19px 20px 20px;\n  text-align: right;\n  border-top: 1px solid #e5e5e5;\n}\n.modal-footer .btn + .btn {\n  margin-left: 5px;\n  margin-bottom: 0;\n}\n.modal-footer .btn-group .btn + .btn {\n  margin-left: -1px;\n}\n.modal-footer .btn-block + .btn-block {\n  margin-left: 0;\n}\n@media (min-width: 768px) {\n  .modal-dialog {\n    width: 600px;\n    margin: 30px auto;\n  }\n  .modal-content {\n    -webkit-box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);\n    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);\n  }\n  .modal-sm {\n    width: 300px;\n  }\n}\n@media (min-width: 992px) {\n  .modal-lg {\n    width: 900px;\n  }\n}\n.tooltip {\n  position: absolute;\n  z-index: 1030;\n  display: block;\n  visibility: visible;\n  font-size: 12px;\n  line-height: 1.4;\n  opacity: 0;\n  filter: alpha(opacity=0);\n}\n.tooltip.in {\n  opacity: 0.9;\n  filter: alpha(opacity=90);\n}\n.tooltip.top {\n  margin-top: -3px;\n  padding: 5px 0;\n}\n.tooltip.right {\n  margin-left: 3px;\n  padding: 0 5px;\n}\n.tooltip.bottom {\n  margin-top: 3px;\n  padding: 5px 0;\n}\n.tooltip.left {\n  margin-left: -3px;\n  padding: 0 5px;\n}\n.tooltip-inner {\n  max-width: 200px;\n  padding: 3px 8px;\n  color: #ffffff;\n  text-align: center;\n  text-decoration: none;\n  background-color: #000000;\n  border-radius: 4px;\n}\n.tooltip-arrow {\n  position: absolute;\n  width: 0;\n  height: 0;\n  border-color: transparent;\n  border-style: solid;\n}\n.tooltip.top .tooltip-arrow {\n  bottom: 0;\n  left: 50%;\n  margin-left: -5px;\n  border-width: 5px 5px 0;\n  border-top-color: #000000;\n}\n.tooltip.top-left .tooltip-arrow {\n  bottom: 0;\n  left: 5px;\n  border-width: 5px 5px 0;\n  border-top-color: #000000;\n}\n.tooltip.top-right .tooltip-arrow {\n  bottom: 0;\n  right: 5px;\n  border-width: 5px 5px 0;\n  border-top-color: #000000;\n}\n.tooltip.right .tooltip-arrow {\n  top: 50%;\n  left: 0;\n  margin-top: -5px;\n  border-width: 5px 5px 5px 0;\n  border-right-color: #000000;\n}\n.tooltip.left .tooltip-arrow {\n  top: 50%;\n  right: 0;\n  margin-top: -5px;\n  border-width: 5px 0 5px 5px;\n  border-left-color: #000000;\n}\n.tooltip.bottom .tooltip-arrow {\n  top: 0;\n  left: 50%;\n  margin-left: -5px;\n  border-width: 0 5px 5px;\n  border-bottom-color: #000000;\n}\n.tooltip.bottom-left .tooltip-arrow {\n  top: 0;\n  left: 5px;\n  border-width: 0 5px 5px;\n  border-bottom-color: #000000;\n}\n.tooltip.bottom-right .tooltip-arrow {\n  top: 0;\n  right: 5px;\n  border-width: 0 5px 5px;\n  border-bottom-color: #000000;\n}\n.popover {\n  position: absolute;\n  top: 0;\n  left: 0;\n  z-index: 1010;\n  display: none;\n  max-width: 276px;\n  padding: 1px;\n  text-align: left;\n  background-color: #ffffff;\n  background-clip: padding-box;\n  border: 1px solid #cccccc;\n  border: 1px solid rgba(0, 0, 0, 0.2);\n  border-radius: 6px;\n  -webkit-box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);\n  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);\n  white-space: normal;\n}\n.popover.top {\n  margin-top: -10px;\n}\n.popover.right {\n  margin-left: 10px;\n}\n.popover.bottom {\n  margin-top: 10px;\n}\n.popover.left {\n  margin-left: -10px;\n}\n.popover-title {\n  margin: 0;\n  padding: 8px 14px;\n  font-size: 14px;\n  font-weight: normal;\n  line-height: 18px;\n  background-color: #f7f7f7;\n  border-bottom: 1px solid #ebebeb;\n  border-radius: 5px 5px 0 0;\n}\n.popover-content {\n  padding: 9px 14px;\n}\n.popover > .arrow,\n.popover > .arrow:after {\n  position: absolute;\n  display: block;\n  width: 0;\n  height: 0;\n  border-color: transparent;\n  border-style: solid;\n}\n.popover > .arrow {\n  border-width: 11px;\n}\n.popover > .arrow:after {\n  border-width: 10px;\n  content: \"\";\n}\n.popover.top > .arrow {\n  left: 50%;\n  margin-left: -11px;\n  border-bottom-width: 0;\n  border-top-color: #999999;\n  border-top-color: rgba(0, 0, 0, 0.25);\n  bottom: -11px;\n}\n.popover.top > .arrow:after {\n  content: \" \";\n  bottom: 1px;\n  margin-left: -10px;\n  border-bottom-width: 0;\n  border-top-color: #ffffff;\n}\n.popover.right > .arrow {\n  top: 50%;\n  left: -11px;\n  margin-top: -11px;\n  border-left-width: 0;\n  border-right-color: #999999;\n  border-right-color: rgba(0, 0, 0, 0.25);\n}\n.popover.right > .arrow:after {\n  content: \" \";\n  left: 1px;\n  bottom: -10px;\n  border-left-width: 0;\n  border-right-color: #ffffff;\n}\n.popover.bottom > .arrow {\n  left: 50%;\n  margin-left: -11px;\n  border-top-width: 0;\n  border-bottom-color: #999999;\n  border-bottom-color: rgba(0, 0, 0, 0.25);\n  top: -11px;\n}\n.popover.bottom > .arrow:after {\n  content: \" \";\n  top: 1px;\n  margin-left: -10px;\n  border-top-width: 0;\n  border-bottom-color: #ffffff;\n}\n.popover.left > .arrow {\n  top: 50%;\n  right: -11px;\n  margin-top: -11px;\n  border-right-width: 0;\n  border-left-color: #999999;\n  border-left-color: rgba(0, 0, 0, 0.25);\n}\n.popover.left > .arrow:after {\n  content: \" \";\n  right: 1px;\n  border-right-width: 0;\n  border-left-color: #ffffff;\n  bottom: -10px;\n}\n.carousel {\n  position: relative;\n}\n.carousel-inner {\n  position: relative;\n  overflow: hidden;\n  width: 100%;\n}\n.carousel-inner > .item {\n  display: none;\n  position: relative;\n  -webkit-transition: 0.6s ease-in-out left;\n  transition: 0.6s ease-in-out left;\n}\n.carousel-inner > .item > img,\n.carousel-inner > .item > a > img {\n  line-height: 1;\n}\n.carousel-inner > .active,\n.carousel-inner > .next,\n.carousel-inner > .prev {\n  display: block;\n}\n.carousel-inner > .active {\n  left: 0;\n}\n.carousel-inner > .next,\n.carousel-inner > .prev {\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n.carousel-inner > .next {\n  left: 100%;\n}\n.carousel-inner > .prev {\n  left: -100%;\n}\n.carousel-inner > .next.left,\n.carousel-inner > .prev.right {\n  left: 0;\n}\n.carousel-inner > .active.left {\n  left: -100%;\n}\n.carousel-inner > .active.right {\n  left: 100%;\n}\n.carousel-control {\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 15%;\n  opacity: 0.5;\n  filter: alpha(opacity=50);\n  font-size: 20px;\n  color: #ffffff;\n  text-align: center;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);\n}\n.carousel-control.left {\n  background-image: -webkit-linear-gradient(left, color-stop(rgba(0, 0, 0, 0.5) 0%), color-stop(rgba(0, 0, 0, 0.0001) 100%));\n  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.0001) 100%);\n  background-repeat: repeat-x;\n  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#80000000', endColorstr='#00000000', GradientType=1);\n}\n.carousel-control.right {\n  left: auto;\n  right: 0;\n  background-image: -webkit-linear-gradient(left, color-stop(rgba(0, 0, 0, 0.0001) 0%), color-stop(rgba(0, 0, 0, 0.5) 100%));\n  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.0001) 0%, rgba(0, 0, 0, 0.5) 100%);\n  background-repeat: repeat-x;\n  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#00000000', endColorstr='#80000000', GradientType=1);\n}\n.carousel-control:hover,\n.carousel-control:focus {\n  outline: none;\n  color: #ffffff;\n  text-decoration: none;\n  opacity: 0.9;\n  filter: alpha(opacity=90);\n}\n.carousel-control .icon-prev,\n.carousel-control .icon-next,\n.carousel-control .glyphicon-chevron-left,\n.carousel-control .glyphicon-chevron-right {\n  position: absolute;\n  top: 50%;\n  z-index: 5;\n  display: inline-block;\n}\n.carousel-control .icon-prev,\n.carousel-control .glyphicon-chevron-left {\n  left: 50%;\n}\n.carousel-control .icon-next,\n.carousel-control .glyphicon-chevron-right {\n  right: 50%;\n}\n.carousel-control .icon-prev,\n.carousel-control .icon-next {\n  width: 20px;\n  height: 20px;\n  margin-top: -10px;\n  margin-left: -10px;\n  font-family: serif;\n}\n.carousel-control .icon-prev:before {\n  content: '\\2039';\n}\n.carousel-control .icon-next:before {\n  content: '\\203a';\n}\n.carousel-indicators {\n  position: absolute;\n  bottom: 10px;\n  left: 50%;\n  z-index: 15;\n  width: 60%;\n  margin-left: -30%;\n  padding-left: 0;\n  list-style: none;\n  text-align: center;\n}\n.carousel-indicators li {\n  display: inline-block;\n  width: 10px;\n  height: 10px;\n  margin: 1px;\n  text-indent: -999px;\n  border: 1px solid #ffffff;\n  border-radius: 10px;\n  cursor: pointer;\n  background-color: #000 \\9;\n  background-color: rgba(0, 0, 0, 0);\n}\n.carousel-indicators .active {\n  margin: 0;\n  width: 12px;\n  height: 12px;\n  background-color: #ffffff;\n}\n.carousel-caption {\n  position: absolute;\n  left: 15%;\n  right: 15%;\n  bottom: 20px;\n  z-index: 10;\n  padding-top: 20px;\n  padding-bottom: 20px;\n  color: #ffffff;\n  text-align: center;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);\n}\n.carousel-caption .btn {\n  text-shadow: none;\n}\n@media screen and (min-width: 768px) {\n  .carousel-control .glyphicon-chevron-left,\n  .carousel-control .glyphicon-chevron-right,\n  .carousel-control .icon-prev,\n  .carousel-control .icon-next {\n    width: 30px;\n    height: 30px;\n    margin-top: -15px;\n    margin-left: -15px;\n    font-size: 30px;\n  }\n  .carousel-caption {\n    left: 20%;\n    right: 20%;\n    padding-bottom: 30px;\n  }\n  .carousel-indicators {\n    bottom: 20px;\n  }\n}\n.clearfix:before,\n.clearfix:after,\n.container:before,\n.container:after,\n.container-fluid:before,\n.container-fluid:after,\n.row:before,\n.row:after,\n.form-horizontal .form-group:before,\n.form-horizontal .form-group:after,\n.btn-toolbar:before,\n.btn-toolbar:after,\n.btn-group-vertical > .btn-group:before,\n.btn-group-vertical > .btn-group:after,\n.nav:before,\n.nav:after,\n.navbar:before,\n.navbar:after,\n.navbar-header:before,\n.navbar-header:after,\n.navbar-collapse:before,\n.navbar-collapse:after,\n.pager:before,\n.pager:after,\n.panel-body:before,\n.panel-body:after,\n.modal-footer:before,\n.modal-footer:after {\n  content: \" \";\n  display: table;\n}\n.clearfix:after,\n.container:after,\n.container-fluid:after,\n.row:after,\n.form-horizontal .form-group:after,\n.btn-toolbar:after,\n.btn-group-vertical > .btn-group:after,\n.nav:after,\n.navbar:after,\n.navbar-header:after,\n.navbar-collapse:after,\n.pager:after,\n.panel-body:after,\n.modal-footer:after {\n  clear: both;\n}\n.center-block {\n  display: block;\n  margin-left: auto;\n  margin-right: auto;\n}\n.pull-right {\n  float: right !important;\n}\n.pull-left {\n  float: left !important;\n}\n.hide {\n  display: none !important;\n}\n.show {\n  display: block !important;\n}\n.invisible {\n  visibility: hidden;\n}\n.text-hide {\n  font: 0/0 a;\n  color: transparent;\n  text-shadow: none;\n  background-color: transparent;\n  border: 0;\n}\n.hidden {\n  display: none !important;\n  visibility: hidden !important;\n}\n.affix {\n  position: fixed;\n}\n@-ms-viewport {\n  width: device-width;\n}\n.visible-xs,\n.visible-sm,\n.visible-md,\n.visible-lg {\n  display: none !important;\n}\n@media (max-width: 767px) {\n  .visible-xs {\n    display: block !important;\n  }\n  table.visible-xs {\n    display: table;\n  }\n  tr.visible-xs {\n    display: table-row !important;\n  }\n  th.visible-xs,\n  td.visible-xs {\n    display: table-cell !important;\n  }\n}\n@media (min-width: 768px) and (max-width: 991px) {\n  .visible-sm {\n    display: block !important;\n  }\n  table.visible-sm {\n    display: table;\n  }\n  tr.visible-sm {\n    display: table-row !important;\n  }\n  th.visible-sm,\n  td.visible-sm {\n    display: table-cell !important;\n  }\n}\n@media (min-width: 992px) and (max-width: 1199px) {\n  .visible-md {\n    display: block !important;\n  }\n  table.visible-md {\n    display: table;\n  }\n  tr.visible-md {\n    display: table-row !important;\n  }\n  th.visible-md,\n  td.visible-md {\n    display: table-cell !important;\n  }\n}\n@media (min-width: 1200px) {\n  .visible-lg {\n    display: block !important;\n  }\n  table.visible-lg {\n    display: table;\n  }\n  tr.visible-lg {\n    display: table-row !important;\n  }\n  th.visible-lg,\n  td.visible-lg {\n    display: table-cell !important;\n  }\n}\n@media (max-width: 767px) {\n  .hidden-xs {\n    display: none !important;\n  }\n}\n@media (min-width: 768px) and (max-width: 991px) {\n  .hidden-sm {\n    display: none !important;\n  }\n}\n@media (min-width: 992px) and (max-width: 1199px) {\n  .hidden-md {\n    display: none !important;\n  }\n}\n@media (min-width: 1200px) {\n  .hidden-lg {\n    display: none !important;\n  }\n}\n.visible-print {\n  display: none !important;\n}\n@media print {\n  .visible-print {\n    display: block !important;\n  }\n  table.visible-print {\n    display: table;\n  }\n  tr.visible-print {\n    display: table-row !important;\n  }\n  th.visible-print,\n  td.visible-print {\n    display: table-cell !important;\n  }\n}\n@media print {\n  .hidden-print {\n    display: none !important;\n  }\n}\n/*\nDocument   : jquery.pnotify.default.css\nCreated on : Nov 23, 2009, 3:14:10 PM\nAuthor     : Hunter Perrin\nVersion    : 1.2.0\nLink       : http://pinesframework.org/pnotify/\nDescription:\n\tDefault styling for Pines Notify jQuery plugin.\n*/\n/* -- Notice */\n.ui-pnotify {\n  top: 25px;\n  right: 25px;\n  position: absolute;\n  height: auto;\n  /* Ensures notices are above everything */\n  z-index: 9999;\n}\n/* Hides position: fixed from IE6 */\nhtml > body .ui-pnotify {\n  position: fixed;\n}\n.ui-pnotify .ui-pnotify-shadow {\n  -webkit-box-shadow: 0px 2px 10px rgba(50, 50, 50, 0.5);\n  -moz-box-shadow: 0px 2px 10px rgba(50, 50, 50, 0.5);\n  box-shadow: 0px 2px 10px rgba(50, 50, 50, 0.5);\n}\n.ui-pnotify-container {\n  background-position: 0 0;\n  padding: .8em;\n  height: 100%;\n  margin: 0;\n}\n.ui-pnotify-sharp {\n  -webkit-border-radius: 0;\n  -moz-border-radius: 0;\n  border-radius: 0;\n}\n.ui-pnotify-closer,\n.ui-pnotify-sticker {\n  float: right;\n  margin-left: .2em;\n}\n.ui-pnotify-title {\n  display: block;\n  margin-bottom: .4em;\n}\n.ui-pnotify-text {\n  display: block;\n}\n.ui-pnotify-icon,\n.ui-pnotify-icon span {\n  display: block;\n  float: left;\n  margin-right: .2em;\n}\n/* -- History Pulldown */\n.ui-pnotify-history-container {\n  position: absolute;\n  top: 0;\n  right: 18px;\n  width: 70px;\n  border-top: none;\n  padding: 0;\n  -webkit-border-top-left-radius: 0;\n  -moz-border-top-left-radius: 0;\n  border-top-left-radius: 0;\n  -webkit-border-top-right-radius: 0;\n  -moz-border-top-right-radius: 0;\n  border-top-right-radius: 0;\n  /* Ensures history container is above notices. */\n  z-index: 10000;\n}\n.ui-pnotify-history-container .ui-pnotify-history-header {\n  padding: 2px;\n}\n.ui-pnotify-history-container button {\n  cursor: pointer;\n  display: block;\n  width: 100%;\n}\n.ui-pnotify-history-container .ui-pnotify-history-pulldown {\n  display: block;\n  margin: 0 auto;\n}\n.products-edit-form {\n  padding-top: 10px;\n}\n.thumbnail.active {\n  background-color: rgba(0, 255, 0, 0.1);\n}\n.thumbnail .product_type {\n  text-align: center;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":3}],16:[function(require,module,exports){
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


},{"../../collections/products.coffee":8,"../../requires/commands.coffee":13,"../products/edit/layout.coffee":21,"../products/list/layout.coffee":24,"backbone.marionette":false,"bootstrap":false,"jquery":false,"jquery_pnotify":28}],17:[function(require,module,exports){
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


},{"../../../requires/commands.coffee":13,"backbone.marionette":false,"jquery":false,"jquery_pnotify":28}],18:[function(require,module,exports){
var $, Commands, Marionette, ProductTypes, _;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

$ = require('jquery');

_ = require('underscore');

ProductTypes = require('../../../collections/product_types');

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/edit/form_about'],
  className: "products-edit-form ",
  initialize: function() {
    console.log("views/products/edit/form_about::initialize");
    this.product_types = new ProductTypes;
    return this.product_types.fetch({
      success: (function(_this) {
        return function() {
          return _this.render();
        };
      })(this)
    });
  },
  serializeData: function() {
    return {
      'model': this.model,
      'product_types': this.product_types
    };
  },
  events: {
    'change input': 'inputChanged',
    'change textarea': 'inputChanged',
    'click .product_type_thumbnail': 'productTypeSelected'
  },
  onRender: function() {
    $(".product_type_thumbnail").removeClass('active');
    return $(".product_type_thumbnail[data-product-type='" + (this.model.get('product_type_id')) + "']").addClass('active');
  },
  inputChanged: function(event) {
    var input;
    console.log("views/products/edit/form_about::inputChanged");
    input = $(event.currentTarget);
    if (!_.isUndefined(input.data('model-attribute'))) {
      return this.model.set(input.data('model-attribute'), input.val());
    }
  },
  productTypeSelected: function(event) {
    var thumbnail;
    console.log("views/products/edit/form_about::productTypeSelected");
    thumbnail = $(event.currentTarget);
    this.model.set('product_type_id', thumbnail.attr('data-product-type'));
    return this.render();
  }
});


},{"../../../collections/product_types":7,"../../../requires/commands.coffee":13,"backbone.marionette":false,"jquery":false,"underscore":4}],19:[function(require,module,exports){
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


},{"../../../collections/days_to_ships.coffee":6,"../../../requires/commands.coffee":13,"backbone.marionette":false,"jquery":false,"underscore":4}],20:[function(require,module,exports){
var $, Commands, Marionette, ProductTypes, _;

Marionette = require('backbone.marionette');

Commands = require("../../../requires/commands.coffee");

$ = require('jquery');

_ = require('underscore');

ProductTypes = require('../../../collections/product_types');

module.exports = Marionette.ItemView.extend({
  template: window.templates['src/app/views/products/edit/form_details'],
  className: "products-edit-form ",
  initialize: function() {
    return console.log("views/products/edit/form_details::initialize");
  },
  serializeData: function() {
    return {
      'model': this.model
    };
  },
  events: {
    'change input': 'inputChanged',
    'change textarea': 'inputChanged'
  },
  inputChanged: function(event) {
    var input;
    console.log("views/products/edit/form_details::inputChanged");
    input = $(event.currentTarget);
    if (!_.isUndefined(input.data('model-attribute'))) {
      return this.model.set(input.data('model-attribute'), input.val());
    }
  }
});


},{"../../../collections/product_types":7,"../../../requires/commands.coffee":13,"backbone.marionette":false,"jquery":false,"underscore":4}],21:[function(require,module,exports){
var Commands, ControlsView, FormAboutView, FormDeliveryView, FormDetailsView, Marionette, TabsView;

Marionette = require('backbone.marionette');

ControlsView = require('./controls.coffee');

FormAboutView = require('./form_about.coffee');

FormDeliveryView = require('./form_delivery.coffee');

FormDetailsView = require('./form_details.coffee');

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
    about: FormAboutView,
    details: FormDetailsView
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


},{"../../../requires/commands.coffee":13,"./controls.coffee":17,"./form_about.coffee":18,"./form_delivery.coffee":19,"./form_details.coffee":20,"./tabs.coffee":22,"backbone.marionette":false}],22:[function(require,module,exports){
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


},{"../../../requires/commands.coffee":13,"backbone.marionette":false,"jquery":false}],23:[function(require,module,exports){
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


},{"../../../models/product.coffee":11,"../../../requires/commands.coffee":13,"backbone.marionette":false,"jquery":false}],24:[function(require,module,exports){
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


},{"./controls.coffee":23,"./list.coffee":25,"backbone.marionette":false,"jquery":false}],25:[function(require,module,exports){
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


},{"../../../requires/commands.coffee":13,"./list_item.coffee":26,"backbone.marionette":false,"jquery":false}],26:[function(require,module,exports){
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


},{"../../../requires/commands.coffee":13,"backbone.marionette":false}],27:[function(require,module,exports){
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
},{"backbone":false,"underscore":4}],28:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdmFncmFudC9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3ZhZ3JhbnQvbm9kZV9tb2R1bGVzL2JhY2tib25lLndyZXFyL2xpYi9iYWNrYm9uZS53cmVxci5qcyIsIi92YWdyYW50L25vZGVfbW9kdWxlcy9sZXNzaWZ5L25vZGVfbW9kdWxlcy9jc3NpZnkvYnJvd3Nlci5qcyIsIi92YWdyYW50L25vZGVfbW9kdWxlcy9sZXNzaWZ5L3RyYW5zZm9ybS5qcyIsIi92YWdyYW50L25vZGVfbW9kdWxlcy91bmRlcnNjb3JlL3VuZGVyc2NvcmUuanMiLCIvdmFncmFudC9zcmMvYXBwLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvY29sbGVjdGlvbnMvZGF5c190b19zaGlwcy5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL2NvbGxlY3Rpb25zL3Byb2R1Y3RfdHlwZXMuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC9jb2xsZWN0aW9ucy9wcm9kdWN0cy5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL2RhdGFiYXNlL2luZGV4ZGIuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC9tb2RlbHMvZGF5c190b19zaGlwLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvbW9kZWxzL3Byb2R1Y3QuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC9tb2RlbHMvcHJvZHVjdF90eXBlLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC9yb3V0ZXMvaG9tZS5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3N0eWxlc2hlZXRzL2FwcC5sZXNzIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9ob21lL2xheW91dC5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvY29udHJvbHMuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fYWJvdXQuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fZGVsaXZlcnkuY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fZGV0YWlscy5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0LmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC90YWJzLmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvbGlzdC9jb250cm9scy5jb2ZmZWUiLCIvdmFncmFudC9zcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2xpc3QvbGF5b3V0LmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvbGlzdC9saXN0LmNvZmZlZSIsIi92YWdyYW50L3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvbGlzdC9saXN0X2l0ZW0uY29mZmVlIiwiL3ZhZ3JhbnQvc3JjL2xpYi92ZW5kb3IvanMvYmFja2JvbmUtaW5kZXhlZGRiLmpzIiwiL3ZhZ3JhbnQvc3JjL2xpYi92ZW5kb3IvanMvanF1ZXJ5LnBub3RpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSx1Q0FBWixDQUFBLENBQUE7QUFBQSxJQUNBLEtBQUssQ0FBQyxlQUFOLENBQUEsQ0FEQSxDQUFBO1dBR0EsUUFBUSxDQUFDLE9BQVQsQ0FBaUIsd0NBQWpCLEVBQTJELElBQUMsQ0FBQSxLQUE1RCxFQUpNO0VBQUEsQ0FyQlI7Q0FEZSxDQUpqQixDQUFBOzs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ptQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQmFja2JvbmUuV3JlcXIgKEJhY2tib25lLk1hcmlvbmV0dGUpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB2MS4yLjFcbi8vXG4vLyBDb3B5cmlnaHQgKGMpMjAxNCBEZXJpY2sgQmFpbGV5LCBNdXRlZCBTb2x1dGlvbnMsIExMQy5cbi8vIERpc3RyaWJ1dGVkIHVuZGVyIE1JVCBsaWNlbnNlXG4vL1xuLy8gaHR0cDovL2dpdGh1Yi5jb20vbWFyaW9uZXR0ZWpzL2JhY2tib25lLndyZXFyXG5cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnZXhwb3J0cycsICdiYWNrYm9uZScsICd1bmRlcnNjb3JlJ10sIGZ1bmN0aW9uKGV4cG9ydHMsIEJhY2tib25lLCBfKSB7XG4gICAgICBmYWN0b3J5KGV4cG9ydHMsIEJhY2tib25lLCBfKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB2YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuICAgIHZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuICAgIGZhY3RvcnkoZXhwb3J0cywgQmFja2JvbmUsIF8pO1xuICB9IGVsc2Uge1xuICAgIGZhY3Rvcnkoe30sIHJvb3QuQmFja2JvbmUsIHJvb3QuXyk7XG4gIH1cblxufSh0aGlzLCBmdW5jdGlvbihXcmVxciwgQmFja2JvbmUsIF8pIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgQmFja2JvbmUuV3JlcXIgPSBXcmVxcjtcblxuICAvLyBIYW5kbGVyc1xuLy8gLS0tLS0tLS1cbi8vIEEgcmVnaXN0cnkgb2YgZnVuY3Rpb25zIHRvIGNhbGwsIGdpdmVuIGEgbmFtZVxuXG5XcmVxci5IYW5kbGVycyA9IChmdW5jdGlvbihCYWNrYm9uZSwgXyl7XG4gIFwidXNlIHN0cmljdFwiO1xuICBcbiAgLy8gQ29uc3RydWN0b3JcbiAgLy8gLS0tLS0tLS0tLS1cblxuICB2YXIgSGFuZGxlcnMgPSBmdW5jdGlvbihvcHRpb25zKXtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuX3dyZXFySGFuZGxlcnMgPSB7fTtcbiAgICBcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuaW5pdGlhbGl6ZSkpe1xuICAgICAgdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIH1cbiAgfTtcblxuICBIYW5kbGVycy5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG5cbiAgLy8gSW5zdGFuY2UgTWVtYmVyc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgXy5leHRlbmQoSGFuZGxlcnMucHJvdG90eXBlLCBCYWNrYm9uZS5FdmVudHMsIHtcblxuICAgIC8vIEFkZCBtdWx0aXBsZSBoYW5kbGVycyB1c2luZyBhbiBvYmplY3QgbGl0ZXJhbCBjb25maWd1cmF0aW9uXG4gICAgc2V0SGFuZGxlcnM6IGZ1bmN0aW9uKGhhbmRsZXJzKXtcbiAgICAgIF8uZWFjaChoYW5kbGVycywgZnVuY3Rpb24oaGFuZGxlciwgbmFtZSl7XG4gICAgICAgIHZhciBjb250ZXh0ID0gbnVsbDtcblxuICAgICAgICBpZiAoXy5pc09iamVjdChoYW5kbGVyKSAmJiAhXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKXtcbiAgICAgICAgICBjb250ZXh0ID0gaGFuZGxlci5jb250ZXh0O1xuICAgICAgICAgIGhhbmRsZXIgPSBoYW5kbGVyLmNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXRIYW5kbGVyKG5hbWUsIGhhbmRsZXIsIGNvbnRleHQpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8vIEFkZCBhIGhhbmRsZXIgZm9yIHRoZSBnaXZlbiBuYW1lLCB3aXRoIGFuXG4gICAgLy8gb3B0aW9uYWwgY29udGV4dCB0byBydW4gdGhlIGhhbmRsZXIgd2l0aGluXG4gICAgc2V0SGFuZGxlcjogZnVuY3Rpb24obmFtZSwgaGFuZGxlciwgY29udGV4dCl7XG4gICAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBjYWxsYmFjazogaGFuZGxlcixcbiAgICAgICAgY29udGV4dDogY29udGV4dFxuICAgICAgfTtcblxuICAgICAgdGhpcy5fd3JlcXJIYW5kbGVyc1tuYW1lXSA9IGNvbmZpZztcblxuICAgICAgdGhpcy50cmlnZ2VyKFwiaGFuZGxlcjphZGRcIiwgbmFtZSwgaGFuZGxlciwgY29udGV4dCk7XG4gICAgfSxcblxuICAgIC8vIERldGVybWluZSB3aGV0aGVyIG9yIG5vdCBhIGhhbmRsZXIgaXMgcmVnaXN0ZXJlZFxuICAgIGhhc0hhbmRsZXI6IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgcmV0dXJuICEhIHRoaXMuX3dyZXFySGFuZGxlcnNbbmFtZV07XG4gICAgfSxcblxuICAgIC8vIEdldCB0aGUgY3VycmVudGx5IHJlZ2lzdGVyZWQgaGFuZGxlciBmb3JcbiAgICAvLyB0aGUgc3BlY2lmaWVkIG5hbWUuIFRocm93cyBhbiBleGNlcHRpb24gaWZcbiAgICAvLyBubyBoYW5kbGVyIGlzIGZvdW5kLlxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgdmFyIGNvbmZpZyA9IHRoaXMuX3dyZXFySGFuZGxlcnNbbmFtZV07XG5cbiAgICAgIGlmICghY29uZmlnKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5jYWxsYmFjay5hcHBseShjb25maWcuY29udGV4dCwgYXJncyk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICAvLyBSZW1vdmUgYSBoYW5kbGVyIGZvciB0aGUgc3BlY2lmaWVkIG5hbWVcbiAgICByZW1vdmVIYW5kbGVyOiBmdW5jdGlvbihuYW1lKXtcbiAgICAgIGRlbGV0ZSB0aGlzLl93cmVxckhhbmRsZXJzW25hbWVdO1xuICAgIH0sXG5cbiAgICAvLyBSZW1vdmUgYWxsIGhhbmRsZXJzIGZyb20gdGhpcyByZWdpc3RyeVxuICAgIHJlbW92ZUFsbEhhbmRsZXJzOiBmdW5jdGlvbigpe1xuICAgICAgdGhpcy5fd3JlcXJIYW5kbGVycyA9IHt9O1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIEhhbmRsZXJzO1xufSkoQmFja2JvbmUsIF8pO1xuXG4gIC8vIFdyZXFyLkNvbW1hbmRTdG9yYWdlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy9cbi8vIFN0b3JlIGFuZCByZXRyaWV2ZSBjb21tYW5kcyBmb3IgZXhlY3V0aW9uLlxuV3JlcXIuQ29tbWFuZFN0b3JhZ2UgPSAoZnVuY3Rpb24oKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gQ29uc3RydWN0b3IgZnVuY3Rpb25cbiAgdmFyIENvbW1hbmRTdG9yYWdlID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLl9jb21tYW5kcyA9IHt9O1xuXG4gICAgaWYgKF8uaXNGdW5jdGlvbih0aGlzLmluaXRpYWxpemUpKXtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB9XG4gIH07XG5cbiAgLy8gSW5zdGFuY2UgbWV0aG9kc1xuICBfLmV4dGVuZChDb21tYW5kU3RvcmFnZS5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuXG4gICAgLy8gR2V0IGFuIG9iamVjdCBsaXRlcmFsIGJ5IGNvbW1hbmQgbmFtZSwgdGhhdCBjb250YWluc1xuICAgIC8vIHRoZSBgY29tbWFuZE5hbWVgIGFuZCB0aGUgYGluc3RhbmNlc2Agb2YgYWxsIGNvbW1hbmRzXG4gICAgLy8gcmVwcmVzZW50ZWQgYXMgYW4gYXJyYXkgb2YgYXJndW1lbnRzIHRvIHByb2Nlc3NcbiAgICBnZXRDb21tYW5kczogZnVuY3Rpb24oY29tbWFuZE5hbWUpe1xuICAgICAgdmFyIGNvbW1hbmRzID0gdGhpcy5fY29tbWFuZHNbY29tbWFuZE5hbWVdO1xuXG4gICAgICAvLyB3ZSBkb24ndCBoYXZlIGl0LCBzbyBhZGQgaXRcbiAgICAgIGlmICghY29tbWFuZHMpe1xuXG4gICAgICAgIC8vIGJ1aWxkIHRoZSBjb25maWd1cmF0aW9uXG4gICAgICAgIGNvbW1hbmRzID0ge1xuICAgICAgICAgIGNvbW1hbmQ6IGNvbW1hbmROYW1lLCBcbiAgICAgICAgICBpbnN0YW5jZXM6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3RvcmUgaXRcbiAgICAgICAgdGhpcy5fY29tbWFuZHNbY29tbWFuZE5hbWVdID0gY29tbWFuZHM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb21tYW5kcztcbiAgICB9LFxuXG4gICAgLy8gQWRkIGEgY29tbWFuZCBieSBuYW1lLCB0byB0aGUgc3RvcmFnZSBhbmQgc3RvcmUgdGhlXG4gICAgLy8gYXJncyBmb3IgdGhlIGNvbW1hbmRcbiAgICBhZGRDb21tYW5kOiBmdW5jdGlvbihjb21tYW5kTmFtZSwgYXJncyl7XG4gICAgICB2YXIgY29tbWFuZCA9IHRoaXMuZ2V0Q29tbWFuZHMoY29tbWFuZE5hbWUpO1xuICAgICAgY29tbWFuZC5pbnN0YW5jZXMucHVzaChhcmdzKTtcbiAgICB9LFxuXG4gICAgLy8gQ2xlYXIgYWxsIGNvbW1hbmRzIGZvciB0aGUgZ2l2ZW4gYGNvbW1hbmROYW1lYFxuICAgIGNsZWFyQ29tbWFuZHM6IGZ1bmN0aW9uKGNvbW1hbmROYW1lKXtcbiAgICAgIHZhciBjb21tYW5kID0gdGhpcy5nZXRDb21tYW5kcyhjb21tYW5kTmFtZSk7XG4gICAgICBjb21tYW5kLmluc3RhbmNlcyA9IFtdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIENvbW1hbmRTdG9yYWdlO1xufSkoKTtcblxuICAvLyBXcmVxci5Db21tYW5kc1xuLy8gLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBBIHNpbXBsZSBjb21tYW5kIHBhdHRlcm4gaW1wbGVtZW50YXRpb24uIFJlZ2lzdGVyIGEgY29tbWFuZFxuLy8gaGFuZGxlciBhbmQgZXhlY3V0ZSBpdC5cbldyZXFyLkNvbW1hbmRzID0gKGZ1bmN0aW9uKFdyZXFyKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgcmV0dXJuIFdyZXFyLkhhbmRsZXJzLmV4dGVuZCh7XG4gICAgLy8gZGVmYXVsdCBzdG9yYWdlIHR5cGVcbiAgICBzdG9yYWdlVHlwZTogV3JlcXIuQ29tbWFuZFN0b3JhZ2UsXG5cbiAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICB0aGlzLl9pbml0aWFsaXplU3RvcmFnZSh0aGlzLm9wdGlvbnMpO1xuICAgICAgdGhpcy5vbihcImhhbmRsZXI6YWRkXCIsIHRoaXMuX2V4ZWN1dGVDb21tYW5kcywgdGhpcyk7XG5cbiAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIFdyZXFyLkhhbmRsZXJzLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9LFxuXG4gICAgLy8gRXhlY3V0ZSBhIG5hbWVkIGNvbW1hbmQgd2l0aCB0aGUgc3VwcGxpZWQgYXJnc1xuICAgIGV4ZWN1dGU6IGZ1bmN0aW9uKG5hbWUsIGFyZ3Mpe1xuICAgICAgbmFtZSA9IGFyZ3VtZW50c1swXTtcbiAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICBpZiAodGhpcy5oYXNIYW5kbGVyKG5hbWUpKXtcbiAgICAgICAgdGhpcy5nZXRIYW5kbGVyKG5hbWUpLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdG9yYWdlLmFkZENvbW1hbmQobmFtZSwgYXJncyk7XG4gICAgICB9XG5cbiAgICB9LFxuXG4gICAgLy8gSW50ZXJuYWwgbWV0aG9kIHRvIGhhbmRsZSBidWxrIGV4ZWN1dGlvbiBvZiBzdG9yZWQgY29tbWFuZHNcbiAgICBfZXhlY3V0ZUNvbW1hbmRzOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBjb250ZXh0KXtcbiAgICAgIHZhciBjb21tYW5kID0gdGhpcy5zdG9yYWdlLmdldENvbW1hbmRzKG5hbWUpO1xuXG4gICAgICAvLyBsb29wIHRocm91Z2ggYW5kIGV4ZWN1dGUgYWxsIHRoZSBzdG9yZWQgY29tbWFuZCBpbnN0YW5jZXNcbiAgICAgIF8uZWFjaChjb21tYW5kLmluc3RhbmNlcywgZnVuY3Rpb24oYXJncyl7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zdG9yYWdlLmNsZWFyQ29tbWFuZHMobmFtZSk7XG4gICAgfSxcblxuICAgIC8vIEludGVybmFsIG1ldGhvZCB0byBpbml0aWFsaXplIHN0b3JhZ2UgZWl0aGVyIGZyb20gdGhlIHR5cGUnc1xuICAgIC8vIGBzdG9yYWdlVHlwZWAgb3IgdGhlIGluc3RhbmNlIGBvcHRpb25zLnN0b3JhZ2VUeXBlYC5cbiAgICBfaW5pdGlhbGl6ZVN0b3JhZ2U6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgdmFyIHN0b3JhZ2U7XG5cbiAgICAgIHZhciBTdG9yYWdlVHlwZSA9IG9wdGlvbnMuc3RvcmFnZVR5cGUgfHwgdGhpcy5zdG9yYWdlVHlwZTtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oU3RvcmFnZVR5cGUpKXtcbiAgICAgICAgc3RvcmFnZSA9IG5ldyBTdG9yYWdlVHlwZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RvcmFnZSA9IFN0b3JhZ2VUeXBlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0b3JhZ2UgPSBzdG9yYWdlO1xuICAgIH1cbiAgfSk7XG5cbn0pKFdyZXFyKTtcblxuICAvLyBXcmVxci5SZXF1ZXN0UmVzcG9uc2Vcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy9cbi8vIEEgc2ltcGxlIHJlcXVlc3QvcmVzcG9uc2UgaW1wbGVtZW50YXRpb24uIFJlZ2lzdGVyIGFcbi8vIHJlcXVlc3QgaGFuZGxlciwgYW5kIHJldHVybiBhIHJlc3BvbnNlIGZyb20gaXRcbldyZXFyLlJlcXVlc3RSZXNwb25zZSA9IChmdW5jdGlvbihXcmVxcil7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHJldHVybiBXcmVxci5IYW5kbGVycy5leHRlbmQoe1xuICAgIHJlcXVlc3Q6IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbmFtZSA9IGFyZ3VtZW50c1swXTtcbiAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgIGlmICh0aGlzLmhhc0hhbmRsZXIobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0SGFuZGxlcihuYW1lKS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG59KShXcmVxcik7XG5cbiAgLy8gRXZlbnQgQWdncmVnYXRvclxuLy8gLS0tLS0tLS0tLS0tLS0tLVxuLy8gQSBwdWItc3ViIG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIGRlY291cGxlIHZhcmlvdXMgcGFydHNcbi8vIG9mIGFuIGFwcGxpY2F0aW9uIHRocm91Z2ggZXZlbnQtZHJpdmVuIGFyY2hpdGVjdHVyZS5cblxuV3JlcXIuRXZlbnRBZ2dyZWdhdG9yID0gKGZ1bmN0aW9uKEJhY2tib25lLCBfKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBFQSA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDb3B5IHRoZSBgZXh0ZW5kYCBmdW5jdGlvbiB1c2VkIGJ5IEJhY2tib25lJ3MgY2xhc3Nlc1xuICBFQS5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG5cbiAgLy8gQ29weSB0aGUgYmFzaWMgQmFja2JvbmUuRXZlbnRzIG9uIHRvIHRoZSBldmVudCBhZ2dyZWdhdG9yXG4gIF8uZXh0ZW5kKEVBLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzKTtcblxuICByZXR1cm4gRUE7XG59KShCYWNrYm9uZSwgXyk7XG5cbiAgLy8gV3JlcXIuQ2hhbm5lbFxuLy8gLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBBbiBvYmplY3QgdGhhdCB3cmFwcyB0aGUgdGhyZWUgbWVzc2FnaW5nIHN5c3RlbXM6XG4vLyBFdmVudEFnZ3JlZ2F0b3IsIFJlcXVlc3RSZXNwb25zZSwgQ29tbWFuZHNcbldyZXFyLkNoYW5uZWwgPSAoZnVuY3Rpb24oV3JlcXIpe1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgQ2hhbm5lbCA9IGZ1bmN0aW9uKGNoYW5uZWxOYW1lKSB7XG4gICAgdGhpcy52ZW50ICAgICAgICA9IG5ldyBCYWNrYm9uZS5XcmVxci5FdmVudEFnZ3JlZ2F0b3IoKTtcbiAgICB0aGlzLnJlcXJlcyAgICAgID0gbmV3IEJhY2tib25lLldyZXFyLlJlcXVlc3RSZXNwb25zZSgpO1xuICAgIHRoaXMuY29tbWFuZHMgICAgPSBuZXcgQmFja2JvbmUuV3JlcXIuQ29tbWFuZHMoKTtcbiAgICB0aGlzLmNoYW5uZWxOYW1lID0gY2hhbm5lbE5hbWU7XG4gIH07XG5cbiAgXy5leHRlbmQoQ2hhbm5lbC5wcm90b3R5cGUsIHtcblxuICAgIC8vIFJlbW92ZSBhbGwgaGFuZGxlcnMgZnJvbSB0aGUgbWVzc2FnaW5nIHN5c3RlbXMgb2YgdGhpcyBjaGFubmVsXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52ZW50Lm9mZigpO1xuICAgICAgdGhpcy52ZW50LnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAgIHRoaXMucmVxcmVzLnJlbW92ZUFsbEhhbmRsZXJzKCk7XG4gICAgICB0aGlzLmNvbW1hbmRzLnJlbW92ZUFsbEhhbmRsZXJzKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gQ29ubmVjdCBhIGhhc2ggb2YgZXZlbnRzOyBvbmUgZm9yIGVhY2ggbWVzc2FnaW5nIHN5c3RlbVxuICAgIGNvbm5lY3RFdmVudHM6IGZ1bmN0aW9uKGhhc2gsIGNvbnRleHQpIHtcbiAgICAgIHRoaXMuX2Nvbm5lY3QoJ3ZlbnQnLCBoYXNoLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBjb25uZWN0Q29tbWFuZHM6IGZ1bmN0aW9uKGhhc2gsIGNvbnRleHQpIHtcbiAgICAgIHRoaXMuX2Nvbm5lY3QoJ2NvbW1hbmRzJywgaGFzaCwgY29udGV4dCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgY29ubmVjdFJlcXVlc3RzOiBmdW5jdGlvbihoYXNoLCBjb250ZXh0KSB7XG4gICAgICB0aGlzLl9jb25uZWN0KCdyZXFyZXMnLCBoYXNoLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBBdHRhY2ggdGhlIGhhbmRsZXJzIHRvIGEgZ2l2ZW4gbWVzc2FnZSBzeXN0ZW0gYHR5cGVgXG4gICAgX2Nvbm5lY3Q6IGZ1bmN0aW9uKHR5cGUsIGhhc2gsIGNvbnRleHQpIHtcbiAgICAgIGlmICghaGFzaCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHQgPSBjb250ZXh0IHx8IHRoaXM7XG4gICAgICB2YXIgbWV0aG9kID0gKHR5cGUgPT09ICd2ZW50JykgPyAnb24nIDogJ3NldEhhbmRsZXInO1xuXG4gICAgICBfLmVhY2goaGFzaCwgZnVuY3Rpb24oZm4sIGV2ZW50TmFtZSkge1xuICAgICAgICB0aGlzW3R5cGVdW21ldGhvZF0oZXZlbnROYW1lLCBfLmJpbmQoZm4sIGNvbnRleHQpKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cblxuICByZXR1cm4gQ2hhbm5lbDtcbn0pKFdyZXFyKTtcblxuICAvLyBXcmVxci5SYWRpb1xuLy8gLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBBbiBvYmplY3QgdGhhdCBsZXRzIHlvdSBjb21tdW5pY2F0ZSB3aXRoIG1hbnkgY2hhbm5lbHMuXG5XcmVxci5yYWRpbyA9IChmdW5jdGlvbihXcmVxcil7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBSYWRpbyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NoYW5uZWxzID0ge307XG4gICAgdGhpcy52ZW50ID0ge307XG4gICAgdGhpcy5jb21tYW5kcyA9IHt9O1xuICAgIHRoaXMucmVxcmVzID0ge307XG4gICAgdGhpcy5fcHJveHlNZXRob2RzKCk7XG4gIH07XG5cbiAgXy5leHRlbmQoUmFkaW8ucHJvdG90eXBlLCB7XG5cbiAgICBjaGFubmVsOiBmdW5jdGlvbihjaGFubmVsTmFtZSkge1xuICAgICAgaWYgKCFjaGFubmVsTmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NoYW5uZWwgbXVzdCByZWNlaXZlIGEgbmFtZScpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fZ2V0Q2hhbm5lbCggY2hhbm5lbE5hbWUgKTtcbiAgICB9LFxuXG4gICAgX2dldENoYW5uZWw6IGZ1bmN0aW9uKGNoYW5uZWxOYW1lKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IHRoaXMuX2NoYW5uZWxzW2NoYW5uZWxOYW1lXTtcblxuICAgICAgaWYoIWNoYW5uZWwpIHtcbiAgICAgICAgY2hhbm5lbCA9IG5ldyBXcmVxci5DaGFubmVsKGNoYW5uZWxOYW1lKTtcbiAgICAgICAgdGhpcy5fY2hhbm5lbHNbY2hhbm5lbE5hbWVdID0gY2hhbm5lbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNoYW5uZWw7XG4gICAgfSxcblxuICAgIF9wcm94eU1ldGhvZHM6IGZ1bmN0aW9uKCkge1xuICAgICAgXy5lYWNoKFsndmVudCcsICdjb21tYW5kcycsICdyZXFyZXMnXSwgZnVuY3Rpb24oc3lzdGVtKSB7XG4gICAgICAgIF8uZWFjaCggbWVzc2FnZVN5c3RlbXNbc3lzdGVtXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgICAgICAgdGhpc1tzeXN0ZW1dW21ldGhvZF0gPSBwcm94eU1ldGhvZCh0aGlzLCBzeXN0ZW0sIG1ldGhvZCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9KTtcblxuXG4gIHZhciBtZXNzYWdlU3lzdGVtcyA9IHtcbiAgICB2ZW50OiBbXG4gICAgICAnb24nLFxuICAgICAgJ29mZicsXG4gICAgICAndHJpZ2dlcicsXG4gICAgICAnb25jZScsXG4gICAgICAnc3RvcExpc3RlbmluZycsXG4gICAgICAnbGlzdGVuVG8nLFxuICAgICAgJ2xpc3RlblRvT25jZSdcbiAgICBdLFxuXG4gICAgY29tbWFuZHM6IFtcbiAgICAgICdleGVjdXRlJyxcbiAgICAgICdzZXRIYW5kbGVyJyxcbiAgICAgICdzZXRIYW5kbGVycycsXG4gICAgICAncmVtb3ZlSGFuZGxlcicsXG4gICAgICAncmVtb3ZlQWxsSGFuZGxlcnMnXG4gICAgXSxcblxuICAgIHJlcXJlczogW1xuICAgICAgJ3JlcXVlc3QnLFxuICAgICAgJ3NldEhhbmRsZXInLFxuICAgICAgJ3NldEhhbmRsZXJzJyxcbiAgICAgICdyZW1vdmVIYW5kbGVyJyxcbiAgICAgICdyZW1vdmVBbGxIYW5kbGVycydcbiAgICBdXG4gIH07XG5cbiAgdmFyIHByb3h5TWV0aG9kID0gZnVuY3Rpb24ocmFkaW8sIHN5c3RlbSwgbWV0aG9kKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNoYW5uZWxOYW1lKSB7XG4gICAgICB2YXIgbWVzc2FnZVN5c3RlbSA9IHJhZGlvLl9nZXRDaGFubmVsKGNoYW5uZWxOYW1lKVtzeXN0ZW1dO1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICBtZXNzYWdlU3lzdGVtW21ldGhvZF0uYXBwbHkobWVzc2FnZVN5c3RlbSwgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICByZXR1cm4gbmV3IFJhZGlvKCk7XG5cbn0pKFdyZXFyKTtcblxuXG59KSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3MpIHtcbiAgdmFyIGhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG4gIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuXG4gIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICB9IGVsc2Uge1xuICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICB9XG4gIFxuICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmJ5VXJsID0gZnVuY3Rpb24odXJsKSB7XG4gIHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICAgIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5cbiAgbGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG4gIGxpbmsuaHJlZiA9IHVybDtcbiAgXG4gIGhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnY3NzaWZ5Jyk7XG4iLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjYuMFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gRXN0YWJsaXNoIHRoZSBvYmplY3QgdGhhdCBnZXRzIHJldHVybmVkIHRvIGJyZWFrIG91dCBvZiBhIGxvb3AgaXRlcmF0aW9uLlxuICB2YXIgYnJlYWtlciA9IHt9O1xuXG4gIC8vIFNhdmUgYnl0ZXMgaW4gdGhlIG1pbmlmaWVkIChidXQgbm90IGd6aXBwZWQpIHZlcnNpb246XG4gIHZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLCBPYmpQcm90byA9IE9iamVjdC5wcm90b3R5cGUsIEZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAvLyBDcmVhdGUgcXVpY2sgcmVmZXJlbmNlIHZhcmlhYmxlcyBmb3Igc3BlZWQgYWNjZXNzIHRvIGNvcmUgcHJvdG90eXBlcy5cbiAgdmFyXG4gICAgcHVzaCAgICAgICAgICAgICA9IEFycmF5UHJvdG8ucHVzaCxcbiAgICBzbGljZSAgICAgICAgICAgID0gQXJyYXlQcm90by5zbGljZSxcbiAgICBjb25jYXQgICAgICAgICAgID0gQXJyYXlQcm90by5jb25jYXQsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUZvckVhY2ggICAgICA9IEFycmF5UHJvdG8uZm9yRWFjaCxcbiAgICBuYXRpdmVNYXAgICAgICAgICAgPSBBcnJheVByb3RvLm1hcCxcbiAgICBuYXRpdmVSZWR1Y2UgICAgICAgPSBBcnJheVByb3RvLnJlZHVjZSxcbiAgICBuYXRpdmVSZWR1Y2VSaWdodCAgPSBBcnJheVByb3RvLnJlZHVjZVJpZ2h0LFxuICAgIG5hdGl2ZUZpbHRlciAgICAgICA9IEFycmF5UHJvdG8uZmlsdGVyLFxuICAgIG5hdGl2ZUV2ZXJ5ICAgICAgICA9IEFycmF5UHJvdG8uZXZlcnksXG4gICAgbmF0aXZlU29tZSAgICAgICAgID0gQXJyYXlQcm90by5zb21lLFxuICAgIG5hdGl2ZUluZGV4T2YgICAgICA9IEFycmF5UHJvdG8uaW5kZXhPZixcbiAgICBuYXRpdmVMYXN0SW5kZXhPZiAgPSBBcnJheVByb3RvLmxhc3RJbmRleE9mLFxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQ7XG5cbiAgLy8gQ3JlYXRlIGEgc2FmZSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciB1c2UgYmVsb3cuXG4gIHZhciBfID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIF8pIHJldHVybiBvYmo7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIF8pKSByZXR1cm4gbmV3IF8ob2JqKTtcbiAgICB0aGlzLl93cmFwcGVkID0gb2JqO1xuICB9O1xuXG4gIC8vIEV4cG9ydCB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yICoqTm9kZS5qcyoqLCB3aXRoXG4gIC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGZvciB0aGUgb2xkIGByZXF1aXJlKClgIEFQSS4gSWYgd2UncmUgaW5cbiAgLy8gdGhlIGJyb3dzZXIsIGFkZCBgX2AgYXMgYSBnbG9iYWwgb2JqZWN0IHZpYSBhIHN0cmluZyBpZGVudGlmaWVyLFxuICAvLyBmb3IgQ2xvc3VyZSBDb21waWxlciBcImFkdmFuY2VkXCIgbW9kZS5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS42LjAnO1xuXG4gIC8vIENvbGxlY3Rpb24gRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gVGhlIGNvcm5lcnN0b25lLCBhbiBgZWFjaGAgaW1wbGVtZW50YXRpb24sIGFrYSBgZm9yRWFjaGAuXG4gIC8vIEhhbmRsZXMgb2JqZWN0cyB3aXRoIHRoZSBidWlsdC1pbiBgZm9yRWFjaGAsIGFycmF5cywgYW5kIHJhdyBvYmplY3RzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZm9yRWFjaGAgaWYgYXZhaWxhYmxlLlxuICB2YXIgZWFjaCA9IF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBvYmo7XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBJbmZpbml0eSwgbGFzdENvbXB1dGVkID0gSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA8IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJhbmQ7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBbXTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbShpbmRleCsrKTtcbiAgICAgIHNodWZmbGVkW2luZGV4IC0gMV0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAob2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGgpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XS5wdXNoKHZhbHVlKSA6IHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldKysgOiByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSAobG93ICsgaGlnaCkgPj4+IDE7XG4gICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGFycmF5W21pZF0pIDwgdmFsdWUgPyBsb3cgPSBtaWQgKyAxIDogaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5WzBdO1xuICAgIGlmIChuIDwgMCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBlYWNoKGlucHV0LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgICAgc2hhbGxvdyA/IHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSkgOiBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBTcGxpdCBhbiBhcnJheSBpbnRvIHR3byBhcnJheXM6IG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgc2F0aXNmeSB0aGUgZ2l2ZW5cbiAgLy8gcHJlZGljYXRlLCBhbmQgb25lIHdob3NlIGVsZW1lbnRzIGFsbCBkbyBub3Qgc2F0aXNmeSB0aGUgcHJlZGljYXRlLlxuICBfLnBhcnRpdGlvbiA9IGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcGFzcyA9IFtdLCBmYWlsID0gW107XG4gICAgZWFjaChhcnJheSwgZnVuY3Rpb24oZWxlbSkge1xuICAgICAgKHByZWRpY2F0ZShlbGVtKSA/IHBhc3MgOiBmYWlsKS5wdXNoKGVsZW0pO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5jb250YWlucyhvdGhlciwgaXRlbSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmd1bWVudHMsICdsZW5ndGgnKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgdmFyIGFyZ3MgPSBib3VuZEFyZ3Muc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmdzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmdzW2ldID09PSBfKSBhcmdzW2ldID0gYXJndW1lbnRzW3Bvc2l0aW9uKytdO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZWFjaChmdW5jcywgZnVuY3Rpb24oZikgeyBvYmpbZl0gPSBfLmJpbmQob2JqW2ZdLCBvYmopOyB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vID0ge307XG4gICAgaGFzaGVyIHx8IChoYXNoZXIgPSBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gXy5oYXMobWVtbywga2V5KSA/IG1lbW9ba2V5XSA6IChtZW1vW2tleV0gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7IH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG4gICAgdmFyIHNpemUgPSAwLCByZXN1bHQgPSB0cnVlO1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChjbGFzc05hbWUgPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgICByZXN1bHQgPSBzaXplID09IGIubGVuZ3RoO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBEZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzLlxuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gZXEoYVtzaXplXSwgYltzaXplXSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAgIC8vIENvdW50IHRoZSBleHBlY3RlZCBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICAgIGlmIChfLmhhcyhiLCBrZXkpICYmICEoc2l6ZS0tKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIGVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuICEhKG9iaiAmJiBfLmhhcyhvYmosICdjYWxsZWUnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS5cbiAgaWYgKHR5cGVvZiAoLy4vKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0b3JzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9O1xuXG4gIF8ucHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iaiA9PT0gYXR0cnMpIHJldHVybiB0cnVlOyAvL2F2b2lkIGNvbXBhcmluZyBhbiBvYmplY3QgdG8gaXRzZWxmLlxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIGlmIChhdHRyc1trZXldICE9PSBvYmpba2V5XSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykgYWNjdW1baV0gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZW50aXR5TWFwID0ge1xuICAgIGVzY2FwZToge1xuICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgXCInXCI6ICcmI3gyNzsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIGBwcm9wZXJ0eWAgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdCB3aXRoIHRoZVxuICAvLyBgb2JqZWN0YCBhcyBjb250ZXh0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAgXy5yZXN1bHQgPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHQnOiAgICAgJ3QnLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHR8XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgLy8gSmF2YVNjcmlwdCBtaWNyby10ZW1wbGF0aW5nLCBzaW1pbGFyIHRvIEpvaG4gUmVzaWcncyBpbXBsZW1lbnRhdGlvbi5cbiAgLy8gVW5kZXJzY29yZSB0ZW1wbGF0aW5nIGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlcyB3aGl0ZXNwYWNlLFxuICAvLyBhbmQgY29ycmVjdGx5IGVzY2FwZXMgcXVvdGVzIHdpdGhpbiBpbnRlcnBvbGF0ZWQgY29kZS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIGRhdGEsIHNldHRpbmdzKSB7XG4gICAgdmFyIHJlbmRlcjtcbiAgICBzZXR0aW5ncyA9IF8uZGVmYXVsdHMoe30sIHNldHRpbmdzLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuXG4gICAgLy8gQ29tYmluZSBkZWxpbWl0ZXJzIGludG8gb25lIHJlZ3VsYXIgZXhwcmVzc2lvbiB2aWEgYWx0ZXJuYXRpb24uXG4gICAgdmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KVxuICAgICAgICAucmVwbGFjZShlc2NhcGVyLCBmdW5jdGlvbihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH0pO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoZXZhbHVhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlICsgXCJcXG5fX3ArPSdcIjtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuICAgIHNvdXJjZSArPSBcIic7XFxuXCI7XG5cbiAgICAvLyBJZiBhIHZhcmlhYmxlIGlzIG5vdCBzcGVjaWZpZWQsIHBsYWNlIGRhdGEgdmFsdWVzIGluIGxvY2FsIHNjb3BlLlxuICAgIGlmICghc2V0dGluZ3MudmFyaWFibGUpIHNvdXJjZSA9ICd3aXRoKG9ianx8e30pe1xcbicgKyBzb3VyY2UgKyAnfVxcbic7XG5cbiAgICBzb3VyY2UgPSBcInZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixcIiArXG4gICAgICBcInByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XFxuXCIgK1xuICAgICAgc291cmNlICsgXCJyZXR1cm4gX19wO1xcblwiO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkgcmV0dXJuIHJlbmRlcihkYXRhLCBfKTtcbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIChzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJykgKyAnKXtcXG4nICsgc291cmNlICsgJ30nO1xuXG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9O1xuXG4gIC8vIEFkZCBhIFwiY2hhaW5cIiBmdW5jdGlvbiwgd2hpY2ggd2lsbCBkZWxlZ2F0ZSB0byB0aGUgd3JhcHBlci5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfKG9iaikuY2hhaW4oKTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT0gJ3NoaWZ0JyB8fCBuYW1lID09ICdzcGxpY2UnKSAmJiBvYmoubGVuZ3RoID09PSAwKSBkZWxldGUgb2JqWzBdO1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgXy5leHRlbmQoXy5wcm90b3R5cGUsIHtcblxuICAgIC8vIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgICBjaGFpbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9jaGFpbiA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIiMgVmVuZG9yc1xuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5CYWNrYm9uZS4kID0gJFxuTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG5Sb3V0ZXMgPSByZXF1aXJlICcuL2FwcC9yb3V0ZXMvaG9tZS5jb2ZmZWUnXG5TdHlsZXMgPSByZXF1aXJlIFwiLi9hcHAvc3R5bGVzaGVldHMvYXBwLmxlc3NcIlxuXG5cbiMgYXBwIGJvb3RzdHJhcFxuYXBwID0gbmV3IE1hcmlvbmV0dGUuQXBwbGljYXRpb24oKVxuYXBwLmFkZEluaXRpYWxpemVyKChvcHRpb25zKSAtPlxuICBhcHBSb3V0ZXIgPSBuZXcgUm91dGVzXG4gIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoeyBwdXNoU3RhdGU6IHRydWUgfSlcbilcblxuYXBwLnN0YXJ0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gYXBwO1xuXG4iLCIgIEJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG4gIEJhY2tib25lLkluZGV4ZWREQiA9IHJlcXVpcmUgJ2JhY2tib25lX2luZGV4ZWRkYidcbiAgd2luZG93LkRhdGFiYXNlID0gcmVxdWlyZSAnLi4vZGF0YWJhc2UvaW5kZXhkYi5jb2ZmZWUnXG4gIE1vZGVsID0gcmVxdWlyZSAnLi4vbW9kZWxzL2RheXNfdG9fc2hpcC5jb2ZmZWUnXG5cblxuICBtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kXG5cbiAgICBzdG9yZU5hbWU6ICdkYXlzX3RvX3NoaXAnXG5cbiAgICBkYXRhYmFzZTogd2luZG93LkRhdGFiYXNlXG5cbiAgICBtb2RlbDogTW9kZWxcblxuIiwiICBCYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuICBCYWNrYm9uZS5JbmRleGVkREIgPSByZXF1aXJlICdiYWNrYm9uZV9pbmRleGVkZGInXG4gIHdpbmRvdy5EYXRhYmFzZSA9IHJlcXVpcmUgJy4uL2RhdGFiYXNlL2luZGV4ZGIuY29mZmVlJ1xuICBNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9wcm9kdWN0X3R5cGUuY29mZmVlJ1xuXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZFxuXG4gICAgc3RvcmVOYW1lOiAncHJvZHVjdF90eXBlcydcblxuICAgIGRhdGFiYXNlOiB3aW5kb3cuRGF0YWJhc2VcblxuICAgIG1vZGVsOiBNb2RlbFxuXG4iLCIgIEJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG4gIEJhY2tib25lLkluZGV4ZWREQiA9IHJlcXVpcmUgJ2JhY2tib25lX2luZGV4ZWRkYidcbiAgd2luZG93LkRhdGFiYXNlID0gcmVxdWlyZSAnLi4vZGF0YWJhc2UvaW5kZXhkYi5jb2ZmZWUnXG4gIE1vZGVsID0gcmVxdWlyZSAnLi4vbW9kZWxzL3Byb2R1Y3QuY29mZmVlJ1xuXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZFxuXG4gICAgc3RvcmVOYW1lOiAncHJvZHVjdHMnXG5cbiAgICBkYXRhYmFzZTogd2luZG93LkRhdGFiYXNlXG5cbiAgICBtb2RlbDogTW9kZWxcblxuIiwiICAjIFNldCB1cCBEYXRhYmFzZVxuICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpZDogJ25vdGhzLWRhdGFiYXNlJyxcbiAgICBkZXNjcmlwdGlvbjogJ05PVEhTIExvY2FsIERhdGFiYXNlJyxcbiAgICBtaWdyYXRpb25zOiBbXG4gICAgICB7XG5cbiAgICAgICAgdmVyc2lvbjogMSxcbiAgICAgICAgbWlncmF0ZTogKHRyYW5zYWN0aW9uLCBuZXh0KSAtPlxuICAgICAgICAgIHN0b3JlID0gdHJhbnNhY3Rpb24uZGIuY3JlYXRlT2JqZWN0U3RvcmUoJ3VzZXJzJywge2tleVBhdGg6IFwiaWRcIn0pXG4gICAgICAgICAgc3RvcmUuY3JlYXRlSW5kZXgoJ2VtYWlsSW5kZXgnLCAnZW1haWwnKVxuICAgICAgICAgIG5leHQoKVxuXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB2ZXJzaW9uOiAyLFxuICAgICAgICBtaWdyYXRlOiAodHJhbnNhY3Rpb24sIG5leHQpIC0+XG4gICAgICAgICAgc3RvcmUgPSB0cmFuc2FjdGlvbi5kYi5jcmVhdGVPYmplY3RTdG9yZSgncHJvZHVjdHMnLCB7a2V5UGF0aDogXCJpZFwifSlcbiAgICAgICAgICBuZXh0KClcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHZlcnNpb246IDMsXG4gICAgICAgIG1pZ3JhdGU6ICh0cmFuc2FjdGlvbiwgbmV4dCkgLT5cbiAgICAgICAgICBzdG9yZSA9IHRyYW5zYWN0aW9uLmRiLmNyZWF0ZU9iamVjdFN0b3JlKCdkYXlzX3RvX3NoaXAnLCB7a2V5UGF0aDogXCJpZFwifSlcbiAgICAgICAgICBzdG9yZS5jcmVhdGVJbmRleCgnZGF5c0luZGV4JywgJ2RheXMnKVxuICAgICAgICAgIG5leHQoKVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB2ZXJzaW9uOiA0LFxuICAgICAgICBtaWdyYXRlOiAodHJhbnNhY3Rpb24sIG5leHQpIC0+XG4gICAgICAgICAgc3RvcmUgPSB0cmFuc2FjdGlvbi5kYi5jcmVhdGVPYmplY3RTdG9yZSgncHJvZHVjdF90eXBlcycsIHtrZXlQYXRoOiBcImlkXCJ9KVxuICAgICAgICAgIG5leHQoKVxuICAgICAgfVxuICAgIF1cbiAgfSIsIkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5CYWNrYm9uZS5JbmRleGVkREIgPSByZXF1aXJlICdiYWNrYm9uZV9pbmRleGVkZGInXG53aW5kb3cuRGF0YWJhc2UgPSByZXF1aXJlICcuLi9kYXRhYmFzZS9pbmRleGRiLmNvZmZlZSdcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICBzdG9yZU5hbWU6ICdkYXlzX3RvX3NoaXAnXG5cbiAgZGF0YWJhc2U6IHdpbmRvdy5EYXRhYmFzZVxuXG4gIGRlZmF1bHRzOlxuICAgIHRpdGxlOiBcIlwiXG4gICAgZGF5czogMVxuIiwiQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcbkJhY2tib25lLkluZGV4ZWREQiA9IHJlcXVpcmUgJ2JhY2tib25lX2luZGV4ZWRkYidcbndpbmRvdy5EYXRhYmFzZSA9IHJlcXVpcmUgJy4uL2RhdGFiYXNlL2luZGV4ZGIuY29mZmVlJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5EYXlzVG9TaGlwID0gcmVxdWlyZSAnLi9kYXlzX3RvX3NoaXAuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gIHN0b3JlTmFtZTogJ3Byb2R1Y3RzJ1xuXG4gIGRhdGFiYXNlOiB3aW5kb3cuRGF0YWJhc2VcblxuICBkZWZhdWx0czpcbiAgICB0aXRsZTogXCJcIlxuICAgIHByaWNlOiAwLjBcbiAgICBpbnRyb2R1Y3Rpb246IFwiXCJcbiAgICBkYXlzX3RvX3NoaXBfaWQ6IG51bGxcbiAgICBzZW50ZW5jZTogXCJcIlxuICAgIHByb2R1Y3RfdHlwZV9pZDogbnVsbFxuXG5cblxuIiwiQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcbkJhY2tib25lLkluZGV4ZWREQiA9IHJlcXVpcmUgJ2JhY2tib25lX2luZGV4ZWRkYidcbndpbmRvdy5EYXRhYmFzZSA9IHJlcXVpcmUgJy4uL2RhdGFiYXNlL2luZGV4ZGIuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gIHN0b3JlTmFtZTogJ3Byb2R1Y3RfdHlwZXMnXG5cbiAgZGF0YWJhc2U6IHdpbmRvdy5EYXRhYmFzZVxuXG4gIGRlZmF1bHRzOlxuICAgIHRpdGxlOiBcIlwiXG4gICAgaW1hZ2VfdXJsOiBcIlwiXG5cbiIsIldyZXFyID0gcmVxdWlyZSAnYmFja2JvbmUud3JlcXInXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFdyZXFyLkNvbW1hbmRzKClcblxuIiwiIyBIb21lIFBhZ2UgUm91dGVyXG5NYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcblZpZXdIb21lID0gcmVxdWlyZSAnLi4vdmlld3MvaG9tZS9sYXlvdXQuY29mZmVlJ1xuRGF5c1RvU2hpcCA9IHJlcXVpcmUgJy4uL21vZGVscy9kYXlzX3RvX3NoaXAuY29mZmVlJ1xuUHJvZHVjdFR5cGUgPSByZXF1aXJlICcuLi9tb2RlbHMvcHJvZHVjdF90eXBlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuQXBwUm91dGVyLmV4dGVuZFxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJBcHAuUm91dGVzLkhvbWU6OmluaXRpYWxpemVcIilcbiAgICBAcmVnaW9uX21hbmFnZXIgPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKClcbiAgICBAcmVnaW9ucyA9IEByZWdpb25fbWFuYWdlci5hZGRSZWdpb25zKHtcbiAgICAgIGhvbWU6IFwiI2hvbWUtcGFnZS1yb3dcIlxuICAgICAgfSlcblxuICByb3V0ZXM6XG4gICAgXCJcIjogXCJob21lU2hvd1wiXG4gICAgXCJmYWN0b3J5XCI6IFwicnVuRmFjdG9yeVwiXG5cblxuICBob21lU2hvdzogLT5cbiAgICBjb25zb2xlLmxvZyhcIkFwcC5Sb3V0ZXMuSG9tZTo6aG9tZVNob3dcIilcbiAgICBjb25zb2xlLmxvZyhcIldvdWxkIGhhdmUgc2hvd24gaG9tZVwiKVxuICAgIHZpZXcgPSBuZXcgVmlld0hvbWVcbiAgICBAcmVnaW9ucy5ob21lLnNob3codmlldylcblxuICBydW5GYWN0b3J5OiAtPlxuICAgIG5ldyBEYXlzVG9TaGlwKHRpdGxlOiBcInVwIHRvIDIgRGF5c1wiLCBkYXlzOiAyKS5zYXZlKClcbiAgICBuZXcgRGF5c1RvU2hpcCh0aXRsZTogXCJ1cCB0byA0IERheXNcIiwgZGF5czogNCkuc2F2ZSgpXG4gICAgbmV3IERheXNUb1NoaXAodGl0bGU6IFwidXAgdG8gYSB3ZWVrXCIsIGRheXM6IDcpLnNhdmUoKVxuICAgIG5ldyBEYXlzVG9TaGlwKHRpdGxlOiBcInVwIHRvIHR3byB3ZWVrc1wiLCBkYXlzOiAxNCkuc2F2ZSgpXG5cbiAgICBuZXcgUHJvZHVjdFR5cGUodGl0bGU6IFwiRXhwZXJpZW5jZVwiKS5zYXZlKClcbiAgICBuZXcgUHJvZHVjdFR5cGUodGl0bGU6IFwiUGh5c2ljYWwgUHJvZHVjdFwiKS5zYXZlKClcbiAgICBuZXcgUHJvZHVjdFR5cGUodGl0bGU6IFwiU3Vic2NyaXB0aW9uXCIpLnNhdmUoKVxuXG4iLCJ2YXIgY3NzID0gXCIvKiEgbm9ybWFsaXplLmNzcyB2My4wLjAgfCBNSVQgTGljZW5zZSB8IGdpdC5pby9ub3JtYWxpemUgKi9cXG5odG1sIHtcXG4gIGZvbnQtZmFtaWx5OiBzYW5zLXNlcmlmO1xcbiAgLW1zLXRleHQtc2l6ZS1hZGp1c3Q6IDEwMCU7XFxuICAtd2Via2l0LXRleHQtc2l6ZS1hZGp1c3Q6IDEwMCU7XFxufVxcbmJvZHkge1xcbiAgbWFyZ2luOiAwO1xcbn1cXG5hcnRpY2xlLFxcbmFzaWRlLFxcbmRldGFpbHMsXFxuZmlnY2FwdGlvbixcXG5maWd1cmUsXFxuZm9vdGVyLFxcbmhlYWRlcixcXG5oZ3JvdXAsXFxubWFpbixcXG5uYXYsXFxuc2VjdGlvbixcXG5zdW1tYXJ5IHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG5hdWRpbyxcXG5jYW52YXMsXFxucHJvZ3Jlc3MsXFxudmlkZW8ge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgdmVydGljYWwtYWxpZ246IGJhc2VsaW5lO1xcbn1cXG5hdWRpbzpub3QoW2NvbnRyb2xzXSkge1xcbiAgZGlzcGxheTogbm9uZTtcXG4gIGhlaWdodDogMDtcXG59XFxuW2hpZGRlbl0sXFxudGVtcGxhdGUge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuYSB7XFxuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcXG59XFxuYTphY3RpdmUsXFxuYTpob3ZlciB7XFxuICBvdXRsaW5lOiAwO1xcbn1cXG5hYmJyW3RpdGxlXSB7XFxuICBib3JkZXItYm90dG9tOiAxcHggZG90dGVkO1xcbn1cXG5iLFxcbnN0cm9uZyB7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG59XFxuZGZuIHtcXG4gIGZvbnQtc3R5bGU6IGl0YWxpYztcXG59XFxuaDEge1xcbiAgZm9udC1zaXplOiAyZW07XFxuICBtYXJnaW46IDAuNjdlbSAwO1xcbn1cXG5tYXJrIHtcXG4gIGJhY2tncm91bmQ6ICNmZjA7XFxuICBjb2xvcjogIzAwMDtcXG59XFxuc21hbGwge1xcbiAgZm9udC1zaXplOiA4MCU7XFxufVxcbnN1YixcXG5zdXAge1xcbiAgZm9udC1zaXplOiA3NSU7XFxuICBsaW5lLWhlaWdodDogMDtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHZlcnRpY2FsLWFsaWduOiBiYXNlbGluZTtcXG59XFxuc3VwIHtcXG4gIHRvcDogLTAuNWVtO1xcbn1cXG5zdWIge1xcbiAgYm90dG9tOiAtMC4yNWVtO1xcbn1cXG5pbWcge1xcbiAgYm9yZGVyOiAwO1xcbn1cXG5zdmc6bm90KDpyb290KSB7XFxuICBvdmVyZmxvdzogaGlkZGVuO1xcbn1cXG5maWd1cmUge1xcbiAgbWFyZ2luOiAxZW0gNDBweDtcXG59XFxuaHIge1xcbiAgLW1vei1ib3gtc2l6aW5nOiBjb250ZW50LWJveDtcXG4gIGJveC1zaXppbmc6IGNvbnRlbnQtYm94O1xcbiAgaGVpZ2h0OiAwO1xcbn1cXG5wcmUge1xcbiAgb3ZlcmZsb3c6IGF1dG87XFxufVxcbmNvZGUsXFxua2JkLFxcbnByZSxcXG5zYW1wIHtcXG4gIGZvbnQtZmFtaWx5OiBtb25vc3BhY2UsIG1vbm9zcGFjZTtcXG4gIGZvbnQtc2l6ZTogMWVtO1xcbn1cXG5idXR0b24sXFxuaW5wdXQsXFxub3B0Z3JvdXAsXFxuc2VsZWN0LFxcbnRleHRhcmVhIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbiAgZm9udDogaW5oZXJpdDtcXG4gIG1hcmdpbjogMDtcXG59XFxuYnV0dG9uIHtcXG4gIG92ZXJmbG93OiB2aXNpYmxlO1xcbn1cXG5idXR0b24sXFxuc2VsZWN0IHtcXG4gIHRleHQtdHJhbnNmb3JtOiBub25lO1xcbn1cXG5idXR0b24sXFxuaHRtbCBpbnB1dFt0eXBlPVxcXCJidXR0b25cXFwiXSxcXG5pbnB1dFt0eXBlPVxcXCJyZXNldFxcXCJdLFxcbmlucHV0W3R5cGU9XFxcInN1Ym1pdFxcXCJdIHtcXG4gIC13ZWJraXQtYXBwZWFyYW5jZTogYnV0dG9uO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG5idXR0b25bZGlzYWJsZWRdLFxcbmh0bWwgaW5wdXRbZGlzYWJsZWRdIHtcXG4gIGN1cnNvcjogZGVmYXVsdDtcXG59XFxuYnV0dG9uOjotbW96LWZvY3VzLWlubmVyLFxcbmlucHV0OjotbW96LWZvY3VzLWlubmVyIHtcXG4gIGJvcmRlcjogMDtcXG4gIHBhZGRpbmc6IDA7XFxufVxcbmlucHV0IHtcXG4gIGxpbmUtaGVpZ2h0OiBub3JtYWw7XFxufVxcbmlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl0sXFxuaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXSB7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgcGFkZGluZzogMDtcXG59XFxuaW5wdXRbdHlwZT1cXFwibnVtYmVyXFxcIl06Oi13ZWJraXQtaW5uZXItc3Bpbi1idXR0b24sXFxuaW5wdXRbdHlwZT1cXFwibnVtYmVyXFxcIl06Oi13ZWJraXQtb3V0ZXItc3Bpbi1idXR0b24ge1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJzZWFyY2hcXFwiXSB7XFxuICAtd2Via2l0LWFwcGVhcmFuY2U6IHRleHRmaWVsZDtcXG4gIC1tb3otYm94LXNpemluZzogY29udGVudC1ib3g7XFxuICAtd2Via2l0LWJveC1zaXppbmc6IGNvbnRlbnQtYm94O1xcbiAgYm94LXNpemluZzogY29udGVudC1ib3g7XFxufVxcbmlucHV0W3R5cGU9XFxcInNlYXJjaFxcXCJdOjotd2Via2l0LXNlYXJjaC1jYW5jZWwtYnV0dG9uLFxcbmlucHV0W3R5cGU9XFxcInNlYXJjaFxcXCJdOjotd2Via2l0LXNlYXJjaC1kZWNvcmF0aW9uIHtcXG4gIC13ZWJraXQtYXBwZWFyYW5jZTogbm9uZTtcXG59XFxuZmllbGRzZXQge1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2MwYzBjMDtcXG4gIG1hcmdpbjogMCAycHg7XFxuICBwYWRkaW5nOiAwLjM1ZW0gMC42MjVlbSAwLjc1ZW07XFxufVxcbmxlZ2VuZCB7XFxuICBib3JkZXI6IDA7XFxuICBwYWRkaW5nOiAwO1xcbn1cXG50ZXh0YXJlYSB7XFxuICBvdmVyZmxvdzogYXV0bztcXG59XFxub3B0Z3JvdXAge1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxufVxcbnRhYmxlIHtcXG4gIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XFxuICBib3JkZXItc3BhY2luZzogMDtcXG59XFxudGQsXFxudGgge1xcbiAgcGFkZGluZzogMDtcXG59XFxuQG1lZGlhIHByaW50IHtcXG4gICoge1xcbiAgICB0ZXh0LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50O1xcbiAgICBjb2xvcjogIzAwMCAhaW1wb3J0YW50O1xcbiAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudCAhaW1wb3J0YW50O1xcbiAgICBib3gtc2hhZG93OiBub25lICFpbXBvcnRhbnQ7XFxuICB9XFxuICBhLFxcbiAgYTp2aXNpdGVkIHtcXG4gICAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XFxuICB9XFxuICBhW2hyZWZdOmFmdGVyIHtcXG4gICAgY29udGVudDogXFxcIiAoXFxcIiBhdHRyKGhyZWYpIFxcXCIpXFxcIjtcXG4gIH1cXG4gIGFiYnJbdGl0bGVdOmFmdGVyIHtcXG4gICAgY29udGVudDogXFxcIiAoXFxcIiBhdHRyKHRpdGxlKSBcXFwiKVxcXCI7XFxuICB9XFxuICBhW2hyZWZePVxcXCJqYXZhc2NyaXB0OlxcXCJdOmFmdGVyLFxcbiAgYVtocmVmXj1cXFwiI1xcXCJdOmFmdGVyIHtcXG4gICAgY29udGVudDogXFxcIlxcXCI7XFxuICB9XFxuICBwcmUsXFxuICBibG9ja3F1b3RlIHtcXG4gICAgYm9yZGVyOiAxcHggc29saWQgIzk5OTtcXG4gICAgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkO1xcbiAgfVxcbiAgdGhlYWQge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1oZWFkZXItZ3JvdXA7XFxuICB9XFxuICB0cixcXG4gIGltZyB7XFxuICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZDtcXG4gIH1cXG4gIGltZyB7XFxuICAgIG1heC13aWR0aDogMTAwJSAhaW1wb3J0YW50O1xcbiAgfVxcbiAgcCxcXG4gIGgyLFxcbiAgaDMge1xcbiAgICBvcnBoYW5zOiAzO1xcbiAgICB3aWRvd3M6IDM7XFxuICB9XFxuICBoMixcXG4gIGgzIHtcXG4gICAgcGFnZS1icmVhay1hZnRlcjogYXZvaWQ7XFxuICB9XFxuICBzZWxlY3Qge1xcbiAgICBiYWNrZ3JvdW5kOiAjZmZmICFpbXBvcnRhbnQ7XFxuICB9XFxuICAubmF2YmFyIHtcXG4gICAgZGlzcGxheTogbm9uZTtcXG4gIH1cXG4gIC50YWJsZSB0ZCxcXG4gIC50YWJsZSB0aCB7XFxuICAgIGJhY2tncm91bmQtY29sb3I6ICNmZmYgIWltcG9ydGFudDtcXG4gIH1cXG4gIC5idG4gPiAuY2FyZXQsXFxuICAuZHJvcHVwID4gLmJ0biA+IC5jYXJldCB7XFxuICAgIGJvcmRlci10b3AtY29sb3I6ICMwMDAgIWltcG9ydGFudDtcXG4gIH1cXG4gIC5sYWJlbCB7XFxuICAgIGJvcmRlcjogMXB4IHNvbGlkICMwMDA7XFxuICB9XFxuICAudGFibGUge1xcbiAgICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlICFpbXBvcnRhbnQ7XFxuICB9XFxuICAudGFibGUtYm9yZGVyZWQgdGgsXFxuICAudGFibGUtYm9yZGVyZWQgdGQge1xcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjZGRkICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbioge1xcbiAgLXdlYmtpdC1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgLW1vei1ib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG59XFxuKjpiZWZvcmUsXFxuKjphZnRlciB7XFxuICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbn1cXG5odG1sIHtcXG4gIGZvbnQtc2l6ZTogNjIuNSU7XFxuICAtd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMCk7XFxufVxcbmJvZHkge1xcbiAgZm9udC1mYW1pbHk6IFxcXCJIZWx2ZXRpY2EgTmV1ZVxcXCIsIEhlbHZldGljYSwgQXJpYWwsIHNhbnMtc2VyaWY7XFxuICBmb250LXNpemU6IDE0cHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuaW5wdXQsXFxuYnV0dG9uLFxcbnNlbGVjdCxcXG50ZXh0YXJlYSB7XFxuICBmb250LWZhbWlseTogaW5oZXJpdDtcXG4gIGZvbnQtc2l6ZTogaW5oZXJpdDtcXG4gIGxpbmUtaGVpZ2h0OiBpbmhlcml0O1xcbn1cXG5hIHtcXG4gIGNvbG9yOiAjNDI4YmNhO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbn1cXG5hOmhvdmVyLFxcbmE6Zm9jdXMge1xcbiAgY29sb3I6ICMyYTY0OTY7XFxuICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcXG59XFxuYTpmb2N1cyB7XFxuICBvdXRsaW5lOiB0aGluIGRvdHRlZDtcXG4gIG91dGxpbmU6IDVweCBhdXRvIC13ZWJraXQtZm9jdXMtcmluZy1jb2xvcjtcXG4gIG91dGxpbmUtb2Zmc2V0OiAtMnB4O1xcbn1cXG5maWd1cmUge1xcbiAgbWFyZ2luOiAwO1xcbn1cXG5pbWcge1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG59XFxuLmltZy1yZXNwb25zaXZlLFxcbi50aHVtYm5haWwgPiBpbWcsXFxuLnRodW1ibmFpbCBhID4gaW1nLFxcbi5jYXJvdXNlbC1pbm5lciA+IC5pdGVtID4gaW1nLFxcbi5jYXJvdXNlbC1pbm5lciA+IC5pdGVtID4gYSA+IGltZyB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIG1heC13aWR0aDogMTAwJTtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuLmltZy1yb3VuZGVkIHtcXG4gIGJvcmRlci1yYWRpdXM6IDZweDtcXG59XFxuLmltZy10aHVtYm5haWwge1xcbiAgcGFkZGluZzogNHB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogYWxsIDAuMnMgZWFzZS1pbi1vdXQ7XFxuICB0cmFuc2l0aW9uOiBhbGwgMC4ycyBlYXNlLWluLW91dDtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIG1heC13aWR0aDogMTAwJTtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuLmltZy1jaXJjbGUge1xcbiAgYm9yZGVyLXJhZGl1czogNTAlO1xcbn1cXG5ociB7XFxuICBtYXJnaW4tdG9wOiAyMHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG4gIGJvcmRlcjogMDtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCAjZWVlZWVlO1xcbn1cXG4uc3Itb25seSB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB3aWR0aDogMXB4O1xcbiAgaGVpZ2h0OiAxcHg7XFxuICBtYXJnaW46IC0xcHg7XFxuICBwYWRkaW5nOiAwO1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIGNsaXA6IHJlY3QoMCwgMCwgMCwgMCk7XFxuICBib3JkZXI6IDA7XFxufVxcbmgxLFxcbmgyLFxcbmgzLFxcbmg0LFxcbmg1LFxcbmg2LFxcbi5oMSxcXG4uaDIsXFxuLmgzLFxcbi5oNCxcXG4uaDUsXFxuLmg2IHtcXG4gIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xcbiAgZm9udC13ZWlnaHQ6IDUwMDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjE7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuaDEgc21hbGwsXFxuaDIgc21hbGwsXFxuaDMgc21hbGwsXFxuaDQgc21hbGwsXFxuaDUgc21hbGwsXFxuaDYgc21hbGwsXFxuLmgxIHNtYWxsLFxcbi5oMiBzbWFsbCxcXG4uaDMgc21hbGwsXFxuLmg0IHNtYWxsLFxcbi5oNSBzbWFsbCxcXG4uaDYgc21hbGwsXFxuaDEgLnNtYWxsLFxcbmgyIC5zbWFsbCxcXG5oMyAuc21hbGwsXFxuaDQgLnNtYWxsLFxcbmg1IC5zbWFsbCxcXG5oNiAuc21hbGwsXFxuLmgxIC5zbWFsbCxcXG4uaDIgLnNtYWxsLFxcbi5oMyAuc21hbGwsXFxuLmg0IC5zbWFsbCxcXG4uaDUgLnNtYWxsLFxcbi5oNiAuc21hbGwge1xcbiAgZm9udC13ZWlnaHQ6IG5vcm1hbDtcXG4gIGxpbmUtaGVpZ2h0OiAxO1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbmgxLFxcbi5oMSxcXG5oMixcXG4uaDIsXFxuaDMsXFxuLmgzIHtcXG4gIG1hcmdpbi10b3A6IDIwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAxMHB4O1xcbn1cXG5oMSBzbWFsbCxcXG4uaDEgc21hbGwsXFxuaDIgc21hbGwsXFxuLmgyIHNtYWxsLFxcbmgzIHNtYWxsLFxcbi5oMyBzbWFsbCxcXG5oMSAuc21hbGwsXFxuLmgxIC5zbWFsbCxcXG5oMiAuc21hbGwsXFxuLmgyIC5zbWFsbCxcXG5oMyAuc21hbGwsXFxuLmgzIC5zbWFsbCB7XFxuICBmb250LXNpemU6IDY1JTtcXG59XFxuaDQsXFxuLmg0LFxcbmg1LFxcbi5oNSxcXG5oNixcXG4uaDYge1xcbiAgbWFyZ2luLXRvcDogMTBweDtcXG4gIG1hcmdpbi1ib3R0b206IDEwcHg7XFxufVxcbmg0IHNtYWxsLFxcbi5oNCBzbWFsbCxcXG5oNSBzbWFsbCxcXG4uaDUgc21hbGwsXFxuaDYgc21hbGwsXFxuLmg2IHNtYWxsLFxcbmg0IC5zbWFsbCxcXG4uaDQgLnNtYWxsLFxcbmg1IC5zbWFsbCxcXG4uaDUgLnNtYWxsLFxcbmg2IC5zbWFsbCxcXG4uaDYgLnNtYWxsIHtcXG4gIGZvbnQtc2l6ZTogNzUlO1xcbn1cXG5oMSxcXG4uaDEge1xcbiAgZm9udC1zaXplOiAzNnB4O1xcbn1cXG5oMixcXG4uaDIge1xcbiAgZm9udC1zaXplOiAzMHB4O1xcbn1cXG5oMyxcXG4uaDMge1xcbiAgZm9udC1zaXplOiAyNHB4O1xcbn1cXG5oNCxcXG4uaDQge1xcbiAgZm9udC1zaXplOiAxOHB4O1xcbn1cXG5oNSxcXG4uaDUge1xcbiAgZm9udC1zaXplOiAxNHB4O1xcbn1cXG5oNixcXG4uaDYge1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbn1cXG5wIHtcXG4gIG1hcmdpbjogMCAwIDEwcHg7XFxufVxcbi5sZWFkIHtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBmb250LXNpemU6IDE2cHg7XFxuICBmb250LXdlaWdodDogMjAwO1xcbiAgbGluZS1oZWlnaHQ6IDEuNDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubGVhZCB7XFxuICAgIGZvbnQtc2l6ZTogMjFweDtcXG4gIH1cXG59XFxuc21hbGwsXFxuLnNtYWxsIHtcXG4gIGZvbnQtc2l6ZTogODUlO1xcbn1cXG5jaXRlIHtcXG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcXG59XFxuLnRleHQtbGVmdCB7XFxuICB0ZXh0LWFsaWduOiBsZWZ0O1xcbn1cXG4udGV4dC1yaWdodCB7XFxuICB0ZXh0LWFsaWduOiByaWdodDtcXG59XFxuLnRleHQtY2VudGVyIHtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuLnRleHQtanVzdGlmeSB7XFxuICB0ZXh0LWFsaWduOiBqdXN0aWZ5O1xcbn1cXG4udGV4dC1tdXRlZCB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLnRleHQtcHJpbWFyeSB7XFxuICBjb2xvcjogIzQyOGJjYTtcXG59XFxuYS50ZXh0LXByaW1hcnk6aG92ZXIge1xcbiAgY29sb3I6ICMzMDcxYTk7XFxufVxcbi50ZXh0LXN1Y2Nlc3Mge1xcbiAgY29sb3I6ICMzYzc2M2Q7XFxufVxcbmEudGV4dC1zdWNjZXNzOmhvdmVyIHtcXG4gIGNvbG9yOiAjMmI1NDJjO1xcbn1cXG4udGV4dC1pbmZvIHtcXG4gIGNvbG9yOiAjMzE3MDhmO1xcbn1cXG5hLnRleHQtaW5mbzpob3ZlciB7XFxuICBjb2xvcjogIzI0NTI2OTtcXG59XFxuLnRleHQtd2FybmluZyB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG59XFxuYS50ZXh0LXdhcm5pbmc6aG92ZXIge1xcbiAgY29sb3I6ICM2NjUxMmM7XFxufVxcbi50ZXh0LWRhbmdlciB7XFxuICBjb2xvcjogI2E5NDQ0MjtcXG59XFxuYS50ZXh0LWRhbmdlcjpob3ZlciB7XFxuICBjb2xvcjogIzg0MzUzNDtcXG59XFxuLmJnLXByaW1hcnkge1xcbiAgY29sb3I6ICNmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG5hLmJnLXByaW1hcnk6aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMwNzFhOTtcXG59XFxuLmJnLXN1Y2Nlc3Mge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2RmZjBkODtcXG59XFxuYS5iZy1zdWNjZXNzOmhvdmVyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNjMWUyYjM7XFxufVxcbi5iZy1pbmZvIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOWVkZjc7XFxufVxcbmEuYmctaW5mbzpob3ZlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjYWZkOWVlO1xcbn1cXG4uYmctd2FybmluZyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmNmOGUzO1xcbn1cXG5hLmJnLXdhcm5pbmc6aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y3ZWNiNTtcXG59XFxuLmJnLWRhbmdlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjJkZWRlO1xcbn1cXG5hLmJnLWRhbmdlcjpob3ZlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTRiOWI5O1xcbn1cXG4ucGFnZS1oZWFkZXIge1xcbiAgcGFkZGluZy1ib3R0b206IDlweDtcXG4gIG1hcmdpbjogNDBweCAwIDIwcHg7XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2VlZWVlZTtcXG59XFxudWwsXFxub2wge1xcbiAgbWFyZ2luLXRvcDogMDtcXG4gIG1hcmdpbi1ib3R0b206IDEwcHg7XFxufVxcbnVsIHVsLFxcbm9sIHVsLFxcbnVsIG9sLFxcbm9sIG9sIHtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxufVxcbi5saXN0LXVuc3R5bGVkIHtcXG4gIHBhZGRpbmctbGVmdDogMDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxufVxcbi5saXN0LWlubGluZSB7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbiAgbWFyZ2luLWxlZnQ6IC01cHg7XFxufVxcbi5saXN0LWlubGluZSA+IGxpIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHBhZGRpbmctbGVmdDogNXB4O1xcbiAgcGFkZGluZy1yaWdodDogNXB4O1xcbn1cXG5kbCB7XFxuICBtYXJnaW4tdG9wOiAwO1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG59XFxuZHQsXFxuZGQge1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxufVxcbmR0IHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG5kZCB7XFxuICBtYXJnaW4tbGVmdDogMDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuZGwtaG9yaXpvbnRhbCBkdCB7XFxuICAgIGZsb2F0OiBsZWZ0O1xcbiAgICB3aWR0aDogMTYwcHg7XFxuICAgIGNsZWFyOiBsZWZ0O1xcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcXG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XFxuICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxuICB9XFxuICAuZGwtaG9yaXpvbnRhbCBkZCB7XFxuICAgIG1hcmdpbi1sZWZ0OiAxODBweDtcXG4gIH1cXG59XFxuYWJiclt0aXRsZV0sXFxuYWJicltkYXRhLW9yaWdpbmFsLXRpdGxlXSB7XFxuICBjdXJzb3I6IGhlbHA7XFxuICBib3JkZXItYm90dG9tOiAxcHggZG90dGVkICM5OTk5OTk7XFxufVxcbi5pbml0aWFsaXNtIHtcXG4gIGZvbnQtc2l6ZTogOTAlO1xcbiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcXG59XFxuYmxvY2txdW90ZSB7XFxuICBwYWRkaW5nOiAxMHB4IDIwcHg7XFxuICBtYXJnaW46IDAgMCAyMHB4O1xcbiAgZm9udC1zaXplOiAxNy41cHg7XFxuICBib3JkZXItbGVmdDogNXB4IHNvbGlkICNlZWVlZWU7XFxufVxcbmJsb2NrcXVvdGUgcDpsYXN0LWNoaWxkLFxcbmJsb2NrcXVvdGUgdWw6bGFzdC1jaGlsZCxcXG5ibG9ja3F1b3RlIG9sOmxhc3QtY2hpbGQge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuYmxvY2txdW90ZSBmb290ZXIsXFxuYmxvY2txdW90ZSBzbWFsbCxcXG5ibG9ja3F1b3RlIC5zbWFsbCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIGZvbnQtc2l6ZTogODAlO1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuYmxvY2txdW90ZSBmb290ZXI6YmVmb3JlLFxcbmJsb2NrcXVvdGUgc21hbGw6YmVmb3JlLFxcbmJsb2NrcXVvdGUgLnNtYWxsOmJlZm9yZSB7XFxuICBjb250ZW50OiAnXFxcXDIwMTQgXFxcXDAwQTAnO1xcbn1cXG4uYmxvY2txdW90ZS1yZXZlcnNlLFxcbmJsb2NrcXVvdGUucHVsbC1yaWdodCB7XFxuICBwYWRkaW5nLXJpZ2h0OiAxNXB4O1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgYm9yZGVyLXJpZ2h0OiA1cHggc29saWQgI2VlZWVlZTtcXG4gIGJvcmRlci1sZWZ0OiAwO1xcbiAgdGV4dC1hbGlnbjogcmlnaHQ7XFxufVxcbi5ibG9ja3F1b3RlLXJldmVyc2UgZm9vdGVyOmJlZm9yZSxcXG5ibG9ja3F1b3RlLnB1bGwtcmlnaHQgZm9vdGVyOmJlZm9yZSxcXG4uYmxvY2txdW90ZS1yZXZlcnNlIHNtYWxsOmJlZm9yZSxcXG5ibG9ja3F1b3RlLnB1bGwtcmlnaHQgc21hbGw6YmVmb3JlLFxcbi5ibG9ja3F1b3RlLXJldmVyc2UgLnNtYWxsOmJlZm9yZSxcXG5ibG9ja3F1b3RlLnB1bGwtcmlnaHQgLnNtYWxsOmJlZm9yZSB7XFxuICBjb250ZW50OiAnJztcXG59XFxuLmJsb2NrcXVvdGUtcmV2ZXJzZSBmb290ZXI6YWZ0ZXIsXFxuYmxvY2txdW90ZS5wdWxsLXJpZ2h0IGZvb3RlcjphZnRlcixcXG4uYmxvY2txdW90ZS1yZXZlcnNlIHNtYWxsOmFmdGVyLFxcbmJsb2NrcXVvdGUucHVsbC1yaWdodCBzbWFsbDphZnRlcixcXG4uYmxvY2txdW90ZS1yZXZlcnNlIC5zbWFsbDphZnRlcixcXG5ibG9ja3F1b3RlLnB1bGwtcmlnaHQgLnNtYWxsOmFmdGVyIHtcXG4gIGNvbnRlbnQ6ICdcXFxcMDBBMCBcXFxcMjAxNCc7XFxufVxcbmJsb2NrcXVvdGU6YmVmb3JlLFxcbmJsb2NrcXVvdGU6YWZ0ZXIge1xcbiAgY29udGVudDogXFxcIlxcXCI7XFxufVxcbmFkZHJlc3Mge1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbn1cXG5jb2RlLFxcbmtiZCxcXG5wcmUsXFxuc2FtcCB7XFxuICBmb250LWZhbWlseTogTWVubG8sIE1vbmFjbywgQ29uc29sYXMsIFxcXCJDb3VyaWVyIE5ld1xcXCIsIG1vbm9zcGFjZTtcXG59XFxuY29kZSB7XFxuICBwYWRkaW5nOiAycHggNHB4O1xcbiAgZm9udC1zaXplOiA5MCU7XFxuICBjb2xvcjogI2M3MjU0ZTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmOWYyZjQ7XFxuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG5rYmQge1xcbiAgcGFkZGluZzogMnB4IDRweDtcXG4gIGZvbnQtc2l6ZTogOTAlO1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzMzMzMzO1xcbiAgYm9yZGVyLXJhZGl1czogM3B4O1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAtMXB4IDAgcmdiYSgwLCAwLCAwLCAwLjI1KTtcXG59XFxucHJlIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZzogOS41cHg7XFxuICBtYXJnaW46IDAgMCAxMHB4O1xcbiAgZm9udC1zaXplOiAxM3B4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICB3b3JkLWJyZWFrOiBicmVhay1hbGw7XFxuICB3b3JkLXdyYXA6IGJyZWFrLXdvcmQ7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjY2NjY2NjO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG5wcmUgY29kZSB7XFxuICBwYWRkaW5nOiAwO1xcbiAgZm9udC1zaXplOiBpbmhlcml0O1xcbiAgY29sb3I6IGluaGVyaXQ7XFxuICB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIGJvcmRlci1yYWRpdXM6IDA7XFxufVxcbi5wcmUtc2Nyb2xsYWJsZSB7XFxuICBtYXgtaGVpZ2h0OiAzNDBweDtcXG4gIG92ZXJmbG93LXk6IHNjcm9sbDtcXG59XFxuLmNvbnRhaW5lciB7XFxuICBtYXJnaW4tcmlnaHQ6IGF1dG87XFxuICBtYXJnaW4tbGVmdDogYXV0bztcXG4gIHBhZGRpbmctbGVmdDogMTVweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDE1cHg7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLmNvbnRhaW5lciB7XFxuICAgIHdpZHRoOiA3NTBweDtcXG4gIH1cXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDk5MnB4KSB7XFxuICAuY29udGFpbmVyIHtcXG4gICAgd2lkdGg6IDk3MHB4O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogMTIwMHB4KSB7XFxuICAuY29udGFpbmVyIHtcXG4gICAgd2lkdGg6IDExNzBweDtcXG4gIH1cXG59XFxuLmNvbnRhaW5lci1mbHVpZCB7XFxuICBtYXJnaW4tcmlnaHQ6IGF1dG87XFxuICBtYXJnaW4tbGVmdDogYXV0bztcXG4gIHBhZGRpbmctbGVmdDogMTVweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDE1cHg7XFxufVxcbi5yb3cge1xcbiAgbWFyZ2luLWxlZnQ6IC0xNXB4O1xcbiAgbWFyZ2luLXJpZ2h0OiAtMTVweDtcXG59XFxuLmNvbC14cy0xLCAuY29sLXNtLTEsIC5jb2wtbWQtMSwgLmNvbC1sZy0xLCAuY29sLXhzLTIsIC5jb2wtc20tMiwgLmNvbC1tZC0yLCAuY29sLWxnLTIsIC5jb2wteHMtMywgLmNvbC1zbS0zLCAuY29sLW1kLTMsIC5jb2wtbGctMywgLmNvbC14cy00LCAuY29sLXNtLTQsIC5jb2wtbWQtNCwgLmNvbC1sZy00LCAuY29sLXhzLTUsIC5jb2wtc20tNSwgLmNvbC1tZC01LCAuY29sLWxnLTUsIC5jb2wteHMtNiwgLmNvbC1zbS02LCAuY29sLW1kLTYsIC5jb2wtbGctNiwgLmNvbC14cy03LCAuY29sLXNtLTcsIC5jb2wtbWQtNywgLmNvbC1sZy03LCAuY29sLXhzLTgsIC5jb2wtc20tOCwgLmNvbC1tZC04LCAuY29sLWxnLTgsIC5jb2wteHMtOSwgLmNvbC1zbS05LCAuY29sLW1kLTksIC5jb2wtbGctOSwgLmNvbC14cy0xMCwgLmNvbC1zbS0xMCwgLmNvbC1tZC0xMCwgLmNvbC1sZy0xMCwgLmNvbC14cy0xMSwgLmNvbC1zbS0xMSwgLmNvbC1tZC0xMSwgLmNvbC1sZy0xMSwgLmNvbC14cy0xMiwgLmNvbC1zbS0xMiwgLmNvbC1tZC0xMiwgLmNvbC1sZy0xMiB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBtaW4taGVpZ2h0OiAxcHg7XFxuICBwYWRkaW5nLWxlZnQ6IDE1cHg7XFxuICBwYWRkaW5nLXJpZ2h0OiAxNXB4O1xcbn1cXG4uY29sLXhzLTEsIC5jb2wteHMtMiwgLmNvbC14cy0zLCAuY29sLXhzLTQsIC5jb2wteHMtNSwgLmNvbC14cy02LCAuY29sLXhzLTcsIC5jb2wteHMtOCwgLmNvbC14cy05LCAuY29sLXhzLTEwLCAuY29sLXhzLTExLCAuY29sLXhzLTEyIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbn1cXG4uY29sLXhzLTEyIHtcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4uY29sLXhzLTExIHtcXG4gIHdpZHRoOiA5MS42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtMTAge1xcbiAgd2lkdGg6IDgzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy05IHtcXG4gIHdpZHRoOiA3NSU7XFxufVxcbi5jb2wteHMtOCB7XFxuICB3aWR0aDogNjYuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLTcge1xcbiAgd2lkdGg6IDU4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy02IHtcXG4gIHdpZHRoOiA1MCU7XFxufVxcbi5jb2wteHMtNSB7XFxuICB3aWR0aDogNDEuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLTQge1xcbiAgd2lkdGg6IDMzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy0zIHtcXG4gIHdpZHRoOiAyNSU7XFxufVxcbi5jb2wteHMtMiB7XFxuICB3aWR0aDogMTYuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLTEge1xcbiAgd2lkdGg6IDguMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLXB1bGwtMTIge1xcbiAgcmlnaHQ6IDEwMCU7XFxufVxcbi5jb2wteHMtcHVsbC0xMSB7XFxuICByaWdodDogOTEuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLXB1bGwtMTAge1xcbiAgcmlnaHQ6IDgzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdWxsLTkge1xcbiAgcmlnaHQ6IDc1JTtcXG59XFxuLmNvbC14cy1wdWxsLTgge1xcbiAgcmlnaHQ6IDY2LjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdWxsLTcge1xcbiAgcmlnaHQ6IDU4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdWxsLTYge1xcbiAgcmlnaHQ6IDUwJTtcXG59XFxuLmNvbC14cy1wdWxsLTUge1xcbiAgcmlnaHQ6IDQxLjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdWxsLTQge1xcbiAgcmlnaHQ6IDMzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1wdWxsLTMge1xcbiAgcmlnaHQ6IDI1JTtcXG59XFxuLmNvbC14cy1wdWxsLTIge1xcbiAgcmlnaHQ6IDE2LjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdWxsLTEge1xcbiAgcmlnaHQ6IDguMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLXB1bGwtMCB7XFxuICByaWdodDogMCU7XFxufVxcbi5jb2wteHMtcHVzaC0xMiB7XFxuICBsZWZ0OiAxMDAlO1xcbn1cXG4uY29sLXhzLXB1c2gtMTEge1xcbiAgbGVmdDogOTEuNjY2NjY2NjclO1xcbn1cXG4uY29sLXhzLXB1c2gtMTAge1xcbiAgbGVmdDogODMuMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLXB1c2gtOSB7XFxuICBsZWZ0OiA3NSU7XFxufVxcbi5jb2wteHMtcHVzaC04IHtcXG4gIGxlZnQ6IDY2LjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdXNoLTcge1xcbiAgbGVmdDogNTguMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLXB1c2gtNiB7XFxuICBsZWZ0OiA1MCU7XFxufVxcbi5jb2wteHMtcHVzaC01IHtcXG4gIGxlZnQ6IDQxLjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdXNoLTQge1xcbiAgbGVmdDogMzMuMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLXB1c2gtMyB7XFxuICBsZWZ0OiAyNSU7XFxufVxcbi5jb2wteHMtcHVzaC0yIHtcXG4gIGxlZnQ6IDE2LjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1wdXNoLTEge1xcbiAgbGVmdDogOC4zMzMzMzMzMyU7XFxufVxcbi5jb2wteHMtcHVzaC0wIHtcXG4gIGxlZnQ6IDAlO1xcbn1cXG4uY29sLXhzLW9mZnNldC0xMiB7XFxuICBtYXJnaW4tbGVmdDogMTAwJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtMTEge1xcbiAgbWFyZ2luLWxlZnQ6IDkxLjY2NjY2NjY3JTtcXG59XFxuLmNvbC14cy1vZmZzZXQtMTAge1xcbiAgbWFyZ2luLWxlZnQ6IDgzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtOSB7XFxuICBtYXJnaW4tbGVmdDogNzUlO1xcbn1cXG4uY29sLXhzLW9mZnNldC04IHtcXG4gIG1hcmdpbi1sZWZ0OiA2Ni42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTcge1xcbiAgbWFyZ2luLWxlZnQ6IDU4LjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtNiB7XFxuICBtYXJnaW4tbGVmdDogNTAlO1xcbn1cXG4uY29sLXhzLW9mZnNldC01IHtcXG4gIG1hcmdpbi1sZWZ0OiA0MS42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTQge1xcbiAgbWFyZ2luLWxlZnQ6IDMzLjMzMzMzMzMzJTtcXG59XFxuLmNvbC14cy1vZmZzZXQtMyB7XFxuICBtYXJnaW4tbGVmdDogMjUlO1xcbn1cXG4uY29sLXhzLW9mZnNldC0yIHtcXG4gIG1hcmdpbi1sZWZ0OiAxNi42NjY2NjY2NyU7XFxufVxcbi5jb2wteHMtb2Zmc2V0LTEge1xcbiAgbWFyZ2luLWxlZnQ6IDguMzMzMzMzMzMlO1xcbn1cXG4uY29sLXhzLW9mZnNldC0wIHtcXG4gIG1hcmdpbi1sZWZ0OiAwJTtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuY29sLXNtLTEsIC5jb2wtc20tMiwgLmNvbC1zbS0zLCAuY29sLXNtLTQsIC5jb2wtc20tNSwgLmNvbC1zbS02LCAuY29sLXNtLTcsIC5jb2wtc20tOCwgLmNvbC1zbS05LCAuY29sLXNtLTEwLCAuY29sLXNtLTExLCAuY29sLXNtLTEyIHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICB9XFxuICAuY29sLXNtLTEyIHtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICB9XFxuICAuY29sLXNtLTExIHtcXG4gICAgd2lkdGg6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tMTAge1xcbiAgICB3aWR0aDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS05IHtcXG4gICAgd2lkdGg6IDc1JTtcXG4gIH1cXG4gIC5jb2wtc20tOCB7XFxuICAgIHdpZHRoOiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLTcge1xcbiAgICB3aWR0aDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS02IHtcXG4gICAgd2lkdGg6IDUwJTtcXG4gIH1cXG4gIC5jb2wtc20tNSB7XFxuICAgIHdpZHRoOiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLTQge1xcbiAgICB3aWR0aDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS0zIHtcXG4gICAgd2lkdGg6IDI1JTtcXG4gIH1cXG4gIC5jb2wtc20tMiB7XFxuICAgIHdpZHRoOiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLTEge1xcbiAgICB3aWR0aDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLXB1bGwtMTIge1xcbiAgICByaWdodDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVsbC0xMSB7XFxuICAgIHJpZ2h0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLXB1bGwtMTAge1xcbiAgICByaWdodDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTkge1xcbiAgICByaWdodDogNzUlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTgge1xcbiAgICByaWdodDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTcge1xcbiAgICByaWdodDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTYge1xcbiAgICByaWdodDogNTAlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTUge1xcbiAgICByaWdodDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTQge1xcbiAgICByaWdodDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTMge1xcbiAgICByaWdodDogMjUlO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTIge1xcbiAgICByaWdodDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdWxsLTEge1xcbiAgICByaWdodDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLXB1bGwtMCB7XFxuICAgIHJpZ2h0OiAwJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC0xMiB7XFxuICAgIGxlZnQ6IDEwMCU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtMTEge1xcbiAgICBsZWZ0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtMTAge1xcbiAgICBsZWZ0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtOSB7XFxuICAgIGxlZnQ6IDc1JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC04IHtcXG4gICAgbGVmdDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTcge1xcbiAgICBsZWZ0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtNiB7XFxuICAgIGxlZnQ6IDUwJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC01IHtcXG4gICAgbGVmdDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTQge1xcbiAgICBsZWZ0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLXB1c2gtMyB7XFxuICAgIGxlZnQ6IDI1JTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC0yIHtcXG4gICAgbGVmdDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1wdXNoLTEge1xcbiAgICBsZWZ0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtc20tcHVzaC0wIHtcXG4gICAgbGVmdDogMCU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC0xMiB7XFxuICAgIG1hcmdpbi1sZWZ0OiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtMTEge1xcbiAgICBtYXJnaW4tbGVmdDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtMTAge1xcbiAgICBtYXJnaW4tbGVmdDogODMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtOSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA3NSU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC04IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTcge1xcbiAgICBtYXJnaW4tbGVmdDogNTguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtNiB7XFxuICAgIG1hcmdpbi1sZWZ0OiA1MCU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC01IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTQge1xcbiAgICBtYXJnaW4tbGVmdDogMzMuMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1zbS1vZmZzZXQtMyB7XFxuICAgIG1hcmdpbi1sZWZ0OiAyNSU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC0yIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtc20tb2Zmc2V0LTEge1xcbiAgICBtYXJnaW4tbGVmdDogOC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLXNtLW9mZnNldC0wIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDAlO1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogOTkycHgpIHtcXG4gIC5jb2wtbWQtMSwgLmNvbC1tZC0yLCAuY29sLW1kLTMsIC5jb2wtbWQtNCwgLmNvbC1tZC01LCAuY29sLW1kLTYsIC5jb2wtbWQtNywgLmNvbC1tZC04LCAuY29sLW1kLTksIC5jb2wtbWQtMTAsIC5jb2wtbWQtMTEsIC5jb2wtbWQtMTIge1xcbiAgICBmbG9hdDogbGVmdDtcXG4gIH1cXG4gIC5jb2wtbWQtMTIge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtbWQtMTEge1xcbiAgICB3aWR0aDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC0xMCB7XFxuICAgIHdpZHRoOiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLTkge1xcbiAgICB3aWR0aDogNzUlO1xcbiAgfVxcbiAgLmNvbC1tZC04IHtcXG4gICAgd2lkdGg6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtNyB7XFxuICAgIHdpZHRoOiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLTYge1xcbiAgICB3aWR0aDogNTAlO1xcbiAgfVxcbiAgLmNvbC1tZC01IHtcXG4gICAgd2lkdGg6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtNCB7XFxuICAgIHdpZHRoOiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLTMge1xcbiAgICB3aWR0aDogMjUlO1xcbiAgfVxcbiAgLmNvbC1tZC0yIHtcXG4gICAgd2lkdGg6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtMSB7XFxuICAgIHdpZHRoOiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVsbC0xMiB7XFxuICAgIHJpZ2h0OiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdWxsLTExIHtcXG4gICAgcmlnaHQ6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVsbC0xMCB7XFxuICAgIHJpZ2h0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtOSB7XFxuICAgIHJpZ2h0OiA3NSU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtOCB7XFxuICAgIHJpZ2h0OiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtNyB7XFxuICAgIHJpZ2h0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtNiB7XFxuICAgIHJpZ2h0OiA1MCU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtNSB7XFxuICAgIHJpZ2h0OiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtNCB7XFxuICAgIHJpZ2h0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtMyB7XFxuICAgIHJpZ2h0OiAyNSU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtMiB7XFxuICAgIHJpZ2h0OiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1bGwtMSB7XFxuICAgIHJpZ2h0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVsbC0wIHtcXG4gICAgcmlnaHQ6IDAlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTEyIHtcXG4gICAgbGVmdDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC0xMSB7XFxuICAgIGxlZnQ6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC0xMCB7XFxuICAgIGxlZnQ6IDgzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC05IHtcXG4gICAgbGVmdDogNzUlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTgge1xcbiAgICBsZWZ0OiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtNyB7XFxuICAgIGxlZnQ6IDU4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC02IHtcXG4gICAgbGVmdDogNTAlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTUge1xcbiAgICBsZWZ0OiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtNCB7XFxuICAgIGxlZnQ6IDMzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtcHVzaC0zIHtcXG4gICAgbGVmdDogMjUlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTIge1xcbiAgICBsZWZ0OiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLXB1c2gtMSB7XFxuICAgIGxlZnQ6IDguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1tZC1wdXNoLTAge1xcbiAgICBsZWZ0OiAwJTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTEyIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDEwMCU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC0xMSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC0xMCB7XFxuICAgIG1hcmdpbi1sZWZ0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC05IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDc1JTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTgge1xcbiAgICBtYXJnaW4tbGVmdDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtNyB7XFxuICAgIG1hcmdpbi1sZWZ0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC02IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDUwJTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTUge1xcbiAgICBtYXJnaW4tbGVmdDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtNCB7XFxuICAgIG1hcmdpbi1sZWZ0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLW1kLW9mZnNldC0zIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDI1JTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTIge1xcbiAgICBtYXJnaW4tbGVmdDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1tZC1vZmZzZXQtMSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbWQtb2Zmc2V0LTAge1xcbiAgICBtYXJnaW4tbGVmdDogMCU7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiAxMjAwcHgpIHtcXG4gIC5jb2wtbGctMSwgLmNvbC1sZy0yLCAuY29sLWxnLTMsIC5jb2wtbGctNCwgLmNvbC1sZy01LCAuY29sLWxnLTYsIC5jb2wtbGctNywgLmNvbC1sZy04LCAuY29sLWxnLTksIC5jb2wtbGctMTAsIC5jb2wtbGctMTEsIC5jb2wtbGctMTIge1xcbiAgICBmbG9hdDogbGVmdDtcXG4gIH1cXG4gIC5jb2wtbGctMTIge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtbGctMTEge1xcbiAgICB3aWR0aDogOTEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy0xMCB7XFxuICAgIHdpZHRoOiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLTkge1xcbiAgICB3aWR0aDogNzUlO1xcbiAgfVxcbiAgLmNvbC1sZy04IHtcXG4gICAgd2lkdGg6IDY2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctNyB7XFxuICAgIHdpZHRoOiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLTYge1xcbiAgICB3aWR0aDogNTAlO1xcbiAgfVxcbiAgLmNvbC1sZy01IHtcXG4gICAgd2lkdGg6IDQxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctNCB7XFxuICAgIHdpZHRoOiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLTMge1xcbiAgICB3aWR0aDogMjUlO1xcbiAgfVxcbiAgLmNvbC1sZy0yIHtcXG4gICAgd2lkdGg6IDE2LjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctMSB7XFxuICAgIHdpZHRoOiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVsbC0xMiB7XFxuICAgIHJpZ2h0OiAxMDAlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdWxsLTExIHtcXG4gICAgcmlnaHQ6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctcHVsbC0xMCB7XFxuICAgIHJpZ2h0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtOSB7XFxuICAgIHJpZ2h0OiA3NSU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtOCB7XFxuICAgIHJpZ2h0OiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtNyB7XFxuICAgIHJpZ2h0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtNiB7XFxuICAgIHJpZ2h0OiA1MCU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtNSB7XFxuICAgIHJpZ2h0OiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtNCB7XFxuICAgIHJpZ2h0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtMyB7XFxuICAgIHJpZ2h0OiAyNSU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtMiB7XFxuICAgIHJpZ2h0OiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1bGwtMSB7XFxuICAgIHJpZ2h0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVsbC0wIHtcXG4gICAgcmlnaHQ6IDAlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTEyIHtcXG4gICAgbGVmdDogMTAwJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC0xMSB7XFxuICAgIGxlZnQ6IDkxLjY2NjY2NjY3JTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC0xMCB7XFxuICAgIGxlZnQ6IDgzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC05IHtcXG4gICAgbGVmdDogNzUlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTgge1xcbiAgICBsZWZ0OiA2Ni42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtNyB7XFxuICAgIGxlZnQ6IDU4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC02IHtcXG4gICAgbGVmdDogNTAlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTUge1xcbiAgICBsZWZ0OiA0MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtNCB7XFxuICAgIGxlZnQ6IDMzLjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctcHVzaC0zIHtcXG4gICAgbGVmdDogMjUlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTIge1xcbiAgICBsZWZ0OiAxNi42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLXB1c2gtMSB7XFxuICAgIGxlZnQ6IDguMzMzMzMzMzMlO1xcbiAgfVxcbiAgLmNvbC1sZy1wdXNoLTAge1xcbiAgICBsZWZ0OiAwJTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTEyIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDEwMCU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC0xMSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA5MS42NjY2NjY2NyU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC0xMCB7XFxuICAgIG1hcmdpbi1sZWZ0OiA4My4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC05IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDc1JTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTgge1xcbiAgICBtYXJnaW4tbGVmdDogNjYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtNyB7XFxuICAgIG1hcmdpbi1sZWZ0OiA1OC4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC02IHtcXG4gICAgbWFyZ2luLWxlZnQ6IDUwJTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTUge1xcbiAgICBtYXJnaW4tbGVmdDogNDEuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtNCB7XFxuICAgIG1hcmdpbi1sZWZ0OiAzMy4zMzMzMzMzMyU7XFxuICB9XFxuICAuY29sLWxnLW9mZnNldC0zIHtcXG4gICAgbWFyZ2luLWxlZnQ6IDI1JTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTIge1xcbiAgICBtYXJnaW4tbGVmdDogMTYuNjY2NjY2NjclO1xcbiAgfVxcbiAgLmNvbC1sZy1vZmZzZXQtMSB7XFxuICAgIG1hcmdpbi1sZWZ0OiA4LjMzMzMzMzMzJTtcXG4gIH1cXG4gIC5jb2wtbGctb2Zmc2V0LTAge1xcbiAgICBtYXJnaW4tbGVmdDogMCU7XFxuICB9XFxufVxcbnRhYmxlIHtcXG4gIG1heC13aWR0aDogMTAwJTtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG50aCB7XFxuICB0ZXh0LWFsaWduOiBsZWZ0O1xcbn1cXG4udGFibGUge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbn1cXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGgsXFxuLnRhYmxlID4gdGJvZHkgPiB0ciA+IHRoLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0aCxcXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGQsXFxuLnRhYmxlID4gdGJvZHkgPiB0ciA+IHRkLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0ZCB7XFxuICBwYWRkaW5nOiA4cHg7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIHZlcnRpY2FsLWFsaWduOiB0b3A7XFxuICBib3JkZXItdG9wOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRoIHtcXG4gIHZlcnRpY2FsLWFsaWduOiBib3R0b207XFxuICBib3JkZXItYm90dG9tOiAycHggc29saWQgI2RkZGRkZDtcXG59XFxuLnRhYmxlID4gY2FwdGlvbiArIHRoZWFkID4gdHI6Zmlyc3QtY2hpbGQgPiB0aCxcXG4udGFibGUgPiBjb2xncm91cCArIHRoZWFkID4gdHI6Zmlyc3QtY2hpbGQgPiB0aCxcXG4udGFibGUgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkID4gdGgsXFxuLnRhYmxlID4gY2FwdGlvbiArIHRoZWFkID4gdHI6Zmlyc3QtY2hpbGQgPiB0ZCxcXG4udGFibGUgPiBjb2xncm91cCArIHRoZWFkID4gdHI6Zmlyc3QtY2hpbGQgPiB0ZCxcXG4udGFibGUgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkID4gdGQge1xcbiAgYm9yZGVyLXRvcDogMDtcXG59XFxuLnRhYmxlID4gdGJvZHkgKyB0Ym9keSB7XFxuICBib3JkZXItdG9wOiAycHggc29saWQgI2RkZGRkZDtcXG59XFxuLnRhYmxlIC50YWJsZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4udGFibGUtY29uZGVuc2VkID4gdGhlYWQgPiB0ciA+IHRoLFxcbi50YWJsZS1jb25kZW5zZWQgPiB0Ym9keSA+IHRyID4gdGgsXFxuLnRhYmxlLWNvbmRlbnNlZCA+IHRmb290ID4gdHIgPiB0aCxcXG4udGFibGUtY29uZGVuc2VkID4gdGhlYWQgPiB0ciA+IHRkLFxcbi50YWJsZS1jb25kZW5zZWQgPiB0Ym9keSA+IHRyID4gdGQsXFxuLnRhYmxlLWNvbmRlbnNlZCA+IHRmb290ID4gdHIgPiB0ZCB7XFxuICBwYWRkaW5nOiA1cHg7XFxufVxcbi50YWJsZS1ib3JkZXJlZCB7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG4udGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGgsXFxuLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRoLFxcbi50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0aCxcXG4udGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGQsXFxuLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRkLFxcbi50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0ZCB7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG4udGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGgsXFxuLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkIHtcXG4gIGJvcmRlci1ib3R0b20td2lkdGg6IDJweDtcXG59XFxuLnRhYmxlLXN0cmlwZWQgPiB0Ym9keSA+IHRyOm50aC1jaGlsZChvZGQpID4gdGQsXFxuLnRhYmxlLXN0cmlwZWQgPiB0Ym9keSA+IHRyOm50aC1jaGlsZChvZGQpID4gdGgge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y5ZjlmOTtcXG59XFxuLnRhYmxlLWhvdmVyID4gdGJvZHkgPiB0cjpob3ZlciA+IHRkLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHI6aG92ZXIgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbn1cXG50YWJsZSBjb2xbY2xhc3MqPVxcXCJjb2wtXFxcIl0ge1xcbiAgcG9zaXRpb246IHN0YXRpYztcXG4gIGZsb2F0OiBub25lO1xcbiAgZGlzcGxheTogdGFibGUtY29sdW1uO1xcbn1cXG50YWJsZSB0ZFtjbGFzcyo9XFxcImNvbC1cXFwiXSxcXG50YWJsZSB0aFtjbGFzcyo9XFxcImNvbC1cXFwiXSB7XFxuICBwb3NpdGlvbjogc3RhdGljO1xcbiAgZmxvYXQ6IG5vbmU7XFxuICBkaXNwbGF5OiB0YWJsZS1jZWxsO1xcbn1cXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGQuYWN0aXZlLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0ZC5hY3RpdmUsXFxuLnRhYmxlID4gdGZvb3QgPiB0ciA+IHRkLmFjdGl2ZSxcXG4udGFibGUgPiB0aGVhZCA+IHRyID4gdGguYWN0aXZlLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0aC5hY3RpdmUsXFxuLnRhYmxlID4gdGZvb3QgPiB0ciA+IHRoLmFjdGl2ZSxcXG4udGFibGUgPiB0aGVhZCA+IHRyLmFjdGl2ZSA+IHRkLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuYWN0aXZlID4gdGQsXFxuLnRhYmxlID4gdGZvb3QgPiB0ci5hY3RpdmUgPiB0ZCxcXG4udGFibGUgPiB0aGVhZCA+IHRyLmFjdGl2ZSA+IHRoLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuYWN0aXZlID4gdGgsXFxuLnRhYmxlID4gdGZvb3QgPiB0ci5hY3RpdmUgPiB0aCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbn1cXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyID4gdGQuYWN0aXZlOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0aC5hY3RpdmU6aG92ZXIsXFxuLnRhYmxlLWhvdmVyID4gdGJvZHkgPiB0ci5hY3RpdmU6aG92ZXIgPiB0ZCxcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLmFjdGl2ZTpob3ZlciA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlOGU4ZTg7XFxufVxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0ZC5zdWNjZXNzLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0ZC5zdWNjZXNzLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0ZC5zdWNjZXNzLFxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0aC5zdWNjZXNzLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0aC5zdWNjZXNzLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0aC5zdWNjZXNzLFxcbi50YWJsZSA+IHRoZWFkID4gdHIuc3VjY2VzcyA+IHRkLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuc3VjY2VzcyA+IHRkLFxcbi50YWJsZSA+IHRmb290ID4gdHIuc3VjY2VzcyA+IHRkLFxcbi50YWJsZSA+IHRoZWFkID4gdHIuc3VjY2VzcyA+IHRoLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuc3VjY2VzcyA+IHRoLFxcbi50YWJsZSA+IHRmb290ID4gdHIuc3VjY2VzcyA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZmYwZDg7XFxufVxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0ZC5zdWNjZXNzOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0aC5zdWNjZXNzOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIuc3VjY2Vzczpob3ZlciA+IHRkLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIuc3VjY2Vzczpob3ZlciA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkMGU5YzY7XFxufVxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0ZC5pbmZvLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0ZC5pbmZvLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0ZC5pbmZvLFxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0aC5pbmZvLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0aC5pbmZvLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0aC5pbmZvLFxcbi50YWJsZSA+IHRoZWFkID4gdHIuaW5mbyA+IHRkLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuaW5mbyA+IHRkLFxcbi50YWJsZSA+IHRmb290ID4gdHIuaW5mbyA+IHRkLFxcbi50YWJsZSA+IHRoZWFkID4gdHIuaW5mbyA+IHRoLFxcbi50YWJsZSA+IHRib2R5ID4gdHIuaW5mbyA+IHRoLFxcbi50YWJsZSA+IHRmb290ID4gdHIuaW5mbyA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOWVkZjc7XFxufVxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0ZC5pbmZvOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0aC5pbmZvOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIuaW5mbzpob3ZlciA+IHRkLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIuaW5mbzpob3ZlciA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNjNGUzZjM7XFxufVxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0ZC53YXJuaW5nLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0ZC53YXJuaW5nLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0ZC53YXJuaW5nLFxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0aC53YXJuaW5nLFxcbi50YWJsZSA+IHRib2R5ID4gdHIgPiB0aC53YXJuaW5nLFxcbi50YWJsZSA+IHRmb290ID4gdHIgPiB0aC53YXJuaW5nLFxcbi50YWJsZSA+IHRoZWFkID4gdHIud2FybmluZyA+IHRkLFxcbi50YWJsZSA+IHRib2R5ID4gdHIud2FybmluZyA+IHRkLFxcbi50YWJsZSA+IHRmb290ID4gdHIud2FybmluZyA+IHRkLFxcbi50YWJsZSA+IHRoZWFkID4gdHIud2FybmluZyA+IHRoLFxcbi50YWJsZSA+IHRib2R5ID4gdHIud2FybmluZyA+IHRoLFxcbi50YWJsZSA+IHRmb290ID4gdHIud2FybmluZyA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmY2Y4ZTM7XFxufVxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0ZC53YXJuaW5nOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0aC53YXJuaW5nOmhvdmVyLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIud2FybmluZzpob3ZlciA+IHRkLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIud2FybmluZzpob3ZlciA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmYWYyY2M7XFxufVxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0ZC5kYW5nZXIsXFxuLnRhYmxlID4gdGJvZHkgPiB0ciA+IHRkLmRhbmdlcixcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGQuZGFuZ2VyLFxcbi50YWJsZSA+IHRoZWFkID4gdHIgPiB0aC5kYW5nZXIsXFxuLnRhYmxlID4gdGJvZHkgPiB0ciA+IHRoLmRhbmdlcixcXG4udGFibGUgPiB0Zm9vdCA+IHRyID4gdGguZGFuZ2VyLFxcbi50YWJsZSA+IHRoZWFkID4gdHIuZGFuZ2VyID4gdGQsXFxuLnRhYmxlID4gdGJvZHkgPiB0ci5kYW5nZXIgPiB0ZCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLmRhbmdlciA+IHRkLFxcbi50YWJsZSA+IHRoZWFkID4gdHIuZGFuZ2VyID4gdGgsXFxuLnRhYmxlID4gdGJvZHkgPiB0ci5kYW5nZXIgPiB0aCxcXG4udGFibGUgPiB0Zm9vdCA+IHRyLmRhbmdlciA+IHRoIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmMmRlZGU7XFxufVxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIgPiB0ZC5kYW5nZXI6aG92ZXIsXFxuLnRhYmxlLWhvdmVyID4gdGJvZHkgPiB0ciA+IHRoLmRhbmdlcjpob3ZlcixcXG4udGFibGUtaG92ZXIgPiB0Ym9keSA+IHRyLmRhbmdlcjpob3ZlciA+IHRkLFxcbi50YWJsZS1ob3ZlciA+IHRib2R5ID4gdHIuZGFuZ2VyOmhvdmVyID4gdGgge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ViY2NjYztcXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XFxuICAudGFibGUtcmVzcG9uc2l2ZSB7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgICBtYXJnaW4tYm90dG9tOiAxNXB4O1xcbiAgICBvdmVyZmxvdy15OiBoaWRkZW47XFxuICAgIG92ZXJmbG93LXg6IHNjcm9sbDtcXG4gICAgLW1zLW92ZXJmbG93LXN0eWxlOiAtbXMtYXV0b2hpZGluZy1zY3JvbGxiYXI7XFxuICAgIGJvcmRlcjogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICAgIC13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOiB0b3VjaDtcXG4gIH1cXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlIHtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIH1cXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRoLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUgPiB0Ym9keSA+IHRyID4gdGgsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZSA+IHRmb290ID4gdHIgPiB0aCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlID4gdGhlYWQgPiB0ciA+IHRkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUgPiB0Ym9keSA+IHRyID4gdGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZSA+IHRmb290ID4gdHIgPiB0ZCB7XFxuICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxuICB9XFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCB7XFxuICAgIGJvcmRlcjogMDtcXG4gIH1cXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoOmZpcnN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGg6Zmlyc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0aDpmaXJzdC1jaGlsZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkOmZpcnN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGQ6Zmlyc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0ZDpmaXJzdC1jaGlsZCB7XFxuICAgIGJvcmRlci1sZWZ0OiAwO1xcbiAgfVxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGg6bGFzdC1jaGlsZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRoOmxhc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0aDpsYXN0LWNoaWxkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyID4gdGQ6bGFzdC1jaGlsZCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRkOmxhc3QtY2hpbGQsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0ZDpsYXN0LWNoaWxkIHtcXG4gICAgYm9yZGVyLXJpZ2h0OiAwO1xcbiAgfVxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmxhc3QtY2hpbGQgPiB0aCxcXG4gIC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0cjpsYXN0LWNoaWxkID4gdGgsXFxuICAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6bGFzdC1jaGlsZCA+IHRkLFxcbiAgLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyOmxhc3QtY2hpbGQgPiB0ZCB7XFxuICAgIGJvcmRlci1ib3R0b206IDA7XFxuICB9XFxufVxcbmZpZWxkc2V0IHtcXG4gIHBhZGRpbmc6IDA7XFxuICBtYXJnaW46IDA7XFxuICBib3JkZXI6IDA7XFxuICBtaW4td2lkdGg6IDA7XFxufVxcbmxlZ2VuZCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHdpZHRoOiAxMDAlO1xcbiAgcGFkZGluZzogMDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBmb250LXNpemU6IDIxcHg7XFxuICBsaW5lLWhlaWdodDogaW5oZXJpdDtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgYm9yZGVyOiAwO1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlNWU1ZTU7XFxufVxcbmxhYmVsIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIG1hcmdpbi1ib3R0b206IDVweDtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJzZWFyY2hcXFwiXSB7XFxuICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICAtbW96LWJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdLFxcbmlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl0ge1xcbiAgbWFyZ2luOiA0cHggMCAwO1xcbiAgbWFyZ2luLXRvcDogMXB4IFxcXFw5O1xcbiAgLyogSUU4LTkgKi9cXG4gIGxpbmUtaGVpZ2h0OiBub3JtYWw7XFxufVxcbmlucHV0W3R5cGU9XFxcImZpbGVcXFwiXSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuaW5wdXRbdHlwZT1cXFwicmFuZ2VcXFwiXSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG5zZWxlY3RbbXVsdGlwbGVdLFxcbnNlbGVjdFtzaXplXSB7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbmlucHV0W3R5cGU9XFxcImZpbGVcXFwiXTpmb2N1cyxcXG5pbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdOmZvY3VzLFxcbmlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl06Zm9jdXMge1xcbiAgb3V0bGluZTogdGhpbiBkb3R0ZWQ7XFxuICBvdXRsaW5lOiA1cHggYXV0byAtd2Via2l0LWZvY3VzLXJpbmctY29sb3I7XFxuICBvdXRsaW5lLW9mZnNldDogLTJweDtcXG59XFxub3V0cHV0IHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZy10b3A6IDdweDtcXG4gIGZvbnQtc2l6ZTogMTRweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgY29sb3I6ICM1NTU1NTU7XFxufVxcbi5mb3JtLWNvbnRyb2wge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMTAwJTtcXG4gIGhlaWdodDogMzRweDtcXG4gIHBhZGRpbmc6IDZweCAxMnB4O1xcbiAgZm9udC1zaXplOiAxNHB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNDI4NTcxNDM7XFxuICBjb2xvcjogIzU1NTU1NTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2NjY2NjYztcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpO1xcbiAgLXdlYmtpdC10cmFuc2l0aW9uOiBib3JkZXItY29sb3IgZWFzZS1pbi1vdXQgLjE1cywgYm94LXNoYWRvdyBlYXNlLWluLW91dCAuMTVzO1xcbiAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIGVhc2UtaW4tb3V0IC4xNXMsIGJveC1zaGFkb3cgZWFzZS1pbi1vdXQgLjE1cztcXG59XFxuLmZvcm0tY29udHJvbDpmb2N1cyB7XFxuICBib3JkZXItY29sb3I6ICM2NmFmZTk7XFxuICBvdXRsaW5lOiAwO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLDAsMCwuMDc1KSwgMCAwIDhweCByZ2JhKDEwMiwgMTc1LCAyMzMsIDAuNik7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLDAsMCwuMDc1KSwgMCAwIDhweCByZ2JhKDEwMiwgMTc1LCAyMzMsIDAuNik7XFxufVxcbi5mb3JtLWNvbnRyb2w6Oi1tb3otcGxhY2Vob2xkZXIge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxuICBvcGFjaXR5OiAxO1xcbn1cXG4uZm9ybS1jb250cm9sOi1tcy1pbnB1dC1wbGFjZWhvbGRlciB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLmZvcm0tY29udHJvbDo6LXdlYmtpdC1pbnB1dC1wbGFjZWhvbGRlciB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLmZvcm0tY29udHJvbFtkaXNhYmxlZF0sXFxuLmZvcm0tY29udHJvbFtyZWFkb25seV0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5mb3JtLWNvbnRyb2wge1xcbiAgY3Vyc29yOiBub3QtYWxsb3dlZDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZWVlZWU7XFxuICBvcGFjaXR5OiAxO1xcbn1cXG50ZXh0YXJlYS5mb3JtLWNvbnRyb2wge1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJzZWFyY2hcXFwiXSB7XFxuICAtd2Via2l0LWFwcGVhcmFuY2U6IG5vbmU7XFxufVxcbmlucHV0W3R5cGU9XFxcImRhdGVcXFwiXSB7XFxuICBsaW5lLWhlaWdodDogMzRweDtcXG59XFxuLmZvcm0tZ3JvdXAge1xcbiAgbWFyZ2luLWJvdHRvbTogMTVweDtcXG59XFxuLnJhZGlvLFxcbi5jaGVja2JveCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIG1pbi1oZWlnaHQ6IDIwcHg7XFxuICBtYXJnaW4tdG9wOiAxMHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMTBweDtcXG4gIHBhZGRpbmctbGVmdDogMjBweDtcXG59XFxuLnJhZGlvIGxhYmVsLFxcbi5jaGVja2JveCBsYWJlbCB7XFxuICBkaXNwbGF5OiBpbmxpbmU7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG4ucmFkaW8gaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXSxcXG4ucmFkaW8taW5saW5lIGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl0sXFxuLmNoZWNrYm94IGlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl0sXFxuLmNoZWNrYm94LWlubGluZSBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbiAgbWFyZ2luLWxlZnQ6IC0yMHB4O1xcbn1cXG4ucmFkaW8gKyAucmFkaW8sXFxuLmNoZWNrYm94ICsgLmNoZWNrYm94IHtcXG4gIG1hcmdpbi10b3A6IC01cHg7XFxufVxcbi5yYWRpby1pbmxpbmUsXFxuLmNoZWNrYm94LWlubGluZSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBwYWRkaW5nLWxlZnQ6IDIwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIGZvbnQtd2VpZ2h0OiBub3JtYWw7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxufVxcbi5yYWRpby1pbmxpbmUgKyAucmFkaW8taW5saW5lLFxcbi5jaGVja2JveC1pbmxpbmUgKyAuY2hlY2tib3gtaW5saW5lIHtcXG4gIG1hcmdpbi10b3A6IDA7XFxuICBtYXJnaW4tbGVmdDogMTBweDtcXG59XFxuaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXVtkaXNhYmxlZF0sXFxuaW5wdXRbdHlwZT1cXFwiY2hlY2tib3hcXFwiXVtkaXNhYmxlZF0sXFxuLnJhZGlvW2Rpc2FibGVkXSxcXG4ucmFkaW8taW5saW5lW2Rpc2FibGVkXSxcXG4uY2hlY2tib3hbZGlzYWJsZWRdLFxcbi5jaGVja2JveC1pbmxpbmVbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSBpbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAucmFkaW8sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5yYWRpby1pbmxpbmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5jaGVja2JveCxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmNoZWNrYm94LWlubGluZSB7XFxuICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xcbn1cXG4uaW5wdXQtc20ge1xcbiAgaGVpZ2h0OiAzMHB4O1xcbiAgcGFkZGluZzogNXB4IDEwcHg7XFxuICBmb250LXNpemU6IDEycHg7XFxuICBsaW5lLWhlaWdodDogMS41O1xcbiAgYm9yZGVyLXJhZGl1czogM3B4O1xcbn1cXG5zZWxlY3QuaW5wdXQtc20ge1xcbiAgaGVpZ2h0OiAzMHB4O1xcbiAgbGluZS1oZWlnaHQ6IDMwcHg7XFxufVxcbnRleHRhcmVhLmlucHV0LXNtLFxcbnNlbGVjdFttdWx0aXBsZV0uaW5wdXQtc20ge1xcbiAgaGVpZ2h0OiBhdXRvO1xcbn1cXG4uaW5wdXQtbGcge1xcbiAgaGVpZ2h0OiA0NnB4O1xcbiAgcGFkZGluZzogMTBweCAxNnB4O1xcbiAgZm9udC1zaXplOiAxOHB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuMzM7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxufVxcbnNlbGVjdC5pbnB1dC1sZyB7XFxuICBoZWlnaHQ6IDQ2cHg7XFxuICBsaW5lLWhlaWdodDogNDZweDtcXG59XFxudGV4dGFyZWEuaW5wdXQtbGcsXFxuc2VsZWN0W211bHRpcGxlXS5pbnB1dC1sZyB7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbi5oYXMtZmVlZGJhY2sge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG4uaGFzLWZlZWRiYWNrIC5mb3JtLWNvbnRyb2wge1xcbiAgcGFkZGluZy1yaWdodDogNDIuNXB4O1xcbn1cXG4uaGFzLWZlZWRiYWNrIC5mb3JtLWNvbnRyb2wtZmVlZGJhY2sge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAyNXB4O1xcbiAgcmlnaHQ6IDA7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHdpZHRoOiAzNHB4O1xcbiAgaGVpZ2h0OiAzNHB4O1xcbiAgbGluZS1oZWlnaHQ6IDM0cHg7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxufVxcbi5oYXMtc3VjY2VzcyAuaGVscC1ibG9jayxcXG4uaGFzLXN1Y2Nlc3MgLmNvbnRyb2wtbGFiZWwsXFxuLmhhcy1zdWNjZXNzIC5yYWRpbyxcXG4uaGFzLXN1Y2Nlc3MgLmNoZWNrYm94LFxcbi5oYXMtc3VjY2VzcyAucmFkaW8taW5saW5lLFxcbi5oYXMtc3VjY2VzcyAuY2hlY2tib3gtaW5saW5lIHtcXG4gIGNvbG9yOiAjM2M3NjNkO1xcbn1cXG4uaGFzLXN1Y2Nlc3MgLmZvcm0tY29udHJvbCB7XFxuICBib3JkZXItY29sb3I6ICMzYzc2M2Q7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KTtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KTtcXG59XFxuLmhhcy1zdWNjZXNzIC5mb3JtLWNvbnRyb2w6Zm9jdXMge1xcbiAgYm9yZGVyLWNvbG9yOiAjMmI1NDJjO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSksIDAgMCA2cHggIzY3YjE2ODtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KSwgMCAwIDZweCAjNjdiMTY4O1xcbn1cXG4uaGFzLXN1Y2Nlc3MgLmlucHV0LWdyb3VwLWFkZG9uIHtcXG4gIGNvbG9yOiAjM2M3NjNkO1xcbiAgYm9yZGVyLWNvbG9yOiAjM2M3NjNkO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2RmZjBkODtcXG59XFxuLmhhcy1zdWNjZXNzIC5mb3JtLWNvbnRyb2wtZmVlZGJhY2sge1xcbiAgY29sb3I6ICMzYzc2M2Q7XFxufVxcbi5oYXMtd2FybmluZyAuaGVscC1ibG9jayxcXG4uaGFzLXdhcm5pbmcgLmNvbnRyb2wtbGFiZWwsXFxuLmhhcy13YXJuaW5nIC5yYWRpbyxcXG4uaGFzLXdhcm5pbmcgLmNoZWNrYm94LFxcbi5oYXMtd2FybmluZyAucmFkaW8taW5saW5lLFxcbi5oYXMtd2FybmluZyAuY2hlY2tib3gtaW5saW5lIHtcXG4gIGNvbG9yOiAjOGE2ZDNiO1xcbn1cXG4uaGFzLXdhcm5pbmcgLmZvcm0tY29udHJvbCB7XFxuICBib3JkZXItY29sb3I6ICM4YTZkM2I7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KTtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KTtcXG59XFxuLmhhcy13YXJuaW5nIC5mb3JtLWNvbnRyb2w6Zm9jdXMge1xcbiAgYm9yZGVyLWNvbG9yOiAjNjY1MTJjO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSksIDAgMCA2cHggI2MwYTE2YjtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KSwgMCAwIDZweCAjYzBhMTZiO1xcbn1cXG4uaGFzLXdhcm5pbmcgLmlucHV0LWdyb3VwLWFkZG9uIHtcXG4gIGNvbG9yOiAjOGE2ZDNiO1xcbiAgYm9yZGVyLWNvbG9yOiAjOGE2ZDNiO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZjZjhlMztcXG59XFxuLmhhcy13YXJuaW5nIC5mb3JtLWNvbnRyb2wtZmVlZGJhY2sge1xcbiAgY29sb3I6ICM4YTZkM2I7XFxufVxcbi5oYXMtZXJyb3IgLmhlbHAtYmxvY2ssXFxuLmhhcy1lcnJvciAuY29udHJvbC1sYWJlbCxcXG4uaGFzLWVycm9yIC5yYWRpbyxcXG4uaGFzLWVycm9yIC5jaGVja2JveCxcXG4uaGFzLWVycm9yIC5yYWRpby1pbmxpbmUsXFxuLmhhcy1lcnJvciAuY2hlY2tib3gtaW5saW5lIHtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbn1cXG4uaGFzLWVycm9yIC5mb3JtLWNvbnRyb2wge1xcbiAgYm9yZGVyLWNvbG9yOiAjYTk0NDQyO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA3NSk7XFxufVxcbi5oYXMtZXJyb3IgLmZvcm0tY29udHJvbDpmb2N1cyB7XFxuICBib3JkZXItY29sb3I6ICM4NDM1MzQ7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDc1KSwgMCAwIDZweCAjY2U4NDgzO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNzUpLCAwIDAgNnB4ICNjZTg0ODM7XFxufVxcbi5oYXMtZXJyb3IgLmlucHV0LWdyb3VwLWFkZG9uIHtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbiAgYm9yZGVyLWNvbG9yOiAjYTk0NDQyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YyZGVkZTtcXG59XFxuLmhhcy1lcnJvciAuZm9ybS1jb250cm9sLWZlZWRiYWNrIHtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbn1cXG4uZm9ybS1jb250cm9sLXN0YXRpYyB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbn1cXG4uaGVscC1ibG9jayB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIG1hcmdpbi10b3A6IDVweDtcXG4gIG1hcmdpbi1ib3R0b206IDEwcHg7XFxuICBjb2xvcjogIzczNzM3MztcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuZm9ybS1pbmxpbmUgLmZvcm0tZ3JvdXAge1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICB9XFxuICAuZm9ybS1pbmxpbmUgLmZvcm0tY29udHJvbCB7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgd2lkdGg6IGF1dG87XFxuICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICB9XFxuICAuZm9ybS1pbmxpbmUgLmlucHV0LWdyb3VwID4gLmZvcm0tY29udHJvbCB7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgfVxcbiAgLmZvcm0taW5saW5lIC5jb250cm9sLWxhYmVsIHtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gICAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIH1cXG4gIC5mb3JtLWlubGluZSAucmFkaW8sXFxuICAuZm9ybS1pbmxpbmUgLmNoZWNrYm94IHtcXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgICBtYXJnaW4tdG9wOiAwO1xcbiAgICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgICBwYWRkaW5nLWxlZnQ6IDA7XFxuICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICB9XFxuICAuZm9ybS1pbmxpbmUgLnJhZGlvIGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl0sXFxuICAuZm9ybS1pbmxpbmUgLmNoZWNrYm94IGlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl0ge1xcbiAgICBmbG9hdDogbm9uZTtcXG4gICAgbWFyZ2luLWxlZnQ6IDA7XFxuICB9XFxuICAuZm9ybS1pbmxpbmUgLmhhcy1mZWVkYmFjayAuZm9ybS1jb250cm9sLWZlZWRiYWNrIHtcXG4gICAgdG9wOiAwO1xcbiAgfVxcbn1cXG4uZm9ybS1ob3Jpem9udGFsIC5jb250cm9sLWxhYmVsLFxcbi5mb3JtLWhvcml6b250YWwgLnJhZGlvLFxcbi5mb3JtLWhvcml6b250YWwgLmNoZWNrYm94LFxcbi5mb3JtLWhvcml6b250YWwgLnJhZGlvLWlubGluZSxcXG4uZm9ybS1ob3Jpem9udGFsIC5jaGVja2JveC1pbmxpbmUge1xcbiAgbWFyZ2luLXRvcDogMDtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBwYWRkaW5nLXRvcDogN3B4O1xcbn1cXG4uZm9ybS1ob3Jpem9udGFsIC5yYWRpbyxcXG4uZm9ybS1ob3Jpem9udGFsIC5jaGVja2JveCB7XFxuICBtaW4taGVpZ2h0OiAyN3B4O1xcbn1cXG4uZm9ybS1ob3Jpem9udGFsIC5mb3JtLWdyb3VwIHtcXG4gIG1hcmdpbi1sZWZ0OiAtMTVweDtcXG4gIG1hcmdpbi1yaWdodDogLTE1cHg7XFxufVxcbi5mb3JtLWhvcml6b250YWwgLmZvcm0tY29udHJvbC1zdGF0aWMge1xcbiAgcGFkZGluZy10b3A6IDdweDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuZm9ybS1ob3Jpem9udGFsIC5jb250cm9sLWxhYmVsIHtcXG4gICAgdGV4dC1hbGlnbjogcmlnaHQ7XFxuICB9XFxufVxcbi5mb3JtLWhvcml6b250YWwgLmhhcy1mZWVkYmFjayAuZm9ybS1jb250cm9sLWZlZWRiYWNrIHtcXG4gIHRvcDogMDtcXG4gIHJpZ2h0OiAxNXB4O1xcbn1cXG4uYnRuIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxuICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxuICBwYWRkaW5nOiA2cHggMTJweDtcXG4gIGZvbnQtc2l6ZTogMTRweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTtcXG4gIC1tb3otdXNlci1zZWxlY3Q6IG5vbmU7XFxuICAtbXMtdXNlci1zZWxlY3Q6IG5vbmU7XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG59XFxuLmJ0bjpmb2N1cyxcXG4uYnRuOmFjdGl2ZTpmb2N1cyxcXG4uYnRuLmFjdGl2ZTpmb2N1cyB7XFxuICBvdXRsaW5lOiB0aGluIGRvdHRlZDtcXG4gIG91dGxpbmU6IDVweCBhdXRvIC13ZWJraXQtZm9jdXMtcmluZy1jb2xvcjtcXG4gIG91dGxpbmUtb2Zmc2V0OiAtMnB4O1xcbn1cXG4uYnRuOmhvdmVyLFxcbi5idG46Zm9jdXMge1xcbiAgY29sb3I6ICMzMzMzMzM7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxufVxcbi5idG46YWN0aXZlLFxcbi5idG4uYWN0aXZlIHtcXG4gIG91dGxpbmU6IDA7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDNweCA1cHggcmdiYSgwLCAwLCAwLCAwLjEyNSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDNweCA1cHggcmdiYSgwLCAwLCAwLCAwLjEyNSk7XFxufVxcbi5idG4uZGlzYWJsZWQsXFxuLmJ0bltkaXNhYmxlZF0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4ge1xcbiAgY3Vyc29yOiBub3QtYWxsb3dlZDtcXG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbiAgb3BhY2l0eTogMC42NTtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT02NSk7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IG5vbmU7XFxuICBib3gtc2hhZG93OiBub25lO1xcbn1cXG4uYnRuLWRlZmF1bHQge1xcbiAgY29sb3I6ICMzMzMzMzM7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYm9yZGVyLWNvbG9yOiAjY2NjY2NjO1xcbn1cXG4uYnRuLWRlZmF1bHQ6aG92ZXIsXFxuLmJ0bi1kZWZhdWx0OmZvY3VzLFxcbi5idG4tZGVmYXVsdDphY3RpdmUsXFxuLmJ0bi1kZWZhdWx0LmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1kZWZhdWx0IHtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ViZWJlYjtcXG4gIGJvcmRlci1jb2xvcjogI2FkYWRhZDtcXG59XFxuLmJ0bi1kZWZhdWx0OmFjdGl2ZSxcXG4uYnRuLWRlZmF1bHQuYWN0aXZlLFxcbi5vcGVuIC5kcm9wZG93bi10b2dnbGUuYnRuLWRlZmF1bHQge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG59XFxuLmJ0bi1kZWZhdWx0LmRpc2FibGVkLFxcbi5idG4tZGVmYXVsdFtkaXNhYmxlZF0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGVmYXVsdCxcXG4uYnRuLWRlZmF1bHQuZGlzYWJsZWQ6aG92ZXIsXFxuLmJ0bi1kZWZhdWx0W2Rpc2FibGVkXTpob3ZlcixcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kZWZhdWx0OmhvdmVyLFxcbi5idG4tZGVmYXVsdC5kaXNhYmxlZDpmb2N1cyxcXG4uYnRuLWRlZmF1bHRbZGlzYWJsZWRdOmZvY3VzLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWRlZmF1bHQ6Zm9jdXMsXFxuLmJ0bi1kZWZhdWx0LmRpc2FibGVkOmFjdGl2ZSxcXG4uYnRuLWRlZmF1bHRbZGlzYWJsZWRdOmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kZWZhdWx0OmFjdGl2ZSxcXG4uYnRuLWRlZmF1bHQuZGlzYWJsZWQuYWN0aXZlLFxcbi5idG4tZGVmYXVsdFtkaXNhYmxlZF0uYWN0aXZlLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWRlZmF1bHQuYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXItY29sb3I6ICNjY2NjY2M7XFxufVxcbi5idG4tZGVmYXVsdCAuYmFkZ2Uge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzMzMzMzO1xcbn1cXG4uYnRuLXByaW1hcnkge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbiAgYm9yZGVyLWNvbG9yOiAjMzU3ZWJkO1xcbn1cXG4uYnRuLXByaW1hcnk6aG92ZXIsXFxuLmJ0bi1wcmltYXJ5OmZvY3VzLFxcbi5idG4tcHJpbWFyeTphY3RpdmUsXFxuLmJ0bi1wcmltYXJ5LmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1wcmltYXJ5IHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMyNzZiMTtcXG4gIGJvcmRlci1jb2xvcjogIzI4NWU4ZTtcXG59XFxuLmJ0bi1wcmltYXJ5OmFjdGl2ZSxcXG4uYnRuLXByaW1hcnkuYWN0aXZlLFxcbi5vcGVuIC5kcm9wZG93bi10b2dnbGUuYnRuLXByaW1hcnkge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG59XFxuLmJ0bi1wcmltYXJ5LmRpc2FibGVkLFxcbi5idG4tcHJpbWFyeVtkaXNhYmxlZF0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tcHJpbWFyeSxcXG4uYnRuLXByaW1hcnkuZGlzYWJsZWQ6aG92ZXIsXFxuLmJ0bi1wcmltYXJ5W2Rpc2FibGVkXTpob3ZlcixcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1wcmltYXJ5OmhvdmVyLFxcbi5idG4tcHJpbWFyeS5kaXNhYmxlZDpmb2N1cyxcXG4uYnRuLXByaW1hcnlbZGlzYWJsZWRdOmZvY3VzLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXByaW1hcnk6Zm9jdXMsXFxuLmJ0bi1wcmltYXJ5LmRpc2FibGVkOmFjdGl2ZSxcXG4uYnRuLXByaW1hcnlbZGlzYWJsZWRdOmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1wcmltYXJ5OmFjdGl2ZSxcXG4uYnRuLXByaW1hcnkuZGlzYWJsZWQuYWN0aXZlLFxcbi5idG4tcHJpbWFyeVtkaXNhYmxlZF0uYWN0aXZlLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXByaW1hcnkuYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM0MjhiY2E7XFxuICBib3JkZXItY29sb3I6ICMzNTdlYmQ7XFxufVxcbi5idG4tcHJpbWFyeSAuYmFkZ2Uge1xcbiAgY29sb3I6ICM0MjhiY2E7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uYnRuLXN1Y2Nlc3Mge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWNiODVjO1xcbiAgYm9yZGVyLWNvbG9yOiAjNGNhZTRjO1xcbn1cXG4uYnRuLXN1Y2Nlc3M6aG92ZXIsXFxuLmJ0bi1zdWNjZXNzOmZvY3VzLFxcbi5idG4tc3VjY2VzczphY3RpdmUsXFxuLmJ0bi1zdWNjZXNzLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1zdWNjZXNzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQ3YTQ0NztcXG4gIGJvcmRlci1jb2xvcjogIzM5ODQzOTtcXG59XFxuLmJ0bi1zdWNjZXNzOmFjdGl2ZSxcXG4uYnRuLXN1Y2Nlc3MuYWN0aXZlLFxcbi5vcGVuIC5kcm9wZG93bi10b2dnbGUuYnRuLXN1Y2Nlc3Mge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG59XFxuLmJ0bi1zdWNjZXNzLmRpc2FibGVkLFxcbi5idG4tc3VjY2Vzc1tkaXNhYmxlZF0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tc3VjY2VzcyxcXG4uYnRuLXN1Y2Nlc3MuZGlzYWJsZWQ6aG92ZXIsXFxuLmJ0bi1zdWNjZXNzW2Rpc2FibGVkXTpob3ZlcixcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1zdWNjZXNzOmhvdmVyLFxcbi5idG4tc3VjY2Vzcy5kaXNhYmxlZDpmb2N1cyxcXG4uYnRuLXN1Y2Nlc3NbZGlzYWJsZWRdOmZvY3VzLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXN1Y2Nlc3M6Zm9jdXMsXFxuLmJ0bi1zdWNjZXNzLmRpc2FibGVkOmFjdGl2ZSxcXG4uYnRuLXN1Y2Nlc3NbZGlzYWJsZWRdOmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1zdWNjZXNzOmFjdGl2ZSxcXG4uYnRuLXN1Y2Nlc3MuZGlzYWJsZWQuYWN0aXZlLFxcbi5idG4tc3VjY2Vzc1tkaXNhYmxlZF0uYWN0aXZlLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXN1Y2Nlc3MuYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM1Y2I4NWM7XFxuICBib3JkZXItY29sb3I6ICM0Y2FlNGM7XFxufVxcbi5idG4tc3VjY2VzcyAuYmFkZ2Uge1xcbiAgY29sb3I6ICM1Y2I4NWM7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uYnRuLWluZm8ge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWJjMGRlO1xcbiAgYm9yZGVyLWNvbG9yOiAjNDZiOGRhO1xcbn1cXG4uYnRuLWluZm86aG92ZXIsXFxuLmJ0bi1pbmZvOmZvY3VzLFxcbi5idG4taW5mbzphY3RpdmUsXFxuLmJ0bi1pbmZvLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1pbmZvIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzM5YjNkNztcXG4gIGJvcmRlci1jb2xvcjogIzI2OWFiYztcXG59XFxuLmJ0bi1pbmZvOmFjdGl2ZSxcXG4uYnRuLWluZm8uYWN0aXZlLFxcbi5vcGVuIC5kcm9wZG93bi10b2dnbGUuYnRuLWluZm8ge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG59XFxuLmJ0bi1pbmZvLmRpc2FibGVkLFxcbi5idG4taW5mb1tkaXNhYmxlZF0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4taW5mbyxcXG4uYnRuLWluZm8uZGlzYWJsZWQ6aG92ZXIsXFxuLmJ0bi1pbmZvW2Rpc2FibGVkXTpob3ZlcixcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1pbmZvOmhvdmVyLFxcbi5idG4taW5mby5kaXNhYmxlZDpmb2N1cyxcXG4uYnRuLWluZm9bZGlzYWJsZWRdOmZvY3VzLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWluZm86Zm9jdXMsXFxuLmJ0bi1pbmZvLmRpc2FibGVkOmFjdGl2ZSxcXG4uYnRuLWluZm9bZGlzYWJsZWRdOmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1pbmZvOmFjdGl2ZSxcXG4uYnRuLWluZm8uZGlzYWJsZWQuYWN0aXZlLFxcbi5idG4taW5mb1tkaXNhYmxlZF0uYWN0aXZlLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWluZm8uYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM1YmMwZGU7XFxuICBib3JkZXItY29sb3I6ICM0NmI4ZGE7XFxufVxcbi5idG4taW5mbyAuYmFkZ2Uge1xcbiAgY29sb3I6ICM1YmMwZGU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uYnRuLXdhcm5pbmcge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjBhZDRlO1xcbiAgYm9yZGVyLWNvbG9yOiAjZWVhMjM2O1xcbn1cXG4uYnRuLXdhcm5pbmc6aG92ZXIsXFxuLmJ0bi13YXJuaW5nOmZvY3VzLFxcbi5idG4td2FybmluZzphY3RpdmUsXFxuLmJ0bi13YXJuaW5nLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi13YXJuaW5nIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VkOWMyODtcXG4gIGJvcmRlci1jb2xvcjogI2Q1ODUxMjtcXG59XFxuLmJ0bi13YXJuaW5nOmFjdGl2ZSxcXG4uYnRuLXdhcm5pbmcuYWN0aXZlLFxcbi5vcGVuIC5kcm9wZG93bi10b2dnbGUuYnRuLXdhcm5pbmcge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG59XFxuLmJ0bi13YXJuaW5nLmRpc2FibGVkLFxcbi5idG4td2FybmluZ1tkaXNhYmxlZF0sXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4td2FybmluZyxcXG4uYnRuLXdhcm5pbmcuZGlzYWJsZWQ6aG92ZXIsXFxuLmJ0bi13YXJuaW5nW2Rpc2FibGVkXTpob3ZlcixcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi13YXJuaW5nOmhvdmVyLFxcbi5idG4td2FybmluZy5kaXNhYmxlZDpmb2N1cyxcXG4uYnRuLXdhcm5pbmdbZGlzYWJsZWRdOmZvY3VzLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXdhcm5pbmc6Zm9jdXMsXFxuLmJ0bi13YXJuaW5nLmRpc2FibGVkOmFjdGl2ZSxcXG4uYnRuLXdhcm5pbmdbZGlzYWJsZWRdOmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi13YXJuaW5nOmFjdGl2ZSxcXG4uYnRuLXdhcm5pbmcuZGlzYWJsZWQuYWN0aXZlLFxcbi5idG4td2FybmluZ1tkaXNhYmxlZF0uYWN0aXZlLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLXdhcm5pbmcuYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmMGFkNGU7XFxuICBib3JkZXItY29sb3I6ICNlZWEyMzY7XFxufVxcbi5idG4td2FybmluZyAuYmFkZ2Uge1xcbiAgY29sb3I6ICNmMGFkNGU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uYnRuLWRhbmdlciB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOTUzNGY7XFxuICBib3JkZXItY29sb3I6ICNkNDNmM2E7XFxufVxcbi5idG4tZGFuZ2VyOmhvdmVyLFxcbi5idG4tZGFuZ2VyOmZvY3VzLFxcbi5idG4tZGFuZ2VyOmFjdGl2ZSxcXG4uYnRuLWRhbmdlci5hY3RpdmUsXFxuLm9wZW4gLmRyb3Bkb3duLXRvZ2dsZS5idG4tZGFuZ2VyIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2QyMzIyZDtcXG4gIGJvcmRlci1jb2xvcjogI2FjMjkyNTtcXG59XFxuLmJ0bi1kYW5nZXI6YWN0aXZlLFxcbi5idG4tZGFuZ2VyLmFjdGl2ZSxcXG4ub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1kYW5nZXIge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbm9uZTtcXG59XFxuLmJ0bi1kYW5nZXIuZGlzYWJsZWQsXFxuLmJ0bi1kYW5nZXJbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWRhbmdlcixcXG4uYnRuLWRhbmdlci5kaXNhYmxlZDpob3ZlcixcXG4uYnRuLWRhbmdlcltkaXNhYmxlZF06aG92ZXIsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGFuZ2VyOmhvdmVyLFxcbi5idG4tZGFuZ2VyLmRpc2FibGVkOmZvY3VzLFxcbi5idG4tZGFuZ2VyW2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kYW5nZXI6Zm9jdXMsXFxuLmJ0bi1kYW5nZXIuZGlzYWJsZWQ6YWN0aXZlLFxcbi5idG4tZGFuZ2VyW2Rpc2FibGVkXTphY3RpdmUsXFxuZmllbGRzZXRbZGlzYWJsZWRdIC5idG4tZGFuZ2VyOmFjdGl2ZSxcXG4uYnRuLWRhbmdlci5kaXNhYmxlZC5hY3RpdmUsXFxuLmJ0bi1kYW5nZXJbZGlzYWJsZWRdLmFjdGl2ZSxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1kYW5nZXIuYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOTUzNGY7XFxuICBib3JkZXItY29sb3I6ICNkNDNmM2E7XFxufVxcbi5idG4tZGFuZ2VyIC5iYWRnZSB7XFxuICBjb2xvcjogI2Q5NTM0ZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxufVxcbi5idG4tbGluayB7XFxuICBjb2xvcjogIzQyOGJjYTtcXG4gIGZvbnQtd2VpZ2h0OiBub3JtYWw7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWxpbmssXFxuLmJ0bi1saW5rOmFjdGl2ZSxcXG4uYnRuLWxpbmtbZGlzYWJsZWRdLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWxpbmsge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IG5vbmU7XFxuICBib3gtc2hhZG93OiBub25lO1xcbn1cXG4uYnRuLWxpbmssXFxuLmJ0bi1saW5rOmhvdmVyLFxcbi5idG4tbGluazpmb2N1cyxcXG4uYnRuLWxpbms6YWN0aXZlIHtcXG4gIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcbi5idG4tbGluazpob3ZlcixcXG4uYnRuLWxpbms6Zm9jdXMge1xcbiAgY29sb3I6ICMyYTY0OTY7XFxuICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG4uYnRuLWxpbmtbZGlzYWJsZWRdOmhvdmVyLFxcbmZpZWxkc2V0W2Rpc2FibGVkXSAuYnRuLWxpbms6aG92ZXIsXFxuLmJ0bi1saW5rW2Rpc2FibGVkXTpmb2N1cyxcXG5maWVsZHNldFtkaXNhYmxlZF0gLmJ0bi1saW5rOmZvY3VzIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbn1cXG4uYnRuLWxnLFxcbi5idG4tZ3JvdXAtbGcgPiAuYnRuIHtcXG4gIHBhZGRpbmc6IDEwcHggMTZweDtcXG4gIGZvbnQtc2l6ZTogMThweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjMzO1xcbiAgYm9yZGVyLXJhZGl1czogNnB4O1xcbn1cXG4uYnRuLXNtLFxcbi5idG4tZ3JvdXAtc20gPiAuYnRuIHtcXG4gIHBhZGRpbmc6IDVweCAxMHB4O1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNTtcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG59XFxuLmJ0bi14cyxcXG4uYnRuLWdyb3VwLXhzID4gLmJ0biB7XFxuICBwYWRkaW5nOiAxcHggNXB4O1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNTtcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG59XFxuLmJ0bi1ibG9jayB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHdpZHRoOiAxMDAlO1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgcGFkZGluZy1yaWdodDogMDtcXG59XFxuLmJ0bi1ibG9jayArIC5idG4tYmxvY2sge1xcbiAgbWFyZ2luLXRvcDogNXB4O1xcbn1cXG5pbnB1dFt0eXBlPVxcXCJzdWJtaXRcXFwiXS5idG4tYmxvY2ssXFxuaW5wdXRbdHlwZT1cXFwicmVzZXRcXFwiXS5idG4tYmxvY2ssXFxuaW5wdXRbdHlwZT1cXFwiYnV0dG9uXFxcIl0uYnRuLWJsb2NrIHtcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4uZmFkZSB7XFxuICBvcGFjaXR5OiAwO1xcbiAgLXdlYmtpdC10cmFuc2l0aW9uOiBvcGFjaXR5IDAuMTVzIGxpbmVhcjtcXG4gIHRyYW5zaXRpb246IG9wYWNpdHkgMC4xNXMgbGluZWFyO1xcbn1cXG4uZmFkZS5pbiB7XFxuICBvcGFjaXR5OiAxO1xcbn1cXG4uY29sbGFwc2Uge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLmNvbGxhcHNlLmluIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbn1cXG4uY29sbGFwc2luZyB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBoZWlnaHQ6IDA7XFxuICBvdmVyZmxvdzogaGlkZGVuO1xcbiAgLXdlYmtpdC10cmFuc2l0aW9uOiBoZWlnaHQgMC4zNXMgZWFzZTtcXG4gIHRyYW5zaXRpb246IGhlaWdodCAwLjM1cyBlYXNlO1xcbn1cXG5AZm9udC1mYWNlIHtcXG4gIGZvbnQtZmFtaWx5OiAnR2x5cGhpY29ucyBIYWxmbGluZ3MnO1xcbiAgc3JjOiB1cmwoJy4uL2ZvbnRzL2dseXBoaWNvbnMtaGFsZmxpbmdzLXJlZ3VsYXIuZW90Jyk7XFxuICBzcmM6IHVybCgnLi4vZm9udHMvZ2x5cGhpY29ucy1oYWxmbGluZ3MtcmVndWxhci5lb3Q/I2llZml4JykgZm9ybWF0KCdlbWJlZGRlZC1vcGVudHlwZScpLCB1cmwoJy4uL2ZvbnRzL2dseXBoaWNvbnMtaGFsZmxpbmdzLXJlZ3VsYXIud29mZicpIGZvcm1hdCgnd29mZicpLCB1cmwoJy4uL2ZvbnRzL2dseXBoaWNvbnMtaGFsZmxpbmdzLXJlZ3VsYXIudHRmJykgZm9ybWF0KCd0cnVldHlwZScpLCB1cmwoJy4uL2ZvbnRzL2dseXBoaWNvbnMtaGFsZmxpbmdzLXJlZ3VsYXIuc3ZnI2dseXBoaWNvbnNfaGFsZmxpbmdzcmVndWxhcicpIGZvcm1hdCgnc3ZnJyk7XFxufVxcbi5nbHlwaGljb24ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgdG9wOiAxcHg7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICBmb250LWZhbWlseTogJ0dseXBoaWNvbnMgSGFsZmxpbmdzJztcXG4gIGZvbnQtc3R5bGU6IG5vcm1hbDtcXG4gIGZvbnQtd2VpZ2h0OiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMTtcXG4gIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6IGFudGlhbGlhc2VkO1xcbiAgLW1vei1vc3gtZm9udC1zbW9vdGhpbmc6IGdyYXlzY2FsZTtcXG59XFxuLmdseXBoaWNvbi1hc3RlcmlzazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFwyYVxcXCI7XFxufVxcbi5nbHlwaGljb24tcGx1czpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFwyYlxcXCI7XFxufVxcbi5nbHlwaGljb24tZXVybzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFwyMGFjXFxcIjtcXG59XFxuLmdseXBoaWNvbi1taW51czpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFwyMjEyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jbG91ZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFwyNjAxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1lbnZlbG9wZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFwyNzA5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1wZW5jaWw6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcMjcwZlxcXCI7XFxufVxcbi5nbHlwaGljb24tZ2xhc3M6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAwMVxcXCI7XFxufVxcbi5nbHlwaGljb24tbXVzaWM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAwMlxcXCI7XFxufVxcbi5nbHlwaGljb24tc2VhcmNoOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWhlYXJ0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXN0YXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAwNlxcXCI7XFxufVxcbi5nbHlwaGljb24tc3Rhci1lbXB0eTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDA3XFxcIjtcXG59XFxuLmdseXBoaWNvbi11c2VyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMDhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZpbG06YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAwOVxcXCI7XFxufVxcbi5nbHlwaGljb24tdGgtbGFyZ2U6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxMFxcXCI7XFxufVxcbi5nbHlwaGljb24tdGg6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxMVxcXCI7XFxufVxcbi5nbHlwaGljb24tdGgtbGlzdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDEyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1vazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDEzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZW1vdmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxNFxcXCI7XFxufVxcbi5nbHlwaGljb24tem9vbS1pbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDE1XFxcIjtcXG59XFxuLmdseXBoaWNvbi16b29tLW91dDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDE2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1vZmY6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAxN1xcXCI7XFxufVxcbi5nbHlwaGljb24tc2lnbmFsOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMThcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNvZzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDE5XFxcIjtcXG59XFxuLmdseXBoaWNvbi10cmFzaDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDIwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1ob21lOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMjFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZpbGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyMlxcXCI7XFxufVxcbi5nbHlwaGljb24tdGltZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDIzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1yb2FkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMjRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWRvd25sb2FkLWFsdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDI1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1kb3dubG9hZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDI2XFxcIjtcXG59XFxuLmdseXBoaWNvbi11cGxvYWQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyN1xcXCI7XFxufVxcbi5nbHlwaGljb24taW5ib3g6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyOFxcXCI7XFxufVxcbi5nbHlwaGljb24tcGxheS1jaXJjbGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAyOVxcXCI7XFxufVxcbi5nbHlwaGljb24tcmVwZWF0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlZnJlc2g6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzMVxcXCI7XFxufVxcbi5nbHlwaGljb24tbGlzdC1hbHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzMlxcXCI7XFxufVxcbi5nbHlwaGljb24tbG9jazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDMzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1mbGFnOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWhlYWRwaG9uZXM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzNVxcXCI7XFxufVxcbi5nbHlwaGljb24tdm9sdW1lLW9mZjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDM2XFxcIjtcXG59XFxuLmdseXBoaWNvbi12b2x1bWUtZG93bjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDM3XFxcIjtcXG59XFxuLmdseXBoaWNvbi12b2x1bWUtdXA6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTAzOFxcXCI7XFxufVxcbi5nbHlwaGljb24tcXJjb2RlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwMzlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWJhcmNvZGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0MFxcXCI7XFxufVxcbi5nbHlwaGljb24tdGFnOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNDFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRhZ3M6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0MlxcXCI7XFxufVxcbi5nbHlwaGljb24tYm9vazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1ib29rbWFyazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQ0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1wcmludDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQ1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jYW1lcmE6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA0NlxcXCI7XFxufVxcbi5nbHlwaGljb24tZm9udDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQ3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1ib2xkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNDhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWl0YWxpYzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDQ5XFxcIjtcXG59XFxuLmdseXBoaWNvbi10ZXh0LWhlaWdodDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDUwXFxcIjtcXG59XFxuLmdseXBoaWNvbi10ZXh0LXdpZHRoOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNTFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFsaWduLWxlZnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1MlxcXCI7XFxufVxcbi5nbHlwaGljb24tYWxpZ24tY2VudGVyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNTNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFsaWduLXJpZ2h0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNTRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFsaWduLWp1c3RpZnk6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1NVxcXCI7XFxufVxcbi5nbHlwaGljb24tbGlzdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDU2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1pbmRlbnQtbGVmdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDU3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1pbmRlbnQtcmlnaHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1OFxcXCI7XFxufVxcbi5nbHlwaGljb24tZmFjZXRpbWUtdmlkZW86YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA1OVxcXCI7XFxufVxcbi5nbHlwaGljb24tcGljdHVyZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDYwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1tYXAtbWFya2VyOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNjJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFkanVzdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDYzXFxcIjtcXG59XFxuLmdseXBoaWNvbi10aW50OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNjRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWVkaXQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA2NVxcXCI7XFxufVxcbi5nbHlwaGljb24tc2hhcmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA2NlxcXCI7XFxufVxcbi5nbHlwaGljb24tY2hlY2s6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA2N1xcXCI7XFxufVxcbi5nbHlwaGljb24tbW92ZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDY4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zdGVwLWJhY2t3YXJkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNjlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZhc3QtYmFja3dhcmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3MFxcXCI7XFxufVxcbi5nbHlwaGljb24tYmFja3dhcmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3MVxcXCI7XFxufVxcbi5nbHlwaGljb24tcGxheTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDcyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1wYXVzZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDczXFxcIjtcXG59XFxuLmdseXBoaWNvbi1zdG9wOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNzRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZvcndhcmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3NVxcXCI7XFxufVxcbi5nbHlwaGljb24tZmFzdC1mb3J3YXJkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwNzZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXN0ZXAtZm9yd2FyZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDc3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1lamVjdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDc4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jaGV2cm9uLWxlZnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA3OVxcXCI7XFxufVxcbi5nbHlwaGljb24tY2hldnJvbi1yaWdodDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDgwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1wbHVzLXNpZ246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4MVxcXCI7XFxufVxcbi5nbHlwaGljb24tbWludXMtc2lnbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDgyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZW1vdmUtc2lnbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDgzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1vay1zaWduOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwODRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXF1ZXN0aW9uLXNpZ246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4NVxcXCI7XFxufVxcbi5nbHlwaGljb24taW5mby1zaWduOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwODZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNjcmVlbnNob3Q6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4N1xcXCI7XFxufVxcbi5nbHlwaGljb24tcmVtb3ZlLWNpcmNsZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDg4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1vay1jaXJjbGU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA4OVxcXCI7XFxufVxcbi5nbHlwaGljb24tYmFuLWNpcmNsZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDkwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1hcnJvdy1sZWZ0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwOTFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFycm93LXJpZ2h0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwOTJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFycm93LXVwOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwOTNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWFycm93LWRvd246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTA5NFxcXCI7XFxufVxcbi5nbHlwaGljb24tc2hhcmUtYWx0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwOTVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlc2l6ZS1mdWxsOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUwOTZcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlc2l6ZS1zbWFsbDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMDk3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1leGNsYW1hdGlvbi1zaWduOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWdpZnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEwMlxcXCI7XFxufVxcbi5nbHlwaGljb24tbGVhZjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTAzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1maXJlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWV5ZS1vcGVuOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMDVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWV5ZS1jbG9zZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTA2XFxcIjtcXG59XFxuLmdseXBoaWNvbi13YXJuaW5nLXNpZ246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEwN1xcXCI7XFxufVxcbi5nbHlwaGljb24tcGxhbmU6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEwOFxcXCI7XFxufVxcbi5nbHlwaGljb24tY2FsZW5kYXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEwOVxcXCI7XFxufVxcbi5nbHlwaGljb24tcmFuZG9tOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNvbW1lbnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTExMVxcXCI7XFxufVxcbi5nbHlwaGljb24tbWFnbmV0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNoZXZyb24tdXA6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTExM1xcXCI7XFxufVxcbi5nbHlwaGljb24tY2hldnJvbi1kb3duOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJldHdlZXQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTExNVxcXCI7XFxufVxcbi5nbHlwaGljb24tc2hvcHBpbmctY2FydDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTE2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1mb2xkZXItY2xvc2U6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTExN1xcXCI7XFxufVxcbi5nbHlwaGljb24tZm9sZGVyLW9wZW46YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTExOFxcXCI7XFxufVxcbi5nbHlwaGljb24tcmVzaXplLXZlcnRpY2FsOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMTlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlc2l6ZS1ob3Jpem9udGFsOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMjBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWhkZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTIxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1idWxsaG9ybjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTIyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1iZWxsOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMjNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNlcnRpZmljYXRlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMjRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXRodW1icy11cDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTI1XFxcIjtcXG59XFxuLmdseXBoaWNvbi10aHVtYnMtZG93bjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTI2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oYW5kLXJpZ2h0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMjdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWhhbmQtbGVmdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTI4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oYW5kLXVwOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMjlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWhhbmQtZG93bjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTMwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jaXJjbGUtYXJyb3ctcmlnaHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEzMVxcXCI7XFxufVxcbi5nbHlwaGljb24tY2lyY2xlLWFycm93LWxlZnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEzMlxcXCI7XFxufVxcbi5nbHlwaGljb24tY2lyY2xlLWFycm93LXVwOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNpcmNsZS1hcnJvdy1kb3duOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWdsb2JlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXdyZW5jaDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTM2XFxcIjtcXG59XFxuLmdseXBoaWNvbi10YXNrczpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTM3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1maWx0ZXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTEzOFxcXCI7XFxufVxcbi5nbHlwaGljb24tYnJpZWZjYXNlOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxMzlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZ1bGxzY3JlZW46YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE0MFxcXCI7XFxufVxcbi5nbHlwaGljb24tZGFzaGJvYXJkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNDFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBhcGVyY2xpcDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1oZWFydC1lbXB0eTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1saW5rOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNDRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBob25lOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNDVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXB1c2hwaW46YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE0NlxcXCI7XFxufVxcbi5nbHlwaGljb24tdXNkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNDhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWdicDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTQ5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3J0OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNTBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvcnQtYnktYWxwaGFiZXQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1MVxcXCI7XFxufVxcbi5nbHlwaGljb24tc29ydC1ieS1hbHBoYWJldC1hbHQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1MlxcXCI7XFxufVxcbi5nbHlwaGljb24tc29ydC1ieS1vcmRlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTUzXFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3J0LWJ5LW9yZGVyLWFsdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTU0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3J0LWJ5LWF0dHJpYnV0ZXM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1NVxcXCI7XFxufVxcbi5nbHlwaGljb24tc29ydC1ieS1hdHRyaWJ1dGVzLWFsdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTU2XFxcIjtcXG59XFxuLmdseXBoaWNvbi11bmNoZWNrZWQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1N1xcXCI7XFxufVxcbi5nbHlwaGljb24tZXhwYW5kOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNThcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNvbGxhcHNlLWRvd246YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE1OVxcXCI7XFxufVxcbi5nbHlwaGljb24tY29sbGFwc2UtdXA6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE2MFxcXCI7XFxufVxcbi5nbHlwaGljb24tbG9nLWluOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWZsYXNoOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWxvZy1vdXQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE2M1xcXCI7XFxufVxcbi5nbHlwaGljb24tbmV3LXdpbmRvdzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTY0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1yZWNvcmQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE2NVxcXCI7XFxufVxcbi5nbHlwaGljb24tc2F2ZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTY2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1vcGVuOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNhdmVkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNjhcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWltcG9ydDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTY5XFxcIjtcXG59XFxuLmdseXBoaWNvbi1leHBvcnQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3MFxcXCI7XFxufVxcbi5nbHlwaGljb24tc2VuZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTcxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1mbG9wcHktZGlzazpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTcyXFxcIjtcXG59XFxuLmdseXBoaWNvbi1mbG9wcHktc2F2ZWQ6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE3M1xcXCI7XFxufVxcbi5nbHlwaGljb24tZmxvcHB5LXJlbW92ZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTc0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1mbG9wcHktc2F2ZTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTc1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1mbG9wcHktb3BlbjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTc2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jcmVkaXQtY2FyZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTc3XFxcIjtcXG59XFxuLmdseXBoaWNvbi10cmFuc2ZlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTc4XFxcIjtcXG59XFxuLmdseXBoaWNvbi1jdXRsZXJ5OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxNzlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWhlYWRlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTgwXFxcIjtcXG59XFxuLmdseXBoaWNvbi1jb21wcmVzc2VkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxODFcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWVhcnBob25lOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxODJcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXBob25lLWFsdDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTgzXFxcIjtcXG59XFxuLmdseXBoaWNvbi10b3dlcjpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTg0XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zdGF0czpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTg1XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zZC12aWRlbzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTg2XFxcIjtcXG59XFxuLmdseXBoaWNvbi1oZC12aWRlbzpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTg3XFxcIjtcXG59XFxuLmdseXBoaWNvbi1zdWJ0aXRsZXM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE4OFxcXCI7XFxufVxcbi5nbHlwaGljb24tc291bmQtc3RlcmVvOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxODlcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvdW5kLWRvbGJ5OmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTBcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXNvdW5kLTUtMTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTkxXFxcIjtcXG59XFxuLmdseXBoaWNvbi1zb3VuZC02LTE6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE5MlxcXCI7XFxufVxcbi5nbHlwaGljb24tc291bmQtNy0xOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTNcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNvcHlyaWdodC1tYXJrOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTRcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLXJlZ2lzdHJhdGlvbi1tYXJrOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTVcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNsb3VkLWRvd25sb2FkOmJlZm9yZSB7XFxuICBjb250ZW50OiBcXFwiXFxcXGUxOTdcXFwiO1xcbn1cXG4uZ2x5cGhpY29uLWNsb3VkLXVwbG9hZDpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIlxcXFxlMTk4XFxcIjtcXG59XFxuLmdseXBoaWNvbi10cmVlLWNvbmlmZXI6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTE5OVxcXCI7XFxufVxcbi5nbHlwaGljb24tdHJlZS1kZWNpZHVvdXM6YmVmb3JlIHtcXG4gIGNvbnRlbnQ6IFxcXCJcXFxcZTIwMFxcXCI7XFxufVxcbi5jYXJldCB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICB3aWR0aDogMDtcXG4gIGhlaWdodDogMDtcXG4gIG1hcmdpbi1sZWZ0OiAycHg7XFxuICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgYm9yZGVyLXRvcDogNHB4IHNvbGlkO1xcbiAgYm9yZGVyLXJpZ2h0OiA0cHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItbGVmdDogNHB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbn1cXG4uZHJvcGRvd24ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG4uZHJvcGRvd24tdG9nZ2xlOmZvY3VzIHtcXG4gIG91dGxpbmU6IDA7XFxufVxcbi5kcm9wZG93bi1tZW51IHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMTAwJTtcXG4gIGxlZnQ6IDA7XFxuICB6LWluZGV4OiAxMDAwO1xcbiAgZGlzcGxheTogbm9uZTtcXG4gIGZsb2F0OiBsZWZ0O1xcbiAgbWluLXdpZHRoOiAxNjBweDtcXG4gIHBhZGRpbmc6IDVweCAwO1xcbiAgbWFyZ2luOiAycHggMCAwO1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIGZvbnQtc2l6ZTogMTRweDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjY2NjY2NjO1xcbiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjE1KTtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogMCA2cHggMTJweCByZ2JhKDAsIDAsIDAsIDAuMTc1KTtcXG4gIGJveC1zaGFkb3c6IDAgNnB4IDEycHggcmdiYSgwLCAwLCAwLCAwLjE3NSk7XFxuICBiYWNrZ3JvdW5kLWNsaXA6IHBhZGRpbmctYm94O1xcbn1cXG4uZHJvcGRvd24tbWVudS5wdWxsLXJpZ2h0IHtcXG4gIHJpZ2h0OiAwO1xcbiAgbGVmdDogYXV0bztcXG59XFxuLmRyb3Bkb3duLW1lbnUgLmRpdmlkZXIge1xcbiAgaGVpZ2h0OiAxcHg7XFxuICBtYXJnaW46IDlweCAwO1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlNWU1ZTU7XFxufVxcbi5kcm9wZG93bi1tZW51ID4gbGkgPiBhIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZzogM3B4IDIwcHg7XFxuICBjbGVhcjogYm90aDtcXG4gIGZvbnQtd2VpZ2h0OiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMS40Mjg1NzE0MztcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG59XFxuLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGE6aG92ZXIsXFxuLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGE6Zm9jdXMge1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgY29sb3I6ICMyNjI2MjY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbn1cXG4uZHJvcGRvd24tbWVudSA+IC5hY3RpdmUgPiBhLFxcbi5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuLmRyb3Bkb3duLW1lbnUgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIG91dGxpbmU6IDA7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4uZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGEsXFxuLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbi5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYTpmb2N1cyB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbi5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYTpmb2N1cyB7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxuICBmaWx0ZXI6IHByb2dpZDpEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdC5ncmFkaWVudChlbmFibGVkID0gZmFsc2UpO1xcbiAgY3Vyc29yOiBub3QtYWxsb3dlZDtcXG59XFxuLm9wZW4gPiAuZHJvcGRvd24tbWVudSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuLm9wZW4gPiBhIHtcXG4gIG91dGxpbmU6IDA7XFxufVxcbi5kcm9wZG93bi1tZW51LXJpZ2h0IHtcXG4gIGxlZnQ6IGF1dG87XFxuICByaWdodDogMDtcXG59XFxuLmRyb3Bkb3duLW1lbnUtbGVmdCB7XFxuICBsZWZ0OiAwO1xcbiAgcmlnaHQ6IGF1dG87XFxufVxcbi5kcm9wZG93bi1oZWFkZXIge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBwYWRkaW5nOiAzcHggMjBweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5kcm9wZG93bi1iYWNrZHJvcCB7XFxuICBwb3NpdGlvbjogZml4ZWQ7XFxuICBsZWZ0OiAwO1xcbiAgcmlnaHQ6IDA7XFxuICBib3R0b206IDA7XFxuICB0b3A6IDA7XFxuICB6LWluZGV4OiA5OTA7XFxufVxcbi5wdWxsLXJpZ2h0ID4gLmRyb3Bkb3duLW1lbnUge1xcbiAgcmlnaHQ6IDA7XFxuICBsZWZ0OiBhdXRvO1xcbn1cXG4uZHJvcHVwIC5jYXJldCxcXG4ubmF2YmFyLWZpeGVkLWJvdHRvbSAuZHJvcGRvd24gLmNhcmV0IHtcXG4gIGJvcmRlci10b3A6IDA7XFxuICBib3JkZXItYm90dG9tOiA0cHggc29saWQ7XFxuICBjb250ZW50OiBcXFwiXFxcIjtcXG59XFxuLmRyb3B1cCAuZHJvcGRvd24tbWVudSxcXG4ubmF2YmFyLWZpeGVkLWJvdHRvbSAuZHJvcGRvd24gLmRyb3Bkb3duLW1lbnUge1xcbiAgdG9wOiBhdXRvO1xcbiAgYm90dG9tOiAxMDAlO1xcbiAgbWFyZ2luLWJvdHRvbTogMXB4O1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItcmlnaHQgLmRyb3Bkb3duLW1lbnUge1xcbiAgICBsZWZ0OiBhdXRvO1xcbiAgICByaWdodDogMDtcXG4gIH1cXG4gIC5uYXZiYXItcmlnaHQgLmRyb3Bkb3duLW1lbnUtbGVmdCB7XFxuICAgIGxlZnQ6IDA7XFxuICAgIHJpZ2h0OiBhdXRvO1xcbiAgfVxcbn1cXG4uYnRuLWdyb3VwLFxcbi5idG4tZ3JvdXAtdmVydGljYWwge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG4sXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZmxvYXQ6IGxlZnQ7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuOmhvdmVyLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuOmhvdmVyLFxcbi5idG4tZ3JvdXAgPiAuYnRuOmZvY3VzLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuOmZvY3VzLFxcbi5idG4tZ3JvdXAgPiAuYnRuOmFjdGl2ZSxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bjphY3RpdmUsXFxuLmJ0bi1ncm91cCA+IC5idG4uYWN0aXZlLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLmFjdGl2ZSB7XFxuICB6LWluZGV4OiAyO1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bjpmb2N1cyxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bjpmb2N1cyB7XFxuICBvdXRsaW5lOiBub25lO1xcbn1cXG4uYnRuLWdyb3VwIC5idG4gKyAuYnRuLFxcbi5idG4tZ3JvdXAgLmJ0biArIC5idG4tZ3JvdXAsXFxuLmJ0bi1ncm91cCAuYnRuLWdyb3VwICsgLmJ0bixcXG4uYnRuLWdyb3VwIC5idG4tZ3JvdXAgKyAuYnRuLWdyb3VwIHtcXG4gIG1hcmdpbi1sZWZ0OiAtMXB4O1xcbn1cXG4uYnRuLXRvb2xiYXIge1xcbiAgbWFyZ2luLWxlZnQ6IC01cHg7XFxufVxcbi5idG4tdG9vbGJhciAuYnRuLWdyb3VwLFxcbi5idG4tdG9vbGJhciAuaW5wdXQtZ3JvdXAge1xcbiAgZmxvYXQ6IGxlZnQ7XFxufVxcbi5idG4tdG9vbGJhciA+IC5idG4sXFxuLmJ0bi10b29sYmFyID4gLmJ0bi1ncm91cCxcXG4uYnRuLXRvb2xiYXIgPiAuaW5wdXQtZ3JvdXAge1xcbiAgbWFyZ2luLWxlZnQ6IDVweDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG46bm90KDpmaXJzdC1jaGlsZCk6bm90KDpsYXN0LWNoaWxkKTpub3QoLmRyb3Bkb3duLXRvZ2dsZSkge1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG46Zmlyc3QtY2hpbGQge1xcbiAgbWFyZ2luLWxlZnQ6IDA7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuOmZpcnN0LWNoaWxkOm5vdCg6bGFzdC1jaGlsZCk6bm90KC5kcm9wZG93bi10b2dnbGUpIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuOmxhc3QtY2hpbGQ6bm90KDpmaXJzdC1jaGlsZCksXFxuLmJ0bi1ncm91cCA+IC5kcm9wZG93bi10b2dnbGU6bm90KDpmaXJzdC1jaGlsZCkge1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogMDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAgPiAuYnRuLWdyb3VwIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bi1ncm91cDpub3QoOmZpcnN0LWNoaWxkKTpub3QoOmxhc3QtY2hpbGQpID4gLmJ0biB7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bi1ncm91cDpmaXJzdC1jaGlsZCA+IC5idG46bGFzdC1jaGlsZCxcXG4uYnRuLWdyb3VwID4gLmJ0bi1ncm91cDpmaXJzdC1jaGlsZCA+IC5kcm9wZG93bi10b2dnbGUge1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG4tZ3JvdXA6bGFzdC1jaGlsZCA+IC5idG46Zmlyc3QtY2hpbGQge1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogMDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAgLmRyb3Bkb3duLXRvZ2dsZTphY3RpdmUsXFxuLmJ0bi1ncm91cC5vcGVuIC5kcm9wZG93bi10b2dnbGUge1xcbiAgb3V0bGluZTogMDtcXG59XFxuLmJ0bi1ncm91cCA+IC5idG4gKyAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIHBhZGRpbmctbGVmdDogOHB4O1xcbiAgcGFkZGluZy1yaWdodDogOHB4O1xcbn1cXG4uYnRuLWdyb3VwID4gLmJ0bi1sZyArIC5kcm9wZG93bi10b2dnbGUge1xcbiAgcGFkZGluZy1sZWZ0OiAxMnB4O1xcbiAgcGFkZGluZy1yaWdodDogMTJweDtcXG59XFxuLmJ0bi1ncm91cC5vcGVuIC5kcm9wZG93bi10b2dnbGUge1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDNweCA1cHggcmdiYSgwLCAwLCAwLCAwLjEyNSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDNweCA1cHggcmdiYSgwLCAwLCAwLCAwLjEyNSk7XFxufVxcbi5idG4tZ3JvdXAub3BlbiAuZHJvcGRvd24tdG9nZ2xlLmJ0bi1saW5rIHtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogbm9uZTtcXG4gIGJveC1zaGFkb3c6IG5vbmU7XFxufVxcbi5idG4gLmNhcmV0IHtcXG4gIG1hcmdpbi1sZWZ0OiAwO1xcbn1cXG4uYnRuLWxnIC5jYXJldCB7XFxuICBib3JkZXItd2lkdGg6IDVweCA1cHggMDtcXG4gIGJvcmRlci1ib3R0b20td2lkdGg6IDA7XFxufVxcbi5kcm9wdXAgLmJ0bi1sZyAuY2FyZXQge1xcbiAgYm9yZGVyLXdpZHRoOiAwIDVweCA1cHg7XFxufVxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwID4gLmJ0biB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIGZsb2F0OiBub25lO1xcbiAgd2lkdGg6IDEwMCU7XFxuICBtYXgtd2lkdGg6IDEwMCU7XFxufVxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwID4gLmJ0biB7XFxuICBmbG9hdDogbm9uZTtcXG59XFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4gKyAuYnRuLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuICsgLmJ0bi1ncm91cCxcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cCArIC5idG4sXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXAgKyAuYnRuLWdyb3VwIHtcXG4gIG1hcmdpbi10b3A6IC0xcHg7XFxuICBtYXJnaW4tbGVmdDogMDtcXG59XFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG46bm90KDpmaXJzdC1jaGlsZCk6bm90KDpsYXN0LWNoaWxkKSB7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bjpmaXJzdC1jaGlsZDpub3QoOmxhc3QtY2hpbGQpIHtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiA0cHg7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogMDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuOmxhc3QtY2hpbGQ6bm90KDpmaXJzdC1jaGlsZCkge1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogNHB4O1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cDpub3QoOmZpcnN0LWNoaWxkKTpub3QoOmxhc3QtY2hpbGQpID4gLmJ0biB7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cDpmaXJzdC1jaGlsZDpub3QoOmxhc3QtY2hpbGQpID4gLmJ0bjpsYXN0LWNoaWxkLFxcbi5idG4tZ3JvdXAtdmVydGljYWwgPiAuYnRuLWdyb3VwOmZpcnN0LWNoaWxkOm5vdCg6bGFzdC1jaGlsZCkgPiAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogMDtcXG59XFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXA6bGFzdC1jaGlsZDpub3QoOmZpcnN0LWNoaWxkKSA+IC5idG46Zmlyc3QtY2hpbGQge1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4uYnRuLWdyb3VwLWp1c3RpZmllZCB7XFxuICBkaXNwbGF5OiB0YWJsZTtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgdGFibGUtbGF5b3V0OiBmaXhlZDtcXG4gIGJvcmRlci1jb2xsYXBzZTogc2VwYXJhdGU7XFxufVxcbi5idG4tZ3JvdXAtanVzdGlmaWVkID4gLmJ0bixcXG4uYnRuLWdyb3VwLWp1c3RpZmllZCA+IC5idG4tZ3JvdXAge1xcbiAgZmxvYXQ6IG5vbmU7XFxuICBkaXNwbGF5OiB0YWJsZS1jZWxsO1xcbiAgd2lkdGg6IDElO1xcbn1cXG4uYnRuLWdyb3VwLWp1c3RpZmllZCA+IC5idG4tZ3JvdXAgLmJ0biB7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuW2RhdGEtdG9nZ2xlPVxcXCJidXR0b25zXFxcIl0gPiAuYnRuID4gaW5wdXRbdHlwZT1cXFwicmFkaW9cXFwiXSxcXG5bZGF0YS10b2dnbGU9XFxcImJ1dHRvbnNcXFwiXSA+IC5idG4gPiBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcbi5pbnB1dC1ncm91cCB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBkaXNwbGF5OiB0YWJsZTtcXG4gIGJvcmRlci1jb2xsYXBzZTogc2VwYXJhdGU7XFxufVxcbi5pbnB1dC1ncm91cFtjbGFzcyo9XFxcImNvbC1cXFwiXSB7XFxuICBmbG9hdDogbm9uZTtcXG4gIHBhZGRpbmctbGVmdDogMDtcXG4gIHBhZGRpbmctcmlnaHQ6IDA7XFxufVxcbi5pbnB1dC1ncm91cCAuZm9ybS1jb250cm9sIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHotaW5kZXg6IDI7XFxuICBmbG9hdDogbGVmdDtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuLmlucHV0LWdyb3VwLWxnID4gLmZvcm0tY29udHJvbCxcXG4uaW5wdXQtZ3JvdXAtbGcgPiAuaW5wdXQtZ3JvdXAtYWRkb24sXFxuLmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWJ0biA+IC5idG4ge1xcbiAgaGVpZ2h0OiA0NnB4O1xcbiAgcGFkZGluZzogMTBweCAxNnB4O1xcbiAgZm9udC1zaXplOiAxOHB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuMzM7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxufVxcbnNlbGVjdC5pbnB1dC1ncm91cC1sZyA+IC5mb3JtLWNvbnRyb2wsXFxuc2VsZWN0LmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbnNlbGVjdC5pbnB1dC1ncm91cC1sZyA+IC5pbnB1dC1ncm91cC1idG4gPiAuYnRuIHtcXG4gIGhlaWdodDogNDZweDtcXG4gIGxpbmUtaGVpZ2h0OiA0NnB4O1xcbn1cXG50ZXh0YXJlYS5pbnB1dC1ncm91cC1sZyA+IC5mb3JtLWNvbnRyb2wsXFxudGV4dGFyZWEuaW5wdXQtZ3JvdXAtbGcgPiAuaW5wdXQtZ3JvdXAtYWRkb24sXFxudGV4dGFyZWEuaW5wdXQtZ3JvdXAtbGcgPiAuaW5wdXQtZ3JvdXAtYnRuID4gLmJ0bixcXG5zZWxlY3RbbXVsdGlwbGVdLmlucHV0LWdyb3VwLWxnID4gLmZvcm0tY29udHJvbCxcXG5zZWxlY3RbbXVsdGlwbGVdLmlucHV0LWdyb3VwLWxnID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbnNlbGVjdFttdWx0aXBsZV0uaW5wdXQtZ3JvdXAtbGcgPiAuaW5wdXQtZ3JvdXAtYnRuID4gLmJ0biB7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbi5pbnB1dC1ncm91cC1zbSA+IC5mb3JtLWNvbnRyb2wsXFxuLmlucHV0LWdyb3VwLXNtID4gLmlucHV0LWdyb3VwLWFkZG9uLFxcbi5pbnB1dC1ncm91cC1zbSA+IC5pbnB1dC1ncm91cC1idG4gPiAuYnRuIHtcXG4gIGhlaWdodDogMzBweDtcXG4gIHBhZGRpbmc6IDVweCAxMHB4O1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNTtcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG59XFxuc2VsZWN0LmlucHV0LWdyb3VwLXNtID4gLmZvcm0tY29udHJvbCxcXG5zZWxlY3QuaW5wdXQtZ3JvdXAtc20gPiAuaW5wdXQtZ3JvdXAtYWRkb24sXFxuc2VsZWN0LmlucHV0LWdyb3VwLXNtID4gLmlucHV0LWdyb3VwLWJ0biA+IC5idG4ge1xcbiAgaGVpZ2h0OiAzMHB4O1xcbiAgbGluZS1oZWlnaHQ6IDMwcHg7XFxufVxcbnRleHRhcmVhLmlucHV0LWdyb3VwLXNtID4gLmZvcm0tY29udHJvbCxcXG50ZXh0YXJlYS5pbnB1dC1ncm91cC1zbSA+IC5pbnB1dC1ncm91cC1hZGRvbixcXG50ZXh0YXJlYS5pbnB1dC1ncm91cC1zbSA+IC5pbnB1dC1ncm91cC1idG4gPiAuYnRuLFxcbnNlbGVjdFttdWx0aXBsZV0uaW5wdXQtZ3JvdXAtc20gPiAuZm9ybS1jb250cm9sLFxcbnNlbGVjdFttdWx0aXBsZV0uaW5wdXQtZ3JvdXAtc20gPiAuaW5wdXQtZ3JvdXAtYWRkb24sXFxuc2VsZWN0W211bHRpcGxlXS5pbnB1dC1ncm91cC1zbSA+IC5pbnB1dC1ncm91cC1idG4gPiAuYnRuIHtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uLFxcbi5pbnB1dC1ncm91cC1idG4sXFxuLmlucHV0LWdyb3VwIC5mb3JtLWNvbnRyb2wge1xcbiAgZGlzcGxheTogdGFibGUtY2VsbDtcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uOm5vdCg6Zmlyc3QtY2hpbGQpOm5vdCg6bGFzdC1jaGlsZCksXFxuLmlucHV0LWdyb3VwLWJ0bjpub3QoOmZpcnN0LWNoaWxkKTpub3QoOmxhc3QtY2hpbGQpLFxcbi5pbnB1dC1ncm91cCAuZm9ybS1jb250cm9sOm5vdCg6Zmlyc3QtY2hpbGQpOm5vdCg6bGFzdC1jaGlsZCkge1xcbiAgYm9yZGVyLXJhZGl1czogMDtcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uLFxcbi5pbnB1dC1ncm91cC1idG4ge1xcbiAgd2lkdGg6IDElO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbiB7XFxuICBwYWRkaW5nOiA2cHggMTJweDtcXG4gIGZvbnQtc2l6ZTogMTRweDtcXG4gIGZvbnQtd2VpZ2h0OiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMTtcXG4gIGNvbG9yOiAjNTU1NTU1O1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VlZWVlZTtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNjY2NjY2M7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxufVxcbi5pbnB1dC1ncm91cC1hZGRvbi5pbnB1dC1zbSB7XFxuICBwYWRkaW5nOiA1cHggMTBweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uLmlucHV0LWxnIHtcXG4gIHBhZGRpbmc6IDEwcHggMTZweDtcXG4gIGZvbnQtc2l6ZTogMThweDtcXG4gIGJvcmRlci1yYWRpdXM6IDZweDtcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uIGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl0sXFxuLmlucHV0LWdyb3VwLWFkZG9uIGlucHV0W3R5cGU9XFxcImNoZWNrYm94XFxcIl0ge1xcbiAgbWFyZ2luLXRvcDogMDtcXG59XFxuLmlucHV0LWdyb3VwIC5mb3JtLWNvbnRyb2w6Zmlyc3QtY2hpbGQsXFxuLmlucHV0LWdyb3VwLWFkZG9uOmZpcnN0LWNoaWxkLFxcbi5pbnB1dC1ncm91cC1idG46Zmlyc3QtY2hpbGQgPiAuYnRuLFxcbi5pbnB1dC1ncm91cC1idG46Zmlyc3QtY2hpbGQgPiAuYnRuLWdyb3VwID4gLmJ0bixcXG4uaW5wdXQtZ3JvdXAtYnRuOmZpcnN0LWNoaWxkID4gLmRyb3Bkb3duLXRvZ2dsZSxcXG4uaW5wdXQtZ3JvdXAtYnRuOmxhc3QtY2hpbGQgPiAuYnRuOm5vdCg6bGFzdC1jaGlsZCk6bm90KC5kcm9wZG93bi10b2dnbGUpLFxcbi5pbnB1dC1ncm91cC1idG46bGFzdC1jaGlsZCA+IC5idG4tZ3JvdXA6bm90KDpsYXN0LWNoaWxkKSA+IC5idG4ge1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDtcXG59XFxuLmlucHV0LWdyb3VwLWFkZG9uOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci1yaWdodDogMDtcXG59XFxuLmlucHV0LWdyb3VwIC5mb3JtLWNvbnRyb2w6bGFzdC1jaGlsZCxcXG4uaW5wdXQtZ3JvdXAtYWRkb246bGFzdC1jaGlsZCxcXG4uaW5wdXQtZ3JvdXAtYnRuOmxhc3QtY2hpbGQgPiAuYnRuLFxcbi5pbnB1dC1ncm91cC1idG46bGFzdC1jaGlsZCA+IC5idG4tZ3JvdXAgPiAuYnRuLFxcbi5pbnB1dC1ncm91cC1idG46bGFzdC1jaGlsZCA+IC5kcm9wZG93bi10b2dnbGUsXFxuLmlucHV0LWdyb3VwLWJ0bjpmaXJzdC1jaGlsZCA+IC5idG46bm90KDpmaXJzdC1jaGlsZCksXFxuLmlucHV0LWdyb3VwLWJ0bjpmaXJzdC1jaGlsZCA+IC5idG4tZ3JvdXA6bm90KDpmaXJzdC1jaGlsZCkgPiAuYnRuIHtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbn1cXG4uaW5wdXQtZ3JvdXAtYWRkb246bGFzdC1jaGlsZCB7XFxuICBib3JkZXItbGVmdDogMDtcXG59XFxuLmlucHV0LWdyb3VwLWJ0biB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBmb250LXNpemU6IDA7XFxuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbn1cXG4uaW5wdXQtZ3JvdXAtYnRuID4gLmJ0biB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcbi5pbnB1dC1ncm91cC1idG4gPiAuYnRuICsgLmJ0biB7XFxuICBtYXJnaW4tbGVmdDogLTFweDtcXG59XFxuLmlucHV0LWdyb3VwLWJ0biA+IC5idG46aG92ZXIsXFxuLmlucHV0LWdyb3VwLWJ0biA+IC5idG46Zm9jdXMsXFxuLmlucHV0LWdyb3VwLWJ0biA+IC5idG46YWN0aXZlIHtcXG4gIHotaW5kZXg6IDI7XFxufVxcbi5pbnB1dC1ncm91cC1idG46Zmlyc3QtY2hpbGQgPiAuYnRuLFxcbi5pbnB1dC1ncm91cC1idG46Zmlyc3QtY2hpbGQgPiAuYnRuLWdyb3VwIHtcXG4gIG1hcmdpbi1yaWdodDogLTFweDtcXG59XFxuLmlucHV0LWdyb3VwLWJ0bjpsYXN0LWNoaWxkID4gLmJ0bixcXG4uaW5wdXQtZ3JvdXAtYnRuOmxhc3QtY2hpbGQgPiAuYnRuLWdyb3VwIHtcXG4gIG1hcmdpbi1sZWZ0OiAtMXB4O1xcbn1cXG4ubmF2IHtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbn1cXG4ubmF2ID4gbGkge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5uYXYgPiBsaSA+IGEge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBwYWRkaW5nOiAxMHB4IDE1cHg7XFxufVxcbi5uYXYgPiBsaSA+IGE6aG92ZXIsXFxuLm5hdiA+IGxpID4gYTpmb2N1cyB7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlZWVlO1xcbn1cXG4ubmF2ID4gbGkuZGlzYWJsZWQgPiBhIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbn1cXG4ubmF2ID4gbGkuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbi5uYXYgPiBsaS5kaXNhYmxlZCA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIGN1cnNvcjogbm90LWFsbG93ZWQ7XFxufVxcbi5uYXYgLm9wZW4gPiBhLFxcbi5uYXYgLm9wZW4gPiBhOmhvdmVyLFxcbi5uYXYgLm9wZW4gPiBhOmZvY3VzIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZWVlZWU7XFxuICBib3JkZXItY29sb3I6ICM0MjhiY2E7XFxufVxcbi5uYXYgLm5hdi1kaXZpZGVyIHtcXG4gIGhlaWdodDogMXB4O1xcbiAgbWFyZ2luOiA5cHggMDtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZTVlNWU1O1xcbn1cXG4ubmF2ID4gbGkgPiBhID4gaW1nIHtcXG4gIG1heC13aWR0aDogbm9uZTtcXG59XFxuLm5hdi10YWJzIHtcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG4ubmF2LXRhYnMgPiBsaSB7XFxuICBmbG9hdDogbGVmdDtcXG4gIG1hcmdpbi1ib3R0b206IC0xcHg7XFxufVxcbi5uYXYtdGFicyA+IGxpID4gYSB7XFxuICBtYXJnaW4tcmlnaHQ6IDJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItcmFkaXVzOiA0cHggNHB4IDAgMDtcXG59XFxuLm5hdi10YWJzID4gbGkgPiBhOmhvdmVyIHtcXG4gIGJvcmRlci1jb2xvcjogI2VlZWVlZSAjZWVlZWVlICNkZGRkZGQ7XFxufVxcbi5uYXYtdGFicyA+IGxpLmFjdGl2ZSA+IGEsXFxuLm5hdi10YWJzID4gbGkuYWN0aXZlID4gYTpob3ZlcixcXG4ubmF2LXRhYnMgPiBsaS5hY3RpdmUgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjNTU1NTU1O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICBib3JkZXItYm90dG9tLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIGN1cnNvcjogZGVmYXVsdDtcXG59XFxuLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBib3JkZXItYm90dG9tOiAwO1xcbn1cXG4ubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IGxpIHtcXG4gIGZsb2F0OiBub25lO1xcbn1cXG4ubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IGxpID4gYSB7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICBtYXJnaW4tYm90dG9tOiA1cHg7XFxufVxcbi5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gLmRyb3Bkb3duIC5kcm9wZG93bi1tZW51IHtcXG4gIHRvcDogYXV0bztcXG4gIGxlZnQ6IGF1dG87XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiBsaSB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLWNlbGw7XFxuICAgIHdpZHRoOiAxJTtcXG4gIH1cXG4gIC5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIH1cXG59XFxuLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiBsaSA+IGEge1xcbiAgbWFyZ2luLXJpZ2h0OiAwO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4ubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhLFxcbi5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICAgIGJvcmRlci1yYWRpdXM6IDRweCA0cHggMCAwO1xcbiAgfVxcbiAgLm5hdi10YWJzLm5hdi1qdXN0aWZpZWQgPiAuYWN0aXZlID4gYSxcXG4gIC5uYXYtdGFicy5uYXYtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuICAubmF2LXRhYnMubmF2LWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhOmZvY3VzIHtcXG4gICAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2ZmZmZmZjtcXG4gIH1cXG59XFxuLm5hdi1waWxscyA+IGxpIHtcXG4gIGZsb2F0OiBsZWZ0O1xcbn1cXG4ubmF2LXBpbGxzID4gbGkgPiBhIHtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLm5hdi1waWxscyA+IGxpICsgbGkge1xcbiAgbWFyZ2luLWxlZnQ6IDJweDtcXG59XFxuLm5hdi1waWxscyA+IGxpLmFjdGl2ZSA+IGEsXFxuLm5hdi1waWxscyA+IGxpLmFjdGl2ZSA+IGE6aG92ZXIsXFxuLm5hdi1waWxscyA+IGxpLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4ubmF2LXN0YWNrZWQgPiBsaSB7XFxuICBmbG9hdDogbm9uZTtcXG59XFxuLm5hdi1zdGFja2VkID4gbGkgKyBsaSB7XFxuICBtYXJnaW4tdG9wOiAycHg7XFxuICBtYXJnaW4tbGVmdDogMDtcXG59XFxuLm5hdi1qdXN0aWZpZWQge1xcbiAgd2lkdGg6IDEwMCU7XFxufVxcbi5uYXYtanVzdGlmaWVkID4gbGkge1xcbiAgZmxvYXQ6IG5vbmU7XFxufVxcbi5uYXYtanVzdGlmaWVkID4gbGkgPiBhIHtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIG1hcmdpbi1ib3R0b206IDVweDtcXG59XFxuLm5hdi1qdXN0aWZpZWQgPiAuZHJvcGRvd24gLmRyb3Bkb3duLW1lbnUge1xcbiAgdG9wOiBhdXRvO1xcbiAgbGVmdDogYXV0bztcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2LWp1c3RpZmllZCA+IGxpIHtcXG4gICAgZGlzcGxheTogdGFibGUtY2VsbDtcXG4gICAgd2lkdGg6IDElO1xcbiAgfVxcbiAgLm5hdi1qdXN0aWZpZWQgPiBsaSA+IGEge1xcbiAgICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgfVxcbn1cXG4ubmF2LXRhYnMtanVzdGlmaWVkIHtcXG4gIGJvcmRlci1ib3R0b206IDA7XFxufVxcbi5uYXYtdGFicy1qdXN0aWZpZWQgPiBsaSA+IGEge1xcbiAgbWFyZ2luLXJpZ2h0OiAwO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4ubmF2LXRhYnMtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGEsXFxuLm5hdi10YWJzLWp1c3RpZmllZCA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbi5uYXYtdGFicy1qdXN0aWZpZWQgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXYtdGFicy1qdXN0aWZpZWQgPiBsaSA+IGEge1xcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2RkZGRkZDtcXG4gICAgYm9yZGVyLXJhZGl1czogNHB4IDRweCAwIDA7XFxuICB9XFxuICAubmF2LXRhYnMtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGEsXFxuICAubmF2LXRhYnMtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuICAubmF2LXRhYnMtanVzdGlmaWVkID4gLmFjdGl2ZSA+IGE6Zm9jdXMge1xcbiAgICBib3JkZXItYm90dG9tLWNvbG9yOiAjZmZmZmZmO1xcbiAgfVxcbn1cXG4udGFiLWNvbnRlbnQgPiAudGFiLXBhbmUge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLnRhYi1jb250ZW50ID4gLmFjdGl2ZSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuLm5hdi10YWJzIC5kcm9wZG93bi1tZW51IHtcXG4gIG1hcmdpbi10b3A6IC0xcHg7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7XFxufVxcbi5uYXZiYXIge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgbWluLWhlaWdodDogNTBweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyIHtcXG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItaGVhZGVyIHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICB9XFxufVxcbi5uYXZiYXItY29sbGFwc2Uge1xcbiAgbWF4LWhlaWdodDogMzQwcHg7XFxuICBvdmVyZmxvdy14OiB2aXNpYmxlO1xcbiAgcGFkZGluZy1yaWdodDogMTVweDtcXG4gIHBhZGRpbmctbGVmdDogMTVweDtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDAgMXB4IDAgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpO1xcbiAgLXdlYmtpdC1vdmVyZmxvdy1zY3JvbGxpbmc6IHRvdWNoO1xcbn1cXG4ubmF2YmFyLWNvbGxhcHNlLmluIHtcXG4gIG92ZXJmbG93LXk6IGF1dG87XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhci1jb2xsYXBzZSB7XFxuICAgIHdpZHRoOiBhdXRvO1xcbiAgICBib3JkZXItdG9wOiAwO1xcbiAgICBib3gtc2hhZG93OiBub25lO1xcbiAgfVxcbiAgLm5hdmJhci1jb2xsYXBzZS5jb2xsYXBzZSB7XFxuICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7XFxuICAgIGhlaWdodDogYXV0byAhaW1wb3J0YW50O1xcbiAgICBwYWRkaW5nLWJvdHRvbTogMDtcXG4gICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcXG4gIH1cXG4gIC5uYXZiYXItY29sbGFwc2UuaW4ge1xcbiAgICBvdmVyZmxvdy15OiB2aXNpYmxlO1xcbiAgfVxcbiAgLm5hdmJhci1maXhlZC10b3AgLm5hdmJhci1jb2xsYXBzZSxcXG4gIC5uYXZiYXItc3RhdGljLXRvcCAubmF2YmFyLWNvbGxhcHNlLFxcbiAgLm5hdmJhci1maXhlZC1ib3R0b20gLm5hdmJhci1jb2xsYXBzZSB7XFxuICAgIHBhZGRpbmctbGVmdDogMDtcXG4gICAgcGFkZGluZy1yaWdodDogMDtcXG4gIH1cXG59XFxuLmNvbnRhaW5lciA+IC5uYXZiYXItaGVhZGVyLFxcbi5jb250YWluZXItZmx1aWQgPiAubmF2YmFyLWhlYWRlcixcXG4uY29udGFpbmVyID4gLm5hdmJhci1jb2xsYXBzZSxcXG4uY29udGFpbmVyLWZsdWlkID4gLm5hdmJhci1jb2xsYXBzZSB7XFxuICBtYXJnaW4tcmlnaHQ6IC0xNXB4O1xcbiAgbWFyZ2luLWxlZnQ6IC0xNXB4O1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5jb250YWluZXIgPiAubmF2YmFyLWhlYWRlcixcXG4gIC5jb250YWluZXItZmx1aWQgPiAubmF2YmFyLWhlYWRlcixcXG4gIC5jb250YWluZXIgPiAubmF2YmFyLWNvbGxhcHNlLFxcbiAgLmNvbnRhaW5lci1mbHVpZCA+IC5uYXZiYXItY29sbGFwc2Uge1xcbiAgICBtYXJnaW4tcmlnaHQ6IDA7XFxuICAgIG1hcmdpbi1sZWZ0OiAwO1xcbiAgfVxcbn1cXG4ubmF2YmFyLXN0YXRpYy10b3Age1xcbiAgei1pbmRleDogMTAwMDtcXG4gIGJvcmRlci13aWR0aDogMCAwIDFweDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLXN0YXRpYy10b3Age1xcbiAgICBib3JkZXItcmFkaXVzOiAwO1xcbiAgfVxcbn1cXG4ubmF2YmFyLWZpeGVkLXRvcCxcXG4ubmF2YmFyLWZpeGVkLWJvdHRvbSB7XFxuICBwb3NpdGlvbjogZml4ZWQ7XFxuICByaWdodDogMDtcXG4gIGxlZnQ6IDA7XFxuICB6LWluZGV4OiAxMDMwO1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItZml4ZWQtdG9wLFxcbiAgLm5hdmJhci1maXhlZC1ib3R0b20ge1xcbiAgICBib3JkZXItcmFkaXVzOiAwO1xcbiAgfVxcbn1cXG4ubmF2YmFyLWZpeGVkLXRvcCB7XFxuICB0b3A6IDA7XFxuICBib3JkZXItd2lkdGg6IDAgMCAxcHg7XFxufVxcbi5uYXZiYXItZml4ZWQtYm90dG9tIHtcXG4gIGJvdHRvbTogMDtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBib3JkZXItd2lkdGg6IDFweCAwIDA7XFxufVxcbi5uYXZiYXItYnJhbmQge1xcbiAgZmxvYXQ6IGxlZnQ7XFxuICBwYWRkaW5nOiAxNXB4IDE1cHg7XFxuICBmb250LXNpemU6IDE4cHg7XFxuICBsaW5lLWhlaWdodDogMjBweDtcXG4gIGhlaWdodDogNTBweDtcXG59XFxuLm5hdmJhci1icmFuZDpob3ZlcixcXG4ubmF2YmFyLWJyYW5kOmZvY3VzIHtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyID4gLmNvbnRhaW5lciAubmF2YmFyLWJyYW5kLFxcbiAgLm5hdmJhciA+IC5jb250YWluZXItZmx1aWQgLm5hdmJhci1icmFuZCB7XFxuICAgIG1hcmdpbi1sZWZ0OiAtMTVweDtcXG4gIH1cXG59XFxuLm5hdmJhci10b2dnbGUge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZmxvYXQ6IHJpZ2h0O1xcbiAgbWFyZ2luLXJpZ2h0OiAxNXB4O1xcbiAgcGFkZGluZzogOXB4IDEwcHg7XFxuICBtYXJnaW4tdG9wOiA4cHg7XFxuICBtYXJnaW4tYm90dG9tOiA4cHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IG5vbmU7XFxuICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLm5hdmJhci10b2dnbGU6Zm9jdXMge1xcbiAgb3V0bGluZTogbm9uZTtcXG59XFxuLm5hdmJhci10b2dnbGUgLmljb24tYmFyIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgd2lkdGg6IDIycHg7XFxuICBoZWlnaHQ6IDJweDtcXG4gIGJvcmRlci1yYWRpdXM6IDFweDtcXG59XFxuLm5hdmJhci10b2dnbGUgLmljb24tYmFyICsgLmljb24tYmFyIHtcXG4gIG1hcmdpbi10b3A6IDRweDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubmF2YmFyLXRvZ2dsZSB7XFxuICAgIGRpc3BsYXk6IG5vbmU7XFxuICB9XFxufVxcbi5uYXZiYXItbmF2IHtcXG4gIG1hcmdpbjogNy41cHggLTE1cHg7XFxufVxcbi5uYXZiYXItbmF2ID4gbGkgPiBhIHtcXG4gIHBhZGRpbmctdG9wOiAxMHB4O1xcbiAgcGFkZGluZy1ib3R0b206IDEwcHg7XFxuICBsaW5lLWhlaWdodDogMjBweDtcXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XFxuICAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSB7XFxuICAgIHBvc2l0aW9uOiBzdGF0aWM7XFxuICAgIGZsb2F0OiBub25lO1xcbiAgICB3aWR0aDogYXV0bztcXG4gICAgbWFyZ2luLXRvcDogMDtcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICAgIGJvcmRlcjogMDtcXG4gICAgYm94LXNoYWRvdzogbm9uZTtcXG4gIH1cXG4gIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhLFxcbiAgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgLmRyb3Bkb3duLWhlYWRlciB7XFxuICAgIHBhZGRpbmc6IDVweCAxNXB4IDVweCAyNXB4O1xcbiAgfVxcbiAgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGEge1xcbiAgICBsaW5lLWhlaWdodDogMjBweDtcXG4gIH1cXG4gIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhOmhvdmVyLFxcbiAgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGE6Zm9jdXMge1xcbiAgICBiYWNrZ3JvdW5kLWltYWdlOiBub25lO1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItbmF2IHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICAgIG1hcmdpbjogMDtcXG4gIH1cXG4gIC5uYXZiYXItbmF2ID4gbGkge1xcbiAgICBmbG9hdDogbGVmdDtcXG4gIH1cXG4gIC5uYXZiYXItbmF2ID4gbGkgPiBhIHtcXG4gICAgcGFkZGluZy10b3A6IDE1cHg7XFxuICAgIHBhZGRpbmctYm90dG9tOiAxNXB4O1xcbiAgfVxcbiAgLm5hdmJhci1uYXYubmF2YmFyLXJpZ2h0Omxhc3QtY2hpbGQge1xcbiAgICBtYXJnaW4tcmlnaHQ6IC0xNXB4O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItbGVmdCB7XFxuICAgIGZsb2F0OiBsZWZ0ICFpbXBvcnRhbnQ7XFxuICB9XFxuICAubmF2YmFyLXJpZ2h0IHtcXG4gICAgZmxvYXQ6IHJpZ2h0ICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbi5uYXZiYXItZm9ybSB7XFxuICBtYXJnaW4tbGVmdDogLTE1cHg7XFxuICBtYXJnaW4tcmlnaHQ6IC0xNXB4O1xcbiAgcGFkZGluZzogMTBweCAxNXB4O1xcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAwIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSwgMCAxcHggMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAwIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSwgMCAxcHggMCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSk7XFxuICBtYXJnaW4tdG9wOiA4cHg7XFxuICBtYXJnaW4tYm90dG9tOiA4cHg7XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhci1mb3JtIC5mb3JtLWdyb3VwIHtcXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLm5hdmJhci1mb3JtIC5mb3JtLWNvbnRyb2wge1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIHdpZHRoOiBhdXRvO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLm5hdmJhci1mb3JtIC5pbnB1dC1ncm91cCA+IC5mb3JtLWNvbnRyb2wge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gIH1cXG4gIC5uYXZiYXItZm9ybSAuY29udHJvbC1sYWJlbCB7XFxuICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICB9XFxuICAubmF2YmFyLWZvcm0gLnJhZGlvLFxcbiAgLm5hdmJhci1mb3JtIC5jaGVja2JveCB7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgbWFyZ2luLXRvcDogMDtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gICAgcGFkZGluZy1sZWZ0OiAwO1xcbiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgfVxcbiAgLm5hdmJhci1mb3JtIC5yYWRpbyBpbnB1dFt0eXBlPVxcXCJyYWRpb1xcXCJdLFxcbiAgLm5hdmJhci1mb3JtIC5jaGVja2JveCBpbnB1dFt0eXBlPVxcXCJjaGVja2JveFxcXCJdIHtcXG4gICAgZmxvYXQ6IG5vbmU7XFxuICAgIG1hcmdpbi1sZWZ0OiAwO1xcbiAgfVxcbiAgLm5hdmJhci1mb3JtIC5oYXMtZmVlZGJhY2sgLmZvcm0tY29udHJvbC1mZWVkYmFjayB7XFxuICAgIHRvcDogMDtcXG4gIH1cXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XFxuICAubmF2YmFyLWZvcm0gLmZvcm0tZ3JvdXAge1xcbiAgICBtYXJnaW4tYm90dG9tOiA1cHg7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkge1xcbiAgLm5hdmJhci1mb3JtIHtcXG4gICAgd2lkdGg6IGF1dG87XFxuICAgIGJvcmRlcjogMDtcXG4gICAgbWFyZ2luLWxlZnQ6IDA7XFxuICAgIG1hcmdpbi1yaWdodDogMDtcXG4gICAgcGFkZGluZy10b3A6IDA7XFxuICAgIHBhZGRpbmctYm90dG9tOiAwO1xcbiAgICAtd2Via2l0LWJveC1zaGFkb3c6IG5vbmU7XFxuICAgIGJveC1zaGFkb3c6IG5vbmU7XFxuICB9XFxuICAubmF2YmFyLWZvcm0ubmF2YmFyLXJpZ2h0Omxhc3QtY2hpbGQge1xcbiAgICBtYXJnaW4tcmlnaHQ6IC0xNXB4O1xcbiAgfVxcbn1cXG4ubmF2YmFyLW5hdiA+IGxpID4gLmRyb3Bkb3duLW1lbnUge1xcbiAgbWFyZ2luLXRvcDogMDtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogMDtcXG59XFxuLm5hdmJhci1maXhlZC1ib3R0b20gLm5hdmJhci1uYXYgPiBsaSA+IC5kcm9wZG93bi1tZW51IHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAwO1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogMDtcXG59XFxuLm5hdmJhci1idG4ge1xcbiAgbWFyZ2luLXRvcDogOHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogOHB4O1xcbn1cXG4ubmF2YmFyLWJ0bi5idG4tc20ge1xcbiAgbWFyZ2luLXRvcDogMTBweDtcXG4gIG1hcmdpbi1ib3R0b206IDEwcHg7XFxufVxcbi5uYXZiYXItYnRuLmJ0bi14cyB7XFxuICBtYXJnaW4tdG9wOiAxNHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMTRweDtcXG59XFxuLm5hdmJhci10ZXh0IHtcXG4gIG1hcmdpbi10b3A6IDE1cHg7XFxuICBtYXJnaW4tYm90dG9tOiAxNXB4O1xcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5uYXZiYXItdGV4dCB7XFxuICAgIGZsb2F0OiBsZWZ0O1xcbiAgICBtYXJnaW4tbGVmdDogMTVweDtcXG4gICAgbWFyZ2luLXJpZ2h0OiAxNXB4O1xcbiAgfVxcbiAgLm5hdmJhci10ZXh0Lm5hdmJhci1yaWdodDpsYXN0LWNoaWxkIHtcXG4gICAgbWFyZ2luLXJpZ2h0OiAwO1xcbiAgfVxcbn1cXG4ubmF2YmFyLWRlZmF1bHQge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODtcXG4gIGJvcmRlci1jb2xvcjogI2U3ZTdlNztcXG59XFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItYnJhbmQge1xcbiAgY29sb3I6ICM3Nzc3Nzc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLWJyYW5kOmhvdmVyLFxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLWJyYW5kOmZvY3VzIHtcXG4gIGNvbG9yOiAjNWU1ZTVlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLXRleHQge1xcbiAgY29sb3I6ICM3Nzc3Nzc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IGxpID4gYSB7XFxuICBjb2xvcjogIzc3Nzc3NztcXG59XFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gbGkgPiBhOmhvdmVyLFxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IGxpID4gYTpmb2N1cyB7XFxuICBjb2xvcjogIzMzMzMzMztcXG4gIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAuYWN0aXZlID4gYSxcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAuYWN0aXZlID4gYTpob3ZlcixcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICBjb2xvcjogIzU1NTU1NTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlN2U3ZTc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IC5kaXNhYmxlZCA+IGEsXFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLmRpc2FibGVkID4gYTpob3ZlcixcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAuZGlzYWJsZWQgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjY2NjY2NjO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLXRvZ2dsZSB7XFxuICBib3JkZXItY29sb3I6ICNkZGRkZGQ7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLXRvZ2dsZTpob3ZlcixcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci10b2dnbGU6Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2RkZGRkZDtcXG59XFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItdG9nZ2xlIC5pY29uLWJhciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjODg4ODg4O1xcbn1cXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1jb2xsYXBzZSxcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1mb3JtIHtcXG4gIGJvcmRlci1jb2xvcjogI2U3ZTdlNztcXG59XFxuLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2ID4gLm9wZW4gPiBhLFxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiA+IC5vcGVuID4gYTpob3ZlcixcXG4ubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgPiAub3BlbiA+IGE6Zm9jdXMge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2U3ZTdlNztcXG4gIGNvbG9yOiAjNTU1NTU1O1xcbn1cXG5AbWVkaWEgKG1heC13aWR0aDogNzY3cHgpIHtcXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYSB7XFxuICAgIGNvbG9yOiAjNzc3Nzc3O1xcbiAgfVxcbiAgLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhOmhvdmVyLFxcbiAgLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gbGkgPiBhOmZvY3VzIHtcXG4gICAgY29sb3I6ICMzMzMzMzM7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgfVxcbiAgLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZSA+IGEsXFxuICAubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuYWN0aXZlID4gYTpob3ZlcixcXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5hY3RpdmUgPiBhOmZvY3VzIHtcXG4gICAgY29sb3I6ICM1NTU1NTU7XFxuICAgIGJhY2tncm91bmQtY29sb3I6ICNlN2U3ZTc7XFxuICB9XFxuICAubmF2YmFyLWRlZmF1bHQgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhLFxcbiAgLm5hdmJhci1kZWZhdWx0IC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYTpob3ZlcixcXG4gIC5uYXZiYXItZGVmYXVsdCAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGE6Zm9jdXMge1xcbiAgICBjb2xvcjogI2NjY2NjYztcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICB9XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLWxpbmsge1xcbiAgY29sb3I6ICM3Nzc3Nzc7XFxufVxcbi5uYXZiYXItZGVmYXVsdCAubmF2YmFyLWxpbms6aG92ZXIge1xcbiAgY29sb3I6ICMzMzMzMzM7XFxufVxcbi5uYXZiYXItaW52ZXJzZSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjIyMjIyO1xcbiAgYm9yZGVyLWNvbG9yOiAjMDgwODA4O1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1icmFuZCB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItYnJhbmQ6aG92ZXIsXFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItYnJhbmQ6Zm9jdXMge1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItdGV4dCB7XFxuICBjb2xvcjogIzk5OTk5OTtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gbGkgPiBhIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiBsaSA+IGE6aG92ZXIsXFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gbGkgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5hY3RpdmUgPiBhLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5hY3RpdmUgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzA4MDgwODtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gLmRpc2FibGVkID4gYSxcXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5kaXNhYmxlZCA+IGE6Zm9jdXMge1xcbiAgY29sb3I6ICM0NDQ0NDQ7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItdG9nZ2xlIHtcXG4gIGJvcmRlci1jb2xvcjogIzMzMzMzMztcXG59XFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItdG9nZ2xlOmhvdmVyLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLXRvZ2dsZTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzMzMzMzO1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci10b2dnbGUgLmljb24tYmFyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxufVxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLWNvbGxhcHNlLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLWZvcm0ge1xcbiAgYm9yZGVyLWNvbG9yOiAjMTAxMDEwO1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgPiAub3BlbiA+IGEsXFxuLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2ID4gLm9wZW4gPiBhOmhvdmVyLFxcbi5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiA+IC5vcGVuID4gYTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDgwODA4O1xcbiAgY29sb3I6ICNmZmZmZmY7XFxufVxcbkBtZWRpYSAobWF4LXdpZHRoOiA3NjdweCkge1xcbiAgLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmRyb3Bkb3duLWhlYWRlciB7XFxuICAgIGJvcmRlci1jb2xvcjogIzA4MDgwODtcXG4gIH1cXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSAuZGl2aWRlciB7XFxuICAgIGJhY2tncm91bmQtY29sb3I6ICMwODA4MDg7XFxuICB9XFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiBsaSA+IGEge1xcbiAgICBjb2xvcjogIzk5OTk5OTtcXG4gIH1cXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYTpob3ZlcixcXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IGxpID4gYTpmb2N1cyB7XFxuICAgIGNvbG9yOiAjZmZmZmZmO1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIH1cXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5hY3RpdmUgPiBhLFxcbiAgLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZSA+IGE6aG92ZXIsXFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuYWN0aXZlID4gYTpmb2N1cyB7XFxuICAgIGNvbG9yOiAjZmZmZmZmO1xcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDgwODA4O1xcbiAgfVxcbiAgLm5hdmJhci1pbnZlcnNlIC5uYXZiYXItbmF2IC5vcGVuIC5kcm9wZG93bi1tZW51ID4gLmRpc2FibGVkID4gYSxcXG4gIC5uYXZiYXItaW52ZXJzZSAubmF2YmFyLW5hdiAub3BlbiAuZHJvcGRvd24tbWVudSA+IC5kaXNhYmxlZCA+IGE6aG92ZXIsXFxuICAubmF2YmFyLWludmVyc2UgLm5hdmJhci1uYXYgLm9wZW4gLmRyb3Bkb3duLW1lbnUgPiAuZGlzYWJsZWQgPiBhOmZvY3VzIHtcXG4gICAgY29sb3I6ICM0NDQ0NDQ7XFxuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xcbiAgfVxcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1saW5rIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbn1cXG4ubmF2YmFyLWludmVyc2UgLm5hdmJhci1saW5rOmhvdmVyIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uYnJlYWRjcnVtYiB7XFxuICBwYWRkaW5nOiA4cHggMTVweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLmJyZWFkY3J1bWIgPiBsaSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxufVxcbi5icmVhZGNydW1iID4gbGkgKyBsaTpiZWZvcmUge1xcbiAgY29udGVudDogXFxcIi9cXFxcMDBhMFxcXCI7XFxuICBwYWRkaW5nOiAwIDVweDtcXG4gIGNvbG9yOiAjY2NjY2NjO1xcbn1cXG4uYnJlYWRjcnVtYiA+IC5hY3RpdmUge1xcbiAgY29sb3I6ICM5OTk5OTk7XFxufVxcbi5wYWdpbmF0aW9uIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHBhZGRpbmctbGVmdDogMDtcXG4gIG1hcmdpbjogMjBweCAwO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4ucGFnaW5hdGlvbiA+IGxpIHtcXG4gIGRpc3BsYXk6IGlubGluZTtcXG59XFxuLnBhZ2luYXRpb24gPiBsaSA+IGEsXFxuLnBhZ2luYXRpb24gPiBsaSA+IHNwYW4ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgZmxvYXQ6IGxlZnQ7XFxuICBwYWRkaW5nOiA2cHggMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgY29sb3I6ICM0MjhiY2E7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2RkZGRkZDtcXG4gIG1hcmdpbi1sZWZ0OiAtMXB4O1xcbn1cXG4ucGFnaW5hdGlvbiA+IGxpOmZpcnN0LWNoaWxkID4gYSxcXG4ucGFnaW5hdGlvbiA+IGxpOmZpcnN0LWNoaWxkID4gc3BhbiB7XFxuICBtYXJnaW4tbGVmdDogMDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDRweDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDRweDtcXG59XFxuLnBhZ2luYXRpb24gPiBsaTpsYXN0LWNoaWxkID4gYSxcXG4ucGFnaW5hdGlvbiA+IGxpOmxhc3QtY2hpbGQgPiBzcGFuIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiA0cHg7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogNHB4O1xcbn1cXG4ucGFnaW5hdGlvbiA+IGxpID4gYTpob3ZlcixcXG4ucGFnaW5hdGlvbiA+IGxpID4gc3Bhbjpob3ZlcixcXG4ucGFnaW5hdGlvbiA+IGxpID4gYTpmb2N1cyxcXG4ucGFnaW5hdGlvbiA+IGxpID4gc3Bhbjpmb2N1cyB7XFxuICBjb2xvcjogIzJhNjQ5NjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZWVlZWU7XFxuICBib3JkZXItY29sb3I6ICNkZGRkZGQ7XFxufVxcbi5wYWdpbmF0aW9uID4gLmFjdGl2ZSA+IGEsXFxuLnBhZ2luYXRpb24gPiAuYWN0aXZlID4gc3BhbixcXG4ucGFnaW5hdGlvbiA+IC5hY3RpdmUgPiBhOmhvdmVyLFxcbi5wYWdpbmF0aW9uID4gLmFjdGl2ZSA+IHNwYW46aG92ZXIsXFxuLnBhZ2luYXRpb24gPiAuYWN0aXZlID4gYTpmb2N1cyxcXG4ucGFnaW5hdGlvbiA+IC5hY3RpdmUgPiBzcGFuOmZvY3VzIHtcXG4gIHotaW5kZXg6IDI7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM0MjhiY2E7XFxuICBib3JkZXItY29sb3I6ICM0MjhiY2E7XFxuICBjdXJzb3I6IGRlZmF1bHQ7XFxufVxcbi5wYWdpbmF0aW9uID4gLmRpc2FibGVkID4gc3BhbixcXG4ucGFnaW5hdGlvbiA+IC5kaXNhYmxlZCA+IHNwYW46aG92ZXIsXFxuLnBhZ2luYXRpb24gPiAuZGlzYWJsZWQgPiBzcGFuOmZvY3VzLFxcbi5wYWdpbmF0aW9uID4gLmRpc2FibGVkID4gYSxcXG4ucGFnaW5hdGlvbiA+IC5kaXNhYmxlZCA+IGE6aG92ZXIsXFxuLnBhZ2luYXRpb24gPiAuZGlzYWJsZWQgPiBhOmZvY3VzIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlci1jb2xvcjogI2RkZGRkZDtcXG4gIGN1cnNvcjogbm90LWFsbG93ZWQ7XFxufVxcbi5wYWdpbmF0aW9uLWxnID4gbGkgPiBhLFxcbi5wYWdpbmF0aW9uLWxnID4gbGkgPiBzcGFuIHtcXG4gIHBhZGRpbmc6IDEwcHggMTZweDtcXG4gIGZvbnQtc2l6ZTogMThweDtcXG59XFxuLnBhZ2luYXRpb24tbGcgPiBsaTpmaXJzdC1jaGlsZCA+IGEsXFxuLnBhZ2luYXRpb24tbGcgPiBsaTpmaXJzdC1jaGlsZCA+IHNwYW4ge1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogNnB4O1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogNnB4O1xcbn1cXG4ucGFnaW5hdGlvbi1sZyA+IGxpOmxhc3QtY2hpbGQgPiBhLFxcbi5wYWdpbmF0aW9uLWxnID4gbGk6bGFzdC1jaGlsZCA+IHNwYW4ge1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDZweDtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiA2cHg7XFxufVxcbi5wYWdpbmF0aW9uLXNtID4gbGkgPiBhLFxcbi5wYWdpbmF0aW9uLXNtID4gbGkgPiBzcGFuIHtcXG4gIHBhZGRpbmc6IDVweCAxMHB4O1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbn1cXG4ucGFnaW5hdGlvbi1zbSA+IGxpOmZpcnN0LWNoaWxkID4gYSxcXG4ucGFnaW5hdGlvbi1zbSA+IGxpOmZpcnN0LWNoaWxkID4gc3BhbiB7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiAzcHg7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAzcHg7XFxufVxcbi5wYWdpbmF0aW9uLXNtID4gbGk6bGFzdC1jaGlsZCA+IGEsXFxuLnBhZ2luYXRpb24tc20gPiBsaTpsYXN0LWNoaWxkID4gc3BhbiB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogM3B4O1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDNweDtcXG59XFxuLnBhZ2VyIHtcXG4gIHBhZGRpbmctbGVmdDogMDtcXG4gIG1hcmdpbjogMjBweCAwO1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG59XFxuLnBhZ2VyIGxpIHtcXG4gIGRpc3BsYXk6IGlubGluZTtcXG59XFxuLnBhZ2VyIGxpID4gYSxcXG4ucGFnZXIgbGkgPiBzcGFuIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHBhZGRpbmc6IDVweCAxNHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICBib3JkZXItcmFkaXVzOiAxNXB4O1xcbn1cXG4ucGFnZXIgbGkgPiBhOmhvdmVyLFxcbi5wYWdlciBsaSA+IGE6Zm9jdXMge1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VlZWVlZTtcXG59XFxuLnBhZ2VyIC5uZXh0ID4gYSxcXG4ucGFnZXIgLm5leHQgPiBzcGFuIHtcXG4gIGZsb2F0OiByaWdodDtcXG59XFxuLnBhZ2VyIC5wcmV2aW91cyA+IGEsXFxuLnBhZ2VyIC5wcmV2aW91cyA+IHNwYW4ge1xcbiAgZmxvYXQ6IGxlZnQ7XFxufVxcbi5wYWdlciAuZGlzYWJsZWQgPiBhLFxcbi5wYWdlciAuZGlzYWJsZWQgPiBhOmhvdmVyLFxcbi5wYWdlciAuZGlzYWJsZWQgPiBhOmZvY3VzLFxcbi5wYWdlciAuZGlzYWJsZWQgPiBzcGFuIHtcXG4gIGNvbG9yOiAjOTk5OTk5O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGN1cnNvcjogbm90LWFsbG93ZWQ7XFxufVxcbi5sYWJlbCB7XFxuICBkaXNwbGF5OiBpbmxpbmU7XFxuICBwYWRkaW5nOiAuMmVtIC42ZW0gLjNlbTtcXG4gIGZvbnQtc2l6ZTogNzUlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICBsaW5lLWhlaWdodDogMTtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG4gIHZlcnRpY2FsLWFsaWduOiBiYXNlbGluZTtcXG4gIGJvcmRlci1yYWRpdXM6IC4yNWVtO1xcbn1cXG4ubGFiZWxbaHJlZl06aG92ZXIsXFxuLmxhYmVsW2hyZWZdOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG4ubGFiZWw6ZW1wdHkge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLmJ0biAubGFiZWwge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgdG9wOiAtMXB4O1xcbn1cXG4ubGFiZWwtZGVmYXVsdCB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjOTk5OTk5O1xcbn1cXG4ubGFiZWwtZGVmYXVsdFtocmVmXTpob3ZlcixcXG4ubGFiZWwtZGVmYXVsdFtocmVmXTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjODA4MDgwO1xcbn1cXG4ubGFiZWwtcHJpbWFyeSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4ubGFiZWwtcHJpbWFyeVtocmVmXTpob3ZlcixcXG4ubGFiZWwtcHJpbWFyeVtocmVmXTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzA3MWE5O1xcbn1cXG4ubGFiZWwtc3VjY2VzcyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWNiODVjO1xcbn1cXG4ubGFiZWwtc3VjY2Vzc1tocmVmXTpob3ZlcixcXG4ubGFiZWwtc3VjY2Vzc1tocmVmXTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDQ5ZDQ0O1xcbn1cXG4ubGFiZWwtaW5mbyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNWJjMGRlO1xcbn1cXG4ubGFiZWwtaW5mb1tocmVmXTpob3ZlcixcXG4ubGFiZWwtaW5mb1tocmVmXTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzFiMGQ1O1xcbn1cXG4ubGFiZWwtd2FybmluZyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjBhZDRlO1xcbn1cXG4ubGFiZWwtd2FybmluZ1tocmVmXTpob3ZlcixcXG4ubGFiZWwtd2FybmluZ1tocmVmXTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWM5NzFmO1xcbn1cXG4ubGFiZWwtZGFuZ2VyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOTUzNGY7XFxufVxcbi5sYWJlbC1kYW5nZXJbaHJlZl06aG92ZXIsXFxuLmxhYmVsLWRhbmdlcltocmVmXTpmb2N1cyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjYzkzMDJjO1xcbn1cXG4uYmFkZ2Uge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgbWluLXdpZHRoOiAxMHB4O1xcbiAgcGFkZGluZzogM3B4IDdweDtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICBsaW5lLWhlaWdodDogMTtcXG4gIHZlcnRpY2FsLWFsaWduOiBiYXNlbGluZTtcXG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjOTk5OTk5O1xcbiAgYm9yZGVyLXJhZGl1czogMTBweDtcXG59XFxuLmJhZGdlOmVtcHR5IHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxufVxcbi5idG4gLmJhZGdlIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHRvcDogLTFweDtcXG59XFxuLmJ0bi14cyAuYmFkZ2Uge1xcbiAgdG9wOiAwO1xcbiAgcGFkZGluZzogMXB4IDVweDtcXG59XFxuYS5iYWRnZTpob3ZlcixcXG5hLmJhZGdlOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmUgPiAuYmFkZ2UsXFxuLm5hdi1waWxscyA+IC5hY3RpdmUgPiBhID4gLmJhZGdlIHtcXG4gIGNvbG9yOiAjNDI4YmNhO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLm5hdi1waWxscyA+IGxpID4gYSA+IC5iYWRnZSB7XFxuICBtYXJnaW4tbGVmdDogM3B4O1xcbn1cXG4uanVtYm90cm9uIHtcXG4gIHBhZGRpbmc6IDMwcHg7XFxuICBtYXJnaW4tYm90dG9tOiAzMHB4O1xcbiAgY29sb3I6IGluaGVyaXQ7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlZWVlO1xcbn1cXG4uanVtYm90cm9uIGgxLFxcbi5qdW1ib3Ryb24gLmgxIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG4uanVtYm90cm9uIHAge1xcbiAgbWFyZ2luLWJvdHRvbTogMTVweDtcXG4gIGZvbnQtc2l6ZTogMjFweDtcXG4gIGZvbnQtd2VpZ2h0OiAyMDA7XFxufVxcbi5jb250YWluZXIgLmp1bWJvdHJvbiB7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxufVxcbi5qdW1ib3Ryb24gLmNvbnRhaW5lciB7XFxuICBtYXgtd2lkdGg6IDEwMCU7XFxufVxcbkBtZWRpYSBzY3JlZW4gYW5kIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAuanVtYm90cm9uIHtcXG4gICAgcGFkZGluZy10b3A6IDQ4cHg7XFxuICAgIHBhZGRpbmctYm90dG9tOiA0OHB4O1xcbiAgfVxcbiAgLmNvbnRhaW5lciAuanVtYm90cm9uIHtcXG4gICAgcGFkZGluZy1sZWZ0OiA2MHB4O1xcbiAgICBwYWRkaW5nLXJpZ2h0OiA2MHB4O1xcbiAgfVxcbiAgLmp1bWJvdHJvbiBoMSxcXG4gIC5qdW1ib3Ryb24gLmgxIHtcXG4gICAgZm9udC1zaXplOiA2M3B4O1xcbiAgfVxcbn1cXG4udGh1bWJuYWlsIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZzogNHB4O1xcbiAgbWFyZ2luLWJvdHRvbTogMjBweDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxuICAtd2Via2l0LXRyYW5zaXRpb246IGFsbCAwLjJzIGVhc2UtaW4tb3V0O1xcbiAgdHJhbnNpdGlvbjogYWxsIDAuMnMgZWFzZS1pbi1vdXQ7XFxufVxcbi50aHVtYm5haWwgPiBpbWcsXFxuLnRodW1ibmFpbCBhID4gaW1nIHtcXG4gIG1hcmdpbi1sZWZ0OiBhdXRvO1xcbiAgbWFyZ2luLXJpZ2h0OiBhdXRvO1xcbn1cXG5hLnRodW1ibmFpbDpob3ZlcixcXG5hLnRodW1ibmFpbDpmb2N1cyxcXG5hLnRodW1ibmFpbC5hY3RpdmUge1xcbiAgYm9yZGVyLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4udGh1bWJuYWlsIC5jYXB0aW9uIHtcXG4gIHBhZGRpbmc6IDlweDtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbn1cXG4uYWxlcnQge1xcbiAgcGFkZGluZzogMTVweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG59XFxuLmFsZXJ0IGg0IHtcXG4gIG1hcmdpbi10b3A6IDA7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuLmFsZXJ0IC5hbGVydC1saW5rIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG4uYWxlcnQgPiBwLFxcbi5hbGVydCA+IHVsIHtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxufVxcbi5hbGVydCA+IHAgKyBwIHtcXG4gIG1hcmdpbi10b3A6IDVweDtcXG59XFxuLmFsZXJ0LWRpc21pc3NhYmxlIHtcXG4gIHBhZGRpbmctcmlnaHQ6IDM1cHg7XFxufVxcbi5hbGVydC1kaXNtaXNzYWJsZSAuY2xvc2Uge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgdG9wOiAtMnB4O1xcbiAgcmlnaHQ6IC0yMXB4O1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbi5hbGVydC1zdWNjZXNzIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkZmYwZDg7XFxuICBib3JkZXItY29sb3I6ICNkNmU5YzY7XFxuICBjb2xvcjogIzNjNzYzZDtcXG59XFxuLmFsZXJ0LXN1Y2Nlc3MgaHIge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2M5ZTJiMztcXG59XFxuLmFsZXJ0LXN1Y2Nlc3MgLmFsZXJ0LWxpbmsge1xcbiAgY29sb3I6ICMyYjU0MmM7XFxufVxcbi5hbGVydC1pbmZvIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkOWVkZjc7XFxuICBib3JkZXItY29sb3I6ICNiY2U4ZjE7XFxuICBjb2xvcjogIzMxNzA4ZjtcXG59XFxuLmFsZXJ0LWluZm8gaHIge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2E2ZTFlYztcXG59XFxuLmFsZXJ0LWluZm8gLmFsZXJ0LWxpbmsge1xcbiAgY29sb3I6ICMyNDUyNjk7XFxufVxcbi5hbGVydC13YXJuaW5nIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmY2Y4ZTM7XFxuICBib3JkZXItY29sb3I6ICNmYWViY2M7XFxuICBjb2xvcjogIzhhNmQzYjtcXG59XFxuLmFsZXJ0LXdhcm5pbmcgaHIge1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogI2Y3ZTFiNTtcXG59XFxuLmFsZXJ0LXdhcm5pbmcgLmFsZXJ0LWxpbmsge1xcbiAgY29sb3I6ICM2NjUxMmM7XFxufVxcbi5hbGVydC1kYW5nZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2YyZGVkZTtcXG4gIGJvcmRlci1jb2xvcjogI2ViY2NkMTtcXG4gIGNvbG9yOiAjYTk0NDQyO1xcbn1cXG4uYWxlcnQtZGFuZ2VyIGhyIHtcXG4gIGJvcmRlci10b3AtY29sb3I6ICNlNGI5YzA7XFxufVxcbi5hbGVydC1kYW5nZXIgLmFsZXJ0LWxpbmsge1xcbiAgY29sb3I6ICM4NDM1MzQ7XFxufVxcbkAtd2Via2l0LWtleWZyYW1lcyBwcm9ncmVzcy1iYXItc3RyaXBlcyB7XFxuICBmcm9tIHtcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogNDBweCAwO1xcbiAgfVxcbiAgdG8ge1xcbiAgICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiAwIDA7XFxuICB9XFxufVxcbkBrZXlmcmFtZXMgcHJvZ3Jlc3MtYmFyLXN0cmlwZXMge1xcbiAgZnJvbSB7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IDQwcHggMDtcXG4gIH1cXG4gIHRvIHtcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogMCAwO1xcbiAgfVxcbn1cXG4ucHJvZ3Jlc3Mge1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIGhlaWdodDogMjBweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjEpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4xKTtcXG59XFxuLnByb2dyZXNzLWJhciB7XFxuICBmbG9hdDogbGVmdDtcXG4gIHdpZHRoOiAwJTtcXG4gIGhlaWdodDogMTAwJTtcXG4gIGZvbnQtc2l6ZTogMTJweDtcXG4gIGxpbmUtaGVpZ2h0OiAyMHB4O1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNDI4YmNhO1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiBpbnNldCAwIC0xcHggMCByZ2JhKDAsIDAsIDAsIDAuMTUpO1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMCAtMXB4IDAgcmdiYSgwLCAwLCAwLCAwLjE1KTtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogd2lkdGggMC42cyBlYXNlO1xcbiAgdHJhbnNpdGlvbjogd2lkdGggMC42cyBlYXNlO1xcbn1cXG4ucHJvZ3Jlc3Mtc3RyaXBlZCAucHJvZ3Jlc3MtYmFyIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IC13ZWJraXQtbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoNDVkZWcsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgMjUlLCB0cmFuc3BhcmVudCAyNSUsIHRyYW5zcGFyZW50IDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNzUlLCB0cmFuc3BhcmVudCA3NSUsIHRyYW5zcGFyZW50KTtcXG4gIGJhY2tncm91bmQtc2l6ZTogNDBweCA0MHB4O1xcbn1cXG4ucHJvZ3Jlc3MuYWN0aXZlIC5wcm9ncmVzcy1iYXIge1xcbiAgLXdlYmtpdC1hbmltYXRpb246IHByb2dyZXNzLWJhci1zdHJpcGVzIDJzIGxpbmVhciBpbmZpbml0ZTtcXG4gIGFuaW1hdGlvbjogcHJvZ3Jlc3MtYmFyLXN0cmlwZXMgMnMgbGluZWFyIGluZmluaXRlO1xcbn1cXG4ucHJvZ3Jlc3MtYmFyLXN1Y2Nlc3Mge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzVjYjg1YztcXG59XFxuLnByb2dyZXNzLXN0cmlwZWQgLnByb2dyZXNzLWJhci1zdWNjZXNzIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IC13ZWJraXQtbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoNDVkZWcsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgMjUlLCB0cmFuc3BhcmVudCAyNSUsIHRyYW5zcGFyZW50IDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNzUlLCB0cmFuc3BhcmVudCA3NSUsIHRyYW5zcGFyZW50KTtcXG59XFxuLnByb2dyZXNzLWJhci1pbmZvIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM1YmMwZGU7XFxufVxcbi5wcm9ncmVzcy1zdHJpcGVkIC5wcm9ncmVzcy1iYXItaW5mbyB7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiAtd2Via2l0LWxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxufVxcbi5wcm9ncmVzcy1iYXItd2FybmluZyB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjBhZDRlO1xcbn1cXG4ucHJvZ3Jlc3Mtc3RyaXBlZCAucHJvZ3Jlc3MtYmFyLXdhcm5pbmcge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogLXdlYmtpdC1saW5lYXItZ3JhZGllbnQoNDVkZWcsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgMjUlLCB0cmFuc3BhcmVudCAyNSUsIHRyYW5zcGFyZW50IDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNzUlLCB0cmFuc3BhcmVudCA3NSUsIHRyYW5zcGFyZW50KTtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbn1cXG4ucHJvZ3Jlc3MtYmFyLWRhbmdlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZDk1MzRmO1xcbn1cXG4ucHJvZ3Jlc3Mtc3RyaXBlZCAucHJvZ3Jlc3MtYmFyLWRhbmdlciB7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiAtd2Via2l0LWxpbmVhci1ncmFkaWVudCg0NWRlZywgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSAyNSUsIHRyYW5zcGFyZW50IDI1JSwgdHJhbnNwYXJlbnQgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDUwJSwgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSA3NSUsIHRyYW5zcGFyZW50IDc1JSwgdHJhbnNwYXJlbnQpO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KDQ1ZGVnLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDI1JSwgdHJhbnNwYXJlbnQgMjUlLCB0cmFuc3BhcmVudCA1MCUsIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xNSkgNTAlLCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMTUpIDc1JSwgdHJhbnNwYXJlbnQgNzUlLCB0cmFuc3BhcmVudCk7XFxufVxcbi5tZWRpYSxcXG4ubWVkaWEtYm9keSB7XFxuICBvdmVyZmxvdzogaGlkZGVuO1xcbiAgem9vbTogMTtcXG59XFxuLm1lZGlhLFxcbi5tZWRpYSAubWVkaWEge1xcbiAgbWFyZ2luLXRvcDogMTVweDtcXG59XFxuLm1lZGlhOmZpcnN0LWNoaWxkIHtcXG4gIG1hcmdpbi10b3A6IDA7XFxufVxcbi5tZWRpYS1vYmplY3Qge1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi5tZWRpYS1oZWFkaW5nIHtcXG4gIG1hcmdpbjogMCAwIDVweDtcXG59XFxuLm1lZGlhID4gLnB1bGwtbGVmdCB7XFxuICBtYXJnaW4tcmlnaHQ6IDEwcHg7XFxufVxcbi5tZWRpYSA+IC5wdWxsLXJpZ2h0IHtcXG4gIG1hcmdpbi1sZWZ0OiAxMHB4O1xcbn1cXG4ubWVkaWEtbGlzdCB7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbn1cXG4ubGlzdC1ncm91cCB7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgcGFkZGluZy1sZWZ0OiAwO1xcbn1cXG4ubGlzdC1ncm91cC1pdGVtIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgcGFkZGluZzogMTBweCAxNXB4O1xcbiAgbWFyZ2luLWJvdHRvbTogLTFweDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBib3JkZXI6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG4ubGlzdC1ncm91cC1pdGVtOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3AtcmlnaHQtcmFkaXVzOiA0cHg7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiA0cHg7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW06bGFzdC1jaGlsZCB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDRweDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDRweDtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbSA+IC5iYWRnZSB7XFxuICBmbG9hdDogcmlnaHQ7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0gPiAuYmFkZ2UgKyAuYmFkZ2Uge1xcbiAgbWFyZ2luLXJpZ2h0OiA1cHg7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtIHtcXG4gIGNvbG9yOiAjNTU1NTU1O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbSAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcge1xcbiAgY29sb3I6ICMzMzMzMzM7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtOmZvY3VzIHtcXG4gIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLmFjdGl2ZSxcXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmU6aG92ZXIsXFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlOmZvY3VzIHtcXG4gIHotaW5kZXg6IDI7XFxuICBjb2xvcjogI2ZmZmZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM0MjhiY2E7XFxuICBib3JkZXItY29sb3I6ICM0MjhiY2E7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLmFjdGl2ZSAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcsXFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlOmhvdmVyIC5saXN0LWdyb3VwLWl0ZW0taGVhZGluZyxcXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmU6Zm9jdXMgLmxpc3QtZ3JvdXAtaXRlbS1oZWFkaW5nIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS5hY3RpdmUgLmxpc3QtZ3JvdXAtaXRlbS10ZXh0LFxcbmEubGlzdC1ncm91cC1pdGVtLmFjdGl2ZTpob3ZlciAubGlzdC1ncm91cC1pdGVtLXRleHQsXFxuYS5saXN0LWdyb3VwLWl0ZW0uYWN0aXZlOmZvY3VzIC5saXN0LWdyb3VwLWl0ZW0tdGV4dCB7XFxuICBjb2xvcjogI2UxZWRmNztcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbS1zdWNjZXNzIHtcXG4gIGNvbG9yOiAjM2M3NjNkO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2RmZjBkODtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0tc3VjY2VzcyB7XFxuICBjb2xvcjogIzNjNzYzZDtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0tc3VjY2VzcyAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcge1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3M6aG92ZXIsXFxuYS5saXN0LWdyb3VwLWl0ZW0tc3VjY2Vzczpmb2N1cyB7XFxuICBjb2xvcjogIzNjNzYzZDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNkMGU5YzY7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3MuYWN0aXZlLFxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3MuYWN0aXZlOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLXN1Y2Nlc3MuYWN0aXZlOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzNjNzYzZDtcXG4gIGJvcmRlci1jb2xvcjogIzNjNzYzZDtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbS1pbmZvIHtcXG4gIGNvbG9yOiAjMzE3MDhmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Q5ZWRmNztcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0taW5mbyB7XFxuICBjb2xvcjogIzMxNzA4ZjtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0taW5mbyAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcge1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLWluZm86aG92ZXIsXFxuYS5saXN0LWdyb3VwLWl0ZW0taW5mbzpmb2N1cyB7XFxuICBjb2xvcjogIzMxNzA4ZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNjNGUzZjM7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLWluZm8uYWN0aXZlLFxcbmEubGlzdC1ncm91cC1pdGVtLWluZm8uYWN0aXZlOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLWluZm8uYWN0aXZlOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzMxNzA4ZjtcXG4gIGJvcmRlci1jb2xvcjogIzMxNzA4ZjtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbS13YXJuaW5nIHtcXG4gIGNvbG9yOiAjOGE2ZDNiO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZjZjhlMztcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0td2FybmluZyB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG59XFxuYS5saXN0LWdyb3VwLWl0ZW0td2FybmluZyAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcge1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmc6aG92ZXIsXFxuYS5saXN0LWdyb3VwLWl0ZW0td2FybmluZzpmb2N1cyB7XFxuICBjb2xvcjogIzhhNmQzYjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmYWYyY2M7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmcuYWN0aXZlLFxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmcuYWN0aXZlOmhvdmVyLFxcbmEubGlzdC1ncm91cC1pdGVtLXdhcm5pbmcuYWN0aXZlOmZvY3VzIHtcXG4gIGNvbG9yOiAjZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzhhNmQzYjtcXG4gIGJvcmRlci1jb2xvcjogIzhhNmQzYjtcXG59XFxuLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXIge1xcbiAgY29sb3I6ICNhOTQ0NDI7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjJkZWRlO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXIge1xcbiAgY29sb3I6ICNhOTQ0NDI7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLWRhbmdlciAubGlzdC1ncm91cC1pdGVtLWhlYWRpbmcge1xcbiAgY29sb3I6IGluaGVyaXQ7XFxufVxcbmEubGlzdC1ncm91cC1pdGVtLWRhbmdlcjpob3ZlcixcXG5hLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXI6Zm9jdXMge1xcbiAgY29sb3I6ICNhOTQ0NDI7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWJjY2NjO1xcbn1cXG5hLmxpc3QtZ3JvdXAtaXRlbS1kYW5nZXIuYWN0aXZlLFxcbmEubGlzdC1ncm91cC1pdGVtLWRhbmdlci5hY3RpdmU6aG92ZXIsXFxuYS5saXN0LWdyb3VwLWl0ZW0tZGFuZ2VyLmFjdGl2ZTpmb2N1cyB7XFxuICBjb2xvcjogI2ZmZjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNhOTQ0NDI7XFxuICBib3JkZXItY29sb3I6ICNhOTQ0NDI7XFxufVxcbi5saXN0LWdyb3VwLWl0ZW0taGVhZGluZyB7XFxuICBtYXJnaW4tdG9wOiAwO1xcbiAgbWFyZ2luLWJvdHRvbTogNXB4O1xcbn1cXG4ubGlzdC1ncm91cC1pdGVtLXRleHQge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjM7XFxufVxcbi5wYW5lbCB7XFxuICBtYXJnaW4tYm90dG9tOiAyMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA1KTtcXG4gIGJveC1zaGFkb3c6IDAgMXB4IDFweCByZ2JhKDAsIDAsIDAsIDAuMDUpO1xcbn1cXG4ucGFuZWwtYm9keSB7XFxuICBwYWRkaW5nOiAxNXB4O1xcbn1cXG4ucGFuZWwtaGVhZGluZyB7XFxuICBwYWRkaW5nOiAxMHB4IDE1cHg7XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogM3B4O1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwtaGVhZGluZyA+IC5kcm9wZG93biAuZHJvcGRvd24tdG9nZ2xlIHtcXG4gIGNvbG9yOiBpbmhlcml0O1xcbn1cXG4ucGFuZWwtdGl0bGUge1xcbiAgbWFyZ2luLXRvcDogMDtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxuICBmb250LXNpemU6IDE2cHg7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuLnBhbmVsLXRpdGxlID4gYSB7XFxuICBjb2xvcjogaW5oZXJpdDtcXG59XFxuLnBhbmVsLWZvb3RlciB7XFxuICBwYWRkaW5nOiAxMHB4IDE1cHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNkZGRkZGQ7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogM3B4O1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwgPiAubGlzdC1ncm91cCB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbn1cXG4ucGFuZWwgPiAubGlzdC1ncm91cCAubGlzdC1ncm91cC1pdGVtIHtcXG4gIGJvcmRlci13aWR0aDogMXB4IDA7XFxuICBib3JkZXItcmFkaXVzOiAwO1xcbn1cXG4ucGFuZWwgPiAubGlzdC1ncm91cDpmaXJzdC1jaGlsZCAubGlzdC1ncm91cC1pdGVtOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3A6IDA7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogM3B4O1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwgPiAubGlzdC1ncm91cDpsYXN0LWNoaWxkIC5saXN0LWdyb3VwLWl0ZW06bGFzdC1jaGlsZCB7XFxuICBib3JkZXItYm90dG9tOiAwO1xcbiAgYm9yZGVyLWJvdHRvbS1yaWdodC1yYWRpdXM6IDNweDtcXG4gIGJvcmRlci1ib3R0b20tbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsLWhlYWRpbmcgKyAubGlzdC1ncm91cCAubGlzdC1ncm91cC1pdGVtOmZpcnN0LWNoaWxkIHtcXG4gIGJvcmRlci10b3Atd2lkdGg6IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZSxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZSB7XFxuICBtYXJnaW4tYm90dG9tOiAwO1xcbn1cXG4ucGFuZWwgPiAudGFibGU6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQge1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDNweDtcXG4gIGJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGhlYWQ6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpmaXJzdC1jaGlsZCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRoZWFkOmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpmaXJzdC1jaGlsZCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGhlYWQ6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpmaXJzdC1jaGlsZCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRoZWFkOmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpmaXJzdC1jaGlsZCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGg6Zmlyc3QtY2hpbGQge1xcbiAgYm9yZGVyLXRvcC1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0aGVhZDpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmZpcnN0LWNoaWxkID4gLnRhYmxlOmZpcnN0LWNoaWxkID4gdGJvZHk6Zmlyc3QtY2hpbGQgPiB0cjpmaXJzdC1jaGlsZCB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRoZWFkOmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpmaXJzdC1jaGlsZCA+IC50YWJsZTpmaXJzdC1jaGlsZCA+IHRoZWFkOmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0Ym9keTpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6Zmlyc3QtY2hpbGQgPiAudGFibGU6Zmlyc3QtY2hpbGQgPiB0Ym9keTpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoOmxhc3QtY2hpbGQge1xcbiAgYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDNweDtcXG59XFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkIHtcXG4gIGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOiAzcHg7XFxuICBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiAzcHg7XFxufVxcbi5wYW5lbCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGJvZHk6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGJvZHk6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Zm9vdDpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZTpsYXN0LWNoaWxkID4gLnRhYmxlOmxhc3QtY2hpbGQgPiB0Zm9vdDpsYXN0LWNoaWxkID4gdHI6bGFzdC1jaGlsZCB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlOmxhc3QtY2hpbGQgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGZvb3Q6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGZvb3Q6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGg6Zmlyc3QtY2hpbGQge1xcbiAgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGJvZHk6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRmb290Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGZvb3Q6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRib2R5Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGJvZHk6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGU6bGFzdC1jaGlsZCA+IHRmb290Omxhc3QtY2hpbGQgPiB0cjpsYXN0LWNoaWxkIHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmU6bGFzdC1jaGlsZCA+IC50YWJsZTpsYXN0LWNoaWxkID4gdGZvb3Q6bGFzdC1jaGlsZCA+IHRyOmxhc3QtY2hpbGQgdGg6bGFzdC1jaGlsZCB7XFxuICBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czogM3B4O1xcbn1cXG4ucGFuZWwgPiAucGFuZWwtYm9keSArIC50YWJsZSxcXG4ucGFuZWwgPiAucGFuZWwtYm9keSArIC50YWJsZS1yZXNwb25zaXZlIHtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG4ucGFuZWwgPiAudGFibGUgPiB0Ym9keTpmaXJzdC1jaGlsZCA+IHRyOmZpcnN0LWNoaWxkIHRoLFxcbi5wYW5lbCA+IC50YWJsZSA+IHRib2R5OmZpcnN0LWNoaWxkID4gdHI6Zmlyc3QtY2hpbGQgdGQge1xcbiAgYm9yZGVyLXRvcDogMDtcXG59XFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkIHtcXG4gIGJvcmRlcjogMDtcXG59XFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0aDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGg6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkOmZpcnN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHIgPiB0ZDpmaXJzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQ6Zmlyc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQ6Zmlyc3QtY2hpbGQge1xcbiAgYm9yZGVyLWxlZnQ6IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRoOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGg6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0aDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRoZWFkID4gdHIgPiB0ZDpsYXN0LWNoaWxkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0ciA+IHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0ciA+IHRkOmxhc3QtY2hpbGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyID4gdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyID4gdGQ6bGFzdC1jaGlsZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHIgPiB0ZDpsYXN0LWNoaWxkIHtcXG4gIGJvcmRlci1yaWdodDogMDtcXG59XFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0cjpmaXJzdC1jaGlsZCA+IHRkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGhlYWQgPiB0cjpmaXJzdC1jaGlsZCA+IHRkLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6Zmlyc3QtY2hpbGQgPiB0ZCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6Zmlyc3QtY2hpbGQgPiB0ZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyOmZpcnN0LWNoaWxkID4gdGgsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0aGVhZCA+IHRyOmZpcnN0LWNoaWxkID4gdGgsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0cjpmaXJzdC1jaGlsZCA+IHRoLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0cjpmaXJzdC1jaGlsZCA+IHRoIHtcXG4gIGJvcmRlci1ib3R0b206IDA7XFxufVxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6bGFzdC1jaGlsZCA+IHRkLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGJvZHkgPiB0cjpsYXN0LWNoaWxkID4gdGQsXFxuLnBhbmVsID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0cjpsYXN0LWNoaWxkID4gdGQsXFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUgPiAudGFibGUtYm9yZGVyZWQgPiB0Zm9vdCA+IHRyOmxhc3QtY2hpbGQgPiB0ZCxcXG4ucGFuZWwgPiAudGFibGUtYm9yZGVyZWQgPiB0Ym9keSA+IHRyOmxhc3QtY2hpbGQgPiB0aCxcXG4ucGFuZWwgPiAudGFibGUtcmVzcG9uc2l2ZSA+IC50YWJsZS1ib3JkZXJlZCA+IHRib2R5ID4gdHI6bGFzdC1jaGlsZCA+IHRoLFxcbi5wYW5lbCA+IC50YWJsZS1ib3JkZXJlZCA+IHRmb290ID4gdHI6bGFzdC1jaGlsZCA+IHRoLFxcbi5wYW5lbCA+IC50YWJsZS1yZXNwb25zaXZlID4gLnRhYmxlLWJvcmRlcmVkID4gdGZvb3QgPiB0cjpsYXN0LWNoaWxkID4gdGgge1xcbiAgYm9yZGVyLWJvdHRvbTogMDtcXG59XFxuLnBhbmVsID4gLnRhYmxlLXJlc3BvbnNpdmUge1xcbiAgYm9yZGVyOiAwO1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuLnBhbmVsLWdyb3VwIHtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxufVxcbi5wYW5lbC1ncm91cCAucGFuZWwge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxufVxcbi5wYW5lbC1ncm91cCAucGFuZWwgKyAucGFuZWwge1xcbiAgbWFyZ2luLXRvcDogNXB4O1xcbn1cXG4ucGFuZWwtZ3JvdXAgLnBhbmVsLWhlYWRpbmcge1xcbiAgYm9yZGVyLWJvdHRvbTogMDtcXG59XFxuLnBhbmVsLWdyb3VwIC5wYW5lbC1oZWFkaW5nICsgLnBhbmVsLWNvbGxhcHNlIC5wYW5lbC1ib2R5IHtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkZGRkO1xcbn1cXG4ucGFuZWwtZ3JvdXAgLnBhbmVsLWZvb3RlciB7XFxuICBib3JkZXItdG9wOiAwO1xcbn1cXG4ucGFuZWwtZ3JvdXAgLnBhbmVsLWZvb3RlciArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2RkZGRkZDtcXG59XFxuLnBhbmVsLWRlZmF1bHQge1xcbiAgYm9yZGVyLWNvbG9yOiAjZGRkZGRkO1xcbn1cXG4ucGFuZWwtZGVmYXVsdCA+IC5wYW5lbC1oZWFkaW5nIHtcXG4gIGNvbG9yOiAjMzMzMzMzO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTtcXG4gIGJvcmRlci1jb2xvcjogI2RkZGRkZDtcXG59XFxuLnBhbmVsLWRlZmF1bHQgPiAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjZGRkZGRkO1xcbn1cXG4ucGFuZWwtZGVmYXVsdCA+IC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2RkZGRkZDtcXG59XFxuLnBhbmVsLXByaW1hcnkge1xcbiAgYm9yZGVyLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4ucGFuZWwtcHJpbWFyeSA+IC5wYW5lbC1oZWFkaW5nIHtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzQyOGJjYTtcXG4gIGJvcmRlci1jb2xvcjogIzQyOGJjYTtcXG59XFxuLnBhbmVsLXByaW1hcnkgPiAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjNDI4YmNhO1xcbn1cXG4ucGFuZWwtcHJpbWFyeSA+IC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogIzQyOGJjYTtcXG59XFxuLnBhbmVsLXN1Y2Nlc3Mge1xcbiAgYm9yZGVyLWNvbG9yOiAjZDZlOWM2O1xcbn1cXG4ucGFuZWwtc3VjY2VzcyA+IC5wYW5lbC1oZWFkaW5nIHtcXG4gIGNvbG9yOiAjM2M3NjNkO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2RmZjBkODtcXG4gIGJvcmRlci1jb2xvcjogI2Q2ZTljNjtcXG59XFxuLnBhbmVsLXN1Y2Nlc3MgPiAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjZDZlOWM2O1xcbn1cXG4ucGFuZWwtc3VjY2VzcyA+IC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2Q2ZTljNjtcXG59XFxuLnBhbmVsLWluZm8ge1xcbiAgYm9yZGVyLWNvbG9yOiAjYmNlOGYxO1xcbn1cXG4ucGFuZWwtaW5mbyA+IC5wYW5lbC1oZWFkaW5nIHtcXG4gIGNvbG9yOiAjMzE3MDhmO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2Q5ZWRmNztcXG4gIGJvcmRlci1jb2xvcjogI2JjZThmMTtcXG59XFxuLnBhbmVsLWluZm8gPiAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjYmNlOGYxO1xcbn1cXG4ucGFuZWwtaW5mbyA+IC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2JjZThmMTtcXG59XFxuLnBhbmVsLXdhcm5pbmcge1xcbiAgYm9yZGVyLWNvbG9yOiAjZmFlYmNjO1xcbn1cXG4ucGFuZWwtd2FybmluZyA+IC5wYW5lbC1oZWFkaW5nIHtcXG4gIGNvbG9yOiAjOGE2ZDNiO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZjZjhlMztcXG4gIGJvcmRlci1jb2xvcjogI2ZhZWJjYztcXG59XFxuLnBhbmVsLXdhcm5pbmcgPiAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjZmFlYmNjO1xcbn1cXG4ucGFuZWwtd2FybmluZyA+IC5wYW5lbC1mb290ZXIgKyAucGFuZWwtY29sbGFwc2UgLnBhbmVsLWJvZHkge1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2ZhZWJjYztcXG59XFxuLnBhbmVsLWRhbmdlciB7XFxuICBib3JkZXItY29sb3I6ICNlYmNjZDE7XFxufVxcbi5wYW5lbC1kYW5nZXIgPiAucGFuZWwtaGVhZGluZyB7XFxuICBjb2xvcjogI2E5NDQ0MjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmMmRlZGU7XFxuICBib3JkZXItY29sb3I6ICNlYmNjZDE7XFxufVxcbi5wYW5lbC1kYW5nZXIgPiAucGFuZWwtaGVhZGluZyArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItdG9wLWNvbG9yOiAjZWJjY2QxO1xcbn1cXG4ucGFuZWwtZGFuZ2VyID4gLnBhbmVsLWZvb3RlciArIC5wYW5lbC1jb2xsYXBzZSAucGFuZWwtYm9keSB7XFxuICBib3JkZXItYm90dG9tLWNvbG9yOiAjZWJjY2QxO1xcbn1cXG4ud2VsbCB7XFxuICBtaW4taGVpZ2h0OiAyMHB4O1xcbiAgcGFkZGluZzogMTlweDtcXG4gIG1hcmdpbi1ib3R0b206IDIwcHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1O1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2UzZTNlMztcXG4gIGJvcmRlci1yYWRpdXM6IDRweDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogaW5zZXQgMCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4wNSk7XFxuICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAxcHggcmdiYSgwLCAwLCAwLCAwLjA1KTtcXG59XFxuLndlbGwgYmxvY2txdW90ZSB7XFxuICBib3JkZXItY29sb3I6ICNkZGQ7XFxuICBib3JkZXItY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4xNSk7XFxufVxcbi53ZWxsLWxnIHtcXG4gIHBhZGRpbmc6IDI0cHg7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxufVxcbi53ZWxsLXNtIHtcXG4gIHBhZGRpbmc6IDlweDtcXG4gIGJvcmRlci1yYWRpdXM6IDNweDtcXG59XFxuLmNsb3NlIHtcXG4gIGZsb2F0OiByaWdodDtcXG4gIGZvbnQtc2l6ZTogMjFweDtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgbGluZS1oZWlnaHQ6IDE7XFxuICBjb2xvcjogIzAwMDAwMDtcXG4gIHRleHQtc2hhZG93OiAwIDFweCAwICNmZmZmZmY7XFxuICBvcGFjaXR5OiAwLjI7XFxuICBmaWx0ZXI6IGFscGhhKG9wYWNpdHk9MjApO1xcbn1cXG4uY2xvc2U6aG92ZXIsXFxuLmNsb3NlOmZvY3VzIHtcXG4gIGNvbG9yOiAjMDAwMDAwO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgb3BhY2l0eTogMC41O1xcbiAgZmlsdGVyOiBhbHBoYShvcGFjaXR5PTUwKTtcXG59XFxuYnV0dG9uLmNsb3NlIHtcXG4gIHBhZGRpbmc6IDA7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcXG4gIGJvcmRlcjogMDtcXG4gIC13ZWJraXQtYXBwZWFyYW5jZTogbm9uZTtcXG59XFxuLm1vZGFsLW9wZW4ge1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG59XFxuLm1vZGFsIHtcXG4gIGRpc3BsYXk6IG5vbmU7XFxuICBvdmVyZmxvdzogYXV0bztcXG4gIG92ZXJmbG93LXk6IHNjcm9sbDtcXG4gIHBvc2l0aW9uOiBmaXhlZDtcXG4gIHRvcDogMDtcXG4gIHJpZ2h0OiAwO1xcbiAgYm90dG9tOiAwO1xcbiAgbGVmdDogMDtcXG4gIHotaW5kZXg6IDEwNTA7XFxuICAtd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZzogdG91Y2g7XFxuICBvdXRsaW5lOiAwO1xcbn1cXG4ubW9kYWwuZmFkZSAubW9kYWwtZGlhbG9nIHtcXG4gIC13ZWJraXQtdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTI1JSk7XFxuICAtbXMtdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTI1JSk7XFxuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgwLCAtMjUlKTtcXG4gIC13ZWJraXQtdHJhbnNpdGlvbjogLXdlYmtpdC10cmFuc2Zvcm0gMC4zcyBlYXNlLW91dDtcXG4gIC1tb3otdHJhbnNpdGlvbjogLW1vei10cmFuc2Zvcm0gMC4zcyBlYXNlLW91dDtcXG4gIC1vLXRyYW5zaXRpb246IC1vLXRyYW5zZm9ybSAwLjNzIGVhc2Utb3V0O1xcbiAgdHJhbnNpdGlvbjogdHJhbnNmb3JtIDAuM3MgZWFzZS1vdXQ7XFxufVxcbi5tb2RhbC5pbiAubW9kYWwtZGlhbG9nIHtcXG4gIC13ZWJraXQtdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgMCk7XFxuICAtbXMtdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgMCk7XFxuICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgwLCAwKTtcXG59XFxuLm1vZGFsLWRpYWxvZyB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB3aWR0aDogYXV0bztcXG4gIG1hcmdpbjogMTBweDtcXG59XFxuLm1vZGFsLWNvbnRlbnQge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2ZmZmZmZjtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICM5OTk5OTk7XFxuICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuMik7XFxuICBib3JkZXItcmFkaXVzOiA2cHg7XFxuICAtd2Via2l0LWJveC1zaGFkb3c6IDAgM3B4IDlweCByZ2JhKDAsIDAsIDAsIDAuNSk7XFxuICBib3gtc2hhZG93OiAwIDNweCA5cHggcmdiYSgwLCAwLCAwLCAwLjUpO1xcbiAgYmFja2dyb3VuZC1jbGlwOiBwYWRkaW5nLWJveDtcXG4gIG91dGxpbmU6IG5vbmU7XFxufVxcbi5tb2RhbC1iYWNrZHJvcCB7XFxuICBwb3NpdGlvbjogZml4ZWQ7XFxuICB0b3A6IDA7XFxuICByaWdodDogMDtcXG4gIGJvdHRvbTogMDtcXG4gIGxlZnQ6IDA7XFxuICB6LWluZGV4OiAxMDQwO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzAwMDAwMDtcXG59XFxuLm1vZGFsLWJhY2tkcm9wLmZhZGUge1xcbiAgb3BhY2l0eTogMDtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT0wKTtcXG59XFxuLm1vZGFsLWJhY2tkcm9wLmluIHtcXG4gIG9wYWNpdHk6IDAuNTtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT01MCk7XFxufVxcbi5tb2RhbC1oZWFkZXIge1xcbiAgcGFkZGluZzogMTVweDtcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZTVlNWU1O1xcbiAgbWluLWhlaWdodDogMTYuNDI4NTcxNDNweDtcXG59XFxuLm1vZGFsLWhlYWRlciAuY2xvc2Uge1xcbiAgbWFyZ2luLXRvcDogLTJweDtcXG59XFxuLm1vZGFsLXRpdGxlIHtcXG4gIG1hcmdpbjogMDtcXG4gIGxpbmUtaGVpZ2h0OiAxLjQyODU3MTQzO1xcbn1cXG4ubW9kYWwtYm9keSB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBwYWRkaW5nOiAyMHB4O1xcbn1cXG4ubW9kYWwtZm9vdGVyIHtcXG4gIG1hcmdpbi10b3A6IDE1cHg7XFxuICBwYWRkaW5nOiAxOXB4IDIwcHggMjBweDtcXG4gIHRleHQtYWxpZ246IHJpZ2h0O1xcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU1ZTU7XFxufVxcbi5tb2RhbC1mb290ZXIgLmJ0biArIC5idG4ge1xcbiAgbWFyZ2luLWxlZnQ6IDVweDtcXG4gIG1hcmdpbi1ib3R0b206IDA7XFxufVxcbi5tb2RhbC1mb290ZXIgLmJ0bi1ncm91cCAuYnRuICsgLmJ0biB7XFxuICBtYXJnaW4tbGVmdDogLTFweDtcXG59XFxuLm1vZGFsLWZvb3RlciAuYnRuLWJsb2NrICsgLmJ0bi1ibG9jayB7XFxuICBtYXJnaW4tbGVmdDogMDtcXG59XFxuQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAubW9kYWwtZGlhbG9nIHtcXG4gICAgd2lkdGg6IDYwMHB4O1xcbiAgICBtYXJnaW46IDMwcHggYXV0bztcXG4gIH1cXG4gIC5tb2RhbC1jb250ZW50IHtcXG4gICAgLXdlYmtpdC1ib3gtc2hhZG93OiAwIDVweCAxNXB4IHJnYmEoMCwgMCwgMCwgMC41KTtcXG4gICAgYm94LXNoYWRvdzogMCA1cHggMTVweCByZ2JhKDAsIDAsIDAsIDAuNSk7XFxuICB9XFxuICAubW9kYWwtc20ge1xcbiAgICB3aWR0aDogMzAwcHg7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA5OTJweCkge1xcbiAgLm1vZGFsLWxnIHtcXG4gICAgd2lkdGg6IDkwMHB4O1xcbiAgfVxcbn1cXG4udG9vbHRpcCB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB6LWluZGV4OiAxMDMwO1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB2aXNpYmlsaXR5OiB2aXNpYmxlO1xcbiAgZm9udC1zaXplOiAxMnB4O1xcbiAgbGluZS1oZWlnaHQ6IDEuNDtcXG4gIG9wYWNpdHk6IDA7XFxuICBmaWx0ZXI6IGFscGhhKG9wYWNpdHk9MCk7XFxufVxcbi50b29sdGlwLmluIHtcXG4gIG9wYWNpdHk6IDAuOTtcXG4gIGZpbHRlcjogYWxwaGEob3BhY2l0eT05MCk7XFxufVxcbi50b29sdGlwLnRvcCB7XFxuICBtYXJnaW4tdG9wOiAtM3B4O1xcbiAgcGFkZGluZzogNXB4IDA7XFxufVxcbi50b29sdGlwLnJpZ2h0IHtcXG4gIG1hcmdpbi1sZWZ0OiAzcHg7XFxuICBwYWRkaW5nOiAwIDVweDtcXG59XFxuLnRvb2x0aXAuYm90dG9tIHtcXG4gIG1hcmdpbi10b3A6IDNweDtcXG4gIHBhZGRpbmc6IDVweCAwO1xcbn1cXG4udG9vbHRpcC5sZWZ0IHtcXG4gIG1hcmdpbi1sZWZ0OiAtM3B4O1xcbiAgcGFkZGluZzogMCA1cHg7XFxufVxcbi50b29sdGlwLWlubmVyIHtcXG4gIG1heC13aWR0aDogMjAwcHg7XFxuICBwYWRkaW5nOiAzcHggOHB4O1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDAwMDAwO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4udG9vbHRpcC1hcnJvdyB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB3aWR0aDogMDtcXG4gIGhlaWdodDogMDtcXG4gIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItc3R5bGU6IHNvbGlkO1xcbn1cXG4udG9vbHRpcC50b3AgLnRvb2x0aXAtYXJyb3cge1xcbiAgYm90dG9tOiAwO1xcbiAgbGVmdDogNTAlO1xcbiAgbWFyZ2luLWxlZnQ6IC01cHg7XFxuICBib3JkZXItd2lkdGg6IDVweCA1cHggMDtcXG4gIGJvcmRlci10b3AtY29sb3I6ICMwMDAwMDA7XFxufVxcbi50b29sdGlwLnRvcC1sZWZ0IC50b29sdGlwLWFycm93IHtcXG4gIGJvdHRvbTogMDtcXG4gIGxlZnQ6IDVweDtcXG4gIGJvcmRlci13aWR0aDogNXB4IDVweCAwO1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogIzAwMDAwMDtcXG59XFxuLnRvb2x0aXAudG9wLXJpZ2h0IC50b29sdGlwLWFycm93IHtcXG4gIGJvdHRvbTogMDtcXG4gIHJpZ2h0OiA1cHg7XFxuICBib3JkZXItd2lkdGg6IDVweCA1cHggMDtcXG4gIGJvcmRlci10b3AtY29sb3I6ICMwMDAwMDA7XFxufVxcbi50b29sdGlwLnJpZ2h0IC50b29sdGlwLWFycm93IHtcXG4gIHRvcDogNTAlO1xcbiAgbGVmdDogMDtcXG4gIG1hcmdpbi10b3A6IC01cHg7XFxuICBib3JkZXItd2lkdGg6IDVweCA1cHggNXB4IDA7XFxuICBib3JkZXItcmlnaHQtY29sb3I6ICMwMDAwMDA7XFxufVxcbi50b29sdGlwLmxlZnQgLnRvb2x0aXAtYXJyb3cge1xcbiAgdG9wOiA1MCU7XFxuICByaWdodDogMDtcXG4gIG1hcmdpbi10b3A6IC01cHg7XFxuICBib3JkZXItd2lkdGg6IDVweCAwIDVweCA1cHg7XFxuICBib3JkZXItbGVmdC1jb2xvcjogIzAwMDAwMDtcXG59XFxuLnRvb2x0aXAuYm90dG9tIC50b29sdGlwLWFycm93IHtcXG4gIHRvcDogMDtcXG4gIGxlZnQ6IDUwJTtcXG4gIG1hcmdpbi1sZWZ0OiAtNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiAwIDVweCA1cHg7XFxuICBib3JkZXItYm90dG9tLWNvbG9yOiAjMDAwMDAwO1xcbn1cXG4udG9vbHRpcC5ib3R0b20tbGVmdCAudG9vbHRpcC1hcnJvdyB7XFxuICB0b3A6IDA7XFxuICBsZWZ0OiA1cHg7XFxuICBib3JkZXItd2lkdGg6IDAgNXB4IDVweDtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6ICMwMDAwMDA7XFxufVxcbi50b29sdGlwLmJvdHRvbS1yaWdodCAudG9vbHRpcC1hcnJvdyB7XFxuICB0b3A6IDA7XFxuICByaWdodDogNXB4O1xcbiAgYm9yZGVyLXdpZHRoOiAwIDVweCA1cHg7XFxuICBib3JkZXItYm90dG9tLWNvbG9yOiAjMDAwMDAwO1xcbn1cXG4ucG9wb3ZlciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDA7XFxuICBsZWZ0OiAwO1xcbiAgei1pbmRleDogMTAxMDtcXG4gIGRpc3BsYXk6IG5vbmU7XFxuICBtYXgtd2lkdGg6IDI3NnB4O1xcbiAgcGFkZGluZzogMXB4O1xcbiAgdGV4dC1hbGlnbjogbGVmdDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmY7XFxuICBiYWNrZ3JvdW5kLWNsaXA6IHBhZGRpbmctYm94O1xcbiAgYm9yZGVyOiAxcHggc29saWQgI2NjY2NjYztcXG4gIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC4yKTtcXG4gIGJvcmRlci1yYWRpdXM6IDZweDtcXG4gIC13ZWJraXQtYm94LXNoYWRvdzogMCA1cHggMTBweCByZ2JhKDAsIDAsIDAsIDAuMik7XFxuICBib3gtc2hhZG93OiAwIDVweCAxMHB4IHJnYmEoMCwgMCwgMCwgMC4yKTtcXG4gIHdoaXRlLXNwYWNlOiBub3JtYWw7XFxufVxcbi5wb3BvdmVyLnRvcCB7XFxuICBtYXJnaW4tdG9wOiAtMTBweDtcXG59XFxuLnBvcG92ZXIucmlnaHQge1xcbiAgbWFyZ2luLWxlZnQ6IDEwcHg7XFxufVxcbi5wb3BvdmVyLmJvdHRvbSB7XFxuICBtYXJnaW4tdG9wOiAxMHB4O1xcbn1cXG4ucG9wb3Zlci5sZWZ0IHtcXG4gIG1hcmdpbi1sZWZ0OiAtMTBweDtcXG59XFxuLnBvcG92ZXItdGl0bGUge1xcbiAgbWFyZ2luOiAwO1xcbiAgcGFkZGluZzogOHB4IDE0cHg7XFxuICBmb250LXNpemU6IDE0cHg7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgbGluZS1oZWlnaHQ6IDE4cHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjdmN2Y3O1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlYmViZWI7XFxuICBib3JkZXItcmFkaXVzOiA1cHggNXB4IDAgMDtcXG59XFxuLnBvcG92ZXItY29udGVudCB7XFxuICBwYWRkaW5nOiA5cHggMTRweDtcXG59XFxuLnBvcG92ZXIgPiAuYXJyb3csXFxuLnBvcG92ZXIgPiAuYXJyb3c6YWZ0ZXIge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICB3aWR0aDogMDtcXG4gIGhlaWdodDogMDtcXG4gIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItc3R5bGU6IHNvbGlkO1xcbn1cXG4ucG9wb3ZlciA+IC5hcnJvdyB7XFxuICBib3JkZXItd2lkdGg6IDExcHg7XFxufVxcbi5wb3BvdmVyID4gLmFycm93OmFmdGVyIHtcXG4gIGJvcmRlci13aWR0aDogMTBweDtcXG4gIGNvbnRlbnQ6IFxcXCJcXFwiO1xcbn1cXG4ucG9wb3Zlci50b3AgPiAuYXJyb3cge1xcbiAgbGVmdDogNTAlO1xcbiAgbWFyZ2luLWxlZnQ6IC0xMXB4O1xcbiAgYm9yZGVyLWJvdHRvbS13aWR0aDogMDtcXG4gIGJvcmRlci10b3AtY29sb3I6ICM5OTk5OTk7XFxuICBib3JkZXItdG9wLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMjUpO1xcbiAgYm90dG9tOiAtMTFweDtcXG59XFxuLnBvcG92ZXIudG9wID4gLmFycm93OmFmdGVyIHtcXG4gIGNvbnRlbnQ6IFxcXCIgXFxcIjtcXG4gIGJvdHRvbTogMXB4O1xcbiAgbWFyZ2luLWxlZnQ6IC0xMHB4O1xcbiAgYm9yZGVyLWJvdHRvbS13aWR0aDogMDtcXG4gIGJvcmRlci10b3AtY29sb3I6ICNmZmZmZmY7XFxufVxcbi5wb3BvdmVyLnJpZ2h0ID4gLmFycm93IHtcXG4gIHRvcDogNTAlO1xcbiAgbGVmdDogLTExcHg7XFxuICBtYXJnaW4tdG9wOiAtMTFweDtcXG4gIGJvcmRlci1sZWZ0LXdpZHRoOiAwO1xcbiAgYm9yZGVyLXJpZ2h0LWNvbG9yOiAjOTk5OTk5O1xcbiAgYm9yZGVyLXJpZ2h0LWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMjUpO1xcbn1cXG4ucG9wb3Zlci5yaWdodCA+IC5hcnJvdzphZnRlciB7XFxuICBjb250ZW50OiBcXFwiIFxcXCI7XFxuICBsZWZ0OiAxcHg7XFxuICBib3R0b206IC0xMHB4O1xcbiAgYm9yZGVyLWxlZnQtd2lkdGg6IDA7XFxuICBib3JkZXItcmlnaHQtY29sb3I6ICNmZmZmZmY7XFxufVxcbi5wb3BvdmVyLmJvdHRvbSA+IC5hcnJvdyB7XFxuICBsZWZ0OiA1MCU7XFxuICBtYXJnaW4tbGVmdDogLTExcHg7XFxuICBib3JkZXItdG9wLXdpZHRoOiAwO1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogIzk5OTk5OTtcXG4gIGJvcmRlci1ib3R0b20tY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4yNSk7XFxuICB0b3A6IC0xMXB4O1xcbn1cXG4ucG9wb3Zlci5ib3R0b20gPiAuYXJyb3c6YWZ0ZXIge1xcbiAgY29udGVudDogXFxcIiBcXFwiO1xcbiAgdG9wOiAxcHg7XFxuICBtYXJnaW4tbGVmdDogLTEwcHg7XFxuICBib3JkZXItdG9wLXdpZHRoOiAwO1xcbiAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2ZmZmZmZjtcXG59XFxuLnBvcG92ZXIubGVmdCA+IC5hcnJvdyB7XFxuICB0b3A6IDUwJTtcXG4gIHJpZ2h0OiAtMTFweDtcXG4gIG1hcmdpbi10b3A6IC0xMXB4O1xcbiAgYm9yZGVyLXJpZ2h0LXdpZHRoOiAwO1xcbiAgYm9yZGVyLWxlZnQtY29sb3I6ICM5OTk5OTk7XFxuICBib3JkZXItbGVmdC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjI1KTtcXG59XFxuLnBvcG92ZXIubGVmdCA+IC5hcnJvdzphZnRlciB7XFxuICBjb250ZW50OiBcXFwiIFxcXCI7XFxuICByaWdodDogMXB4O1xcbiAgYm9yZGVyLXJpZ2h0LXdpZHRoOiAwO1xcbiAgYm9yZGVyLWxlZnQtY29sb3I6ICNmZmZmZmY7XFxuICBib3R0b206IC0xMHB4O1xcbn1cXG4uY2Fyb3VzZWwge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbn1cXG4uY2Fyb3VzZWwtaW5uZXIge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4uY2Fyb3VzZWwtaW5uZXIgPiAuaXRlbSB7XFxuICBkaXNwbGF5OiBub25lO1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgLXdlYmtpdC10cmFuc2l0aW9uOiAwLjZzIGVhc2UtaW4tb3V0IGxlZnQ7XFxuICB0cmFuc2l0aW9uOiAwLjZzIGVhc2UtaW4tb3V0IGxlZnQ7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5pdGVtID4gaW1nLFxcbi5jYXJvdXNlbC1pbm5lciA+IC5pdGVtID4gYSA+IGltZyB7XFxuICBsaW5lLWhlaWdodDogMTtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLmFjdGl2ZSxcXG4uY2Fyb3VzZWwtaW5uZXIgPiAubmV4dCxcXG4uY2Fyb3VzZWwtaW5uZXIgPiAucHJldiB7XFxuICBkaXNwbGF5OiBibG9jaztcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLmFjdGl2ZSB7XFxuICBsZWZ0OiAwO1xcbn1cXG4uY2Fyb3VzZWwtaW5uZXIgPiAubmV4dCxcXG4uY2Fyb3VzZWwtaW5uZXIgPiAucHJldiB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDA7XFxuICB3aWR0aDogMTAwJTtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLm5leHQge1xcbiAgbGVmdDogMTAwJTtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLnByZXYge1xcbiAgbGVmdDogLTEwMCU7XFxufVxcbi5jYXJvdXNlbC1pbm5lciA+IC5uZXh0LmxlZnQsXFxuLmNhcm91c2VsLWlubmVyID4gLnByZXYucmlnaHQge1xcbiAgbGVmdDogMDtcXG59XFxuLmNhcm91c2VsLWlubmVyID4gLmFjdGl2ZS5sZWZ0IHtcXG4gIGxlZnQ6IC0xMDAlO1xcbn1cXG4uY2Fyb3VzZWwtaW5uZXIgPiAuYWN0aXZlLnJpZ2h0IHtcXG4gIGxlZnQ6IDEwMCU7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMDtcXG4gIGxlZnQ6IDA7XFxuICBib3R0b206IDA7XFxuICB3aWR0aDogMTUlO1xcbiAgb3BhY2l0eTogMC41O1xcbiAgZmlsdGVyOiBhbHBoYShvcGFjaXR5PTUwKTtcXG4gIGZvbnQtc2l6ZTogMjBweDtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdGV4dC1zaGFkb3c6IDAgMXB4IDJweCByZ2JhKDAsIDAsIDAsIDAuNik7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sLmxlZnQge1xcbiAgYmFja2dyb3VuZC1pbWFnZTogLXdlYmtpdC1saW5lYXItZ3JhZGllbnQobGVmdCwgY29sb3Itc3RvcChyZ2JhKDAsIDAsIDAsIDAuNSkgMCUpLCBjb2xvci1zdG9wKHJnYmEoMCwgMCwgMCwgMC4wMDAxKSAxMDAlKSk7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodG8gcmlnaHQsIHJnYmEoMCwgMCwgMCwgMC41KSAwJSwgcmdiYSgwLCAwLCAwLCAwLjAwMDEpIDEwMCUpO1xcbiAgYmFja2dyb3VuZC1yZXBlYXQ6IHJlcGVhdC14O1xcbiAgZmlsdGVyOiBwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuZ3JhZGllbnQoc3RhcnRDb2xvcnN0cj0nIzgwMDAwMDAwJywgZW5kQ29sb3JzdHI9JyMwMDAwMDAwMCcsIEdyYWRpZW50VHlwZT0xKTtcXG59XFxuLmNhcm91c2VsLWNvbnRyb2wucmlnaHQge1xcbiAgbGVmdDogYXV0bztcXG4gIHJpZ2h0OiAwO1xcbiAgYmFja2dyb3VuZC1pbWFnZTogLXdlYmtpdC1saW5lYXItZ3JhZGllbnQobGVmdCwgY29sb3Itc3RvcChyZ2JhKDAsIDAsIDAsIDAuMDAwMSkgMCUpLCBjb2xvci1zdG9wKHJnYmEoMCwgMCwgMCwgMC41KSAxMDAlKSk7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodG8gcmlnaHQsIHJnYmEoMCwgMCwgMCwgMC4wMDAxKSAwJSwgcmdiYSgwLCAwLCAwLCAwLjUpIDEwMCUpO1xcbiAgYmFja2dyb3VuZC1yZXBlYXQ6IHJlcGVhdC14O1xcbiAgZmlsdGVyOiBwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuZ3JhZGllbnQoc3RhcnRDb2xvcnN0cj0nIzAwMDAwMDAwJywgZW5kQ29sb3JzdHI9JyM4MDAwMDAwMCcsIEdyYWRpZW50VHlwZT0xKTtcXG59XFxuLmNhcm91c2VsLWNvbnRyb2w6aG92ZXIsXFxuLmNhcm91c2VsLWNvbnRyb2w6Zm9jdXMge1xcbiAgb3V0bGluZTogbm9uZTtcXG4gIGNvbG9yOiAjZmZmZmZmO1xcbiAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xcbiAgb3BhY2l0eTogMC45O1xcbiAgZmlsdGVyOiBhbHBoYShvcGFjaXR5PTkwKTtcXG59XFxuLmNhcm91c2VsLWNvbnRyb2wgLmljb24tcHJldixcXG4uY2Fyb3VzZWwtY29udHJvbCAuaWNvbi1uZXh0LFxcbi5jYXJvdXNlbC1jb250cm9sIC5nbHlwaGljb24tY2hldnJvbi1sZWZ0LFxcbi5jYXJvdXNlbC1jb250cm9sIC5nbHlwaGljb24tY2hldnJvbi1yaWdodCB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDUwJTtcXG4gIHotaW5kZXg6IDU7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxufVxcbi5jYXJvdXNlbC1jb250cm9sIC5pY29uLXByZXYsXFxuLmNhcm91c2VsLWNvbnRyb2wgLmdseXBoaWNvbi1jaGV2cm9uLWxlZnQge1xcbiAgbGVmdDogNTAlO1xcbn1cXG4uY2Fyb3VzZWwtY29udHJvbCAuaWNvbi1uZXh0LFxcbi5jYXJvdXNlbC1jb250cm9sIC5nbHlwaGljb24tY2hldnJvbi1yaWdodCB7XFxuICByaWdodDogNTAlO1xcbn1cXG4uY2Fyb3VzZWwtY29udHJvbCAuaWNvbi1wcmV2LFxcbi5jYXJvdXNlbC1jb250cm9sIC5pY29uLW5leHQge1xcbiAgd2lkdGg6IDIwcHg7XFxuICBoZWlnaHQ6IDIwcHg7XFxuICBtYXJnaW4tdG9wOiAtMTBweDtcXG4gIG1hcmdpbi1sZWZ0OiAtMTBweDtcXG4gIGZvbnQtZmFtaWx5OiBzZXJpZjtcXG59XFxuLmNhcm91c2VsLWNvbnRyb2wgLmljb24tcHJldjpiZWZvcmUge1xcbiAgY29udGVudDogJ1xcXFwyMDM5JztcXG59XFxuLmNhcm91c2VsLWNvbnRyb2wgLmljb24tbmV4dDpiZWZvcmUge1xcbiAgY29udGVudDogJ1xcXFwyMDNhJztcXG59XFxuLmNhcm91c2VsLWluZGljYXRvcnMge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgYm90dG9tOiAxMHB4O1xcbiAgbGVmdDogNTAlO1xcbiAgei1pbmRleDogMTU7XFxuICB3aWR0aDogNjAlO1xcbiAgbWFyZ2luLWxlZnQ6IC0zMCU7XFxuICBwYWRkaW5nLWxlZnQ6IDA7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG4uY2Fyb3VzZWwtaW5kaWNhdG9ycyBsaSB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICB3aWR0aDogMTBweDtcXG4gIGhlaWdodDogMTBweDtcXG4gIG1hcmdpbjogMXB4O1xcbiAgdGV4dC1pbmRlbnQ6IC05OTlweDtcXG4gIGJvcmRlcjogMXB4IHNvbGlkICNmZmZmZmY7XFxuICBib3JkZXItcmFkaXVzOiAxMHB4O1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzAwMCBcXFxcOTtcXG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMCk7XFxufVxcbi5jYXJvdXNlbC1pbmRpY2F0b3JzIC5hY3RpdmUge1xcbiAgbWFyZ2luOiAwO1xcbiAgd2lkdGg6IDEycHg7XFxuICBoZWlnaHQ6IDEycHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmZmZmO1xcbn1cXG4uY2Fyb3VzZWwtY2FwdGlvbiB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBsZWZ0OiAxNSU7XFxuICByaWdodDogMTUlO1xcbiAgYm90dG9tOiAyMHB4O1xcbiAgei1pbmRleDogMTA7XFxuICBwYWRkaW5nLXRvcDogMjBweDtcXG4gIHBhZGRpbmctYm90dG9tOiAyMHB4O1xcbiAgY29sb3I6ICNmZmZmZmY7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB0ZXh0LXNoYWRvdzogMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwgMC42KTtcXG59XFxuLmNhcm91c2VsLWNhcHRpb24gLmJ0biB7XFxuICB0ZXh0LXNoYWRvdzogbm9uZTtcXG59XFxuQG1lZGlhIHNjcmVlbiBhbmQgKG1pbi13aWR0aDogNzY4cHgpIHtcXG4gIC5jYXJvdXNlbC1jb250cm9sIC5nbHlwaGljb24tY2hldnJvbi1sZWZ0LFxcbiAgLmNhcm91c2VsLWNvbnRyb2wgLmdseXBoaWNvbi1jaGV2cm9uLXJpZ2h0LFxcbiAgLmNhcm91c2VsLWNvbnRyb2wgLmljb24tcHJldixcXG4gIC5jYXJvdXNlbC1jb250cm9sIC5pY29uLW5leHQge1xcbiAgICB3aWR0aDogMzBweDtcXG4gICAgaGVpZ2h0OiAzMHB4O1xcbiAgICBtYXJnaW4tdG9wOiAtMTVweDtcXG4gICAgbWFyZ2luLWxlZnQ6IC0xNXB4O1xcbiAgICBmb250LXNpemU6IDMwcHg7XFxuICB9XFxuICAuY2Fyb3VzZWwtY2FwdGlvbiB7XFxuICAgIGxlZnQ6IDIwJTtcXG4gICAgcmlnaHQ6IDIwJTtcXG4gICAgcGFkZGluZy1ib3R0b206IDMwcHg7XFxuICB9XFxuICAuY2Fyb3VzZWwtaW5kaWNhdG9ycyB7XFxuICAgIGJvdHRvbTogMjBweDtcXG4gIH1cXG59XFxuLmNsZWFyZml4OmJlZm9yZSxcXG4uY2xlYXJmaXg6YWZ0ZXIsXFxuLmNvbnRhaW5lcjpiZWZvcmUsXFxuLmNvbnRhaW5lcjphZnRlcixcXG4uY29udGFpbmVyLWZsdWlkOmJlZm9yZSxcXG4uY29udGFpbmVyLWZsdWlkOmFmdGVyLFxcbi5yb3c6YmVmb3JlLFxcbi5yb3c6YWZ0ZXIsXFxuLmZvcm0taG9yaXpvbnRhbCAuZm9ybS1ncm91cDpiZWZvcmUsXFxuLmZvcm0taG9yaXpvbnRhbCAuZm9ybS1ncm91cDphZnRlcixcXG4uYnRuLXRvb2xiYXI6YmVmb3JlLFxcbi5idG4tdG9vbGJhcjphZnRlcixcXG4uYnRuLWdyb3VwLXZlcnRpY2FsID4gLmJ0bi1ncm91cDpiZWZvcmUsXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXA6YWZ0ZXIsXFxuLm5hdjpiZWZvcmUsXFxuLm5hdjphZnRlcixcXG4ubmF2YmFyOmJlZm9yZSxcXG4ubmF2YmFyOmFmdGVyLFxcbi5uYXZiYXItaGVhZGVyOmJlZm9yZSxcXG4ubmF2YmFyLWhlYWRlcjphZnRlcixcXG4ubmF2YmFyLWNvbGxhcHNlOmJlZm9yZSxcXG4ubmF2YmFyLWNvbGxhcHNlOmFmdGVyLFxcbi5wYWdlcjpiZWZvcmUsXFxuLnBhZ2VyOmFmdGVyLFxcbi5wYW5lbC1ib2R5OmJlZm9yZSxcXG4ucGFuZWwtYm9keTphZnRlcixcXG4ubW9kYWwtZm9vdGVyOmJlZm9yZSxcXG4ubW9kYWwtZm9vdGVyOmFmdGVyIHtcXG4gIGNvbnRlbnQ6IFxcXCIgXFxcIjtcXG4gIGRpc3BsYXk6IHRhYmxlO1xcbn1cXG4uY2xlYXJmaXg6YWZ0ZXIsXFxuLmNvbnRhaW5lcjphZnRlcixcXG4uY29udGFpbmVyLWZsdWlkOmFmdGVyLFxcbi5yb3c6YWZ0ZXIsXFxuLmZvcm0taG9yaXpvbnRhbCAuZm9ybS1ncm91cDphZnRlcixcXG4uYnRuLXRvb2xiYXI6YWZ0ZXIsXFxuLmJ0bi1ncm91cC12ZXJ0aWNhbCA+IC5idG4tZ3JvdXA6YWZ0ZXIsXFxuLm5hdjphZnRlcixcXG4ubmF2YmFyOmFmdGVyLFxcbi5uYXZiYXItaGVhZGVyOmFmdGVyLFxcbi5uYXZiYXItY29sbGFwc2U6YWZ0ZXIsXFxuLnBhZ2VyOmFmdGVyLFxcbi5wYW5lbC1ib2R5OmFmdGVyLFxcbi5tb2RhbC1mb290ZXI6YWZ0ZXIge1xcbiAgY2xlYXI6IGJvdGg7XFxufVxcbi5jZW50ZXItYmxvY2sge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBtYXJnaW4tbGVmdDogYXV0bztcXG4gIG1hcmdpbi1yaWdodDogYXV0bztcXG59XFxuLnB1bGwtcmlnaHQge1xcbiAgZmxvYXQ6IHJpZ2h0ICFpbXBvcnRhbnQ7XFxufVxcbi5wdWxsLWxlZnQge1xcbiAgZmxvYXQ6IGxlZnQgIWltcG9ydGFudDtcXG59XFxuLmhpZGUge1xcbiAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbn1cXG4uc2hvdyB7XFxuICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50O1xcbn1cXG4uaW52aXNpYmxlIHtcXG4gIHZpc2liaWxpdHk6IGhpZGRlbjtcXG59XFxuLnRleHQtaGlkZSB7XFxuICBmb250OiAwLzAgYTtcXG4gIGNvbG9yOiB0cmFuc3BhcmVudDtcXG4gIHRleHQtc2hhZG93OiBub25lO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7XFxuICBib3JkZXI6IDA7XFxufVxcbi5oaWRkZW4ge1xcbiAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbiAgdmlzaWJpbGl0eTogaGlkZGVuICFpbXBvcnRhbnQ7XFxufVxcbi5hZmZpeCB7XFxuICBwb3NpdGlvbjogZml4ZWQ7XFxufVxcbkAtbXMtdmlld3BvcnQge1xcbiAgd2lkdGg6IGRldmljZS13aWR0aDtcXG59XFxuLnZpc2libGUteHMsXFxuLnZpc2libGUtc20sXFxuLnZpc2libGUtbWQsXFxuLnZpc2libGUtbGcge1xcbiAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbn1cXG5AbWVkaWEgKG1heC13aWR0aDogNzY3cHgpIHtcXG4gIC52aXNpYmxlLXhzIHtcXG4gICAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRhYmxlLnZpc2libGUteHMge1xcbiAgICBkaXNwbGF5OiB0YWJsZTtcXG4gIH1cXG4gIHRyLnZpc2libGUteHMge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1yb3cgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRoLnZpc2libGUteHMsXFxuICB0ZC52aXNpYmxlLXhzIHtcXG4gICAgZGlzcGxheTogdGFibGUtY2VsbCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIGFuZCAobWF4LXdpZHRoOiA5OTFweCkge1xcbiAgLnZpc2libGUtc20ge1xcbiAgICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50O1xcbiAgfVxcbiAgdGFibGUudmlzaWJsZS1zbSB7XFxuICAgIGRpc3BsYXk6IHRhYmxlO1xcbiAgfVxcbiAgdHIudmlzaWJsZS1zbSB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLXJvdyAhaW1wb3J0YW50O1xcbiAgfVxcbiAgdGgudmlzaWJsZS1zbSxcXG4gIHRkLnZpc2libGUtc20ge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1jZWxsICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA5OTJweCkgYW5kIChtYXgtd2lkdGg6IDExOTlweCkge1xcbiAgLnZpc2libGUtbWQge1xcbiAgICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50O1xcbiAgfVxcbiAgdGFibGUudmlzaWJsZS1tZCB7XFxuICAgIGRpc3BsYXk6IHRhYmxlO1xcbiAgfVxcbiAgdHIudmlzaWJsZS1tZCB7XFxuICAgIGRpc3BsYXk6IHRhYmxlLXJvdyAhaW1wb3J0YW50O1xcbiAgfVxcbiAgdGgudmlzaWJsZS1tZCxcXG4gIHRkLnZpc2libGUtbWQge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1jZWxsICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiAxMjAwcHgpIHtcXG4gIC52aXNpYmxlLWxnIHtcXG4gICAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRhYmxlLnZpc2libGUtbGcge1xcbiAgICBkaXNwbGF5OiB0YWJsZTtcXG4gIH1cXG4gIHRyLnZpc2libGUtbGcge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1yb3cgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRoLnZpc2libGUtbGcsXFxuICB0ZC52aXNpYmxlLWxnIHtcXG4gICAgZGlzcGxheTogdGFibGUtY2VsbCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1heC13aWR0aDogNzY3cHgpIHtcXG4gIC5oaWRkZW4teHMge1xcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkgYW5kIChtYXgtd2lkdGg6IDk5MXB4KSB7XFxuICAuaGlkZGVuLXNtIHtcXG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgKG1pbi13aWR0aDogOTkycHgpIGFuZCAobWF4LXdpZHRoOiAxMTk5cHgpIHtcXG4gIC5oaWRkZW4tbWQge1xcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbkBtZWRpYSAobWluLXdpZHRoOiAxMjAwcHgpIHtcXG4gIC5oaWRkZW4tbGcge1xcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XFxuICB9XFxufVxcbi52aXNpYmxlLXByaW50IHtcXG4gIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcXG59XFxuQG1lZGlhIHByaW50IHtcXG4gIC52aXNpYmxlLXByaW50IHtcXG4gICAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRhYmxlLnZpc2libGUtcHJpbnQge1xcbiAgICBkaXNwbGF5OiB0YWJsZTtcXG4gIH1cXG4gIHRyLnZpc2libGUtcHJpbnQge1xcbiAgICBkaXNwbGF5OiB0YWJsZS1yb3cgIWltcG9ydGFudDtcXG4gIH1cXG4gIHRoLnZpc2libGUtcHJpbnQsXFxuICB0ZC52aXNpYmxlLXByaW50IHtcXG4gICAgZGlzcGxheTogdGFibGUtY2VsbCAhaW1wb3J0YW50O1xcbiAgfVxcbn1cXG5AbWVkaWEgcHJpbnQge1xcbiAgLmhpZGRlbi1wcmludCB7XFxuICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcXG4gIH1cXG59XFxuLypcXG5Eb2N1bWVudCAgIDoganF1ZXJ5LnBub3RpZnkuZGVmYXVsdC5jc3NcXG5DcmVhdGVkIG9uIDogTm92IDIzLCAyMDA5LCAzOjE0OjEwIFBNXFxuQXV0aG9yICAgICA6IEh1bnRlciBQZXJyaW5cXG5WZXJzaW9uICAgIDogMS4yLjBcXG5MaW5rICAgICAgIDogaHR0cDovL3BpbmVzZnJhbWV3b3JrLm9yZy9wbm90aWZ5L1xcbkRlc2NyaXB0aW9uOlxcblxcdERlZmF1bHQgc3R5bGluZyBmb3IgUGluZXMgTm90aWZ5IGpRdWVyeSBwbHVnaW4uXFxuKi9cXG4vKiAtLSBOb3RpY2UgKi9cXG4udWktcG5vdGlmeSB7XFxuICB0b3A6IDI1cHg7XFxuICByaWdodDogMjVweDtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGhlaWdodDogYXV0bztcXG4gIC8qIEVuc3VyZXMgbm90aWNlcyBhcmUgYWJvdmUgZXZlcnl0aGluZyAqL1xcbiAgei1pbmRleDogOTk5OTtcXG59XFxuLyogSGlkZXMgcG9zaXRpb246IGZpeGVkIGZyb20gSUU2ICovXFxuaHRtbCA+IGJvZHkgLnVpLXBub3RpZnkge1xcbiAgcG9zaXRpb246IGZpeGVkO1xcbn1cXG4udWktcG5vdGlmeSAudWktcG5vdGlmeS1zaGFkb3cge1xcbiAgLXdlYmtpdC1ib3gtc2hhZG93OiAwcHggMnB4IDEwcHggcmdiYSg1MCwgNTAsIDUwLCAwLjUpO1xcbiAgLW1vei1ib3gtc2hhZG93OiAwcHggMnB4IDEwcHggcmdiYSg1MCwgNTAsIDUwLCAwLjUpO1xcbiAgYm94LXNoYWRvdzogMHB4IDJweCAxMHB4IHJnYmEoNTAsIDUwLCA1MCwgMC41KTtcXG59XFxuLnVpLXBub3RpZnktY29udGFpbmVyIHtcXG4gIGJhY2tncm91bmQtcG9zaXRpb246IDAgMDtcXG4gIHBhZGRpbmc6IC44ZW07XFxuICBoZWlnaHQ6IDEwMCU7XFxuICBtYXJnaW46IDA7XFxufVxcbi51aS1wbm90aWZ5LXNoYXJwIHtcXG4gIC13ZWJraXQtYm9yZGVyLXJhZGl1czogMDtcXG4gIC1tb3otYm9yZGVyLXJhZGl1czogMDtcXG4gIGJvcmRlci1yYWRpdXM6IDA7XFxufVxcbi51aS1wbm90aWZ5LWNsb3NlcixcXG4udWktcG5vdGlmeS1zdGlja2VyIHtcXG4gIGZsb2F0OiByaWdodDtcXG4gIG1hcmdpbi1sZWZ0OiAuMmVtO1xcbn1cXG4udWktcG5vdGlmeS10aXRsZSB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIG1hcmdpbi1ib3R0b206IC40ZW07XFxufVxcbi51aS1wbm90aWZ5LXRleHQge1xcbiAgZGlzcGxheTogYmxvY2s7XFxufVxcbi51aS1wbm90aWZ5LWljb24sXFxuLnVpLXBub3RpZnktaWNvbiBzcGFuIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgZmxvYXQ6IGxlZnQ7XFxuICBtYXJnaW4tcmlnaHQ6IC4yZW07XFxufVxcbi8qIC0tIEhpc3RvcnkgUHVsbGRvd24gKi9cXG4udWktcG5vdGlmeS1oaXN0b3J5LWNvbnRhaW5lciB7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDA7XFxuICByaWdodDogMThweDtcXG4gIHdpZHRoOiA3MHB4O1xcbiAgYm9yZGVyLXRvcDogbm9uZTtcXG4gIHBhZGRpbmc6IDA7XFxuICAtd2Via2l0LWJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7XFxuICAtbW96LWJvcmRlci10b3AtbGVmdC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLWxlZnQtcmFkaXVzOiAwO1xcbiAgLXdlYmtpdC1ib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDtcXG4gIC1tb3otYm9yZGVyLXRvcC1yaWdodC1yYWRpdXM6IDA7XFxuICBib3JkZXItdG9wLXJpZ2h0LXJhZGl1czogMDtcXG4gIC8qIEVuc3VyZXMgaGlzdG9yeSBjb250YWluZXIgaXMgYWJvdmUgbm90aWNlcy4gKi9cXG4gIHotaW5kZXg6IDEwMDAwO1xcbn1cXG4udWktcG5vdGlmeS1oaXN0b3J5LWNvbnRhaW5lciAudWktcG5vdGlmeS1oaXN0b3J5LWhlYWRlciB7XFxuICBwYWRkaW5nOiAycHg7XFxufVxcbi51aS1wbm90aWZ5LWhpc3RvcnktY29udGFpbmVyIGJ1dHRvbiB7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIHdpZHRoOiAxMDAlO1xcbn1cXG4udWktcG5vdGlmeS1oaXN0b3J5LWNvbnRhaW5lciAudWktcG5vdGlmeS1oaXN0b3J5LXB1bGxkb3duIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgbWFyZ2luOiAwIGF1dG87XFxufVxcbi5wcm9kdWN0cy1lZGl0LWZvcm0ge1xcbiAgcGFkZGluZy10b3A6IDEwcHg7XFxufVxcbi50aHVtYm5haWwuYWN0aXZlIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMjU1LCAwLCAwLjEpO1xcbn1cXG4udGh1bWJuYWlsIC5wcm9kdWN0X3R5cGUge1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbn1cXG5cIjsocmVxdWlyZSgnbGVzc2lmeScpKShjc3MpOyBtb2R1bGUuZXhwb3J0cyA9IGNzczsiLCIjIEhvbWUgcGFnZSBsYXlvdXRcbk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcbmpRdWVyeSA9IHJlcXVpcmUgJ2pxdWVyeSdcblByb2R1Y3RFZGl0VmlldyA9IHJlcXVpcmUgJy4uL3Byb2R1Y3RzL2VkaXQvbGF5b3V0LmNvZmZlZSdcblByb2R1Y3RMaXN0VmlldyA9IHJlcXVpcmUgJy4uL3Byb2R1Y3RzL2xpc3QvbGF5b3V0LmNvZmZlZSdcbndpbmRvdy5qUXVlcnkgPSByZXF1aXJlICdqcXVlcnknXG5Cb290c3RyYXAgPSByZXF1aXJlICdib290c3RyYXAnXG5Qcm9kdWN0cyA9IHJlcXVpcmUgJy4uLy4uL2NvbGxlY3Rpb25zL3Byb2R1Y3RzLmNvZmZlZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG5cblBub3RpZnkgPSByZXF1aXJlICdqcXVlcnlfcG5vdGlmeSdcblxuIyBTZXQgdXAgbm90aWZpY2F0aW9uc1xuJC5wbm90aWZ5LmRlZmF1bHRzLmhpc3RvcnkgPSBmYWxzZVxuJC5wbm90aWZ5LmRlZmF1bHRzLnN0eWxpbmcgPSBcImJvb3RzdHJhcFwiXG5cblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkxheW91dC5leHRlbmRcbiAgdGVtcGxhdGU6IHdpbmRvdy50ZW1wbGF0ZXNbJ3NyYy9hcHAvdmlld3MvaG9tZS9sYXlvdXQnXVxuXG4gIGNsYXNzTmFtZTogXCJjb2wtbWQtMTIgaG9tZS1wYWdlLWNvbFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL2hvbWUvbGF5b3V0LmNvZmZlZTo6aW5pdGlhbGl6ZVwiKVxuICAgIEBzZXRDb21tYW5kSGFuZGxlcnMoKVxuXG4gIHJlZ2lvbnM6XG4gICAgJ21haW4nOiAnI21haW4tYm9keSdcbiAgICAnbGlzdCc6IFwiI2xpc3RcIlxuXG4gIGV2ZW50czpcbiAgICAnbW91c2VlbnRlciBbdG9vbHRpcF0nIDogJ3Nob3dUb29sdGlwJ1xuICAgICdtb3VzZWxlYXZlIFt0b29sdGlwXScgOiAnaGlkZVRvb2x0aXAnXG5cbiAgc2hvd1Rvb2x0aXA6IChldmVudCkgLT5cbiAgICAkKCdbdG9vbHRpcF0nKS5lYWNoKChpLGVsKSAtPlxuICAgICAgdHJ5XG4gICAgICAgICQoZWwpLnRvb2x0aXAoKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgIClcblxuICAgIHRyeVxuICAgICAgJChldmVudC50YXJnZXQpLnRvb2x0aXAoJ3Nob3cnKVxuICAgIGNhdGNoIGVycm9yXG5cbiAgaGlkZVRvb2x0aXA6IChldmVudCkgLT5cbiAgICB0cnlcbiAgICAgICQoZXZlbnQudGFyZ2V0KS50b29sdGlwKCdoaWRlJylcbiAgICBjYXRjaCBlcnJvclxuXG4gIG9uUmVuZGVyOiAtPlxuICAgICMgc2hvdyB0aGUgcHJvZHVjdCBsaXN0IHZpZXdcbiAgICBwcm9kdWN0cyA9IG5ldyBQcm9kdWN0c1xuICAgIHByb2R1Y3RzLmZldGNoKClcbiAgICBsaXN0X3ZpZXcgPSBuZXcgUHJvZHVjdExpc3RWaWV3KGNvbGxlY3Rpb246IHByb2R1Y3RzKVxuICAgIEBsaXN0LnNob3cobGlzdF92aWV3KVxuXG4gICMgU2V0IHVwIGNvbW1hbmQgaGFuZGxlcnNcbiAgc2V0Q29tbWFuZEhhbmRsZXJzOiAtPlxuICAgIENvbW1hbmRzLnNldEhhbmRsZXIoXCJzcmMvYXBwL3ZpZXdzL2hvbWUvbGF5b3V0L2VkaXRfcHJvZHVjdFwiLCAocHJvZHVjdCkgPT5cbiAgICAgIGVkaXRfdmlldyA9IG5ldyBQcm9kdWN0RWRpdFZpZXcobW9kZWw6IHByb2R1Y3QpXG4gICAgICBAbWFpbi5zaG93KGVkaXRfdmlldylcbiAgICApXG5cblxuXG4iLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuUG5vdGlmeSA9IHJlcXVpcmUgJ2pxdWVyeV9wbm90aWZ5J1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvY29udHJvbHMnXVxuXG4gIGNsYXNzTmFtZTogXCJwcm9kdWN0cy1lZGl0LWNvbnRyb2xzXCJcblxuICBpbml0aWFsaXplOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9jb250cm9sczo6aW5pdGlhbGl6ZVwiKVxuXG4gIGV2ZW50czpcbiAgICAnY2xpY2sgI3NhdmUnIDogJ3NhdmVQcm9kdWN0J1xuICAgICdjbGljayAjY2FuY2VsJyA6ICdkb0Nsb3NlJ1xuICAgICdjbGljayAjZGVsZXRlJyA6ICdkb0RlbGV0ZSdcblxuICBzZXJpYWxpemVEYXRhOiAtPlxuICAgIHJldHVybiB7XG4gICAgICAnbW9kZWwnOiBAbW9kZWxcbiAgICB9XG5cbiAgZG9DbG9zZTogKGV2ZW50KSAtPlxuICAgICMgQXNrIHRoZSBwYXJlbnQgbGF5b3V0IHRvIGNsb3NlXG4gICAgQ29tbWFuZHMuZXhlY3V0ZShcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvY2xvc2VcIilcblxuICBkb0RlbGV0ZTogKGV2ZW50KSAtPlxuICAgIEBtb2RlbC5kZXN0cm95KHN1Y2Nlc3M6ID0+XG4gICAgICBDb21tYW5kcy5leGVjdXRlKFwibW9kZWxzL3Byb2R1Y3RzL2RlbGV0ZWRcIiwgQG1vZGVsKVxuICAgICAgQGRvQ2xvc2UoKVxuICAgICAgJC5wbm90aWZ5KHtcbiAgICAgICAgdGl0bGU6IFwiUHJvZHVjdCBkZWxldGVkXCIsXG4gICAgICAgIHRleHQ6IFwiUHJvZHVjdCAje0Btb2RlbC5nZXQoJ3RpdGxlJyl9IHdhcyBkZWxldGVkXCIsXG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG5cbiAgICAgICAgfSlcbiAgICApXG5cbiAgc2F2ZVByb2R1Y3Q6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvY29udHJvbHM6OnNhdmVQcm9kdWN0XCIpXG5cbiAgICAjIGlmIGEgbmV3IG1vZGVsIHNlbmQgb3V0IHRoZSBtZXNzYWdlIGZvciBhbnkgaW50ZXJlc3RlZCBwYXJ0aWVzXG4gICAgaWYgQG1vZGVsLmlzTmV3KClcbiAgICAgIENvbW1hbmRzLmV4ZWN1dGUoXCJtb2RlbHMvcHJvZHVjdHMvYWRkZWRfbmV3XCIsIEBtb2RlbClcblxuICAgIEBtb2RlbC5zYXZlKClcbiAgICBAZG9DbG9zZSgpXG4iLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5Qcm9kdWN0VHlwZXMgPSByZXF1aXJlICcuLi8uLi8uLi9jb2xsZWN0aW9ucy9wcm9kdWN0X3R5cGVzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9hYm91dCddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWVkaXQtZm9ybSBcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fYWJvdXQ6OmluaXRpYWxpemVcIilcbiAgICBAcHJvZHVjdF90eXBlcyA9IG5ldyBQcm9kdWN0VHlwZXNcbiAgICBAcHJvZHVjdF90eXBlcy5mZXRjaChzdWNjZXNzOiA9PlxuICAgICAgQHJlbmRlcigpXG4gICAgKVxuXG4gIHNlcmlhbGl6ZURhdGE6IC0+XG4gICAgcmV0dXJuIHtcbiAgICAgICdtb2RlbCc6IEBtb2RlbCxcbiAgICAgICdwcm9kdWN0X3R5cGVzJzogQHByb2R1Y3RfdHlwZXNcbiAgICB9XG5cbiAgZXZlbnRzOlxuICAgICdjaGFuZ2UgaW5wdXQnOiAnaW5wdXRDaGFuZ2VkJ1xuICAgICdjaGFuZ2UgdGV4dGFyZWEnOiAnaW5wdXRDaGFuZ2VkJ1xuICAgICdjbGljayAucHJvZHVjdF90eXBlX3RodW1ibmFpbCc6ICdwcm9kdWN0VHlwZVNlbGVjdGVkJ1xuXG4gIG9uUmVuZGVyOiAtPlxuICAgICMgU2V0IHRoZSBhY3RpdmUgcHJvZHVjdCB0eXBlXG4gICAgJChcIi5wcm9kdWN0X3R5cGVfdGh1bWJuYWlsXCIpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICQoXCIucHJvZHVjdF90eXBlX3RodW1ibmFpbFtkYXRhLXByb2R1Y3QtdHlwZT0nI3tAbW9kZWwuZ2V0KCdwcm9kdWN0X3R5cGVfaWQnKX0nXVwiKS5hZGRDbGFzcygnYWN0aXZlJylcblxuXG4gIGlucHV0Q2hhbmdlZDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2Fib3V0OjppbnB1dENoYW5nZWRcIilcbiAgICBpbnB1dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZChpbnB1dC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSlcbiAgICAgIEBtb2RlbC5zZXQoaW5wdXQuZGF0YSgnbW9kZWwtYXR0cmlidXRlJyksIGlucHV0LnZhbCgpKVxuXG4gIHByb2R1Y3RUeXBlU2VsZWN0ZWQ6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9hYm91dDo6cHJvZHVjdFR5cGVTZWxlY3RlZFwiKVxuICAgIHRodW1ibmFpbCA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBAbW9kZWwuc2V0KCdwcm9kdWN0X3R5cGVfaWQnLCB0aHVtYm5haWwuYXR0cignZGF0YS1wcm9kdWN0LXR5cGUnKSlcbiAgICBAcmVuZGVyKCkiLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbkNvbW1hbmRzID0gcmVxdWlyZSBcIi4uLy4uLy4uL3JlcXVpcmVzL2NvbW1hbmRzLmNvZmZlZVwiXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5EYXlzVG9TaGlwcyA9IHJlcXVpcmUgJy4uLy4uLy4uL2NvbGxlY3Rpb25zL2RheXNfdG9fc2hpcHMuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9kZWxpdmVyeSddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWVkaXQtZm9ybSBcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fZGVsaXZlcnk6OmluaXRpYWxpemVcIilcbiAgICBAZGF5c190b19zaGlwX3JlY29yZHMgPSBuZXcgRGF5c1RvU2hpcHMoKVxuICAgIEBkYXlzX3RvX3NoaXBfcmVjb3Jkcy5mZXRjaChzdWNjZXNzOiA9PlxuICAgICAgY29uc29sZS5sb2cgXCJsb2FkZWQgZGF5cyB0byBzaGlwc1wiXG4gICAgICBAcmVuZGVyKClcbiAgICApXG5cbiAgdWk6XG4gICAgJ2RheXNfc2VsZWN0JzogJyNkYXlzX3RvX3NoaXAnXG5cbiAgc2VyaWFsaXplRGF0YTogLT5cbiAgICByZXR1cm4ge1xuICAgICAgJ21vZGVsJzogQG1vZGVsLFxuICAgICAgJ2RheXNfdG9fc2hpcF9yZWNvcmRzJzogQGRheXNfdG9fc2hpcF9yZWNvcmRzXG4gICAgfVxuXG4gIGV2ZW50czpcbiAgICAnY2hhbmdlIGlucHV0JzogJ2lucHV0Q2hhbmdlZCdcbiAgICAnY2hhbmdlIHRleHRhcmVhJzogJ3RleHRhcmVhQ2hhbmdlZCdcbiAgICAnY2hhbmdlIHNlbGVjdCc6ICdzZWxlY3RDaGFuZ2VkJ1xuXG4gIG9uUmVuZGVyOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5OjpvblJlbmRlclwiKVxuICAgIGNvbnNvbGUubG9nKEBtb2RlbC5nZXQoJ2RheXNfdG9fc2hpcF9pZCcpKVxuICAgIEB1aS5kYXlzX3NlbGVjdC52YWwoQG1vZGVsLmdldCgnZGF5c190b19zaGlwX2lkJykpXG5cblxuXG4gIGlucHV0Q2hhbmdlZDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5OjppbnB1dENoYW5nZWRcIilcbiAgICBpbnB1dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZChpbnB1dC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSlcbiAgICAgIEBtb2RlbC5zZXQoaW5wdXQuZGF0YSgnbW9kZWwtYXR0cmlidXRlJyksIGlucHV0LnZhbCgpKVxuXG4gIHRleHRhcmVhQ2hhbmdlZDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RlbGl2ZXJ5Ojp0ZXh0YXJlYUNoYW5nZWRcIilcbiAgICB0ZXh0YXJlYSA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZCh0ZXh0YXJlYS5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSlcbiAgICAgIEBtb2RlbC5zZXQodGV4dGFyZWEuZGF0YSgnbW9kZWwtYXR0cmlidXRlJyksIHRleHRhcmVhLnZhbCgpKVxuXG4gIHNlbGVjdENoYW5nZWQ6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvZm9ybV9kZWxpdmVyeTo6c2VsZWN0Q2hhbmdlZFwiKVxuICAgIHNlbGVjdCA9ICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICBpZiAhXy5pc1VuZGVmaW5lZChzZWxlY3QuZGF0YSgnbW9kZWwtYXR0cmlidXRlJykpXG4gICAgICBAbW9kZWwuc2V0KHNlbGVjdC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSwgc2VsZWN0LnZhbCgpKVxuIiwiTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG5Db21tYW5kcyA9IHJlcXVpcmUgXCIuLi8uLi8uLi9yZXF1aXJlcy9jb21tYW5kcy5jb2ZmZWVcIlxuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuUHJvZHVjdFR5cGVzID0gcmVxdWlyZSAnLi4vLi4vLi4vY29sbGVjdGlvbnMvcHJvZHVjdF90eXBlcydcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fZGV0YWlscyddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWVkaXQtZm9ybSBcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L2Zvcm1fZGV0YWlsczo6aW5pdGlhbGl6ZVwiKVxuXG4gIHNlcmlhbGl6ZURhdGE6IC0+XG4gICAgcmV0dXJuIHtcbiAgICAgICdtb2RlbCc6IEBtb2RlbFxuICAgIH1cblxuXG4gIGV2ZW50czpcbiAgICAnY2hhbmdlIGlucHV0JzogJ2lucHV0Q2hhbmdlZCdcbiAgICAnY2hhbmdlIHRleHRhcmVhJzogJ2lucHV0Q2hhbmdlZCdcblxuXG4gIGlucHV0Q2hhbmdlZDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9mb3JtX2RldGFpbHM6OmlucHV0Q2hhbmdlZFwiKVxuICAgIGlucHV0ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgIGlmICFfLmlzVW5kZWZpbmVkKGlucHV0LmRhdGEoJ21vZGVsLWF0dHJpYnV0ZScpKVxuICAgICAgQG1vZGVsLnNldChpbnB1dC5kYXRhKCdtb2RlbC1hdHRyaWJ1dGUnKSwgaW5wdXQudmFsKCkpXG4iLCIjIEhvbWUgcGFnZSBsYXlvdXRcbk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuQ29udHJvbHNWaWV3ID0gcmVxdWlyZSAnLi9jb250cm9scy5jb2ZmZWUnXG5Gb3JtQWJvdXRWaWV3ID0gcmVxdWlyZSAnLi9mb3JtX2Fib3V0LmNvZmZlZSdcbkZvcm1EZWxpdmVyeVZpZXcgPSByZXF1aXJlICcuL2Zvcm1fZGVsaXZlcnkuY29mZmVlJ1xuRm9ybURldGFpbHNWaWV3ID0gcmVxdWlyZSAnLi9mb3JtX2RldGFpbHMuY29mZmVlJ1xuVGFic1ZpZXcgPSByZXF1aXJlICcuL3RhYnMuY29mZmVlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkxheW91dC5leHRlbmRcbiAgdGVtcGxhdGU6IHdpbmRvdy50ZW1wbGF0ZXNbJ3NyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQnXVxuXG4gIGNsYXNzTmFtZTogXCJwcm9kdWN0LWVkaXQtbGF5b3V0XCJcblxuICBpbml0aWFsaXplOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQuY29mZmVlOjppbml0aWFsaXplXCIpXG4gICAgQGNvbnRyb2xzX3ZpZXcgPSBuZXcgQ29udHJvbHNWaWV3KG1vZGVsOiBAbW9kZWwpXG4gICAgQHRhYnNfdmlldyA9IG5ldyBUYWJzVmlldyhtb2RlbDogQG1vZGVsKVxuICAgIEBzZXRDb21tYW5kSGFuZGxlcnMoKVxuXG4gIHJlZ2lvbnM6XG4gICAgJ2NvbnRyb2xzJzogJyNjb250cm9scydcbiAgICAndGFicyc6ICcjdGFicydcbiAgICAnZm9ybSc6ICcjZm9ybSdcblxuICB0YWJfY29uc3RydWN0b3JzOiB7XG4gICAgIGRlbGl2ZXJ5OiBGb3JtRGVsaXZlcnlWaWV3XG4gICAgIGFib3V0OiBGb3JtQWJvdXRWaWV3XG4gICAgIGRldGFpbHM6IEZvcm1EZXRhaWxzVmlld1xuICAgICAjIHRhYjogRm9ybURlbGl2ZXJ5Vmlld1xuICAgICAjIHRhYjogRm9ybURlbGl2ZXJ5Vmlld1xuICB9XG5cbiAgb25SZW5kZXI6IC0+XG4gICAgQGNvbnRyb2xzLnNob3coQGNvbnRyb2xzX3ZpZXcpXG4gICAgQHRhYnMuc2hvdyhAdGFic192aWV3KVxuXG4gICMgU2V0IHVwIGNvbW1hbmQgaGFuZGxlcnNcbiAgc2V0Q29tbWFuZEhhbmRsZXJzOiAtPlxuICAgICMgY2xvc2UgY29tbWFuZFxuICAgIENvbW1hbmRzLnNldEhhbmRsZXIoXCJzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0L2Nsb3NlXCIsICgpID0+XG4gICAgICBAY2xvc2UoKVxuICAgIClcblxuICAgICMgU2hvdyBhYm91dCBmb3JtXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvc2hvd19hYm91dFwiLCAoKSA9PlxuICAgICAgdmlldyA9IG5ldyBGb3JtQWJvdXRWaWV3KG1vZGVsOiBAbW9kZWwpXG4gICAgICBAZm9ybS5zaG93KHZpZXcpXG4gICAgKVxuXG5cbiAgICAjIFNob3cgdGFiXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvc2hvd190YWJcIiwgKHRhZ19uYW1lKSA9PlxuICAgICAgdmlldyA9IG5ldyBAdGFiX2NvbnN0cnVjdG9yc1t0YWdfbmFtZV0obW9kZWw6IEBtb2RlbClcbiAgICAgIEBmb3JtLnNob3codmlldylcbiAgICApXG5cblxuIiwiTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG5Db21tYW5kcyA9IHJlcXVpcmUgXCIuLi8uLi8uLi9yZXF1aXJlcy9jb21tYW5kcy5jb2ZmZWVcIlxuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L3RhYnMnXVxuXG4gIGNsYXNzTmFtZTogXCJwcm9kdWN0cy1lZGl0LXRhYnNcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9lZGl0L3RhYnM6OmluaXRpYWxpemVcIilcblxuICBzZXJpYWxpemVEYXRhOiAtPlxuICAgIHJldHVybiB7XG4gICAgICAnbW9kZWwnOiBAbW9kZWxcbiAgICB9XG5cbiAgdWk6XG4gICAgdGFiczogJy5uYXYtdGFicyBsaVxuICAgICdcbiAgZXZlbnRzOlxuICAgICdjbGljayAubmF2LXRhYnMgbGknIDogJ3RhYkNsaWNrZWQnXG5cbiAgb25SZW5kZXI6IC0+XG4gICAgIyBXaGVuIHN0YXJ0aW5nIGFzayBmb3IgdGhlIGRldGFpbHMgdmlldyB0byBiZSBzaG93blxuICAgIENvbW1hbmRzLmV4ZWN1dGUoXCJzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2VkaXQvbGF5b3V0L3Nob3dfYWJvdXRcIilcblxuXG4gIHRhYkNsaWNrZWQ6IChldmVudCkgLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2VkaXQvdGFiczo6dGFiQ2xpY2tlZFwiKVxuXG4gICAgdGFiID0gJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgIHRhYl9uYW1lID0gdGFiLmRhdGEoJ3RhYi1uYW1lJylcbiAgICBjb25zb2xlLmxvZyh0YWJfbmFtZSlcbiAgICBDb21tYW5kcy5leGVjdXRlKFwic3JjL2FwcC92aWV3cy9wcm9kdWN0cy9lZGl0L2xheW91dC9zaG93X3RhYlwiLCB0YWIuZGF0YSgndGFiLW5hbWUnKSlcblxuICAgICMgU2V0IHdobyBpcyB0aGUgYWN0aXZlIHRhYlxuICAgIEB1aS50YWJzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgIHRhYi5hZGRDbGFzcygnYWN0aXZlJykiLCJNYXJpb25ldHRlID0gcmVxdWlyZSAnYmFja2JvbmUubWFyaW9uZXR0ZSdcbiQgPSByZXF1aXJlICdqcXVlcnknXG5Qcm9kdWN0ID0gcmVxdWlyZSAnLi4vLi4vLi4vbW9kZWxzL3Byb2R1Y3QuY29mZmVlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2NvbnRyb2xzJ11cblxuICBjbGFzc05hbWU6IFwicHJvZHVjdHMtbGlzdC1jb250cm9sc1wiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2xpc3QvY29udHJvbHM6OmluaXRpYWxpemVcIilcbiAgICBAc2VhcmNoX3RleHQgPSBcIlwiXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayAjYWRkJyA6ICdBZGRQcm9kdWN0J1xuXG4gIHNlcmlhbGl6ZURhdGE6IC0+XG4gICAgcmV0dXJuIHtcbiAgICAgICdjb2xsZWN0aW9uJzogQGNvbGxlY3Rpb24sXG4gICAgICAnc2VhcmNoX3RleHQnOiBAc2VhcmNoX3RleHRcbiAgICB9XG5cbiAgQWRkUHJvZHVjdDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvbGlzdC9jb250cm9sczo6QWRkUHJvZHVjdFwiKVxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgcHJvZHVjdCA9IG5ldyBQcm9kdWN0KClcbiAgICAjIFNlbmQgdGhlIG1lc3NhZ2UgdG8gZWRpdCB0aGlzIHByb2R1Y3RcbiAgICBDb21tYW5kcy5leGVjdXRlKFwic3JjL2FwcC92aWV3cy9ob21lL2xheW91dC9lZGl0X3Byb2R1Y3RcIiwgcHJvZHVjdClcbiIsIk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuJCA9IHJlcXVpcmUgJ2pxdWVyeSdcbkNvbnRyb2xzVmlldyA9IHJlcXVpcmUgJy4vY29udHJvbHMuY29mZmVlJ1xuTGlzdFZpZXcgPSByZXF1aXJlICcuL2xpc3QuY29mZmVlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuTGF5b3V0LmV4dGVuZFxuICB0ZW1wbGF0ZTogd2luZG93LnRlbXBsYXRlc1snc3JjL2FwcC92aWV3cy9wcm9kdWN0cy9saXN0L2xheW91dCddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWxpc3QtbGF5b3V0XCJcblxuICBpbml0aWFsaXplOiAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvbGlzdC9sYXlvdXQ6OmluaXRpYWxpemVcIilcbiAgICBAY29udHJvbHNfdmlldyA9IG5ldyBDb250cm9sc1ZpZXcoY29sbGVjdGlvbjogQGNvbGxlY3Rpb24pXG4gICAgQGxpc3RfdmlldyA9IG5ldyBMaXN0Vmlldyhjb2xsZWN0aW9uOiBAY29sbGVjdGlvbilcbiAgcmVnaW9uczpcbiAgICAnY29udHJvbHMnOiAnI2NvbnRyb2xzJ1xuICAgIFwibGlzdFwiOiAnI2xpc3QnXG5cbiAgb25SZW5kZXI6IC0+XG4gICAgQGNvbnRyb2xzLnNob3coQGNvbnRyb2xzX3ZpZXcpXG4gICAgQGxpc3Quc2hvdyhAbGlzdF92aWV3KVxuXG5cblxuIiwiTWFyaW9uZXR0ZSA9IHJlcXVpcmUgJ2JhY2tib25lLm1hcmlvbmV0dGUnXG4kID0gcmVxdWlyZSAnanF1ZXJ5J1xuTGlzdEl0ZW1WaWV3ID0gcmVxdWlyZSAnLi9saXN0X2l0ZW0uY29mZmVlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2xpc3QvbGlzdCddXG5cbiAgY2xhc3NOYW1lOiBcInByb2R1Y3RzLWxpc3QtbGlzdFwiXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBjb25zb2xlLmxvZyhcInZpZXdzL3Byb2R1Y3RzL2xpc3QvbGlzdDo6aW5pdGlhbGl6ZVwiKVxuICAgIEBzZXRDb21tYW5kSGFuZGxlcnMoKVxuXG4gIGl0ZW1WaWV3Q29udGFpbmVyOiAnI2l0ZW0tdmlldy1jb250YWluZXInXG5cbiAgaXRlbVZpZXc6IExpc3RJdGVtVmlld1xuXG4gICMgU2V0IHVwIGNvbW1hbmQgaGFuZGxlcnNcbiAgc2V0Q29tbWFuZEhhbmRsZXJzOiAtPlxuICAgICMgQSBuZXcgcHJvZHVjdCBoYXMgYmVlbiBhZGRlZCwgYWRkIGl0IHRvIHRoZSBjb2xsZWN0aW9uXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcIm1vZGVscy9wcm9kdWN0cy9hZGRlZF9uZXdcIiwgKHByb2R1Y3QpID0+XG4gICAgICBAY29sbGVjdGlvbi5hZGQocHJvZHVjdClcbiAgICApXG5cbiAgICAjIFNob3cgZGV0YWlscyBmb3JtXG4gICAgQ29tbWFuZHMuc2V0SGFuZGxlcihcInNyYy9hcHAvdmlld3MvcHJvZHVjdHMvZWRpdC9sYXlvdXQvc2hvd19kZXRhaWxzXCIsICgpID0+XG4gICAgICB2aWV3ID0gbmV3IEZvcm1EZXRhaWxzVmlldyhtb2RlbDogQG1vZGVsKVxuICAgICAgQGZvcm0uc2hvdyh2aWV3KVxuICAgIClcbiIsIk1hcmlvbmV0dGUgPSByZXF1aXJlICdiYWNrYm9uZS5tYXJpb25ldHRlJ1xuQ29tbWFuZHMgPSByZXF1aXJlIFwiLi4vLi4vLi4vcmVxdWlyZXMvY29tbWFuZHMuY29mZmVlXCJcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kXG4gIHRlbXBsYXRlOiB3aW5kb3cudGVtcGxhdGVzWydzcmMvYXBwL3ZpZXdzL3Byb2R1Y3RzL2xpc3QvbGlzdF9pdGVtJ11cblxuICBjbGFzc05hbWU6IFwicHJvZHVjdHMtbGlzdC1saXN0LWl0ZW1cIlxuXG4gIHRhZ05hbWU6IFwidHJcIlxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgY29uc29sZS5sb2coXCJ2aWV3cy9wcm9kdWN0cy9saXN0L2xpc3RfaXRlbTo6aW5pdGlhbGl6ZVwiKVxuICAgIEBzZWFyY2hfdGV4dCA9IFwiXCJcblxuICBzZXJpYWxpemVEYXRhOiAtPlxuICAgIHJldHVybiB7XG4gICAgICAnbW9kZWwnOiBAbW9kZWxcbiAgICB9XG5cbiAgbW9kZWxFdmVudHM6XG4gICAgJ3N5bmMnOiAgJ3JlbmRlcidcblxuICBldmVudHM6XG4gICAgJ2NsaWNrIC5lZGl0X2xpbmsnOiAnZG9FZGl0J1xuXG4gIGRvRWRpdDogKGV2ZW50KSAtPlxuICAgIGNvbnNvbGUubG9nKFwidmlld3MvcHJvZHVjdHMvbGlzdC9saXN0X2l0ZW06OmRvRWRpdFwiKVxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgIyBTZW5kIHRoZSBtZXNzYWdlIHRvIGVkaXQgdGhpcyBwcm9kdWN0XG4gICAgQ29tbWFuZHMuZXhlY3V0ZShcInNyYy9hcHAvdmlld3MvaG9tZS9sYXlvdXQvZWRpdF9wcm9kdWN0XCIsIEBtb2RlbClcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbihmdW5jdGlvbiBicm93c2VyaWZ5U2hpbShtb2R1bGUsIGV4cG9ydHMsIGRlZmluZSwgYnJvd3NlcmlmeV9zaGltX19kZWZpbmVfX21vZHVsZV9fZXhwb3J0X18pIHtcbi8qXG4gIFBhdGNoZWQgdmVyc2lvbiBvZiB0aGlzIGFkYXB0ZXIgdG8gd29yayB3aXRoIEJyb3dzZXJpZnlcbiovXG4oZnVuY3Rpb24gKCkgeyAvKmdsb2JhbCBfOiBmYWxzZSwgQmFja2JvbmU6IGZhbHNlICovXG4gICAgLy8gR2VuZXJhdGUgZm91ciByYW5kb20gaGV4IGRpZ2l0cy5cbiAgICBmdW5jdGlvbiBTNCgpIHtcbiAgICAgICAgcmV0dXJuICgoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApIHwgMCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygxKTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBhIHBzZXVkby1HVUlEIGJ5IGNvbmNhdGVuYXRpbmcgcmFuZG9tIGhleGFkZWNpbWFsLlxuICAgIGZ1bmN0aW9uIGd1aWQoKSB7XG4gICAgICAgIHJldHVybiAoUzQoKSArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBTNCgpICsgUzQoKSk7XG4gICAgfVxuXG4gICAgdmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKVxuICAgIHZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5cbiAgICAgLy8gTmFtaW5nIGlzIGEgbWVzcyFcbiAgICAgdmFyIGluZGV4ZWREQiA9IHdpbmRvdy5pbmRleGVkREIgfHwgd2luZG93LndlYmtpdEluZGV4ZWREQiB8fCB3aW5kb3cubW96SW5kZXhlZERCIHx8IHdpbmRvdy5tc0luZGV4ZWREQiA7XG4gICAgIHZhciBJREJUcmFuc2FjdGlvbiA9IHdpbmRvdy5JREJUcmFuc2FjdGlvbiB8fCB3aW5kb3cud2Via2l0SURCVHJhbnNhY3Rpb24gfHwgeyBSRUFEX1dSSVRFOiBcInJlYWR3cml0ZVwiIH07IC8vIE5vIHByZWZpeCBpbiBtb3pcbiAgICAgdmFyIElEQktleVJhbmdlID0gd2luZG93LklEQktleVJhbmdlIHx8IHdpbmRvdy53ZWJraXRJREJLZXlSYW5nZSA7IC8vIE5vIHByZWZpeCBpbiBtb3pcblxuICAgICB3aW5kb3cuSURCQ3Vyc29yID0gd2luZG93LklEQkN1cnNvciB8fCB3aW5kb3cud2Via2l0SURCQ3Vyc29yIHx8ICB3aW5kb3cubW96SURCQ3Vyc29yIHx8ICB3aW5kb3cubXNJREJDdXJzb3IgO1xuXG5cbiAgICAvLyBEcml2ZXIgb2JqZWN0XG4gICAgLy8gVGhhdCdzIHRoZSBpbnRlcmVzdGluZyBwYXJ0LlxuICAgIC8vIFRoZXJlIGlzIGEgZHJpdmVyIGZvciBlYWNoIHNjaGVtYSBwcm92aWRlZC4gVGhlIHNjaGVtYSBpcyBhIHRlIGNvbWJpbmF0aW9uIG9mIG5hbWUgKGZvciB0aGUgZGF0YWJhc2UpLCBhIHZlcnNpb24gYXMgd2VsbCBhcyBtaWdyYXRpb25zIHRvIHJlYWNoIHRoYXRcbiAgICAvLyB2ZXJzaW9uIG9mIHRoZSBkYXRhYmFzZS5cbiAgICBmdW5jdGlvbiBEcml2ZXIoc2NoZW1hLCByZWFkeSwgbm9sb2cpIHtcbiAgICAgICAgdGhpcy5zY2hlbWEgICAgICAgICA9IHNjaGVtYTtcbiAgICAgICAgdGhpcy5yZWFkeSAgICAgICAgICA9IHJlYWR5O1xuICAgICAgICB0aGlzLmVycm9yICAgICAgICAgID0gbnVsbDtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbnMgICA9IFtdOyAvLyBVc2VkIHRvIGxpc3QgYWxsIHRyYW5zYWN0aW9ucyBhbmQga2VlcCB0cmFjayBvZiBhY3RpdmUgb25lcy5cbiAgICAgICAgdGhpcy5kYiAgICAgICAgICAgICA9IG51bGw7XG4gICAgICAgIHRoaXMubm9sb2cgICAgICAgICAgPSBub2xvZztcbiAgICAgICAgdGhpcy5zdXBwb3J0T25VcGdyYWRlTmVlZGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBsYXN0TWlncmF0aW9uUGF0aFZlcnNpb24gPSBfLmxhc3QodGhpcy5zY2hlbWEubWlncmF0aW9ucykudmVyc2lvbjtcbiAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm9wZW5pbmcgZGF0YWJhc2UgXCIgKyB0aGlzLnNjaGVtYS5pZCArIFwiIGluIHZlcnNpb24gI1wiICsgbGFzdE1pZ3JhdGlvblBhdGhWZXJzaW9uKTtcbiAgICAgICAgdGhpcy5kYlJlcXVlc3QgICAgICA9IGluZGV4ZWREQi5vcGVuKHRoaXMuc2NoZW1hLmlkLGxhc3RNaWdyYXRpb25QYXRoVmVyc2lvbik7IC8vc2NoZW1hIHZlcnNpb24gbmVlZCB0byBiZSBhbiB1bnNpZ25lZCBsb25nXG5cbiAgICAgICAgdGhpcy5sYXVuY2hNaWdyYXRpb25QYXRoID0gZnVuY3Rpb24oZGJWZXJzaW9uKSB7XG4gICAgICAgICAgICB2YXIgdHJhbnNhY3Rpb24gPSB0aGlzLmRiUmVxdWVzdC50cmFuc2FjdGlvbiB8fCB2ZXJzaW9uUmVxdWVzdC5yZXN1bHQ7XG4gICAgICAgICAgICB2YXIgY2xvbmVkTWlncmF0aW9ucyA9IF8uY2xvbmUoc2NoZW1hLm1pZ3JhdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy5taWdyYXRlKHRyYW5zYWN0aW9uLCBjbG9uZWRNaWdyYXRpb25zLCBkYlZlcnNpb24sIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZHkoKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvciA9IFwiRGF0YWJhc2Ugbm90IHVwIHRvIGRhdGUuIFwiICsgZGJWZXJzaW9uICsgXCIgZXhwZWN0ZWQgd2FzIFwiICsgbGFzdE1pZ3JhdGlvblBhdGhWZXJzaW9uO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kYlJlcXVlc3Qub25ibG9ja2VkID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcImJsb2NrZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRiUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdGhpcy5kYiA9IGUudGFyZ2V0LnJlc3VsdDsgLy8gQXR0YWNoIHRoZSBjb25uZWN0aW9uIG90IHRoZSBxdWV1ZS5cbiAgICAgICAgICAgIGlmKCF0aGlzLnN1cHBvcnRPblVwZ3JhZGVOZWVkZWQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbnREQlZlcnNpb24gPSAocGFyc2VJbnQodGhpcy5kYi52ZXJzaW9uKSB8fCAgMCk7IC8vIHdlIG5lZWQgY29udmVydCBiZWFjdXNlIGNocm9tZSBzdG9yZSBpbiBpbnRlZ2VyIGFuZCBpZTEwIERQNCsgaW4gaW50O1xuICAgICAgICAgICAgICAgIHZhciBsYXN0TWlncmF0aW9uSW50ID0gKHBhcnNlSW50KGxhc3RNaWdyYXRpb25QYXRoVmVyc2lvbikgfHwgMCk7ICAvLyBBbmQgbWFrZSBzdXJlIHdlIGNvbXBhcmUgbnVtYmVycyB3aXRoIG51bWJlcnMuXG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEludERCVmVyc2lvbiA9PT0gbGFzdE1pZ3JhdGlvbkludCkgeyAvL2lmIHN1cHBvcnQgbmV3IGV2ZW50IG9udXBncmFkZW5lZWRlZCB3aWxsIHRyaWdnZXIgdGhlIHJlYWR5IGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIG1pZ3JhdGlvbiB0byBwZXJmb3JtIVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVhZHkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRJbnREQlZlcnNpb24gPCBsYXN0TWlncmF0aW9uSW50ICkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIG1pZ3JhdGUgdXAgdG8gdGhlIGN1cnJlbnQgbWlncmF0aW9uIGRlZmluZWQgaW4gdGhlIGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF1bmNoTWlncmF0aW9uUGF0aChjdXJyZW50SW50REJWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBMb29rcyBsaWtlIHRoZSBJbmRleGVkREIgaXMgYXQgYSBoaWdoZXIgdmVyc2lvbiB0aGFuIHRoZSBjdXJyZW50IGRyaXZlciBzY2hlbWEuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBcIkRhdGFiYXNlIHZlcnNpb24gaXMgZ3JlYXRlciB0aGFuIGN1cnJlbnQgY29kZSBcIiArIGN1cnJlbnRJbnREQlZlcnNpb24gKyBcIiBleHBlY3RlZCB3YXMgXCIgKyBsYXN0TWlncmF0aW9uSW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuXG5cbiAgICAgICAgdGhpcy5kYlJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAvLyBGYWlsZWQgdG8gb3BlbiB0aGUgZGF0YWJhc2VcbiAgICAgICAgICAgIHRoaXMuZXJyb3IgPSBcIkNvdWxkbid0IG5vdCBjb25uZWN0IHRvIHRoZSBkYXRhYmFzZVwiXG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLmRiUmVxdWVzdC5vbmFib3J0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIC8vIEZhaWxlZCB0byBvcGVuIHRoZSBkYXRhYmFzZVxuICAgICAgICAgICAgdGhpcy5lcnJvciA9IFwiQ29ubmVjdGlvbiB0byB0aGUgZGF0YWJhc2UgYWJvcnRlZFwiXG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuXG5cbiAgICAgICAgdGhpcy5kYlJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oaURCVmVyc2lvbkNoYW5nZUV2ZW50KXtcbiAgICAgICAgICAgIHRoaXMuZGIgPWlEQlZlcnNpb25DaGFuZ2VFdmVudC50YXJnZXQudHJhbnNhY3Rpb24uZGI7XG5cbiAgICAgICAgICAgIHRoaXMuc3VwcG9ydE9uVXBncmFkZU5lZWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJvbnVwZ3JhZGVuZWVkZWQgPSBcIiArIGlEQlZlcnNpb25DaGFuZ2VFdmVudC5vbGRWZXJzaW9uICsgXCIgPT4gXCIgKyBpREJWZXJzaW9uQ2hhbmdlRXZlbnQubmV3VmVyc2lvbik7XG4gICAgICAgICAgICB0aGlzLmxhdW5jaE1pZ3JhdGlvblBhdGgoaURCVmVyc2lvbkNoYW5nZUV2ZW50Lm9sZFZlcnNpb24pO1xuXG5cbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlYnVnTG9nKHN0cikge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2Ygd2luZG93LmNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIHdpbmRvdy5jb25zb2xlLmxvZyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgd2luZG93LmNvbnNvbGUubG9nKHN0cik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihjb25zb2xlLmxvZyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coc3RyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRHJpdmVyIFByb3RvdHlwZVxuICAgIERyaXZlci5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLy8gVHJhY2tzIHRyYW5zYWN0aW9ucy4gTW9zdGx5IGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuIFRPLUlNUFJPVkVcbiAgICAgICAgX3RyYWNrX3RyYW5zYWN0aW9uOiBmdW5jdGlvbih0cmFuc2FjdGlvbikge1xuICAgICAgICAgICAgdGhpcy50cmFuc2FjdGlvbnMucHVzaCh0cmFuc2FjdGlvbik7XG4gICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVJdCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdGhpcy50cmFuc2FjdGlvbnMuaW5kZXhPZih0cmFuc2FjdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHt0aGlzLnRyYW5zYWN0aW9ucy5zcGxpY2UoaWR4KTsgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSByZW1vdmVJdC5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24ub25hYm9ydCA9IHJlbW92ZUl0LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5vbmVycm9yID0gcmVtb3ZlSXQuYmluZCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBQZXJmb3JtcyBhbGwgdGhlIG1pZ3JhdGlvbnMgdG8gcmVhY2ggdGhlIHJpZ2h0IHZlcnNpb24gb2YgdGhlIGRhdGFiYXNlLlxuICAgICAgICBtaWdyYXRlOiBmdW5jdGlvbiAodHJhbnNhY3Rpb24sIG1pZ3JhdGlvbnMsIHZlcnNpb24sIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGJlZ2luIHZlcnNpb24gZnJvbSAjXCIgKyB2ZXJzaW9uKTtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIHZhciBtaWdyYXRpb24gPSBtaWdyYXRpb25zLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobWlncmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2ZXJzaW9uIHx8IHZlcnNpb24gPCBtaWdyYXRpb24udmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGFwcGx5IHRoaXMgbWlncmF0aW9uLVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1pZ3JhdGlvbi5iZWZvcmUgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlncmF0aW9uLmJlZm9yZSA9IGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1pZ3JhdGlvbi5hZnRlciA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaWdyYXRpb24uYWZ0ZXIgPSBmdW5jdGlvbiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gRmlyc3QsIGxldCdzIHJ1biB0aGUgYmVmb3JlIHNjcmlwdFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwibWlncmF0ZSBiZWdpbiBiZWZvcmUgdmVyc2lvbiAjXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIG1pZ3JhdGlvbi5iZWZvcmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgZG9uZSBiZWZvcmUgdmVyc2lvbiAjXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250aW51ZU1pZ3JhdGlvbiA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgYmVnaW4gbWlncmF0ZSB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZ3JhdGlvbi5taWdyYXRlKHRyYW5zYWN0aW9uLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGRvbmUgbWlncmF0ZSB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWlncmF0aW9uIHN1Y2Nlc3NmdWxseSBhcHBsaWVkbiBsZXQncyBnbyB0byB0aGUgbmV4dCBvbmUhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGJlZ2luIGFmdGVyIHZlcnNpb24gI1wiICsgbWlncmF0aW9uLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWdyYXRpb24uYWZ0ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgZG9uZSBhZnRlciB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub2xvZykgZGVidWdMb2coXCJNaWdyYXRlZCB0byBcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9sYXN0IG1vZGlmaWNhdGlvbiBvY2N1cnJlZCwgbmVlZCBmaW5pc2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG1pZ3JhdGlvbnMubGVuZ3RoID09MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qaWYodGhpcy5zdXBwb3J0T25VcGdyYWRlTmVlZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdMb2coXCJEb25lIG1pZ3JhdGluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gbW9yZSBtaWdyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2V7Ki9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgc2V0dGluZyB0cmFuc2FjdGlvbi5vbmNvbXBsZXRlIHRvIGZpbmlzaCAgdmVyc2lvbiAjXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC5ub2xvZykgZGVidWdMb2coXCJtaWdyYXRlIGRvbmUgdHJhbnNhY3Rpb24ub25jb21wbGV0ZSB2ZXJzaW9uICNcIiArIG1pZ3JhdGlvbi52ZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0Lm5vbG9nKSBkZWJ1Z0xvZyhcIkRvbmUgbWlncmF0aW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gbW9yZSBtaWdyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy99XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vbG9nKSBkZWJ1Z0xvZyhcIm1pZ3JhdGUgZW5kIGZyb20gdmVyc2lvbiAjXCIgKyB2ZXJzaW9uICsgXCIgdG8gXCIgKyBtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQubWlncmF0ZSh0cmFuc2FjdGlvbiwgbWlncmF0aW9ucywgdmVyc2lvbiwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZighdGhpcy5zdXBwb3J0T25VcGdyYWRlTmVlZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwibWlncmF0ZSBiZWdpbiBzZXRWZXJzaW9uIHZlcnNpb24gI1wiICsgbWlncmF0aW9uLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2ZXJzaW9uUmVxdWVzdCA9IHRoaXMuZGIuc2V0VmVyc2lvbihtaWdyYXRpb24udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvblJlcXVlc3Qub25zdWNjZXNzID0gY29udGludWVNaWdyYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvblJlcXVlc3Qub25lcnJvciA9IG9wdGlvbnMuZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZU1pZ3JhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gbmVlZCB0byBhcHBseSB0aGlzIG1pZ3JhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwiU2tpcHBpbmcgbWlncmF0aW9uIFwiICsgbWlncmF0aW9uLnZlcnNpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1pZ3JhdGUodHJhbnNhY3Rpb24sIG1pZ3JhdGlvbnMsIHZlcnNpb24sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUaGlzIGlzIHRoZSBtYWluIG1ldGhvZCwgY2FsbGVkIGJ5IHRoZSBFeGVjdXRpb25RdWV1ZSB3aGVuIHRoZSBkcml2ZXIgaXMgcmVhZHkgKGRhdGFiYXNlIG9wZW4gYW5kIG1pZ3JhdGlvbiBwZXJmb3JtZWQpXG4gICAgICAgIGV4ZWN1dGU6IGZ1bmN0aW9uIChzdG9yZU5hbWUsIG1ldGhvZCwgb2JqZWN0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubm9sb2cpIGRlYnVnTG9nKFwiZXhlY3V0ZSA6IFwiICsgbWV0aG9kICsgIFwiIG9uIFwiICsgc3RvcmVOYW1lICsgXCIgZm9yIFwiICsgb2JqZWN0LmlkKTtcbiAgICAgICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlIFwiY3JlYXRlXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGUoc3RvcmVOYW1lLCBvYmplY3QsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInJlYWRcIjpcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0LmlkIHx8IG9iamVjdC5jaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWFkKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTsgLy8gSXQncyBhIG1vZGVsXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5xdWVyeShzdG9yZU5hbWUsIG9iamVjdCwgb3B0aW9ucyk7IC8vIEl0J3MgYSBjb2xsZWN0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTsgLy8gV2UgbWF5IHdhbnQgdG8gY2hlY2sgdGhhdCB0aGlzIGlzIG5vdCBhIGNvbGxlY3Rpb24uIFRPRklYXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdC5pZCB8fCBvYmplY3QuY2lkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEh1bSB3aGF0P1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFdyaXRlcyB0aGUganNvbiB0byB0aGUgc3RvcmVOYW1lIGluIGRiLiBJdCBpcyBhIGNyZWF0ZSBvcGVyYXRpb25zLCB3aGljaCBtZWFucyBpdCB3aWxsIGZhaWwgaWYgdGhlIGtleSBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAvLyBvcHRpb25zIGFyZSBqdXN0IHN1Y2Nlc3MgYW5kIGVycm9yIGNhbGxiYWNrcy5cbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAoc3RvcmVOYW1lLCBvYmplY3QsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciB3cml0ZVRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgJ3JlYWR3cml0ZScpO1xuICAgICAgICAgICAgLy90aGlzLl90cmFja190cmFuc2FjdGlvbih3cml0ZVRyYW5zYWN0aW9uKTtcbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHdyaXRlVHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIHZhciBqc29uID0gb2JqZWN0LnRvSlNPTigpO1xuICAgICAgICAgICAgdmFyIHdyaXRlUmVxdWVzdDtcblxuICAgICAgICAgICAgaWYgKGpzb24uaWQgPT09IHVuZGVmaW5lZCAmJiAhc3RvcmUuYXV0b0luY3JlbWVudCkganNvbi5pZCA9IGd1aWQoKTtcblxuICAgICAgICAgICAgd3JpdGVUcmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdyaXRlVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKGpzb24pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCFzdG9yZS5rZXlQYXRoKVxuICAgICAgICAgICAgICAgIHdyaXRlUmVxdWVzdCA9IHN0b3JlLmFkZChqc29uLCBqc29uLmlkKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB3cml0ZVJlcXVlc3QgPSBzdG9yZS5hZGQoanNvbik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gV3JpdGVzIHRoZSBqc29uIHRvIHRoZSBzdG9yZU5hbWUgaW4gZGIuIEl0IGlzIGFuIHVwZGF0ZSBvcGVyYXRpb24sIHdoaWNoIG1lYW5zIGl0IHdpbGwgb3ZlcndyaXRlIHRoZSB2YWx1ZSBpZiB0aGUga2V5IGFscmVhZHkgZXhpc3RcbiAgICAgICAgLy8gb3B0aW9ucyBhcmUganVzdCBzdWNjZXNzIGFuZCBlcnJvciBjYWxsYmFja3MuXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgd3JpdGVUcmFuc2FjdGlvbiA9IHRoaXMuZGIudHJhbnNhY3Rpb24oW3N0b3JlTmFtZV0sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgICAgIC8vdGhpcy5fdHJhY2tfdHJhbnNhY3Rpb24od3JpdGVUcmFuc2FjdGlvbik7XG4gICAgICAgICAgICB2YXIgc3RvcmUgPSB3cml0ZVRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHN0b3JlTmFtZSk7XG4gICAgICAgICAgICB2YXIganNvbiA9IG9iamVjdC50b0pTT04oKTtcbiAgICAgICAgICAgIHZhciB3cml0ZVJlcXVlc3Q7XG5cbiAgICAgICAgICAgIGlmICghanNvbi5pZCkganNvbi5pZCA9IGd1aWQoKTtcblxuICAgICAgICAgICAgaWYgKCFzdG9yZS5rZXlQYXRoKVxuICAgICAgICAgICAgICB3cml0ZVJlcXVlc3QgPSBzdG9yZS5wdXQoanNvbiwganNvbi5pZCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHdyaXRlUmVxdWVzdCA9IHN0b3JlLnB1dChqc29uKTtcblxuICAgICAgICAgICAgd3JpdGVSZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd3JpdGVUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3MoanNvbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFJlYWRzIGZyb20gc3RvcmVOYW1lIGluIGRiIHdpdGgganNvbi5pZCBpZiBpdCdzIHRoZXJlIG9mIHdpdGggYW55IGpzb24ueHh4eCBhcyBsb25nIGFzIHh4eCBpcyBhbiBpbmRleCBpbiBzdG9yZU5hbWVcbiAgICAgICAgcmVhZDogZnVuY3Rpb24gKHN0b3JlTmFtZSwgb2JqZWN0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgcmVhZFRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgXCJyZWFkb25seVwiKTtcbiAgICAgICAgICAgIHRoaXMuX3RyYWNrX3RyYW5zYWN0aW9uKHJlYWRUcmFuc2FjdGlvbik7XG5cbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHJlYWRUcmFuc2FjdGlvbi5vYmplY3RTdG9yZShzdG9yZU5hbWUpO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBvYmplY3QudG9KU09OKCk7XG5cbiAgICAgICAgICAgIHZhciBnZXRSZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChqc29uLmlkKSB7XG4gICAgICAgICAgICAgICAgZ2V0UmVxdWVzdCA9IHN0b3JlLmdldChqc29uLmlkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihvcHRpb25zLmluZGV4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gc3RvcmUuaW5kZXgob3B0aW9ucy5pbmRleC5uYW1lKTtcbiAgICAgICAgICAgICAgICBnZXRSZXF1ZXN0ID0gaW5kZXguZ2V0KG9wdGlvbnMuaW5kZXgudmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgd2hpY2ggaW5kZXggd2UgaGF2ZVxuICAgICAgICAgICAgICAgIHZhciBjYXJkaW5hbGl0eSA9IDA7IC8vIHRyeSB0byBmaXQgdGhlIGluZGV4IHdpdGggbW9zdCBtYXRjaGVzXG4gICAgICAgICAgICAgICAgXy5lYWNoKHN0b3JlLmluZGV4TmFtZXMsIGZ1bmN0aW9uIChrZXksIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gc3RvcmUuaW5kZXgoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGluZGV4LmtleVBhdGggPT09ICdzdHJpbmcnICYmIDEgPiBjYXJkaW5hbGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2ltcGxlIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoanNvbltpbmRleC5rZXlQYXRoXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmVxdWVzdCA9IGluZGV4LmdldChqc29uW2luZGV4LmtleVBhdGhdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJkaW5hbGl0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih0eXBlb2YgaW5kZXgua2V5UGF0aCA9PT0gJ29iamVjdCcgJiYgaW5kZXgua2V5UGF0aC5sZW5ndGggPiBjYXJkaW5hbGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29tcG91bmQgaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWxpZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5VmFsdWUgPSBfLm1hcChpbmRleC5rZXlQYXRoLCBmdW5jdGlvbihrZXlQYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB2YWxpZCAmJiBqc29uW2tleVBhcnRdICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGpzb25ba2V5UGFydF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UmVxdWVzdCA9IGluZGV4LmdldChrZXlWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FyZGluYWxpdHkgPSBpbmRleC5rZXlQYXRoLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdldFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICBnZXRSZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKGV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihcIk5vdCBGb3VuZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZ2V0UmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwiTm90IEZvdW5kXCIpOyAvLyBXZSBjb3VsZG4ndCBmaW5kIHRoZSByZWNvcmQuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwiTm90IEZvdW5kXCIpOyAvLyBXZSBjb3VsZG4ndCBldmVuIGxvb2sgZm9yIGl0LCBhcyB3ZSBkb24ndCBoYXZlIGVub3VnaCBkYXRhLlxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIERlbGV0ZXMgdGhlIGpzb24uaWQga2V5IGFuZCB2YWx1ZSBpbiBzdG9yZU5hbWUgZnJvbSBkYi5cbiAgICAgICAgZGVsZXRlOiBmdW5jdGlvbiAoc3RvcmVOYW1lLCBvYmplY3QsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWxldGVUcmFuc2FjdGlvbiA9IHRoaXMuZGIudHJhbnNhY3Rpb24oW3N0b3JlTmFtZV0sICdyZWFkd3JpdGUnKTtcbiAgICAgICAgICAgIC8vdGhpcy5fdHJhY2tfdHJhbnNhY3Rpb24oZGVsZXRlVHJhbnNhY3Rpb24pO1xuXG4gICAgICAgICAgICB2YXIgc3RvcmUgPSBkZWxldGVUcmFuc2FjdGlvbi5vYmplY3RTdG9yZShzdG9yZU5hbWUpO1xuICAgICAgICAgICAgdmFyIGpzb24gPSBvYmplY3QudG9KU09OKCk7XG5cbiAgICAgICAgICAgIHZhciBkZWxldGVSZXF1ZXN0ID0gc3RvcmUuZGVsZXRlKGpzb24uaWQpO1xuXG4gICAgICAgICAgICBkZWxldGVUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5zdWNjZXNzKG51bGwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRlbGV0ZVJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoXCJOb3QgRGVsZXRlZFwiKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gQ2xlYXJzIGFsbCByZWNvcmRzIGZvciBzdG9yZU5hbWUgZnJvbSBkYi5cbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uIChzdG9yZU5hbWUsIG9iamVjdCwgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGRlbGV0ZVRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgXCJyZWFkd3JpdGVcIik7XG4gICAgICAgICAgICAvL3RoaXMuX3RyYWNrX3RyYW5zYWN0aW9uKGRlbGV0ZVRyYW5zYWN0aW9uKTtcblxuICAgICAgICAgICAgdmFyIHN0b3JlID0gZGVsZXRlVHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcblxuICAgICAgICAgICAgdmFyIGRlbGV0ZVJlcXVlc3QgPSBzdG9yZS5jbGVhcigpO1xuICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnN1Y2Nlc3MobnVsbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lcnJvcihcIk5vdCBDbGVhcmVkXCIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBQZXJmb3JtcyBhIHF1ZXJ5IG9uIHN0b3JlTmFtZSBpbiBkYi5cbiAgICAgICAgLy8gb3B0aW9ucyBtYXkgaW5jbHVkZSA6XG4gICAgICAgIC8vIC0gY29uZGl0aW9ucyA6IHZhbHVlIG9mIGFuIGluZGV4LCBvciByYW5nZSBmb3IgYW4gaW5kZXhcbiAgICAgICAgLy8gLSByYW5nZSA6IHJhbmdlIGZvciB0aGUgcHJpbWFyeSBrZXlcbiAgICAgICAgLy8gLSBsaW1pdCA6IG1heCBudW1iZXIgb2YgZWxlbWVudHMgdG8gYmUgeWllbGRlZFxuICAgICAgICAvLyAtIG9mZnNldCA6IHNraXBwZWQgaXRlbXMuXG4gICAgICAgIHF1ZXJ5OiBmdW5jdGlvbiAoc3RvcmVOYW1lLCBjb2xsZWN0aW9uLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBza2lwcGVkID0gMCwgcHJvY2Vzc2VkID0gMDtcbiAgICAgICAgICAgIHZhciBxdWVyeVRyYW5zYWN0aW9uID0gdGhpcy5kYi50cmFuc2FjdGlvbihbc3RvcmVOYW1lXSwgXCJyZWFkb25seVwiKTtcbiAgICAgICAgICAgIC8vdGhpcy5fdHJhY2tfdHJhbnNhY3Rpb24ocXVlcnlUcmFuc2FjdGlvbik7XG5cbiAgICAgICAgICAgIHZhciByZWFkQ3Vyc29yID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHF1ZXJ5VHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG51bGwsXG4gICAgICAgICAgICAgICAgbG93ZXIgPSBudWxsLFxuICAgICAgICAgICAgICAgIHVwcGVyID0gbnVsbCxcbiAgICAgICAgICAgICAgICBib3VuZHMgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5jb25kaXRpb25zKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIGNvbmRpdGlvbiwgd2UgbmVlZCB0byB1c2UgaXQgZm9yIHRoZSBjdXJzb3JcbiAgICAgICAgICAgICAgICBfLmVhY2goc3RvcmUuaW5kZXhOYW1lcywgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlYWRDdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gc3RvcmUuaW5kZXgoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmNvbmRpdGlvbnNbaW5kZXgua2V5UGF0aF0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvd2VyID0gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdID4gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdID8gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdIDogb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwcGVyID0gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdID4gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdID8gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdIDogb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IElEQktleVJhbmdlLmJvdW5kKGxvd2VyLCB1cHBlciwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzBdID4gb3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvb2tzIGxpa2Ugd2Ugd2FudCB0aGUgREVTQyBvcmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gaW5kZXgub3BlbkN1cnNvcihib3VuZHMsIHdpbmRvdy5JREJDdXJzb3IuUFJFViB8fCBcInByZXZcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2FudCBBU0Mgb3JkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZEN1cnNvciA9IGluZGV4Lm9wZW5DdXJzb3IoYm91bmRzLCB3aW5kb3cuSURCQ3Vyc29yLk5FWFQgfHwgXCJuZXh0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kcyA9IElEQktleVJhbmdlLm9ubHkob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gaW5kZXgub3BlbkN1cnNvcihib3VuZHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIGNvbmRpdGlvbnMsIHVzZSB0aGUgaW5kZXhcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBsb3dlciA9IG9wdGlvbnMucmFuZ2VbMF0gPiBvcHRpb25zLnJhbmdlWzFdID8gb3B0aW9ucy5yYW5nZVsxXSA6IG9wdGlvbnMucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgIHVwcGVyID0gb3B0aW9ucy5yYW5nZVswXSA+IG9wdGlvbnMucmFuZ2VbMV0gPyBvcHRpb25zLnJhbmdlWzBdIDogb3B0aW9ucy5yYW5nZVsxXTtcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzID0gSURCS2V5UmFuZ2UuYm91bmQobG93ZXIsIHVwcGVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucmFuZ2VbMF0gPiBvcHRpb25zLnJhbmdlWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gc3RvcmUub3BlbkN1cnNvcihib3VuZHMsIHdpbmRvdy5JREJDdXJzb3IuUFJFViB8fCBcInByZXZcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gc3RvcmUub3BlbkN1cnNvcihib3VuZHMsIHdpbmRvdy5JREJDdXJzb3IuTkVYVCB8fCBcIm5leHRcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWFkQ3Vyc29yID0gc3RvcmUub3BlbkN1cnNvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiAocmVhZEN1cnNvcikgPT0gXCJ1bmRlZmluZWRcIiB8fCAhcmVhZEN1cnNvcikge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXJyb3IoXCJObyBDdXJzb3JcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlYWRDdXJzb3Iub25lcnJvciA9IGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmVycm9yKFwicmVhZEN1cnNvciBlcnJvclwiLCBlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vIFNldHVwIGEgaGFuZGxlciBmb3IgdGhlIGN1cnNvcuKAmXMgYHN1Y2Nlc3NgIGV2ZW50OlxuICAgICAgICAgICAgICAgIHJlYWRDdXJzb3Iub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IGUudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmFkZEluZGl2aWR1YWxseSB8fCBvcHRpb25zLmNsZWFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm90aGluZyFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIHRvIGluZGljYXRlIHRoYXQgd2UncmUgZG9uZS4gQnV0LCBob3c/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbi50cmlnZ2VyKFwicmVzZXRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc3VjY2VzcyhlbGVtZW50cyk7IC8vIFdlJ3JlIGRvbmUuIE5vIG1vcmUgZWxlbWVudHMuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDdXJzb3IgaXMgbm90IG92ZXIgeWV0LlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMubGltaXQgJiYgcHJvY2Vzc2VkID49IG9wdGlvbnMubGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBZZXQsIHdlIGhhdmUgcHJvY2Vzc2VkIGVub3VnaCBlbGVtZW50cy4gU28sIGxldCdzIGp1c3Qgc2tpcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYm91bmRzICYmIG9wdGlvbnMuY29uZGl0aW9uc1tpbmRleC5rZXlQYXRoXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUob3B0aW9ucy5jb25kaXRpb25zW2luZGV4LmtleVBhdGhdWzFdICsgMSk7IC8qIFdlIG5lZWQgdG8gJ3Rlcm1pbmF0ZScgdGhlIGN1cnNvciBjbGVhbnksIGJ5IG1vdmluZyB0byB0aGUgZW5kICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7IC8qIFdlIG5lZWQgdG8gJ3Rlcm1pbmF0ZScgdGhlIGN1cnNvciBjbGVhbnksIGJ5IG1vdmluZyB0byB0aGUgZW5kICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAob3B0aW9ucy5vZmZzZXQgJiYgb3B0aW9ucy5vZmZzZXQgPiBza2lwcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpOyAvKiBXZSBuZWVkIHRvIE1vdmluZyB0aGUgY3Vyc29yIGZvcndhcmQgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyB0aW1lLCBpdCBsb29rcyBsaWtlIGl0J3MgZ29vZCFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hZGRJbmRpdmlkdWFsbHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbi5hZGQoY3Vyc29yLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY2xlYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGV0ZVJlcXVlc3QgPSBzdG9yZS5kZWxldGUoY3Vyc29yLnZhbHVlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goY3Vyc29yLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGN1cnNvci52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGN1cnNvci52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2UgOmZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZih0aGlzLmRiKXtcbiAgICAgICAgICAgICAgICB0aGlzLmRiLmNsb3NlKClcbjsgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gRXhlY3V0aW9uUXVldWUgb2JqZWN0XG4gICAgLy8gVGhlIGV4ZWN1dGlvbiBxdWV1ZSBpcyBhbiBhYnN0cmFjdGlvbiB0byBidWZmZXIgdXAgcmVxdWVzdHMgdG8gdGhlIGRhdGFiYXNlLlxuICAgIC8vIEl0IGhvbGRzIGEgXCJkcml2ZXJcIi4gV2hlbiB0aGUgZHJpdmVyIGlzIHJlYWR5LCBpdCBqdXN0IGZpcmVzIHVwIHRoZSBxdWV1ZSBhbmQgZXhlY3V0ZXMgaW4gc3luYy5cbiAgICBmdW5jdGlvbiBFeGVjdXRpb25RdWV1ZShzY2hlbWEsbmV4dCxub2xvZykge1xuICAgICAgICB0aGlzLmRyaXZlciAgICAgPSBuZXcgRHJpdmVyKHNjaGVtYSwgdGhpcy5yZWFkeS5iaW5kKHRoaXMpLCBub2xvZyk7XG4gICAgICAgIHRoaXMuc3RhcnRlZCAgICA9IGZhbHNlO1xuICAgICAgICB0aGlzLnN0YWNrICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy52ZXJzaW9uICAgID0gXy5sYXN0KHNjaGVtYS5taWdyYXRpb25zKS52ZXJzaW9uO1xuICAgICAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIH1cblxuICAgIC8vIEV4ZWN1dGlvblF1ZXVlIFByb3RvdHlwZVxuICAgIEV4ZWN1dGlvblF1ZXVlLnByb3RvdHlwZSA9IHtcbiAgICAgICAgLy8gQ2FsbGVkIHdoZW4gdGhlIGRyaXZlciBpcyByZWFkeVxuICAgICAgICAvLyBJdCBqdXN0IGxvb3BzIG92ZXIgdGhlIGVsZW1lbnRzIGluIHRoZSBxdWV1ZSBhbmQgZXhlY3V0ZXMgdGhlbS5cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICBfLmVhY2godGhpcy5zdGFjaywgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGUobWVzc2FnZSk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5zdGFjayA9IFtdOyAgICAvLyBmaXggbWVtb3J5IGxlYWtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIEV4ZWN1dGVzIGEgZ2l2ZW4gY29tbWFuZCBvbiB0aGUgZHJpdmVyLiBJZiBub3Qgc3RhcnRlZCwganVzdCBzdGFja3MgdXAgb25lIG1vcmUgZWxlbWVudC5cbiAgICAgICAgZXhlY3V0ZTogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRyaXZlci5leGVjdXRlKG1lc3NhZ2VbMl0uc3RvcmVOYW1lIHx8IG1lc3NhZ2VbMV0uc3RvcmVOYW1lLCBtZXNzYWdlWzBdLCBtZXNzYWdlWzFdLCBtZXNzYWdlWzJdKTsgLy8gVXBvbiBtZXNzYWdlcywgd2UgZXhlY3V0ZSB0aGUgcXVlcnlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNsb3NlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuZHJpdmVyLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gTWV0aG9kIHVzZWQgYnkgQmFja2JvbmUgZm9yIHN5bmMgb2YgZGF0YSB3aXRoIGRhdGEgc3RvcmUuIEl0IHdhcyBpbml0aWFsbHkgZGVzaWduZWQgdG8gd29yayB3aXRoIFwic2VydmVyIHNpZGVcIiBBUElzLCBUaGlzIHdyYXBwZXIgbWFrZXNcbiAgICAvLyBpdCB3b3JrIHdpdGggdGhlIGxvY2FsIGluZGV4ZWREQiBzdHVmZi4gSXQgdXNlcyB0aGUgc2NoZW1hIGF0dHJpYnV0ZSBwcm92aWRlZCBieSB0aGUgb2JqZWN0LlxuICAgIC8vIFRoZSB3cmFwcGVyIGtlZXBzIGFuIGFjdGl2ZSBFeGVjdXR1b24gUXVldWUgZm9yIGVhY2ggXCJzY2hlbWFcIiwgYW5kIGV4ZWN1dGVzIHF1ZXJ1ZXMgYWdhaW5zIGl0LCBiYXNlZCBvbiB0aGUgb2JqZWN0IHR5cGUgKGNvbGxlY3Rpb24gb3JcbiAgICAvLyBzaW5nbGUgbW9kZWwpLCBidXQgYWxzbyB0aGUgbWV0aG9kLi4uIGV0Yy5cbiAgICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgY29ubmVjdGlvbnNcbiAgICB2YXIgRGF0YWJhc2VzID0ge307XG5cbiAgICBmdW5jdGlvbiBzeW5jKG1ldGhvZCwgb2JqZWN0LCBvcHRpb25zKSB7XG5cbiAgICAgICAgaWYobWV0aG9kPT1cImNsb3NlYWxsXCIpe1xuICAgICAgICAgICAgXy5lYWNoKERhdGFiYXNlcyxmdW5jdGlvbihkYXRhYmFzZSl7XG4gICAgICAgICAgICAgICAgZGF0YWJhc2UuY2xvc2UoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgYWN0aXZlIGRhdGFiYXNlcyBvYmplY3QuXG4gICAgICAgICAgICBEYXRhYmFzZXMgPSB7fVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgYSBtb2RlbCBvciBhIGNvbGxlY3Rpb24gZG9lcyBub3QgZGVmaW5lIGEgZGF0YWJhc2UsIGZhbGwgYmFjayBvbiBhamF4U3luY1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5kYXRhYmFzZSA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEJhY2tib25lLmFqYXhTeW5jID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5hamF4U3luYyhtZXRob2QsIG9iamVjdCwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2NoZW1hID0gb2JqZWN0LmRhdGFiYXNlO1xuICAgICAgICBpZiAoRGF0YWJhc2VzW3NjaGVtYS5pZF0pIHtcbiAgICAgICAgICAgIGlmKERhdGFiYXNlc1tzY2hlbWEuaWRdLnZlcnNpb24gIT0gXy5sYXN0KHNjaGVtYS5taWdyYXRpb25zKS52ZXJzaW9uKXtcbiAgICAgICAgICAgICAgICBEYXRhYmFzZXNbc2NoZW1hLmlkXS5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBEYXRhYmFzZXNbc2NoZW1hLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcm9taXNlO1xuXG4gICAgICAgIGlmICh0eXBlb2YgQmFja2JvbmUuJCA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIEJhY2tib25lLiQuRGVmZXJyZWQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgICAgICB2YXIgcmVzb2x2ZSA9IG5vb3A7XG4gICAgICAgICAgICB2YXIgcmVqZWN0ID0gbm9vcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkZmQgPSBCYWNrYm9uZS4kLkRlZmVycmVkKCk7XG4gICAgICAgICAgICB2YXIgcmVzb2x2ZSA9IGRmZC5yZXNvbHZlO1xuICAgICAgICAgICAgdmFyIHJlamVjdCA9IGRmZC5yZWplY3Q7XG5cbiAgICAgICAgICAgIHByb21pc2UgPSBkZmQucHJvbWlzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gICAgICAgIG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzKSBzdWNjZXNzKHJlc3ApO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgb2JqZWN0LnRyaWdnZXIoJ3N5bmMnLCBvYmplY3QsIHJlc3AsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBlcnJvciA9IG9wdGlvbnMuZXJyb3I7XG4gICAgICAgIG9wdGlvbnMuZXJyb3IgPSBmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIGVycm9yKHJlc3ApO1xuICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICBvYmplY3QudHJpZ2dlcignZXJyb3InLCBvYmplY3QsIHJlc3AsIG9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIERhdGFiYXNlc1tzY2hlbWEuaWRdLmV4ZWN1dGUoW21ldGhvZCwgb2JqZWN0LCBvcHRpb25zXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCFEYXRhYmFzZXNbc2NoZW1hLmlkXSkge1xuICAgICAgICAgICAgICBEYXRhYmFzZXNbc2NoZW1hLmlkXSA9IG5ldyBFeGVjdXRpb25RdWV1ZShzY2hlbWEsbmV4dCxzY2hlbWEubm9sb2cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cblxuICAgIEJhY2tib25lLmFqYXhTeW5jID0gQmFja2JvbmUuc3luYztcbiAgICBCYWNrYm9uZS5zeW5jID0gc3luYztcblxuICAgIC8vd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ1bmxvYWRcIixmdW5jdGlvbigpe0JhY2tib25lLnN5bmMoXCJjbG9zZWFsbFwiKX0pXG59KSgpO1xuOyBicm93c2VyaWZ5X3NoaW1fX2RlZmluZV9fbW9kdWxlX19leHBvcnRfXyh0eXBlb2YgYmFja2JvbmVfaW5kZXhlZGRiICE9IFwidW5kZWZpbmVkXCIgPyBiYWNrYm9uZV9pbmRleGVkZGIgOiB3aW5kb3cuYmFja2JvbmVfaW5kZXhlZGRiKTtcblxufSkuY2FsbChnbG9iYWwsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGZ1bmN0aW9uIGRlZmluZUV4cG9ydChleCkgeyBtb2R1bGUuZXhwb3J0cyA9IGV4OyB9KTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24gYnJvd3NlcmlmeVNoaW0obW9kdWxlLCBleHBvcnRzLCBkZWZpbmUsIGJyb3dzZXJpZnlfc2hpbV9fZGVmaW5lX19tb2R1bGVfX2V4cG9ydF9fKSB7XG4vKlxuICogalF1ZXJ5IFBpbmVzIE5vdGlmeSAocG5vdGlmeSkgUGx1Z2luIDEuMi4wXG4gKlxuICogaHR0cDovL3BpbmVzZnJhbWV3b3JrLm9yZy9wbm90aWZ5L1xuICogQ29weXJpZ2h0IChjKSAyMDA5LTIwMTIgSHVudGVyIFBlcnJpblxuICpcbiAqIFRyaXBsZSBsaWNlbnNlIHVuZGVyIHRoZSBHUEwsIExHUEwsIGFuZCBNUEw6XG4gKlx0ICBodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvZ3BsLmh0bWxcbiAqXHQgIGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy9sZ3BsLmh0bWxcbiAqXHQgIGh0dHA6Ly93d3cubW96aWxsYS5vcmcvTVBML01QTC0xLjEuaHRtbFxuICovXG5cbnZhciBqUXVlcnkgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuKGZ1bmN0aW9uKCQpIHtcblxuXG5cdHZhciBoaXN0b3J5X2hhbmRsZV90b3AsXG5cdFx0dGltZXIsXG5cdFx0Ym9keSxcblx0XHRqd2luZG93ID0gJCh3aW5kb3cpLFxuXHRcdHN0eWxpbmcgPSB7XG5cdFx0XHRqcXVlcnl1aToge1xuXHRcdFx0XHRjb250YWluZXI6IFwidWktd2lkZ2V0IHVpLXdpZGdldC1jb250ZW50IHVpLWNvcm5lci1hbGxcIixcblx0XHRcdFx0bm90aWNlOiBcInVpLXN0YXRlLWhpZ2hsaWdodFwiLFxuXHRcdFx0XHQvLyAoVGhlIGFjdHVhbCBqUVVJIG5vdGljZSBpY29uIGxvb2tzIHRlcnJpYmxlLilcblx0XHRcdFx0bm90aWNlX2ljb246IFwidWktaWNvbiB1aS1pY29uLWluZm9cIixcblx0XHRcdFx0aW5mbzogXCJcIixcblx0XHRcdFx0aW5mb19pY29uOiBcInVpLWljb24gdWktaWNvbi1pbmZvXCIsXG5cdFx0XHRcdHN1Y2Nlc3M6IFwidWktc3RhdGUtZGVmYXVsdFwiLFxuXHRcdFx0XHRzdWNjZXNzX2ljb246IFwidWktaWNvbiB1aS1pY29uLWNpcmNsZS1jaGVja1wiLFxuXHRcdFx0XHRlcnJvcjogXCJ1aS1zdGF0ZS1lcnJvclwiLFxuXHRcdFx0XHRlcnJvcl9pY29uOiBcInVpLWljb24gdWktaWNvbi1hbGVydFwiLFxuXHRcdFx0XHRjbG9zZXI6IFwidWktaWNvbiB1aS1pY29uLWNsb3NlXCIsXG5cdFx0XHRcdHBpbl91cDogXCJ1aS1pY29uIHVpLWljb24tcGluLXdcIixcblx0XHRcdFx0cGluX2Rvd246IFwidWktaWNvbiB1aS1pY29uLXBpbi1zXCIsXG5cdFx0XHRcdGhpX21lbnU6IFwidWktc3RhdGUtZGVmYXVsdCB1aS1jb3JuZXItYm90dG9tXCIsXG5cdFx0XHRcdGhpX2J0bjogXCJ1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGxcIixcblx0XHRcdFx0aGlfYnRuaG92OiBcInVpLXN0YXRlLWhvdmVyXCIsXG5cdFx0XHRcdGhpX2huZDogXCJ1aS1pY29uIHVpLWljb24tZ3JpcC1kb3R0ZWQtaG9yaXpvbnRhbFwiXG5cdFx0XHR9LFxuXHRcdFx0Ym9vdHN0cmFwOiB7XG5cdFx0XHRcdGNvbnRhaW5lcjogXCJhbGVydFwiLFxuXHRcdFx0XHRub3RpY2U6IFwiXCIsXG5cdFx0XHRcdG5vdGljZV9pY29uOiBcImZhIGZhLWV4Y2xhbWF0aW9uXCIsXG5cdFx0XHRcdGluZm86IFwiYWxlcnQtaW5mb1wiLFxuXHRcdFx0XHRpbmZvX2ljb246IFwiZmEgZmEtaW5mby1jaXJjbGVcIixcblx0XHRcdFx0c3VjY2VzczogXCJhbGVydC1zdWNjZXNzXCIsXG5cdFx0XHRcdHN1Y2Nlc3NfaWNvbjogXCJmYSBmYS10aHVtYnMtby11cFwiLFxuXHRcdFx0XHRlcnJvcjogXCJhbGVydC1kYW5nZXJcIixcblx0XHRcdFx0ZXJyb3JfaWNvbjogXCJmYSBmYS1leGNsYW1hdGlvbi10cmlhbmdsZVwiLFxuXHRcdFx0XHRjbG9zZXI6IFwiZmEgZmEtdGltZXNcIixcblx0XHRcdFx0cGluX3VwOiBcImZhIGZhLXBhdXNlXCIsXG5cdFx0XHRcdHBpbl9kb3duOiBcImZhIGZhLXBsYXlcIixcblx0XHRcdFx0aGlfbWVudTogXCJ3ZWxsXCIsXG5cdFx0XHRcdGhpX2J0bjogXCJidG5cIixcblx0XHRcdFx0aGlfYnRuaG92OiBcIlwiLFxuXHRcdFx0XHRoaV9obmQ6IFwiZmEgZmEtY2hldnJvbi1kb3duXCJcblx0XHRcdH1cblx0XHR9O1xuXHQvLyBTZXQgZ2xvYmFsIHZhcmlhYmxlcy5cblx0dmFyIGRvX3doZW5fcmVhZHkgPSBmdW5jdGlvbigpe1xuXHRcdGJvZHkgPSAkKFwiYm9keVwiKTtcblx0XHRqd2luZG93ID0gJCh3aW5kb3cpO1xuXHRcdC8vIFJlcG9zaXRpb24gdGhlIG5vdGljZXMgd2hlbiB0aGUgd2luZG93IHJlc2l6ZXMuXG5cdFx0andpbmRvdy5iaW5kKCdyZXNpemUnLCBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKHRpbWVyKVxuXHRcdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCQucG5vdGlmeV9wb3NpdGlvbl9hbGwsIDEwKTtcblx0XHR9KTtcblx0fTtcblx0aWYgKGRvY3VtZW50LmJvZHkpXG5cdFx0ZG9fd2hlbl9yZWFkeSgpO1xuXHRlbHNlXG5cdFx0JChkb193aGVuX3JlYWR5KTtcblx0JC5leHRlbmQoe1xuXHRcdHBub3RpZnlfcmVtb3ZlX2FsbDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIG5vdGljZXNfZGF0YSA9IGp3aW5kb3cuZGF0YShcInBub3RpZnlcIik7XG5cdFx0XHQvKiBQT0E6IEFkZGVkIG51bGwtY2hlY2sgKi9cblx0XHRcdGlmIChub3RpY2VzX2RhdGEgJiYgbm90aWNlc19kYXRhLmxlbmd0aCkge1xuXHRcdFx0XHQkLmVhY2gobm90aWNlc19kYXRhLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGlmICh0aGlzLnBub3RpZnlfcmVtb3ZlKVxuXHRcdFx0XHRcdFx0dGhpcy5wbm90aWZ5X3JlbW92ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHBub3RpZnlfcG9zaXRpb25fYWxsOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBUaGlzIHRpbWVyIGlzIHVzZWQgZm9yIHF1ZXVlaW5nIHRoaXMgZnVuY3Rpb24gc28gaXQgZG9lc24ndCBydW5cblx0XHRcdC8vIHJlcGVhdGVkbHkuXG5cdFx0XHRpZiAodGltZXIpXG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdFx0XHR0aW1lciA9IG51bGw7XG5cdFx0XHQvLyBHZXQgYWxsIHRoZSBub3RpY2VzLlxuXHRcdFx0dmFyIG5vdGljZXNfZGF0YSA9IGp3aW5kb3cuZGF0YShcInBub3RpZnlcIik7XG5cdFx0XHRpZiAoIW5vdGljZXNfZGF0YSB8fCAhbm90aWNlc19kYXRhLmxlbmd0aClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Ly8gUmVzZXQgdGhlIG5leHQgcG9zaXRpb24gZGF0YS5cblx0XHRcdCQuZWFjaChub3RpY2VzX2RhdGEsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBzID0gdGhpcy5vcHRzLnN0YWNrO1xuXHRcdFx0XHRpZiAoIXMpIHJldHVybjtcblx0XHRcdFx0cy5uZXh0cG9zMSA9IHMuZmlyc3Rwb3MxO1xuXHRcdFx0XHRzLm5leHRwb3MyID0gcy5maXJzdHBvczI7XG5cdFx0XHRcdHMuYWRkcG9zMiA9IDA7XG5cdFx0XHRcdHMuYW5pbWF0aW9uID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdFx0JC5lYWNoKG5vdGljZXNfZGF0YSwgZnVuY3Rpb24oKXtcblx0XHRcdFx0dGhpcy5wbm90aWZ5X3Bvc2l0aW9uKCk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHBub3RpZnk6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHRcdC8vIFN0b3JlcyB3aGF0IGlzIGN1cnJlbnRseSBiZWluZyBhbmltYXRlZCAoaW4gb3Igb3V0KS5cblx0XHRcdHZhciBhbmltYXRpbmc7XG5cblx0XHRcdC8vIEJ1aWxkIG1haW4gb3B0aW9ucy5cblx0XHRcdHZhciBvcHRzO1xuXHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zICE9IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHt9LCAkLnBub3RpZnkuZGVmYXVsdHMpO1xuXHRcdFx0XHRvcHRzLnRleHQgPSBvcHRpb25zO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHt9LCAkLnBub3RpZnkuZGVmYXVsdHMsIG9wdGlvbnMpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gVHJhbnNsYXRlIG9sZCBwbm90aWZ5XyBzdHlsZSBvcHRpb25zLlxuXHRcdFx0Zm9yICh2YXIgaSBpbiBvcHRzKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgaSA9PSBcInN0cmluZ1wiICYmIGkubWF0Y2goL15wbm90aWZ5Xy8pKVxuXHRcdFx0XHRcdG9wdHNbaS5yZXBsYWNlKC9ecG5vdGlmeV8vLCBcIlwiKV0gPSBvcHRzW2ldO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob3B0cy5iZWZvcmVfaW5pdCkge1xuXHRcdFx0XHRpZiAob3B0cy5iZWZvcmVfaW5pdChvcHRzKSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRoaXMga2VlcHMgdHJhY2sgb2YgdGhlIGxhc3QgZWxlbWVudCB0aGUgbW91c2Ugd2FzIG92ZXIsIHNvXG5cdFx0XHQvLyBtb3VzZWxlYXZlLCBtb3VzZWVudGVyLCBldGMgY2FuIGJlIGNhbGxlZC5cblx0XHRcdHZhciBub25ibG9ja19sYXN0X2VsZW07XG5cdFx0XHQvLyBUaGlzIGlzIHVzZWQgdG8gcGFzcyBldmVudHMgdGhyb3VnaCB0aGUgbm90aWNlIGlmIGl0IGlzIG5vbi1ibG9ja2luZy5cblx0XHRcdHZhciBub25ibG9ja19wYXNzID0gZnVuY3Rpb24oZSwgZV9uYW1lKXtcblx0XHRcdFx0cG5vdGlmeS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblx0XHRcdFx0dmFyIGVsZW1lbnRfYmVsb3cgPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcblx0XHRcdFx0cG5vdGlmeS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG5cdFx0XHRcdHZhciBqZWxlbWVudF9iZWxvdyA9ICQoZWxlbWVudF9iZWxvdyk7XG5cdFx0XHRcdHZhciBjdXJzb3Jfc3R5bGUgPSBqZWxlbWVudF9iZWxvdy5jc3MoXCJjdXJzb3JcIik7XG5cdFx0XHRcdHBub3RpZnkuY3NzKFwiY3Vyc29yXCIsIGN1cnNvcl9zdHlsZSAhPSBcImF1dG9cIiA/IGN1cnNvcl9zdHlsZSA6IFwiZGVmYXVsdFwiKTtcblx0XHRcdFx0Ly8gSWYgdGhlIGVsZW1lbnQgY2hhbmdlZCwgY2FsbCBtb3VzZWVudGVyLCBtb3VzZWxlYXZlLCBldGMuXG5cdFx0XHRcdGlmICghbm9uYmxvY2tfbGFzdF9lbGVtIHx8IG5vbmJsb2NrX2xhc3RfZWxlbS5nZXQoMCkgIT0gZWxlbWVudF9iZWxvdykge1xuXHRcdFx0XHRcdGlmIChub25ibG9ja19sYXN0X2VsZW0pIHtcblx0XHRcdFx0XHRcdGRvbV9ldmVudC5jYWxsKG5vbmJsb2NrX2xhc3RfZWxlbS5nZXQoMCksIFwibW91c2VsZWF2ZVwiLCBlLm9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHRcdFx0ZG9tX2V2ZW50LmNhbGwobm9uYmxvY2tfbGFzdF9lbGVtLmdldCgwKSwgXCJtb3VzZW91dFwiLCBlLm9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkb21fZXZlbnQuY2FsbChlbGVtZW50X2JlbG93LCBcIm1vdXNlZW50ZXJcIiwgZS5vcmlnaW5hbEV2ZW50KTtcblx0XHRcdFx0XHRkb21fZXZlbnQuY2FsbChlbGVtZW50X2JlbG93LCBcIm1vdXNlb3ZlclwiLCBlLm9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRvbV9ldmVudC5jYWxsKGVsZW1lbnRfYmVsb3csIGVfbmFtZSwgZS5vcmlnaW5hbEV2ZW50KTtcblx0XHRcdFx0Ly8gUmVtZW1iZXIgdGhlIGxhdGVzdCBlbGVtZW50IHRoZSBtb3VzZSB3YXMgb3Zlci5cblx0XHRcdFx0bm9uYmxvY2tfbGFzdF9lbGVtID0gamVsZW1lbnRfYmVsb3c7XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBHZXQgb3VyIHN0eWxpbmcgb2JqZWN0LlxuXHRcdFx0dmFyIHN0eWxlcyA9IHN0eWxpbmdbb3B0cy5zdHlsaW5nXTtcblxuXHRcdFx0Ly8gQ3JlYXRlIG91ciB3aWRnZXQuXG5cdFx0XHQvLyBTdG9wIGFuaW1hdGlvbiwgcmVzZXQgdGhlIHJlbW92YWwgdGltZXIsIGFuZCBzaG93IHRoZSBjbG9zZVxuXHRcdFx0Ly8gYnV0dG9uIHdoZW4gdGhlIHVzZXIgbW91c2VzIG92ZXIuXG5cdFx0XHR2YXIgcG5vdGlmeSA9ICQoXCI8ZGl2IC8+XCIsIHtcblx0XHRcdFx0XCJjbGFzc1wiOiBcInVpLXBub3RpZnkgXCIrb3B0cy5hZGRjbGFzcyxcblx0XHRcdFx0XCJjc3NcIjoge1wiZGlzcGxheVwiOiBcIm5vbmVcIn0sXG5cdFx0XHRcdFwibW91c2VlbnRlclwiOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAob3B0cy5ub25ibG9jaykgZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRpZiAob3B0cy5tb3VzZV9yZXNldCAmJiBhbmltYXRpbmcgPT0gXCJvdXRcIikge1xuXHRcdFx0XHRcdFx0Ly8gSWYgaXQncyBhbmltYXRpbmcgb3V0LCBhbmltYXRlIGJhY2sgaW4gcmVhbGx5IHF1aWNrbHkuXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnN0b3AodHJ1ZSk7XG5cdFx0XHRcdFx0XHRhbmltYXRpbmcgPSBcImluXCI7XG5cdFx0XHRcdFx0XHRwbm90aWZ5LmNzcyhcImhlaWdodFwiLCBcImF1dG9cIikuYW5pbWF0ZSh7XCJ3aWR0aFwiOiBvcHRzLndpZHRoLCBcIm9wYWNpdHlcIjogb3B0cy5ub25ibG9jayA/IG9wdHMubm9uYmxvY2tfb3BhY2l0eSA6IG9wdHMub3BhY2l0eX0sIFwiZmFzdFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIHtcblx0XHRcdFx0XHRcdC8vIElmIGl0J3Mgbm9uLWJsb2NraW5nLCBhbmltYXRlIHRvIHRoZSBvdGhlciBvcGFjaXR5LlxuXHRcdFx0XHRcdFx0cG5vdGlmeS5hbmltYXRlKHtcIm9wYWNpdHlcIjogb3B0cy5ub25ibG9ja19vcGFjaXR5fSwgXCJmYXN0XCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBTdG9wIHRoZSBjbG9zZSB0aW1lci5cblx0XHRcdFx0XHRpZiAob3B0cy5oaWRlICYmIG9wdHMubW91c2VfcmVzZXQpIHBub3RpZnkucG5vdGlmeV9jYW5jZWxfcmVtb3ZlKCk7XG5cdFx0XHRcdFx0Ly8gU2hvdyB0aGUgYnV0dG9ucy5cblx0XHRcdFx0XHRpZiAob3B0cy5zdGlja2VyICYmICFvcHRzLm5vbmJsb2NrKSBwbm90aWZ5LnN0aWNrZXIudHJpZ2dlcihcInBub3RpZnlfaWNvblwiKS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcblx0XHRcdFx0XHRpZiAob3B0cy5jbG9zZXIgJiYgIW9wdHMubm9uYmxvY2spIHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRcIm1vdXNlbGVhdmVcIjogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0bm9uYmxvY2tfbGFzdF9lbGVtID0gbnVsbDtcblx0XHRcdFx0XHRwbm90aWZ5LmNzcyhcImN1cnNvclwiLCBcImF1dG9cIik7XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBiYWNrIHRvIHRoZSBub3JtYWwgb3BhY2l0eS5cblx0XHRcdFx0XHRpZiAob3B0cy5ub25ibG9jayAmJiBhbmltYXRpbmcgIT0gXCJvdXRcIilcblx0XHRcdFx0XHRcdHBub3RpZnkuYW5pbWF0ZSh7XCJvcGFjaXR5XCI6IG9wdHMub3BhY2l0eX0sIFwiZmFzdFwiKTtcblx0XHRcdFx0XHQvLyBTdGFydCB0aGUgY2xvc2UgdGltZXIuXG5cdFx0XHRcdFx0aWYgKG9wdHMuaGlkZSAmJiBvcHRzLm1vdXNlX3Jlc2V0KSBwbm90aWZ5LnBub3RpZnlfcXVldWVfcmVtb3ZlKCk7XG5cdFx0XHRcdFx0Ly8gSGlkZSB0aGUgYnV0dG9ucy5cblx0XHRcdFx0XHRpZiAob3B0cy5zdGlja2VyX2hvdmVyKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5zdGlja2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdFx0aWYgKG9wdHMuY2xvc2VyX2hvdmVyKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5jbG9zZXIuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHRcdFx0XHQkLnBub3RpZnlfcG9zaXRpb25fYWxsKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibW91c2VvdmVyXCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRcIm1vdXNlb3V0XCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRcIm1vdXNlbW92ZVwiOiBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAob3B0cy5ub25ibG9jaykge1xuXHRcdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRcdG5vbmJsb2NrX3Bhc3MoZSwgXCJvbm1vdXNlbW92ZVwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwibW91c2Vkb3duXCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSB7XG5cdFx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0bm9uYmxvY2tfcGFzcyhlLCBcIm9ubW91c2Vkb3duXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0XCJtb3VzZXVwXCI6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmIChvcHRzLm5vbmJsb2NrKSB7XG5cdFx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0bm9uYmxvY2tfcGFzcyhlLCBcIm9ubW91c2V1cFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiY2xpY2tcIjogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIHtcblx0XHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHRub25ibG9ja19wYXNzKGUsIFwib25jbGlja1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFwiZGJsY2xpY2tcIjogZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKG9wdHMubm9uYmxvY2spIHtcblx0XHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHRub25ibG9ja19wYXNzKGUsIFwib25kYmxjbGlja1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cG5vdGlmeS5vcHRzID0gb3B0cztcblx0XHRcdC8vIENyZWF0ZSBhIGNvbnRhaW5lciBmb3IgdGhlIG5vdGljZSBjb250ZW50cy5cblx0XHRcdHBub3RpZnkuY29udGFpbmVyID0gJChcIjxkaXYgLz5cIiwge1wiY2xhc3NcIjogc3R5bGVzLmNvbnRhaW5lcitcIiB1aS1wbm90aWZ5LWNvbnRhaW5lciBcIisob3B0cy50eXBlID09IFwiZXJyb3JcIiA/IHN0eWxlcy5lcnJvciA6IChvcHRzLnR5cGUgPT0gXCJpbmZvXCIgPyBzdHlsZXMuaW5mbyA6IChvcHRzLnR5cGUgPT0gXCJzdWNjZXNzXCIgPyBzdHlsZXMuc3VjY2VzcyA6IHN0eWxlcy5ub3RpY2UpKSl9KVxuXHRcdFx0LmFwcGVuZFRvKHBub3RpZnkpO1xuXHRcdFx0aWYgKG9wdHMuY29ybmVyY2xhc3MgIT0gXCJcIilcblx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJ1aS1jb3JuZXItYWxsXCIpLmFkZENsYXNzKG9wdHMuY29ybmVyY2xhc3MpO1xuXHRcdFx0Ly8gQ3JlYXRlIGEgZHJvcCBzaGFkb3cuXG5cdFx0XHRpZiAob3B0cy5zaGFkb3cpXG5cdFx0XHRcdHBub3RpZnkuY29udGFpbmVyLmFkZENsYXNzKFwidWktcG5vdGlmeS1zaGFkb3dcIik7XG5cblx0XHRcdC8vIFRoZSBjdXJyZW50IHZlcnNpb24gb2YgUGluZXMgTm90aWZ5LlxuXHRcdFx0cG5vdGlmeS5wbm90aWZ5X3ZlcnNpb24gPSBcIjEuMi4wXCI7XG5cblx0XHRcdC8vIFRoaXMgZnVuY3Rpb24gaXMgZm9yIHVwZGF0aW5nIHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnkgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgbm90aWNlLlxuXHRcdFx0XHR2YXIgb2xkX29wdHMgPSBvcHRzO1xuXHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMgPT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRvcHRzLnRleHQgPSBvcHRpb25zO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHt9LCBvcHRzLCBvcHRpb25zKTtcblx0XHRcdFx0Ly8gVHJhbnNsYXRlIG9sZCBwbm90aWZ5XyBzdHlsZSBvcHRpb25zLlxuXHRcdFx0XHRmb3IgKHZhciBpIGluIG9wdHMpIHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGkgPT0gXCJzdHJpbmdcIiAmJiBpLm1hdGNoKC9ecG5vdGlmeV8vKSlcblx0XHRcdFx0XHRcdG9wdHNbaS5yZXBsYWNlKC9ecG5vdGlmeV8vLCBcIlwiKV0gPSBvcHRzW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBub3RpZnkub3B0cyA9IG9wdHM7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgY29ybmVyIGNsYXNzLlxuXHRcdFx0XHRpZiAob3B0cy5jb3JuZXJjbGFzcyAhPSBvbGRfb3B0cy5jb3JuZXJjbGFzcylcblx0XHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcInVpLWNvcm5lci1hbGxcIikuYWRkQ2xhc3Mob3B0cy5jb3JuZXJjbGFzcyk7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc2hhZG93LlxuXHRcdFx0XHRpZiAob3B0cy5zaGFkb3cgIT0gb2xkX29wdHMuc2hhZG93KSB7XG5cdFx0XHRcdFx0aWYgKG9wdHMuc2hhZG93KVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIuYWRkQ2xhc3MoXCJ1aS1wbm90aWZ5LXNoYWRvd1wiKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcInVpLXBub3RpZnktc2hhZG93XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgYWRkaXRpb25hbCBjbGFzc2VzLlxuXHRcdFx0XHRpZiAob3B0cy5hZGRjbGFzcyA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0cG5vdGlmeS5yZW1vdmVDbGFzcyhvbGRfb3B0cy5hZGRjbGFzcyk7XG5cdFx0XHRcdGVsc2UgaWYgKG9wdHMuYWRkY2xhc3MgIT09IG9sZF9vcHRzLmFkZGNsYXNzKVxuXHRcdFx0XHRcdHBub3RpZnkucmVtb3ZlQ2xhc3Mob2xkX29wdHMuYWRkY2xhc3MpLmFkZENsYXNzKG9wdHMuYWRkY2xhc3MpO1xuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRpdGxlLlxuXHRcdFx0XHRpZiAob3B0cy50aXRsZSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0cG5vdGlmeS50aXRsZV9jb250YWluZXIuc2xpZGVVcChcImZhc3RcIik7XG5cdFx0XHRcdGVsc2UgaWYgKG9wdHMudGl0bGUgIT09IG9sZF9vcHRzLnRpdGxlKSB7XG5cdFx0XHRcdFx0aWYgKG9wdHMudGl0bGVfZXNjYXBlKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS50aXRsZV9jb250YWluZXIudGV4dChvcHRzLnRpdGxlKS5zbGlkZURvd24oMjAwKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnRpdGxlX2NvbnRhaW5lci5odG1sKG9wdHMudGl0bGUpLnNsaWRlRG93bigyMDApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdGV4dC5cblx0XHRcdFx0aWYgKG9wdHMudGV4dCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRwbm90aWZ5LnRleHRfY29udGFpbmVyLnNsaWRlVXAoXCJmYXN0XCIpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKG9wdHMudGV4dCAhPT0gb2xkX29wdHMudGV4dCkge1xuXHRcdFx0XHRcdGlmIChvcHRzLnRleHRfZXNjYXBlKVxuXHRcdFx0XHRcdFx0cG5vdGlmeS50ZXh0X2NvbnRhaW5lci50ZXh0KG9wdHMudGV4dCkuc2xpZGVEb3duKDIwMCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cG5vdGlmeS50ZXh0X2NvbnRhaW5lci5odG1sKG9wdHMuaW5zZXJ0X2JycyA/IFN0cmluZyhvcHRzLnRleHQpLnJlcGxhY2UoL1xcbi9nLCBcIjxiciAvPlwiKSA6IG9wdHMudGV4dCkuc2xpZGVEb3duKDIwMCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gVXBkYXRlIHZhbHVlcyBmb3IgaGlzdG9yeSBtZW51IGFjY2Vzcy5cblx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X2hpc3RvcnkgPSBvcHRzLmhpc3Rvcnk7XG5cdFx0XHRcdHBub3RpZnkucG5vdGlmeV9oaWRlID0gb3B0cy5oaWRlO1xuXHRcdFx0XHQvLyBDaGFuZ2UgdGhlIG5vdGljZSB0eXBlLlxuXHRcdFx0XHRpZiAob3B0cy50eXBlICE9IG9sZF9vcHRzLnR5cGUpXG5cdFx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIucmVtb3ZlQ2xhc3Moc3R5bGVzLmVycm9yK1wiIFwiK3N0eWxlcy5ub3RpY2UrXCIgXCIrc3R5bGVzLnN1Y2Nlc3MrXCIgXCIrc3R5bGVzLmluZm8pLmFkZENsYXNzKG9wdHMudHlwZSA9PSBcImVycm9yXCIgPyBzdHlsZXMuZXJyb3IgOiAob3B0cy50eXBlID09IFwiaW5mb1wiID8gc3R5bGVzLmluZm8gOiAob3B0cy50eXBlID09IFwic3VjY2Vzc1wiID8gc3R5bGVzLnN1Y2Nlc3MgOiBzdHlsZXMubm90aWNlKSkpO1xuXHRcdFx0XHRpZiAob3B0cy5pY29uICE9PSBvbGRfb3B0cy5pY29uIHx8IChvcHRzLmljb24gPT09IHRydWUgJiYgb3B0cy50eXBlICE9IG9sZF9vcHRzLnR5cGUpKSB7XG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIGFueSBvbGQgaWNvbi5cblx0XHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5maW5kKFwiZGl2LnVpLXBub3RpZnktaWNvblwiKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRpZiAob3B0cy5pY29uICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdFx0Ly8gQnVpbGQgdGhlIG5ldyBpY29uLlxuXHRcdFx0XHRcdFx0JChcIjxkaXYgLz5cIiwge1wiY2xhc3NcIjogXCJ1aS1wbm90aWZ5LWljb25cIn0pXG5cdFx0XHRcdFx0XHQuYXBwZW5kKCQoXCI8c3BhbiAvPlwiLCB7XCJjbGFzc1wiOiBvcHRzLmljb24gPT09IHRydWUgPyAob3B0cy50eXBlID09IFwiZXJyb3JcIiA/IHN0eWxlcy5lcnJvcl9pY29uIDogKG9wdHMudHlwZSA9PSBcImluZm9cIiA/IHN0eWxlcy5pbmZvX2ljb24gOiAob3B0cy50eXBlID09IFwic3VjY2Vzc1wiID8gc3R5bGVzLnN1Y2Nlc3NfaWNvbiA6IHN0eWxlcy5ub3RpY2VfaWNvbikpKSA6IG9wdHMuaWNvbn0pKVxuXHRcdFx0XHRcdFx0LnByZXBlbmRUbyhwbm90aWZ5LmNvbnRhaW5lcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgd2lkdGguXG5cdFx0XHRcdGlmIChvcHRzLndpZHRoICE9PSBvbGRfb3B0cy53aWR0aClcblx0XHRcdFx0XHRwbm90aWZ5LmFuaW1hdGUoe3dpZHRoOiBvcHRzLndpZHRofSk7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgbWluaW11bSBoZWlnaHQuXG5cdFx0XHRcdGlmIChvcHRzLm1pbl9oZWlnaHQgIT09IG9sZF9vcHRzLm1pbl9oZWlnaHQpXG5cdFx0XHRcdFx0cG5vdGlmeS5jb250YWluZXIuYW5pbWF0ZSh7bWluSGVpZ2h0OiBvcHRzLm1pbl9oZWlnaHR9KTtcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBvcGFjaXR5LlxuXHRcdFx0XHRpZiAob3B0cy5vcGFjaXR5ICE9PSBvbGRfb3B0cy5vcGFjaXR5KVxuXHRcdFx0XHRcdHBub3RpZnkuZmFkZVRvKG9wdHMuYW5pbWF0ZV9zcGVlZCwgb3B0cy5vcGFjaXR5KTtcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBzdGlja2VyIGFuZCBjbG9zZXIgYnV0dG9ucy5cblx0XHRcdFx0aWYgKCFvcHRzLmNsb3NlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cG5vdGlmeS5jbG9zZXIuY3NzKFwiZGlzcGxheVwiLCBcImJsb2NrXCIpO1xuXHRcdFx0XHRpZiAoIW9wdHMuc3RpY2tlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgc3RpY2tlciBpY29uLlxuXHRcdFx0XHRwbm90aWZ5LnN0aWNrZXIudHJpZ2dlcihcInBub3RpZnlfaWNvblwiKTtcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBob3ZlciBzdGF0dXMgb2YgdGhlIGJ1dHRvbnMuXG5cdFx0XHRcdGlmIChvcHRzLnN0aWNrZXJfaG92ZXIpXG5cdFx0XHRcdFx0cG5vdGlmeS5zdGlja2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdGVsc2UgaWYgKCFvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcblx0XHRcdFx0aWYgKG9wdHMuY2xvc2VyX2hvdmVyKVxuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdGVsc2UgaWYgKCFvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRpbWVkIGhpZGluZy5cblx0XHRcdFx0aWYgKCFvcHRzLmhpZGUpXG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X2NhbmNlbF9yZW1vdmUoKTtcblx0XHRcdFx0ZWxzZSBpZiAoIW9sZF9vcHRzLmhpZGUpXG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3F1ZXVlX3JlbW92ZSgpO1xuXHRcdFx0XHRwbm90aWZ5LnBub3RpZnlfcXVldWVfcG9zaXRpb24oKTtcblx0XHRcdFx0cmV0dXJuIHBub3RpZnk7XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBQb3NpdGlvbiB0aGUgbm90aWNlLiBkb250X3NraXBfaGlkZGVuIGNhdXNlcyB0aGUgbm90aWNlIHRvXG5cdFx0XHQvLyBwb3NpdGlvbiBldmVuIGlmIGl0J3Mgbm90IHZpc2libGUuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfcG9zaXRpb24gPSBmdW5jdGlvbihkb250X3NraXBfaGlkZGVuKXtcblx0XHRcdFx0Ly8gR2V0IHRoZSBub3RpY2UncyBzdGFjay5cblx0XHRcdFx0dmFyIHMgPSBwbm90aWZ5Lm9wdHMuc3RhY2s7XG5cdFx0XHRcdGlmICghcykgcmV0dXJuO1xuXHRcdFx0XHRpZiAoIXMubmV4dHBvczEpXG5cdFx0XHRcdFx0cy5uZXh0cG9zMSA9IHMuZmlyc3Rwb3MxO1xuXHRcdFx0XHRpZiAoIXMubmV4dHBvczIpXG5cdFx0XHRcdFx0cy5uZXh0cG9zMiA9IHMuZmlyc3Rwb3MyO1xuXHRcdFx0XHRpZiAoIXMuYWRkcG9zMilcblx0XHRcdFx0XHRzLmFkZHBvczIgPSAwO1xuXHRcdFx0XHR2YXIgaGlkZGVuID0gcG5vdGlmeS5jc3MoXCJkaXNwbGF5XCIpID09IFwibm9uZVwiO1xuXHRcdFx0XHQvLyBTa2lwIHRoaXMgbm90aWNlIGlmIGl0J3Mgbm90IHNob3duLlxuXHRcdFx0XHRpZiAoIWhpZGRlbiB8fCBkb250X3NraXBfaGlkZGVuKSB7XG5cdFx0XHRcdFx0dmFyIGN1cnBvczEsIGN1cnBvczI7XG5cdFx0XHRcdFx0Ly8gU3RvcmUgd2hhdCB3aWxsIG5lZWQgdG8gYmUgYW5pbWF0ZWQuXG5cdFx0XHRcdFx0dmFyIGFuaW1hdGUgPSB7fTtcblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIGN1cnJlbnQgcG9zMSB2YWx1ZS5cblx0XHRcdFx0XHR2YXIgY3NzcG9zMTtcblx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMSkge1xuXHRcdFx0XHRcdFx0Y2FzZSBcImRvd25cIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMSA9IFwidG9wXCI7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcInVwXCI6XG5cdFx0XHRcdFx0XHRcdGNzc3BvczEgPSBcImJvdHRvbVwiO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgXCJsZWZ0XCI6XG5cdFx0XHRcdFx0XHRcdGNzc3BvczEgPSBcInJpZ2h0XCI7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcInJpZ2h0XCI6XG5cdFx0XHRcdFx0XHRcdGNzc3BvczEgPSBcImxlZnRcIjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGN1cnBvczEgPSBwYXJzZUludChwbm90aWZ5LmNzcyhjc3Nwb3MxKSk7XG5cdFx0XHRcdFx0aWYgKGlzTmFOKGN1cnBvczEpKVxuXHRcdFx0XHRcdFx0Y3VycG9zMSA9IDA7XG5cdFx0XHRcdFx0Ly8gUmVtZW1iZXIgdGhlIGZpcnN0IHBvczEsIHNvIHRoZSBmaXJzdCB2aXNpYmxlIG5vdGljZSBnb2VzIHRoZXJlLlxuXHRcdFx0XHRcdGlmICh0eXBlb2Ygcy5maXJzdHBvczEgPT0gXCJ1bmRlZmluZWRcIiAmJiAhaGlkZGVuKSB7XG5cdFx0XHRcdFx0XHRzLmZpcnN0cG9zMSA9IGN1cnBvczE7XG5cdFx0XHRcdFx0XHRzLm5leHRwb3MxID0gcy5maXJzdHBvczE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgY3VycmVudCBwb3MyIHZhbHVlLlxuXHRcdFx0XHRcdHZhciBjc3Nwb3MyO1xuXHRcdFx0XHRcdHN3aXRjaCAocy5kaXIyKSB7XG5cdFx0XHRcdFx0XHRjYXNlIFwiZG93blwiOlxuXHRcdFx0XHRcdFx0XHRjc3Nwb3MyID0gXCJ0b3BcIjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIFwidXBcIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMiA9IFwiYm90dG9tXCI7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMiA9IFwicmlnaHRcIjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIFwicmlnaHRcIjpcblx0XHRcdFx0XHRcdFx0Y3NzcG9zMiA9IFwibGVmdFwiO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y3VycG9zMiA9IHBhcnNlSW50KHBub3RpZnkuY3NzKGNzc3BvczIpKTtcblx0XHRcdFx0XHRpZiAoaXNOYU4oY3VycG9zMikpXG5cdFx0XHRcdFx0XHRjdXJwb3MyID0gMDtcblx0XHRcdFx0XHQvLyBSZW1lbWJlciB0aGUgZmlyc3QgcG9zMiwgc28gdGhlIGZpcnN0IHZpc2libGUgbm90aWNlIGdvZXMgdGhlcmUuXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBzLmZpcnN0cG9zMiA9PSBcInVuZGVmaW5lZFwiICYmICFoaWRkZW4pIHtcblx0XHRcdFx0XHRcdHMuZmlyc3Rwb3MyID0gY3VycG9zMjtcblx0XHRcdFx0XHRcdHMubmV4dHBvczIgPSBzLmZpcnN0cG9zMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgdGhhdCBpdCdzIG5vdCBiZXlvbmQgdGhlIHZpZXdwb3J0IGVkZ2UuXG5cdFx0XHRcdFx0aWYgKChzLmRpcjEgPT0gXCJkb3duXCIgJiYgcy5uZXh0cG9zMSArIHBub3RpZnkuaGVpZ2h0KCkgPiBqd2luZG93LmhlaWdodCgpKSB8fFxuXHRcdFx0XHRcdFx0KHMuZGlyMSA9PSBcInVwXCIgJiYgcy5uZXh0cG9zMSArIHBub3RpZnkuaGVpZ2h0KCkgPiBqd2luZG93LmhlaWdodCgpKSB8fFxuXHRcdFx0XHRcdFx0KHMuZGlyMSA9PSBcImxlZnRcIiAmJiBzLm5leHRwb3MxICsgcG5vdGlmeS53aWR0aCgpID4gandpbmRvdy53aWR0aCgpKSB8fFxuXHRcdFx0XHRcdFx0KHMuZGlyMSA9PSBcInJpZ2h0XCIgJiYgcy5uZXh0cG9zMSArIHBub3RpZnkud2lkdGgoKSA+IGp3aW5kb3cud2lkdGgoKSkgKSB7XG5cdFx0XHRcdFx0XHQvLyBJZiBpdCBpcywgaXQgbmVlZHMgdG8gZ28gYmFjayB0byB0aGUgZmlyc3QgcG9zMSwgYW5kIG92ZXIgb24gcG9zMi5cblx0XHRcdFx0XHRcdHMubmV4dHBvczEgPSBzLmZpcnN0cG9zMTtcblx0XHRcdFx0XHRcdHMubmV4dHBvczIgKz0gcy5hZGRwb3MyICsgKHR5cGVvZiBzLnNwYWNpbmcyID09IFwidW5kZWZpbmVkXCIgPyAyNSA6IHMuc3BhY2luZzIpO1xuXHRcdFx0XHRcdFx0cy5hZGRwb3MyID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBpZiB3ZSdyZSBtb3Zpbmcgb24gZGlyMi5cblx0XHRcdFx0XHRpZiAocy5hbmltYXRpb24gJiYgcy5uZXh0cG9zMiA8IGN1cnBvczIpIHtcblx0XHRcdFx0XHRcdHN3aXRjaCAocy5kaXIyKSB7XG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJkb3duXCI6XG5cdFx0XHRcdFx0XHRcdFx0YW5pbWF0ZS50b3AgPSBzLm5leHRwb3MyK1wicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSBcInVwXCI6XG5cdFx0XHRcdFx0XHRcdFx0YW5pbWF0ZS5ib3R0b20gPSBzLm5leHRwb3MyK1wicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdFx0XHRhbmltYXRlLnJpZ2h0ID0gcy5uZXh0cG9zMitcInB4XCI7XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJyaWdodFwiOlxuXHRcdFx0XHRcdFx0XHRcdGFuaW1hdGUubGVmdCA9IHMubmV4dHBvczIrXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5jc3MoY3NzcG9zMiwgcy5uZXh0cG9zMitcInB4XCIpO1xuXHRcdFx0XHRcdC8vIEtlZXAgdHJhY2sgb2YgdGhlIHdpZGVzdC90YWxsZXN0IG5vdGljZSBpbiB0aGUgY29sdW1uL3Jvdywgc28gd2UgY2FuIHB1c2ggdGhlIG5leHQgY29sdW1uL3Jvdy5cblx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMikge1xuXHRcdFx0XHRcdFx0Y2FzZSBcImRvd25cIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJ1cFwiOlxuXHRcdFx0XHRcdFx0XHRpZiAocG5vdGlmeS5vdXRlckhlaWdodCh0cnVlKSA+IHMuYWRkcG9zMilcblx0XHRcdFx0XHRcdFx0XHRzLmFkZHBvczIgPSBwbm90aWZ5LmhlaWdodCgpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgXCJsZWZ0XCI6XG5cdFx0XHRcdFx0XHRjYXNlIFwicmlnaHRcIjpcblx0XHRcdFx0XHRcdFx0aWYgKHBub3RpZnkub3V0ZXJXaWR0aCh0cnVlKSA+IHMuYWRkcG9zMilcblx0XHRcdFx0XHRcdFx0XHRzLmFkZHBvczIgPSBwbm90aWZ5LndpZHRoKCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBNb3ZlIHRoZSBub3RpY2Ugb24gZGlyMS5cblx0XHRcdFx0XHRpZiAocy5uZXh0cG9zMSkge1xuXHRcdFx0XHRcdFx0Ly8gQW5pbWF0ZSBpZiB3ZSdyZSBtb3ZpbmcgdG93YXJkIHRoZSBmaXJzdCBwb3MuXG5cdFx0XHRcdFx0XHRpZiAocy5hbmltYXRpb24gJiYgKGN1cnBvczEgPiBzLm5leHRwb3MxIHx8IGFuaW1hdGUudG9wIHx8IGFuaW1hdGUuYm90dG9tIHx8IGFuaW1hdGUucmlnaHQgfHwgYW5pbWF0ZS5sZWZ0KSkge1xuXHRcdFx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMSkge1xuXHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJkb3duXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRhbmltYXRlLnRvcCA9IHMubmV4dHBvczErXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSBcInVwXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRhbmltYXRlLmJvdHRvbSA9IHMubmV4dHBvczErXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdFx0XHRcdGFuaW1hdGUucmlnaHQgPSBzLm5leHRwb3MxK1wicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJyaWdodFwiOlxuXHRcdFx0XHRcdFx0XHRcdFx0YW5pbWF0ZS5sZWZ0ID0gcy5uZXh0cG9zMStcInB4XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlXG5cdFx0XHRcdFx0XHRcdHBub3RpZnkuY3NzKGNzc3BvczEsIHMubmV4dHBvczErXCJweFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gUnVuIHRoZSBhbmltYXRpb24uXG5cdFx0XHRcdFx0aWYgKGFuaW1hdGUudG9wIHx8IGFuaW1hdGUuYm90dG9tIHx8IGFuaW1hdGUucmlnaHQgfHwgYW5pbWF0ZS5sZWZ0KVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5hbmltYXRlKGFuaW1hdGUsIHtkdXJhdGlvbjogNTAwLCBxdWV1ZTogZmFsc2V9KTtcblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgdGhlIG5leHQgZGlyMSBwb3NpdGlvbi5cblx0XHRcdFx0XHRzd2l0Y2ggKHMuZGlyMSkge1xuXHRcdFx0XHRcdFx0Y2FzZSBcImRvd25cIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJ1cFwiOlxuXHRcdFx0XHRcdFx0XHRzLm5leHRwb3MxICs9IHBub3RpZnkuaGVpZ2h0KCkgKyAodHlwZW9mIHMuc3BhY2luZzEgPT0gXCJ1bmRlZmluZWRcIiA/IDI1IDogcy5zcGFjaW5nMSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBcImxlZnRcIjpcblx0XHRcdFx0XHRcdGNhc2UgXCJyaWdodFwiOlxuXHRcdFx0XHRcdFx0XHRzLm5leHRwb3MxICs9IHBub3RpZnkud2lkdGgoKSArICh0eXBlb2Ygcy5zcGFjaW5nMSA9PSBcInVuZGVmaW5lZFwiID8gMjUgOiBzLnNwYWNpbmcxKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBRdWV1ZSB0aGUgcG9zaXRpb25hIGFsbCBmdW5jdGlvbiBzbyBpdCBkb2Vzbid0IHJ1biByZXBlYXRlZGx5IGFuZFxuXHRcdFx0Ly8gdXNlIHVwIHJlc291cmNlcy5cblx0XHRcdHBub3RpZnkucG5vdGlmeV9xdWV1ZV9wb3NpdGlvbiA9IGZ1bmN0aW9uKG1pbGxpc2Vjb25kcyl7XG5cdFx0XHRcdGlmICh0aW1lcilcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdFx0XHRpZiAoIW1pbGxpc2Vjb25kcylcblx0XHRcdFx0XHRtaWxsaXNlY29uZHMgPSAxMDtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCQucG5vdGlmeV9wb3NpdGlvbl9hbGwsIG1pbGxpc2Vjb25kcyk7XG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBEaXNwbGF5IHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfZGlzcGxheSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBJZiB0aGUgbm90aWNlIGlzIG5vdCBpbiB0aGUgRE9NLCBhcHBlbmQgaXQuXG5cdFx0XHRcdGlmICghcG5vdGlmeS5wYXJlbnQoKS5sZW5ndGgpXG5cdFx0XHRcdFx0cG5vdGlmeS5hcHBlbmRUbyhib2R5KTtcblx0XHRcdFx0Ly8gUnVuIGNhbGxiYWNrLlxuXHRcdFx0XHRpZiAob3B0cy5iZWZvcmVfb3Blbikge1xuXHRcdFx0XHRcdGlmIChvcHRzLmJlZm9yZV9vcGVuKHBub3RpZnkpID09PSBmYWxzZSlcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBUcnkgdG8gcHV0IGl0IGluIHRoZSByaWdodCBwb3NpdGlvbi5cblx0XHRcdFx0aWYgKG9wdHMuc3RhY2sucHVzaCAhPSBcInRvcFwiKVxuXHRcdFx0XHRcdHBub3RpZnkucG5vdGlmeV9wb3NpdGlvbih0cnVlKTtcblx0XHRcdFx0Ly8gRmlyc3Qgc2hvdyBpdCwgdGhlbiBzZXQgaXRzIG9wYWNpdHksIHRoZW4gaGlkZSBpdC5cblx0XHRcdFx0aWYgKG9wdHMuYW5pbWF0aW9uID09IFwiZmFkZVwiIHx8IG9wdHMuYW5pbWF0aW9uLmVmZmVjdF9pbiA9PSBcImZhZGVcIikge1xuXHRcdFx0XHRcdC8vIElmIGl0J3MgZmFkaW5nIGluLCBpdCBzaG91bGQgc3RhcnQgYXQgMC5cblx0XHRcdFx0XHRwbm90aWZ5LnNob3coKS5mYWRlVG8oMCwgMCkuaGlkZSgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIE9yIGVsc2UgaXQgc2hvdWxkIGJlIHNldCB0byB0aGUgb3BhY2l0eS5cblx0XHRcdFx0XHRpZiAob3B0cy5vcGFjaXR5ICE9IDEpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnNob3coKS5mYWRlVG8oMCwgb3B0cy5vcGFjaXR5KS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG5vdGlmeS5hbmltYXRlX2luKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0aWYgKG9wdHMuYWZ0ZXJfb3Blbilcblx0XHRcdFx0XHRcdG9wdHMuYWZ0ZXJfb3Blbihwbm90aWZ5KTtcblxuXHRcdFx0XHRcdHBub3RpZnkucG5vdGlmeV9xdWV1ZV9wb3NpdGlvbigpO1xuXG5cdFx0XHRcdFx0Ly8gTm93IHNldCBpdCB0byBoaWRlLlxuXHRcdFx0XHRcdGlmIChvcHRzLmhpZGUpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnBub3RpZnlfcXVldWVfcmVtb3ZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblxuXHRcdFx0Ly8gUmVtb3ZlIHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfcmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChwbm90aWZ5LnRpbWVyKSB7XG5cdFx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChwbm90aWZ5LnRpbWVyKTtcblx0XHRcdFx0XHRwbm90aWZ5LnRpbWVyID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBSdW4gY2FsbGJhY2suXG5cdFx0XHRcdGlmIChvcHRzLmJlZm9yZV9jbG9zZSkge1xuXHRcdFx0XHRcdGlmIChvcHRzLmJlZm9yZV9jbG9zZShwbm90aWZ5KSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0cG5vdGlmeS5hbmltYXRlX291dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGlmIChvcHRzLmFmdGVyX2Nsb3NlKSB7XG5cdFx0XHRcdFx0XHRpZiAob3B0cy5hZnRlcl9jbG9zZShwbm90aWZ5KSA9PT0gZmFsc2UpXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3F1ZXVlX3Bvc2l0aW9uKCk7XG5cdFx0XHRcdFx0Ly8gSWYgd2UncmUgc3VwcG9zZWQgdG8gcmVtb3ZlIHRoZSBub3RpY2UgZnJvbSB0aGUgRE9NLCBkbyBpdC5cblx0XHRcdFx0XHRpZiAob3B0cy5yZW1vdmUpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LmRldGFjaCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cblx0XHRcdC8vIEFuaW1hdGUgdGhlIG5vdGljZSBpbi5cblx0XHRcdHBub3RpZnkuYW5pbWF0ZV9pbiA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0XHRcdFx0Ly8gRGVjbGFyZSB0aGF0IHRoZSBub3RpY2UgaXMgYW5pbWF0aW5nIGluLiAoT3IgaGFzIGNvbXBsZXRlZCBhbmltYXRpbmcgaW4uKVxuXHRcdFx0XHRhbmltYXRpbmcgPSBcImluXCI7XG5cdFx0XHRcdHZhciBhbmltYXRpb247XG5cdFx0XHRcdGlmICh0eXBlb2Ygb3B0cy5hbmltYXRpb24uZWZmZWN0X2luICE9IFwidW5kZWZpbmVkXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uID0gb3B0cy5hbmltYXRpb24uZWZmZWN0X2luO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0YW5pbWF0aW9uID0gb3B0cy5hbmltYXRpb247XG5cdFx0XHRcdGlmIChhbmltYXRpb24gPT0gXCJub25lXCIpIHtcblx0XHRcdFx0XHRwbm90aWZ5LnNob3coKTtcblx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGFuaW1hdGlvbiA9PSBcInNob3dcIilcblx0XHRcdFx0XHRwbm90aWZ5LnNob3cob3B0cy5hbmltYXRlX3NwZWVkLCBjYWxsYmFjayk7XG5cdFx0XHRcdGVsc2UgaWYgKGFuaW1hdGlvbiA9PSBcImZhZGVcIilcblx0XHRcdFx0XHRwbm90aWZ5LnNob3coKS5mYWRlVG8ob3B0cy5hbmltYXRlX3NwZWVkLCBvcHRzLm9wYWNpdHksIGNhbGxiYWNrKTtcblx0XHRcdFx0ZWxzZSBpZiAoYW5pbWF0aW9uID09IFwic2xpZGVcIilcblx0XHRcdFx0XHRwbm90aWZ5LnNsaWRlRG93bihvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGFuaW1hdGlvbiA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uKFwiaW5cIiwgY2FsbGJhY2ssIHBub3RpZnkpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cG5vdGlmeS5zaG93KGFuaW1hdGlvbiwgKHR5cGVvZiBvcHRzLmFuaW1hdGlvbi5vcHRpb25zX2luID09IFwib2JqZWN0XCIgPyBvcHRzLmFuaW1hdGlvbi5vcHRpb25zX2luIDoge30pLCBvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIEFuaW1hdGUgdGhlIG5vdGljZSBvdXQuXG5cdFx0XHRwbm90aWZ5LmFuaW1hdGVfb3V0ID0gZnVuY3Rpb24oY2FsbGJhY2spe1xuXHRcdFx0XHQvLyBEZWNsYXJlIHRoYXQgdGhlIG5vdGljZSBpcyBhbmltYXRpbmcgb3V0LiAoT3IgaGFzIGNvbXBsZXRlZCBhbmltYXRpbmcgb3V0Lilcblx0XHRcdFx0YW5pbWF0aW5nID0gXCJvdXRcIjtcblx0XHRcdFx0dmFyIGFuaW1hdGlvbjtcblx0XHRcdFx0aWYgKHR5cGVvZiBvcHRzLmFuaW1hdGlvbi5lZmZlY3Rfb3V0ICE9IFwidW5kZWZpbmVkXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uID0gb3B0cy5hbmltYXRpb24uZWZmZWN0X291dDtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGFuaW1hdGlvbiA9IG9wdHMuYW5pbWF0aW9uO1xuXHRcdFx0XHRpZiAoYW5pbWF0aW9uID09IFwibm9uZVwiKSB7XG5cdFx0XHRcdFx0cG5vdGlmeS5oaWRlKCk7XG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0fSBlbHNlIGlmIChhbmltYXRpb24gPT0gXCJzaG93XCIpXG5cdFx0XHRcdFx0cG5vdGlmeS5oaWRlKG9wdHMuYW5pbWF0ZV9zcGVlZCwgY2FsbGJhY2spO1xuXHRcdFx0XHRlbHNlIGlmIChhbmltYXRpb24gPT0gXCJmYWRlXCIpXG5cdFx0XHRcdFx0cG5vdGlmeS5mYWRlT3V0KG9wdHMuYW5pbWF0ZV9zcGVlZCwgY2FsbGJhY2spO1xuXHRcdFx0XHRlbHNlIGlmIChhbmltYXRpb24gPT0gXCJzbGlkZVwiKVxuXHRcdFx0XHRcdHBub3RpZnkuc2xpZGVVcChvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGFuaW1hdGlvbiA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0YW5pbWF0aW9uKFwib3V0XCIsIGNhbGxiYWNrLCBwbm90aWZ5KTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHBub3RpZnkuaGlkZShhbmltYXRpb24sICh0eXBlb2Ygb3B0cy5hbmltYXRpb24ub3B0aW9uc19vdXQgPT0gXCJvYmplY3RcIiA/IG9wdHMuYW5pbWF0aW9uLm9wdGlvbnNfb3V0IDoge30pLCBvcHRzLmFuaW1hdGVfc3BlZWQsIGNhbGxiYWNrKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIENhbmNlbCBhbnkgcGVuZGluZyByZW1vdmFsIHRpbWVyLlxuXHRcdFx0cG5vdGlmeS5wbm90aWZ5X2NhbmNlbF9yZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHBub3RpZnkudGltZXIpXG5cdFx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChwbm90aWZ5LnRpbWVyKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIFF1ZXVlIGEgcmVtb3ZhbCB0aW1lci5cblx0XHRcdHBub3RpZnkucG5vdGlmeV9xdWV1ZV9yZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gQ2FuY2VsIGFueSBjdXJyZW50IHJlbW92YWwgdGltZXIuXG5cdFx0XHRcdHBub3RpZnkucG5vdGlmeV9jYW5jZWxfcmVtb3ZlKCk7XG5cdFx0XHRcdHBub3RpZnkudGltZXIgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHBub3RpZnkucG5vdGlmeV9yZW1vdmUoKTtcblx0XHRcdFx0fSwgKGlzTmFOKG9wdHMuZGVsYXkpID8gMCA6IG9wdHMuZGVsYXkpKTtcblx0XHRcdH07XG5cblx0XHRcdC8vIFByb3ZpZGUgYSBidXR0b24gdG8gY2xvc2UgdGhlIG5vdGljZS5cblx0XHRcdHBub3RpZnkuY2xvc2VyID0gJChcIjxkaXYgLz5cIiwge1xuXHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1jbG9zZXJcIixcblx0XHRcdFx0XCJjc3NcIjoge1wiY3Vyc29yXCI6IFwicG9pbnRlclwiLCBcInZpc2liaWxpdHlcIjogb3B0cy5jbG9zZXJfaG92ZXIgPyBcImhpZGRlblwiIDogXCJ2aXNpYmxlXCJ9LFxuXHRcdFx0XHRcImNsaWNrXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3JlbW92ZSgpO1xuXHRcdFx0XHRcdHBub3RpZnkuc3RpY2tlci5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdFx0XHRcdHBub3RpZnkuY2xvc2VyLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuYXBwZW5kKCQoXCI8c3BhbiAvPlwiLCB7XCJjbGFzc1wiOiBzdHlsZXMuY2xvc2VyfSkpXG5cdFx0XHQuYXBwZW5kVG8ocG5vdGlmeS5jb250YWluZXIpO1xuXHRcdFx0aWYgKCFvcHRzLmNsb3NlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRwbm90aWZ5LmNsb3Nlci5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblxuXHRcdFx0Ly8gUHJvdmlkZSBhIGJ1dHRvbiB0byBzdGljayB0aGUgbm90aWNlLlxuXHRcdFx0cG5vdGlmeS5zdGlja2VyID0gJChcIjxkaXYgLz5cIiwge1xuXHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1zdGlja2VyXCIsXG5cdFx0XHRcdFwiY3NzXCI6IHtcImN1cnNvclwiOiBcInBvaW50ZXJcIiwgXCJ2aXNpYmlsaXR5XCI6IG9wdHMuc3RpY2tlcl9ob3ZlciA/IFwiaGlkZGVuXCIgOiBcInZpc2libGVcIn0sXG5cdFx0XHRcdFwiY2xpY2tcIjogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRvcHRzLmhpZGUgPSAhb3B0cy5oaWRlO1xuXHRcdFx0XHRcdGlmIChvcHRzLmhpZGUpXG5cdFx0XHRcdFx0XHRwbm90aWZ5LnBub3RpZnlfcXVldWVfcmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X2NhbmNlbF9yZW1vdmUoKTtcblx0XHRcdFx0XHQkKHRoaXMpLnRyaWdnZXIoXCJwbm90aWZ5X2ljb25cIik7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuYmluZChcInBub3RpZnlfaWNvblwiLCBmdW5jdGlvbigpe1xuXHRcdFx0XHQkKHRoaXMpLmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3Moc3R5bGVzLnBpbl91cCtcIiBcIitzdHlsZXMucGluX2Rvd24pLmFkZENsYXNzKG9wdHMuaGlkZSA/IHN0eWxlcy5waW5fdXAgOiBzdHlsZXMucGluX2Rvd24pO1xuXHRcdFx0fSlcblx0XHRcdC5hcHBlbmQoJChcIjxzcGFuIC8+XCIsIHtcImNsYXNzXCI6IHN0eWxlcy5waW5fdXB9KSlcblx0XHRcdC5hcHBlbmRUbyhwbm90aWZ5LmNvbnRhaW5lcik7XG5cdFx0XHRpZiAoIW9wdHMuc3RpY2tlciB8fCBvcHRzLm5vbmJsb2NrKVxuXHRcdFx0XHRwbm90aWZ5LnN0aWNrZXIuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG5cblx0XHRcdC8vIEFkZCB0aGUgYXBwcm9wcmlhdGUgaWNvbi5cblx0XHRcdGlmIChvcHRzLmljb24gIT09IGZhbHNlKSB7XG5cdFx0XHRcdCQoXCI8ZGl2IC8+XCIsIHtcImNsYXNzXCI6IFwidWktcG5vdGlmeS1pY29uXCJ9KVxuXHRcdFx0XHQuYXBwZW5kKCQoXCI8c3BhbiAvPlwiLCB7XCJjbGFzc1wiOiBvcHRzLmljb24gPT09IHRydWUgPyAob3B0cy50eXBlID09IFwiZXJyb3JcIiA/IHN0eWxlcy5lcnJvcl9pY29uIDogKG9wdHMudHlwZSA9PSBcImluZm9cIiA/IHN0eWxlcy5pbmZvX2ljb24gOiAob3B0cy50eXBlID09IFwic3VjY2Vzc1wiID8gc3R5bGVzLnN1Y2Nlc3NfaWNvbiA6IHN0eWxlcy5ub3RpY2VfaWNvbikpKSA6IG9wdHMuaWNvbn0pKVxuXHRcdFx0XHQucHJlcGVuZFRvKHBub3RpZnkuY29udGFpbmVyKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQWRkIGEgdGl0bGUuXG5cdFx0XHRwbm90aWZ5LnRpdGxlX2NvbnRhaW5lciA9ICQoXCI8aDQgLz5cIiwge1xuXHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS10aXRsZVwiXG5cdFx0XHR9KVxuXHRcdFx0LmFwcGVuZFRvKHBub3RpZnkuY29udGFpbmVyKTtcblx0XHRcdGlmIChvcHRzLnRpdGxlID09PSBmYWxzZSlcblx0XHRcdFx0cG5vdGlmeS50aXRsZV9jb250YWluZXIuaGlkZSgpO1xuXHRcdFx0ZWxzZSBpZiAob3B0cy50aXRsZV9lc2NhcGUpXG5cdFx0XHRcdHBub3RpZnkudGl0bGVfY29udGFpbmVyLnRleHQob3B0cy50aXRsZSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHBub3RpZnkudGl0bGVfY29udGFpbmVyLmh0bWwob3B0cy50aXRsZSk7XG5cblx0XHRcdC8vIEFkZCB0ZXh0LlxuXHRcdFx0cG5vdGlmeS50ZXh0X2NvbnRhaW5lciA9ICQoXCI8ZGl2IC8+XCIsIHtcblx0XHRcdFx0XCJjbGFzc1wiOiBcInVpLXBub3RpZnktdGV4dFwiXG5cdFx0XHR9KVxuXHRcdFx0LmFwcGVuZFRvKHBub3RpZnkuY29udGFpbmVyKTtcblx0XHRcdGlmIChvcHRzLnRleHQgPT09IGZhbHNlKVxuXHRcdFx0XHRwbm90aWZ5LnRleHRfY29udGFpbmVyLmhpZGUoKTtcblx0XHRcdGVsc2UgaWYgKG9wdHMudGV4dF9lc2NhcGUpXG5cdFx0XHRcdHBub3RpZnkudGV4dF9jb250YWluZXIudGV4dChvcHRzLnRleHQpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRwbm90aWZ5LnRleHRfY29udGFpbmVyLmh0bWwob3B0cy5pbnNlcnRfYnJzID8gU3RyaW5nKG9wdHMudGV4dCkucmVwbGFjZSgvXFxuL2csIFwiPGJyIC8+XCIpIDogb3B0cy50ZXh0KTtcblxuXHRcdFx0Ly8gU2V0IHdpZHRoIGFuZCBtaW4gaGVpZ2h0LlxuXHRcdFx0aWYgKHR5cGVvZiBvcHRzLndpZHRoID09IFwic3RyaW5nXCIpXG5cdFx0XHRcdHBub3RpZnkuY3NzKFwid2lkdGhcIiwgb3B0cy53aWR0aCk7XG5cdFx0XHRpZiAodHlwZW9mIG9wdHMubWluX2hlaWdodCA9PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRwbm90aWZ5LmNvbnRhaW5lci5jc3MoXCJtaW4taGVpZ2h0XCIsIG9wdHMubWluX2hlaWdodCk7XG5cblx0XHRcdC8vIFRoZSBoaXN0b3J5IHZhcmlhYmxlIGNvbnRyb2xzIHdoZXRoZXIgdGhlIG5vdGljZSBnZXRzIHJlZGlzcGxheWVkXG5cdFx0XHQvLyBieSB0aGUgaGlzdG9yeSBwdWxsIGRvd24uXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfaGlzdG9yeSA9IG9wdHMuaGlzdG9yeTtcblx0XHRcdC8vIFRoZSBoaWRlIHZhcmlhYmxlIGNvbnRyb2xzIHdoZXRoZXIgdGhlIGhpc3RvcnkgcHVsbCBkb3duIHNob3VsZFxuXHRcdFx0Ly8gcXVldWUgYSByZW1vdmFsIHRpbWVyLlxuXHRcdFx0cG5vdGlmeS5wbm90aWZ5X2hpZGUgPSBvcHRzLmhpZGU7XG5cblx0XHRcdC8vIEFkZCB0aGUgbm90aWNlIHRvIHRoZSBub3RpY2UgYXJyYXkuXG5cdFx0XHR2YXIgbm90aWNlc19kYXRhID0gandpbmRvdy5kYXRhKFwicG5vdGlmeVwiKTtcblx0XHRcdGlmIChub3RpY2VzX2RhdGEgPT0gbnVsbCB8fCB0eXBlb2Ygbm90aWNlc19kYXRhICE9IFwib2JqZWN0XCIpXG5cdFx0XHRcdG5vdGljZXNfZGF0YSA9IFtdO1xuXHRcdFx0aWYgKG9wdHMuc3RhY2sucHVzaCA9PSBcInRvcFwiKVxuXHRcdFx0XHRub3RpY2VzX2RhdGEgPSAkLm1lcmdlKFtwbm90aWZ5XSwgbm90aWNlc19kYXRhKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0bm90aWNlc19kYXRhID0gJC5tZXJnZShub3RpY2VzX2RhdGEsIFtwbm90aWZ5XSk7XG5cdFx0XHRqd2luZG93LmRhdGEoXCJwbm90aWZ5XCIsIG5vdGljZXNfZGF0YSk7XG5cdFx0XHQvLyBOb3cgcG9zaXRpb24gYWxsIHRoZSBub3RpY2VzIGlmIHRoZXkgYXJlIHRvIHB1c2ggdG8gdGhlIHRvcC5cblx0XHRcdGlmIChvcHRzLnN0YWNrLnB1c2ggPT0gXCJ0b3BcIilcblx0XHRcdFx0cG5vdGlmeS5wbm90aWZ5X3F1ZXVlX3Bvc2l0aW9uKDEpO1xuXG5cdFx0XHQvLyBSdW4gY2FsbGJhY2suXG5cdFx0XHRpZiAob3B0cy5hZnRlcl9pbml0KVxuXHRcdFx0XHRvcHRzLmFmdGVyX2luaXQocG5vdGlmeSk7XG5cblx0XHRcdGlmIChvcHRzLmhpc3RvcnkpIHtcblx0XHRcdFx0Ly8gSWYgdGhlcmUgaXNuJ3QgYSBoaXN0b3J5IHB1bGwgZG93biwgY3JlYXRlIG9uZS5cblx0XHRcdFx0dmFyIGhpc3RvcnlfbWVudSA9IGp3aW5kb3cuZGF0YShcInBub3RpZnlfaGlzdG9yeVwiKTtcblx0XHRcdFx0aWYgKHR5cGVvZiBoaXN0b3J5X21lbnUgPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRcdGhpc3RvcnlfbWVudSA9ICQoXCI8ZGl2IC8+XCIsIHtcblx0XHRcdFx0XHRcdFwiY2xhc3NcIjogXCJ1aS1wbm90aWZ5LWhpc3RvcnktY29udGFpbmVyIFwiK3N0eWxlcy5oaV9tZW51LFxuXHRcdFx0XHRcdFx0XCJtb3VzZWxlYXZlXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdGhpc3RvcnlfbWVudS5hbmltYXRlKHt0b3A6IFwiLVwiK2hpc3RvcnlfaGFuZGxlX3RvcCtcInB4XCJ9LCB7ZHVyYXRpb246IDEwMCwgcXVldWU6IGZhbHNlfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuYXBwZW5kKCQoXCI8ZGl2IC8+XCIsIHtcImNsYXNzXCI6IFwidWktcG5vdGlmeS1oaXN0b3J5LWhlYWRlclwiLCBcInRleHRcIjogXCJSZWRpc3BsYXlcIn0pKVxuXHRcdFx0XHRcdC5hcHBlbmQoJChcIjxidXR0b24gLz5cIiwge1xuXHRcdFx0XHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1oaXN0b3J5LWFsbCBcIitzdHlsZXMuaGlfYnRuLFxuXHRcdFx0XHRcdFx0XHRcInRleHRcIjogXCJBbGxcIixcblx0XHRcdFx0XHRcdFx0XCJtb3VzZWVudGVyXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcyhzdHlsZXMuaGlfYnRuaG92KTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XCJtb3VzZWxlYXZlXCI6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVDbGFzcyhzdHlsZXMuaGlfYnRuaG92KTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XCJjbGlja1wiOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdC8vIERpc3BsYXkgYWxsIG5vdGljZXMuIChEaXNyZWdhcmRpbmcgbm9uLWhpc3Rvcnkgbm90aWNlcy4pXG5cdFx0XHRcdFx0XHRcdFx0JC5lYWNoKG5vdGljZXNfZGF0YSwgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLnBub3RpZnlfaGlzdG9yeSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5pcyhcIjp2aXNpYmxlXCIpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucG5vdGlmeV9oaWRlKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5wbm90aWZ5X3F1ZXVlX3JlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMucG5vdGlmeV9kaXNwbGF5KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucG5vdGlmeV9kaXNwbGF5KCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkpXG5cdFx0XHRcdFx0LmFwcGVuZCgkKFwiPGJ1dHRvbiAvPlwiLCB7XG5cdFx0XHRcdFx0XHRcdFwiY2xhc3NcIjogXCJ1aS1wbm90aWZ5LWhpc3RvcnktbGFzdCBcIitzdHlsZXMuaGlfYnRuLFxuXHRcdFx0XHRcdFx0XHRcInRleHRcIjogXCJMYXN0XCIsXG5cdFx0XHRcdFx0XHRcdFwibW91c2VlbnRlclwiOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3Moc3R5bGVzLmhpX2J0bmhvdik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFwibW91c2VsZWF2ZVwiOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlQ2xhc3Moc3R5bGVzLmhpX2J0bmhvdik7XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFwiY2xpY2tcIjogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHQvLyBMb29rIHVwIHRoZSBsYXN0IGhpc3Rvcnkgbm90aWNlLCBhbmQgZGlzcGxheSBpdC5cblx0XHRcdFx0XHRcdFx0XHR2YXIgaSA9IC0xO1xuXHRcdFx0XHRcdFx0XHRcdHZhciBub3RpY2U7XG5cdFx0XHRcdFx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGkgPT0gLTEpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5vdGljZSA9IG5vdGljZXNfZGF0YS5zbGljZShpKTtcblx0XHRcdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0XHRcdFx0bm90aWNlID0gbm90aWNlc19kYXRhLnNsaWNlKGksIGkrMSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIW5vdGljZVswXSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRpLS07XG5cdFx0XHRcdFx0XHRcdFx0fSB3aGlsZSAoIW5vdGljZVswXS5wbm90aWZ5X2hpc3RvcnkgfHwgbm90aWNlWzBdLmlzKFwiOnZpc2libGVcIikpO1xuXHRcdFx0XHRcdFx0XHRcdGlmICghbm90aWNlWzBdKVxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChub3RpY2VbMF0ucG5vdGlmeV9kaXNwbGF5KVxuXHRcdFx0XHRcdFx0XHRcdFx0bm90aWNlWzBdLnBub3RpZnlfZGlzcGxheSgpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pKVxuXHRcdFx0XHRcdC5hcHBlbmRUbyhib2R5KTtcblxuXHRcdFx0XHRcdC8vIE1ha2UgYSBoYW5kbGUgc28gdGhlIHVzZXIgY2FuIHB1bGwgZG93biB0aGUgaGlzdG9yeSB0YWIuXG5cdFx0XHRcdFx0dmFyIGhhbmRsZSA9ICQoXCI8c3BhbiAvPlwiLCB7XG5cdFx0XHRcdFx0XHRcImNsYXNzXCI6IFwidWktcG5vdGlmeS1oaXN0b3J5LXB1bGxkb3duIFwiK3N0eWxlcy5oaV9obmQsXG5cdFx0XHRcdFx0XHRcIm1vdXNlZW50ZXJcIjogZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0aGlzdG9yeV9tZW51LmFuaW1hdGUoe3RvcDogXCIwXCJ9LCB7ZHVyYXRpb246IDEwMCwgcXVldWU6IGZhbHNlfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuYXBwZW5kVG8oaGlzdG9yeV9tZW51KTtcblxuXHRcdFx0XHRcdC8vIEdldCB0aGUgdG9wIG9mIHRoZSBoYW5kbGUuXG5cdFx0XHRcdFx0aGlzdG9yeV9oYW5kbGVfdG9wID0gaGFuZGxlLm9mZnNldCgpLnRvcCArIDI7XG5cdFx0XHRcdFx0Ly8gSGlkZSB0aGUgaGlzdG9yeSBwdWxsIGRvd24gdXAgdG8gdGhlIHRvcCBvZiB0aGUgaGFuZGxlLlxuXHRcdFx0XHRcdGhpc3RvcnlfbWVudS5jc3Moe3RvcDogXCItXCIraGlzdG9yeV9oYW5kbGVfdG9wK1wicHhcIn0pO1xuXHRcdFx0XHRcdC8vIFNhdmUgdGhlIGhpc3RvcnkgcHVsbCBkb3duLlxuXHRcdFx0XHRcdGp3aW5kb3cuZGF0YShcInBub3RpZnlfaGlzdG9yeVwiLCBoaXN0b3J5X21lbnUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1hcmsgdGhlIHN0YWNrIHNvIGl0IHdvbid0IGFuaW1hdGUgdGhlIG5ldyBub3RpY2UuXG5cdFx0XHRvcHRzLnN0YWNrLmFuaW1hdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHQvLyBEaXNwbGF5IHRoZSBub3RpY2UuXG5cdFx0XHRwbm90aWZ5LnBub3RpZnlfZGlzcGxheSgpO1xuXG5cdFx0XHRyZXR1cm4gcG5vdGlmeTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFNvbWUgdXNlZnVsIHJlZ2V4ZXMuXG5cdHZhciByZV9vbiA9IC9eb24vLFxuXHRcdHJlX21vdXNlX2V2ZW50cyA9IC9eKGRibCk/Y2xpY2skfF5tb3VzZShtb3ZlfGRvd258dXB8b3ZlcnxvdXR8ZW50ZXJ8bGVhdmUpJHxeY29udGV4dG1lbnUkLyxcblx0XHRyZV91aV9ldmVudHMgPSAvXihmb2N1c3xibHVyfHNlbGVjdHxjaGFuZ2V8cmVzZXQpJHxea2V5KHByZXNzfGRvd258dXApJC8sXG5cdFx0cmVfaHRtbF9ldmVudHMgPSAvXihzY3JvbGx8cmVzaXplfCh1bik/bG9hZHxhYm9ydHxlcnJvcikkLztcblx0Ly8gRmlyZSBhIERPTSBldmVudC5cblx0dmFyIGRvbV9ldmVudCA9IGZ1bmN0aW9uKGUsIG9yaWdfZSl7XG5cdFx0dmFyIGV2ZW50X29iamVjdDtcblx0XHRlID0gZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmIChkb2N1bWVudC5jcmVhdGVFdmVudCAmJiB0aGlzLmRpc3BhdGNoRXZlbnQpIHtcblx0XHRcdC8vIEZpcmVGb3gsIE9wZXJhLCBTYWZhcmksIENocm9tZVxuXHRcdFx0ZSA9IGUucmVwbGFjZShyZV9vbiwgJycpO1xuXHRcdFx0aWYgKGUubWF0Y2gocmVfbW91c2VfZXZlbnRzKSkge1xuXHRcdFx0XHQvLyBUaGlzIGFsbG93cyB0aGUgY2xpY2sgZXZlbnQgdG8gZmlyZSBvbiB0aGUgbm90aWNlLiBUaGVyZSBpc1xuXHRcdFx0XHQvLyBwcm9iYWJseSBhIG11Y2ggYmV0dGVyIHdheSB0byBkbyBpdC5cblx0XHRcdFx0JCh0aGlzKS5vZmZzZXQoKTtcblx0XHRcdFx0ZXZlbnRfb2JqZWN0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcblx0XHRcdFx0ZXZlbnRfb2JqZWN0LmluaXRNb3VzZUV2ZW50KFxuXHRcdFx0XHRcdGUsIG9yaWdfZS5idWJibGVzLCBvcmlnX2UuY2FuY2VsYWJsZSwgb3JpZ19lLnZpZXcsIG9yaWdfZS5kZXRhaWwsXG5cdFx0XHRcdFx0b3JpZ19lLnNjcmVlblgsIG9yaWdfZS5zY3JlZW5ZLCBvcmlnX2UuY2xpZW50WCwgb3JpZ19lLmNsaWVudFksXG5cdFx0XHRcdFx0b3JpZ19lLmN0cmxLZXksIG9yaWdfZS5hbHRLZXksIG9yaWdfZS5zaGlmdEtleSwgb3JpZ19lLm1ldGFLZXksIG9yaWdfZS5idXR0b24sIG9yaWdfZS5yZWxhdGVkVGFyZ2V0XG5cdFx0XHRcdCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUubWF0Y2gocmVfdWlfZXZlbnRzKSkge1xuXHRcdFx0XHRldmVudF9vYmplY3QgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIlVJRXZlbnRzXCIpO1xuXHRcdFx0XHRldmVudF9vYmplY3QuaW5pdFVJRXZlbnQoZSwgb3JpZ19lLmJ1YmJsZXMsIG9yaWdfZS5jYW5jZWxhYmxlLCBvcmlnX2Uudmlldywgb3JpZ19lLmRldGFpbCk7XG5cdFx0XHR9IGVsc2UgaWYgKGUubWF0Y2gocmVfaHRtbF9ldmVudHMpKSB7XG5cdFx0XHRcdGV2ZW50X29iamVjdCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiSFRNTEV2ZW50c1wiKTtcblx0XHRcdFx0ZXZlbnRfb2JqZWN0LmluaXRFdmVudChlLCBvcmlnX2UuYnViYmxlcywgb3JpZ19lLmNhbmNlbGFibGUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFldmVudF9vYmplY3QpIHJldHVybjtcblx0XHRcdHRoaXMuZGlzcGF0Y2hFdmVudChldmVudF9vYmplY3QpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBJbnRlcm5ldCBFeHBsb3JlclxuXHRcdFx0aWYgKCFlLm1hdGNoKHJlX29uKSkgZSA9IFwib25cIitlO1xuXHRcdFx0ZXZlbnRfb2JqZWN0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3Qob3JpZ19lKTtcblx0XHRcdHRoaXMuZmlyZUV2ZW50KGUsIGV2ZW50X29iamVjdCk7XG5cdFx0fVxuXHR9O1xuXG5cdCQucG5vdGlmeS5kZWZhdWx0cyA9IHtcblx0XHQvLyBUaGUgbm90aWNlJ3MgdGl0bGUuXG5cdFx0dGl0bGU6IGZhbHNlLFxuXHRcdC8vIFdoZXRoZXIgdG8gZXNjYXBlIHRoZSBjb250ZW50IG9mIHRoZSB0aXRsZS4gKE5vdCBhbGxvdyBIVE1MLilcblx0XHR0aXRsZV9lc2NhcGU6IGZhbHNlLFxuXHRcdC8vIFRoZSBub3RpY2UncyB0ZXh0LlxuXHRcdHRleHQ6IGZhbHNlLFxuXHRcdC8vIFdoZXRoZXIgdG8gZXNjYXBlIHRoZSBjb250ZW50IG9mIHRoZSB0ZXh0LiAoTm90IGFsbG93IEhUTUwuKVxuXHRcdHRleHRfZXNjYXBlOiBmYWxzZSxcblx0XHQvLyBXaGF0IHN0eWxpbmcgY2xhc3NlcyB0byB1c2UuIChDYW4gYmUgZWl0aGVyIGpxdWVyeXVpIG9yIGJvb3RzdHJhcC4pXG5cdFx0c3R5bGluZzogXCJib290c3RyYXBcIixcblx0XHQvLyBBZGRpdGlvbmFsIGNsYXNzZXMgdG8gYmUgYWRkZWQgdG8gdGhlIG5vdGljZS4gKEZvciBjdXN0b20gc3R5bGluZy4pXG5cdFx0YWRkY2xhc3M6IFwiXCIsXG5cdFx0Ly8gQ2xhc3MgdG8gYmUgYWRkZWQgdG8gdGhlIG5vdGljZSBmb3IgY29ybmVyIHN0eWxpbmcuXG5cdFx0Y29ybmVyY2xhc3M6IFwiXCIsXG5cdFx0Ly8gQ3JlYXRlIGEgbm9uLWJsb2NraW5nIG5vdGljZS4gSXQgbGV0cyB0aGUgdXNlciBjbGljayBlbGVtZW50cyB1bmRlcm5lYXRoIGl0LlxuXHRcdG5vbmJsb2NrOiBmYWxzZSxcblx0XHQvLyBUaGUgb3BhY2l0eSBvZiB0aGUgbm90aWNlIChpZiBpdCdzIG5vbi1ibG9ja2luZykgd2hlbiB0aGUgbW91c2UgaXMgb3ZlciBpdC5cblx0XHRub25ibG9ja19vcGFjaXR5OiAuMixcblx0XHQvLyBEaXNwbGF5IGEgcHVsbCBkb3duIG1lbnUgdG8gcmVkaXNwbGF5IHByZXZpb3VzIG5vdGljZXMsIGFuZCBwbGFjZSB0aGUgbm90aWNlIGluIHRoZSBoaXN0b3J5LlxuXHRcdGhpc3Rvcnk6IHRydWUsXG5cdFx0Ly8gV2lkdGggb2YgdGhlIG5vdGljZS5cblx0XHR3aWR0aDogXCIzMDBweFwiLFxuXHRcdC8vIE1pbmltdW0gaGVpZ2h0IG9mIHRoZSBub3RpY2UuIEl0IHdpbGwgZXhwYW5kIHRvIGZpdCBjb250ZW50LlxuXHRcdG1pbl9oZWlnaHQ6IFwiMTZweFwiLFxuXHRcdC8vIFR5cGUgb2YgdGhlIG5vdGljZS4gXCJub3RpY2VcIiwgXCJpbmZvXCIsIFwic3VjY2Vzc1wiLCBvciBcImVycm9yXCIuXG5cdFx0dHlwZTogXCJub3RpY2VcIixcblx0XHQvLyBTZXQgaWNvbiB0byB0cnVlIHRvIHVzZSB0aGUgZGVmYXVsdCBpY29uIGZvciB0aGUgc2VsZWN0ZWQgc3R5bGUvdHlwZSwgZmFsc2UgZm9yIG5vIGljb24sIG9yIGEgc3RyaW5nIGZvciB5b3VyIG93biBpY29uIGNsYXNzLlxuXHRcdGljb246IHRydWUsXG5cdFx0Ly8gVGhlIGFuaW1hdGlvbiB0byB1c2Ugd2hlbiBkaXNwbGF5aW5nIGFuZCBoaWRpbmcgdGhlIG5vdGljZS4gXCJub25lXCIsIFwic2hvd1wiLCBcImZhZGVcIiwgYW5kIFwic2xpZGVcIiBhcmUgYnVpbHQgaW4gdG8galF1ZXJ5LiBPdGhlcnMgcmVxdWlyZSBqUXVlcnkgVUkuIFVzZSBhbiBvYmplY3Qgd2l0aCBlZmZlY3RfaW4gYW5kIGVmZmVjdF9vdXQgdG8gdXNlIGRpZmZlcmVudCBlZmZlY3RzLlxuXHRcdGFuaW1hdGlvbjogXCJmYWRlXCIsXG5cdFx0Ly8gU3BlZWQgYXQgd2hpY2ggdGhlIG5vdGljZSBhbmltYXRlcyBpbiBhbmQgb3V0LiBcInNsb3dcIiwgXCJkZWZcIiBvciBcIm5vcm1hbFwiLCBcImZhc3RcIiBvciBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLlxuXHRcdGFuaW1hdGVfc3BlZWQ6IFwic2xvd1wiLFxuXHRcdC8vIE9wYWNpdHkgb2YgdGhlIG5vdGljZS5cblx0XHRvcGFjaXR5OiAxLFxuXHRcdC8vIERpc3BsYXkgYSBkcm9wIHNoYWRvdy5cblx0XHRzaGFkb3c6IHRydWUsXG5cdFx0Ly8gUHJvdmlkZSBhIGJ1dHRvbiBmb3IgdGhlIHVzZXIgdG8gbWFudWFsbHkgY2xvc2UgdGhlIG5vdGljZS5cblx0XHRjbG9zZXI6IHRydWUsXG5cdFx0Ly8gT25seSBzaG93IHRoZSBjbG9zZXIgYnV0dG9uIG9uIGhvdmVyLlxuXHRcdGNsb3Nlcl9ob3ZlcjogdHJ1ZSxcblx0XHQvLyBQcm92aWRlIGEgYnV0dG9uIGZvciB0aGUgdXNlciB0byBtYW51YWxseSBzdGljayB0aGUgbm90aWNlLlxuXHRcdHN0aWNrZXI6IHRydWUsXG5cdFx0Ly8gT25seSBzaG93IHRoZSBzdGlja2VyIGJ1dHRvbiBvbiBob3Zlci5cblx0XHRzdGlja2VyX2hvdmVyOiB0cnVlLFxuXHRcdC8vIEFmdGVyIGEgZGVsYXksIHJlbW92ZSB0aGUgbm90aWNlLlxuXHRcdGhpZGU6IHRydWUsXG5cdFx0Ly8gRGVsYXkgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSB0aGUgbm90aWNlIGlzIHJlbW92ZWQuXG5cdFx0ZGVsYXk6IDgwMDAsXG5cdFx0Ly8gUmVzZXQgdGhlIGhpZGUgdGltZXIgaWYgdGhlIG1vdXNlIG1vdmVzIG92ZXIgdGhlIG5vdGljZS5cblx0XHRtb3VzZV9yZXNldDogdHJ1ZSxcblx0XHQvLyBSZW1vdmUgdGhlIG5vdGljZSdzIGVsZW1lbnRzIGZyb20gdGhlIERPTSBhZnRlciBpdCBpcyByZW1vdmVkLlxuXHRcdHJlbW92ZTogdHJ1ZSxcblx0XHQvLyBDaGFuZ2UgbmV3IGxpbmVzIHRvIGJyIHRhZ3MuXG5cdFx0aW5zZXJ0X2JyczogdHJ1ZSxcblx0XHQvLyBUaGUgc3RhY2sgb24gd2hpY2ggdGhlIG5vdGljZXMgd2lsbCBiZSBwbGFjZWQuIEFsc28gY29udHJvbHMgdGhlIGRpcmVjdGlvbiB0aGUgbm90aWNlcyBzdGFjay5cblx0XHRzdGFjazoge1wiZGlyMVwiOiBcImRvd25cIiwgXCJkaXIyXCI6IFwibGVmdFwiLCBcInB1c2hcIjogXCJib3R0b21cIiwgXCJzcGFjaW5nMVwiOiAyNSwgXCJzcGFjaW5nMlwiOiAyNX1cblx0fTtcbn0pKGpRdWVyeSk7XG47IGJyb3dzZXJpZnlfc2hpbV9fZGVmaW5lX19tb2R1bGVfX2V4cG9ydF9fKHR5cGVvZiBqcXVlcnlfcG5vdGlmeSAhPSBcInVuZGVmaW5lZFwiID8ganF1ZXJ5X3Bub3RpZnkgOiB3aW5kb3cuanF1ZXJ5X3Bub3RpZnkpO1xuXG59KS5jYWxsKGdsb2JhbCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZnVuY3Rpb24gZGVmaW5lRXhwb3J0KGV4KSB7IG1vZHVsZS5leHBvcnRzID0gZXg7IH0pO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
