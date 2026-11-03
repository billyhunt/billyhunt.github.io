// Types the hero words one at a time, like the old typed.js rotator.
// Screen readers get the full list from the .sr-only text instead.
// When motion is paused from the nav, the current word stays fully typed.
(function () {
  var el = document.querySelector(".typed-text");
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  var words = el.dataset.words.split("|");
  var word = 0;
  var chars = 0;
  var timer;

  function later(fn, ms) { timer = setTimeout(fn, ms); }

  function tick() {
    var current = words[word];
    if (chars < current.length) {
      chars += 1;
      el.textContent = current.slice(0, chars);
      later(tick, 75);
      return;
    }
    later(function () {
      el.classList.add("fade");
      later(function () {
        el.classList.remove("fade");
        word = (word + 1) % words.length;
        chars = 0;
        el.textContent = "";
        tick();
      }, 400);
    }, 1800);
  }

  document.addEventListener("motionchange", function () {
    clearTimeout(timer);
    el.classList.remove("fade");
    if (root.classList.contains("paused")) {
      chars = words[word].length;
      el.textContent = words[word];
    } else {
      tick();
    }
  });

  el.textContent = "";
  if (root.classList.contains("paused")) {
    chars = words[word].length;
    el.textContent = words[word];
  } else {
    tick();
  }
})();
