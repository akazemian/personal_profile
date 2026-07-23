/* ============================================================
   two-systems.js  —  vector-quantization banner

   How discrete-latent world models quantize continuous data.
   Three continuous signals are the components of one vector z_t
   (a robot's latent state / observation over time). On the left
   they flow continuously; on the right each sample is snapped to
   its nearest entry in a learned codebook E — vector quantization —

       z_q = e_k,   k = argmin_j ‖z − e_j‖

   emitting a stream of discrete tokens k_t (shown along the base).
   A larger codebook = finer quantization, smaller residual error.
   Subtle gray: this is a backdrop behind the name.
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var GRAY = [124, 128, 134];

  var DIMS      = 3;      // components of z_t (the three curves)
  var SAMPLE_PX = 26;     // sensor sampling interval (px) — fixed-rate sampler
  var SPEED     = 0.12;   // signal drift (time flow), radians/sec
  var EDGE0     = 0.40;   // continuous → quantized dissolve begins
  var EDGE1     = 0.60;   // dissolve completes
  var ROW_AMP   = 0.60;   // per-component amplitude as fraction of half its row

  var A_CONT = 0.27, A_QUANT = 0.39, A_STEP = 0.9, A_RES = 0.17,
      A_SAMPLE = 0.08, A_TOKEN = 0.52;

  var K = 32;             // codebook size (set from markup below)
  var codebook = [];      // K vectors in R^DIMS
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w = 0, h = 0, dpr = 1, spanRad = 6;

  /* ---- the continuous vector signal z_t -------------------------- */

  function dimFreq(d)  { return 0.7 + 0.85 * d; }
  function dimPhase(d) { return d * 2.1; }

  function comp(u, d) {           // component d of z at phase u, in ~[-1,1]
    var f = dimFreq(d);
    return 0.58 * Math.sin(u * f)
         + 0.26 * Math.sin(u * f * 2.1 + 1.3)
         + 0.16 * Math.sin(u * f * 0.5 + dimPhase(d));
  }

  function micro(u) { return 0.03 * Math.sin(u * 21.3) + 0.018 * Math.sin(u * 34.7 + 1.1); }

  /* ---- the learned codebook (deterministic pseudo-random) -------- */

  function hash(a, b) {
    var s = Math.sin((a + 1) * 12.9898 + (b + 1) * 78.233) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;   // in [-1, 1]
  }
  function buildCodebook(k) {
    codebook = [];
    for (var i = 0; i < k; i++) {
      var v = [];
      for (var d = 0; d < DIMS; d++) v.push(hash(i, d) * 0.95);
      codebook.push(v);
    }
  }

  // nearest codebook entry to vector z → index k
  function encode(z) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < codebook.length; i++) {
      var e = codebook[i], acc = 0;
      for (var d = 0; d < DIMS; d++) { var diff = z[d] - e[d]; acc += diff * diff; }
      if (acc < bestD) { bestD = acc; best = i; }
    }
    return best;
  }

  /* ---- helpers --------------------------------------------------- */

  function smoothstep(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function g(a) { return 'rgba(' + GRAY[0] + ',' + GRAY[1] + ',' + GRAY[2] + ',' + a + ')'; }

  /* ---- sizing ---------------------------------------------------- */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spanRad = Math.max(3.5, Math.min(9, 6.5 * (w / 1280)));
  }

  /* ---- render ---------------------------------------------------- */

  function draw(t) {
    ctx.clearRect(0, 0, w, h);

    // reserve a lane at the base for the token stream
    var plotTop = h * 0.06, plotBot = h * 0.80;
    var rowH = (plotBot - plotTop) / DIMS;
    var amp = (rowH / 2) * ROW_AMP;
    var tokenY = h * 0.90;
    var step = Math.max(2, Math.floor(w / 420));

    function yOf(val, d) { return plotTop + rowH * (d + 0.5) - val * amp; }

    // continuous value of component d at screen-x
    function contVal(x, d) { return comp((x / w) * spanRad + t * SPEED, d); }

    /* --- fixed-rate samples: read z, encode to nearest code --- */
    var samples = [];   // { x, k, e }
    for (var sx = 0; sx <= w + SAMPLE_PX; sx += SAMPLE_PX) {
      var z = [];
      for (var d = 0; d < DIMS; d++) z.push(contVal(sx, d));
      var k = encode(z);
      samples.push({ x: sx, z: z, k: k, e: codebook[k] });
    }

    /* --- faint sampling grid (discrete time) on the quantized side --- */
    ctx.lineWidth = 1;
    for (var si = 0; si < samples.length; si++) {
      var xx = samples[si].x;
      var mgrid = smoothstep(EDGE0, EDGE1, xx / w);
      if (mgrid <= 0.02 || xx > w) continue;
      ctx.strokeStyle = g(A_SAMPLE * mgrid);
      ctx.beginPath(); ctx.moveTo(xx + 0.5, plotTop); ctx.lineTo(xx + 0.5, plotBot); ctx.stroke();
    }

    for (var d = 0; d < DIMS; d++) {
      /* --- continuous trace: fades OUT to the right --- */
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var px = null, py = null;
      for (var x = 0; x <= w; x += step) {
        var m = smoothstep(EDGE0, EDGE1, x / w);
        var y = yOf(contVal(x, d) + micro((x / w) * spanRad + t * SPEED), d);
        if (px !== null && m < 1) {
          ctx.strokeStyle = g(A_CONT * (1 - m));
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
        px = x; py = y;
      }

      /* --- residuals: faint tick from sample to its assigned code --- */
      ctx.lineWidth = 1;
      for (var r = 0; r < samples.length; r++) {
        var s0 = samples[r];
        if (s0.x > w) continue;
        var mr = smoothstep(EDGE0, EDGE1, s0.x / w);
        if (mr <= 0.05) continue;
        ctx.strokeStyle = g(A_RES * mr);
        ctx.beginPath();
        ctx.moveTo(s0.x, yOf(s0.z[d], d));
        ctx.lineTo(s0.x, yOf(s0.e[d], d));
        ctx.stroke();
      }

      /* --- quantized trace: zero-order hold on the code value --- */
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
      for (var i = 1; i < samples.length; i++) {
        var a = samples[i - 1], b = samples[i];
        var mm = smoothstep(EDGE0, EDGE1, ((a.x + b.x) / 2) / w);
        if (mm <= 0.01) continue;
        var ya = yOf(a.e[d], d), yb = yOf(b.e[d], d);
        ctx.strokeStyle = g(A_QUANT * A_STEP * mm);
        ctx.beginPath();
        ctx.moveTo(a.x, ya); ctx.lineTo(b.x, ya); ctx.lineTo(b.x, yb);
        ctx.stroke();
      }

      /* --- snapped sample points --- */
      for (var j = 0; j < samples.length; j++) {
        var sp = samples[j];
        if (sp.x < -3 || sp.x > w + 3) continue;
        var mp = smoothstep(EDGE0, EDGE1, sp.x / w);
        if (mp <= 0.02) continue;
        ctx.fillStyle = g(A_QUANT * mp);
        ctx.beginPath(); ctx.arc(sp.x, yOf(sp.e[d], d), 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* --- token stream: the emitted discrete codes k_t --- */
    ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var q = 0; q < samples.length; q++) {
      var st = samples[q];
      if (st.x < 6) continue;
      var mt = smoothstep(EDGE0, EDGE1, st.x / w);
      // fade the stream out before the bottom-right corner (reserved for the control)
      var rightFade = 1 - smoothstep(0.60, 0.72, st.x / w);
      var at = A_TOKEN * mt * rightFade;
      if (at <= 0.02) continue;
      ctx.fillStyle = g(at);
      ctx.fillText(st.k, st.x, tokenY);
    }
  }

  /* ---- controls -------------------------------------------------- */

  var btns = Array.prototype.slice.call(document.querySelectorAll('.bitctl button'));
  var rdK = document.getElementById('rd-k');

  function setK(k) {
    K = k;
    buildCodebook(K);
    btns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.k) === k));
    });
    if (rdK) rdK.textContent = k;
    if (reduceMotion) draw(0.5);
  }

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () { setK(Number(btn.dataset.k)); });
  });

  var initial = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
  setK(initial ? Number(initial.dataset.k) : 32);

  /* ---- loop ------------------------------------------------------ */

  var start = null;
  function frame(now) {
    if (start === null) start = now;
    draw((now - start) / 1000);
    requestAnimationFrame(frame);
  }

  resize();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduceMotion) draw(0.5); }, 120);
  });

  if (reduceMotion) draw(0.5);
  else requestAnimationFrame(frame);
})();
