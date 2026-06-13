/* Green Seal - site behaviors */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer:fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ---------- preloader (once per session) ---------- */
  var pre = $('#pre');
  if (pre) {
    var seen = false;
    try { seen = sessionStorage.getItem('gs-pre') === '1'; } catch (e) {}
    if (reduced || seen) {
      pre.classList.add('gone');
      document.body.classList.add('go');
    } else {
      try { sessionStorage.setItem('gs-pre', '1'); } catch (e) {}
      setTimeout(function () { pre.classList.add('done'); }, 2700);
      setTimeout(function () { pre.classList.add('gone'); document.body.classList.add('go'); }, 3450);
    }
  } else {
    document.body.classList.add('go');
  }

  /* ---------- smooth inertial wheel scrolling ---------- */
  if (fine && !reduced) {
    var sCur = scrollY, sTgt = scrollY, wheeling = false, wheelT = 0;
    addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      if (document.body.classList.contains('menu-open')) return;
      var lb = $('#lb'); if (lb && lb.classList.contains('open')) return;
      e.preventDefault();
      var max = document.documentElement.scrollHeight - innerHeight;
      sTgt = Math.max(0, Math.min(max, sTgt + e.deltaY));
      wheeling = true; wheelT = performance.now();
    }, { passive: false });
    (function smooth() {
      if (wheeling) {
        sCur += (sTgt - sCur) * 0.085;
        if (Math.abs(sTgt - sCur) < 0.4) { sCur = sTgt; if (performance.now() - wheelT > 300) wheeling = false; }
        scrollTo(0, sCur);
      } else { sCur = sTgt = scrollY; }
      requestAnimationFrame(smooth);
    })();
  }

  /* ---------- custom cursor ---------- */
  if (fine) {
    var dot = $('#dot'), ring = $('#ring');
    if (dot && ring) {
      var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
      addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
      (function follow() { rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(follow); })();
      $$('[data-hover]').forEach(function (el) {
        el.addEventListener('mouseenter', function () { ring.classList.add('big'); });
        el.addEventListener('mouseleave', function () { ring.classList.remove('big'); });
      });
    }
  }

  /* ---------- header + progress ---------- */
  var hd = $('header.site');
  var cinema = $('#cinema');
  var bar = $('#bar');
  (function chrome() {
    var h = document.documentElement;
    if (bar) bar.style.width = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%';
    if (hd) {
      hd.classList.toggle('scrolled', scrollY > 40);
      var heroEl = cinema || $('.phero.has-img');
      if (heroEl) hd.classList.toggle('onhero', scrollY < heroEl.offsetHeight - innerHeight * (cinema ? 0.5 : 0.15) - (cinema ? 0 : heroEl.offsetHeight * 0.35));
      else hd.classList.remove('onhero');
    }
    requestAnimationFrame(chrome);
  })();

  /* ---------- mobile menu ---------- */
  var mbtn = $('.menu-btn');
  if (mbtn) {
    mbtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('.mnav a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); document.body.style.overflow = ''; });
    });
  }

  /* ---------- cinema hero (home) ---------- */
  if (cinema) {
    var outImg = $('.cinema .outside img'), inPh = $('.cinema .inside'), inImg = inPh ? inPh.querySelector('img') : null;
    var phaseA = $('#phaseA'), phaseB = $('#phaseB'), veil2 = $('#veil2'), heroAndersen = $('#heroAndersen');
    var target = 0, state = 0;

    /* place the Andersen label on the pergola beam regardless of viewport aspect (object-fit:cover math) */
    var stick = $('.cinema .stick');
    var IMG_RATIO = 800 / 533;   // MAIN.jpg aspect (w/h)
    var BEAM_FRAC = 0.355;       // beam center as a fraction of the image height
    var BEAM_RIGHT_FRAC = 0.14;  // text right-edge as a fraction of image width, in from the right (desktop only)
    function placeBeam() {
      if (!heroAndersen || !stick) return;
      var W = stick.clientWidth, H = stick.clientHeight;
      var coverByWidth = (W / H > IMG_RATIO);
      var dispH = coverByWidth ? (W / IMG_RATIO) : H;
      var dispW = coverByWidth ? W : (H * IMG_RATIO);
      heroAndersen.style.top = ((H - dispH) / 2 + BEAM_FRAC * dispH) + 'px';
      if (W >= 761) heroAndersen.style.right = ((W - dispW) / 2 + BEAM_RIGHT_FRAC * dispW) + 'px';
      else heroAndersen.style.right = '';   // mobile keeps the CSS value (looks great)
    }
    placeBeam();
    addEventListener('resize', placeBeam);
    addEventListener('load', placeBeam);
    (function heroLoop() {
      var total = cinema.offsetHeight - innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0;
      if (p > 0.08) target = 1; else if (p < 0.03) target = 0;
      state += (target - state) * 0.05;
      if (Math.abs(target - state) < 0.0005) state = target;
      if (!reduced) {
        if (outImg) {
          outImg.style.transform = 'scale(' + (1 + state * 0.34) + ')';
          outImg.style.opacity = String(1 - Math.min(1, Math.max(0, (state - 0.45) / 0.4)));
        }
        if (inPh) inPh.style.opacity = String(Math.min(1, Math.max(0, (state - 0.3) / 0.4)));
        if (inImg) inImg.style.transform = 'scale(' + (1.2 - state * 0.2) + ')';
        if (phaseA) {
          phaseA.style.opacity = String(1 - Math.min(1, Math.max(0, (state - 0.1) / 0.16)));
          phaseA.style.transform = 'translateY(' + (state * -36) + 'px)';
          phaseA.style.pointerEvents = state > 0.25 ? 'none' : 'auto';
        }
        if (heroAndersen) heroAndersen.style.opacity = String(1 - Math.min(1, Math.max(0, (state - 0.06) / 0.16)));
        if (phaseB) phaseB.style.opacity = String(Math.min(1, Math.max(0, (state - 0.72) / 0.26)));
        if (veil2) veil2.style.opacity = String(state * 0.22);
      }
      requestAnimationFrame(heroLoop);
    })();
  }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  $$('[data-io]').forEach(function (el) { io.observe(el); });

  /* ---------- gentle parallax in strips ---------- */
  var pars = $$('[data-par]');
  if (pars.length && !reduced) {
    (function par() {
      var vh = innerHeight;
      pars.forEach(function (el) {
        var host = el.closest('.strip'); if (!host) return;
        var r = host.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var t = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = 'translateY(' + (t * -6) + '%)';
      });
      requestAnimationFrame(par);
    })();
  }

  /* ---------- press showcase carousel ---------- */
  var px = $('#pressx');
  if (px) {
    var slides = $$('.px-o', px), pics = $$('.px-frame .ph2 img', px), bars = $$('.px-bar', px), count = $('#pxCount');
    var idx = 0, timer = null;
    var show = function (n, animate) {
      idx = ((n % slides.length) + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('on', j === idx); });
      pics.forEach(function (p, j) { p.classList.toggle('show', j === idx); });
      bars.forEach(function (b, j) {
        b.classList.remove('run', 'full');
        var i = b.querySelector('i'); void i.offsetWidth;
        if (j < idx) b.classList.add('full');
        else if (j === idx) b.classList.add(animate ? 'run' : 'full');
      });
      if (count) count.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0') + ' · כתבות ארציות';
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var play = function () { stop(); timer = setInterval(function () { show(idx + 1, true); }, 4200); show(idx, true); };
    bars.forEach(function (b, j) { b.addEventListener('click', function () { show(j, true); play(); }); });
    if (reduced) { show(0, false); bars.forEach(function (b) { b.classList.add('full'); }); }
    else {
      px.addEventListener('mouseenter', stop);
      px.addEventListener('mouseleave', play);
      var started = false;
      var begin = function () { if (started) return; started = true; play(); };
      if ('IntersectionObserver' in window) {
        var pio = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { begin(); pio.unobserve(px); } });
        }, { threshold: 0.1 });
        pio.observe(px);
      }
      /* safety net: never stay stuck on the first slide even if the observer never fires */
      setTimeout(begin, 3000);
    }
  }

  /* ---------- 3D window + dictionary ---------- */
  var win = $('#win3d');
  if (win) {
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { setTimeout(function () { win.classList.add('open'); }, 350); wio.unobserve(win); } });
    }, { threshold: 0.45 });
    wio.observe(win);
    var dlis = $$('#dictList li');
    var dimgs = $$('.glass img', win);
    var dcap = $('#dictCap');
    dlis.forEach(function (li) {
      var on = function () {
        dlis.forEach(function (x) { x.classList.remove('on'); });
        li.classList.add('on');
        var i = +li.dataset.img;
        dimgs.forEach(function (im, j) { im.classList.toggle('show', i === j); });
        if (dcap && li.dataset.cap) dcap.textContent = li.dataset.cap;
      };
      li.addEventListener('mouseenter', on);
      li.addEventListener('click', on);
      li.addEventListener('focus', on);
    });
  }

  /* ---------- count-up ---------- */
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, end = +el.dataset.count, plain = el.dataset.plain, t0 = performance.now(), dur = 1400;
      var step = function (t) {
        var k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = plain ? String(v) : v.toLocaleString('he');
        if (k < 1) requestAnimationFrame(step);
      };
      if (reduced) el.textContent = plain ? String(end) : end.toLocaleString('he');
      else requestAnimationFrame(step);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---------- project filters ---------- */
  var filters = $('.filters');
  if (filters) {
    $$('.filters button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.filters button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        var f = b.dataset.f;
        $$('.cards .card-p').forEach(function (c) {
          c.style.display = (f === 'all' || (c.dataset.tags || '').indexOf(f) !== -1) ? '' : 'none';
        });
      });
    });
  }

  /* ---------- lightbox ---------- */
  var lb = $('#lb');
  if (lb) {
    var items = $$('.gal a');
    var lbImg = $('#lb img'), lbCap = $('.lbcap', lb), lbCount = $('.lbcount', lb);
    var cur = 0;
    var openLb = function (i) {
      cur = ((i % items.length) + items.length) % items.length;
      var a = items[cur];
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.dataset.cap || '';
      lbCap.textContent = a.dataset.cap || '';
      lbCount.textContent = (cur + 1) + ' / ' + items.length;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    var closeLb = function () { lb.classList.remove('open'); document.body.style.overflow = ''; };
    items.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); openLb(i); });
    });
    $('.lbx', lb).addEventListener('click', closeLb);
    $('.lbn', lb).addEventListener('click', function () { openLb(cur + 1); });
    $('.lbp', lb).addEventListener('click', function () { openLb(cur - 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') openLb(cur + 1);
      if (e.key === 'ArrowRight') openLb(cur - 1);
    });
  }

  /* ---------- lead forms (FormSubmit AJAX) ---------- */
  $$('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var err = $('.f-err', form);
      if (err) err.style.display = 'none';
      var btn = $('button[type="submit"]', form);
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'שולחים...'; }
      var data = new FormData(form);
      fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          if (j && String(j.success) === 'false') throw new Error('not delivered');
          form.classList.add('sent');
        })
        .catch(function () {
          if (err) err.style.display = 'block';
          if (btn) { btn.disabled = false; btn.textContent = orig; }
        });
    });
  });

  /* ---------- testimonial rotators (#37) ---------- */
  $$('[data-rotator]').forEach(function (rot) {
    var items = $$('.tr-item', rot), dots = $$('.tr-dot', rot);
    if (items.length < 2) { dots.forEach(function (d) { d.style.display = 'none'; }); return; }
    var i = 0, timer = null;
    var show = function (n) {
      i = ((n % items.length) + items.length) % items.length;
      items.forEach(function (it, j) { it.classList.toggle('on', j === i); });
      dots.forEach(function (d, j) { d.classList.toggle('on', j === i); if (j === i) d.setAttribute('aria-selected', 'true'); else d.removeAttribute('aria-selected'); });
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var play = function () { if (reduced) return; stop(); timer = setInterval(function () { show(i + 1); }, 5000); };
    dots.forEach(function (d, j) { d.addEventListener('click', function () { show(j); play(); }); });
    rot.addEventListener('mouseenter', stop);
    rot.addEventListener('mouseleave', play);
    var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else stop(); }); }, { threshold: 0.25 });
    rio.observe(rot);
  });

  /* ---------- accessibility widget (#26) ---------- */
  (function () {
    var btn = $('#a11yBtn'), panel = $('#a11yPanel');
    if (!btn || !panel) return;
    var h = document.documentElement;
    var TOGGLES = ['contrast', 'negative', 'gray', 'light', 'links', 'readfont'];
    var ZOOMS = [0.9, 1, 1.15, 1.3, 1.5];
    var state = {};
    try { state = JSON.parse(localStorage.getItem('gs-a11y') || '{}'); } catch (e) { state = {}; }
    function save() { try { localStorage.setItem('gs-a11y', JSON.stringify(state)); } catch (e) {} }
    function apply() {
      TOGGLES.forEach(function (k) { h.classList.toggle('a11y-' + k, !!state[k]); });
      if (state.zoom && state.zoom !== '1') h.style.setProperty('--a11y-zoom', state.zoom); else h.style.removeProperty('--a11y-zoom');
      // sync button states
      $$('[data-a11y]', panel).forEach(function (b) {
        var k = b.dataset.a11y;
        if (TOGGLES.indexOf(k) !== -1) b.classList.toggle('on', !!state[k]);
      });
      var fz = $('[data-a11y="font-up"]', panel);
      if (fz) { var z = parseFloat(state.zoom || '1'); fz.classList.toggle('on', z > 1); var fd = $('[data-a11y="font-down"]', panel); if (fd) fd.classList.toggle('on', z < 1); }
    }
    function setZoom(dir) {
      var z = parseFloat(state.zoom || '1');
      var idx = ZOOMS.indexOf(z); if (idx === -1) idx = 1;
      idx = Math.max(0, Math.min(ZOOMS.length - 1, idx + dir));
      state.zoom = String(ZOOMS[idx]);
    }
    $$('[data-a11y]', panel).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.a11y;
        if (k === 'reset') { state = {}; h.removeAttribute('style'); }
        else if (k === 'font-up') setZoom(1);
        else if (k === 'font-down') setZoom(-1);
        else {
          if (k === 'negative' && !state[k]) state.contrast = false;
          if (k === 'contrast' && !state[k]) state.negative = false;
          state[k] = !state[k];
        }
        apply(); save();
      });
    });
    var open = false;
    function toggle(o) { open = o; panel.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    btn.addEventListener('click', function () { toggle(!open); });
    document.addEventListener('click', function (e) { if (open && !panel.contains(e.target) && !btn.contains(e.target)) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { toggle(false); btn.focus(); } });
    apply();
  })();
})();
