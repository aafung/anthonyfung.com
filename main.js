(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Hero entrance: runs once, on the next frame after load
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-loaded'); });
  });

  // Footer year
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  // Header hairline once the page scrolls
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  var toggleLabel = toggle.querySelector('.menu-toggle-label');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', function (mq) {
    if (mq.matches) setMenu(false);
  });

  // Mark the section in view in the nav (Home counts too)
  var links = Array.prototype.slice.call(document.querySelectorAll('.brand, .site-nav a[href^="#"]'));
  if ('IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach(function (s) { spy.observe(s); });
  }

  // Logo: draws itself when Research is well on screen (scrolling there, or
  // each time the Research link is used) and again on hover.
  // Reduced motion shows the finished mark and never animates.
  var logo = document.querySelector('.logo-video');
  if (logo) {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      logo.poster = 'media/logo-final.png';
      logo.preload = 'none';
    } else {
      var armed = true;
      var inView = false;
      var drawLogo = function () {
        armed = false;
        logo.currentTime = 0;
        logo.play().catch(function () { logo.poster = 'media/logo-final.png'; });
      };
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && armed) drawLogo();
      }, { rootMargin: '-8% 0px -20% 0px', threshold: 1 }).observe(logo);

      document.querySelectorAll('a[href="#research"]').forEach(function (a) {
        a.addEventListener('click', function () {
          armed = true;
          // Already there: replay now. Otherwise it plays when the scroll arrives.
          if (inView) drawLogo();
        });
      });
      logo.closest('.logo-draw').addEventListener('mouseenter', function () {
        if (logo.paused || logo.ended) drawLogo();
      });
    }
  }

  // Raman: scroll position picks the frame (down advances, up reverses).
  // Neighboring frames are blended, so the motion is continuous between frames.
  var canvas = document.querySelector('.raman-canvas');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var grid = document.querySelector('.research-grid');
    var visual = document.querySelector('.research-visual');
    var FRAMES = 53;
    var frames = [];
    var ticking = false;
    var lastKey = '';

    function progress() {
      var vh = window.innerHeight;
      var r;
      if (getComputedStyle(visual).position === 'sticky') {
        // Desktop: from when the frame is mostly on screen until it unpins
        r = grid.getBoundingClientRect();
        var pinTop = parseFloat(getComputedStyle(visual).top) || 0;
        var start = vh * 0.6;
        var end = pinTop + visual.offsetHeight - r.height;
        return (start - r.top) / Math.max(1, start - end);
      }
      // Phone: while the frame crosses the screen
      r = visual.getBoundingClientRect();
      return (vh * 0.9 - r.top) / Math.max(1, vh * 0.6 + r.height * 0.4);
    }
    function loaded(i) { return frames[i] && frames[i].complete && frames[i].naturalWidth; }
    function draw() {
      ticking = false;
      var x = Math.min(1, Math.max(0, progress())) * (FRAMES - 1);
      var i = Math.floor(x);
      var f = x - i;
      while (i > 0 && !loaded(i)) { i--; f = 0; }   // still loading: nearest earlier frame
      if (!loaded(i)) return;
      var key = i + ':' + f.toFixed(3);
      if (key === lastKey) return;
      lastKey = key;
      ctx.globalAlpha = 1;
      ctx.drawImage(frames[i], 0, 0);
      if (f > 0.001 && loaded(i + 1)) {
        ctx.globalAlpha = f;
        ctx.drawImage(frames[i + 1], 0, 0);
      }
      canvas.classList.add('is-ready');
    }
    function requestDraw() {
      if (!ticking) { ticking = true; requestAnimationFrame(draw); }
    }
    function start() {
      window.addEventListener('scroll', requestDraw, { passive: true });
      window.addEventListener('resize', requestDraw);
      // Load frames in order, four at a time, redrawing as they arrive
      var next = 0;
      function pump() {
        if (next >= FRAMES) return;
        var n = next++;
        var img = new Image();
        img.decoding = 'async';
        img.onload = img.onerror = function () { lastKey = ''; requestDraw(); pump(); };
        img.src = 'media/raman/f' + (n < 10 ? '0' : '') + n + '.webp';
        frames[n] = img;
      }
      for (var k = 0; k < 4; k++) pump();
    }
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        near.disconnect();
        start();
      }, { rootMargin: '800px 0px' });
      near.observe(canvas);
    } else {
      start();
    }
  }

  // Projects conveyor: drifts on its own, and can be swiped, dragged,
  // scrolled with a trackpad or stepped with the arrow buttons.
  // Hovering, focusing or touching it pauses the drift; it resumes shortly after.
  var conveyor = document.querySelector('.conveyor');
  var cToggle = document.querySelector('.conveyor-toggle');
  if (conveyor && cToggle && !reduceMotion.matches) {
    var SPEED = 46;                       // px per second
    var firstTrack = conveyor.querySelector('.conveyor-track');
    var copy = conveyor.querySelectorAll('.conveyor-track')[1].cloneNode(true);
    conveyor.appendChild(copy);           // three copies, so there is always room both ways
    conveyor.classList.add('is-scroller');

    var period = 0;                       // width of one copy
    var pos = 0;                          // float scroll position
    var userPaused = false, hovering = false, focused = false;
    var holdUntil = 0;                    // drift waits until this time after manual input
    var tween = null;
    var lastT = 0;

    function measure() {
      period = firstTrack.getBoundingClientRect().width;
      if (!pos) pos = period;
      wrap();
    }
    function wrap() {
      if (!period) return;
      if (pos < period * 0.5) { pos += period; if (tween) { tween.from += period; tween.to += period; } }
      else if (pos >= period * 1.5) { pos -= period; if (tween) { tween.from -= period; tween.to -= period; } }
    }
    function apply() { conveyor.scrollLeft = pos; }
    function hold(ms) { holdUntil = performance.now() + ms; }

    function frame(t) {
      var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
      lastT = t;
      if (tween) {
        var k = Math.min(1, (t - tween.t0) / 450);
        var e = 1 - Math.pow(1 - k, 3);
        pos = tween.from + (tween.to - tween.from) * e;
        if (k === 1) { tween = null; hold(2500); }
        wrap(); apply();
      } else if (!dragging && !userPaused && !hovering && !focused && t > holdUntil) {
        pos += SPEED * dt;
        wrap(); apply();
      }
      requestAnimationFrame(frame);
    }

    // Native scrolling (touch swipe, trackpad): follow it and keep it looping
    conveyor.addEventListener('scroll', function () {
      if (Math.abs(conveyor.scrollLeft - pos) > 2) {
        pos = conveyor.scrollLeft;
        hold(2500);
        var before = pos;
        wrap();
        if (pos !== before) apply();
      }
    }, { passive: true });
    conveyor.addEventListener('touchstart', function () { hold(4000); }, { passive: true });

    // Mouse drag
    var dragging = false, dragX = 0, dragPos = 0, moved = false;
    conveyor.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = false; tween = null;
      dragX = e.clientX; dragPos = pos;
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragX;
      if (!moved && Math.abs(dx) > 5) { moved = true; conveyor.classList.add('is-dragging'); }
      if (moved) {
        pos = dragPos - dx;
        var before = pos; wrap(); dragPos += pos - before;
        apply();
      }
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      hold(2500);
      // Let the click that ends a drag fall through without opening a link
      setTimeout(function () { conveyor.classList.remove('is-dragging'); }, 0);
    });
    conveyor.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    }, true);
    conveyor.addEventListener('dragstart', function (e) { e.preventDefault(); });

    conveyor.addEventListener('mouseenter', function () { hovering = true; });
    conveyor.addEventListener('mouseleave', function () { hovering = false; hold(600); });
    conveyor.addEventListener('focusin', function () { focused = true; });
    conveyor.addEventListener('focusout', function () { focused = false; });

    // Arrow buttons step about two-thirds of the visible width
    document.querySelectorAll('.conveyor-step').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = Number(b.getAttribute('data-dir'));
        var from = tween ? tween.to : pos;
        tween = { from: pos, to: from + dir * conveyor.clientWidth * 0.66, t0: performance.now() };
      });
    });

    cToggle.addEventListener('click', function () {
      userPaused = !userPaused;
      cToggle.setAttribute('aria-pressed', String(userPaused));
      cToggle.textContent = userPaused ? 'Play' : 'Pause';
    });

    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    measure(); apply();
    requestAnimationFrame(frame);
  }
})();
