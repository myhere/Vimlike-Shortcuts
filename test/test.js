(function(S) {
var logger = S.logger;
logger.on();

var filterByTarget = function(currentKeyStroke, allKeyStrokes, keyStroke) {
    return keyStroke.isValidKeyStroke();
};

S.addActions(
    [
        {
            type:'keypress',
            pattern: {
                value: 'hello'
            },
            fns: {
                filter: filterByTarget,
                execute: function(currentKeyStroke, allKeyStrokes, keyStroke) {
                    var div_ele = document.createElement('div');
                    div_ele.innerHTML = allKeyStrokes;
                    div_ele.style.cssText = 'height:200px;width:200px;background-color:green;';
                    div_ele.id='sc:test:id1';
                    document.body.appendChild(div_ele);
                    return true;
                },
                clear: function(currentKeyStroke, allKeyStrokes, keyStroke) {
                    var e1 = document.getElementById('sc:test:id1');
                    if (e1) {
                        document.body.removeChild(e1);
                    }
                }
            }
        },
        {
            type:'keypress',
            pattern: {
                isRegExp: true,
                value: '^h(?:o)?w?$'
            },
            fns: {
                filter: filterByTarget,
                execute: function(currentKeyStroke, allKeyStrokes, keyStroke) {
                    if (currentKeyStroke === 'w') {
                        var div_ele = document.createElement('div');
                        div_ele.innerHTML = 'You just Hit:' + allKeyStrokes;
                        div_ele.style.cssText = 'height:200px;width:200px;background-color:blue;';
                        div_ele.id='sc:test:id2';
                        document.body.appendChild(div_ele);
                        return true;
                    }
                },
                clear: function(currentKeyStroke, allKeyStrokes, keyStroke) {
                    var e1 = document.getElementById('sc:test:id2');
                    if (e1) {
                        document.body.removeChild(e1);
                    }
               }
            }
        },
        {
            type: 'keyup',
            fns: {
                filter: function(currentKeyStroke, allKeyStrokes, keyStroke) {
                    return keyStroke.isEscape();
                },
                execute: function(currentKeyStroke, allKeyStrokes, keyStroke) {
                    var e1 = document.getElementById('sc:test:id1'),
                        e2 = document.getElementById('sc:test:id2');

                    try {
                        document.body.removeChild(e1);
                        document.body.removeChild(e2);
                    } catch(e) {}

                    return true;
                }
            }
        }
    ]
);

S.bindEvents(['keypress', 'keyup']);

})(this.shortcuts);
