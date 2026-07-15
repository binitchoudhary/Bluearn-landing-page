/* ==========================================================================
   BluEarn — Interactions
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* rAF-throttle: caps a handler to once per animation frame (perf + smooth 60fps) */
  function rafThrottle(fn) {
    var ticking = false;
    var lastArgs = null;
    return function () {
      lastArgs = arguments;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          fn.apply(null, lastArgs);
          ticking = false;
        });
      }
    };
  }

  /* debounce: waits for a pause in events before firing (used for resize) */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  /* Attaches the magnetic mouse-follow effect to one element. Used both for
     the bulk pass over .magnetic buttons at load and for buttons created
     later inside dynamically-rendered content (e.g. the product showcase).
     Idempotent — the product showcase's first panel gets attached once when
     its cache entry is built, then the bulk pass below runs over the same
     DOM; the dataset flag stops it from being wired up twice. */
  function attachMagnetic(btn) {
    if (reduceMotion || !window.matchMedia('(min-width: 1025px)').matches) return;
    if (btn.dataset.magneticReady) return;
    btn.dataset.magneticReady = 'true';
    btn.addEventListener('mousemove', rafThrottle(function (e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = 'translate3d(' + x * 0.25 + 'px, ' + y * 0.35 + 'px, 0)';
    }), { passive: true });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'translate3d(0, 0, 0)';
    });
  }

  /* ---------------- Preloader ---------------- */
  window.addEventListener('load', function () {
    var preloader = document.getElementById('preloader');
    if (preloader) {
      setTimeout(function () { preloader.classList.add('is-hidden'); }, 300);
    }
    initRevealObserver();
    initCounters();
  });

  /* ---------------- Scroll progress + navbar state + back-to-top ---------------- */
  var scrollProgress = document.getElementById('scrollProgress');
  var navbar = document.getElementById('navbar');
  var backToTop = document.getElementById('backToTop');

  function onScroll() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    if (scrollProgress) scrollProgress.style.width = progress + '%';

    if (navbar) navbar.classList.toggle('is-scrolled', window.scrollY > 40);
    if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 700);
  }
  document.addEventListener('scroll', rafThrottle(onScroll), { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------- Mobile nav toggle ---------------- */
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = navMenu.classList.toggle('is-open');
      navToggle.classList.toggle('is-active', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('is-open');
        navToggle.classList.remove('is-active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Scroll reveal (IntersectionObserver) ---------------- */
  function initRevealObserver() {
    var targets = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          setTimeout(function () { el.classList.add('is-visible'); }, (i % 6) * 90);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------- Animated counters ---------------- */
  function initCounters() {
    var counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    function animateCounter(el) {
      var target = parseFloat(el.getAttribute('data-target')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1800;
      var start = null;

      function step(timestamp) {
        if (!start) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.floor(eased * target);
        el.textContent = value + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target + suffix;
        }
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window) || reduceMotion) {
      counters.forEach(animateCounter);
      return;
    }
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* Feature carousel: clone the cards from the hidden grid template (single
     source of truth in HTML) into the swiper wrapper, stripping reveal
     classes since they were never observed by the IntersectionObserver on
     these clones. */
  (function cloneFeatureCards() {
    var grid = document.querySelector('.feature-grid__grid');
    var wrapper = document.querySelector('.feature-swiper .swiper-wrapper');
    if (!grid || !wrapper) return;
    grid.querySelectorAll('.feature-node').forEach(function (node) {
      var clone = node.cloneNode(true);
      clone.classList.remove('reveal-up', 'is-visible');
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.appendChild(clone);
      wrapper.appendChild(slide);
    });
  })();

  /* ---------------- Swiper: Hero ---------------- */
  if (window.Swiper) {
    new Swiper('.hero-swiper', {
      loop: true,
      speed: 900,
      autoplay: reduceMotion ? false : { delay: 6500, disableOnInteraction: false },
      effect: 'fade',
      fadeEffect: { crossFade: true },
      keyboard: { enabled: true },
      pagination: { el: '.hero__pagination', clickable: true },
      navigation: { prevEl: '.hero__arrow--prev', nextEl: '.hero__arrow--next' }
    });

    /* Swiper: Real use cases (reels/shorts carousel) */
    new Swiper('.reels-swiper', {
      loop: true,
      speed: 700,
      spaceBetween: 18,
      slidesPerView: 2.2,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 3400, disableOnInteraction: false, pauseOnMouseEnter: true },
      breakpoints: {
        480: { slidesPerView: 2.6 },
        768: { slidesPerView: 3.4 },
        1024: { slidesPerView: 4.4 },
        1280: { slidesPerView: 5.2 }
      }
    });

    /* Swiper: Testimonials */
    new Swiper('.testimonials-swiper', {
      loop: true,
      speed: 700,
      spaceBetween: 24,
      slidesPerView: 1,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 5200, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: { el: '.testimonials-pagination', clickable: true },
      breakpoints: {
        768: { slidesPerView: 2 },
        1200: { slidesPerView: 3 }
      }
    });

    /* Swiper: Who We Serve — continuous free-drag ticker (loop + touch + momentum) */
    new Swiper('.serve-swiper', {
      loop: true,
      freeMode: { enabled: true, momentum: true },
      slidesPerView: 'auto',
      spaceBetween: 20,
      speed: 5000,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 1, disableOnInteraction: false, pauseOnMouseEnter: true }
    });

    /* Swiper: Feature grid — continuous free-drag ticker, all breakpoints */
    new Swiper('.feature-swiper', {
      loop: true,
      freeMode: { enabled: true, momentum: true },
      slidesPerView: 'auto',
      spaceBetween: 16,
      speed: 4500,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 1, disableOnInteraction: false, pauseOnMouseEnter: true }
    });

    /* Swiper: Channel Manager logos — continuous free-drag ticker */
    new Swiper('.logo-swiper', {
      loop: true,
      freeMode: { enabled: true, momentum: true },
      slidesPerView: 'auto',
      spaceBetween: 16,
      speed: 4000,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 1, disableOnInteraction: false, pauseOnMouseEnter: true }
    });
  }

  /* ---------------- Hero mouse parallax on float cards ---------------- */
  var heroSection = document.querySelector('.hero');
  var floatCards = document.querySelectorAll('.hero-slide__floats .float-card');

  if (heroSection && floatCards.length && !reduceMotion && window.matchMedia('(min-width: 1025px)').matches) {
    heroSection.addEventListener('mousemove', rafThrottle(function (e) {
      var rect = heroSection.getBoundingClientRect();
      var relX = (e.clientX - rect.left) / rect.width - 0.5;
      var relY = (e.clientY - rect.top) / rect.height - 0.5;

      floatCards.forEach(function (card) {
        var depth = parseFloat(card.getAttribute('data-depth')) || 1;
        var moveX = relX * 22 * depth;
        var moveY = relY * 22 * depth;
        card.style.transform = 'translate3d(' + moveX + 'px, ' + moveY + 'px, 0)';
      });
    }), { passive: true });
  }

  /* ---------------- GSAP parallax for background blobs ---------------- */
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.hero .blob').forEach(function (blob, i) {
      gsap.to(blob, {
        y: i % 2 === 0 ? 120 : -120,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
      });
    });
  }

  /* ---------------- Why BluEarn: drag-to-compare slider ---------------- */
  (function initCompareSlider() {
    var slider = document.getElementById('compareSlider');
    if (!slider) return;
    var newPanel = slider.querySelector('.compare-slider__panel--new');
    var handle = slider.querySelector('.compare-slider__handle');
    var dragging = false;

    function setPosition(clientX) {
      var rect = slider.getBoundingClientRect();
      var pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      newPanel.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }

    function pointerX(e) {
      return e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    }

    function onDown(e) {
      dragging = true;
      slider.classList.add('is-dragging');
      setPosition(pointerX(e));
    }
    var onMove = rafThrottle(function (e) {
      if (!dragging) return;
      setPosition(pointerX(e));
    });
    function onUp() {
      dragging = false;
      slider.classList.remove('is-dragging');
    }

    slider.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    slider.addEventListener('touchstart', onDown, { passive: true });
    slider.addEventListener('touchmove', onMove, { passive: true });
    slider.addEventListener('touchend', onUp);

    handle.addEventListener('keydown', function (e) {
      var current = parseFloat(handle.style.left) || 50;
      if (e.key === 'ArrowLeft') { setPosition(slider.getBoundingClientRect().left + slider.getBoundingClientRect().width * (Math.max(0, current - 5) / 100)); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPosition(slider.getBoundingClientRect().left + slider.getBoundingClientRect().width * (Math.min(100, current + 5) / 100)); e.preventDefault(); }
    });
  })();

  /* ---------------- Product Suite: interactive showcase ----------------
     Single source of truth: add/remove/reorder products by editing this
     array only — nav pills, the mobile dropdown and the content panel are
     all generated from it, so nothing about the product count is hardcoded
     in the HTML or in the render logic below. */
  var PRODUCTS = [
    {
      icon: 'fa-hotel', accent: 'cyan', name: 'All-in-One PMS',
      description: 'Reservations, housekeeping, front desk and billing — unified in a single command center.',
      highlights: [
        { icon: 'fa-bed', title: 'Live Room Status', text: "Every room's state updates the moment housekeeping finishes." },
        { icon: 'fa-calendar-check', title: 'Unified Reservations', text: 'Bookings from every channel land in one calendar.' },
        { icon: 'fa-file-invoice-dollar', title: 'Instant Billing', text: 'Folios and invoices generated automatically at checkout.' },
        { icon: 'fa-arrows-rotate', title: 'Real-Time Sync', text: 'Front desk, housekeeping and finance always see the same data.' }
      ],
      ctaPrimary: { label: 'Explore PMS', href: '#contact' },
      ctaSecondary: { label: 'Watch Demo', href: '#showcase' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>Front Desk</em></div>' +
        '<div class="room-grid room-grid--mock" style="grid-template-columns:repeat(6,1fr)">' +
        '<span class="room-tile is-occupied"></span><span class="room-tile is-occupied"></span><span class="room-tile is-cleaning"></span><span class="room-tile is-vacant"></span><span class="room-tile is-occupied"></span><span class="room-tile is-vacant"></span>' +
        '<span class="room-tile is-vacant"></span><span class="room-tile is-occupied"></span><span class="room-tile is-occupied"></span><span class="room-tile is-cleaning"></span><span class="room-tile is-occupied"></span><span class="room-tile is-vacant"></span>' +
        '</div><span class="mock-tag">18/24 Rooms Occupied</span></div>' +
        '<div class="float-card pv-float pv-float--a"><div class="float-card__head">Occupancy <span class="live-dot"></span></div><div class="occ-ring"><svg viewBox="0 0 36 36"><path class="occ-ring__bg" d="M18 2a16 16 0 0 1 0 32 16 16 0 0 1 0-32"/><path class="occ-ring__fg" d="M18 2a16 16 0 0 1 0 32 16 16 0 0 1 0-32"/></svg><span>92%</span></div></div>' +
        '<div class="float-card pv-float pv-float--b"><div class="float-card__head">Reservation</div><p class="reservation-line"><strong>Priya Sharma</strong><span>Room 214 · 2 Nights</span></p><div class="reservation-status"><i class="fa-solid fa-circle-check"></i> Confirmed</div></div>'
    },
    {
      icon: 'fa-brain', accent: 'violet', name: 'AI Pricing',
      description: 'Demand-aware rate recommendations powered by real-time market and booking-pace signals.',
      highlights: [
        { icon: 'fa-chart-line', title: 'Live Demand Signals', text: 'Rates react to occupancy, pace and events as they happen.' },
        { icon: 'fa-earth-asia', title: 'Market-Aware', text: 'Competitor pricing and local events shape every suggestion.' },
        { icon: 'fa-bolt', title: 'One-Click Apply', text: 'Accept AI suggestions instantly or fine-tune before publishing.' },
        { icon: 'fa-shield-halved', title: 'Guardrails Built In', text: 'Never publishes a rate outside the floors and ceilings you set.' }
      ],
      ctaPrimary: { label: 'Get Pricing Strategy', href: '#contact' },
      ctaSecondary: { label: 'Explore Rules Engine', href: '#' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>AI Pricing</em></div>' +
        '<svg viewBox="0 0 220 90" class="mini-chart mini-chart--mock"><polyline points="0,70 25,58 50,64 75,40 100,46 125,20 150,28 175,10 200,16 220,4"/><circle cx="175" cy="10" r="5"/></svg>' +
        '<span class="mock-tag">₹8,400 recommended · +12%</span></div>' +
        '<div class="float-card pv-float pv-float--a"><div class="float-card__head">Demand Forecast</div><div class="bar-chart"><span style="--h:35%"></span><span style="--h:52%"></span><span style="--h:44%"></span><span style="--h:70%"></span><span style="--h:90%"></span></div></div>' +
        '<div class="float-card pv-float pv-float--b pv-stat"><i class="fa-solid fa-wand-magic-sparkles"></i><div><strong>+18%</strong><span>Faster than manual pricing</span></div></div>'
    },
    {
      icon: 'fa-gauge-high', accent: 'blue', name: 'Revenue Optimization',
      description: 'Turn occupancy, ADR and RevPAR data into daily, actionable revenue decisions.',
      highlights: [
        { icon: 'fa-chart-simple', title: 'RevPAR Tracking', text: 'See exactly where revenue is being won or lost, daily.' },
        { icon: 'fa-arrow-trend-up', title: 'ADR Benchmarking', text: 'Compare your average rate against your own targets.' },
        { icon: 'fa-lightbulb', title: 'Actionable Insights', text: 'Clear next-best-actions, not just raw numbers.' },
        { icon: 'fa-calendar-days', title: 'Forecast Ahead', text: 'See demand shifts weeks before they hit your calendar.' }
      ],
      ctaPrimary: { label: 'Explore Revenue', href: '#contact' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>Revenue</em></div>' +
        '<div class="mock-stat-pair"><div><span>RevPAR</span><strong>₹6,240</strong><em class="up">+23.4%</em></div><div><span>ADR</span><strong>₹8,410</strong><em class="up">+11.2%</em></div></div></div>' +
        '<div class="float-card pv-float pv-float--a"><div class="float-card__head">7-Day Trend</div><div class="bar-chart"><span style="--h:40%"></span><span style="--h:55%"></span><span style="--h:48%"></span><span style="--h:65%"></span><span style="--h:80%"></span><span style="--h:60%"></span><span style="--h:92%"></span></div></div>' +
        '<div class="float-card pv-float pv-float--b pv-stat"><i class="fa-solid fa-arrow-trend-up"></i><div><strong>+₹2.3L</strong><span>Extra revenue this month</span></div></div>'
    },
    {
      icon: 'fa-sliders', accent: 'gold', name: 'Rule Based Pricing',
      description: 'Set your own guardrails — floors, ceilings and events — while AI handles the heavy lifting.',
      highlights: [
        { icon: 'fa-lock', title: 'Rate Floors & Ceilings', text: 'AI never prices outside the bounds you define.' },
        { icon: 'fa-calendar-days', title: 'Event Overrides', text: 'Festivals and local events trigger your custom rules first.' },
        { icon: 'fa-code-branch', title: 'Conditional Logic', text: "Rules like ‘if occupancy > 80%, raise rate by X%.’" },
        { icon: 'fa-clock-rotate-left', title: 'Full Audit Trail', text: 'Every automated change is logged and reversible.' }
      ],
      ctaPrimary: { label: 'Explore Rules Engine', href: '#contact' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>Rules Engine</em></div>' +
        '<div class="mock-range"><span class="mock-range__label">Floor ₹4,200</span><div class="mock-range__track"><div class="mock-range__fill"></div><div class="mock-range__handle"></div></div><span class="mock-range__label">Ceiling ₹9,800</span></div>' +
        '<div class="pv-flow"><i class="fa-solid fa-calendar-days"></i><span></span><i class="fa-solid fa-arrow-right"></i><span></span><i class="fa-solid fa-tags"></i></div></div>' +
        '<div class="float-card pv-float pv-float--a pv-stat"><i class="fa-solid fa-shield-halved"></i><div><strong>16+</strong><span>Guardrails available</span></div></div>' +
        '<div class="float-card pv-float pv-float--b"><div class="float-card__head">Event Override</div><p class="reservation-line"><strong>Diwali Weekend</strong><span>Rate floor raised +30%</span></p></div>'
    },
    {
      icon: 'fa-robot', accent: 'green', name: 'BlueButler AI',
      description: 'Automated guest messaging across WhatsApp and email — from booking to checkout.',
      highlights: [
        { icon: 'fa-brands fa-whatsapp', title: 'WhatsApp Native', text: 'Guests message the way they already communicate.' },
        { icon: 'fa-clock', title: '24/7 Response', text: 'No guest request waits for business hours again.' },
        { icon: 'fa-language', title: 'Multilingual', text: "Replies fluently in your guests' own language." },
        { icon: 'fa-door-open', title: 'Full Journey Coverage', text: 'From booking confirmation to post-checkout follow-up.' }
      ],
      ctaPrimary: { label: 'Talk To Our Team', href: '#contact' },
      ctaSecondary: { label: 'See It In Action', href: '#use-cases' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>BlueButler AI</em></div>' +
        '<p class="chat-bubble chat-bubble--in chat-bubble--mock">Can I get a late checkout?</p>' +
        '<p class="chat-bubble chat-bubble--out chat-bubble--mock">Approved until 2 PM ✓</p>' +
        '<p class="chat-bubble chat-bubble--in chat-bubble--mock">Perfect, thank you!</p></div>' +
        '<div class="float-card pv-float pv-float--a"><div class="float-card__head"><i class="fa-brands fa-whatsapp"></i> Active <span class="live-dot"></span></div></div>' +
        '<div class="float-card pv-float pv-float--b"><div class="float-card__head">Voice Assistant</div><div class="voice-wave"><span></span><span></span><span></span><span></span><span></span></div></div>'
    },
    {
      icon: 'fa-users-gear', accent: 'violet', name: 'Staff Management',
      description: 'Auto-assigned tasks, shift schedules and real-time performance tracking for your team.',
      highlights: [
        { icon: 'fa-list-check', title: 'Auto-Assigned Tasks', text: 'The moment a room is booked, the right task is created.' },
        { icon: 'fa-calendar-week', title: 'Smart Scheduling', text: 'Shifts built around real occupancy, not guesswork.' },
        { icon: 'fa-medal', title: 'Performance Tracking', text: "See who's completing tasks fastest, in real time." },
        { icon: 'fa-bell', title: 'Instant Alerts', text: 'Delays and overdue tasks surface before guests notice.' }
      ],
      ctaPrimary: { label: 'Explore Staff Tools', href: '#contact' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>Staff Tasks</em></div>' +
        '<ul class="mock-tasks"><li><i class="fa-solid fa-square-check"></i> Room 214 — Housekeeping</li><li><i class="fa-solid fa-square-check"></i> Room 118 — Maintenance</li><li><i class="fa-regular fa-square"></i> Room 402 — Turndown</li></ul></div>' +
        '<div class="float-card pv-float pv-float--a"><div class="float-card__head">Today\'s Team</div><div class="pv-avatars"><div class="avatar">AR</div><div class="avatar">RK</div><div class="avatar">SM</div></div></div>' +
        '<div class="float-card pv-float pv-float--b pv-stat"><i class="fa-solid fa-medal"></i><div><strong>98%</strong><span>Tasks completed on time</span></div></div>'
    },
    {
      icon: 'fa-id-badge', accent: 'cyan', name: 'HR Management',
      description: 'Payroll, attendance and staff records built for the realities of hotel operations.',
      highlights: [
        { icon: 'fa-fingerprint', title: 'Attendance Tracking', text: 'Clock-ins tied directly to shift schedules.' },
        { icon: 'fa-money-check-dollar', title: 'Automated Payroll', text: 'Payroll calculated from actual hours, every cycle.' },
        { icon: 'fa-address-card', title: 'Digital Staff Records', text: 'Contracts, IDs and documents, always accessible.' },
        { icon: 'fa-chart-pie', title: 'Workforce Insights', text: 'Understand staffing costs across every property.' }
      ],
      ctaPrimary: { label: 'Explore HR Suite', href: '#contact' },
      visual: '<div class="pv-centerpiece">' +
        '<div class="product-mock__bar"><span></span><span></span><span></span><em>HR Suite</em></div>' +
        '<ul class="mock-table"><li><span>Anita R.</span><em class="mock-badge mock-badge--in">On Duty</em></li><li><span>Ravi K.</span><em class="mock-badge mock-badge--in">On Duty</em></li><li><span>Sana M.</span><em class="mock-badge mock-badge--off">Off Today</em></li></ul></div>' +
        '<div class="float-card pv-float pv-float--a"><div class="float-card__head">Attendance</div><div class="pv-cal"><span class="is-marked"></span><span class="is-marked"></span><span></span><span class="is-marked"></span><span class="is-marked"></span><span class="is-marked"></span><span></span></div></div>' +
        '<div class="float-card pv-float pv-float--b pv-stat"><i class="fa-solid fa-money-check-dollar"></i><div><strong>Auto</strong><span>Payroll runs every cycle</span></div></div>'
    }
  ];

  (function initProductSuite() {
    var nav = document.getElementById('productNav');
    var select = document.getElementById('productSelect');
    var stage = document.getElementById('productStage');
    var navWrap = nav ? nav.closest('.product-suite__nav-wrap') : null;
    if (!nav || !select || !stage) return;

    var activeIndex = -1; // no tab is active yet — the initial setActive(0, ...) call below must not be a no-op

    /* Icon fields are normally a bare icon name ("fa-bed") and default to the
       solid style; an icon can opt into another style (e.g. "fa-brands
       fa-whatsapp") by including its own prefix, which is left untouched. */
    function iconClass(icon) {
      return /^fa-(solid|regular|brands|light|thin)\b/.test(icon) ? icon : 'fa-solid ' + icon;
    }

    function buildHighlight(h) {
      return '<div class="product-highlight">' +
        '<div class="product-highlight__icon"><i class="' + iconClass(h.icon) + '"></i></div>' +
        '<div><strong>' + h.title + '</strong><span>' + h.text + '</span></div></div>';
    }

    function buildPanel(product) {
      var highlightsHTML = product.highlights.map(buildHighlight).join('');
      var ctaHTML = '<a href="' + product.ctaPrimary.href + '" class="btn btn--primary magnetic"><span>' + product.ctaPrimary.label + '</span><i class="fa-solid fa-arrow-right"></i></a>';
      if (product.ctaSecondary) {
        ctaHTML += '<a href="' + product.ctaSecondary.href + '" class="btn btn--ghost magnetic"><span>' + product.ctaSecondary.label + '</span></a>';
      }
      return '<div class="product-panel">' +
        '<div class="product-panel__text">' +
        '<div class="product-panel__icon"><i class="' + iconClass(product.icon) + '"></i></div>' +
        '<h3>' + product.name + '</h3>' +
        '<p>' + product.description + '</p>' +
        '<div class="product-highlights">' + highlightsHTML + '</div>' +
        '<div class="product-panel__ctas">' + ctaHTML + '</div>' +
        '</div>' +
        '<div class="product-visual" data-accent="' + product.accent + '">' +
        '<div class="product-visual__glow"></div>' + product.visual +
        '</div></div>';
    }

    var ACCENT_COLORS = { cyan: 'var(--cyan)', blue: 'var(--primary)', gold: 'var(--gold)', green: 'var(--green)', violet: '#a78bfa' };

    function renderNav() {
      nav.innerHTML = PRODUCTS.map(function (p, i) {
        return '<button class="product-nav-pill' + (i === 0 ? ' is-active' : '') + '" data-index="' + i + '" role="tab" aria-selected="' + (i === 0) + '" style="--pill-accent:' + (ACCENT_COLORS[p.accent] || 'var(--cyan)') + '">' +
          '<i class="' + iconClass(p.icon) + '"></i><span>' + p.name + '</span></button>';
      }).join('');
      select.innerHTML = PRODUCTS.map(function (p, i) {
        return '<option value="' + i + '">' + p.name + '</option>';
      }).join('');
    }

    function scrollActivePillIntoView() {
      var activePill = nav.querySelector('.product-nav-pill.is-active');
      if (activePill) activePill.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }

    function updateFades() {
      if (!navWrap) return;
      var leftFade = navWrap.querySelector('.product-suite__fade--left');
      var rightFade = navWrap.querySelector('.product-suite__fade--right');
      if (leftFade) leftFade.classList.toggle('is-hidden', nav.scrollLeft <= 2);
      if (rightFade) rightFade.classList.toggle('is-hidden', nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2);
    }

    /* Panel cache: each product's panel is built at most once, so revisiting
       a tab reuses the exact same DOM node instantly instead of re-rendering. */
    var panelCache = {};
    var isTransitioning = false;
    var TRANSITION_MS = 320;

    function getPanel(index) {
      if (!panelCache[index]) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = buildPanel(PRODUCTS[index]);
        var panel = wrapper.firstElementChild;
        panel.querySelectorAll('.magnetic').forEach(attachMagnetic);
        panelCache[index] = panel;
      }
      return panelCache[index];
    }

    /* Resets any inline styles a panel may have picked up the last time it
       was animated (e.g. while it was the outgoing panel), so it starts
       every transition from a known, clean state. */
    function resetPanelStyle(panel) {
      panel.style.cssText = '';
    }

    function setActive(index, opts) {
      opts = opts || {};
      if ((index === activeIndex && !opts.force) || isTransitioning) return;
      activeIndex = index;

      nav.querySelectorAll('.product-nav-pill').forEach(function (pill, i) {
        pill.classList.toggle('is-active', i === index);
        pill.setAttribute('aria-selected', String(i === index));
      });
      select.value = String(index);

      var prevPanel = stage.querySelector('.product-panel');
      var nextPanel = getPanel(index);
      resetPanelStyle(nextPanel);

      if (!prevPanel || reduceMotion || opts.skipAnimation) {
        // Nothing on stage yet (first load) or motion is disabled: just show it.
        stage.style.height = '';
        stage.appendChild(nextPanel);
        if (!opts.skipScrollIntoView) scrollActivePillIntoView();
        return;
      }

      if (nextPanel === prevPanel) return;

      isTransitioning = true;

      // Lock the stage at its current height so nothing collapses/jumps
      // while both panels briefly coexist during the crossfade.
      var startHeight = stage.getBoundingClientRect().height;
      stage.style.height = startHeight + 'px';

      // Measure the incoming panel's natural height at the same width,
      // without ever showing it, so the height-lock can morph to the
      // correct target instead of snapping after the fact.
      nextPanel.style.cssText = 'position:absolute; top:0; left:0; width:100%; visibility:hidden; opacity:0;';
      stage.appendChild(nextPanel); // mounted (hidden) — prevPanel is still fully present
      var endHeight = nextPanel.getBoundingClientRect().height;

      stage.style.transition = 'height ' + TRANSITION_MS + 'ms ease';
      void stage.offsetHeight; // commit the transition property before changing height, so it actually animates
      stage.style.height = endHeight + 'px';

      prevPanel.style.transition = 'opacity ' + TRANSITION_MS + 'ms ease';
      nextPanel.style.transition = 'opacity ' + TRANSITION_MS + 'ms ease';
      nextPanel.style.visibility = 'visible';

      requestAnimationFrame(function () {
        prevPanel.style.opacity = '0';
        nextPanel.style.opacity = '1';
      });

      setTimeout(function () {
        prevPanel.remove(); // only unmounted now that the incoming panel is fully visible
        resetPanelStyle(nextPanel);
        stage.style.transition = '';
        stage.style.height = '';
        isTransitioning = false;
      }, TRANSITION_MS);

      if (!opts.skipScrollIntoView) scrollActivePillIntoView();
    }

    renderNav();
    setActive(0, { skipAnimation: true, skipScrollIntoView: true });

    nav.addEventListener('click', function (e) {
      var pill = e.target.closest('.product-nav-pill');
      if (pill) setActive(parseInt(pill.getAttribute('data-index'), 10));
    });

    select.addEventListener('change', function () {
      setActive(parseInt(select.value, 10));
    });

    /* Mouse wheel scrolls the nav horizontally (trackpad/touch already work natively) */
    nav.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        nav.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    nav.addEventListener('scroll', rafThrottle(updateFades), { passive: true });
    window.addEventListener('resize', debounce(updateFades, 150), { passive: true });
    updateFades();
  })();

  /* ---------------- Magnetic buttons ---------------- */
  document.querySelectorAll('.magnetic').forEach(attachMagnetic);

  /* ---------------- YouTube facade (perf-friendly video embed) ---------------- */
  var ytFacade = document.getElementById('ytFacade');
  if (ytFacade) {
    ytFacade.querySelector('.play-btn').addEventListener('click', function () {
      loadFacadeVideo(ytFacade);
    });
  }

  function loadFacadeVideo(facade) {
    var ytId = facade.getAttribute('data-yt-id');
    if (!ytId || ytId.indexOf('REPLACE') === 0) return;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&rel=0';
    iframe.title = 'BluEarn demo video';
    iframe.allow = 'accelerated-3d; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    facade.innerHTML = '';
    facade.appendChild(iframe);
  }

  /* Secondary play buttons (use-case & testimonial cards) route back to main showcase demo */
  document.querySelectorAll('.play-btn--sm').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById('showcase');
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
  });

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-item__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('is-open');
      item.parentElement.querySelectorAll('.faq-item').forEach(function (el) {
        el.classList.remove('is-open');
      });
      if (!wasOpen) item.classList.add('is-open');
    });
  });

  /* ---------------- Contact form validation + success ---------------- */
  var contactForm = document.getElementById('contactForm');
  var formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      contactForm.querySelectorAll('[required]').forEach(function (field) {
        var wrap = field.closest('.form-field');
        var fieldValid = field.checkValidity();
        if (field.type === 'tel') {
          fieldValid = fieldValid && field.value.replace(/\D/g, '').length >= 7;
        }
        wrap.classList.toggle('is-invalid', !fieldValid);
        if (!fieldValid) valid = false;
      });

      if (!valid) return;

      contactForm.style.display = 'none';
      formSuccess.classList.add('is-visible');
    });

    contactForm.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        var wrap = field.closest('.form-field');
        if (wrap) wrap.classList.remove('is-invalid');
      });
    });
  }

  /* ---------------- Newsletter form ---------------- */
  var newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = newsletterForm.querySelector('input');
      var button = newsletterForm.querySelector('button');
      if (input.checkValidity()) {
        button.innerHTML = '<i class="fa-solid fa-check"></i>';
        input.value = '';
        setTimeout(function () {
          button.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
        }, 2400);
      }
    });
  }

})();
