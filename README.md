Vimlike-Shortcuts - Power your webpage with shortcuts
=============================================================

What's this?  
------------

Vimlike-Shortcuts powers you vimlike keyboard shortcuts when suffering the
Internet.  With this script you can browser the web without using your
mouse(sounds cool...).


How to use?  
----------- 

You should load this script `http://up-coming.com/vimlike-shorcuts.js` before using these shortcuts!

* scroll down webpage by hitting a `j`
* scroll top by hitting a `k`
* ...
* view help by hitting `?`(fyi: `Shift + /`)

### if you are a website administrator

Simply add the code below to your websites' footer or header, you can also add a toggle button if you like.

    <script src="http://up-coming.com/vimlike-shorcuts.js" charset="utf-8"></script>

or

    <script> 
        !!v ? v.toggleVimlike() : (function(d, s) {
                s = document.createElement('script');
                s.charset = 'utf-8';
                s.src = 'http://up-coming.com/vimlike-shorcuts.js';
                d.getElementsByTagName('head')[0].appendChild(s);
            })(document);
        })(window.shortcuts);
    </script>

### else if you like move your hands from mouse to keyboard frequently

Just click this [link](http://up-coming.com/user-manual.html) and drag the
button to your browser's  `bookmarks bar`, and just click the button on your
`bookmarks bar` when suffering the internet  and you got it!

More infomation please visit the [wiki](http://up-coming.com/wiki.html)

Feedback
--------

If you have problem while using it or just wanna give advice, please feel
free to email me(`vimlike.shortcuts#gmail.com`).
