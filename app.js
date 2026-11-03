(function () {
  'use strict';

  var C = window.ELYFLUFF_CONFIG || {};
  var COL = { hyper: '#5EE6CF', hyper2: '#97FCE4', deep: '#1B8F7E', sky: '#6EC8F5', crimson: '#A31C1B', crimson2: '#E04A46', bg: '#062723' };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SUPPLY = Number(C.NFT_SUPPLY) || 3000;
  var MIN_SEC = Number(C.MIN_TASK_SECONDS) || 6;
  var TICKER = C.TICKER || '$FLUFF';
  var DEMO = !C.SCRIPT_URL;
  var LAUNCH = Date.parse(C.ELYSIUM_LAUNCH_UTC || '');

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function pad(n, l) { return String(n).padStart(l || 4, '0'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shortWallet(w) { return w && w.length > 12 ? w.slice(0, 6) + '...' + w.slice(-4) : (w || ''); }
  function handle() { return String(C.X_HANDLE || 'ElyFluff').replace(/^@/, ''); }
  function openUrl(url) { if (url) window.open(url, '_blank', 'noopener,noreferrer'); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function timeLeft() {
    var diff = LAUNCH - Date.now();
    if (isNaN(LAUNCH)) return null;
    if (diff <= 0) return { live: true, d: 0, h: 0, m: 0, s: 0 };
    var d = Math.floor(diff / 864e5); diff %= 864e5;
    var h = Math.floor(diff / 36e5); diff %= 36e5;
    var m = Math.floor(diff / 6e4); diff %= 6e4;
    return { live: false, d: d, h: h, m: m, s: Math.floor(diff / 1000) };
  }
  function ago(t) {
    var s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  /* ---------- config text ---------- */
  function fillConfig() {
    var map = {
      TICKER: TICKER,
      NFT_SUPPLY_FMT: fmt(SUPPLY),
      TOKEN_SUPPLY: C.TOKEN_SUPPLY || 'TBA',
      X_HANDLE_AT: '@' + handle(),
      GTD_MINT_PRICE: C.GTD_MINT_PRICE || '0.33 HYPE'
    };
    $$('[data-cfg]').forEach(function (e) {
      var v = map[e.getAttribute('data-cfg')];
      if (v != null) e.textContent = v;
    });
    $$('[data-x-profile]').forEach(function (b) {
      b.addEventListener('click', function () { openUrl('https://x.com/' + encodeURIComponent(handle())); });
    });
  }

  /* ---------- nav ---------- */
  function nav() {
    var btn = $('#menuBtn'), links = $('#navLinks');
    if (!btn) return;
    function set(open) { links.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    btn.addEventListener('click', function () { set(!links.classList.contains('open')); });
    $$('a', links).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('click', function (e) { if (!links.contains(e.target) && !btn.contains(e.target)) set(false); });
    var track = $('#livebarTrack');
    if (track) track.innerHTML += track.innerHTML;
  }

  /* ---------- hero terminal ---------- */
  function heroTerm() {
    var box = $('#heroTerm');
    if (!box) return;
    function cd() {
      var t = timeLeft();
      if (!t) return 'Nov 9';
      if (t.live) return 'LIVE';
      return 'live in ' + t.d + 'd ' + pad(t.h, 2) + 'h ' + pad(t.m, 2) + 'm';
    }
    var script = [
      { cmd: 'elyfluff status', out: [
        [['k', 'network   '], ['v', 'HyperEVM Testnet  ->  Elysium']],
        [['k', 'supply    '], ['v', fmt(SUPPLY) + ' NFTs']],
        [['k', 'token     '], ['v', TICKER], ['k', '  (supply ' + (C.TOKEN_SUPPLY || 'TBA') + ')']],
        [['k', 'whitelist '], ['ok', 'OPEN']]
      ] },
      { cmd: 'elyfluff mint --tier gtd', out: [
        [['k', 'price     '], ['v', (C.GTD_MINT_PRICE || '0.33 HYPE') + ' (testnet)']],
        [['k', 'status    '], ['s', C.MINT_LIVE ? 'LIVE' : 'opens after selection']]
      ] },
      { cmd: 'elyfluff mainnet', out: function () { return [[['k', 'elysium   '], ['ok', cd()]]]; } },
      { cmd: 'elyfluff tokenomics', locked: true, out: [
        [['k', 'nft holders  '], ['v', '40%'], ['k', '   token holders '], ['v', '20%']],
        [['k', 'active users '], ['v', '15%'], ['k', '   liquidity     '], ['v', '15%']]
      ] }
    ];
    function line(segs) {
      var d = el('div', 'tl');
      segs.forEach(function (s) { d.appendChild(el('span', s[0], s[1])); });
      box.appendChild(d);
      while (box.children.length > 9) box.removeChild(box.firstChild);
      return d;
    }
    if (reduced) {
      script.slice(0, 2).forEach(function (s) {
        line([['pr', '~ $ '], ['cm', s.cmd]]);
        (typeof s.out === 'function' ? s.out() : s.out).forEach(line);
      });
      return;
    }
    (async function loop() {
      var i = 0;
      while (true) {
        var s = script[i++ % script.length];
        if (s.locked && !isUnlocked()) { s = { cmd: 'cat ./vault', out: [[['k', 'access    '], ['pr', 'LOCKED'], ['k', '  complete 4 tasks to unlock']]] }; }
        var d = line([['pr', '~ $ '], ['cm', '']]);
        var cm = d.lastChild, caret = el('span', 'caret');
        d.appendChild(caret);
        for (var k = 1; k <= s.cmd.length; k++) { cm.textContent = s.cmd.slice(0, k); await sleep(45 + Math.random() * 40); }
        await sleep(280);
        caret.remove();
        var out = typeof s.out === 'function' ? s.out() : s.out;
        for (var j = 0; j < out.length; j++) { line(out[j]); await sleep(110); }
        await sleep(2200);
      }
    })();
  }

  /* ---------- countdown ---------- */
  function countdown() {
    var m = $('#mCountdown');
    function tick() {
      var t = timeLeft();
      if (!t) return;
      var txt = t.live ? 'LIVE' : t.d + 'd ' + pad(t.h, 2) + 'h ' + pad(t.m, 2) + 'm ' + pad(t.s, 2) + 's';
      if (m) m.textContent = txt;
      $$('.lb-cd').forEach(function (e) { e.textContent = t.live ? 'LIVE' : t.d + 'D ' + pad(t.h, 2) + 'H ' + pad(t.m, 2) + 'M'; });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- live HyperEVM testnet block ---------- */
  function blockFeed() {
    var url = C.HYPEREVM_TESTNET_RPC, fails = 0, last = 0, timer;
    var mB = $('#mBlock'), mS = $('#mBlockSub');
    if (!url) { if (mB) mB.textContent = 'Online'; return; }
    async function poll() {
      try {
        var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 6000);
        var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}', signal: ctrl.signal });
        clearTimeout(to);
        var j = await r.json();
        var n = parseInt(j.result, 16);
        if (!isFinite(n)) throw new Error('bad');
        fails = 0;
        if (n !== last) {
          last = n;
          mB.textContent = '#' + fmt(n);
          mB.classList.remove('tick'); void mB.offsetWidth; mB.classList.add('tick');
          mS.textContent = 'Latest block · live';
          $$('.lb-block-n').forEach(function (e) { e.textContent = '#' + fmt(n); });
          $$('.lb-block').forEach(function (e) { e.hidden = false; });
        }
      } catch (e) {
        fails++;
        if (!last) { mB.textContent = 'Testnet'; mS.textContent = 'Network for the test launch'; }
        if (fails > 3) { clearInterval(timer); }
      }
    }
    poll();
    timer = setInterval(function () { if (!document.hidden) poll(); }, 4000);
  }

  /* ---------- procedural fluff (preview art) ---------- */
  var FURS = [
    ['Snow', '#EAF6F3', '#AFC4BF', '#FFFFFF'],
    ['Mint', '#5EE6CF', '#1B8F7E', '#B8FFF1'],
    ['Sky', '#6EC8F5', '#3F8FD0', '#C6EBFF'],
    ['Crimson', '#C42A28', '#7E1414', '#F06A66'],
    ['Ash', '#7C8180', '#4E5352', '#AEB3B2'],
    ['Void', '#26302E', '#151B1A', '#45524F']
  ];
  var EYES = ['Round', 'Sleepy', 'Visor', 'Laser', 'Wide'];
  var ACC = ['None', 'Horns', 'Antenna', 'Halo', 'Headset'];
  var BGS = [['Charcoal', '#171717'], ['Deep Mint', '#0B332D'], ['Night Sky', '#0C2333'], ['Crimson Fog', '#2C0D0D']];
  var AURA = ['Calm', 'Static', 'Glitch', 'Pulse'];

  function drawFluff(ctx, size, seed) {
    var r = mulberry32(seed);
    function pick(a) { return a[Math.floor(r() * a.length)]; }
    var fur = pick(FURS), eyes = pick(EYES), acc = pick(ACC), bg = pick(BGS), aura = pick(AURA);
    var N = 32, px = size / N;
    function g(x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.floor(x * px), Math.floor(y * px), Math.ceil(px), Math.ceil(px)); }
    ctx.fillStyle = bg[1]; ctx.fillRect(0, 0, size, size);
    var bgG = ctx.createRadialGradient(size / 2, size * 0.55, 10, size / 2, size * 0.55, size * 0.7);
    bgG.addColorStop(0, 'rgba(94,230,207,0.16)'); bgG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bgG; ctx.fillRect(0, 0, size, size);
    for (var yy = 2; yy < N; yy += 4) for (var xx = 2; xx < N; xx += 4) g(xx, yy, 'rgba(151,252,228,0.08)');
    var cx = 16, cy = 18.5, R = 10.6, base = fur[1], dark = fur[2], light = fur[3];
    if (aura === 'Pulse') {
      for (var a = 0; a < 64; a++) {
        var ang = a / 64 * Math.PI * 2;
        g(Math.round(cx - 0.5 + Math.cos(ang) * 13.5), Math.round(cy - 0.5 + Math.sin(ang) * 13.5), 'rgba(94,230,207,0.35)');
      }
    }
    for (var x0 = 7; x0 <= 25; x0++) g(x0, 30, 'rgba(0,0,0,0.4)');
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        var dist = Math.sqrt(dx * dx + dy * dy * 1.04);
        var fuzz = R + (r() - 0.5) * 2.4;
        if (dist <= fuzz) {
          var c = base;
          if (dx + dy > 7) c = dark; else if (dx + dy < -9) c = light;
          if (dist > fuzz - 1.2) c = r() < 0.5 ? dark : base;
          g(x, y, c);
        }
      }
    }
    var ink = '#0E1413';
    if (eyes === 'Round') {
      [[11, 15], [19, 15]].forEach(function (p) {
        for (var i = 0; i < 2; i++) for (var j = 0; j < 3; j++) g(p[0] + i, p[1] + j, ink);
        g(p[0], p[1], '#FFFFFF');
      });
    } else if (eyes === 'Sleepy') {
      [[10, 17], [19, 17]].forEach(function (p) { for (var i = 0; i < 3; i++) g(p[0] + i, p[1], ink); g(p[0], p[1] - 1, ink); g(p[0] + 2, p[1] - 1, ink); });
    } else if (eyes === 'Visor') {
      for (var vx = 8; vx <= 23; vx++) { g(vx, 15, COL.sky); g(vx, 16, COL.sky); g(vx, 17, '#3F8FD0'); }
      for (var hx = 10; hx <= 13; hx++) g(hx, 15, '#C6EBFF');
    } else if (eyes === 'Laser') {
      [[11, 15], [19, 15]].forEach(function (p) {
        g(p[0] - 1, p[1], 'rgba(224,74,70,0.45)'); g(p[0] + 2, p[1] + 1, 'rgba(224,74,70,0.45)');
        for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) g(p[0] + i, p[1] + j, COL.crimson2);
        g(p[0], p[1], '#FFD0CF');
      });
    } else {
      [[10, 14], [19, 14]].forEach(function (p) {
        for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) g(p[0] + i, p[1] + j, '#FFFFFF');
        g(p[0] + 1, p[1] + 1, ink); g(p[0] + 1, p[1] + 2, ink);
      });
    }
    g(15, 21, ink); g(16, 21, ink); g(14, 20, ink); g(17, 20, ink);
    [[8, 19], [9, 19], [22, 19], [23, 19]].forEach(function (p) { g(p[0], p[1], 'rgba(224,74,70,0.5)'); });
    if (acc === 'Horns') {
      [[10, 5], [10, 6], [11, 6], [10, 7], [11, 7], [12, 7], [21, 5], [21, 6], [20, 6], [21, 7], [20, 7], [19, 7]].forEach(function (p) { g(p[0], p[1], COL.crimson); });
      g(10, 5, COL.crimson2); g(21, 5, COL.crimson2);
    } else if (acc === 'Antenna') {
      for (var ay = 3; ay <= 7; ay++) g(16, ay, '#8A9190');
      g(15, 1, COL.hyper); g(16, 1, COL.hyper); g(17, 1, COL.hyper); g(15, 2, COL.hyper); g(16, 2, '#B8FFF1'); g(17, 2, COL.hyper);
    } else if (acc === 'Halo') {
      for (var hx2 = 12; hx2 <= 19; hx2++) { g(hx2, 2, COL.sky); g(hx2, 4, '#3F8FD0'); }
      g(11, 3, COL.sky); g(20, 3, COL.sky);
    } else if (acc === 'Headset') {
      for (var bx = 9; bx <= 22; bx++) g(bx, 7, '#1E2524');
      g(8, 8, '#1E2524'); g(23, 8, '#1E2524');
      for (var cy2 = 14; cy2 <= 19; cy2++) { g(5, cy2, COL.crimson); g(6, cy2, COL.crimson); g(25, cy2, COL.crimson); g(26, cy2, COL.crimson); }
      g(24, 21, '#1E2524'); g(23, 22, '#1E2524'); g(22, 22, COL.hyper);
    }
    if (aura === 'Static') {
      for (var n = 0; n < 40; n++) g(Math.floor(r() * N), Math.floor(r() * N), 'rgba(255,255,255,0.18)');
    } else if (aura === 'Glitch') {
      for (var s2 = 0; s2 < 2; s2++) {
        var sy = Math.floor(r() * size * 0.8), sh = 6 + Math.floor(r() * 14), off = Math.floor((r() - 0.5) * 24);
        var slice = ctx.getImageData(0, sy, size, Math.min(sh, size - sy));
        ctx.putImageData(slice, off, sy);
      }
    }
    return { Fur: fur[0], Eyes: eyes, Accessory: acc, Background: bg[0], Aura: aura, Rarity: ['Common', 'Uncommon', 'Rare', 'Epic'][Math.floor(r() * r() * 4)] };
  }

  function coverDraw(ctx, img, S) {
    var ir = img.width / img.height, sw, sh, sx, sy;
    if (ir > 1) { sh = img.height; sw = sh; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, S, S);
  }
  var imgCache = {};
  function loadImg(src) {
    if (imgCache[src]) return imgCache[src];
    imgCache[src] = new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
    return imgCache[src];
  }

  var GLYPHS = '#$%&@01ABCDEF/<>';
  function randStr(n) { var s = ''; for (var i = 0; i < n; i++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0]; return s; }
  function scramble(e, finalText, delay) {
    if (reduced) { e.textContent = finalText; return; }
    var start = performance.now() + (delay || 0), dur = 500;
    function step(now) {
      if (now < start) { e.textContent = randStr(finalText.length); requestAnimationFrame(step); return; }
      var p = Math.min(1, (now - start) / dur), n = Math.floor(p * finalText.length);
      e.textContent = finalText.slice(0, n) + randStr(finalText.length - n);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- scanner ---------- */
  function scanner() {
    var cv = $('#specimen');
    if (!cv) return;
    var ctx = cv.getContext('2d'), S = cv.width;
    var off = document.createElement('canvas'); off.width = off.height = S;
    var octx = off.getContext('2d', { willReadFrequently: true });
    var low = document.createElement('canvas'); low.width = low.height = 20;
    var lctx = low.getContext('2d');
    var imgs = (C.NFT_IMAGES || []).filter(function (x) { return x && x.src; });
    var idx = 0, cur = null, phase = 'wait', t0 = 0, count = 0;
    var SCAN = 2400, HOLD = 2800;
    var tag = $('#scanTag'), fill = $('#roFill');

    async function prepare() {
      if (imgs.length) {
        for (var tries = 0; tries < imgs.length; tries++) {
          var item = imgs[idx++ % imgs.length];
          var im = await loadImg(item.src);
          if (im) {
            octx.clearRect(0, 0, S, S); octx.imageSmoothingEnabled = true;
            coverDraw(octx, im, S);
            return { id: item.id || idx, traits: item.traits || { Class: 'Fluff', Status: 'Verified' } };
          }
        }
      }
      octx.imageSmoothingEnabled = false;
      var id = 1 + Math.floor(Math.random() * SUPPLY);
      return { id: id, traits: drawFluff(octx, S, id * 7919 + 13) };
    }
    function readout(d) {
      $('#roId').textContent = '#' + pad(d.id);
      var ul = $('#roTraits');
      ul.textContent = '';
      Object.keys(d.traits).slice(0, 6).forEach(function (k, i) {
        var li = el('li'); li.appendChild(el('span', null, k));
        var b = el('b'); li.appendChild(b); ul.appendChild(li);
        scramble(b, String(d.traits[k]), 200 + i * 200);
      });
      var rr = mulberry32(d.id * 31 + 7), hex = '';
      for (var i = 0; i < 16; i++) hex += '0123456789abcdef'[(rr() * 16) | 0];
      scramble($('#roSig'), 'sig 0x' + hex + ' · elyfluff', 150);
    }
    async function next() {
      phase = 'wait';
      cur = await prepare();
      lctx.imageSmoothingEnabled = true;
      lctx.clearRect(0, 0, 20, 20);
      lctx.drawImage(off, 0, 0, 20, 20);
      count++;
      $('#roCount').textContent = count;
      tag.textContent = 'SCANNING'; tag.classList.remove('decoded');
      readout(cur);
      t0 = performance.now();
      phase = 'scan';
    }
    function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    function drawScan(p) {
      var y = ease(p) * S;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, S, S);
      ctx.fillStyle = 'rgba(3,18,16,0.66)'; ctx.fillRect(0, 0, S, S);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, S, y); ctx.clip(); ctx.drawImage(off, 0, 0); ctx.restore();
      var gr = ctx.createLinearGradient(0, y - 90, 0, y);
      gr.addColorStop(0, 'rgba(94,230,207,0)'); gr.addColorStop(1, 'rgba(94,230,207,0.34)');
      ctx.fillStyle = gr; ctx.fillRect(0, y - 90, S, 90);
      ctx.fillStyle = COL.hyper2; ctx.fillRect(0, y - 1.5, S, 3);
      ctx.fillStyle = 'rgba(224,74,70,0.9)'; ctx.fillRect(0, y + 5, S, 1.5);
    }
    function glitch() {
      var y = Math.random() * S, h = 4 + Math.random() * 16, dx = (Math.random() - 0.5) * 18;
      ctx.drawImage(off, 0, y, S, h, dx, y, S, h);
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(110,200,245,0.16)' : 'rgba(163,28,27,0.22)';
      ctx.fillRect(0, y, S, h);
    }
    function frame(now) {
      requestAnimationFrame(frame);
      if (!cur || document.hidden || phase === 'wait') return;
      var e = now - t0;
      if (phase === 'scan') {
        var p = Math.min(1, e / SCAN);
        drawScan(p);
        fill.style.width = (p * 100).toFixed(1) + '%';
        if (p >= 1) { phase = 'hold'; t0 = now; tag.textContent = 'DECODED'; tag.classList.add('decoded'); }
      } else if (phase === 'hold') {
        ctx.drawImage(off, 0, 0);
        if (Math.random() < 0.03) glitch();
        if (e > HOLD) next();
      }
    }
    if (reduced) {
      var show = async function () {
        cur = await prepare(); ctx.drawImage(off, 0, 0); readout(cur);
        fill.style.width = '100%'; tag.textContent = 'DECODED'; tag.classList.add('decoded');
        count++; $('#roCount').textContent = count;
      };
      show(); setInterval(show, 4500);
      return;
    }
    next();
    requestAnimationFrame(frame);
  }

  /* ---------- tokenomics ---------- */
  function tokenomics() {
    var list = $('#allocList'), svg = $('#donut');
    if (!list || !svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var alloc = C.ALLOCATION || [], R = 78, CIRC = 2 * Math.PI * R, acc = 0, gap = 2.2;
    var bgc = document.createElementNS(NS, 'circle');
    bgc.setAttribute('cx', 100); bgc.setAttribute('cy', 100); bgc.setAttribute('r', R);
    bgc.setAttribute('stroke', 'rgba(255,255,255,0.05)');
    svg.appendChild(bgc);
    alloc.forEach(function (a, i) {
      var len = CIRC * a.pct / 100;
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'seg');
      c.setAttribute('cx', 100); c.setAttribute('cy', 100); c.setAttribute('r', R);
      c.setAttribute('stroke', a.color);
      c.setAttribute('stroke-dasharray', Math.max(0, len - gap) + ' ' + (CIRC - Math.max(0, len - gap)));
      c.setAttribute('data-off', String(-acc));
      c.setAttribute('stroke-dashoffset', String(-acc));
      c.setAttribute('data-i', i);
      svg.appendChild(c);
      acc += len;

      var row = el('div', 'al-row'); row.setAttribute('data-i', i);
      var l = el('div', 'al-l'); var sw = el('span', 'al-sw'); sw.style.background = a.color;
      l.appendChild(sw); l.appendChild(el('span', null, a.label));
      var p = el('div', 'al-p', a.pct + '%');
      var bar = el('div', 'al-bar'); var f = el('div', 'al-fill');
      f.style.background = 'linear-gradient(90deg,' + a.color + 'aa,' + a.color + ')';
      f.setAttribute('data-w', String(a.pct / 40 * 100));
      bar.appendChild(f);
      row.appendChild(l); row.appendChild(p); row.appendChild(bar);
      list.appendChild(row);
    });
    function hot(i, on) {
      $$('.seg', svg).forEach(function (s) { s.classList.toggle('hot', on && s.getAttribute('data-i') === String(i)); });
      $$('.al-row', list).forEach(function (r) { r.classList.toggle('hot', on && r.getAttribute('data-i') === String(i)); });
    }
    $$('.al-row', list).concat($$('.seg', svg)).forEach(function (n) {
      n.addEventListener('mouseenter', function () { hot(n.getAttribute('data-i'), true); });
      n.addEventListener('mouseleave', function () { hot(null, false); });
      n.addEventListener('click', function () { hot(n.getAttribute('data-i'), true); });
    });
  }
  function showTokenomics(root) {
    $$('.al-fill', root).forEach(function (f) { f.style.width = Math.min(100, Number(f.getAttribute('data-w'))) + '%'; });
  }

  /* ---------- reveal ---------- */
  function reveal() {
    var els = $$('.reveal');
    function show(e) { e.classList.add('in'); showTokenomics(e); }
    if (!('IntersectionObserver' in window) || reduced) { els.forEach(show); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- treasure map roadmap ---------- */
  var CURRENT_PHASE = 0;
  function phases() {
    var price = C.GTD_MINT_PRICE || '0.33 HYPE';
    return [
      { n: 'I', name: 'Whitelist Isle', place: 'Phase 01 · you are here', text: 'The journey starts here. Complete the social tasks and register your wallet.', items: ['Follow, like, repost and comment on X', 'Register your EVM wallet', 'Get your ElyFluff card and invite link'] },
      { n: 'II', name: 'Selection Reef', place: 'Phase 02', text: 'The crew is chosen from everyone who finished the tasks.', items: ['GTD list is selected', 'FCFS list is selected', 'Results are announced on X'] },
      { n: 'III', name: 'HyperEVM Bay', place: 'Phase 03 · testnet launch', text: 'The test launch on HyperEVM Testnet.', items: ['GTD mints the NFT for ' + price, 'FCFS receives testnet ' + TICKER, 'Testnet holders are recorded'] },
      { n: 'IV', name: 'Qualification Pass', place: 'Phase 04', text: 'Only proven holders pass through to mainnet.', items: ['Testnet NFT holders qualify', 'Testnet ' + TICKER + ' holders qualify', 'The mainnet list is locked'] },
      { n: 'V', name: 'Elysium', place: 'The treasure · Nov 9', text: 'Elysium mainnet goes live. The treasure waits here.', items: ['ElyFluff NFT and ' + TICKER + ' launch', '40% of ' + TICKER + ' to NFT holders', '20% to token holders, 15% to Elysium active users'] }
    ];
  }
  var mapSt = { mode: '', sel: CURRENT_PHASE, raf: 0, trail: null };
  function f1(v) { return Math.round(v * 10) / 10; }
  function blob(cx, cy, r, rnd, sx, sy) {
    var n = 11, pts = [], i;
    for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, rr = r * (0.72 + rnd() * 0.45); pts.push([cx + Math.cos(a) * rr * (sx || 1.15), cy + Math.sin(a) * rr * (sy || 0.85)]); }
    var d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ' C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d + 'Z';
  }
  function buildMap(force) {
    var host = $('#tmap');
    if (!host || !host.clientWidth) return;
    var portrait = host.clientWidth < 640, mode = portrait ? 'p' : 'l';
    if (mapSt.mode === mode && !force) return;
    mapSt.mode = mode;
    var W = portrait ? 600 : 1000, H = portrait ? 1000 : 620;
    var P = portrait ? [[150, 850], [430, 690], [175, 505], [430, 330], [290, 235]] : [[140, 455], [335, 240], [525, 440], [710, 215], [880, 400]];
    var R = portrait ? [86, 76, 80, 76, 96] : [82, 74, 78, 74, 92];
    var rnd = mulberry32(portrait ? 91 : 77);
    var INK = '#4A2E14', LAND = '#E6CC92', ph = phases();
    var o = [];
    o.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Treasure map roadmap">');
    o.push('<defs>' +
      '<radialGradient id="tmPaper" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#F4E6C4"/><stop offset=".62" stop-color="#E4CB97"/><stop offset="1" stop-color="#B98F55"/></radialGradient>' +
      '<radialGradient id="tmBurn" cx="50%" cy="50%" r="72%"><stop offset=".62" stop-color="#5A3410" stop-opacity="0"/><stop offset=".9" stop-color="#5A3410" stop-opacity=".35"/><stop offset="1" stop-color="#2E1A08" stop-opacity=".75"/></radialGradient>' +
      '<radialGradient id="tmStain"><stop offset="0" stop-color="#8A5A26" stop-opacity=".16"/><stop offset=".7" stop-color="#8A5A26" stop-opacity=".07"/><stop offset="1" stop-color="#8A5A26" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="tmGold"><stop offset="0" stop-color="#FFE9A0"/><stop offset="1" stop-color="#E2B33C" stop-opacity="0"/></radialGradient>' +
      '<filter id="tmGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .08  0 0 0 .22 0"/></filter>' +
      '<filter id="tmRough"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>' +
      '</defs>');
    o.push('<rect width="' + W + '" height="' + H + '" fill="url(#tmPaper)"/>');
    o.push('<rect width="' + W + '" height="' + H + '" filter="url(#tmGrain)"/>');
    for (var s = 0; s < 6; s++) o.push('<circle cx="' + f1(rnd() * W) + '" cy="' + f1(rnd() * H) + '" r="' + f1(40 + rnd() * 90) + '" fill="url(#tmStain)"/>');
    var gl = '';
    for (var gx = 100; gx < W; gx += 100) gl += 'M' + gx + ' 0V' + H;
    for (var gy = 100; gy < H; gy += 100) gl += 'M0 ' + gy + 'H' + W;
    o.push('<path d="' + gl + '" stroke="' + INK + '" stroke-opacity=".1" stroke-width="1" stroke-dasharray="3 7" fill="none"/>');

    function inSea(x, y, pad) {
      for (var i = 0; i < P.length; i++) { var dx = x - P[i][0], dy = y - P[i][1]; if (dx * dx + dy * dy < Math.pow(R[i] * 1.55 + (pad || 0), 2)) return false; }
      return x > 40 && x < W - 40 && y > 40 && y < H - 40;
    }
    var wv = '';
    for (var w = 0; w < 70 && wv.split('M').length < 26; w++) {
      var wx = 50 + rnd() * (W - 100), wy = 50 + rnd() * (H - 100);
      if (inSea(wx, wy, 10)) wv += 'M' + f1(wx) + ' ' + f1(wy) + 'q7 -7 14 0q7 -7 14 0';
    }
    o.push('<path d="' + wv + '" stroke="' + INK + '" stroke-opacity=".38" stroke-width="2" fill="none" stroke-linecap="round"/>');

    var extra = portrait ? [[515, 520, 34], [80, 330, 30], [520, 880, 28]] : [[470, 110, 30], [85, 170, 34], [640, 560, 28], [960, 140, 26]];
    var isl = '';
    extra.forEach(function (e) {
      var d = blob(e[0], e[1], e[2], rnd);
      isl += '<path d="' + d + '" fill="' + LAND + '" stroke="' + INK + '" stroke-width="2"/>';
    });
    P.forEach(function (p, i) {
      var d = blob(p[0], p[1], R[i], rnd);
      [1.42, 1.22].forEach(function (k, j) {
        isl += '<path d="' + d + '" transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + k + ') translate(' + (-p[0]) + ' ' + (-p[1]) + ')" fill="none" stroke="' + INK + '" stroke-opacity="' + (j ? '.32' : '.18') + '" stroke-width="1.6" stroke-dasharray="' + (j ? '6 6' : '3 8') + '" vector-effect="non-scaling-stroke"/>';
      });
      isl += '<path d="' + d + '" transform="translate(5 7)" fill="#8A5A26" fill-opacity=".28"/>';
      isl += '<path d="' + d + '" fill="' + (i === 4 ? '#EBD49E' : LAND) + '" stroke="' + INK + '" stroke-width="2.6"/>';
      var mts = '';
      for (var m = 0; m < 3; m++) {
        var mx = p[0] + (m - 1) * R[i] * 0.42 + (rnd() - 0.5) * 10, my = p[1] - R[i] * 0.32 + (m === 1 ? -8 : 4);
        mts += 'M' + f1(mx - 13) + ' ' + f1(my + 10) + 'L' + f1(mx) + ' ' + f1(my - 10) + 'L' + f1(mx + 13) + ' ' + f1(my + 10);
        mts += 'M' + f1(mx) + ' ' + f1(my - 10) + 'L' + f1(mx + 4) + ' ' + f1(my + 10);
      }
      isl += '<path d="' + mts + '" stroke="' + INK + '" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linejoin="round"/>';
    });
    o.push('<g filter="url(#tmRough)">' + isl + '</g>');

    var tr = 'M' + P[0][0] + ' ' + P[0][1];
    for (var t = 1; t < P.length; t++) {
      var a0 = P[t - 1], a1 = P[t], mx2 = (a0[0] + a1[0]) / 2, my2 = (a0[1] + a1[1]) / 2;
      var dx = a1[0] - a0[0], dy = a1[1] - a0[1], len = Math.sqrt(dx * dx + dy * dy), k2 = (t % 2 ? 1 : -1) * 70;
      tr += ' Q' + f1(mx2 - dy / len * k2) + ' ' + f1(my2 + dx / len * k2) + ' ' + a1[0] + ' ' + a1[1];
    }
    o.push('<path id="tmTrail" d="' + tr + '" fill="none" stroke="' + INK + '" stroke-width="4" stroke-dasharray="1 13" stroke-linecap="round"/>');
    o.push('<path id="tmDone" d="' + tr + '" fill="none" stroke="#A31C1B" stroke-width="5" stroke-dasharray="16 11" stroke-linecap="round"/>');

    var cp = portrait ? [520, 905] : [88, 100], cr = portrait ? 46 : 52;
    var star = function (r1, r2, n, rot) { var pts = []; for (var i = 0; i < n * 2; i++) { var rr = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; pts.push(f1(Math.sin(a) * rr) + ',' + f1(-Math.cos(a) * rr)); } return pts.join(' '); };
    o.push('<g transform="translate(' + cp[0] + ' ' + cp[1] + ')">' +
      '<circle r="' + cr + '" fill="#EAD7AE" fill-opacity=".6" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle r="' + (cr - 8) + '" fill="none" stroke="' + INK + '" stroke-width="1" stroke-dasharray="2 4"/>' +
      '<polygon points="' + star(cr - 4, cr * 0.22, 4, Math.PI / 4) + '" fill="#C9AE7C" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<polygon points="' + star(cr + 6, cr * 0.2, 4, 0) + '" fill="#3B2412" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<polygon points="0,' + (-cr - 6) + ' 7,-8 -7,-8" fill="#A31C1B"/>' +
      '<circle r="5" fill="#EAD7AE" stroke="' + INK + '" stroke-width="2"/>' +
      '<text y="' + (-cr - 14) + '" text-anchor="middle" class="tm-label" font-size="24">N</text></g>');

    var bn = portrait ? [300, 62, 470] : [520, 62, 460];
    var bx0 = bn[0] - bn[2] / 2, bx1 = bn[0] + bn[2] / 2, by = bn[1];
    o.push('<g>' +
      '<path d="M' + (bx0 - 34) + ' ' + (by - 14) + 'h60v52h-60l18 -26z" fill="#6E1010" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M' + (bx1 + 34) + ' ' + (by - 14) + 'h-60v52h60l-18 -26z" fill="#6E1010" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M' + bx0 + ' ' + (by - 24) + 'Q' + bn[0] + ' ' + (by - 38) + ' ' + bx1 + ' ' + (by - 24) + 'V' + (by + 26) + 'Q' + bn[0] + ' ' + (by + 12) + ' ' + bx0 + ' ' + (by + 26) + 'Z" fill="#A31C1B" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<text x="' + bn[0] + '" y="' + (by + 9) + '" text-anchor="middle" class="tm-title" font-size="' + (portrait ? 32 : 34) + '">The Road to Elysium</text></g>');

    var sp = portrait ? [300, 590] : [420, 575];
    o.push('<g transform="translate(' + sp[0] + ' ' + sp[1] + ')" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round">' +
      '<path d="M0 0q14 -26 28 0M40 0q14 -30 28 0M80 0q12 -22 24 0"/>' +
      '<path d="M104 0q10 -30 26 -28q12 2 8 14" />' +
      '<circle cx="130" cy="-24" r="2.2" fill="' + INK + '" stroke="none"/>' +
      '<path d="M-8 4q24 6 48 0q24 6 48 0q24 6 44 0" stroke-opacity=".4" stroke-width="2"/></g>');
    o.push('<text x="' + (sp[0] + 60) + '" y="' + (sp[1] + (portrait ? -42 : 34)) + '" text-anchor="middle" class="tm-small" font-size="17">here be bears</text>');

    var last = P[4];
    o.push('<circle cx="' + last[0] + '" cy="' + (last[1] - 70) + '" r="70" fill="url(#tmGold)" opacity=".7"/>');
    o.push('<g transform="translate(' + last[0] + ' ' + (last[1] - 64) + ')">' +
      '<rect x="-26" y="-6" width="52" height="30" rx="3" fill="#7A4A1E" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M-26 -6Q-26 -28 0 -28Q26 -28 26 -6Z" fill="#9A5E26" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M-26 6H26M-12 -27V24M12 -27V24" stroke="#E2B33C" stroke-width="3"/>' +
      '<rect x="-5" y="0" width="10" height="11" rx="2" fill="#E2B33C" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path class="glint" d="M-36 -30l3 -9 3 9 9 3 -9 3 -3 9 -3 -9 -9 -3z" fill="#FFE9A0"/>' +
      '<path class="glint g2" d="M30 -38l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2z" fill="#FFE9A0"/>' +
      '<path class="glint g3" d="M34 4l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2z" fill="#FFE9A0"/></g>');

    P.forEach(function (p, i) {
      var sc = i === 4 ? 1.35 : 1, cur = i === CURRENT_PHASE;
      var g = '<g class="tm-x" data-i="' + i + '" transform="translate(' + p[0] + ' ' + p[1] + ')" tabindex="0" role="button" aria-label="' + ph[i].name + '">';
      g += '<circle r="44" fill="transparent"/>';
      if (cur) g += '<circle class="x-pulse" r="22" fill="none" stroke="#A31C1B" stroke-width="3"/>';
      g += '<circle class="x-ring" r="34" fill="none" stroke="#A31C1B" stroke-width="2" stroke-dasharray="5 5" opacity="0"/>';
      g += '<g transform="scale(' + sc + ')"><path d="M-16 -16L16 16M16 -16L-16 16" stroke="#4E0D0D" stroke-width="12" stroke-linecap="round" transform="translate(2 3)" opacity=".35"/>';
      g += '<path class="x-lines" d="M-16 -16L16 16M16 -16L-16 16" stroke="#A31C1B" stroke-width="9" stroke-linecap="round"/></g>';
      var ly = i === 4 ? 66 : 62, fs = portrait ? 30 : 27;
      g += '<text y="' + ly + '" text-anchor="middle" class="tm-label" font-size="' + fs + '">' + ph[i].n + ' · ' + ph[i].name + '</text>';
      var sub = cur ? 'you are here' : (i === 4 ? 'the treasure' : '');
      if (sub) g += '<text y="' + (ly + 24) + '" text-anchor="middle" class="tm-small" font-size="' + (portrait ? 20 : 18) + '">' + sub + '</text>';
      g += '</g>';
      o.push(g);
    });

    o.push('<g id="tmShip"><g id="tmShipIn">' +
      '<path d="M-24 0H24L16 11H-16Z" fill="#4A2E14" stroke="#2A1808" stroke-width="2"/>' +
      '<path d="M0 0V-34" stroke="#2A1808" stroke-width="2.4"/>' +
      '<path d="M2 -32Q22 -18 2 -4Z" fill="#F4E6C4" stroke="#2A1808" stroke-width="2"/>' +
      '<path d="M-2 -30Q-18 -18 -2 -6Z" fill="#EAD7AE" stroke="#2A1808" stroke-width="2"/>' +
      '<path d="M0 -34L12 -30L0 -26Z" fill="#A31C1B"/></g></g>');
    o.push('<rect x="14" y="14" width="' + (W - 28) + '" height="' + (H - 28) + '" rx="10" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-opacity=".7"/>');
    o.push('<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="6" fill="none" stroke="' + INK + '" stroke-width="1" stroke-opacity=".5" stroke-dasharray="4 5"/>');
    o.push('<rect width="' + W + '" height="' + H + '" fill="url(#tmBurn)" pointer-events="none"/>');
    o.push('</svg>');
    host.innerHTML = o.join('');

    var trail = $('#tmTrail', host), done = $('#tmDone', host);
    var total = trail.getTotalLength();
    var seg = total / (P.length - 1);
    var doneLen = CURRENT_PHASE * seg + seg * 0.45;
    var dashes = [], used = 0;
    while (used < doneLen) { dashes.push(Math.min(16, doneLen - used), 11); used += 27; }
    dashes.push(0, total * 2);
    done.style.strokeDasharray = dashes.join(' ');
    mapSt.trail = { el: trail, total: total, end: Math.min(total, doneLen + seg * 0.15) };

    $$('.tm-x', host).forEach(function (x) {
      function pick() { selectPhase(Number(x.getAttribute('data-i'))); }
      x.addEventListener('click', pick);
      x.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    selectPhase(mapSt.sel);
    startShip();
  }
  function startShip() {
    var ship = $('#tmShip'), inner = $('#tmShipIn');
    if (!ship || !mapSt.trail) return;
    cancelAnimationFrame(mapSt.raf);
    var tr = mapSt.trail;
    function place(len, now) {
      var p = tr.el.getPointAtLength(len), q = tr.el.getPointAtLength(Math.min(tr.total, len + 4));
      var flip = q.x < p.x ? -1 : 1, bob = reduced ? 0 : Math.sin(now / 420) * 2.5;
      ship.setAttribute('transform', 'translate(' + f1(p.x) + ' ' + f1(p.y - 18 + bob) + ')');
      inner.setAttribute('transform', 'scale(' + flip + ' 1) rotate(' + f1(Math.sin(now / 600) * 3) + ')');
    }
    if (reduced) { place(tr.end, 0); return; }
    var DUR = 9000;
    function frame(now) {
      mapSt.raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      var t = (now % (DUR * 2)) / DUR;
      var k = t <= 1 ? t : 2 - t;
      k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      place(tr.end * k, now);
    }
    mapSt.raf = requestAnimationFrame(frame);
  }
  function selectPhase(i) {
    mapSt.sel = i;
    var ph = phases()[i], box = $('#tmDetail');
    $$('.tm-x').forEach(function (x) { x.classList.toggle('sel', Number(x.getAttribute('data-i')) === i); });
    if (!box) return;
    box.textContent = '';
    var tabs = el('div', 'tm-tabs');
    phases().forEach(function (p, k) {
      var b = el('button', 'tm-tab' + (k === i ? ' sel' : '') + (k === CURRENT_PHASE ? ' cur' : ''), p.n);
      b.type = 'button'; b.setAttribute('aria-label', p.name);
      b.addEventListener('click', function () { selectPhase(k); });
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    var st = i === CURRENT_PHASE ? ['pill pill-red tm-status', 'LIVE NOW'] : (i === 4 ? ['pill pill-hyper tm-status', 'THE TREASURE'] : ['pill pill-soft tm-status', i < CURRENT_PHASE ? 'COMPLETE' : 'UPCOMING']);
    var pill = el('span', st[0]);
    if (i === CURRENT_PHASE) pill.appendChild(el('span', 'pulse-dot'));
    pill.appendChild(document.createTextNode(st[1]));
    box.appendChild(pill);
    box.appendChild(el('h3', 'tm-name', ph.n + ' · ' + ph.name));
    box.appendChild(el('p', 'tm-place', ph.place));
    box.appendChild(el('p', 'tm-text', ph.text));
    var ul = el('ul', 'tm-list');
    ph.items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    box.appendChild(ul);
    box.appendChild(el('p', 'tm-foot mono', 'Tap any X on the map to explore that stop.'));
  }

  /* ---------- launchpad ---------- */
  function launchpad() {
    var g = $('#btnMintGtd'), f = $('#btnClaimFcfs');
    if (C.MINT_LIVE) {
      g.disabled = !C.GTD_MINT_URL; f.disabled = !C.FCFS_CLAIM_URL;
      g.lastElementChild.textContent = 'Mint now';
      f.lastElementChild.textContent = 'Claim now';
      $$('[data-mint-status]').forEach(function (p) { p.textContent = 'LIVE'; p.closest('.mint-card').classList.add('live'); });
      g.addEventListener('click', function () { openUrl(C.GTD_MINT_URL); });
      f.addEventListener('click', function () { openUrl(C.FCFS_CLAIM_URL); });
    }
    var out = $('#checkOut'), inp = $('#inCheck'), btn = $('#btnCheck');
    async function check() {
      var u = parseUsername(inp.value);
      out.className = 'check-out mono';
      if (!u) { out.textContent = 'Enter a valid X username.'; return; }
      btn.classList.add('busy');
      out.textContent = '> checking @' + u + ' ...';
      var res = null;
      if (DEMO) { await sleep(700); res = { ok: true, status: 'PENDING' }; }
      else {
        try { var r = await fetch(C.SCRIPT_URL + '?action=check&u=' + encodeURIComponent(u), { redirect: 'follow' }); res = await r.json(); }
        catch (e) { res = { ok: false }; }
      }
      btn.classList.remove('busy');
      if (!res || !res.ok) { out.textContent = 'Could not check right now. Try again.'; return; }
      var s = res.status;
      if (s === 'GTD') { out.classList.add('gtd'); out.textContent = '@' + u + ' is selected for GTD. You can mint the testnet NFT.'; }
      else if (s === 'FCFS') { out.classList.add('fcfs'); out.textContent = '@' + u + ' is selected for FCFS. You will receive testnet ' + TICKER + '.'; }
      else if (s === 'PENDING') { out.classList.add('ok'); out.textContent = '@' + u + ' completed all tasks. Selection is pending.'; }
      else if (s === 'IN_PROGRESS') { out.textContent = '@' + u + ' has not finished all tasks yet.'; }
      else { out.textContent = '@' + u + ' is not on the list yet. Complete the whitelist tasks.'; }
    }
    btn.addEventListener('click', check);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
  }

  /* ---------- live stats, feed, leaderboard ---------- */
  function liveStats() {
    var feed = $('#feed'), board = $('#board');
    function emptyFeed() {
      feed.textContent = '';
      var li = el('li', 'empty'); li.appendChild(el('b', null, 'Be the first to join'));
      li.appendChild(document.createTextNode('New whitelist entries appear here live.'));
      feed.appendChild(li);
    }
    function emptyBoard() {
      board.textContent = '';
      var li = el('li', 'empty'); li.appendChild(el('b', null, 'No inviters yet'));
      li.appendChild(document.createTextNode('Share your invite link after you join.'));
      board.appendChild(li);
    }
    emptyFeed(); emptyBoard();
    if (DEMO) return;
    var lastKey = '';
    async function poll() {
      try {
        var r = await fetch(C.SCRIPT_URL + '?action=stats', { redirect: 'follow' });
        var j = await r.json();
        if (!j || !j.ok) return;
        var n = Number(j.count) || 0;
        var mA = $('#mApps');
        if (mA.textContent !== fmt(n)) { mA.textContent = fmt(n); mA.classList.remove('tick'); void mA.offsetWidth; mA.classList.add('tick'); }
        $('#mAppsSub').textContent = n > 0 ? 'Completed all tasks · live' : 'Be one of the first';
        if (n > 0) {
          $$('.lb-apps-n').forEach(function (e) { e.textContent = fmt(n); });
          $$('.lb-apps').forEach(function (e) { e.hidden = false; });
        }
        var recent = Array.isArray(j.recent) ? j.recent : [];
        var key = recent.map(function (x) { return x.u + x.t; }).join('|');
        if (key !== lastKey) {
          lastKey = key;
          if (!recent.length) emptyFeed();
          else {
            feed.textContent = '';
            recent.slice(0, 7).forEach(function (x) {
              var li = el('li');
              li.appendChild(el('span', 'f-av', String(x.u || '?').charAt(0).toUpperCase()));
              var u = el('span', 'f-u'); u.appendChild(document.createTextNode('@' + x.u + ' ')); u.appendChild(el('em', null, 'joined the whitelist'));
              li.appendChild(u);
              var t = el('span', 'f-t', ago(x.t)); t.setAttribute('data-t', x.t);
              li.appendChild(t);
              feed.appendChild(li);
            });
          }
        } else {
          $$('.f-t', feed).forEach(function (t) { t.textContent = ago(Number(t.getAttribute('data-t'))); });
        }
        var top = Array.isArray(j.top) ? j.top : [];
        if (!top.length) emptyBoard();
        else {
          board.textContent = '';
          top.slice(0, 7).forEach(function (x, i) {
            var li = el('li');
            li.appendChild(el('span', 'rank', String(i + 1)));
            li.appendChild(el('span', 'f-u', '@' + x.u));
            li.appendChild(el('span', 'n', x.n + (x.n === 1 ? ' invite' : ' invites')));
            board.appendChild(li);
          });
        }
      } catch (e) {}
    }
    poll();
    setInterval(function () { if (!document.hidden) poll(); }, 20000);
  }

  /* ---------- api ---------- */
  async function api(action, data) {
    var body = Object.assign({ action: action }, data);
    if (DEMO) {
      await sleep(800);
      var steps = { follow: 2, engage: 3, comment: 4, wallet: 5 };
      return { ok: true, step: steps[action], applicantId: WL.applicantId || ('EF-' + pad(1 + Math.floor(Math.random() * 999), 5)) };
    }
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 20000);
    try {
      var res = await fetch(C.SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow'
      });
      return await res.json();
    } catch (e) {
      return { ok: false, error: 'Network error. Please try again.' };
    } finally { clearTimeout(to); }
  }

  /* ---------- whitelist ---------- */
  var WL_KEY = 'ef_wl_v2';
  var WL = Object.assign({ step: 1, username: '', opened: {}, comment: '', wallet: '', applicantId: '' }, store.get(WL_KEY) || {});
  if (!WL.opened) WL.opened = {};
  function save() { store.set(WL_KEY, WL); }
  var USER_RE = /^[A-Za-z0-9_]{1,15}$/;
  var WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
  var REPLY_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})(?:[/?#].*)?$/i;
  var REF_RE = /^EF-\d{5}$/;
  function postId() { var m = String(C.TASK_POST_URL || '').match(/status\/(\d+)/); return m ? m[1] : ''; }
  function parseUsername(v) {
    v = String(v || '').trim();
    var m = v.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
    if (m) v = m[1];
    v = v.replace(/^@+/, '');
    return USER_RE.test(v) ? v : '';
  }
  function siteBase() {
    var s = String(C.SITE_URL || '').replace(/\/+$/, '');
    return s || (location.origin + location.pathname).replace(/\/index\.html$/, '');
  }
  function refLink() { return siteBase() + '/?ref=' + encodeURIComponent(WL.applicantId || ''); }
  (function captureRef() {
    try {
      var r = new URLSearchParams(location.search).get('ref');
      if (r && REF_RE.test(r.toUpperCase())) store.set('ef_ref', r.toUpperCase());
    } catch (e) {}
  })();

  var logEl;
  function log(msg, type) {
    if (!logEl) return;
    var row = el('div', 'log-line ' + (type || ''), '[' + new Date().toTimeString().slice(0, 8) + '] ' + msg);
    logEl.appendChild(row);
    while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function render() {
    for (var i = 1; i <= 4; i++) {
      var t = $('#task' + i);
      t.classList.toggle('locked', i > WL.step);
      t.classList.toggle('active', i === WL.step);
      t.classList.toggle('done', i < WL.step);
      t.querySelector('[data-state]').textContent = i < WL.step ? 'Verified' : (i === WL.step ? 'Active' : 'Locked');
    }
    $$('#wlSegs i').forEach(function (seg, k) {
      seg.classList.toggle('on', k + 1 < WL.step);
      seg.classList.toggle('cur', k + 1 === WL.step);
    });
    $('#wlPText').textContent = WL.step >= 5 ? 'Complete' : ('Step ' + WL.step + ' of 4');
    $('#task1 .task-note').textContent = WL.username ? 'verified as @' + WL.username : '';
    $('#task2 .task-note').textContent = 'like and repost recorded';
    $('#task3 .task-note').textContent = WL.comment ? WL.comment : 'comment recorded';
    $('#task4 .task-note').textContent = WL.wallet ? shortWallet(WL.wallet) : 'wallet registered';
    $('#wlReset').hidden = WL.step <= 1 && !WL.username;
    var map = { follow: '#btnFollow', like: '#btnLike', repost: '#btnRepost', reply: '#btnReply' };
    Object.keys(map).forEach(function (k) { $(map[k]).classList.toggle('opened', !!WL.opened[k]); });
    $('#btnV1').disabled = !WL.opened.follow;
    $('#btnV2').disabled = !(WL.opened.like && WL.opened.repost);
    $('#btnV3').disabled = !WL.opened.reply;
    if (WL.step >= 5) {
      $('#wlResult').hidden = false;
      $('#refCode').textContent = WL.applicantId || 'EF-00000';
      drawCard();
      unlockVault(false);
    } else { $('#wlResult').hidden = true; }
  }

  function openX(url, key) {
    openUrl(url);
    WL.opened[key] = Date.now();
    save();
    log('opened ' + key + ' on X', 'cmd');
    render();
  }
  function tooSoon(key) {
    var at = WL.opened[key] || 0;
    var left = Math.ceil(MIN_SEC - (Date.now() - at) / 1000);
    if (left > 0) { log('finish the task on X first. try again in ' + left + 's', 'err'); return true; }
    return false;
  }
  async function busy(btn, fn) {
    btn.classList.add('busy');
    try { await fn(); } finally { btn.classList.remove('busy'); }
  }
  function applyResp(resp, nextStep) {
    if (resp.applicantId) WL.applicantId = resp.applicantId;
    if (resp.wallet) WL.wallet = resp.wallet;
    if (resp.comment) WL.comment = resp.comment;
    WL.step = Math.max(WL.step, resp.step || nextStep);
    save(); render();
  }
  async function pasteInto(input, label) {
    try {
      var t = await navigator.clipboard.readText();
      if (!t) throw new Error('empty');
      input.value = t.trim();
      log(label + ' pasted', 'ok');
    } catch (e) {
      input.focus();
      log('could not read clipboard. long-press the box and tap Paste.', 'err');
    }
  }

  var vaultOpen = false;
  function isUnlocked() { return WL.step >= 5 || !!store.get('ef_unlocked'); }
  function unlockVault(announce) {
    if (vaultOpen) return;
    vaultOpen = true;
    document.body.classList.add('unlocked');
    var lk = $('#locked'), v = $('#vault');
    if (lk) lk.hidden = true;
    if (v) v.hidden = false;
    $$('.gated').forEach(function (a) { a.hidden = false; });
    $$('.nl-lock').forEach(function (e) { e.textContent = 'open'; });
    $$('.lock-link').forEach(function (a) { a.setAttribute('href', '#vault'); });
    requestAnimationFrame(function () { buildMap(true); });
    if (announce) {
      var vo = $('#vaultOpen');
      if (vo) { vo.classList.add('unlock-flash'); }
    }
  }
  function restoreAccess() {
    var inp = $('#inRestore'), out = $('#restoreOut'), btn = $('#btnRestore');
    if (!inp) return;
    async function go() {
      var u = parseUsername(inp.value);
      out.className = 'restore-out mono';
      if (!u) { out.classList.add('err'); out.textContent = 'Enter a valid X username.'; return; }
      btn.classList.add('busy');
      out.textContent = '> checking @' + u + ' ...';
      var res = null;
      if (DEMO) { await sleep(700); res = { ok: true, status: 'PENDING' }; }
      else {
        try { var r = await fetch(C.SCRIPT_URL + '?action=check&u=' + encodeURIComponent(u), { redirect: 'follow' }); res = await r.json(); }
        catch (e) { res = { ok: false }; }
      }
      btn.classList.remove('busy');
      if (!res || !res.ok) { out.classList.add('err'); out.textContent = 'Could not check right now. Try again.'; return; }
      if (res.status === 'PENDING' || res.status === 'GTD' || res.status === 'FCFS') {
        store.set('ef_unlocked', u);
        out.classList.add('ok'); out.textContent = 'Access restored for @' + u + '.';
        unlockVault(true);
        setTimeout(function () { var v = $('#vault'); if (v) v.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, 200);
      } else if (res.status === 'IN_PROGRESS') {
        out.classList.add('err'); out.textContent = '@' + u + ' has not finished all tasks yet.';
      } else {
        out.classList.add('err'); out.textContent = '@' + u + ' is not on the list. Complete the tasks first.';
      }
    }
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  function whitelist() {
    logEl = $('#wlLog');
    if (!logEl) return;
    if (DEMO) $('#demoFlag').hidden = false;
    var pid = postId(), h = handle();
    if (WL.username) $('#inUser').value = WL.username;

    $('#btnFollow').addEventListener('click', function () { openX('https://x.com/intent/follow?screen_name=' + encodeURIComponent(h), 'follow'); });
    $('#btnLike').addEventListener('click', function () { openX('https://x.com/intent/like?tweet_id=' + pid, 'like'); });
    $('#btnRepost').addEventListener('click', function () { openX('https://x.com/intent/retweet?tweet_id=' + pid, 'repost'); });
    $('#btnReply').addEventListener('click', function () { openX('https://x.com/intent/tweet?in_reply_to=' + pid, 'reply'); });
    $('#btnPaste').addEventListener('click', function () { pasteInto($('#inComment'), 'reply link'); });
    $('#btnPasteW').addEventListener('click', function () { pasteInto($('#inWallet'), 'wallet'); });

    $('#btnV1').addEventListener('click', function () {
      var btn = this, u = parseUsername($('#inUser').value);
      if (!u) { log('invalid X username. use letters, numbers or _ (max 15).', 'err'); $('#inUser').focus(); return; }
      if (tooSoon('follow')) return;
      busy(btn, async function () {
        log('$ verify --follow @' + u, 'cmd');
        var ref = store.get('ef_ref') || '';
        var resp = await api('follow', { username: u, ref: ref });
        if (!resp || !resp.ok) { log('error: ' + ((resp && resp.error) || 'unknown error'), 'err'); return; }
        WL.username = u;
        log(resp.step && resp.step > 2 ? 'welcome back @' + u + '. progress restored.' : 'follow recorded. task 01 verified.', 'ok');
        applyResp(resp, 2);
      });
    });
    $('#btnV2').addEventListener('click', function () {
      var btn = this;
      if (tooSoon('like') || tooSoon('repost')) return;
      busy(btn, async function () {
        log('$ verify --like --repost', 'cmd');
        var resp = await api('engage', { username: WL.username });
        if (!resp || !resp.ok) { log('error: ' + ((resp && resp.error) || 'unknown error'), 'err'); return; }
        log('like and repost recorded. task 02 verified.', 'ok');
        applyResp(resp, 3);
      });
    });
    $('#btnV3').addEventListener('click', function () {
      var btn = this, v = String($('#inComment').value || '').trim(), m = v.match(REPLY_RE);
      if (!m) { log('paste the link of your reply on X.', 'err'); return; }
      if (m[1].toLowerCase() !== WL.username.toLowerCase()) { log('this reply is not from @' + WL.username + '.', 'err'); return; }
      if (m[2] === postId()) { log('that is our post. paste the link of your own reply.', 'err'); return; }
      if (tooSoon('reply')) return;
      var clean = 'https://x.com/' + m[1] + '/status/' + m[2];
      busy(btn, async function () {
        log('$ verify --comment ' + m[2], 'cmd');
        var resp = await api('comment', { username: WL.username, commentUrl: clean });
        if (!resp || !resp.ok) { log('error: ' + ((resp && resp.error) || 'unknown error'), 'err'); return; }
        WL.comment = clean;
        log('comment recorded. task 03 verified.', 'ok');
        applyResp(resp, 4);
      });
    });
    $('#btnV4').addEventListener('click', function () {
      var btn = this, w = String($('#inWallet').value || '').trim();
      if (!WALLET_RE.test(w)) { log('invalid wallet. it starts with 0x and has 42 characters.', 'err'); return; }
      var hp = $('#inHp').value;
      busy(btn, async function () {
        log('$ register --wallet ' + shortWallet(w), 'cmd');
        var resp = await api('wallet', { username: WL.username, wallet: w, website: hp });
        if (!resp || !resp.ok) { log('error: ' + ((resp && resp.error) || 'unknown error'), 'err'); return; }
        WL.wallet = w;
        log('entry saved. applicant id ' + (resp.applicantId || WL.applicantId) + '.', 'ok');
        log('vault unlocked. roadmap, tokenomics and launchpad are open.', 'ok');
        applyResp(resp, 5);
        unlockVault(true);
        setTimeout(function () { $('#wlResult').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, 250);
      });
    });

    $('#btnDownload').addEventListener('click', downloadCard);
    $('#btnShare').addEventListener('click', function () {
      var text = 'I just joined the ' + (C.PROJECT_NAME || 'ElyFluff') + ' whitelist.\n\n' +
        fmt(SUPPLY) + ' NFTs + ' + TICKER + '. Testnet on HyperEVM, mainnet on Elysium.\n\nJoin with my invite: ' + refLink() + '\n\n@' + h;
      openUrl('https://x.com/intent/tweet?text=' + encodeURIComponent(text));
    });
    $('#btnCopyRef').addEventListener('click', async function () {
      var b = this, link = refLink();
      try { await navigator.clipboard.writeText(link); b.textContent = 'Copied'; log('invite link copied.', 'ok'); }
      catch (e) { b.textContent = 'Copy failed'; log(link, 'cmd'); }
      setTimeout(function () { b.textContent = 'Copy invite link'; }, 1800);
    });
    $('#wlReset').addEventListener('click', function () {
      store.del(WL_KEY);
      WL = { step: 1, username: '', opened: {}, comment: '', wallet: '', applicantId: '' };
      $('#inUser').value = ''; $('#inComment').value = ''; $('#inWallet').value = '';
      logEl.textContent = '';
      store.del('ef_unlocked');
      location.hash = '';
      location.reload();
    });
    log(WL.step >= 5 ? 'welcome back. your card is ready.' : 'whitelist terminal ready. complete each task in order.', 'cmd');
    render();
  }

  /* ---------- social card ---------- */
  var cardBusy = false;
  async function drawCard() {
    var cv = $('#card');
    if (!cv || cardBusy) return;
    cardBusy = true;
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([
          document.fonts.load('800 80px "Geist"'), document.fonts.load('600 30px "Geist"'),
          document.fonts.load('500 20px "Geist Mono"'), document.fonts.load('600 28px "Geist Mono"')
        ]).catch(function () {});
      }
      var x = cv.getContext('2d'), W = 1200, H = 675;
      var user = WL.username || 'anon', seed = hashStr(user.toLowerCase());
      var lg = x.createLinearGradient(0, 0, W, H);
      lg.addColorStop(0, '#062F2A'); lg.addColorStop(0.55, '#041A17'); lg.addColorStop(1, '#1E0808');
      x.fillStyle = lg; x.fillRect(0, 0, W, H);
      function glow(cx, cy, r, c) { var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
      glow(980, 120, 520, 'rgba(94,230,207,0.32)');
      glow(1150, 650, 420, 'rgba(163,28,27,0.45)');
      glow(80, 620, 380, 'rgba(110,200,245,0.12)');
      x.fillStyle = 'rgba(151,252,228,0.09)';
      for (var gx = 24; gx < W; gx += 28) for (var gy = 24; gy < H; gy += 28) x.fillRect(gx, gy, 1.5, 1.5);

      function rr(px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
      rr(20, 20, W - 40, H - 40, 28); x.strokeStyle = 'rgba(94,230,207,0.45)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = COL.crimson; rr(20, 20, 10, H - 40, 5); x.fill();

      function txt(s, px, py, font, color, ls) {
        x.font = font; x.fillStyle = color;
        if ('letterSpacing' in x) x.letterSpacing = (ls || 0) + 'px';
        x.fillText(s, px, py);
        if ('letterSpacing' in x) x.letterSpacing = '0px';
      }
      function fit(s, maxW, size, weight, fam) { var f; do { f = weight + ' ' + size + 'px ' + fam; x.font = f; size -= 2; } while (x.measureText(s).width > maxW && size > 20); return f; }
      x.textBaseline = 'alphabetic';

      var lx = 72;
      x.fillStyle = COL.hyper; rr(lx, 64, 36, 36, 10); x.fill();
      x.fillStyle = '#062A26'; x.fillRect(lx + 10, 78, 5, 8); x.fillRect(lx + 21, 78, 5, 8);
      x.fillStyle = COL.crimson; x.beginPath(); x.arc(lx + 36, 66, 7, 0, Math.PI * 2); x.fill();
      txt('ElyFluff', lx + 50, 93, '700 30px "Geist", sans-serif', '#FFFFFF', -0.5);

      x.fillStyle = 'rgba(163,28,27,0.85)'; rr(lx, 130, 268, 38, 19); x.fill();
      x.fillStyle = '#FF8A86'; x.beginPath(); x.arc(lx + 22, 149, 5, 0, Math.PI * 2); x.fill();
      txt('WHITELIST ACCESS', lx + 38, 155, '600 17px "Geist Mono", monospace', '#FFFFFF', 2);

      var ht = '@' + user;
      var hg = x.createLinearGradient(0, 220, 0, 290);
      hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(1, COL.hyper2);
      x.font = fit(ht, 600, 76, '800', '"Geist", sans-serif'); x.fillStyle = hg;
      if ('letterSpacing' in x) x.letterSpacing = '-2px';
      x.fillText(ht, lx, 290);
      if ('letterSpacing' in x) x.letterSpacing = '0px';

      function field(label, value, px, py, color) {
        txt(label, px, py, '500 15px "Geist Mono", monospace', 'rgba(163,194,188,0.85)', 2);
        txt(value, px, py + 38, '600 28px "Geist Mono", monospace', color || '#EAFBF7', 0);
      }
      field('APPLICANT ID', WL.applicantId || 'EF-00000', lx, 350, COL.hyper2);
      field('WALLET', shortWallet(WL.wallet) || '0x...', lx + 300, 350);
      field('NETWORK', 'HyperEVM Testnet  >  Elysium', lx, 450, COL.sky);

      var bx = 744, by = 86, bs = 384;
      var sp = document.createElement('canvas'); sp.width = sp.height = bs;
      var spx = sp.getContext('2d', { willReadFrequently: true });
      var imgs = (C.NFT_IMAGES || []).filter(function (i) { return i && i.src; });
      var specId = 1 + (seed % SUPPLY), drawn = false;
      if (imgs.length) {
        var item = imgs[seed % imgs.length], im = await loadImg(item.src);
        if (im) { coverDraw(spx, im, bs); drawn = true; specId = item.id || specId; }
      }
      if (!drawn) drawFluff(spx, bs, seed);
      x.save(); x.shadowColor = 'rgba(94,230,207,0.45)'; x.shadowBlur = 50;
      rr(bx - 10, by - 10, bs + 20, bs + 20, 26); x.fillStyle = 'rgba(3,18,16,0.9)'; x.fill(); x.restore();
      x.save(); rr(bx, by, bs, bs, 18); x.clip(); x.drawImage(sp, bx, by); x.restore();
      rr(bx - 10, by - 10, bs + 20, bs + 20, 26); x.strokeStyle = 'rgba(94,230,207,0.6)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = 'rgba(3,18,16,0.82)'; rr(bx + 14, by + bs - 50, 170, 36, 10); x.fill();
      txt('#' + pad(specId) + ' / ' + fmt(SUPPLY), bx + 28, by + bs - 25, '600 16px "Geist Mono", monospace', COL.hyper2, 1);

      x.strokeStyle = 'rgba(94,230,207,0.2)'; x.lineWidth = 1; x.beginPath(); x.moveTo(lx, 540); x.lineTo(W - 72, 540); x.stroke();
      txt(TICKER + '  ·  ' + fmt(SUPPLY) + ' NFTs  ·  40% to holders', lx, 590, '600 20px "Geist Mono", monospace', '#EAFBF7', 1);
      txt('INVITE  ' + (WL.applicantId || 'EF-00000') + '   ·   STATUS  PENDING SELECTION', lx, 622, '500 15px "Geist Mono", monospace', 'rgba(163,194,188,0.85)', 1.5);
      x.textAlign = 'right';
      txt(new Date().toISOString().slice(0, 10), W - 72, 622, '500 15px "Geist Mono", monospace', 'rgba(163,194,188,0.85)', 1.5);
      x.textAlign = 'left';
    } finally { cardBusy = false; }
  }
  function downloadCard() {
    var cv = $('#card');
    if (!cv) return;
    cv.toBlob(function (b) {
      if (!b) { log('could not create the image. try again.', 'err'); return; }
      var u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = 'elyfluff-card-' + (WL.username || 'holder') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
      log('card downloaded.', 'ok');
    }, 'image/png');
  }

  /* ---------- agent ---------- */
  function kb() {
    var p = C.GTD_MINT_PRICE || '0.33 HYPE', hx = '@' + handle();
    var t = timeLeft();
    var cdTxt = !t ? 'on Nov 9' : (t.live ? 'now live' : 'in ' + t.d + ' days and ' + t.h + ' hours (Nov 9)');
    return [
      { k: ['hi', 'hello', 'hey', 'gm', 'yo', 'sup'], a: 'Hey! I am the ElyFluff assistant. Ask me about the whitelist, GTD and FCFS, the testnet mint, tokenomics or the roadmap.' },
      { k: ['what', 'about', 'elyfluff', 'project', 'explain', 'is'], a: 'ElyFluff is a ' + fmt(SUPPLY) + '-piece NFT collection paired with the ' + TICKER + ' token, built for the Elysium mainnet.\n\nIt launches first on HyperEVM Testnet. Wallets that hold the testnet NFT or testnet ' + TICKER + ' qualify for Elysium mainnet.' },
      { k: ['whitelist', 'wl', 'join', 'apply', 'how', 'task', 'tasks', 'qualify', 'eligible'], a: 'To join the whitelist, complete 4 tasks in the Whitelist section:\n\n1. Follow ' + hx + ' on X\n2. Like and repost our post\n3. Comment on the post and paste your reply link\n4. Register your EVM wallet\n\nThen you get your ElyFluff card and an invite link.' },
      { k: ['gtd', 'guaranteed', 'guarantee'], a: 'GTD means guaranteed. GTD wallets are selected from people who complete the tasks. They can mint the ElyFluff testnet NFT on HyperEVM Testnet for ' + p + '.' },
      { k: ['fcfs', 'first', 'come', 'served'], a: 'FCFS means first come, first served. FCFS wallets are selected from task completers and receive testnet ' + TICKER + ' by claim or distribution.' },
      { k: ['difference', 'vs', 'versus', 'compare', 'gtd', 'fcfs'], a: 'GTD: guaranteed testnet NFT mint for ' + p + '.\nFCFS: testnet ' + TICKER + ' by claim or distribution.\n\nBoth are picked from people who complete all whitelist tasks, and both lead to Elysium mainnet.' },
      { k: ['mint', 'price', 'cost', 'hype', 'pay', 'minting'], a: 'The GTD testnet mint costs ' + p + ' on HyperEVM Testnet. ' + (C.MINT_LIVE ? 'The mint is live now in the Testnet launchpad section.' : 'Minting opens after the selection is announced on X.') },
      { k: ['token', 'fluff', 'ticker', 'supply', 'coin'], a: 'The token is ' + TICKER + '. The total supply is ' + (C.TOKEN_SUPPLY || 'TBA') + ' and will be announced later.' },
      { k: ['tokenomics', 'allocation', 'distribution', 'split', 'percent', 'share'], a: TICKER + ' allocation:\n\n40% NFT holders\n20% token holders\n15% Elysium active users\n15% liquidity\n5% team\n5% vault (marketing)' },
      { k: ['mainnet', 'elysium', 'launch', 'date', 'when', 'live', 'time'], a: 'Elysium mainnet goes live ' + cdTxt + '. ElyFluff NFT and ' + TICKER + ' launch there after the HyperEVM Testnet phase.' },
      { k: ['testnet', 'hyperevm', 'hyperliquid', 'network', 'chain', 'faucet'], a: 'The test launch runs on HyperEVM Testnet. GTD mints the NFT there for ' + p + ' (test HYPE). You can get test HYPE from the official Hyperliquid testnet faucet.' },
      { k: ['selection', 'selected', 'announce', 'result', 'winner', 'status', 'check'], a: 'Selections for GTD and FCFS are announced on X (' + hx + '). You can also check your status in the Testnet launchpad section with your X username.' },
      { k: ['referral', 'invite', 'ref', 'leaderboard', 'friends', 'code'], a: 'After you finish the tasks you get an invite link. When friends join with it and finish all tasks, they count for you on the Top inviters leaderboard.' },
      { k: ['card', 'social', 'image', 'download'], a: 'When you finish all 4 tasks, the site creates your ElyFluff card. You can download it and share it on X.' },
      { k: ['wallet', 'seed', 'phrase', 'private', 'key', 'safe', 'scam', 'dm', 'security'], a: 'Stay safe: we never ask for your seed phrase or private key, and we never DM you first. Only trust ' + hx + ' and this website. You only need to enter your public wallet address.' },
      { k: ['roadmap', 'phase', 'plan', 'next', 'steps'], a: 'Roadmap:\n\n1. Whitelist tasks (live now)\n2. Selection of GTD and FCFS\n3. HyperEVM Testnet launch\n4. Mainnet qualification\n5. Elysium mainnet launch' },
      { k: ['team', 'founder', 'dev'], a: 'The team allocation is 5% of ' + TICKER + '. Follow ' + hx + ' on X for team updates.' },
      { k: ['vault', 'marketing'], a: 'The vault holds 5% of ' + TICKER + ' and is used for marketing.' },
      { k: ['liquidity', 'lp', 'pool'], a: '15% of ' + TICKER + ' is set aside for liquidity.' },
      { k: ['nft', 'collection', 'art', 'fluffs', 'traits'], a: 'The ElyFluff collection has ' + fmt(SUPPLY) + ' NFTs. NFT holders receive 40% of the ' + TICKER + ' supply, the largest share.' },
      { k: ['value', 'worth', 'profit', 'pump', 'moon', 'investment'], a: 'Testnet assets have no monetary value, and I cannot give price predictions. The testnet phase decides who qualifies for Elysium mainnet.' },
      { k: ['x', 'twitter', 'contact', 'social', 'follow', 'support'], a: 'Our official X account is ' + hx + '. Follow it for every update and announcement.' }
    ];
  }
  var SECRET = ['tokenomics', 'allocation', 'distribution', 'split', 'percent', 'share', 'roadmap', 'phase', 'plan', 'next', 'steps', 'team', 'founder', 'dev', 'vault', 'marketing', 'liquidity', 'lp', 'pool'];
  function localAnswer(q) {
    var words = q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    var best = null, score = 0;
    kb().forEach(function (e, i) {
      var s = 0;
      words.forEach(function (w) { if (e.k.indexOf(w) !== -1) s += (w.length > 3 ? 2 : 1); });
      if (i === 1) s -= 1;
      if (s > score) { score = s; best = e; }
    });
    if (best && score > 0) {
      if (!isUnlocked() && best.k.some(function (k) { return SECRET.indexOf(k) !== -1; })) {
        return 'That is inside the ElyFluff vault. Complete the 4 whitelist tasks to unlock the tokenomics, the treasure map roadmap and the testnet launchpad.';
      }
      return best.a;
    }
    return 'I can help with ElyFluff details: the whitelist, GTD and FCFS, the testnet mint, tokenomics and the roadmap. For anything else, follow @' + handle() + ' on X.';
  }
  function agent() {
    var box = $('#agent'), msgs = $('#agentMsgs'), form = $('#agentForm'), inp = $('#agentIn'), chips = $('#agentChips');
    if (!box) return;
    var started = false, sid = Math.random().toString(36).slice(2, 10), busyAg = false;
    function add(text, who) {
      var m = el('div', 'msg ' + who, text);
      msgs.appendChild(m); msgs.scrollTop = msgs.scrollHeight;
      return m;
    }
    async function typeOut(text) {
      var m = add('', 'bot');
      if (reduced) { m.textContent = text; return; }
      for (var i = 0; i < text.length; i += 3) { m.textContent = text.slice(0, i + 3); msgs.scrollTop = msgs.scrollHeight; await sleep(12); }
      m.textContent = text;
    }
    async function ask(q) {
      q = String(q || '').trim().slice(0, 300);
      if (!q || busyAg) return;
      busyAg = true;
      add(q, 'me');
      var t = el('div', 'msg bot'); var ty = el('span', 'typing'); ty.appendChild(el('i')); ty.appendChild(el('i')); ty.appendChild(el('i'));
      t.appendChild(ty); msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight;
      var answer = null;
      if (C.AGENT_AI && !DEMO) {
        var r = await api('ask', { q: q, sid: sid, unlocked: isUnlocked() });
        if (r && r.ok && r.answer) answer = String(r.answer).slice(0, 1500);
      } else { await sleep(500 + Math.random() * 400); }
      if (!answer) answer = localAnswer(q);
      t.remove();
      await typeOut(answer);
      busyAg = false;
    }
    var CH = ['What is ElyFluff?', 'How do I join?', 'GTD vs FCFS', 'Mint price', 'Tokenomics', 'When is mainnet?', 'Roadmap', 'Is it safe?'];
    CH.forEach(function (c) {
      var b = el('button', 'chip', c); b.type = 'button';
      b.addEventListener('click', function () { ask(c); });
      chips.appendChild(b);
    });
    function open() {
      box.hidden = false; document.body.classList.add('agent-open');
      if (!started) { started = true; typeOut('Hi, I am ElyFluff AI. Ask me anything about the project: whitelist, GTD and FCFS, the testnet mint, tokenomics or the roadmap.'); }
      setTimeout(function () { if (window.innerWidth > 600) inp.focus(); }, 200);
    }
    function close() { box.hidden = true; document.body.classList.remove('agent-open'); }
    $$('[data-open-agent]').forEach(function (b) { b.addEventListener('click', open); });
    $('#agentClose').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); var q = inp.value; inp.value = ''; ask(q); });
  }

  /* ---------- start ---------- */
  function start() {
    fillConfig();
    nav();
    heroTerm();
    countdown();
    blockFeed();
    tokenomics();
    scanner();
    launchpad();
    restoreAccess();
    whitelist();
    if (isUnlocked()) unlockVault(false);
    liveStats();
    agent();
    reveal();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { buildMap(false); }, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
