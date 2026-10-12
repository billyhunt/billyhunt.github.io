// The nav's pause button stops every looping animation on the page (WCAG 2.2.2).
// Other scripts read html.paused and listen for "motionchange" on document.
// An inline script in <head> applies a saved choice before first paint, and CSS
// shows the Pause or Play label from html.paused.
(function () {
  var root = document.documentElement;
  var button = document.querySelector(".motion-toggle");
  if (!button || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  button.addEventListener("click", function () {
    var paused = root.classList.toggle("paused");
    try { localStorage.setItem("motion", paused ? "paused" : "playing"); } catch (e) {}
    document.dispatchEvent(new Event("motionchange"));
  });
})();
