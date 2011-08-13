/**
 * @fileoverview
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
        
        // TODO: test why?
        // WHY: prototype error
        // var F = function() {};
        // F.prototype = event;
        // var e = new F();
        // e.originalEvent = event;

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
            logger('[KeyStroke::isValidKeyStroke]', 'event target: "' + tagName + '", Invalid Keystroke!');
            return false;
        }

        logger('[KeyStroke::isValidKeyStroke]',  'event.target.tagName=' + tagName);
        return true;
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
     *   keyStrokes: 'zhanglin',
     *   fns: {
     *     execute: function() {},
     *     clean: function() {}
     *   }
     * }
     */
    addAction: function(action) {
        var types = utils.trim(action.type || '');
        types = types.split(/\s+/);

        var type, _action;
        while (type = types.pop()) {
            _action = {
                keyStrokes: action.keyStrokes,
                fns: action.fns
            }

            logger('[ActionContainer::addActions] type: "' + type + '", action: ', _action);

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
    this.actions;
}
Router.prototype = new Proto(Router, {
    handle: function (keyStroke) {
        if (!keyStroke.isValidKeyStroke()) {
            this.clearKeyStrokes();
            return;
        }

        var type = keyStroke.getEventType();

        this.actions = this.actionContainer.getActions(type);
        this.keyStrokes += keyStroke.getKeyStroke();

        this.filterActions();
        this.execute(keyStroke);
    },

    filterActions: function () { // utils.filter
        var results = [],
            actions = this.actions,
            keyStrokes = this.keyStrokes;

        var reg,
            i = 0,
            len = actions.length;
        for (; i < len; ++i) {
            reg = new RegExp(actions[i].keyStrokes);
            if (reg.test(keyStrokes)) {
                results.push(actions[i]);
            }
        }

        this.actions = results;
    },

    execute: function (keyStroke) {
        var actions = this.actions;
        if (actions.length === 1) {
            var fns = actions[0].fns,
                execute = fns.execute,
                clean = fns.clean;

            var that = {
                currentKeyStroke: keyStroke.getKeyStroke(),
                keyStrokes: this.keyStrokes
            };

            var ret = execute.apply(that);

            clean && clean.apply(that);

            if (ret) {
                this.clearKeyStrokes();
            }
        }
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
        this.bindedEvents[type] = true;
        Event.addListener(document, type, this.handlers[type]);
    },

    unbindEvent: function (type) {
        this.bindedEvents[type] = false;
        Event.addListener(document, type, this.handlers[type]);
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
                    logger('[shortcuts::bindEvents], invalid type: ' + type);
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
                    logger('[shortcuts::addActions], invalid type: ' + action.types);
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



