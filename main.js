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

  // Projects conveyor: pause button (hover and keyboard focus also pause it)
  var conveyor = document.querySelector('.conveyor');
  var cToggle = document.querySelector('.conveyor-toggle');
  if (conveyor && cToggle) {
    cToggle.addEventListener('click', function () {
      var paused = !conveyor.classList.contains('is-paused');
      conveyor.classList.toggle('is-paused', paused);
      cToggle.setAttribute('aria-pressed', String(paused));
      cToggle.textContent = paused ? 'Play' : 'Pause';
    });
  }
})();
