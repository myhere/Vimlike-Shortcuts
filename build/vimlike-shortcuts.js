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
     *     filter: function() {},
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
                pattern: action.pattern,
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
                if (fn.call(keyStroke)) {
                    results.push(action);
                }
            } else {
                results.push(action);
            }
        }
    },

    execute: function (actions, keyStroke) {
        var createThis = (function(self) {
            return function() {
                return {
                    currentKeyStroke: keyStroke.getKeyStroke(),
                    keyStrokes: self.keyStrokes,
                    keyStroke: keyStroke
                };
            };
        })(this);

        if (actions.length === 1) {
            var fns = actions[0].fns,
                execute = fns.execute;

            this.setCleanFunc(fns.clean);

            var that = createThis();
            var ret = execute.apply(that);

            if (ret) {
                this.clearKeyStrokes();
            }
        } else if (actions.length === 0 && keyStroke.isKeypress()) { // 保证 为 'keypress‘ 是为了防止 keyup 中 清空 this.keyStrokes 属性
            var that = createThis();
            this.runClean(that);
            this.clearKeyStrokes();
        }
    },

    setCleanFunc: function(fn) {
        if (typeof fn === 'function') {
            this.cleanFn = fn;
        }
    },

    runClean: function(that) {
        var clean = this.cleanFn;
        clean && clean.call(that);
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

/**
 * @fileoverview
 * 
 * Helpers:
 *   DOM
 *   utils
 *   logger
 *
 * Core
 *   V
 *
 * Functions for initializing
 */
(function(S) {

var DOM = {
    /**
     * 元素是否被隐藏了 (display:none|visibility:hidden|祖先被隐藏)
     */
    isVisible: function(ele) {
        var rect = ele.getBoundingClientRect();
        var props = ['top', 'right', 'bottom', 'left'];

        var ret;
        ret = utils.every(props, function(value, index) {
            if (rect[value] === 0) {
                return true;
            }
        });

        return !ret;
    },

    isInView: function(ele) {
        if (!DOM.isVisible(ele)) { // 被隐藏
            return false;
        } else {
            var rect = ele.getBoundingClientRect();
            var props = ['top'];

            var ret;
            // 上面
            ret = utils.every(props, function(value, index) {
                if (rect[value] < 0) {
                    return true;
                }
            });
            if (ret) {
                return false;
            }

            // 下面
            var viewHeight = DOM.getViewHeight();
            ret = utils.every(props, function(value, index) {
                if (viewHeight - rect[value] <= 0) {
                    return true;
                }
            });
            if (ret) {
                return false;
            }

            return true;
        }
    },

    getElementsInView: function(tagName) {
        var eles;
        if (typeof tagName == 'string') {
            eles = document.getElementsByTagName(tagName);
        } else {
            eles = tagName;
        }

        var tmp = [];

        try {
            tmp = Array.prorotype.slice.call(eles);
        } catch(e) {
            var len = eles.length;
            // TODO: test reverse speed and unshift
            while (len--) {
                tmp.push(eles[len]);
            }
            tmp.reverse();
        }

        eles = utils.filter(tmp, function(ele, key) {
            if (DOM.isInView(ele)) {
                return true;
            }
        });

        return eles;
    },

    getElementPosition: function(ele) {
        var ele_rect = ele.getBoundingClientRect(ele);

        return {
            top : DOM.getDocScrollTop() + ele_rect.top,
            left: DOM.getDocScrollLeft() + ele_rect.left 
        };
    },

    getDocScrollTop: function() {
        var doc = document;
        return doc.documentElement.scrollTop || doc.body.scrollTop;
    },

    getDocScrollLeft: function() {
        var doc = document;
        return doc.documentElement.scrollLeft || doc.body.scrollLeft;
    },

    getViewHeight: function() {
        var doc = document,
            height = window.innerHeight;
            
        if (typeof height == 'undefined') {
            height = Math.max(doc.documentElement.clientHeight, doc.body.clientHeight);
        }

        return height;
    },

    getViewWidth: function() {
        var doc = document,
            width = window.innerWidth;
            
        if (typeof width == 'undefined') {
            width = Math.max(doc.documentElement.clientWidth, doc.body.clientWidth);
        }

        return width;
    },

    getDocHeight: function() {
        var doc = document;
        return doc.documentElement.scrollHeight || doc.body.scrollHeight;
    },

    addStyleSheet: function(clsText, attrs) {
        var doc   = document,
            style = doc.createElement('style');

        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = clsText;
        } else {
            var rules = doc.createTextNode(clsText);
            style.appendChild(rules);
        }

        for (var p in attrs) {
            if (attrs.hasOwnProperty(p)) {
                style.setAttribute(p, attrs[p]);
            }
        }

        doc.body.appendChild(style);
    }
};

// like underscore
var utils = (function() {
    var arrayProto = Array.prototype;

    var nativeIndexOf = arrayProto.indexOf,
        nativeForEach = arrayProto.forEach,
        nativeMap     = arrayProto.map,
        nativeFilter  = arrayProto.filter,
        nativeEvery   = arrayProto.every,
        nativeTrim    = String.prototype.trim;

    var _ = {};

    _.indexOf = function(array, item) {
        if (array == null) {
            return -1;
        }

        if (nativeIndexOf && nativeIndexOf === array.indexOf) {
            return array.indexOf(item);
        } else {
            for (var i = 0, len = array.length; i < len; ++i) {
                if (item === array[i]) {
                    return i;
                }
            }

            return -1;
        }
    };

    _.in_array = function(item, array) {
        return _.indexOf(array, item) === -1 ? false : true;
    };

    _.forEach = function(obj, iterator, context) {
        if (obj == null) {
            return;
        }

        if (nativeForEach && nativeForEach === obj.forEach) {
            obj.forEach(iterator, context);
        } else if (obj instanceof Array) {
            for (var i = 0, len = obj.length; i < len; ++i) {
                if (iterator.call(context, obj[i], i, obj) === false) {
                    return;
                }
            }
        } else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (iterator.call(context, obj[key], key, obj) === false) {
                        return;
                    }
                }
            }
        }
    };

    _.map = function(obj, iterator, context) {
        if (obj == null) {
            return;
        }

        if (nativeMap && nativeMap === obj.map) {
            return obj.map(iterator, context);
        } else {
            var results = obj instanceof Array ? [] : {};
            _.forEach(obj, function(value, key, list) {
                if (results instanceof Array) {
                    results.push(iterator.call(context, value, key, list));
                } else {
                    results[key] = iterator.call(context, value, key, list);
                }
            });

            return results;
        }
    };

    _.filter = function(obj, iterator, context) {
        if (obj == null) {
            return;
        }

        if (nativeFilter && nativeFilter === obj.filter) {
            return obj.filter(iterator, context);
        } else {
            var results = (obj instanceof Array) ? [] : {};

            utils.forEach(obj, function(value, index, list) {
                if (iterator.call(context, value, index, list)) {
                    if (results instanceof Array) {
                        results.push(value);
                    } else {
                        results[index] = value;
                    }
                }
            });

            return results;
        }
    };

    _.every = function(obj, iterator, context) {
        if (obj == null) {
            return true;
        }

        if (nativeEvery && nativeEvery == obj.every) {
            return obj.every(iterator, context);
        } else {
            var ret = true;
            utils.forEach(obj, function(value, index, list) {
                if (!(ret = ret && iterator.call(context, value, index, list))) {
                    return false;
                }
            });

            return ret;
        }
    };

    _.isEmptyObject = function(obj) {
        var isEmptyObject = true;

        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                isEmptyObject = false;
                break;
            }
        }

        return isEmptyObject;
    };

    _.trim = function(str) {
        var TRIM_REG = /^\s+|\s+$/g;

        str = String(str);
        if (nativeTrim && nativeTrim === str.trim) {
            return str.trim(str);
        } else {
            return str.replace(TRIM_REG, '');
        }
    };

    _.upperFirst = function(str) {
        str = String(str);
        return str.charAt(0).toUpperCase() + str.substr(1);
    };

    return _;
})();

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

// 便于功能模块的增加
var V = (function() {
    var ids = [],
        modules = [];

    var getModule = function(module) {
        return typeof module === 'function' ? module() : module;
    },
    add = function(type, module, id) {
        module = getModule(module);
        module.type = type;

        ids.push(id);
        modules.push(module);
    };

    return {
        addKeydown: function(id, module) {
            add('keydown', module, id);
        },
        addKeypress: function (id, module) {
            add('keypress', module, id);
        },
        addKeyup: function (id, module) {
            add('keyup', module, id);
        },

        /**
         * @param {Array}
         */
        init: function (blackList) {
            blackList = blackList || [];
            for (var i = 0, len = ids.length; i < len; ++i) {
                if (!utils.in_array(ids[i]), blackList) {
                    S.addActions(modules[i]);
                    
                    // logger('[V::init], init module: "' + ids[i] +'"');
                }
            }
        }
    };
})();

var CONSTANTS = {
    SCROLL_STEP: 200
};
var filterByTarget = function() {
    return this.isValidKeyStroke();
};
var BlurContainer = (function() {
    var fns = [];

    return {
        add: function(fn) {
            fns.push(fn);
        },

        execute: function() {
            var fn;
            while (fn = fns.shift()) {
                fn();
            }
        }
    };
})();

V.addKeypress('sayHello', {
    pattern: {
        value: 'zhanglin'
    },
    fns: {
        filter: filterByTarget,
        execute: function() {
            if (this.keyStrokes == 'zhanglin') {
                alert('hello, you just hit my name: "zhanglin"! sorry for this alert');

                return true;
            }
        }
    }
});

V.addKeypress('srcollDown', {
    pattern: {
        value: 'j'
    },
    fns: {
        filter: filterByTarget,
        execute: function() {
            var scrollTop = DOM.getDocScrollTop();
            window.scrollTo(0, scrollTop + CONSTANTS.SCROLL_STEP);
            return true;
        }
    }
});

V.addKeypress('scrollUp', {
    pattern: {
        value: 'k'
    },
    fns: {
        filter: filterByTarget,
        execute: function() {
            var scrollTop = DOM.getDocScrollTop();
            window.scrollTo(0, scrollTop - CONSTANTS.SCROLL_STEP);
            return true;
        }
    }
});

V.addKeypress('goTop', {
    pattern: {
        value: 'gg'
    },
    fns: {
        filter: filterByTarget,
        execute: function () {
            if (this.keyStrokes === 'gg') {
                logger('gotop');
                window.scrollTo(0, 0);
                return true;
            }
        }
    }
});

V.addKeypress('goBottom', {
    pattern: {
        value: 'G'
    },
    fns: {
        filter: filterByTarget,
        execute: function () {
            var offsetHeight = DOM.getDocHeight();
            window.scrollTo(0, offsetHeight);
            return true;
        }
    }
});

V.addKeypress('goInsert', {
    pattern: {
        isRegExp: true,
        value: '^g(?:[1-9]\\d*)?i?$'
    },
    fns: {
        filter: filterByTarget,
        execute: function () {
            if (this.currentKeyStroke !== 'i') {
                return;
            }

            // 获取第几个
            var focusIndex = String(this.keyStrokes).match(/\d+/);
            focusIndex = focusIndex && focusIndex[0];
            focusIndex = parseInt((focusIndex || 1), 10);

            var inputEles = DOM.getElementsInView('input');
            var INVALID_INPUT_TYPE = ['hidden'];
            inputEles = utils.filter(inputEles, function(inputEle, key) {
                if (utils.in_array(inputEle.type, INVALID_INPUT_TYPE)) {
                    return false;
                } else {
                    return true;
                }
            });

            var inputEle = inputEles[focusIndex-1];
            if (inputEle) {
                // prevent insert
                setTimeout(function() {
                    inputEle.focus();
                    inputEle = null;
                    // inputEle.style.background = 'red';
                }, 1);
            }

            return true;
        }
    }
});

var finderFactory = (function() {
    var tagContainer,
        findedLinkTagPair;

    var FINDED_TAG_cssText = 'position:absolute;z-index:99999;background-color:yellow;color:black;padding:0 1px;border:solid 1px #E3BE23;text-decoration:none;font:bold 12px "Helvetica Neue", "Helvetica", "Arial", "Sans";';

    function filterLinks(findedLinkTagPair, currentKeyStrokes, tagContainer) {
        var suffix = currentKeyStrokes.substr(1);

        return utils.filter(findedLinkTagPair, function(pair, idx) {
            if (pair[0].indexOf(suffix) === 0) {
                return true;
            } else {
                // remove tag and link
                tagContainer.removeChild(pair[2]);
                pair[0] = pair[1] = pair[2] = null;
            }
        });
    }
    function tagEachLink(links, tagContainer) {
        var findedLinkTagPair = [];

        var keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
            z26s = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'],
            key_len = keys.length,
            dig_cnt = Number(links.length).toString(key_len).length;

        utils.forEach(links, function(link, index) {
            var digits = index.toString(key_len),
                vim_key = '',
                i = 0,
                k, idx;
            while (k = digits.charAt(i++)) {
                idx = utils.indexOf(z26s, k);
                vim_key += keys[idx];
            }

            if (vim_key.length < dig_cnt) {
                vim_key = (new Array(dig_cnt - vim_key.length + 1)).join('a') + vim_key;
            }

            var ins = document.createElement('ins');
            var cssText = FINDED_TAG_cssText;
            var ele_pos = DOM.getElementPosition(link);
            cssText += 'left:' + ele_pos.left + 'px;top:' + ele_pos.top + 'px;';
            ins.style.cssText = cssText;
            ins.innerHTML = vim_key;
            tagContainer.appendChild(ins);

            findedLinkTagPair.push([vim_key, link, ins]);
        });

        document.body.appendChild(tagContainer);

        return findedLinkTagPair;
    }
    function fireClick(ele) {
        // hack for so safe Firefox
        if (/Firefox/.test(navigator.userAgent)) {
            logger('[fireClick], firefox, special click');
            var attr_target = ele.getAttribute('target');
            if (!attr_target || attr_target == '_self') { // self tab
                location.href = ele.href;
            } else { // new tab
                window.open(ele.href);
            }
            return;
        }

        if (document.createEvent) {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window,
            0, 0, 0, 0, 0, false, false, false, false, 0, null);
            var canceled = ! ele.dispatchEvent(evt);
            if(canceled) {
                // A handler called preventDefault
                logger("[fireClick], canceled");
            } else {
                // None of the handlers called preventDefault
                logger("[fireClick], not canceled");
            }
        } else {
            ele.click();
        }
    }

    function clean() {
        document.body.removeChild(tagContainer);
        tagContainer = null;
        findedLinkTagPair = null;
    }

    function execute() {
        var links,
            keyStrokes = this.keyStrokes;

        if (keyStrokes.toLowerCase() == 'f') { // 'f' 编号
            links = document.links;
            links = DOM.getElementsInView(links);

            tagContainer = document.createElement('div');
            links = tagEachLink(links, tagContainer);
            findedLinkTagPair = links;

            BlurContainer.add(clean);

            if (links.length == 0) {
                return true;
            }

            return;
        } else { // 筛选
            findedLinkTagPair = filterLinks(findedLinkTagPair, keyStrokes, tagContainer); // 过滤 & 更新 tag
            links = findedLinkTagPair;
        }

        var len = links.length;
        if (len > 1) {
            return;
        } else if (len === 1){
            var click = function(ele, newTab) {
                var attr_target = ele.getAttribute('target');
                if (newTab) {
                    ele.setAttribute('target', '_blank');
                }

                fireClick(ele);

                if (newTab) {
                    setTimeout(function() {
                        ele.setAttribute('target', attr_target);
                        ele = null;
                    }, 10);
                }
            };

            click(links[0][1], keyStrokes.charAt(0) === 'F');

            clean();
        }

        return true;
    }

    return  function (pattern) {
        return {
            pattern: {
                isRegExp: true,
                value: pattern
            },
            fns: {
                filter: filterByTarget,
                execute: execute,
                clean: clean
            }
        };
    }
})();
V.addKeypress('findf', finderFactory('^f.*'));
V.addKeypress('findF', finderFactory('^F.*'));

V.addKeyup('blur', {
    fns: {
        filter: function () {
            return this.isEscape();
        },
        execute: function() {
            var activeElement,
                elements;

            // @see:  http://stackoverflow.com/questions/967096/using-jquery-to-test-if-an-input-has-focus
            if (activeElement = document.activeElement) {
                try {
                    activeElement.blur();
                } catch(e) {}
            } else {
                elements = document.getElementsByTagName('input');
                for (var i = 0; activeElement = elements[i]; ++i) {
                    try {
                        activeElement.blur();
                    } catch(e) {}
                }
            }

            BlurContainer.execute();

            return true;
        }
    }
});

function bindKeypress() {
    S.bindEvents(['keypress']);
    S.bindEvents(['keyup']);
}
 
function init() {
    V.init();

    bindKeypress();
}

init();
})(this.shortcuts);

/**
 * TODO:
 * 给各种 type 的 V.addActions 增加门面函数
 */
