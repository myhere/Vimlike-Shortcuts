/**
 * @fileoverview
 *
 * NOTE:
 *   - 在 keypress 中绑定可见按键的事件
 *   - 在 keyup/keydown 中绑定不可见按键的事件, keyup/keydown 添加的 action 的 pattern 不会生效，通过 filter 过滤
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
    // args.unshift(+new Date + ':');

    var log = window.console && console.log;
    if (log) {
        if (log.apply) {
            log.apply(console, args);
        } else {
            console.log(args);
        }
    } 
}
logger.LOG_LEVEL = '@debug@';

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
        return __constructor.prototype;
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

        var target = this.event.target;

        var tagName = target.tagName.toLowerCase();

        if (utils.in_array(tagName, INVALID_TARGETS)) {
            return false;
        }

        // contenteditable
        var contenteditable = target.getAttribute('contenteditable');
        // ie8 的 ie7 模式下返回 inherit, WHAT THE HELL!, 其他情况没有测试
        if (contenteditable && contenteditable !== 'inherit') {
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
     *   type: 'keypress',
     *   pattern: {
     *     isRegExp: false,
     *     value: 'zhanglin'
     *   },
     *   fns: {
     *     filter: function(currentKeyStroke, keyStrokes, keyStroke) {},
     *     execute: function(currentKeyStroke, keyStrokes, keyStroke) {},
     *     clear: function(currentKeyStroke, keyStrokes, keyStroke) {}
     *   }
     * }
     */
    // TODO: check properties of action
    addAction: function(action) {
        var type = utils.trim(action.type || '').toLowerCase();

        if (!this.actions[type]) {
            throw new TypeError('Invalid "type" of "action" in [ActionContainer::addAction]');
        }

        this.actions[type].push(action);
    },

    getActions: function (type) {
        return this.actions[type] || [];
    },

    getAllActions: function() {
        return this.actions;
    }
});

function Router(actionContainer) {
    this.actionContainer = actionContainer;

    this.keyStrokes = '';
    this.prevKeypressActions = null;
}
Router.prototype = new Proto(Router, {
    handle: function (keyStroke) {
        if (keyStroke.isKeypress()) {
            // 只在 keypress 中获取字符
            this.keyStrokes += keyStroke.getKeyStroke();
            this.handleKeypress(keyStroke);
        } else {
            this.handleKeyHit(keyStroke);
        }
    },

    handleKeypress: function(keyStroke) {
        var actions = this.getPrevKeypressActions();
        actions = this.filterKeypresActions(actions, keyStroke);
        this.setPrevKeypressActions(actions);

        this.execute(actions, keyStroke);
    },

    handleKeyHit: function(keyStroke) {
        var actions = this.actionContainer.getActions(keyStroke.getEventType());
        actions = this.filterKeyHitActions(actions, keyStroke);

        this.execute(actions, keyStroke);
    },

    filterKeypresActions: function(actions, keyStroke) {
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
                pattern = action.pattern,
                pattern_filter_ret;

            if (pattern) {
                value = pattern.value;
                if (pattern.isRegExp) {
                    value = new RegExp(value);
                    pattern_filter_ret = value.test(keyStrokes);
                } else {
                    pattern_filter_ret = value.indexOf(keyStrokes) === 0;
                }

                if (pattern_filter_ret && filterByFn(action)) {
                    results.push(action);
                } else {
                    // 执行不符合要求的 clear 函数, 因为之前执行了他的 execute 方法, 可能需要清理
                    executeClear(action);
                }
            } else {
                filterByFn(action);
            }
        }

        function filterByFn(action) {
            var filter = action.fns && action.fns.filter;
            if (typeof filter === 'function') {
                if (filter(currentKeyStroke, keyStrokes, keyStroke)) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        }

        // 执行被过滤掉的 clear 函数
        function executeClear(action) {
            var clear = action.fns && action.fns.clear;

            if (typeof clear === 'function') {
                clear(currentKeyStroke, keyStrokes, keyStroke);
            }
        }
    },

    // keydown/keyup 只通过 filter 函数过滤, 只有 filter 函数返回 真才会执行
    filterKeyHitActions: function(actions, keyStroke) {
        var i = 0,
            len = actions.length,
            action,
            filter,
            results = [],
            currentKeyStroke = keyStroke.getKeyStroke(),
            keyStrokes = this.keyStrokes;

        for (; i < len; ++i) {
            action = actions[i];
            filter = action.fns && action.fns.filter;
            if (typeof filter === 'function' && filter(currentKeyStroke, keyStrokes, keyStroke)) {
                results.push(action);
            }
        }

        return results;
    },

    execute: function (actions, keyStroke) {
        var currentKeyStroke = keyStroke.getKeyStroke(),
            keyStrokes = this.keyStrokes;

        var len = actions.length;
        if (len > 0) {
            var i = 0,
                fns,
                execute,
                allFinished = true,
                ret;
            for (; i < len; ++i) {
                fns = actions[i].fns;
                execute = fns.execute;

                logger('[Router::execute], ',this,currentKeyStroke, keyStrokes, keyStroke);
                ret = execute(currentKeyStroke, keyStrokes, keyStroke);
                allFinished = ret && allFinished;
            }

            // keyup/keydown 函数都返回真也会清空输入!!!
            if (allFinished) {
                this.clearKeyStrokes();
                this.clearPrevKeypressActions();
            }
        } else if (keyStroke.isKeypress()) { // 防止 keydown/keyup 中清空
            this.clearKeyStrokes();
            this.clearPrevKeypressActions();
        }
    },

    getPrevKeypressActions: function() {
        return this.prevKeypressActions == null ?
                    this.actionContainer.getActions('keypress') :
                    this.prevKeypressActions;
    },

    setPrevKeypressActions: function(actions) {
        if (actions.length > 0) {
            this.prevKeypressActions = actions;
        } else {
            this.clearPrevKeypressActions();
        }
    },

    clearPrevKeypressActions: function() {
        this.prevKeypressActions = null;
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
                    throw new TypeError('[shortcuts::bindEvents], invalid types: ' + types);
                }
            }
        },

        unBindEvents: function(types) {
            for (var i = 0, l = types.length; i < l; ++i) {
                controller.unbindEvent(types[i]);
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
                var type = utils.trim(action.type || '');

                if (isValidEventType(type)) {
                    actionContainer.addAction(action);
                } else {
                    throw new TypeError('[shortcuts::addActions], invalid type: ' + action.type);
                }
            }
        },
        
        getActions: function(type) {
            var ret = [];
            if (isValidEventType(type)) {
                ret = actionContainer.getActions(type);
            } else {
                ret = actionContainer.getAllActions();
            }

            return ret;
        },

        logger: {
            on: function() {
                logger.LOG_LEVEL = 'debug';
            },
            off: function() {
                logger.LOG_LEVEL = 'Hello World!~';
            },
            log: function() {
                logger.apply(null, arguments);
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
