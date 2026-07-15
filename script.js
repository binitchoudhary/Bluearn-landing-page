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

  /* ---------------- Preloader ---------------- */
  window.addEventListener('load', function () {
    var preloader = document.getElementById('preloader');
    if (preloader) {
      setTimeout(function () { preloader.classList.add('is-hidden'); }, 300);
    }
    initRevealObserver();
    initCounters();
    initMarquees(); // re-measure once fonts/images have fully settled
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

  /* ---------------- Infinite marquee engine (feature strip) ----------------
     Clones the seed track until the row's total content width safely exceeds
     2x the viewport, then drives the loop with a pixel-exact --marquee-w
     custom property instead of a "100%" transform — this is what guarantees
     the animation never runs out of content and never shows blank space,
     regardless of screen width or zoom level. */
  function initMarquees() {
    document.querySelectorAll('.js-marquee').forEach(function (group) {
      var seed = group.querySelector('.marquee-track:not(.is-clone)');
      if (!seed) return;

      group.querySelectorAll('.marquee-track.is-clone').forEach(function (clone) {
        clone.remove();
      });

      var contentWidth = seed.getBoundingClientRect().width;
      if (!contentWidth) return;

      var containerWidth = group.getBoundingClientRect().width;
      var speed = parseFloat(group.getAttribute('data-speed')) || 60;
      var direction = group.getAttribute('data-dir') === 'right' ? 'reverse' : 'normal';

      var totalWidth = contentWidth;
      var neededWidth = containerWidth * 2 + contentWidth;
      while (totalWidth < neededWidth) {
        var clone = seed.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        group.appendChild(clone);
        totalWidth += contentWidth;
      }

      group.style.setProperty('--marquee-w', contentWidth + 'px');
      var duration = (contentWidth / speed).toFixed(2);
      group.querySelectorAll('.marquee-track').forEach(function (track) {
        track.style.animationDuration = duration + 's';
        track.style.animationDirection = direction;
        if (reduceMotion) track.style.animationPlayState = 'paused';
      });
    });
  }
  initMarquees();

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

    /* Swiper: Product suite */
    new Swiper('.products-swiper', {
      loop: true,
      speed: 700,
      spaceBetween: 24,
      slidesPerView: 1.05,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 3800, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: { el: '.products-pagination', clickable: true },
      breakpoints: {
        640: { slidesPerView: 2.1, spaceBetween: 24 },
        1024: { slidesPerView: 3.2, spaceBetween: 28 },
        1280: { slidesPerView: 4, spaceBetween: 28 }
      }
    });

    /* Swiper: Use cases */
    new Swiper('.usecases-swiper', {
      loop: true,
      speed: 700,
      spaceBetween: 24,
      slidesPerView: 1.1,
      grabCursor: true,
      keyboard: { enabled: true },
      autoplay: reduceMotion ? false : { delay: 4200, disableOnInteraction: false, pauseOnMouseEnter: true },
      breakpoints: {
        640: { slidesPerView: 2.1 },
        1024: { slidesPerView: 3.2 }
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
  var floatCards = document.querySelectorAll('.hero__floats .float-card');

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

    gsap.utils.toArray('.blob').forEach(function (blob, i) {
      gsap.to(blob, {
        y: i % 2 === 0 ? 120 : -120,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
      });
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  var magnetics = document.querySelectorAll('.magnetic');
  if (!reduceMotion && window.matchMedia('(min-width: 1025px)').matches) {
    magnetics.forEach(function (btn) {
      btn.addEventListener('mousemove', rafThrottle(function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate3d(' + x * 0.25 + 'px, ' + y * 0.35 + 'px, 0)';
      }), { passive: true });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate3d(0, 0, 0)';
      });
    });
  }

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

  /* ---------------- Resize: re-sync marquee widths (debounced) ---------------- */
  window.addEventListener('resize', debounce(function () {
    initMarquees();
  }, 200), { passive: true });

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
