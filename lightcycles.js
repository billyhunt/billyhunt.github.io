// A dimmed light-cycle match plays behind the HIGH SCORE table: two bikes in a
// walled grid arena, each turning to stay alive until one hits a wall or a trail.
// PRESS START hands the cyan bike to the visitor (arrow keys, WASD, or taps).
// Runs only while the section is on screen, never with reduced motion. The
// demo stops while motion is paused from the nav; a game the visitor starts still runs.
(function () {
  var canvas = document.querySelector(".lightcycles");
  var section = canvas && canvas.closest(".arcade");
  var button = section && section.querySelector(".press-start");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (button) {
    button.parentNode.hidden = false;
    document.getElementById("press-start-help").hidden = false;
  }

  var ctx = canvas.getContext("2d");
  var CELL = 8;          // movement grid
  var FLOOR = 40;        // drawn floor grid
  var STEP_MS = 55;
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var COLORS = ["#00f6ff", "#ff9a1f"];

  var KEYS = { ArrowRight: 0, d: 0, ArrowDown: 1, s: 1, ArrowLeft: 2, a: 2, ArrowUp: 3, w: 3 };
  var w, h, cols, rows, pad, grid, bikes, sparks, phase, phaseAt, lastStep, frame, width = 0, height = 0;
  var playing = false, running = false, nextDir = null, score = 0, message = "";

  function resize() {
    var ratio = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    width = w;
    height = h;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    pad = 24;
    cols = Math.max(10, Math.floor((w - pad * 2) / CELL));
    rows = Math.max(10, Math.floor((h - pad * 2) / CELL));
    newRound();
    if (!running) draw(performance.now());
  }

  function newRound() {
    grid = new Uint8Array(cols * rows);
    var y = Math.floor(rows / 2);
    bikes = [
      { x: 4, y: y, dir: 0, color: COLORS[0], alive: true, path: [] },
      { x: cols - 5, y: y, dir: 2, color: COLORS[1], alive: true, path: [] }
    ];
    bikes.forEach(function (b) { b.path.push([b.x, b.y]); grid[b.y * cols + b.x] = 1; });
    sparks = [];
    nextDir = null;
    score = 0;
    message = "";
    phase = "race";
    phaseAt = performance.now();
  }

  function free(x, y) {
    return x >= 0 && y >= 0 && x < cols && y < rows && !grid[y * cols + x];
  }

  function room(x, y, dir, limit) {
    var n = 0;
    while (n < limit && free(x + DIRS[dir][0] * (n + 1), y + DIRS[dir][1] * (n + 1))) n++;
    return n;
  }

  function steer(b) {
    if (playing && b === bikes[0]) {
      if (nextDir !== null && nextDir !== (b.dir + 2) % 4 && nextDir !== b.dir) {
        b.path.push([b.x, b.y]);
        b.dir = nextDir;
      }
      nextDir = null;
      return;
    }
    var ahead = room(b.x, b.y, b.dir, 40);
    // Mostly ride straight like a player would; turn when the way closes or now and then.
    if (ahead > 6 && Math.random() > 0.025) return;
    var best = [b.dir, (b.dir + 1) % 4, (b.dir + 3) % 4]
      .map(function (d) { return { d: d, r: room(b.x, b.y, d, 40) + Math.random() * 4 }; })
      .sort(function (a, c) { return c.r - a.r; })[0];
    if (best.d !== b.dir) b.path.push([b.x, b.y]);
    b.dir = best.d;
  }

  function step() {
    bikes.forEach(function (b) {
      if (!b.alive) return;
      steer(b);
      var nx = b.x + DIRS[b.dir][0], ny = b.y + DIRS[b.dir][1];
      if (!free(nx, ny)) {
        b.alive = false;
        for (var i = 0; i < 24; i++) {
          var a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2.5;
          sparks.push({ x: px(b.x), y: py(b.y), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: b.color });
        }
        return;
      }
      b.x = nx; b.y = ny;
      grid[ny * cols + nx] = 1;
    });
    if (playing && bikes[0].alive) score += 1;
    if (phase === "race" && bikes.some(function (b) { return !b.alive; })) {
      phase = "crash";
      phaseAt = performance.now();
      if (playing) {
        message = bikes[0].alive ? "YOU WIN" : bikes[1].alive ? "GAME OVER" : "DRAW";
      }
    }
  }

  function px(x) { return pad + x * CELL + CELL / 2; }
  function py(y) { return pad + y * CELL + CELL / 2; }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);

    // Floor grid and arena wall.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 246, 255, .14)";
    ctx.beginPath();
    for (var gx = pad; gx <= w - pad; gx += FLOOR) { ctx.moveTo(gx + .5, pad); ctx.lineTo(gx + .5, h - pad); }
    for (var gy = pad; gy <= h - pad; gy += FLOOR) { ctx.moveTo(pad, gy + .5); ctx.lineTo(w - pad, gy + .5); }
    ctx.stroke();
    ctx.strokeStyle = "rgba(0, 246, 255, .55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad - 4, pad - 4, cols * CELL + 8, rows * CELL + 8);

    // Trails fade out after a crash, then a new round starts.
    var fade = phase === "crash" ? Math.max(0, 1 - (now - phaseAt - 900) / 700) : 1;
    if (phase === "crash" && now - phaseAt > (playing ? 2600 : 1700)) {
      if (playing) stopPlaying(); else newRound();
    }

    bikes.forEach(function (b) {
      ctx.globalAlpha = fade;
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 3;
      ctx.lineJoin = "miter";
      ctx.beginPath();
      ctx.moveTo(px(b.path[0][0]), py(b.path[0][1]));
      for (var i = 1; i < b.path.length; i++) ctx.lineTo(px(b.path[i][0]), py(b.path[i][1]));
      ctx.lineTo(px(b.x), py(b.y));
      ctx.stroke();
      if (b.alive) {
        // The bike itself: a bright block at the head of the trail.
        var horiz = DIRS[b.dir][0] !== 0;
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 14;
        ctx.fillRect(px(b.x) - (horiz ? 7 : 3), py(b.y) - (horiz ? 3 : 7), horiz ? 14 : 6, horiz ? 6 : 14);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    sparks.forEach(function (s) {
      s.x += s.vx; s.y += s.vy; s.life -= 0.025;
      if (s.life <= 0) return;
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    });
    ctx.globalAlpha = 1;
    sparks = sparks.filter(function (s) { return s.life > 0; });

    if (playing) {
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillStyle = COLORS[0];
      ctx.textAlign = "left";
      ctx.fillText("1UP " + String(score).padStart(5, "0"), pad + 8, pad + 22);
      if (message) {
        ctx.font = "24px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = message === "YOU WIN" ? COLORS[0] : COLORS[1];
        ctx.fillText(message, w / 2, h / 2);
      }
    }
  }

  // While playing, everything except the quit button is inert so Tab can't land behind the arena.
  function setInert(on) {
    var keep = button.parentNode;
    document.querySelectorAll("body *").forEach(function (el) {
      if (el.contains(keep) || keep.contains(el) || el === canvas) return;
      if (el.parentNode.contains(keep)) el.inert = on;
    });
  }

  function startPlaying() {
    playing = true;
    setInert(true);
    section.classList.add("playing");
    button.textContent = "ESC TO QUIT";
    resize();
    start();
  }

  function stopPlaying() {
    playing = false;
    setInert(false);
    section.classList.remove("playing");
    button.textContent = "PRESS START";
    update();  // stop first when paused, so resize() leaves a fresh still
    resize();
  }

  if (button) {
    button.addEventListener("click", function () {
      if (playing) stopPlaying(); else startPlaying();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!playing) return;
    if (e.key === "Escape") { stopPlaying(); return; }
    var dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (dir === undefined) return;
    e.preventDefault();
    nextDir = dir;
  });

  // Touch: tap the left or right half of the arena to turn that way.
  canvas.addEventListener("pointerdown", function (e) {
    if (!playing) return;
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var b = bikes[0];
    nextDir = e.clientX - rect.left < rect.width / 2 ? (b.dir + 3) % 4 : (b.dir + 1) % 4;
  });

  function loop(now) {
    if (phase === "race" && now - lastStep >= STEP_MS) { lastStep = now; step(); }
    draw(now);
    if (running) frame = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastStep = performance.now();
    frame = requestAnimationFrame(loop);
  }
  // Leaves the current frame on screen as a still.
  function stop() { running = false; cancelAnimationFrame(frame); }

  var visible = false;
  function update() {
    if (playing || (visible && !document.documentElement.classList.contains("paused"))) start();
    else stop();
  }

  new IntersectionObserver(function (entries) {
    visible = entries[entries.length - 1].isIntersecting;
    update();
  }).observe(canvas);
  document.addEventListener("motionchange", update);

  // Rebuild when the canvas changes size (fonts loading, rotation). While playing,
  // ignore height-only changes so a phone's address bar doesn't reset the round.
  var resizeTimer;
  new ResizeObserver(function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (canvas.clientWidth !== width || (!playing && canvas.clientHeight !== height)) resize();
    }, 200);
  }).observe(canvas);

  resize();
})();
