(function () {
  "use strict";

  const SLIDE_INTERVAL_MS = 400;
  const FOCUS_THRESHOLD = 0.35;

  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const scrollWrapper = document.querySelector(".clients__scroll-wrapper");
  const stickyPanel = document.querySelector(".clients__sticky");
  const track = document.querySelector(".clients__track");
  const aboutText = document.querySelector(".clients__about");
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
      if (this.slides.length <= 1) {
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

  let focusedCard = null;

  function updateHeaderTheme() {
    if (!header || !hero) {
      return;
    }

    const heroBottom = hero.getBoundingClientRect().bottom;
    const transitionDistance = window.innerHeight * 0.4;
    const progress = Math.min(1, Math.max(0, 1 - heroBottom / transitionDistance));

    header.style.setProperty("--header-theme", progress.toFixed(3));
    header.classList.toggle("site-header--light", progress > 0.5);
  }

  function updateFocusedClient() {
    if (prefersReducedMotion) {
      return;
    }

    const viewportCenter = window.innerWidth / 2;
    let nextFocusedCard = null;
    let closestDistance = Infinity;

    clientCards.forEach(function (card) {
      const slideshow = card.querySelector(".client-card__slideshow");
      if (!slideshow) {
        return;
      }

      const rect = slideshow.getBoundingClientRect();
      if (rect.right < 0 || rect.left > window.innerWidth) {
        return;
      }

      const imageCenter = rect.left + rect.width / 2;
      const distance = Math.abs(imageCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        nextFocusedCard = card;
      }
    });

    const focusLimit = window.innerWidth * FOCUS_THRESHOLD;
    if (!nextFocusedCard || closestDistance > focusLimit) {
      nextFocusedCard = null;
    }

    if (nextFocusedCard === focusedCard) {
      return;
    }

    clientCards.forEach(function (card) {
      const slideshow = slideshows.get(card);
      const isFocused = card === nextFocusedCard;

      card.classList.toggle("is-focused", isFocused);

      if (isFocused) {
        slideshow?.start();
      } else {
        slideshow?.stop();
      }
    });

    focusedCard = nextFocusedCard;
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

  if (!scrollWrapper || !stickyPanel || !track) {
    updateHeaderTheme();
    updateAboutVisibility();
    window.addEventListener("scroll", function () {
      updateHeaderTheme();
      updateAboutVisibility();
    }, { passive: true });
    return;
  }

  function setTrackEdgePadding() {
    const firstSlideshow = clientCards[0]?.querySelector(".client-card__slideshow");
    if (!firstSlideshow || !track) {
      return;
    }

    const viewportWidth = stickyPanel.clientWidth;
    const imageWidth = firstSlideshow.offsetWidth;
    const edgePadding = Math.max(0, (viewportWidth - imageWidth) / 2);

    track.style.setProperty("--client-edge-padding", `${edgePadding}px`);
  }

  function getSlideshowCenterInTrack(slideshow) {
    const trackLeft = track.getBoundingClientRect().left;
    const slideshowRect = slideshow.getBoundingClientRect();

    return slideshowRect.left - trackLeft + slideshowRect.width / 2;
  }

  let cachedMaxTranslate = 0;

  function measureTrackScroll() {
    setTrackEdgePadding();

    const savedTransform = track.style.transform;
    track.style.transform = "translateX(0)";

    const viewportWidth = stickyPanel.clientWidth;
    const lastSlideshow = clientCards[clientCards.length - 1]?.querySelector(".client-card__slideshow");

    if (!lastSlideshow) {
      cachedMaxTranslate = 0;
    } else {
      const lastCenter = getSlideshowCenterInTrack(lastSlideshow);
      cachedMaxTranslate = Math.max(0, lastCenter - viewportWidth / 2);
    }

    track.style.transform = savedTransform;
    scrollWrapper.style.height = `${window.innerHeight + cachedMaxTranslate}px`;
  }

  function setScrollHeight() {
    measureTrackScroll();
  }

  function updateHorizontalScroll() {
    updateHeaderTheme();

    const rect = scrollWrapper.getBoundingClientRect();
    const scrollableDistance = scrollWrapper.offsetHeight - window.innerHeight;

    if (scrollableDistance <= 0) {
      track.style.transform = "translateX(0)";
      aboutText?.classList.remove("is-visible");
      updateFocusedClient();
      return;
    }

    const progress = Math.min(1, Math.max(0, -rect.top / scrollableDistance));

    track.style.transform = `translateX(-${progress * cachedMaxTranslate}px)`;

    if (aboutText) {
      if (progress > 0.08) {
        aboutText.classList.add("is-visible");
      } else {
        aboutText.classList.remove("is-visible");
      }
    }

    updateFocusedClient();
    updateAboutVisibility();
  }

  function init() {
    setScrollHeight();
    updateHeaderTheme();
    updateAboutVisibility();

    clientCards.forEach(function (card) {
      card.querySelectorAll(".client-card__slide:not(.is-active)").forEach(function (slide) {
        slide.setAttribute("aria-hidden", "true");
      });
    });

    if (prefersReducedMotion) {
      track.style.transform = "translateX(0)";
      aboutText?.classList.add("is-visible");
      aboutContent?.classList.add("is-visible");
      scrollWrapper.style.height = "auto";
      stickyPanel.style.position = "relative";
      stickyPanel.style.height = "auto";
      stickyPanel.style.overflow = "visible";
      track.style.flexWrap = "wrap";
      track.style.justifyContent = "center";
      track.style.paddingBlock = "3rem";
      return;
    }

    updateHorizontalScroll();
  }

  let ticking = false;

  function onScroll() {
    if (prefersReducedMotion) {
      return;
    }

    if (!ticking) {
      window.requestAnimationFrame(function () {
        updateHorizontalScroll();
        ticking = false;
      });
      ticking = true;
    }
  }

  let resizeTimer;

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setScrollHeight();
      updateHorizontalScroll();
    }, 120);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  if (document.fonts?.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener("load", init);
  }

  init();
})();
