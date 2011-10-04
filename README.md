Vimlike-Shortcuts - Power webpage with shortcuts
=============================================================

What's this?  
------------

Vimlike-Shortcuts gives you vimlike shortcuts when surfing on the Internet.
With this script you can browser the web without using your mouse(sounds cool...).

How to use?  
----------- 

You should load this script `http://myhere.github.com/Vimlike-Shortcuts/build/vimlike-shortcuts.js` before using these shortcuts!

* scroll down webpage using `j`
* scroll top using `k`
* ...
* view help using `?`(fyi: `Shift + /`)

### if you are a website administrator

Simply add the code below to your websites' footer or header, you can also add a toggle button if you like.

    <script src="http://myhere.github.com/Vimlike-Shortcuts/build/vimlike-shortcuts.js" charset="utf-8"></script>

or

    <script> 
        !!v ? v.toggleVimlike() : (function(d, s) {
                s = document.createElement('script');
                s.charset = 'utf-8';
                s.src = 'http://myhere.github.com/Vimlike-Shortcuts/build/vimlike-shortcuts.js';
                d.getElementsByTagName('head')[0].appendChild(s);
            })(document);
        })(window.shortcuts);
    </script>

### if you don't like move your hands from mouse to keyboard frequently

Just click this [link](http://myhere.github.com/Vimlike-Shortcuts/demos/index.html) and drag the
button to your browser's  `bookmarks bar`, and just click the button on your
`bookmarks bar` when browsering webpages and you got it!

More infomation please visit the [wiki](https://github.com/myhere/Vimlike-Shortcuts/wiki/vimlike-shortcuts.js.manual)

Feedback
--------

If you have problem while using it or just wanna give advice, please feel
free to email me(`vimlike.shortcuts#gmail.com`).
