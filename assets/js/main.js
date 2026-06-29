/* Green Seal - site behaviors */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer:fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* always open at the top (don't restore previous scroll), but respect #anchors */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  addEventListener('pageshow', function () { if (!location.hash) scrollTo(0, 0); });

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

  /* native scrolling — the smooth-scroll wheel hijack was removed: it fought the browser's
     native scroll (scrollTo every frame) and was the main cause of the "heavy" feel.
     Native scrolling is smooth and light. */

  /* custom cursor (fine pointers, motion-OK): dot tracks instantly via transform (GPU, no
     layout writes); ring trails with a rAF that sleeps once settled — no perpetual idle loop. */
  if (fine && !reduced) {
    var cdot = $('#dot'), cring = $('#ring');
    if (cdot && cring) {
      var cmx = innerWidth / 2, cmy = innerHeight / 2, crx = cmx, cry = cmy, craf = 0;
      var cTick = function () {
        crx += (cmx - crx) * 0.2; cry += (cmy - cry) * 0.2;
        var dx = cmx - crx, dy = cmy - cry;
        if (dx * dx + dy * dy < 0.05) { crx = cmx; cry = cmy; craf = 0; }
        cring.style.transform = 'translate(' + crx + 'px,' + cry + 'px)';
        if (craf) craf = requestAnimationFrame(cTick);
      };
      addEventListener('mousemove', function (e) {
        cmx = e.clientX; cmy = e.clientY;
        cdot.style.transform = 'translate(' + cmx + 'px,' + cmy + 'px)';
        if (!document.body.classList.contains('cursor-on')) document.body.classList.add('cursor-on');
        if (!craf) craf = requestAnimationFrame(cTick);
      }, { passive: true });
      var cSel = 'a,button,input,textarea,select,summary,label,.dict li,.more,.px-bar,.sld-arrow,.tr-dot';
      addEventListener('mouseover', function (e) { if (e.target.closest && e.target.closest(cSel)) cring.classList.add('big'); }, { passive: true });
      addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest(cSel)) cring.classList.remove('big'); }, { passive: true });
      document.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-on'); });
      document.addEventListener('mouseenter', function () { document.body.classList.add('cursor-on'); });
    }
  }

  /* ---------- smooth scroll (Lenis): flowing motion, off for reduced-motion, one-line kill-switch ---------- */
  var SMOOTH = true;   // ← set to false to turn smooth scrolling off entirely
  var lenis = (SMOOTH && !reduced && window.Lenis)
    ? (function () { try { return new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 }); } catch (e) { return null; } })()
    : null;
  document.documentElement.classList.toggle('has-smooth', !!lenis);
  var heroFrame = null;   // assigned by the cinema hero below; driven here every frame while smooth scroll is on
  function rafLoop(t) { if (lenis) lenis.raf(t); if (heroFrame) heroFrame(); requestAnimationFrame(rafLoop); }
  if (lenis) requestAnimationFrame(rafLoop);

  /* ---------- header + progress (scroll-driven, no idle rAF) ---------- */
  var hd = $('header.site');
  var cinema = $('#cinema');
  var bar = $('#bar');
  var heroEl = cinema || $('.phero.has-img');
  var heroH = heroEl ? heroEl.offsetHeight : 0;
  addEventListener('resize', function () { heroH = heroEl ? heroEl.offsetHeight : 0; }, { passive: true });
  var chromeTick = false;
  function chrome() {
    chromeTick = false;
    var h = document.documentElement, y = h.scrollTop;
    if (bar) bar.style.width = (y / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%';
    if (hd) {
      hd.classList.toggle('scrolled', y > 40);
      if (heroEl) hd.classList.toggle('onhero', y < heroH - innerHeight * (cinema ? 0.5 : 0.15) - (cinema ? 0 : heroH * 0.35));
      else hd.classList.remove('onhero');
    }
  }
  addEventListener('scroll', function () { if (!chromeTick) { chromeTick = true; requestAnimationFrame(chrome); } }, { passive: true });
  chrome();

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
    if (!reduced) {
      /* scroll-LINKED hero (no spring/hysteresis) → follows the scroll 1:1, so it never "jumps".
         Lenis smooths the scroll value, so the motion stays continuous and buttery.
         Driven by rafLoop when smooth scroll is on, else by a native-scroll fallback below. */
      var lastHeroY = -1;
      heroFrame = function () {
        if (scrollY === lastHeroY) return; lastHeroY = scrollY;
        var total = cinema.offsetHeight - innerHeight;
        var s = total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0;
        if (outImg) {
          outImg.style.transform = 'scale(' + (1 + s * 0.34) + ')';
          outImg.style.opacity = String(1 - Math.min(1, Math.max(0, (s - 0.45) / 0.4)));
        }
        if (inPh) inPh.style.opacity = String(Math.min(1, Math.max(0, (s - 0.3) / 0.4)));
        if (inImg) inImg.style.transform = 'scale(' + (1.2 - s * 0.2) + ')';
        if (phaseA) {
          phaseA.style.opacity = String(1 - Math.min(1, Math.max(0, (s - 0.1) / 0.16)));
          phaseA.style.transform = 'translateY(' + (s * -36) + 'px)';
          phaseA.style.pointerEvents = s > 0.25 ? 'none' : 'auto';
        }
        if (heroAndersen) heroAndersen.style.opacity = String(1 - Math.min(1, Math.max(0, (s - 0.06) / 0.16)));
        if (phaseB) phaseB.style.opacity = String(Math.min(1, Math.max(0, (s - 0.72) / 0.26)));
        if (veil2) veil2.style.opacity = String(s * 0.22);
      };
      if (!lenis) {   /* no smooth scroll → drive the hero on native scroll (rAF-throttled) */
        var hTick = false;
        addEventListener('scroll', function () { if (!hTick) { hTick = true; requestAnimationFrame(function () { hTick = false; heroFrame(); }); } }, { passive: true });
      }
      heroFrame();
    }
  }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  $$('[data-io]').forEach(function (el) { io.observe(el); });

  /* ---------- gentle parallax in strips (scroll-driven; batched reads then writes) ---------- */
  var pars = $$('[data-par]');
  if (pars.length && !reduced) {
    var parEls = pars.map(function (el) { return { el: el, host: el.closest('.strip, .phero') }; }).filter(function (o) { return o.host; });
    var parTick = false;
    var parRun = function () {
      parTick = false;
      var vh = innerHeight;
      var reads = parEls.map(function (o) { return { el: o.el, r: o.host.getBoundingClientRect() }; }); // all reads first
      reads.forEach(function (o) {                                                                       // then all writes
        if (o.r.bottom < 0 || o.r.top > vh) return;
        var t = (o.r.top + o.r.height / 2 - vh / 2) / vh;
        o.el.style.transform = 'translateY(' + (t * -10) + '%)';
      });
    };
    addEventListener('scroll', function () { if (!parTick) { parTick = true; requestAnimationFrame(parRun); } }, { passive: true });
    addEventListener('resize', function () { if (!parTick) { parTick = true; requestAnimationFrame(parRun); } }, { passive: true });
    parRun();
  }

  /* ---------- shared slider controls: injected arrows + swipe (RTL-aware) ---------- */
  function addArrows(box, ariaPrev, ariaNext, onPrev, onNext) {
    var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    var mk = function (cls, aria, svg) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sld-arrow ' + cls;
      b.setAttribute('aria-label', aria); b.innerHTML = svg;
      return b;
    };
    var prev = mk('prev', ariaPrev, CHEV_R); // points right = previous (RTL)
    var next = mk('next', ariaNext, CHEV_L); // points left  = next/forward (RTL)
    prev.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); onPrev(); });
    next.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); onNext(); });
    box.appendChild(prev); box.appendChild(next);
  }
  function addSwipe(box, onPrev, onNext, opts) {
    opts = opts || {};
    box.style.touchAction = 'pan-y';
    var x0 = 0, y0 = 0, on = false;
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; on = true;
      if (opts.onStart) opts.onStart();
    });
    var end = function (e) {
      if (!on) return; on = false;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        // swallow the click that may follow the swipe (e.g. on a link inside the slide)
        var sup = function (ev) { ev.preventDefault(); ev.stopPropagation(); box.removeEventListener('click', sup, true); };
        box.addEventListener('click', sup, true);
        setTimeout(function () { box.removeEventListener('click', sup, true); }, 400);
        if (dx < 0) onNext(); else onPrev(); // RTL: swipe left = forward
      } else if (opts.onEnd) { opts.onEnd(); }
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', function () { if (on) { on = false; if (opts.onEnd) opts.onEnd(); } });
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
    var pgo = function (n) { show(n, true); if (!reduced) play(); };
    bars.forEach(function (b, j) { b.addEventListener('click', function () { pgo(j); }); });
    var frame = $('.px-frame', px) || px;
    addArrows(frame, 'הכתבה הקודמת', 'הכתבה הבאה', function () { pgo(idx - 1); }, function () { pgo(idx + 1); });
    addSwipe(px, function () { pgo(idx - 1); }, function () { pgo(idx + 1); }, { onStart: stop, onEnd: function () { if (!reduced) play(); } });
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
    var openedFrom = null;
    var openLb = function (i) {
      openedFrom = document.activeElement;
      cur = ((i % items.length) + items.length) % items.length;
      var a = items[cur];
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.dataset.cap || '';
      lbCap.textContent = a.dataset.cap || '';
      lbCount.textContent = (cur + 1) + ' / ' + items.length;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      var x = $('.lbx', lb); if (x) x.focus();
    };
    var closeLb = function () { lb.classList.remove('open'); document.body.style.overflow = ''; if (openedFrom && openedFrom.focus) openedFrom.focus(); };
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
      else if (e.key === 'ArrowLeft') openLb(cur + 1);
      else if (e.key === 'ArrowRight') openLb(cur - 1);
      else if (e.key === 'Tab') {
        var f = $$('.lbx, .lbn, .lbp', lb).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
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
          if (window.gtag) { try { gtag('event', 'generate_lead', { form_id: form.id || form.getAttribute('data-lead') || 'lead' }); } catch (e) {} }
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
    var go = function (n) { show(n); play(); };
    addArrows(rot, 'ההמלצה הקודמת', 'ההמלצה הבאה', function () { go(i - 1); }, function () { go(i + 1); });
    addSwipe(rot, function () { go(i - 1); }, function () { go(i + 1); }, { onStart: stop, onEnd: play });
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
        if (k === 'reset') { state = {}; h.style.removeProperty('--a11y-zoom'); }
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
