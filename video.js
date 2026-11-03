// Music thumbnails swap in the YouTube or Vimeo player on click, so no
// third-party player loads until a visitor asks for it. Without JS the
// thumbnail is a plain link to the video.
(function () {
  document.querySelectorAll(".video[data-embed]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var frame = document.createElement("div");
      frame.className = "video-frame";
      var iframe = document.createElement("iframe");
      iframe.src = link.dataset.embed;
      iframe.title = link.dataset.title;
      iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      link.replaceWith(frame);
      iframe.focus();
    });
  });
})();
