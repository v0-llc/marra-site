(function () {
  "use strict";

  const SLIDE_INTERVAL_MS = 400;

  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const aboutSection = document.querySelector(".about");
  const aboutContent = document.querySelector(".about__content");
  const yearEl = document.getElementById("year");
  const clientCards = Array.from(document.querySelectorAll(".client-card"));

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  class ClientSlideshow {
    constructor(card) {
      this.card = card;
      this.slides = Array.from(card.querySelectorAll(".client-card__slide"));
      this.currentIndex = 0;
      this.timer = null;
      this.resetTimer = null;
      this.lastSlideChangeAt = Date.now();
    }

    showSlide(index) {
      this.slides.forEach(function (slide, slideIndex) {
        const isActive = slideIndex === index;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
      this.currentIndex = index;
      this.lastSlideChangeAt = Date.now();
    }

    clearResetTimer() {
      if (this.resetTimer) {
        window.clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
    }

    start() {
      if (prefersReducedMotion || this.slides.length <= 1) {
        return;
      }

      this.clearResetTimer();

      if (this.timer) {
        return;
      }

      this.timer = window.setInterval(() => {
        const nextIndex = (this.currentIndex + 1) % this.slides.length;
        this.showSlide(nextIndex);
      }, SLIDE_INTERVAL_MS);
    }

    stop() {
      if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = null;
      }

      if (this.currentIndex === 0) {
        this.clearResetTimer();
        return;
      }

      if (this.resetTimer) {
        return;
      }

      const elapsed = Date.now() - this.lastSlideChangeAt;
      const remaining = Math.max(0, SLIDE_INTERVAL_MS - elapsed);

      this.resetTimer = window.setTimeout(() => {
        this.showSlide(0);
        this.resetTimer = null;
      }, remaining);
    }
  }

  const slideshows = new Map(
    clientCards.map(function (card) {
      return [card, new ClientSlideshow(card)];
    })
  );

  function updateHeaderTheme() {
    if (!header || !hero) {
      return;
    }

    const heroBottom = hero.getBoundingClientRect().bottom;
    const transitionDistance = window.innerHeight * 0.4;
    const progress = Math.min(1, Math.max(0, 1 - heroBottom / transitionDistance));

    header.style.setProperty("--header-theme", progress.toFixed(3));
  }

  function updateAboutVisibility() {
    if (!aboutSection || !aboutContent) {
      return;
    }

    if (prefersReducedMotion) {
      aboutContent.classList.add("is-visible");
      return;
    }

    const rect = aboutSection.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const ratio = visibleHeight / window.innerHeight;

    aboutContent.classList.toggle("is-visible", ratio > 0.3);
  }

  function onScroll() {
    updateHeaderTheme();
    updateAboutVisibility();
  }

  function initClientCards() {
    clientCards.forEach(function (card) {
      const slideshow = slideshows.get(card);

      card.querySelectorAll(".client-card__slide:not(.is-active)").forEach(function (slide) {
        slide.setAttribute("aria-hidden", "true");
      });

      card.addEventListener("mouseenter", function () {
        slideshow?.start();
      });

      card.addEventListener("mouseleave", function () {
        slideshow?.stop();
      });

      card.addEventListener("focusin", function () {
        slideshow?.start();
      });

      card.addEventListener("focusout", function (event) {
        if (!card.contains(event.relatedTarget)) {
          slideshow?.stop();
        }
      });
    });
  }

  function init() {
    updateHeaderTheme();
    updateAboutVisibility();
    initClientCards();

    if (prefersReducedMotion) {
      aboutContent?.classList.add("is-visible");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener("load", init);
  }

  init();
})();
