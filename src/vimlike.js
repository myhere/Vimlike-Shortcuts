(function(S) {
 
function init() {
    S.addActions({
        type: 'keypress',
        keyStrokes: '^zh?a?n?g?l?i?n?$',
        fns: {
            execute: function() {
                if (this.keyStrokes == 'zhanglin') {
                    alert('hello, you just hit my name: "zhanglin"! sorry for this alert');

                    return true;
                }
            }
        }
    });
    S.bindEvents('keypress');
}

init();
})(this.shortcuts);
