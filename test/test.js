(function(S) {
var logger = S.logger;
logger.on();

var filterByTarget = function(c, s, keyStroke) {
    return keyStroke.isValidKeyStroke();
};

S.addActions(
    [
        {
            type:'keypress',
            pattern: {
                value: 'zhang'
            },
            fns: {
                filter: filterByTarget,
                execute: function(c, s, keyStroke) {
                    if (s === 'zhang') {
                        var div_ele = document.createElement('div');
                        div_ele.innerHTML = 'zhang';
                        div_ele.style.cssText = 'height:200px;width:200px;background-color:green;';
                        div_ele.id='sc:test:zhang';
                        document.body.appendChild(div_ele);
                        return true;
                    }
                },
                clear: function() {
                    var e1 = document.getElementById('sc:test:zhang');
                    if (e1) {
                        document.body.removeChild(e1);
                    }
                }
            }
        },
        {
            type:'keypress',
            pattern: {
                value: 'zhanglin'
            },
            fns: {
                filter: filterByTarget,
                execute: function(c, s, keyStroke) {
                    if (s === 'zhanglin') {
                        var div_ele = document.createElement('div');
                        div_ele.innerHTML = 'zhanglin1';
                        div_ele.style.cssText = 'height:200px;width:200px;background-color:blue;';
                        div_ele.id='sc:test:zhanglin1';
                        document.body.appendChild(div_ele);
                        return true;
                    }
                },
                clear: function() {
                    var e1 = document.getElementById('sc:test:zhanglin1');
                    if (e1) {
                        document.body.removeChild(e1);
                    }
               }
            }
        },
        {
            type:'keypress',
            pattern: {
                value: 'zhanglin'
            },
            fns: {
                filter: filterByTarget,
                execute: function(c, s, keyStroke) {
                    if (s === 'zhanglin') {
                        var div_ele = document.createElement('div');
                        div_ele.innerHTML = 'zhanglin2';
                        div_ele.style.cssText = 'height:200px;width:200px;background-color:yellow;';
                        div_ele.id='sc:test:zhanglin2';
                        document.body.appendChild(div_ele);
                        return true;
                    }
                },
                clear: function() {
                    var e1 = document.getElementById('sc:test:zhanglin2');
                    if (e1) {
                        document.body.removeChild(e1);
                    }
               }
            }
        },
        {
            type: 'keyup',
            fns: {
                filter: function(c, s, keyStroke) {
                    return keyStroke.isEscape();
                },
                execute: function() {
                    //var e1 = document.getElementById('sc:test:zhang'),
                    var e2 = document.getElementById('sc:test:zhanglin1'),
                        e3 = document.getElementById('sc:test:zhanglin2');

                    try {
                        // document.body.removeChild(e1);
                        document.body.removeChild(e2);
                        document.body.removeChild(e3);
                    } catch(e) {}

                    return true;
                }
            }
        }
    ]
);

S.bindEvents(['keypress', 'keyup']);
// S.bindEvents(['keypress']);

})(this.shortcuts);
