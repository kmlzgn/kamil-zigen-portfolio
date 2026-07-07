/*
 * Kamil Zigen — Manufacturing Leadership Portfolio
 * Progressive-enhancement UI: theme toggle (incl. swapping chart/diagram
 * images to their dark twins), scroll progress, active-nav highlighting,
 * back-to-top, copy-email, one-time scroll reveal, and print readiness
 * (forcing every page visible and every image loaded before the browser
 * renders a print/PDF output).
 * Theme + the "js" class are applied earlier by the inline blocking
 * script in <head> to avoid a flash of the wrong theme / hidden content.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme-aware chart/diagram images ----------
   * A handful of raster charts and technical diagrams (Ball-Bar circularity
   * plots, the drill engineering drawing) were authored on an opaque white
   * canvas that software/plot tools produce by default. That canvas can't
   * be recolored with CSS the way the inline SVG charts and page text can,
   * so each of these ships a hand-built dark twin (assets/images/*-dark.png
   * — dark background, brightened axis/outline, data traces preserved) and
   * this swaps between them. Photos are deliberately not in this list —
   * only genuine charts/diagrams got a dark twin.
   */
  var themedImages = Array.prototype.slice.call(document.querySelectorAll("img[data-dark-src]"));
  themedImages.forEach(function (img) {
    if (!img.getAttribute("data-light-src")) {
      img.setAttribute("data-light-src", img.getAttribute("src"));
    }
  });
  function applyThemeImages(theme) {
    themedImages.forEach(function (img) {
      var target = theme === "dark" ? img.getAttribute("data-dark-src") : img.getAttribute("data-light-src");
      if (target && img.getAttribute("src") !== target) img.setAttribute("src", target);
    });
  }
  applyThemeImages(document.documentElement.getAttribute("data-theme"));

  /* ---------- Theme toggle ---------- */
  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      themeToggle.setAttribute("aria-pressed", String(next === "dark"));
      themeToggle.textContent = next === "dark" ? "Light Mode" : "Dark Mode";
      applyThemeImages(next);
    });
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
  }
  // Live-update if the user hasn't made an explicit manual choice.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (localStorage.getItem("theme")) return; // manual choice wins
      var next = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      applyThemeImages(next);
      if (themeToggle) {
        themeToggle.setAttribute("aria-pressed", String(next === "dark"));
        themeToggle.textContent = next === "dark" ? "Light Mode" : "Dark Mode";
      }
    });
  }

  /* ---------- Scroll progress bar ---------- */
  var progressFill = document.getElementById("progressFill");
  var progressBar = document.getElementById("progressBar");
  var backToTop = document.getElementById("backToTop");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      if (progressFill) progressFill.style.width = pct + "%";
      if (progressBar) progressBar.setAttribute("aria-valuenow", String(Math.round(pct)));
      if (backToTop) {
        backToTop.classList.toggle("is-visible", scrollTop > window.innerHeight);
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      var firstPage = document.getElementById("p1");
      if (firstPage) {
        firstPage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  }

  /* ---------- Active nav highlighting + one-time page reveal ---------- */
  var pages = Array.prototype.slice.call(document.querySelectorAll(".page[id]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));

  function setActiveNav(id) {
    navLinks.forEach(function (link) {
      var isActive = link.getAttribute("href") === "#" + id;
      link.toggleAttribute("aria-current", isActive);
      if (isActive) link.setAttribute("aria-current", "true");
    });
  }

  if (pages.length && "IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    pages.forEach(function (page) {
      revealObserver.observe(page);
    });

    var navObserver = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
        if (visible.length) setActiveNav(visible[0].target.id);
      },
      { threshold: [0.25, 0.5, 0.75] }
    );
    pages.forEach(function (page) {
      navObserver.observe(page);
    });
  } else if (pages.length) {
    // No IntersectionObserver support: reveal everything immediately.
    pages.forEach(function (page) { page.classList.add("is-revealed"); });
  }

  /* ---------- Print readiness ----------
   * print.css already forces opacity:1/transform:none unconditionally, so
   * the printed page is never blank purely on CSS grounds — that fix does
   * not depend on any of the following running. This is the second layer:
   * it stops the reveal animation from doing any more (pointless, since
   * print.css overrides its result anyway) and, more importantly, forces
   * any image the browser hasn't fetched yet under loading="lazy" to load
   * immediately, since no CSS rule can substitute for a real network
   * fetch. Wired to both "beforeprint" and matchMedia('print') because
   * Safari's beforeprint/afterprint support has historically been patchy.
   */
  function prepareForPrint() {
    pages.forEach(function (page) {
      page.classList.add("is-revealed");
    });
    if (revealObserver) revealObserver.disconnect();
    var lazyImages = document.querySelectorAll('img[loading="lazy"]');
    lazyImages.forEach(function (img) {
      img.loading = "eager";
    });
    // print.css forces the page itself back to light regardless of the
    // active theme, but that's a CSS variable reset — it has no way to
    // touch a raster <img src>, so the dark chart/diagram twins would
    // otherwise print as-is on an otherwise-light printed page.
    applyThemeImages("light");
  }
  window.addEventListener("beforeprint", prepareForPrint);
  window.addEventListener("afterprint", function () {
    applyThemeImages(document.documentElement.getAttribute("data-theme"));
  });
  if (window.matchMedia) {
    var printMql = window.matchMedia("print");
    if (printMql.addEventListener) {
      printMql.addEventListener("change", function (e) {
        if (e.matches) prepareForPrint();
        else applyThemeImages(document.documentElement.getAttribute("data-theme"));
      });
    }
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById("copyEmailBtn");
  var copyFeedback = document.getElementById("copyFeedback");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email") || "";
      var done = function () {
        if (copyFeedback) {
          copyFeedback.textContent = "Copied!";
          copyFeedback.hidden = false;
          setTimeout(function () {
            copyFeedback.hidden = true;
          }, 2000);
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, done);
      } else {
        // Fallback for browsers without Clipboard API
        var temp = document.createElement("textarea");
        temp.value = email;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        try { document.execCommand("copy"); } catch (e) { /* no-op */ }
        document.body.removeChild(temp);
        done();
      }
    });
  }
})();
