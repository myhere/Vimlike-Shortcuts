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
// logger.off();

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
        var doc = document;
        return Math.max(doc.documentElement.clientWidth, doc.body.clientWidth);
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
                    
                    logger.log('[V::init], add action: "' + ids[i] +'"');
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
        STYLE: ''+
'vim010container{display:block;position:absolute;left:-1000px;z-index:99999;transition:left .4s ease-in-out;-moz-transition:left .4s ease-in-out;-webkit-transition:left .4s ease-in-out;opacity:.85;filter:alpha(opacity=85);}' +
// firefox 下透明不能盖住 flash, 因此 firefox 下设置透明度为 1
'@-moz-document url-prefix() {vim010container {opacity:1.0}}' +
// iframe 来盖住 flash
'vim010container iframe{position:absolute;top:0;left:0;z-index:99999;width:100%;height:100%;border:none;}' +
'vim010wrapper{position:relative;z-index:99999;display:block;width:100%;height:100%;background-color:#333;overflow:hidden;}'+
'vim010main{display:block;margin:15px 20px 10px;background:transparent;color:#fff;font-family:arial,sans-serif;font-size:13px;}'+
'@-moz-document url-prefix() {vim010main{opacity:.85}}' +
'vim010hd{display:block;height:24px;font-weight:bold;}'+
'vim010hd-lt{float:left;font-size:16px;}'+
'vim010hd-rt{float:right;}'+
'vim010hd-lt vim010-btn{padding-left:10px;}' +
'vim010-btn{cursor:pointer;color:#dd0;text-decoration:underline;font-size:12px;font-weight:normal;}' +
'vim010bd{display:block;margin-top:2px;border-top:1px solid #999;width:100%;width:100%;padding-top:8px;overflow:hidden;zoom:1;}'+
'vim010bd-row-lt{float:left;width:40%;}'+
'vim010bd-row-rt{float:left;width:60%;-width:50%;}'+
'vim010row-hd{display:block;margin-bottom:5px;width:100%;text-align:center;color: #DD0;font-weight: bold;font-size:14px;}'+
'vim010colon{color:#fff;}'+
'vim010-col-lt, vim010-col-rt{float:left;height:20px;line-height:20px;}'+
'vim010-col-lt{width:35%;text-align:right;color:#DD0;font-family: "courier new",monospace;font-weight:bold;}'+
'vim010-col-rt{width:65%;text-align:left;text-indent:3px;font-family:arial,sans-serif;}'+
'vim010ft{display:block;margin-top:6px;border-top:1px solid #999;padding-top:8px;overflow:hidden;zoom:1;}'+
'vim010ft-lt{float:left;}'+
'vim010ft-lt a{font-size:12px;line-height:18px;color:#f60 !important;background:none !important;text-decoration:underline}' +
'vim010ft-rt{float:right;}',
        HTML: ''+
'<iframe frameborder="0""></iframe>'+
'<vim010wrapper>'+
    '<vim010main>'+
        '<vim010hd>'+
            '<vim010hd-lt>Vim-like Shortcut Help<vim010-btn id="vimlike:shortcuts:disableBtn"></vim010-btn></vim010hd-lt>'+
            '<vim010hd-rt><vim010-btn id="vimlike:shortcuts:closeBtn" title="click or press Enter to hide">close</vim010-btn></vim010hd-rt>'+
        '</vim010hd>'+
        '<vim010bd>'+
            '<vim010bd-row-lt>'+
                '<vim010row-hd>Supported</vim010row-hd>'+
                '<vim010-col-lt>j<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Scroll down</vim010-col-rt>'+
                '<vim010-col-lt>k<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Scroll up</vim010-col-rt>'+
                '<vim010-col-lt>gg<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Go to top</vim010-col-rt>'+
                '<vim010-col-lt>G<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Go to bottom</vim010-col-rt>'+
                '<vim010-col-lt>gi<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Focus input</vim010-col-rt>'+
                '<vim010-col-lt>f<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Open link</vim010-col-rt>'+
                '<vim010-col-lt>F<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Open link in new window</vim010-col-rt>'+
                '<vim010-col-lt>Esc<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Blur input</vim010-col-rt>'+
                '<vim010-col-lt>?<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt style="_margin-right:-6px;">Show this help</vim010-col-rt>'+
            '</vim010bd-row-lt>'+
            '<vim010bd-row-rt>'+
                '<vim010row-hd>Native</vim010row-hd>'+
                '<vim010-col-lt>Ctrl + f<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Search</vim010-col-rt>'+
                '<vim010-col-lt>Ctrl + r<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Refresh</vim010-col-rt>'+
                '<vim010-col-lt>Ctrl + w<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Close current window</vim010-col-rt>'+
                '<vim010-col-lt>Ctrl + l<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Open url in current window</vim010-col-rt>'+
                '<vim010-col-lt>Ctrl + h<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>View the history</vim010-col-rt>'+
                '<vim010-col-lt>Ctrl + Tab<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Switch to the next tab</vim010-col-rt>'+
                '<vim010-col-lt>Ctrl +Shift+Tab<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>Switch to the previous Tab</vim010-col-rt>'+
                '<vim010-col-lt>Alt + -><vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>History forward</vim010-col-rt>'+
                '<vim010-col-lt>Alt + <-<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt>History back</vim010-col-rt>'+
                '<vim010-col-lt>Alt + Home<vim010colon>:</vim010colon></vim010-col-lt><vim010-col-rt style="_margin-right:-6px;">Go to home page</vim010-col-rt>'+
            '</vim010bd-row-rt>'+
        '</vim010bd>'+
        '<vim010ft>'+
            '<vim010ft-lt><a href="mailto:myhere.2009@gmail.com">Feedback</a> | <a target="_blank" title="project hosting" href="https://github.com/myhere">GitHub</a> | <a href="http://twitter.com/#!/myhere_2009" target="_blank" title="follow me">Twitter</a></vim010ft-lt>'+
            '<vim010ft-rt>Version:1.0.0</vim010ft-rt>'+
        '</vim010ft>'+
    '</vim010main>'+
'</vim010wrapper>',
        WIDTH: 800
    }
};
var filterByTarget = function(c, s, keyStroke) {
    return keyStroke.isValidKeyStroke();
};

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
            logger.log('gotop');
            window.scrollTo(0, 0);
            return true;
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
                    inputEle.select();
                    inputEle = null;
                }, 20);
            }

            return true;
        }
    }
});

(function() {
    var tagContainer,
        findedLinkTagPair;

    function generateTag(len) {
        var keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
            z26s = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'],
            key_len = keys.length,
            dig_cnt = Number(len-1).toString(key_len).length;

        var tags = [],
            i = 0,
            j,
            k,
            idx,
            n26,
            tag;
        for (; i < len; ++i) {
            j = 0;
            tag = '';
            n26 = i.toString(key_len);
            while (k = n26.charAt(j++)) {
                idx = utils.indexOf(z26s, k);
                tag += keys[idx];
            }
            if (tag.length < dig_cnt) {
                tag = (new Array(dig_cnt - tag.length + 1)).join(keys[0]) + tag;
            }

            tags.push(tag);
        }

        return tags;
    }
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
        var findedLinkTagPair = [],
            tags = generateTag(links.length);

        utils.forEach(links, function(link, index) {
            var ins = document.createElement('ins');
            ins.className = 'vimlike-shortcuts-found-tag'; 
            var ele_pos = DOM.getElementPosition(link);
            var cssText = 'left:' + ele_pos.left + 'px;top:' + ele_pos.top + 'px;';
            ins.style.cssText = cssText;
            var tag = tags[index];
            ins.innerHTML = tag; 
            tagContainer.appendChild(ins);

            findedLinkTagPair.push([tag, link, ins]);
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
    function click(ele, new_tab) {
        var attr_target = ele.getAttribute('target');
        if (new_tab) {
            ele.setAttribute('target', '_blank');
        }
        fireClick(ele);
        if (new_tab) {
            setTimeout(function() {
                ele.setAttribute('target', attr_target);
                ele = null;
            }, 10);
        }
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
    function clear() {
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
            click(links[0][1], keyStrokes.charAt(0) === 'F');
            clear();
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
    V.addKeyup('clearFind', {
        fns: {
            filter: function (c, s, keyStroke) {
                return keyStroke.isEscape();
            },
            execute: function() {
                clear();
                // fix ie6/7 blur when hit escape
                window.focus();
                return true;
            }
        }
    });
})();


(function() {
function blurElements() {
    if (document.activeElement) {
        try {
            document.activeElement.blur();
        } catch(e) {}
    }
    blurFocus(document.getElementsByTagName('input'));
    blurFocus(document.getElementsByTagName('textarea'));
}
function blurFocus(eles) {
    for (var i = 0,len = eles.length; i < len; ++i) {
        try {
            eles[i].blur();
        } catch(e){}
    }
}

V.addKeyup('blur', {
    fns: {
        filter: function (c, s, keyStroke) {
            return keyStroke.isEscape();
        },
        execute: function(c, s, keyStroke) {
            blurElements();

            window.focus();
            return true;
        }
    }
});

})();

var helpController = (function() {
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
    html5shiv = function() {
        var ua = window.navigator.userAgent.toLowerCase(),
        matches = ua.match(/msie ([\w.]+)/);
        if (matches && matches[1] && parseInt(matches[1], 10) < 9) {
            logger.log('stupid ie, htmlshiv to fix custom tag!');
            var tag,
                tags = 'vim010container vim010wrapper vim010hd vim010main vim010hd-lt vim010-btn vim010hd-rt vim010bd vim010-row-rt vim010colon vim010bd-row-lt vim010bd-row-rt vim010-row-hd vim010-col-lt vim010-col-rt vim010row-hd vim010ft vim010ft-lt vim010ft-rt vim010ft-rt'.split(/\s+/);
            while (tag = tags.pop()) {
                document.createElement(tag);
            }
        }
    
    },
    hideHelp = function() {
        var helpContainer = document.getElementById(CONSTANTS.HELP_VIEW.HTML_ID);
        if (helpContainer) {
            // TODO: generate a value
            helpContainer.style.left = '-1000px';
        }
    },
    bindToggleBtn = function() {
        var btn = document.getElementById('vimlike:shortcuts:disableBtn');
        if (btn) {
            addListener(btn, 'click', function() {
                vimlikeStateMgr.toggle();
                hideHelp();
            });
        }
    },
    showToggleBtn = function() {
        var stateConf = {
            on: {
                title: 'disable keyboard shortcuts',
                text: 'disable shortcuts'
            },
            off: {
                title: 'enable keyboard shortcuts',
                text: 'enable shortcuts'
            }
        };
        vimlikeStateMgr.isOn() ?
            showBtn(stateConf.on) :
            showBtn(stateConf.off);

        function showBtn(conf) {
            var btn = document.getElementById('vimlike:shortcuts:disableBtn');
            btn.title = conf.title;
            btn.innerHTML = conf.text;
        }
    },
    bindHelpCloseBtn = function() {
        var closeBtn = document.getElementById('vimlike:shortcuts:closeBtn');

        if (closeBtn) {
            addListener(closeBtn, 'click', hideHelp);
        }
    },
    execute = function() {
        var doc = document,
            HELP_VIEW = CONSTANTS.HELP_VIEW,
            helpContainer = doc.getElementById(HELP_VIEW.HTML_ID);

        if (!helpContainer) { // 不存在
            // ie<9 htmlshiv fix custom tag
            html5shiv();

            // 添加 style
            DOM.addStyleSheet(HELP_VIEW.STYLE, {
                id: HELP_VIEW.STYLE_ID
            });

            helpContainer = doc.createElement('vim010container');
            helpContainer.id = HELP_VIEW.HTML_ID;
            // ie 下要把 元素 先放入 dom 中, 然后在设置 innerHTML 自定义的标签样式才生效
            document.body.appendChild(helpContainer);
            helpContainer.innerHTML = HELP_VIEW.HTML;
            // 绑定 disable 和 close
            bindToggleBtn();
            bindHelpCloseBtn();
        }

        // 调整位置
        var WIDTH  = HELP_VIEW.WIDTH,
            left, top;
        left = (DOM.getViewWidth() - WIDTH) / 2;
        top  = DOM.getDocScrollTop() + 200;
        helpContainer.style.cssText = 'top:'+top+'px;left:'+left+'px;width:'+WIDTH+'px;z-index:99999;';

        // 根据当前状态显示
        showToggleBtn();

        return true;
    };

    V.addKeypress('help', {
        pattern: {
            value: '?'
        },
        fns: {
            filter: filterByTarget,
            execute: execute,
            clear: hideHelp
        }
    });
    V.addKeyup('clearHelp', {
        fns: {
            filter: function (c, s, keyStroke) {
                return keyStroke.isEscape();
            },
            execute: function(c,s, keyStroke) {
                hideHelp();
                window.focus();
                return true;
            }
        }
    });

    return {
        show: execute,
        hide: hideHelp
    };
})();



var vimlikeStateMgr = (function() {
    var vimlike_binded = false;

    return {
        isOn: function() {
            return vimlike_binded;
        },
        setOn: function() {
            vimlike_binded = true;
            S.bindEvents(['keypress', 'keyup']);
        },
        setOff: function() {
            vimlike_binded = false;
            S.unBindEvents(['keypress', 'keyup']);
        },
        toggle: function() {
            vimlike_binded ? 
                vimlikeStateMgr.setOff() :
                vimlikeStateMgr.setOn();
        }
    }
})();
function extractAPI() {
    S.toggleVimlike = vimlikeStateMgr.toggle;
    S.isVimlikeOn   = vimlikeStateMgr.isOn;
    S.showVimlikeHelp = helpController.show;
    S.hideVimlikeHelp = helpController.hide;
}
 
function init() {
    V.init();
    vimlikeStateMgr.setOn();
    extractAPI()
}

init();
})(this.shortcuts);
