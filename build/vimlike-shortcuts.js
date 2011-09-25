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
     *     execute: function(currentKeyStroke, keyStrokes, keyStroke) {},
     *     clean: function(currentKeyStroke, keyStrokes, keyStroke)
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
    },

    getAllActions: function() {
        return this.actions;
    }
});

function Router(actionContainer) {
    this.actionContainer = actionContainer;

    this.keyStrokes = '';
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
        logger('[Router::handle], matched actioins: ', actions);
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
                    } else {
                        executeClean(action);
                    }
                } else { 
                    if (value.indexOf(keyStrokes) === 0) {
                        customFilter(action);
                    } else {
                        executeClean(action);
                    }
                }
            } else {
                customFilter(action);
            }
        }

        function customFilter(action) {
            var fn = action.fns && action.fns.filter;
            var clean = action.fns && action.fns.clean;
            if (typeof fn === 'function') {
                if (fn(currentKeyStroke, keyStrokes, keyStroke)) {
                    results.push(action);
                } { // 执行不符合按键的 action 的 clean 函数
                    executeClean(action)
                }
            } else {
                results.push(action);
            }
        }

        // 执行被过滤掉的 clean 函数
        function executeClean(action) {
            var clean = action.fns && action.fns.clean;

            if (typeof clean === 'function') {
                clean(currentKeyStroke, keyStrokes, keyStroke);
            }
        }
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

            if (allFinished) {
                this.clearKeyStrokes();
            }
        } else if (len === 0 && keyStroke.isKeypress()) { // 保证 为 'keypress' 是为了防止 keyup 中 清空 this.keyStrokes 属性
            this.clearKeyStrokes();
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
                var type = utils.trim(action.type || '');

                if (isValidEventType(type)) {
                    actionContainer.addAction(action);
                } else {
                    throw new Error('[shortcuts::addActions], invalid type: ' + action.type);
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

logger = S.logger;
logger.on();

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
                    
                    // logger.log('[V::init], init module: "' + ids[i] +'"');
                }
            }
        }
    };
})();

var CONSTANTS = {
    SCROLL_STEP: 200,
    FIND_STYLE: {
        STYLE_ID: 'vimlike:findStyleId',
        STYLE: '.vimlike-shortcuts-found-tag{position:absolute;z-index:99999;background-color:yellow;color:black;padding:0 1px;border:solid 1px #E3BE23;text-decoration:none;font:bold 12px "Helvetica Neue", "Helvetica", "Arial", "Sans";}'
    },
    HELP_VIEW: {
        STYLE_ID: 'vimlike:helpStyleId',
        HTML_ID: 'vimlike:helpHtmlId',
        STYLE: '\
                .vim-bml-wrapper{width:100%;height:100%;overflow:hidden;border-radius:8px;background-color:#333;opacity:0.85;filter:alpha(opacity=85);}\
                .vim-bml-wrapper td,.vim-bml-wrapper th{background:transparent;color:#fff;font-family:arial,sans-serif;}\
                .vim-bml-area{margin:10px;}\
                .vim-bml-area td{vertical-align:top;}\
                .vim-bml-hd{width:100%;height:24px;border-bottom:1px solid #999;font-weight:bold;}\
                .vim-bml-lt{text-align:left;font-size:16px;}\
                .vim-bml-rt{text-align:right;cursor:pointer;text-decoration:underline;}\
                .vim-bml-btn{color:#dd0;}\
                .vim-bml-bd{border-collapse:collapse;width:100%;margin-top:3px;border-bottom:1px solid #999;font-size:13px;}\
                .vim-bml-help td{text-align:left;}\
                .vim-bml-key{text-align:right !important;font-weight:bold;padding-right:3px;}\
                .vim-bml-action{text-align:left;}\
                .vim-bml-help{border-collapse:collapse;}\
                .vim-bml-help th{color:#dd0;font-weight:bold;}\
                .vim-bml-help span{padding-right:3px;color:#dd0;font-family:"courier new",monospace;}\
                .vim-bml-ft{width:100%;margin-top:3px;font-size:12px;}\
                .vim-bml-ft-lt{text-align:left;}\
                .vim-bml-ft-lt a{color:#f60;}\
                .vim-bml-ft-rt{text-align:right;}',
        HTML: '\
                <div class="vim-bml-wrapper">\
                    <div class="vim-bml-area">\
                        <table class="vim-bml-hd">\
                            <tr>\
                                <td class="vim-bml-lt">Vim-like bookmarklet Help</td>\
                                <td class="vim-bml-rt" title="Click or Press Enter to hide Help"><span class="vim-bml-btn" id="vimlike:bookmarlet:closeBtn">close</span></td>\
                            </tr>\
                        </table>\
                        <table class="vim-bml-bd">\
                            <tr>\
                                <td>\
                                    <table class="vim-bml-help">\
                                        <tr><th></th><th>Supported</th></tr>\
                                        <tr><td class="vim-bml-key"><span>j</span>:</td><td>Scroll Down</td></tr>\
                                        <tr><td class="vim-bml-key"><span>k</span>:</td><td>Scroll Up</td></tr>\
                                        <tr><td class="vim-bml-key"><span>gg</span>:</td><td>Go to Top</td></tr>\
                                        <tr><td class="vim-bml-key"><span>G</span>:</td><td>Go to Bottom</td></tr>\
                                        <tr><td class="vim-bml-key"><span>g(\\d*)i</span>:</td><td>Focus Input</td></tr>\
                                        <tr><td class="vim-bml-key"><span>f</span>:</td><td>Click Link</td></tr>\
                                        <tr><td class="vim-bml-key"><span>F</span>:</td><td>Click Link in New Window</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Esc</span>:</td><td>Blur Input</td></tr>\
                                        <tr><td class="vim-bml-key"><span>?</span>:</td><td>Show This Help</td></tr>\
                                    </table>\
                                </td>\
                                <td>\
                                    <table class="vim-bml-help">\
                                        <tr><th></th><th>Native</th></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + f</span>:</td><td>Search</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + r</span>:</td><td>Refresh</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + w</span>:</td><td>Close the Current Window</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + l</span>:</td><td>Open URL in Current Window</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + h</span>:</td><td>View the History</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + -></span>:</td><td>History Forward</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + <-</span>:</td><td>History Back</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + Tab</span>:</td><td>Switches to the next tab.</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Ctrl + Shift + Tab</span>:</td><td>Switches to the previous tab</td></tr>\
                                        <tr><td class="vim-bml-key"><span>Alt + Home</span>:</td><td>Go to Home Page</td></tr>\
                                    </table>\
                                </td>\
                            </tr>\
                        </table>\
                        <table class="vim-bml-ft">\
                            <tr>\
                                <td class="vim-bml-ft-lt"><a href="mailto:myhere.2009@gmail.com">Feedback</a></td>\
                                <td class="vim-bml-ft-rt">Version: 0.1.0</td>\
                            </tr>\
                        </table>\
                    </div>\
                </div>',
        WIDTH: 800
    }
};
var filterByTarget = function(c, s, keyStroke) {
    return keyStroke.isValidKeyStroke();
};

V.addKeypress('sayHello', {
    pattern: {
        value: 'zhanglin'
    },
    fns: {
        filter: filterByTarget,
        execute: function(c, keyStrokes) {
            if (keyStrokes == 'zhanglin') {
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
        execute: function (c, keyStrokes) {
            if (keyStrokes === 'gg') {
                logger.log('gotop');
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
        execute: function (currentKeyStroke, keyStrokes) {
            if (currentKeyStroke !== 'i') {
                return;
            }

            // 获取第几个
            var focusIndex = String(keyStrokes).match(/\d+/);
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

(function() {
    var tagContainer,
        findedLinkTagPair;

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
            ins.className = 'vimlike-shortcuts-found-tag'; 
            var ele_pos = DOM.getElementPosition(link);
            var cssText = 'left:' + ele_pos.left + 'px;top:' + ele_pos.top + 'px;';
            ins.style.cssText = cssText;
            ins.innerHTML = vim_key;
            tagContainer.appendChild(ins);

            findedLinkTagPair.push([vim_key, link, ins]);
        });

        // 没有样式时添加
        var FIND_STYLE = CONSTANTS.FIND_STYLE;
        if (!document.getElementById(FIND_STYLE.STYLE_ID)) {
            DOM.addStyleSheet(FIND_STYLE.STYLE, {
                id: FIND_STYLE.STYLE_ID
            });
        }
        document.body.appendChild(tagContainer);

        return findedLinkTagPair;
    }
    function fireClick(ele) {
        // hack for so safe Firefox
        if (/Firefox/.test(navigator.userAgent)) {
            logger.log('[fireClick], firefox, special click');
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
                logger.log("[fireClick], canceled");
            } else {
                // None of the handlers called preventDefault
                logger.log("[fireClick], not canceled");
            }
        } else {
            ele.click();
        }
    }

    function clean() {
        try {
            document.body.removeChild(tagContainer);
        } catch (e) {}
        tagContainer = null;
        findedLinkTagPair = null;
    }

    function execute(currentKeyStroke, keyStrokes, keyStroke) {
        var links,
            keyStrokes = keyStrokes;

        if (keyStrokes.toLowerCase() == 'f') { // 'f' 编号
            links = document.links;
            links = DOM.getElementsInView(links);

            tagContainer = document.createElement('div');
            links = tagEachLink(links, tagContainer);
            findedLinkTagPair = links;

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

    var finderFactory = function(pattern) {
        return {
            type: pattern,
            pattern: {
                isRegExp: true,
                value: pattern
            },
            fns: {
                filter: filterByTarget,
                execute: execute
            }
        };
    };
    V.addKeypress('findf', finderFactory('^f.*'));
    V.addKeypress('findF', finderFactory('^F.*'));
    V.addKeyup('findCleaner', {
        fns: {
            filter: function (c, s, keyStroke) {
                return keyStroke.isEscape();
            },
            execute: function() {
                clean();
                return true;
            }
        }
    });
})();

V.addKeyup('blur', {
    fns: {
        filter: function (c, s, keyStroke) {
            return keyStroke.isEscape();
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

            return true;
        }
    }
});

(function() {
    var addListener = function() {
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
    hideHelp = function() {
        var helpContainer = document.getElementById(CONSTANTS.HELP_VIEW.HTML_ID);
        if (helpContainer) {
            helpContainer.style.display = 'none';
        }
    },
    bindHelpCloseBtn = function() {
        var closeBtn = document.getElementById('vimlike:bookmarlet:closeBtn');

        if (closeBtn) {
            addListener(closeBtn, 'click', hideHelp);
        }
    }

    V.addKeypress('help', {
        pattern: {
            value: '?'
        },
        fns: {
            filter: filterByTarget,
            execute: function() {
                var doc = document,
                    HELP_VIEW = CONSTANTS.HELP_VIEW,
                    helpContainer = doc.getElementById(HELP_VIEW.HTML_ID);

                if (!helpContainer) { // 不存在
                    // 添加 style
                    DOM.addStyleSheet(HELP_VIEW.STYLE, {
                        id: HELP_VIEW.STYLE_ID
                    });

                    helpContainer = doc.createElement('div');
                    helpContainer.id = HELP_VIEW.HTML_ID;
                    helpContainer.innerHTML = HELP_VIEW.HTML;

                    document.body.appendChild(helpContainer);

                    // 绑定 close 函数
                    bindHelpCloseBtn();
                }

                // 调整位置
                var WIDTH  = HELP_VIEW.WIDTH,
                    left, top;
                left = (DOM.getViewWidth() - WIDTH) / 2;
                top  = DOM.getDocScrollTop() + 200;
                helpContainer.style.cssText = 'display:block;position:absolute;top:'+top+'px;left:'+left+'px;z-index:99999;width:'+WIDTH+'px;';

                return true;
            },
            clean: function() {
                hideHelp();
            }
        }
    });
    V.addKeyup('helpCleaner', {
        fns: {
            filter: function (c, s, keyStroke) {
                return keyStroke.isEscape();
            },
            execute: function() {
                hideHelp();
                return true;
            }
        }
    });
})();

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
