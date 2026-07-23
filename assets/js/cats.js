/* ============================================================
   cats.js  —  make it rain cats

   Click "press here" in the bio and a shower of cats spins down
   the page. Uses the real photos listed in CAT_IMAGES; if a file
   is missing it quietly falls back to a cat emoji, so the effect
   never breaks.

   Photos are transparent PNG cut-outs (no background), dropped in
   assets/img/cats/ as cat1.png … cat4.png.
   ============================================================ */

(function () {
  'use strict';

  var CAT_IMAGES = [
    'assets/img/cats/cat1.png',
    'assets/img/cats/cat2.png',
    'assets/img/cats/cat3.png',
    'assets/img/cats/cat4.png'
  ];

  var EMOJI = ['🐱', '😺', '😸', '😻', '😹', '😼', '🐈'];

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var layer = null, cats = [], raf = null;

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement('div');
    layer.className = 'cat-rain';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }

  function fallbackEmoji(el, size) {
    el.textContent = EMOJI[(Math.random() * EMOJI.length) | 0];
    el.style.fontSize = size + 'px';
  }

  function spawn(n) {
    ensureLayer();
    var W = window.innerWidth, H = window.innerHeight;
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'cat';

      if (CAT_IMAGES.length) {
        var size = 60 + Math.random() * 70;          // photos read better a bit larger
        var img = document.createElement('img');
        img.alt = '';
        img.style.height = size + 'px';               // width auto → keep each cat's shape
        img.onerror = (function (elem, s) {
          return function () { fallbackEmoji(elem, s); };   // file missing → emoji
        })(el, size * 0.75);
        img.src = CAT_IMAGES[(Math.random() * CAT_IMAGES.length) | 0];
        el.appendChild(img);
      } else {
        var esize = 34 + Math.random() * 36;
        fallbackEmoji(el, esize);
        size = esize;
      }
      layer.appendChild(el);

      cats.push({
        el: el,
        x: Math.random() * W,
        y: -size - Math.random() * H,                 // staggered above the top → rains over time
        vy: (reduce ? 2 : 2.8) + Math.random() * 3.4,
        vx: (Math.random() - 0.5) * 1.6,
        a: Math.random() * 360,
        va: (Math.random() - 0.5) * (reduce ? 3 : 8), // spin speed
        sway: Math.random() * Math.PI * 2
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    var H = window.innerHeight;
    for (var i = cats.length - 1; i >= 0; i--) {
      var c = cats[i];
      c.sway += 0.03;
      c.y += c.vy;
      c.x += c.vx + Math.sin(c.sway) * 0.6;
      c.a += c.va;
      c.el.style.transform =
        'translate(' + c.x + 'px,' + c.y + 'px) rotate(' + c.a + 'deg)';
      if (c.y > H + 160) {
        c.el.remove();
        cats.splice(i, 1);
      }
    }
    raf = cats.length ? requestAnimationFrame(tick) : null;
  }

  function rain() { spawn(reduce ? 8 : 18); }

  var triggers = document.querySelectorAll('[data-cats]');
  Array.prototype.forEach.call(triggers, function (t) {
    t.addEventListener('click', function (e) { e.preventDefault(); rain(); });
  });
})();
