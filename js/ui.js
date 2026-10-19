/* ------------------------------------------------------------------
   ui.js - scroll progress, reveal on scroll, counting facts and the
   sliding tab indicator. Nothing here is required to read the page:
   if it does not run, the page renders exactly as site.css styles it.
------------------------------------------------------------------ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('js');

  /* ---------- scroll progress ---------- */

  function progressBar() {
    var bar = document.createElement('div');
    bar.className = 'progress';
    var fill = document.createElement('i');
    bar.appendChild(fill);
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- reveal on scroll ---------- */

  var observer = null;

  function revealSetup() {
    if (reduce || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        observer.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  }

  var REVEAL = [
    '.block > .wrap > h2',
    '.block > .wrap > .hint',
    '.narrow > p',
    '.narrow > .sub-h',
    '.narrow > .footnotes',
    '.fw',
    '.paper',
    '.band',
    '.field-grid',
    '.board-controls'
  ].join(',');

  function revealScan(root) {
    if (!observer) return;
    var nodes = (root || document).querySelectorAll(REVEAL);
    [].forEach.call(nodes, function (n, i) {
      if (n.dataset.rv) return;
      n.dataset.rv = '1';
      n.classList.add('rv');
      n.style.transitionDelay = Math.min(i, 6) * 45 + 'ms';
      observer.observe(n);
    });
    var map = (root || document).querySelector('.map');
    if (map && !map.dataset.rv) {
      map.dataset.rv = '1';
      var mo = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          [].forEach.call(e.target.querySelectorAll('.dot'), function (d, i) {
            d.style.animationDelay = i * 55 + 'ms';
          });
          e.target.classList.add('in');
          mo.disconnect();
        });
      }, { threshold: 0.2 });
      mo.observe(map);
    }
  }

  /* ---------- counting facts ---------- */

  function countUp() {
    var nums = document.querySelectorAll('.facts-row b');
    if (!nums.length) return;
    if (reduce || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var raw = e.target.textContent.trim();
        var m = raw.match(/^(\d+)(\D*)$/);
        if (!m) return;
        var target = parseInt(m[1], 10);
        var suffix = m[2];
        var dur = 750;
        var t0 = performance.now();
        e.target.textContent = '0' + suffix;
        (function step(now) {
          var p = Math.min(1, (now - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          e.target.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });

    [].forEach.call(nums, function (n) { io.observe(n); });
  }

  /* ---------- sliding tab indicator ---------- */

  function tabInk() {
    var row = document.querySelector('.tabbar-row');
    if (!row) return;
    var ink = document.createElement('span');
    ink.className = 'tab-ink';
    ink.setAttribute('aria-hidden', 'true');
    row.appendChild(ink);

    function place() {
      var on = row.querySelector('[aria-selected="true"]');
      if (!on) return;
      ink.style.width = on.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }

    place();
    window.addEventListener('resize', place);
    row.addEventListener('scroll', place, { passive: true });

    var mo = new MutationObserver(function () {
      place();
      revealScan(document.querySelector('[role="tabpanel"]:not([hidden])'));
    });
    [].forEach.call(row.querySelectorAll('[role="tab"]'), function (t) {
      mo.observe(t, { attributes: true, attributeFilter: ['aria-selected'] });
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }

  /* ---------- feedback ---------- */

  function feedback() {
    var open = document.getElementById('fb-open');
    var panel = document.getElementById('fb-panel');
    var form = document.getElementById('fb-form');
    var cancel = document.getElementById('fb-cancel');
    if (!open || !panel || !form) return;

    function show(on) {
      panel.hidden = !on;
      open.setAttribute('aria-expanded', String(on));
      if (on) document.getElementById('fb-text').focus();
      else open.focus();
    }

    open.addEventListener('click', function () { show(panel.hidden); });
    cancel.addEventListener('click', function () { show(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) show(false);
    });

    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || open.contains(e.target)) return;
      show(false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('fb-text').value.trim();
      if (!note) return;
      var from = document.getElementById('fb-from').value.trim();
      var body = note + (from ? '\n\n Reply to: ' + from : '');
      window.location.href = 'mailto:gbiyani@stanford.edu'
        + '?subject=' + encodeURIComponent('Feedback on Flexible AI Data Centers')
        + '&body=' + encodeURIComponent(body);
      show(false);
      form.reset();
    });
  }

  /* ---------- go ---------- */

  progressBar();
  revealSetup();
  countUp();
  feedback();

  function afterRender() {
    tabInk();
    revealScan(document.querySelector('[role="tabpanel"]:not([hidden])'));
    revealScan(document.querySelector('.top'));
  }

  // app.js sets window.__ready once the JSON has rendered.
  var tries = 0;
  (function waitForApp() {
    if (window.__ready || tries > 60) { afterRender(); return; }
    tries++;
    setTimeout(waitForApp, 50);
  })();
}());
