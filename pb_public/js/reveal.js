// pb_public/js/reveal.js
// BharatYatra PWA — Lightweight scroll-reveal system (IntersectionObserver, zero dependencies)
// Static sections reveal on DOMContentLoaded; Alpine x-for templates call initReveals() again after render.

(function () {
  var SELECTOR = ".reveal";
  var observer = null;

  function show(el) {
    el.classList.add("is-visible");
  }

  function applyStagger(scope) {
    var groups = scope.querySelectorAll("[data-reveal-stagger]");
    groups.forEach(function (group) {
      var children = group.children;
      for (var i = 0; i < children.length; i++) {
        var target = children[i].classList.contains("reveal")
          ? children[i]
          : children[i].querySelector(SELECTOR);
        if (target && !target.style.getPropertyValue("--reveal-delay")) {
          target.style.setProperty("--reveal-delay", i * 70 + "ms");
        }
      }
    });
  }

  function initReveals(scope) {
    scope = scope || document;
    var els = scope.querySelectorAll(SELECTOR + ":not(.is-visible)");
    if (!els.length) return;

    applyStagger(scope);

    if (!("IntersectionObserver" in window)) {
      els.forEach(show);
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              show(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }
      );
    }

    els.forEach(function (el) {
      observer.observe(el);
    });
  }

  window.initReveals = initReveals;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initReveals(document);
    });
  } else {
    initReveals(document);
  }
})();
