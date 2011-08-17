/**
 * @fileoverview
 *
 * NOTE:
 *   - 在 keypress 中绑定可见按键的事件
 *   - 在 keyup 中绑定不可见按键的事件
 * 
 * Helpers:
 *   logger
 *   utils
 *   Proto
 *   Event
 *
 * Core Classes:
 *   KeyStroke
 *   ActionContainer
 *   Router
 *   Controller
 * 
 * Functions for initializing
 *   extractToWindow
 *   main
 */

(function() {

function logger() {
    if (logger.LOG_LEVEL !== 'debug') {
        return;
    }

    var args = Array.prototype.slice.call(arguments);
    args.unshift(+new Date + ':');

    var log = window.console && console.log;
    if (log) {
        if (log.apply) {
            log.apply(console, args);
        } else {
            console.log(args);
        }
    } 
}
logger.LOG_LEVEL = 'debug';

var utils = {
    in_array: function(item, array) {
        if (!(array instanceof Array)) {
            return false;
        }

        var nativeIndexOf = Array.prototype.indexOf;
        if (nativeIndexOf && array.indexOf === nativeIndexOf) {
            return array.indexOf(item) !== -1;
        } else {
            for (var i = 0, len = array.length; i < len; ++i) {
                if (item === array[i]) {
                    return true;
                }
            }

            return false;
        }
    },

    trim: function (str) {
        var TRIM_REG = /^\s+|\s+$/g;

        var nativeTrim = String.prototype.trim;

        str = String(str);
        if (nativeTrim && nativeTrim === str.trim) {
            return str.trim(str);
        } else {
            return str.replace(TRIM_REG, '');
        }
    } 
};

/**
 * @param {Function}
 * @param {Object}
 */ 
function Proto(__constructor, proto) {
    if (typeof __constructor !== 'function') {
        throw new TypeError('Argument "__constructor" of "Proto" need to be an instance of a "Function"!');
    }
    if (!(proto && (proto instanceof Object))) {
        return;
    }

    this.constructor = __constructor;
    for (var p in proto) {
        if (proto.hasOwnProperty(p)) {
            this[p] = proto[p];
        }
    }
}

var Event = {
    addListener: function() {
        if (document.addEventListener) {
            return function(node, type, fn) {
                node.addEventListener(type, fn, false);
            }
        } else if (document.attachEvent) {
            return function(node, type, fn) {
                node.attachEvent('on' + type, fn);
            }
        } else {
            return function(node, type, fn) {
                throw 'cannot bind event"' + type + '"';
            }
        }
    }(),

    removeListener: function() {
        if (document.removeEventListener) {
            return function(node, type, fn) {
                node.removeEventListener(type, fn, false);
            }
        } else if (document.detachEvent) {
            return function(node, type, fn) {
                node.detachEvent('on' + type, fn);
            }
        } else {
            return function(node, type) {
                throw 'cannot remove event"' + type + '"';
            }
        }
    }(),

    /**
     * return Event object with normalized interface
     */
    EventObject: function(event) {
        event = event || window.event;
        
        // COPY property
        var e = {};
        e.originalEvent = event;
        var props = 'type altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY originalTarget pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which'.split(' ');
        var l = props.length, prop;
        while (l) {
            prop = props[--l];
            e[prop] = event[prop];
        }

        // normalize if necessary
        if (!e.target) {
            e.target = event.srcElement || document;
        }
        
        // add which for key events
        if (e.which === undefined) {
            e.which = (event.charCode !== undefined) ? event.charCode : event.keyCode;
        }

        if (!e.stopPropagation) {
            e.stopPropagation = function() {
                event.cancelBubble = true;
            }
        }
        if (!e.preventDefault) {
            e.preventDefault = function() {
                event.returnValue = false;
            }
        }

        return e;
    }
};

/**
 * @param Event: wrapped native Event object
 */
function KeyStroke(event) {
    this.event = event;
}
KeyStroke.prototype = new Proto(KeyStroke, {
    isEscape: function() { // esc
        return this.getKeyCode() == 27;
    },

    isValidKeyStroke: function() {
        var INVALID_TARGETS = ['input', 'textarea'];

        var tagName = this.event.target.tagName.toLowerCase();

        if (utils.in_array(tagName, INVALID_TARGETS)) {
            return false;
        }

        return true;
    },

    isKeydown: function() {
        return this.getEventType() === 'keydown';
    },

    isKeypress: function () {
        return this.getEventType() === 'keypress';
    },

    isKeyup: function() {
        return this.getEventType() === 'keyup';
    },

    getKeyCode: function() {
        return this.event.which;
    },

    getKeyStroke: function() {
        return String.fromCharCode(this.getKeyCode());
    },

    getEventType: function() {
        return this.event.type;
    },

    getEvent: function() {
        return this.event;
    }
});

function ActionContainer() {
    this.actions = {
        keydown: [],
        keypress: [],
        keyup: []
    };
}
ActionContainer.prototype = new Proto(ActionContainer, {
    /**
     * @param {Object}
     * Object example:
     * {
     *   type: 'keydown keypress',
     *   pattern: {
     *     isRegExp: false,
     *     value: 'zhanglin'
     *   },
     *   fns: {
     *     filter: function(currentKeyStroke, keyStrokes, keyStroke) {},
     *     setup: function(currentKeyStroke, keyStrokes, keyStroke) {},
     *     execute: function(currentKeyStroke, keyStrokes, keyStroke) {},
     *     clean: function(currentKeyStroke, keyStrokes, keyStroke) {}
     *   }
     * }
     */
    addAction: function(action) {
        var types = utils.trim(action.type || '');
        types = types.split(/\s+/);

        var type, _action;
        while (type = types.pop()) {
            _action = {
                pattern: action.pattern,
                fns: action.fns
            }

            this.actions[type].push(_action);
        }
    },

    getActions: function (type) {
        return this.actions[type] || [];
    }
});

function Router(actionContainer) {
    this.actionContainer = actionContainer;

    this.keyStrokes = '';

    this.setupFn;
    this.cleanFn;
}
Router.prototype = new Proto(Router, {
    handle: function (keyStroke) {
        var type = keyStroke.getEventType();
        // 只在 keypress 中获取字符
        if (keyStroke.isKeypress()) {
            this.keyStrokes += keyStroke.getKeyStroke();
        }
        var actions = this.actionContainer.getActions(type);
        actions = this.filterActions(actions, keyStroke);
        this.execute(actions, keyStroke);
    },

    filterActions: function (actions, keyStroke) { // utils.filter
        var results = [],
            currentKeyStroke = keyStroke.getKeyStroke(),
            keyStrokes = this.keyStrokes;

        var i = 0,
            len = actions.length;
        for (; i < len; ++i) {
            filter(actions[i]);
        }

        return results;

        function filter(action) {
            var value,
                pattern = action.pattern;

            if (pattern) {
                value = pattern.value;
                if (pattern.isRegExp) {
                    value = new RegExp(value);
                    if (value.test(keyStrokes)) {
                        customFilter(action);
                    }
                } else { 
                    if (value.indexOf(keyStrokes) === 0) {
                        customFilter(action);
                    }
                }
            } else {
                customFilter(action);
            }
        }

        function customFilter(action) {
            var fn = action.fns && action.fns.filter;
            if (typeof fn === 'function') {
                if (fn(currentKeyStroke, keyStrokes, keyStroke)) {
                    results.push(action);
                }
            } else {
                results.push(action);
            }
        }
    },

    execute: function (actions, keyStroke) {
        var currentKeyStroke = keyStroke.getKeyStroke(),
            keyStrokes = this.keyStrokes;

        if (actions.length === 1) {
            var fns = actions[0].fns,
                execute = fns.execute;

            this.setCleanFunc(fns.clean);

            this.runSetup(currentKeyStroke, keyStrokes, keyStroke);
            var ret = execute(currentKeyStroke, keyStrokes, keyStroke);

            this.setSetupFunc(fns.setup);

            if (ret) {
                this.clearKeyStrokes();
            }
        } else if (actions.length === 0 && keyStroke.isKeypress()) { // 保证 为 'keypress‘ 是为了防止 keyup 中 清空 this.keyStrokes 属性
            this.runSetup(currentKeyStroke, keyStrokes, keyStroke);
            this.runClean(currentKeyStroke, keyStrokes, keyStroke);
            this.clearKeyStrokes();
        }
    },

    setSetupFunc: function(fn) {
        if (typeof fn === 'function') {
            this.setupFn = fn;
        }
    },

    setCleanFunc: function(fn) {
        if (typeof fn === 'function') {
            this.cleanFn = fn;
        }
    },

    runSetup: function(currentKeyStroke, keyStrokes, keyStroke) {
        var setup = this.setupFn;
        setup && setup(currentKeyStroke, keyStrokes, keyStroke);
        this.setupFn = null;
    },

    runClean: function(currentKeyStroke, keyStrokes, keyStroke) {
        var clean = this.cleanFn;
        clean && clean(currentKeyStroke, keyStrokes, keyStroke);
        this.cleanFn = null;
    },

    clearKeyStrokes: function () {
        this.keyStrokes = '';
    }
});

function Controller(router) {
    this.router = router;

    this.bindedEvents = {};
    this.handlers = {};

    this.setHandlers();
}
Controller.prototype = new Proto(Controller, {
    setHandlers: function() {
        var self = this;

        var handle = function (event) {
            var keyStroke = new KeyStroke(Event.EventObject(event));

            self.router.handle(keyStroke);
        };

        this.handlers.keydown = handle;
        this.handlers.keypress = handle;
        this.handlers.keyup  = handle;
    },

    bindEvent: function (type) {
        if (!this.bindedEvents[type]) {
            this.bindedEvents[type] = true;
            Event.addListener(document, type, this.handlers[type]);
            
            logger('[Controller::bindEvent], bind Event: "' + type + '"');
        }
    },

    unbindEvent: function (type) {
        if (this.bindedEvents[type]) {
            this.bindedEvents[type] = false;
            Event.removeListener(document, type, this.handlers[type]);
            logger('[Controller::unbindEvent], unbind Event: "' + type + '"');
        }
    }
});

function extractToWindow(controller, actionContainer) {
    window.shortcuts = {
        bindEvents: function(types) {
            if (types instanceof Array) {
                for (var i = 0, len = types.length; i < len; ++i) {
                    bind(types[i]);
                }
            } else {
                bind(types);
            }

            function bind(type) {
                if (isValidEventType(type)) {
                    controller.bindEvent(type);
                } else {
                    throw new Error('[shortcuts::bindEvents], invalid types: ' + types);
                }
            }
        },

        addActions: function (actions) {
            if (actions instanceof Array) {
                for (var i = 0, len = actions.length; i < len; ++i) {
                    add(actions[i]);
                }
            } else {
                add(actions);
            }

            function add(action) {
                var type,
                    valid = true,
                    types = utils.trim(action.type || '');

                types = types.split(/\s+/);
                while (type = types.pop()) {
                    if (!isValidEventType(type)) {
                        valid = false;
                        break;
                    }
                }

                if (valid) {
                    actionContainer.addAction(action);
                } else {
                    throw new Error('[shortcuts::addActions], invalid type: ' + action.type);
                }
            }
        }
    }

    // guard for api
    function isValidEventType (type) {
        var validTypes = ['keydown', 'keypress', 'keyup'];
        if (utils.in_array(type, validTypes)) {
            return true;
        } else {
            return false;
        }
    }
}
function main() {
    var actionContainer = new ActionContainer(),
        router = new Router(actionContainer),
        controller = new Controller(router);

    extractToWindow(controller, actionContainer);
}

main();

})();

