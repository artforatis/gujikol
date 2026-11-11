(function () {
  'use strict';

  var C = window.ELYFLUFF_CONFIG || {};
  var COL = { hyper: '#5EE6CF', hyper2: '#97FCE4', deep: '#1B8F7E', sky: '#6EC8F5', crimson: '#A31C1B', crimson2: '#E04A46', bg: '#062723' };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SUPPLY = Number(C.NFT_SUPPLY) || 3000;
  var TICKER = C.TICKER || '$FLUFF';
  var DEMO = !C.SCRIPT_URL;
  var LAUNCH_TXT = C.LAUNCH_TEXT || 'announced on X';

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
  function ago(t) {
    var s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  /* ---------- character art ---------- */
  var ART_SRC = C.ART_IMAGE || 'elyfluff.jpg';
  var ART_BGS = [['Violet', null], ['Mint', '#79DCC8'], ['Crimson', '#C2403C'], ['Sky', '#7CC6F2'], ['Charcoal', '#2E3131'], ['Peach', '#F1B08C'], ['Lime', '#B5D96A'], ['Gold', '#E8C15A']];
  var artImg = null, artTried = null, artCache = {};
  function getArt() {
    if (!artTried) artTried = new Promise(function (res) { var im = new Image(); im.onload = function () { artImg = im; res(im); }; im.onerror = function () { res(null); }; im.src = ART_SRC; });
    return artTried;
  }
  async function artVariant(i, size) {
    i = Math.abs(i) % ART_BGS.length;
    var key = i + '_' + size;
    if (artCache[key]) return artCache[key];
    var im = await getArt();
    if (!im) return null;
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = true;
    coverDraw(x, im, size);
    var col = ART_BGS[i][1];
    if (col) {
      try {
        var d = x.getImageData(0, 0, size, size), a = d.data;
        var br = 0, bgc = 0, bb = 0, n = 0;
        [[2, 2], [size - 3, 2], [2, size - 3], [size - 3, size - 3]].forEach(function (p) { var o = (p[1] * size + p[0]) * 4; br += a[o]; bgc += a[o + 1]; bb += a[o + 2]; n++; });
        br /= n; bgc /= n; bb /= n;
        var tr = parseInt(col.slice(1, 3), 16), tg = parseInt(col.slice(3, 5), 16), tb = parseInt(col.slice(5, 7), 16);
        for (var o2 = 0; o2 < a.length; o2 += 4) {
          var r = a[o2], g2 = a[o2 + 1], b = a[o2 + 2];
          var dr = r - br, dg = g2 - bgc, db = b - bb;
          if (dr * dr + dg * dg + db * db < 3600 && b - g2 > 50 && r - g2 > -6) {
            a[o2] = Math.max(0, Math.min(255, tr + dr * 0.8));
            a[o2 + 1] = Math.max(0, Math.min(255, tg + dg * 0.8));
            a[o2 + 2] = Math.max(0, Math.min(255, tb + db * 0.8));
          }
        }
        x.putImageData(d, 0, 0);
      } catch (e) {}
    }
    artCache[key] = c;
    return c;
  }

  /* ---------- collection ---------- */
  var COLL = (C.COLLECTION || []).filter(function (c) { return c && c.src; });
  function myChar() {
    var n = COLL.length || 1;
    var v = parseInt(store.get('ef_char'), 10);
    if (v >= 0 && v < n) return v;
    return WL && WL.username ? hashStr(WL.username.toLowerCase()) % n : 0;
  }
  function collImg(i) { return COLL.length ? loadImg(COLL[((i % COLL.length) + COLL.length) % COLL.length].src) : Promise.resolve(null); }

  /* ---------- config text ---------- */
  function fillConfig() {
    var map = { TICKER: TICKER, NFT_SUPPLY_FMT: fmt(SUPPLY), TOKEN_SUPPLY: C.TOKEN_SUPPLY || 'TBA', X_HANDLE_AT: '@' + handle(), GTD_MINT_PRICE: C.GTD_MINT_PRICE || 'FREE' };
    $$('[data-cfg]').forEach(function (e) { var v = map[e.getAttribute('data-cfg')]; if (v != null) e.textContent = v; });
    $$('[data-x-profile]').forEach(function (a) { a.href = 'https://x.com/' + encodeURIComponent(handle()); });
    var t = $('.title');
    if (t) { t.textContent = ''; t.appendChild(document.createTextNode('Ely')); t.appendChild(el('span', 't2', 'Fluff')); }
    var av = $('#avatar');
    if (av) {
      var ac = av.getContext('2d'), ai = 0;
      var paintAv = async function () {
        var im = await collImg(ai);
        if (im) { coverDraw(ac, im, av.width); av.classList.remove('swap'); void av.offsetWidth; av.classList.add('swap'); }
        else artVariant(0, av.width).then(function (v) { if (v) ac.drawImage(v, 0, 0); else { ac.imageSmoothingEnabled = false; drawFluff(ac, av.width, 4242); } });
        ai++;
      };
      paintAv();
      if (COLL.length > 1 && !reduced) setInterval(function () { if (!document.hidden) paintAv(); }, 3800);
    }
  }

  /* ---------- state ---------- */
  var WL_KEY = 'ef_term_v2';
  var EMPTY = function () { return { username: '', key: '', keySeen: false, done: { follow: false, like: false, repost: false, comment: false }, comment: '', wallet: '', walletFull: '', applicantId: '', complete: false, cardSeen: false, game: 0, bonus: 0 }; };
  var WL = Object.assign(EMPTY(), store.get(WL_KEY) || {});
  WL.done = Object.assign(EMPTY().done, WL.done || {});
  function save() { store.set(WL_KEY, WL); }
  function isUnlocked() { return !!WL.complete; }
  var USER_RE = /^[A-Za-z0-9_]{1,15}$/;
  var WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
  var REF_RE = /^EF-\d{5}$/;
  function postId() { var m = String(C.TASK_POST_URL || '').match(/status\/(\d+)/); return m ? m[1] : ''; }
  function parseUsername(v) {
    v = String(v || '').trim();
    var m = v.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
    if (m) v = m[1];
    v = v.replace(/^@+/, '');
    return USER_RE.test(v) ? v : '';
  }
  function siteBase() { var s = String(C.SITE_URL || '').replace(/\/+$/, ''); return s || (location.origin + location.pathname).replace(/\/index\.html$/, '').replace(/\/+$/, ''); }
  function refLink() { return siteBase() + '/?ref=' + encodeURIComponent(WL.applicantId || ''); }
  (function captureRef() {
    try { var r = new URLSearchParams(location.search).get('ref'); if (r && REF_RE.test(r.toUpperCase())) store.set('ef_ref', r.toUpperCase()); } catch (e) {}
  })();

  /* ---------- api ---------- */
  function demoKey() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 20; i++) { s += a[(Math.random() * 32) | 0]; if (i % 5 === 4 && i < 19) s += '-'; } return s; }
  async function api(action, data) {
    var body = Object.assign({ action: action }, data);
    if (action !== 'ask') { if (!body.username) body.username = WL.username; if (!body.key && WL.key) body.key = WL.key; }
    if (DEMO) {
      await sleep(350);
      if (action === 'ask') return { ok: false };
      if (action === 'gstart') return { ok: true, matchId: 'demo' };
      if (action === 'gend') return { ok: false, demo: true };
      if (action === 'me' || action === 'login') return { ok: true, demo: true, step: 5, applicantId: WL.applicantId || 'EF-00042', status: 'PENDING', game: WL.game || 0, bonus: 0, total: WL.game || 0, kills: 0, rounds: 0, best: 0, refs: 0, gameRank: 0, refRank: 0, players: 0, inviters: 0, invitees: [], wallet: shortWallet(WL.wallet), walletFull: WL.wallet, fcfsTokens: 1000, refPct: 10 };
      var steps = { follow: 2, engage: 3, comment: 4, wallet: 5 };
      var out = { ok: true, step: steps[action], applicantId: WL.applicantId || ('EF-' + pad(1 + Math.floor(Math.random() * 999), 5)) };
      if (action === 'follow' && !WL.key) out.key = demoKey();
      return out;
    }
    var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 20000);
    try {
      var res = await fetch(C.SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow' });
      return await res.json();
    } catch (e) { return { ok: false, error: 'network error, try again' }; }
    finally { clearTimeout(to); }
  }
  async function apiGet(params) {
    if (DEMO) return null;
    try { var r = await fetch(C.SCRIPT_URL + '?' + params, { redirect: 'follow' }); return await r.json(); } catch (e) { return null; }
  }

  /* ---------- terminal output ---------- */
  var OUT, SCREEN, PROMPT, FAST = false;
  function scrollEnd() { if (SCREEN) SCREEN.scrollTop = SCREEN.scrollHeight; }
  function line(parts, cls) {
    var d = el('div', 'ln' + (cls ? ' ' + cls : ''));
    if (typeof parts === 'string') d.textContent = parts;
    else parts.forEach(function (p) { if (typeof p === 'string') d.appendChild(document.createTextNode(p)); else d.appendChild(el('span', p[0], p[1])); });
    OUT.appendChild(d); scrollEnd();
    return d;
  }
  function gap() { OUT.appendChild(el('div', 'ln gap')); }
  async function typeLine(text, cls, speed) {
    if (FAST || reduced) return line(text, cls);
    var d = line('', cls);
    for (var i = 1; i <= text.length; i++) { d.textContent = text.slice(0, i); if (i % 3 === 0) scrollEnd(); await sleep(speed || 16); }
    scrollEnd();
    return d;
  }
  function pause(ms) { return FAST || reduced ? Promise.resolve() : sleep(ms); }
  var SPIN = ['|', '/', '-', '\\'];
  function spinner(node, label) {
    var i = 0, sp = el('span', 'spin'), tx = document.createTextNode(' ' + label);
    node.textContent = ''; node.appendChild(sp); node.appendChild(tx);
    var t = setInterval(function () { sp.textContent = SPIN[i++ % 4]; }, 110);
    sp.textContent = SPIN[0];
    return function () { clearInterval(t); };
  }
  function loader(node, label, ms) {
    return new Promise(function (res) {
      node.textContent = '';
      var wrap = el('span', 'loader');
      wrap.appendChild(el('span', null, label));
      var bar = el('span', 'lb'), fill = el('i'); bar.appendChild(fill); wrap.appendChild(bar);
      var pc = el('span', 'lp', '0%'); wrap.appendChild(pc);
      node.appendChild(wrap);
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        fill.style.width = (e * 100).toFixed(1) + '%'; pc.textContent = Math.round(e * 100) + '%';
        if (p < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }
  function winEl(title, cls) {
    var w = el('div', 'win' + (cls ? ' ' + cls : ''));
    var b = el('div', 'win-bar');
    var dots = el('span', 'dots'); dots.appendChild(el('i', 'd1')); dots.appendChild(el('i')); dots.appendChild(el('i'));
    b.appendChild(dots); b.appendChild(el('span', 'win-title', title)); b.appendChild(el('span'));
    var body = el('div', 'win-body');
    w.appendChild(b); w.appendChild(body);
    return { w: w, bar: b, body: body };
  }
  function win(title, cls) { var x = winEl(title, cls); OUT.appendChild(x.w); scrollEnd(); return x.body; }
  function button(label, cls, fn) { var b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function ask(ps, placeholder, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      PROMPT.textContent = '';
      var row = el('div', 'prompt-row');
      row.appendChild(el('span', 'ps', ps));
      var pin = el('label', 'pin'), inp = el('input');
      inp.type = 'text'; inp.placeholder = placeholder || ''; inp.autocomplete = 'off'; inp.spellcheck = false;
      inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('autocorrect', 'off'); inp.maxLength = opts.max || 80;
      inp.setAttribute('aria-label', placeholder || 'input');
      pin.appendChild(inp); row.appendChild(pin);
      if (opts.paste) row.appendChild(button('paste', 'btn-sm btn-ghost', async function () {
        try { var t = await navigator.clipboard.readText(); if (t) inp.value = t.trim(); } catch (e) { inp.focus(); }
      }));
      function go() { var v = inp.value.trim(); if (!v) { inp.focus(); return; } PROMPT.textContent = ''; res(v); }
      row.appendChild(button('enter ↵', 'btn-sm', go));
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      PROMPT.appendChild(row); scrollEnd();
      if (window.innerWidth > 760) setTimeout(function () { inp.focus({ preventScroll: true }); }, 60);
    });
  }
  async function clearScreen() {
    await typeLine('$ clear', null, 40);
    await pause(250);
    $$('#out > *').forEach(function (n) { n.classList.add('clear-fx'); });
    await sleep(reduced ? 0 : 460);
    OUT.textContent = ''; PROMPT.textContent = '';
    SCREEN.scrollTop = 0;
  }

  /* ---------- live values ---------- */
  var LIVE = { blk: 'syncing...', apps: '--' }, liveStarted = false;
  function paintLive() {
    $$('.blk').forEach(function (e) { if (e.textContent !== LIVE.blk) { e.textContent = LIVE.blk; e.classList.remove('tick'); void e.offsetWidth; e.classList.add('tick'); } });
    $$('.apps').forEach(function (e) { if (e.textContent !== LIVE.apps) { e.textContent = LIVE.apps; e.classList.remove('tick'); void e.offsetWidth; e.classList.add('tick'); } });
  }
  function liveValues() {
    if (liveStarted) { paintLive(); return; }
    liveStarted = true;
    paintLive(); setInterval(paintLive, 1000);
    var url = C.RPC_URL || '', fails = 0, timer, got = false;
    async function blk() {
      try {
        var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 6000);
        var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}', signal: ctrl.signal });
        clearTimeout(to);
        var n = parseInt((await r.json()).result, 16);
        if (!isFinite(n)) throw 0;
        fails = 0; got = true; LIVE.blk = '#' + fmt(n);
      } catch (e) {
        if (++fails > 2) { clearInterval(timer); if (!got) LIVE.blk = 'live'; }
      }
    }
    if (url) { blk(); timer = setInterval(function () { if (!document.hidden) blk(); }, 4000); } else LIVE.blk = 'online';
    async function stats() {
      var j = await apiGet('action=stats');
      if (!j || !j.ok) return;
      var n = Number(j.count) || 0;
      LIVE.apps = n > 0 ? fmt(n) + ' whitelisted' : 'be the first';
      renderFeed(j);
    }
    if (!DEMO) { stats(); setInterval(function () { if (!document.hidden) stats(); }, 20000); }
    else LIVE.apps = 'demo mode';
  }

  /* ---------- boot ---------- */
  async function boot() {
    await typeLine('$ ./whitelist --project elyfluff', null, 24);
    await pause(250);
    line('[boot] loading whitelist protocol... done', 'dim'); await pause(150);
    line('[boot] network: elysium mainnet (hyperliquid L2)', 'dim'); await pause(150);
    line([['dim', '[boot] elysium block: '], ['live-v blk', LIVE.blk]]); await pause(150);
    line([['dim', '[boot] mint: '], ['hl teal', 'FREE · ' + fmt(SUPPLY) + ' ElyFluffs']]); await pause(150);
    line([['dim', '[boot] launch date: '], ['hl', LAUNCH_TXT]]); await pause(150);
    line([['dim', '[boot] applicants: '], ['live-v apps', LIVE.apps]]); await pause(150);
    line([['dim', '[boot] status: '], ['hl', TICKER + ' WHITELIST OPEN']]);
    gap();
    await typeLine('$ ./scan --collection elyfluff --live', null, 18);
    scanWindow();
    gap();
    collectionWindow(false);
    gap();
    await typeLine('$ ./check --wallet', null, 18);
    walletCheckWindow();
    gap();
    line([['dim', '[vault] project files are encrypted. complete the tasks to decrypt.']]);
    var v = el('div', 'vault-locked');
    ['fluff_arena (game)', 'invite_board (10% bonus)', 'about.txt', 'tokenomics.cfg', 'selection.rules', 'launchpad.sh (mint + claim)', 'treasure_map.png', 'live_feed.log'].forEach(function (f) {
      var r = el('div', 'f'); r.appendChild(el('span', null, f)); r.appendChild(el('span', null, '[locked]')); v.appendChild(r);
    });
    OUT.appendChild(v);
    gap();
  }
  function scanWindow() {
    var body = win('elyfluff@scan: ~/collection/live', 'teal');
    var g = el('div', 'scan');
    var stage = el('div', 'scan-stage');
    var cv = el('canvas'); cv.id = 'specimen'; cv.width = 480; cv.height = 480; cv.setAttribute('aria-label', 'Live preview of ElyFluff NFTs');
    var tag = el('div', 'scan-tag', 'SCANNING'); tag.id = 'scanTag';
    stage.appendChild(cv); stage.appendChild(tag);
    var info = el('div');
    var top = el('div', 'si-top');
    var id = el('span', 'si-id', '#0000'); id.id = 'roId';
    top.appendChild(id); top.appendChild(el('span', 'dim', '/ ' + fmt(SUPPLY)));
    var cnt = el('span', 'si-count'); cnt.appendChild(document.createTextNode('scanned ')); var cb = el('b', null, '0'); cb.id = 'roCount'; cnt.appendChild(cb);
    top.appendChild(cnt);
    var bar = el('div', 'si-bar'), fill = el('div', 'si-fill'); fill.id = 'roFill'; bar.appendChild(fill);
    var ul = el('ul', 'si-traits'); ul.id = 'roTraits';
    var sig = el('div', 'si-sig', 'sig 0x0000000000000000'); sig.id = 'roSig';
    info.appendChild(top); info.appendChild(bar); info.appendChild(ul); info.appendChild(sig);
    g.appendChild(stage); g.appendChild(info);
    body.appendChild(g);
    scanner();
  }

  /* ---------- identify (big X login card) ---------- */
  function loginCard(opts) {
    return new Promise(function (res) {
      PROMPT.textContent = '';
      var card = el('div', 'login');
      var top = el('div', 'login-top');
      top.appendChild(el('span', 'login-step', opts.step));
      top.appendChild(el('span', 'login-x', opts.badge || '𝕏'));
      card.appendChild(top);
      card.appendChild(el('h2', 'login-h', opts.title));
      card.appendChild(el('p', 'login-p', opts.text));
      var lab = el('label', 'login-field' + (opts.prefix ? '' : ' no-pre'));
      if (opts.prefix) lab.appendChild(el('span', 'login-at', opts.prefix));
      var inp = el('input'); inp.type = 'text'; inp.placeholder = opts.placeholder; inp.autocomplete = 'off'; inp.spellcheck = false;
      inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('autocorrect', 'off'); inp.setAttribute('enterkeyhint', 'go');
      inp.maxLength = opts.max || 60; inp.setAttribute('aria-label', opts.title);
      lab.appendChild(inp);
      var mark = el('span', 'login-ok', ''); lab.appendChild(mark);
      card.appendChild(lab);
      var hint = el('div', 'login-hint', opts.hint); card.appendChild(hint);
      var row = el('div', 'login-row');
      var go = button(opts.cta, 'btn-big', submit);
      row.appendChild(go);
      (opts.extra || []).forEach(function (b) { row.appendChild(b); });
      card.appendChild(row);
      var msg = el('div', 'login-msg', ''); card.appendChild(msg);
      function check() { var v = opts.parse(inp.value); lab.classList.toggle('valid', !!v); mark.textContent = v ? '✓' : ''; return v; }
      inp.addEventListener('input', function () { if (opts.format) { var f = opts.format(inp.value); if (f !== inp.value) inp.value = f; } check(); msg.textContent = ''; card.classList.remove('shake'); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      async function submit() {
        var v = check();
        if (!v) { msg.textContent = '✗ ' + opts.invalid; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); inp.focus(); return; }
        if (opts.onSubmit) {
          go.disabled = true; var old = go.textContent; go.textContent = 'checking...';
          var r = await opts.onSubmit(v);
          go.disabled = false; go.textContent = old;
          if (r && r.error) { msg.textContent = '✗ ' + r.error; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        }
        PROMPT.textContent = '';
        res(v);
      }
      card.setError = function (t) { msg.textContent = t ? '✗ ' + t : ''; };
      PROMPT.appendChild(card);
      scrollEnd();
      setTimeout(function () { card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); if (window.innerWidth > 760) inp.focus({ preventScroll: true }); }, 80);
    });
  }
  function formatKey(v) {
    var c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    return c.replace(/(.{5})(?=.)/g, '$1-');
  }
  function parseKey(v) { var c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 20 ? formatKey(c) : ''; }
  function applyLogin(r) {
    if (r.applicantId) WL.applicantId = r.applicantId;
    var st = Number(r.step) || 2;
    WL.done.follow = st >= 2; WL.done.like = WL.done.repost = st >= 3; WL.done.comment = st >= 4;
    if (st >= 5) { WL.complete = true; WL.cardSeen = true; }
    if (r.wallet) WL.wallet = r.walletFull || r.wallet;
    if (r.walletFull) WL.walletFull = r.walletFull;
    if (r.game != null) WL.game = Number(r.game) || 0;
    if (r.bonus != null) WL.bonus = Number(r.bonus) || 0;
    save();
  }
  async function identify() {
    if (WL.username) {
      var w0 = line([['ok', '✓ logged in as @' + WL.username + '  ']]);
      w0.appendChild(resetBtn());
      gap();
      return;
    }
    line([['hl', 'STEP 1'], ['', '  connect your X account to start']]);
    await loginCard({
      step: 'STEP 1 OF 5', title: 'Enter your X username', badge: '𝕏',
      text: 'Your tasks, permit card, invites and ' + TICKER + ' are saved to this username.',
      format: function (v) { var u = /(x|twitter)\.com\//i.test(v) ? parseUsername(v) : ''; return u || String(v).replace(/^@+/, '').replace(/\s+/g, ''); },
      prefix: '@', placeholder: 'your_username', hint: 'Example: @elyfluff_fan  ·  letters, numbers and _ only  ·  you can paste your profile link',
      cta: 'continue →', invalid: 'that is not a valid X username (1–15 letters, numbers or _)', max: 80,
      parse: parseUsername,
      onSubmit: async function (u) {
        if (DEMO) { WL.username = u; save(); return null; }
        var c = await apiGet('action=check&u=' + encodeURIComponent(u));
        WL.username = u; save();
        if (c && c.ok && c.status && c.status !== 'NOT_FOUND') WL._exists = true;
        return null;
      }
    });
    line([['ps', 'x_user@elyfluff:~$ '], '@' + WL.username]);
    if (WL._exists && !WL.key) {
      delete WL._exists;
      line('? @' + WL.username + ' is already registered. enter your access key to log in.', 'dim');
      var back = button('change username', 'btn-ghost', function () { store.del(WL_KEY); location.reload(); });
      var key = await loginCard({
        step: 'WELCOME BACK', title: 'Enter your access key', badge: '⚿',
        text: 'You got this key when you joined. It keeps your account and your ' + TICKER + ' safe.',
        prefix: '', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX', hint: 'Lost it? Contact @' + handle() + ' on X from this X account.',
        cta: 'log in →', invalid: 'the key has 20 letters and numbers', max: 23, extra: [back],
        parse: parseKey, format: formatKey,
        onSubmit: async function (k) {
          var r = await api('login', { username: WL.username, key: k });
          if (!r || !r.ok) return { error: String((r && r.error) || 'could not log in').toLowerCase() };
          WL.key = k; WL.keySeen = true; applyLogin(r);
          return null;
        }
      });
      line([['ps', 'key@elyfluff:~$ '], key.slice(0, 5) + '-•••••-•••••-•••••']);
    }
    delete WL._exists; save();
    var w = line([['ok', '✓ welcome' + (WL.complete ? ' back' : '') + ', @' + WL.username + '  ']]);
    w.appendChild(resetBtn());
    gap();
  }
  function resetBtn() {
    var reset = el('button', 'btn btn-sm btn-ghost', 'log out');
    reset.type = 'button';
    var armed = false;
    reset.addEventListener('click', function () {
      if (!armed && WL.key && !DEMO) { armed = true; reset.textContent = 'save your access key first · tap again'; setTimeout(function () { armed = false; reset.textContent = 'log out'; }, 4000); return; }
      store.del(WL_KEY); location.reload();
    });
    return reset;
  }

  /* ---------- tasks ---------- */
  function tasksStage() {
    return new Promise(function (resolve) {
      var pid = postId(), h = handle();
      line('? complete 4 tasks to join the whitelist.');
      var defs = [
        { k: 'follow', h: 'Follow @' + h, d: 'follow the official account', ok: 'follow complete', url: 'https://x.com/intent/follow?screen_name=' + encodeURIComponent(h) },
        { k: 'like', h: 'Like the post', d: 'like the ' + TICKER + ' post', ok: 'like complete', url: 'https://x.com/intent/like?tweet_id=' + pid },
        { k: 'repost', h: 'Repost the post', d: 'repost the ' + TICKER + ' post', ok: 'repost complete', url: 'https://x.com/intent/retweet?tweet_id=' + pid },
        { k: 'comment', h: 'Comment on the post', d: 'write anything — your words', ok: 'comment complete' }
      ];
      var wrap = el('div', 'tasks'); OUT.appendChild(wrap);
      var busyK = {}, errK = {}, finished = false;
      defs.forEach(function (d, i) {
        var b = el('div', 'task'); b.setAttribute('role', 'button'); b.tabIndex = 0;
        var hh = el('div', 't-h'); hh.appendChild(el('em', null, '[0' + (i + 1) + '/04] ')); hh.appendChild(document.createTextNode(d.h));
        b.appendChild(hh); b.appendChild(el('div', 't-d', d.d));
        var st = el('span', 't-s'); b.appendChild(st);
        d.st = st; d.box = b; d.i = i;
        b.addEventListener('click', function (e) { if (e.target.closest('.task-extra')) return; tap(d); });
        b.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.task-extra')) { e.preventDefault(); tap(d); } });
        wrap.appendChild(b);
      });
      function prevDone(d) { return d.i === 0 || WL.done[defs[d.i - 1].k]; }
      function state(d) {
        if (WL.done[d.k]) return 'done';
        if (!prevDone(d)) return 'locked';
        if (busyK[d.k]) return 'busy';
        return 'idle';
      }
      function refresh() {
        defs.forEach(function (d) {
          var s = state(d), b = d.box;
          b.classList.toggle('done', s === 'done'); b.classList.toggle('locked', s === 'locked'); b.classList.toggle('wait', s === 'busy' || (s === 'idle' && !!errK[d.k]));
          if (s !== 'busy') {
            d.st.className = 't-s'; d.st.textContent = '';
            if (s === 'done') d.st.textContent = '✓ ' + d.ok;
            else if (s === 'locked') d.st.textContent = '[locked] finish task 0' + d.i + ' first';
            else if (errK[d.k]) d.st.textContent = '✗ ' + errK[d.k] + ' · tap to try again';
            else if (d.k !== 'comment') d.st.appendChild(el('span', 'go', '→ tap to open X'));
          }
          if (d.k === 'comment') commentExtra(d, s);
          b.setAttribute('aria-disabled', s === 'locked' || s === 'done' ? 'true' : 'false');
        });
        if (!finished && defs.every(function (d) { return WL.done[d.k]; })) {
          finished = true;
          line('✓ all tasks complete', 'ok');
          resolve();
        }
      }
      function tap(d) {
        var s = state(d);
        if (s !== 'idle') return;
        if (d.k === 'comment') { var inp = d.box.querySelector('textarea, input'); if (inp) inp.focus(); return; }
        openUrl(d.url);
        run(d);
      }
      async function callApi(d, extra) {
        if (d.k === 'like') return { ok: true };
        if (d.k === 'follow') return api('follow', { ref: store.get('ef_ref') || '' });
        var action = d.k === 'repost' ? 'engage' : 'comment', resp;
        for (var tries = 0; tries < 4; tries++) {
          resp = await api(action, action === 'comment' ? { username: WL.username, comment: extra } : { username: WL.username });
          if (resp && resp.ok) break;
          if (!(resp && /too fast/i.test(resp.error || ''))) break;
          await sleep(1200);
        }
        return resp;
      }
      async function run(d, extra) {
        busyK[d.k] = true; errK[d.k] = ''; refresh();
        var both = await Promise.all([loader(d.st, 'verifying ' + d.k, reduced ? 10 : 1000), callApi(d, extra)]);
        var resp = both[1];
        busyK[d.k] = false;
        if (resp && resp.ok) {
          WL.done[d.k] = true;
          if (d.k === 'follow') {
            if (resp.key) { WL.key = resp.key; WL.keySeen = false; }
            if (resp.applicantId) WL.applicantId = resp.applicantId;
            if (resp.step > 2) { WL.done.like = true; WL.done.repost = true; }
            if (resp.step > 3) WL.done.comment = true;
            if (resp.step >= 5) { WL.complete = true; if (resp.wallet) WL.wallet = resp.wallet; }
          }
          if (d.k === 'comment') WL.comment = extra;
          save();
        } else {
          errK[d.k] = resp && resp.needKey ? 'this username is registered. log out, then log in with your access key' : (resp && resp.error ? String(resp.error).toLowerCase().replace(/\.$/, '') : 'could not verify');
        }
        refresh();
      }
      function commentExtra(d, s) {
        var ex = d.box.querySelector('.task-extra');
        if (s !== 'idle') { if (ex && s !== 'busy') ex.remove(); return; }
        if (ex) return;
        ex = el('div', 'task-extra');
        var row = el('div', 'inrow');
        var box = el('label', 'inbox'), inp = el('input');
        inp.type = 'text'; inp.placeholder = 'type your comment...'; inp.autocomplete = 'off'; inp.maxLength = 200;
        inp.setAttribute('aria-label', 'Your comment');
        box.appendChild(inp); row.appendChild(box);
        row.appendChild(button('post comment ↗', 'btn-sm', submit));
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        ex.appendChild(row);
        d.box.appendChild(ex);
        function submit() {
          var v = String(inp.value || '').replace(/\s+/g, ' ').trim();
          if (v.length < 2) { errK.comment = 'write at least 2 characters'; refresh(); inp.focus(); return; }
          errK.comment = '';
          openUrl('https://x.com/intent/tweet?in_reply_to=' + pid + '&text=' + encodeURIComponent(v + (WL.applicantId ? '\n\n[' + WL.applicantId + ']' : '')));
          ex.remove();
          run(d, v.slice(0, 200));
        }
      }
      refresh();
    });
  }

  /* ---------- wallet ---------- */
  async function walletStage() {
    gap();
    line('? enter your EVM wallet address for Elysium mainnet (starts with 0x). your free mint and ' + TICKER + ' go to this wallet.');
    if (WL.complete && WL.wallet) { line([['ps', 'wallet@elyfluff:~$ '], WL.wallet]); line('✓ whitelisted', 'ok'); return; }
    while (true) {
      var v = await ask('wallet@elyfluff:~$', '0x...', { paste: true, max: 70 });
      line([['ps', 'wallet@elyfluff:~$ '], v]);
      var errs = [];
      if (!/^0x/i.test(v)) errs.push('address must start with 0x');
      if (v.length !== 42) errs.push('address must be 42 characters (got ' + v.length + ')');
      else if (!WALLET_RE.test(v)) errs.push('address can only use 0-9 and a-f');
      if (errs.length) { errs.forEach(function (e) { line('✗ ' + e, 'err'); }); continue; }
      var t = line('', 'dim'), stop = spinner(t, 'transmitting...');
      var resp = await api('wallet', { wallet: v });
      stop(); t.textContent = 'transmitting... done';
      if (!resp || !resp.ok) { line('✗ ' + String((resp && resp.error) || 'could not save, try again').toLowerCase(), 'err'); continue; }
      WL.wallet = v; WL.walletFull = v.toLowerCase(); WL.complete = true;
      if (resp.applicantId) WL.applicantId = resp.applicantId;
      save();
      line('✓ whitelisted', 'ok');
      break;
    }
  }

  /* ---------- access key ---------- */
  function keyPanel(body, onDone) {
    var k = WL.key || '-----';
    body.appendChild(el('div', 'key-t', 'YOUR PRIVATE ACCESS KEY'));
    var kv = el('div', 'key-v', k); body.appendChild(kv);
    body.appendChild(el('div', 'ln', 'You need this key to log in on another phone or computer, and to protect your ' + TICKER + '. Save it somewhere safe.'));
    body.appendChild(el('div', 'ln err', '✗ never share it. the team will never ask for it.'));
    var row = el('div', 'btn-row');
    var cp = button('copy key', '', async function () {
      try { await navigator.clipboard.writeText(k); cp.textContent = 'copied ✓'; } catch (e) { cp.textContent = 'select and copy'; }
      WL.keySeen = true; save();
    });
    var dl = button('download .txt', 'btn-ghost', function () {
      var blob = new Blob(['ElyFluff access key\n\nX username: @' + WL.username + '\nPermit: ' + (WL.applicantId || '') + '\nAccess key: ' + k + '\n\nKeep this private. Use it to log in on ' + siteBase() + '\n'], { type: 'text/plain' });
      var u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = 'elyfluff-access-key-' + WL.username + '.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      WL.keySeen = true; save();
    });
    row.appendChild(cp); row.appendChild(dl);
    if (onDone) row.appendChild(button('I saved it →', 'btn-ghost', function () { WL.keySeen = true; save(); onDone(); }));
    body.appendChild(row);
  }
  function keyStage() {
    if (DEMO && !WL.key) WL.key = demoKey();
    if (!WL.key || WL.keySeen) return Promise.resolve();
    return new Promise(async function (resolve) {
      gap();
      await typeLine('$ cat ~/.access_key', null, 18);
      var body = win('elyfluff@vault: ~/.access_key', 'red keybox');
      keyPanel(body, function () { line('✓ key saved', 'ok'); resolve(); });
      scrollEnd();
    });
  }
  function openKeyModal() {
    var m = el('div', 'modal');
    var x = winEl('elyfluff@vault: ~/.access_key', 'red keybox');
    var close = el('button', 'ag-x', 'close ×'); close.type = 'button';
    x.bar.replaceChild(close, x.bar.lastChild);
    keyPanel(x.body, null);
    m.appendChild(x.w);
    function shut() { m.remove(); }
    close.addEventListener('click', shut);
    m.addEventListener('click', function (e) { if (e.target === m) shut(); });
    document.body.appendChild(m);
  }

  /* ---------- permit ---------- */
  function shareText() {
    return 'I just got my ' + (C.PROJECT_NAME || 'ElyFluff') + ' whitelist permit.\n\n' + fmt(SUPPLY) + ' NFTs + ' + TICKER + '. Free mint on Elysium mainnet.\n\nJoin with my invite: ' + refLink() + '\n\n@' + handle();
  }
  function shareX() { openUrl('https://x.com/intent/tweet?text=' + encodeURIComponent(shareText())); }
  function permitStage() {
    return new Promise(async function (resolve) {
      await typeLine('$ ./print_permit --holder @' + WL.username, null, 18);
      var body = win('elyfluff@permit: ~/permits/' + (WL.applicantId || 'EF-00000') + '.txt', 'red permit');
      var cv = el('canvas'); cv.width = 1200; cv.height = 720; cv.setAttribute('aria-label', 'Your ElyFluff whitelist permit');
      body.appendChild(cv);
      await drawPermit(cv);
      line('? download your permit, then share it on X to open the vault.');
      var row = el('div', 'btn-row');
      var done = false, dl = false;
      function finish() { if (done) return; done = true; WL.cardSeen = true; save(); setTimeout(resolve, 1200); }
      var dlb = button('download ↓', '', function () { downloadCanvas(cv); dl = true; dlb.textContent = 'downloaded ✓'; shb.classList.remove('btn-ghost'); });
      var shb = button('share on X ↗', 'btn-ghost', function () {
        shareX(); shb.textContent = 'shared ✓';
        line([['ok', '✓ permit shared. '], ['dim', 'opening the vault...']]);
        finish();
      });
      var skip = button('skip →', 'btn-sm btn-ghost', function () { line('opening the vault...', 'dim'); finish(); });
      row.appendChild(dlb); row.appendChild(shb); row.appendChild(skip);
      OUT.appendChild(row);
      line([['dim', 'your invite link: '], ['sky', refLink()]]);
      scrollEnd();
    });
  }
  function downloadCanvas(cv) {
    cv.toBlob(function (b) {
      if (!b) return;
      var u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = 'elyfluff-permit-' + (WL.username || 'holder') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
    }, 'image/png');
  }
  function openCardModal() {
    var m = el('div', 'modal');
    var x = winEl('elyfluff@permit: ~/permits/' + (WL.applicantId || 'EF-00000') + '.txt', 'red permit');
    var close = el('button', 'ag-x', 'close ×'); close.type = 'button';
    x.bar.replaceChild(close, x.bar.lastChild);
    var cv = el('canvas'); cv.width = 1200; cv.height = 720; cv.setAttribute('aria-label', 'Your ElyFluff whitelist permit');
    x.body.appendChild(cv);
    var row = el('div', 'btn-row');
    row.appendChild(button('download ↓', '', function () { downloadCanvas(cv); }));
    row.appendChild(button('share on X ↗', 'btn-ghost', shareX));
    var cp = button('copy invite link', 'btn-ghost', async function () {
      try { await navigator.clipboard.writeText(refLink()); cp.textContent = 'copied ✓'; } catch (e) { cp.textContent = 'copy failed'; }
      setTimeout(function () { cp.textContent = 'copy invite link'; }, 1800);
    });
    row.appendChild(cp);
    x.body.appendChild(row);
    m.appendChild(x.w);
    function shut() { m.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') shut(); }
    close.addEventListener('click', shut);
    m.addEventListener('click', function (e) { if (e.target === m) shut(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(m);
    drawPermit(cv);
  }
  async function drawPermit(cv) {
    if (document.fonts && document.fonts.load) {
      await Promise.all([document.fonts.load('64px "Rubik Mono One"'), document.fonts.load('500 20px "IBM Plex Mono"'), document.fonts.load('700 20px "IBM Plex Mono"')]).catch(function () {});
    }
    var x = cv.getContext('2d'), W = cv.width, H = cv.height;
    var user = WL.username || 'anon', seed = hashStr(user.toLowerCase());
    var INK = '#171717', PAPER = '#ECF5F1', CR = '#A31C1B', TEAL = '#5EE6CF', TI = '#0C7F6C';
    x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
    x.save();
    x.translate(860, 360);
    for (var a = 0; a < 120; a++) {
      x.rotate(Math.PI * 2 / 120);
      x.fillStyle = a % 2 ? 'rgba(12,127,108,0.07)' : 'rgba(23,23,23,0.035)';
      x.beginPath(); x.moveTo(0, 0); x.lineTo(1400, -18); x.lineTo(1400, 18); x.closePath(); x.fill();
    }
    x.restore();
    x.fillStyle = 'rgba(23,23,23,0.10)';
    for (var dx = 10; dx < W; dx += 14) for (var dy = 10; dy < H; dy += 14) x.fillRect(dx, dy, 1.6, 1.6);
    function T(s, px, py, font, color, ls, align) {
      x.font = font; x.fillStyle = color; x.textAlign = align || 'left';
      if ('letterSpacing' in x) x.letterSpacing = (ls || 0) + 'px';
      x.fillText(s, px, py);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
      x.textAlign = 'left';
    }
    function fit(s, maxW, size, fam) { var f; do { f = size + 'px ' + fam; x.font = f; size -= 2; } while (x.measureText(s).width > maxW && size > 22); return f; }
    x.textBaseline = 'alphabetic';
    var ix = 58, iy = 64, is = 340;
    x.fillStyle = CR; x.fillRect(ix + 14, iy + 14, is + 12, is + 12);
    x.fillStyle = INK; x.fillRect(ix - 6, iy - 6, is + 12, is + 12);
    var specId = 1 + (seed % SUPPLY), drawn = false, ci = myChar();
    var im = await collImg(ci);
    if (im) { var sp0 = document.createElement('canvas'); sp0.width = sp0.height = is; coverDraw(sp0.getContext('2d'), im, is); x.drawImage(sp0, ix, iy); drawn = true; }
    if (!drawn) { var av = await artVariant(seed % ART_BGS.length, is); if (av) { x.drawImage(av, ix, iy); drawn = true; } }
    if (!drawn) { var sp = document.createElement('canvas'); sp.width = sp.height = is; drawFluff(sp.getContext('2d', { willReadFrequently: true }), is, seed); x.drawImage(sp, ix, iy); }
    T('holder_photo: [' + (COLL[ci] ? COLL[ci].name.toUpperCase() + ' · ' : '') + '#' + pad(specId) + ']', ix, iy + is + 44, '500 17px "IBM Plex Mono", monospace', '#5F6E6A', 0.5);
    T('> x.com/' + handle(), ix, iy + is + 70, '500 17px "IBM Plex Mono", monospace', '#5F6E6A', 0.5);
    var rx = 470;
    T('$ whoami', rx, 92, '500 18px "IBM Plex Mono", monospace', '#5F6E6A', 0);
    var who = '@' + user.toUpperCase();
    x.font = fit(who, 680, 66, '"Rubik Mono One", "Archivo Black", sans-serif');
    x.fillStyle = TEAL; x.fillText(who, rx + 4, 166);
    x.fillStyle = INK; x.fillText(who, rx, 162);
    T('$ cat status', rx, 214, '500 18px "IBM Plex Mono", monospace', '#5F6E6A', 0);
    x.font = fit('WHITELISTED', 690, 84, '"Rubik Mono One", "Archivo Black", sans-serif');
    x.lineJoin = 'round';
    x.fillStyle = CR; x.fillText('WHITELISTED', rx + 7, 305);
    x.fillStyle = PAPER; x.fillText('WHITELISTED', rx, 298);
    x.strokeStyle = INK; x.lineWidth = 4; x.strokeText('WHITELISTED', rx, 298);
    var rows = [['wallet', shortWallet(WL.wallet) || '0x...'], ['permit_id', WL.applicantId || 'EF-00000'], ['issued', new Date().toLocaleDateString('en-GB').replace(/\//g, '.')], ['network', 'elysium mainnet']];
    rows.forEach(function (r, i) {
      var yy = 372 + i * 42;
      T(r[0], rx, yy, '500 19px "IBM Plex Mono", monospace', '#5F6E6A', 0);
      T(r[1], rx + 150, yy, '700 20px "IBM Plex Mono", monospace', INK, 0.5);
      x.strokeStyle = 'rgba(23,23,23,0.25)'; x.lineWidth = 1.5; x.setLineDash([3, 4]);
      x.beginPath(); x.moveTo(rx, yy + 14); x.lineTo(rx + 400, yy + 14); x.stroke(); x.setLineDash([]);
    });
    var rr = mulberry32(seed), bx = 920;
    while (bx < 1140) { var bw = 2 + Math.floor(rr() * 5); x.fillStyle = INK; x.fillRect(bx, 356, bw, 112); bx += bw + 2 + Math.floor(rr() * 4); }
    T(WL.applicantId || 'EF-00000', 920, 494, '500 15px "IBM Plex Mono", monospace', '#5F6E6A', 1);
    x.fillStyle = INK; x.fillRect(rx, 560, 330, 50);
    T('STATUS: WHITELISTED', rx + 18, 593, '700 21px "IBM Plex Mono", monospace', PAPER, 1);
    x.fillStyle = CR; x.fillRect(rx + 344, 562, 14, 46);
    x.fillStyle = TI; x.fillRect(920, 560, 220, 50);
    T(TICKER + ' · ELYSIUM', 1030, 593, '700 18px "IBM Plex Mono", monospace', '#FFFFFF', 1, 'center');
    T('tier: pending selection (gtd / fcfs)', rx, 650, '500 17px "IBM Plex Mono", monospace', '#5F6E6A', 0);
  }

  /* ---------- member page ---------- */
  var ME = null;
  async function loadMe() {
    var r = await api('me', {});
    if (r && r.ok) {
      ME = r;
      if (r.key && !DEMO) { WL.key = r.key; WL.keySeen = false; save(); openKeyModal(); }
      if (r.game != null) WL.game = Number(r.game) || 0;
      if (r.bonus != null) WL.bonus = Number(r.bonus) || 0;
      if (r.walletFull) WL.walletFull = r.walletFull;
      save();
    } else if (r && r.needKey) {
      line('✗ your access key is missing or wrong on this device. log out and log in again with your key.', 'err');
    }
    renderMe();
    return ME;
  }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function tierZone(rank, gtd, fcfs) { if (!rank) return '—'; return '#' + fmt(rank) + (rank <= gtd ? ' · GTD zone' : rank <= gtd + fcfs ? ' · FCFS zone' : ''); }
  function renderMe() {
    var R = C.RULES || {}, m = ME || {};
    var game = WL.game || 0, bonus = WL.bonus || 0;
    setText('meGame', fmt(game)); setText('meBonus', fmt(bonus)); setText('meTotal', fmt(game + bonus) + ' ' + TICKER);
    setText('myGame', fmt(game + bonus) + ' ' + TICKER);
    var gz = tierZone(m.gameRank, R.GAME_GTD || 200, R.GAME_FCFS || 300), rz = tierZone(m.refRank, R.REF_GTD || 100, R.REF_FCFS || 200);
    setText('meGameRank', gz); setText('meRefRank', rz); setText('meGameRank3', gz); setText('meRefRank3', rz);
    var ca = document.getElementById('clAmount');
    if (ca) ca.textContent = fmt(game + bonus) + ' ' + TICKER;
    setText('meRefs', fmt(m.refs || 0));
    setText('meRefs2', fmt(m.refs || 0)); setText('meBonus2', fmt(bonus) + ' ' + TICKER);
    setText('meRefRank2', m.refRank ? '#' + fmt(m.refRank) : '—');
    var st = m.status || 'PENDING';
    var stTxt = st === 'GTD' ? 'GTD · free mint guaranteed' : st === 'FCFS' ? 'FCFS · free mint, first come' : 'whitelisted · selection pending';
    setText('meStatus', stTxt + (m.selectedBy ? ' (' + m.selectedBy.toLowerCase() + ')' : ''));
    var li = $('#myInvites');
    if (li) {
      li.textContent = '';
      var inv = Array.isArray(m.invitees) ? m.invitees : [];
      if (!inv.length) li.appendChild(el('div', 'ln dim', DEMO ? '[demo] your invites appear here once the sheet is connected.' : 'nobody yet. share your link: you earn ' + ((C.RULES || {}).REF_BONUS_PCT || 10) + '% of what they earn.'));
      inv.slice(0, 30).forEach(function (x) {
        var d = el('div', 'ln'); d.appendChild(el('span', 'ps', '@' + x.u));
        d.appendChild(el('span', x.s === 'joined' ? 'ok' : 'dim', x.s === 'joined' ? '  ✓ joined' : '  · doing tasks'));
        if (x.n) d.appendChild(el('span', 'dim', '  · ' + fmt(x.n) + ' ' + TICKER + ' earned'));
        li.appendChild(d);
      });
    }
  }
  async function memberStage() {
    liveValues();
    await typeLine('$ login --user @' + WL.username, null, 22);
    line([['ok', '✓ welcome, @' + WL.username], ['dim', '  · permit ' + (WL.applicantId || 'EF-00000') + ' · '], ['hl', 'WHITELISTED']]);
    var mt = el('div', 'btn-row');
    mt.appendChild(button('view my card', 'btn-sm', openCardModal));
    mt.appendChild(button('share on X ↗', 'btn-sm btn-ghost', shareX));
    if (WL.key) mt.appendChild(button('my access key', 'btn-sm btn-ghost', openKeyModal));
    mt.appendChild(resetBtn());
    OUT.appendChild(mt);
    line([['dim', '[live] elysium block '], ['live-v blk', LIVE.blk], ['dim', ' · launch '], ['hl', LAUNCH_TXT], ['dim', ' · '], ['live-v apps', LIVE.apps]]);
    paintLive();
    gap();
    await typeLine('$ ./me --stats', null, 20);
    statsWindow();
    loadMe();
    gap();
    await typeLine('$ ./fluff_arena --play', null, 20);
    lobbyWindow();
    gap();
    await typeLine('$ ./invite --board', null, 20);
    referralWindow();
    gap();
    await typeLine('$ ls ./collection', null, 20);
    collectionWindow(true);
    gap();
    await vaultStage();
  }
  function statsWindow() {
    var body = win('elyfluff@me: ~/stats', 'teal wide');
    var g = el('div', 'stats');
    function tile(label, id, cls, sub) {
      var t = el('div', 'stat' + (cls ? ' ' + cls : ''));
      t.appendChild(el('span', 'st-l', label));
      var v = el('b', 'st-v', '—'); v.id = id; t.appendChild(v);
      if (sub) t.appendChild(el('span', 'st-s', sub));
      g.appendChild(t);
    }
    tile('claimable ' + TICKER, 'meTotal', 'big', 'game + invite bonus');
    tile('from the arena', 'meGame', '', TICKER);
    tile('invite bonus', 'meBonus', '', TICKER + ' · ' + ((C.RULES || {}).REF_BONUS_PCT || 10) + '% of friends');
    tile('game rank', 'meGameRank', '', 'top ' + ((C.RULES || {}).GAME_GTD || 200) + ' = GTD');
    tile('invite rank', 'meRefRank', '', 'top ' + ((C.RULES || {}).REF_GTD || 100) + ' = GTD');
    body.appendChild(g);
    var sl = el('div', 'ln'); sl.appendChild(el('span', 'dim', 'status: ')); var sv = el('span', 'hl teal', '—'); sv.id = 'meStatus'; sl.appendChild(sv);
    body.appendChild(sl);
    body.appendChild(el('div', 'ln dim', 'everything you earn here is paid as real ' + TICKER + ' on Elysium mainnet, to your registered wallet.'));
    renderMe();
  }

  /* ---------- referrals ---------- */
  function referralWindow() {
    var R = C.RULES || {};
    var body = win('elyfluff@invite: ~/board', 'red wide');
    var hero = el('div', 'ref-hero');
    var h1 = el('div', 'ref-big'); h1.appendChild(el('b', null, (R.REF_BONUS_PCT || 10) + '%')); h1.appendChild(el('span', null, 'of everything your friends earn in Fluff Arena goes to you'));
    hero.appendChild(h1);
    var tz = el('div', 'ref-tiers');
    [['TOP ' + (R.REF_GTD || 100), 'GTD NFT mint', 'gtd'], ['NEXT ' + (R.REF_FCFS || 200), 'FCFS ' + TICKER, 'fcfs']].forEach(function (t) {
      var c = el('div', 'ref-tier ' + t[2]); c.appendChild(el('b', null, t[0])); c.appendChild(el('span', null, 'inviters → ' + t[1])); tz.appendChild(c);
    });
    hero.appendChild(tz);
    body.appendChild(hero);
    var lk = el('div', 'ref-link');
    var lb = el('label', 'inbox'); lb.appendChild(el('span', 'ps', 'link'));
    var li = el('input'); li.type = 'text'; li.readOnly = true; li.value = refLink(); li.setAttribute('aria-label', 'Your invite link');
    li.addEventListener('focus', function () { li.select(); });
    lb.appendChild(li); lk.appendChild(lb);
    var cp = button('copy', 'btn-sm', async function () { try { await navigator.clipboard.writeText(refLink()); cp.textContent = 'copied ✓'; } catch (e) { li.select(); cp.textContent = 'press copy'; } setTimeout(function () { cp.textContent = 'copy'; }, 1800); });
    lk.appendChild(cp);
    lk.appendChild(button('share on X ↗', 'btn-sm btn-ghost', shareX));
    body.appendChild(lk);
    var mine = el('div', 'ref-me');
    [['friends joined', 'meRefs2'], ['bonus earned', 'meBonus2'], ['your rank', 'meRefRank2']].forEach(function (x) {
      var d = el('div'); d.appendChild(el('span', 'dim', x[0])); var b = el('b', null, '—'); b.id = x[1]; d.appendChild(b); mine.appendChild(d);
    });
    body.appendChild(mine);
    var bs = el('div', 'boards');
    var b1 = el('div'); b1.appendChild(el('div', 'ln board-h', '# top inviters (who invited how many)'));
    var rb = el('div', 'feed tall'); rb.id = 'refBoard'; b1.appendChild(rb);
    var b2 = el('div'); b2.appendChild(el('div', 'ln board-h', '# your invites'));
    var mi = el('div', 'feed tall'); mi.id = 'myInvites'; b2.appendChild(mi);
    bs.appendChild(b1); bs.appendChild(b2); body.appendChild(bs);
    body.appendChild(el('div', 'ln dim', 'a friend counts once they finish all tasks. bonus is added automatically every time they save a round.'));
    renderFeed(null); renderMe();
  }

  /* ---------- collection ---------- */
  function collCard(c, i, onClick) {
    var b = el('button', 'cc'); b.type = 'button'; b.setAttribute('aria-label', 'ElyFluff ' + c.name);
    var f = el('span', 'cc-img'); var im = el('img'); im.src = c.src; im.alt = 'ElyFluff ' + c.name; im.loading = 'lazy'; im.decoding = 'async'; f.appendChild(im);
    b.appendChild(f);
    var t = el('span', 'cc-t'); t.appendChild(el('b', null, c.name)); t.appendChild(el('span', null, (c.traits && c.traits.Hat) || '')); b.appendChild(t);
    b.addEventListener('click', function () { onClick(i); });
    return b;
  }
  function collectionWindow(full) {
    if (!COLL.length) return;
    var body = win('elyfluff@collection: ~/' + (full ? 'gallery' : 'preview'), full ? 'wide coll' : 'teal coll');
    if (full) {
      body.appendChild(el('div', 'ln dim', fmt(SUPPLY) + ' ElyFluffs are coming. tap one to see its traits, or pick it as your arena fighter.'));
      var grid = el('div', 'cgrid');
      COLL.forEach(function (c, i) { grid.appendChild(collCard(c, i, openLightbox)); });
      body.appendChild(grid);
    } else {
      var mq = el('div', 'marq'), tr = el('div', 'marq-t');
      COLL.concat(COLL).forEach(function (c, i) { var cc = collCard(c, i % COLL.length, openLightbox); if (i >= COLL.length) cc.setAttribute('aria-hidden', 'true'), cc.tabIndex = -1; tr.appendChild(cc); });
      mq.appendChild(tr); body.appendChild(mq);
      body.appendChild(el('div', 'ln dim', fmt(SUPPLY) + ' hand-drawn ElyFluffs · ' + COLL.length + ' previewed · tap to inspect'));
    }
  }
  function openLightbox(i) {
    var m = el('div', 'modal');
    var x = winEl('', 'lightbox');
    var close = el('button', 'ag-x', 'close ×'); close.type = 'button';
    x.bar.replaceChild(close, x.bar.lastChild);
    var wrap = el('div', 'lb');
    var im = el('img'); var info = el('div', 'lb-info');
    wrap.appendChild(im); wrap.appendChild(info); x.body.appendChild(wrap);
    function show(k) {
      i = (k + COLL.length) % COLL.length;
      var c = COLL[i];
      x.bar.querySelector('.win-title').textContent = 'elyfluff@collection: ~/' + c.name.toLowerCase() + '.png';
      im.src = c.src; im.alt = 'ElyFluff ' + c.name;
      info.textContent = '';
      info.appendChild(el('div', 'lb-n', c.name));
      var ul = el('ul', 'si-traits');
      Object.keys(c.traits || {}).forEach(function (k2) { var li = el('li'); li.appendChild(el('span', null, k2)); li.appendChild(el('b', null, c.traits[k2])); ul.appendChild(li); });
      info.appendChild(ul);
      var row = el('div', 'btn-row');
      row.appendChild(button('← prev', 'btn-sm btn-ghost', function () { show(i - 1); }));
      row.appendChild(button('next →', 'btn-sm btn-ghost', function () { show(i + 1); }));
      if (isUnlocked()) {
        var pickB = button(myChar() === i ? 'your fighter ✓' : 'use as my fighter', 'btn-sm', function () { store.set('ef_char', i); pickB.textContent = 'your fighter ✓'; });
        row.appendChild(pickB);
      }
      info.appendChild(row);
    }
    show(i);
    m.appendChild(x.w);
    function shut() { m.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') shut(); if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); }
    close.addEventListener('click', shut);
    m.addEventListener('click', function (e) { if (e.target === m) shut(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(m);
  }

  /* ---------- arena lobby ---------- */
  function lobbyWindow() {
    var body = win('elyfluff@arena: ~/fluff_arena', 'red wide');
    var gcfg = (window.FluffArena && window.FluffArena.config) || { round: 900, redAt: 600, blueAt: 600, bots: 7 };
    function mm(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    var L = el('div', 'lobby');
    var hero = el('div', 'lobby-hero');
    var hc = el('canvas'); hc.width = 640; hc.height = 400; hero.appendChild(hc);
    hero.appendChild(el('div', 'lh-t', 'FLUFF ARENA'));
    hero.appendChild(el('div', 'lh-s', '2D jetpack battle · ' + (COLL.length || 1) + ' fighters · collect ' + TICKER));
    drawLobbyHero(hc);
    var right = el('div');
    var rules = el('div', 'rules');
    [['maps', (gcfg.maps || ['Elysium', 'HyperEVM City', 'Crimson Core']).join(' · ')],
     ['round', mm(gcfg.round) + ' · you vs ' + gcfg.bots + ' fighters'],
     ['life', 'one life · grab a 1UP to come back'],
     ['loot', 'defeated enemies drop ' + TICKER + ' · bots grab it too'],
     [mm(gcfg.redAt), 'air raid · missiles rain down'],
     [mm(gcfg.blueAt), 'blue zone · ' + TICKER + ' rains down'],
     ['rank', 'top ' + ((C.RULES || {}).GAME_GTD || 200) + ' → GTD · next ' + ((C.RULES || {}).GAME_FCFS || 300) + ' → FCFS']].forEach(function (r) {
      var d = el('div', 'ln'); d.appendChild(el('span', 'k', r[0])); d.appendChild(document.createTextNode(' ' + r[1])); rules.appendChild(d);
    });
    right.appendChild(rules);
    var play = button('▶ play now', 'btn-play', launchGame);
    right.appendChild(play);
    right.appendChild(el('div', 'ln dim', 'opens fullscreen · phones turn to landscape automatically'));
    var cl = el('div', 'claim');
    var ct = el('div', 'claim-top');
    var ci = el('img'); ci.src = C.TOKEN_LOGO || 'fluff-token.svg'; ci.alt = TICKER; ct.appendChild(ci);
    var cw = el('div'); cw.appendChild(el('span', 'dim', 'your claimable ' + TICKER + ' (Elysium mainnet)'));
    var mv = el('b', null, fmt((WL.game || 0) + (WL.bonus || 0)) + ' ' + TICKER); mv.id = 'myGame'; cw.appendChild(mv);
    ct.appendChild(cw); cl.appendChild(ct);
    var go = button((C.CLAIM_LIVE && C.CLAIM_CONTRACT) ? 'claim on Elysium ↓' : '[ claim opens soon ]', (C.CLAIM_LIVE && C.CLAIM_CONTRACT) ? '' : 'btn-ghost', function () { var t = $('#launchpad'); if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
    if (!(C.CLAIM_LIVE && C.CLAIM_CONTRACT)) go.disabled = true;
    cl.appendChild(go);
    cl.appendChild(el('div', 'ln dim', 'game + invite bonus. paid as real ' + TICKER + ' on Elysium mainnet.'));
    right.appendChild(cl);
    L.appendChild(hero); L.appendChild(right);
    body.appendChild(L);
    var bs = el('div', 'boards');
    var b1 = el('div'); b1.appendChild(el('div', 'ln board-h', '# game leaderboard (all time)')); var lb = el('div', 'feed tall'); lb.id = 'lobbyBoard'; b1.appendChild(lb);
    var b2 = el('div'); b2.appendChild(el('div', 'ln board-h', '# best single round')); var lb2 = el('div', 'feed'); lb2.id = 'lobbyBest'; b2.appendChild(lb2);
    bs.appendChild(b1); bs.appendChild(b2); body.appendChild(bs);
    renderFeed(null);
  }
  async function drawLobbyHero(c) {
    var x = c.getContext('2d'), W = c.width, H = c.height;
    var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#041A17'); gr.addColorStop(1, '#0E5246');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.save(); x.translate(W * 0.5, H * 0.42); x.fillStyle = 'rgba(151,252,228,0.08)';
    for (var i = 0; i < 24; i++) { x.rotate(Math.PI / 12); x.beginPath(); x.moveTo(0, 0); x.lineTo(900, -40); x.lineTo(900, 40); x.closePath(); x.fill(); }
    x.restore();
    x.fillStyle = '#171717'; x.fillRect(0, H - 40, W, 40); x.fillStyle = '#5EE6CF'; x.fillRect(0, H - 40, W, 4); x.fillStyle = '#A31C1B'; x.fillRect(0, H - 36, W, 3);
    x.fillStyle = 'rgba(224,69,63,0.22)'; x.fillRect(0, 0, 90, H - 40); x.fillRect(W - 90, 0, 90, H - 40);
    var spots = [[W * 0.5, H * 0.44, 112, 0], [W * 0.22, H * 0.55, 78, 1], [W * 0.78, H * 0.55, 78, 2], [W * 0.07, H * 0.68, 50, 3], [W * 0.93, H * 0.68, 50, 4]];
    var base = myChar();
    for (var k = spots.length - 1; k >= 0; k--) {
      var sp = spots[k], im = await collImg(base + sp[3]);
      if (!c.isConnected && k < spots.length - 1) return;
      if (!im) continue;
      x.save(); x.beginPath(); x.arc(sp[0], sp[1], sp[2], 0, Math.PI * 2); x.closePath(); x.fillStyle = '#171717'; x.fill(); x.clip();
      var s2 = sp[2] * 2.3; x.drawImage(im, sp[0] - s2 / 2, sp[1] - s2 * 0.36, s2, s2); x.restore();
      x.lineWidth = 6; x.strokeStyle = '#171717'; x.beginPath(); x.arc(sp[0], sp[1], sp[2], 0, Math.PI * 2); x.stroke();
      x.lineWidth = 3; x.strokeStyle = k === 0 ? '#5EE6CF' : '#E0453F'; x.beginPath(); x.arc(sp[0], sp[1], sp[2] + 8, 0, Math.PI * 2); x.stroke();
    }
    var tk = new Image();
    tk.onload = function () { for (var q = 0; q < 9; q++) { var s = q % 3 === 1 ? 34 : 26; x.drawImage(tk, 70 + q * 58 - s / 2, H - 70 - (q % 2) * 14 - s / 2, s, s); } };
    tk.src = C.TOKEN_LOGO || 'fluff-token.svg';
  }
  function launchGame() {
    if (!window.FluffArena) { line('✗ game files are missing. upload game.js.', 'err'); return; }
    window.FluffArena.open({
      username: WL.username,
      charIdx: myChar(),
      onStart: async function () {
        if (DEMO) return { ok: true, matchId: 'demo' };
        var r = await api('gstart', {});
        return r && r.ok ? r : { ok: false, error: (r && r.error) || 'could not start' };
      },
      onEnd: async function (res) {
        if (DEMO || res.matchId === 'demo') return { ok: false, demo: true };
        var r = await api('gend', { matchId: res.matchId, tokens: res.tokens, kills: res.kills, deaths: res.deaths, secs: res.secs });
        if (r && r.ok) { if (r.game != null) WL.game = Number(r.game) || WL.game; save(); renderMe(); }
        return r;
      },
      onClose: function () { renderMe(); loadMe(); }
    });
  }

  /* ---------- vault ---------- */
  async function vaultStage() {
    await typeLine('$ ./vault --decrypt', null, 20);
    var t = line('', 'dim'), stop = spinner(t, 'decrypting project files...');
    await pause(1100);
    stop(); t.textContent = 'decrypting project files... done';
    line([['ok', '✓ access granted. '], ['hl teal', '6 FILES DECRYPTED']]);
    gap();

    await typeLine('$ cat about.txt', null, 16);
    var a = win('elyfluff@vault: ~/about.txt');
    [['ElyFluff is a ' + fmt(SUPPLY) + '-piece NFT collection paired with the ' + TICKER + ' token, launching directly on Elysium mainnet.'],
     ['The mint is FREE on OpenSea. Selected wallets mint first: GTD is guaranteed, FCFS mints next while supply lasts. You only pay the gas fee.'],
     ['Every ' + TICKER + ' you earn in Fluff Arena, plus your invite bonus, is paid as real ' + TICKER + ' on Elysium mainnet.']].forEach(function (p) { a.appendChild(el('div', 'ln', p[0])); });
    gap();

    await typeLine('$ cat tokenomics.cfg', null, 16);
    var tk = win('elyfluff@vault: ~/tokenomics.cfg', 'teal');
    var dn = el('div', 'donut'), dc = el('div', 'donut-c');
    var acc = 0, stops = [];
    (C.ALLOCATION || []).forEach(function (al) { stops.push(al.color + ' ' + acc + '% ' + (acc + al.pct) + '%'); acc += al.pct; });
    dc.style.background = 'conic-gradient(' + stops.join(',') + ')';
    var dt = el('div'); dt.appendChild(el('div', 'donut-t', TICKER)); dt.appendChild(el('div', 'dim', 'total supply: ' + (C.TOKEN_SUPPLY || 'TBA')));
    dn.appendChild(dc); dn.appendChild(dt); tk.appendChild(dn);
    var al = el('div', 'alloc');
    (C.ALLOCATION || []).forEach(function (r) {
      var row = el('div', 'al');
      row.appendChild(el('span', 'al-n', r.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '')));
      var bar = el('div', 'al-bar');
      var on = Math.round(r.pct / 2);
      for (var i = 0; i < 20; i++) { var c = el('i'); if (i < on) c.style.background = r.color; bar.appendChild(c); }
      row.appendChild(bar);
      row.appendChild(el('span', 'al-p', r.pct + '%'));
      al.appendChild(row);
    });
    tk.appendChild(al);
    gap();

    await typeLine('$ cat selection.rules', null, 16);
    selectionWindow();
    gap();

    await typeLine('$ ./check --wallet', null, 16);
    walletCheckWindow();
    gap();

    await typeLine('$ ./launchpad.sh --mint opensea --claim elysium', null, 16);
    launchpadWindow();
    gap();

    await typeLine('$ open treasure_map.png', null, 16);
    var mp = win('elyfluff@vault: ~/treasure_map.png', 'wide');
    var tm = el('div', 'tmap'); tm.id = 'tmap'; tm.setAttribute('aria-label', 'Treasure map roadmap');
    var td = el('div', 'tm-detail'); td.id = 'tmDetail'; td.setAttribute('aria-live', 'polite');
    mp.appendChild(tm); mp.appendChild(td);
    buildMap(true);
    gap();

    await typeLine('$ tail -f live_feed.log', null, 16);
    var lv = win('elyfluff@vault: ~/live_feed.log', 'teal');
    var fd = el('div', 'feed'); fd.id = 'feed';
    lv.appendChild(fd);
    renderFeed(lastStats);
    gap();
    line('$ ', null).appendChild(el('span', 'caret'));
  }

  function selectionWindow() {
    var R = C.RULES || {};
    var w = win('elyfluff@vault: ~/selection.rules', 'red wide');
    var tb = el('div', 'rules-t');
    function row(cells, cls) { var r = el('div', 'rt-r' + (cls ? ' ' + cls : '')); cells.forEach(function (c) { r.appendChild(el('span', null, c)); }); tb.appendChild(r); }
    row(['source', 'GTD · free, guaranteed', 'FCFS · free, first come'], 'rt-h');
    row(['game leaderboard', 'rank 1 – ' + (R.GAME_GTD || 200), 'rank ' + ((R.GAME_GTD || 200) + 1) + ' – ' + ((R.GAME_GTD || 200) + (R.GAME_FCFS || 300))]);
    row(['invite leaderboard', 'rank 1 – ' + (R.REF_GTD || 100), 'rank ' + ((R.REF_GTD || 100) + 1) + ' – ' + ((R.REF_GTD || 100) + (R.REF_FCFS || 200))]);
    row(['raffle', 'remaining spots', 'remaining spots'], 'rt-raffle');
    w.appendChild(tb);
    [['raffle', 'every wallet that finished the whitelist and is not selected yet joins the draw. the seed is announced on X first.'],
     ['best tier wins', 'if you qualify twice, you keep the higher tier (GTD beats FCFS).'],
     ['free mint', 'on OpenSea. GTD stage first, then FCFS until all ' + fmt(SUPPLY) + ' are gone. one free mint per wallet, gas only.'],
     [TICKER, 'everything you earn in the arena is paid on Elysium mainnet.'],
     ['fair play', 'rounds are checked by the server. cheated scores are removed before selection.']].forEach(function (r) {
      var d = el('div', 'ln'); d.appendChild(el('span', 'k', r[0])); d.appendChild(document.createTextNode(' ' + r[1])); w.appendChild(d);
    });
    var me = el('div', 'ln'); me.appendChild(el('span', 'dim', 'your position: game ')); var g = el('span', 'hl', '—'); g.id = 'meGameRank3'; me.appendChild(g);
    me.appendChild(el('span', 'dim', ' · invites ')); var r2 = el('span', 'hl', '—'); r2.id = 'meRefRank3'; me.appendChild(r2);
    w.appendChild(me);
    renderMe();
  }

  /* ---------- wallet checker ---------- */
  function walletCheckWindow() {
    var body = win('elyfluff@winners: ~/check', 'teal wide wcheck');
    body.appendChild(el('h3', 'wc-h', 'Are you a winner?'));
    body.appendChild(el('p', 'login-p', 'Check with your X username or your wallet address.'));
    var row = el('div', 'login-row');
    var a = el('a', 'btn btn-big', 'open winner checker ↗'); a.href = 'checker' + (WL.username ? '?q=' + encodeURIComponent(WL.username) : '');
    row.appendChild(a);
    body.appendChild(row);
    return body;
  }

  /* ---------- launchpad (on-chain) ---------- */
  var CW = { addr: '' };
  function txLink(hash) { var a = el('a', 'sky', 'view tx ↗'); a.href = String(C.EXPLORER_URL || '').replace(/\/+$/, '') + '/tx/' + hash; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  function chainErr(e) {
    if (e && e.code === 4001) return 'you cancelled the request in your wallet';
    var m = (e && ((e.data && e.data.message) || e.message)) || String(e || 'error');
    return String(m).replace(/^execution reverted:?\s*/i, '').slice(0, 160).toLowerCase();
  }
  function launchpadWindow() {
    var lp = win('elyfluff@vault: ~/launchpad.sh', 'red wide');
    lp.parentNode.id = 'launchpad';
    var FC = window.FluffChain;
    var wl = el('div', 'wbar');
    var wtxt = el('span', 'dim', 'wallet: not connected'); wl.appendChild(wtxt);
    var cbtn = button('connect wallet', 'btn-sm', async function () {
      try { CW.addr = await FC.connect(); paintW(); } catch (e) { wtxt.textContent = '✗ ' + chainErr(e); wtxt.className = 'err'; }
    });
    wl.appendChild(cbtn);
    lp.appendChild(wl);
    function paintW() {
      if (!CW.addr) return;
      wtxt.className = ''; wtxt.textContent = '';
      wtxt.appendChild(el('span', 'ok', '● ')); wtxt.appendChild(document.createTextNode(shortWallet(CW.addr) + ' · ' + (C.CHAIN_NAME || 'Elysium')));
      var reg = String(WL.walletFull || '').toLowerCase();
      if (reg && reg !== CW.addr) wtxt.appendChild(el('span', 'err', '  ✗ not your registered wallet (' + shortWallet(reg) + ')'));
      cbtn.textContent = 'connected ✓'; cbtn.disabled = true;
    }
    var pd = el('div', 'pad pad3');
    function card(cls, tier, title, rows) {
      var m = el('div', 'mint ' + cls);
      m.appendChild(el('span', 'hl' + (cls === 'fcfs' ? ' ink' : cls === 'claimc' ? ' teal' : ''), tier));
      m.appendChild(el('h4', null, title));
      rows.forEach(function (r) { var rw = el('div', 'row'); rw.appendChild(el('span', null, r[0])); var v = el('span', null, r[1]); if (r[2]) v.id = r[2]; rw.appendChild(v); m.appendChild(rw); });
      var out = el('div', 'mint-out'); m.out = out;
      m.say = function (t, cls2, hash) { out.textContent = ''; out.className = 'mint-out ' + (cls2 || ''); out.appendChild(document.createTextNode(t)); if (hash && C.EXPLORER_URL) { out.appendChild(document.createTextNode(' ')); out.appendChild(txLink(hash)); } };
      return m;
    }
    var osOn = !!(C.MINT_LIVE && C.OPENSEA_URL);
    function osBtn(m) {
      var b = el('a', 'soon' + (osOn ? ' live' : ''), osOn ? 'mint on OpenSea ↗' : '[ OpenSea link soon ]');
      if (osOn) { b.href = C.OPENSEA_URL; b.target = '_blank'; b.rel = 'noopener noreferrer'; }
      else b.setAttribute('aria-disabled', 'true');
      m.appendChild(b); m.appendChild(m.out); return b;
    }
    var clOn = !!(C.CLAIM_LIVE && C.CLAIM_CONTRACT && FC);
    var net = C.CHAIN_NAME || 'Elysium';
    var g = card('gtd', 'GTD', 'Free mint · guaranteed', [['price', 'FREE (gas only)'], ['where', 'OpenSea'], ['stage', '1 · GTD list'], ['limit', '1 per wallet']]);
    osBtn(g);
    var f = card('fcfs', 'FCFS', 'Free mint · first come', [['price', 'FREE (gas only)'], ['where', 'OpenSea'], ['stage', '2 · after GTD'], ['limit', '1 per wallet · while supply lasts']]);
    osBtn(f);
    var k = card('claimc', TICKER, TICKER + ' claim', [['your amount', fmt((WL.game || 0) + (WL.bonus || 0)) + ' ' + TICKER, 'clAmount'], ['from', 'arena + invite bonus'], ['network', net + ' mainnet'], ['where', 'this website']]);
    var kb = el('button', 'soon' + (clOn ? ' live' : ''), clOn ? 'claim ' + TICKER + ' ↗' : '[ claim opens soon ]'); kb.type = 'button'; if (!clOn) kb.disabled = true;
    k.appendChild(kb); k.appendChild(k.out);
    pd.appendChild(g); pd.appendChild(f); pd.appendChild(k); lp.appendChild(pd);
    lp.appendChild(el('div', 'ln err', '✗ only mint from the OpenSea link on this site or on @' + handle() + '. never from links in DMs.'));

    async function ensureW(card2) {
      if (CW.addr) { try { await FC.ensureChain(); } catch (e) {} return true; }
      try { CW.addr = await FC.connect(); paintW(); return true; } catch (e) { card2.say('✗ ' + chainErr(e), 'err'); return false; }
    }
    async function proofFor(t) { return DEMO ? { ok: true, ready: false } : apiGet('action=proof&t=' + t + '&a=' + CW.addr); }
    var busy = false;
    kb.addEventListener('click', async function () {
      if (busy || !clOn) return; busy = true; kb.disabled = true;
      try {
        if (!(await ensureW(k))) return;
        k.say('> checking the claim list...', 'dim');
        var p = await proofFor('claim');
        if (!p || !p.ok) return k.say('✗ could not load the list. try again.', 'err');
        if (!p.ready) return k.say('✗ the claim list is not published yet.', 'err');
        if (!p.found) return k.say('✗ nothing to claim for ' + shortWallet(CW.addr) + ' yet. the list is updated regularly.', 'err');
        var onRoot = await FC.readBytes32(C.CLAIM_CONTRACT, 'merkleRoot()');
        if (onRoot && p.root && onRoot !== String(p.root).toLowerCase()) return k.say('✗ the list is being updated. try again in a few minutes.', 'err');
        var got = await FC.readUint(C.CLAIM_CONTRACT, FC.dataAddr('claimed(address)', CW.addr));
        var due = BigInt(p.wei) - BigInt(got || '0');
        if (due <= 0n) return k.say('✓ all claimed (' + fmt(p.amount) + ' ' + TICKER + '). play more: new ' + TICKER + ' is added when the list updates.', 'ok');
        k.say('> confirm the claim of ' + FC.weiToTokens(due.toString()) + ' ' + TICKER + ' in your wallet...', 'dim');
        var hash = await FC.send(CW.addr, C.CLAIM_CONTRACT, FC.dataClaim(p.wei, p.proof));
        k.say('> sent. waiting for the block...', 'dim', hash);
        var rc = await FC.waitReceipt(hash);
        if (rc && rc.status === '0x1') {
          k.say('✓ claimed ' + FC.weiToTokens(due.toString()) + ' ' + TICKER + '.', 'ok', hash);
          if (C.TOKEN_CONTRACT && window.ethereum) window.ethereum.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: C.TOKEN_CONTRACT, symbol: 'FLUFF', decimals: 18, image: siteBase() + '/fluff-token.png' } } }).catch(function () {});
        } else k.say(rc ? '✗ the transaction failed.' : '… still pending. check the explorer.', rc ? 'err' : 'dim', hash);
      } catch (e) { k.say('✗ ' + chainErr(e), 'err'); }
      finally { busy = false; kb.disabled = false; }
    });
    if (!FC) lp.appendChild(el('div', 'ln err', '✗ chain.js is missing. upload it next to index.html.'));
    lp.appendChild(el('div', 'ln dim', 'the mint is free, you only pay gas. never share your seed phrase: no real site or team member will ask for it.'));

    var chk = el('div', 'check');
    var crow = el('div', 'inrow');
    var cbox = el('label', 'inbox'); cbox.appendChild(el('span', 'ps', '@'));
    var cin = el('input'); cin.type = 'text'; cin.placeholder = 'check a username'; cin.value = WL.username; cin.setAttribute('autocapitalize', 'off'); cin.spellcheck = false; cin.setAttribute('aria-label', 'X username');
    cbox.appendChild(cin); crow.appendChild(cbox);
    var cout = el('div', 'ln dim', 'selections are announced after the whitelist closes.');
    crow.appendChild(button('check status', 'btn-sm', async function () {
      var u = parseUsername(cin.value);
      if (!u) { cout.className = 'ln err'; cout.textContent = '✗ invalid username'; return; }
      cout.className = 'ln dim'; cout.textContent = '> checking @' + u + ' ...';
      var r = DEMO ? { ok: true, status: 'PENDING' } : await apiGet('action=check&u=' + encodeURIComponent(u));
      if (!r || !r.ok) { cout.className = 'ln err'; cout.textContent = '✗ could not check right now'; return; }
      var s2 = r.status;
      if (s2 === 'GTD') { cout.className = 'ln ok'; cout.textContent = '✓ @' + u + ' is selected for GTD. free mint guaranteed.'; }
      else if (s2 === 'FCFS') { cout.className = 'ln sky'; cout.textContent = '✓ @' + u + ' is selected for FCFS. free mint, first come first served.'; }
      else if (s2 === 'PENDING') { cout.className = 'ln ok'; cout.textContent = '✓ @' + u + ' is whitelisted. selection is pending.'; }
      else if (s2 === 'IN_PROGRESS') { cout.className = 'ln err'; cout.textContent = '✗ @' + u + ' has not finished all tasks.'; }
      else { cout.className = 'ln err'; cout.textContent = '✗ @' + u + ' is not on the list.'; }
    }));
    chk.appendChild(crow); chk.appendChild(cout);
    lp.appendChild(chk);
  }

  var lastStats = null;
  function boardRow(i, u, val, tag) {
    var d = el('div', 'ln brow');
    d.appendChild(el('span', i === 0 ? 'hl' : 'dim', String(i + 1).padStart(2, '0')));
    d.appendChild(el('span', 'bu', '@' + u));
    if (tag) d.appendChild(el('span', 'tag ' + tag.toLowerCase(), tag));
    d.appendChild(el('span', 'ok bv', val));
    return d;
  }
  function renderFeed(j) {
    if (j) lastStats = j;
    var R = C.RULES || {};
    var games = (lastStats && Array.isArray(lastStats.topGame)) ? lastStats.topGame : [];
    var lb = $('#lobbyBoard');
    if (lb) {
      lb.textContent = '';
      if (!games.length) lb.appendChild(el('div', 'ln dim', DEMO ? '[demo] scores appear here once the sheet is connected.' : 'no scores yet. be the first fighter.'));
      games.slice(0, 25).forEach(function (r, i) {
        lb.appendChild(boardRow(i, r.u, fmt(r.n) + ' ' + TICKER, i < (R.GAME_GTD || 200) ? 'GTD' : i < (R.GAME_GTD || 200) + (R.GAME_FCFS || 300) ? 'FCFS' : ''));
      });
    }
    var lb2 = $('#lobbyBest'), best = (lastStats && Array.isArray(lastStats.topBest)) ? lastStats.topBest : [];
    if (lb2) {
      lb2.textContent = '';
      if (!best.length) lb2.appendChild(el('div', 'ln dim', DEMO ? '[demo] scores appear here once the sheet is connected.' : 'no rounds yet.'));
      best.slice(0, 8).forEach(function (r, i) { lb2.appendChild(boardRow(i, r.u, fmt(r.n) + ' ' + TICKER, '')); });
    }
    var top = (lastStats && Array.isArray(lastStats.top)) ? lastStats.top : [];
    var rb = $('#refBoard');
    if (rb) {
      rb.textContent = '';
      if (!top.length) rb.appendChild(el('div', 'ln dim', DEMO ? '[demo] inviters appear here once the sheet is connected.' : 'no invites yet. be the first inviter.'));
      var mx = top.length ? top[0].n : 1;
      top.slice(0, 50).forEach(function (r, i) {
        var row = boardRow(i, r.u, r.n + (r.n === 1 ? ' invite' : ' invites'), i < (R.REF_GTD || 100) ? 'GTD' : i < (R.REF_GTD || 100) + (R.REF_FCFS || 200) ? 'FCFS' : '');
        var bar = el('i', 'rbar'); bar.style.width = Math.max(4, Math.round(r.n / mx * 100)) + '%'; row.appendChild(bar);
        rb.appendChild(row);
      });
    }
    var fd = $('#feed');
    if (!fd) return;
    fd.textContent = '';
    var recent = (lastStats && Array.isArray(lastStats.recent)) ? lastStats.recent : [];
    if (!recent.length) fd.appendChild(el('div', 'ln dim', DEMO ? '[demo] live entries appear here once the sheet is connected.' : '[feed] waiting for the first entries...'));
    recent.slice(0, 8).forEach(function (r) {
      var d = el('div', 'ln'); d.appendChild(el('span', 'dim', '[' + ago(r.t) + '] ')); d.appendChild(el('span', 'ps', '@' + r.u)); d.appendChild(el('span', 'ok', ' joined the whitelist ✓'));
      fd.appendChild(d);
    });
    if (lastStats && lastStats.players) fd.appendChild(el('div', 'ln dim', '[arena] ' + fmt(lastStats.players) + ' players · ' + fmt(lastStats.totalFluff || 0) + ' ' + TICKER + ' earned so far'));
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
    var imgs = COLL.map(function (c) { return { src: c.src, traits: Object.assign({ Character: c.name }, c.traits || {}, { Status: 'Preview' }) }; });
    var idx = Math.floor(Math.random() * Math.max(1, imgs.length)), cur = null, phase = 'wait', t0 = 0, count = 0;
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
            return { id: 1 + Math.floor(Math.random() * SUPPLY), traits: item.traits };
          }
        }
      }
      var id = 1 + Math.floor(Math.random() * SUPPLY);
      var vi = Math.floor(Math.random() * ART_BGS.length), av = await artVariant(vi, S);
      if (av) {
        octx.clearRect(0, 0, S, S); octx.drawImage(av, 0, 0);
        return { id: id, traits: { Character: 'ElyFluff', Hat: 'Bunny', Jacket: 'Retro wave', Background: ART_BGS[vi][0], Status: 'Preview' } };
      }
      octx.imageSmoothingEnabled = false;
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
      if (!cv.isConnected) { phase = 'stop'; return; }
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
      if (phase === 'stop' || !cv.isConnected) return;
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
      var iv2;
      var show = async function () {
        if (!cv.isConnected) { clearInterval(iv2); return; }
        cur = await prepare(); ctx.drawImage(off, 0, 0); readout(cur);
        fill.style.width = '100%'; tag.textContent = 'DECODED'; tag.classList.add('decoded');
        count++; $('#roCount').textContent = count;
      };
      show(); iv2 = setInterval(show, 4500);
      return;
    }
    next();
    requestAnimationFrame(frame);
  }

  /* ---------- treasure map roadmap ---------- */
  var CURRENT_PHASE = 0;
  function phases() {
    var R = C.RULES || {};
    return [
      { n: 'I', name: 'Whitelist Isle', place: 'Phase 01 · you are here', text: 'The journey starts here. Join, fight in the arena and grow your crew.', items: ['Finish the X tasks and register your wallet', 'Play Fluff Arena and earn ' + TICKER, 'Invite friends and earn ' + (R.REF_BONUS_PCT || 10) + '% of what they earn'] },
      { n: 'II', name: 'Selection Reef', place: 'Phase 02', text: 'The crew is chosen by skill, by invites and by luck.', items: ['Game leaderboard: top ' + (R.GAME_GTD || 200) + ' GTD, next ' + (R.GAME_FCFS || 300) + ' FCFS', 'Invite leaderboard: top ' + (R.REF_GTD || 100) + ' GTD, next ' + (R.REF_FCFS || 200) + ' FCFS', 'Remaining spots: raffle among all whitelisted wallets'] },
      { n: 'III', name: 'Elysium Gate', place: 'Phase 03 · date on X', text: 'ElyFluff goes live on Elysium mainnet. The launch date is announced on X.', items: ['Launch date announced on @' + handle(), 'GTD and FCFS wallets are loaded into OpenSea', 'Check your wallet with the wallet checker'] },
      { n: 'IV', name: 'Free Mint Bay', place: 'Phase 04 · OpenSea', text: 'The ' + fmt(SUPPLY) + ' ElyFluffs are minted for free on OpenSea. Gas only.', items: ['GTD stage first: guaranteed, 1 per wallet', 'FCFS stage next: first come, while supply lasts', 'Mint only from the official OpenSea link'] },
      { n: 'V', name: 'Fluff Treasury', place: 'The treasure', text: TICKER + ' goes live on Elysium. The treasure waits here.', items: ['Every arena ' + TICKER + ' and invite bonus is paid on Elysium mainnet', 'Claim with your registered wallet', '40% of ' + TICKER + ' to NFT holders'] }
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
    var st = i === CURRENT_PHASE ? ['tm-status now', 'LIVE NOW'] : (i === 4 ? ['tm-status tr', 'THE TREASURE'] : ['tm-status up', i < CURRENT_PHASE ? 'COMPLETE' : 'UPCOMING']);
    var pill = el('span', st[0]);
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

  /* ---------- agent ---------- */
  function kb() {
    var p = C.GTD_MINT_PRICE || 'FREE', hx = '@' + handle();
    return [
      { k: ['game', 'arena', 'play', 'fight', 'shooter', 'militia', 'battle'], a: 'Fluff Arena is our 2D jetpack battle game. It unlocks after you finish the whitelist tasks.\n\nPick a map (Elysium, HyperEVM City or Crimson Core). A round lasts ' + Math.round(((window.FluffArena && window.FluffArena.config.round) || 900) / 60) + ' minutes and you have one life, unless you grab a 1UP. Defeat enemies and they drop ' + TICKER + ', but bots collect it too, so be fast. Everything you earn is added to your claimable balance.' },
      { k: ['red', 'zone', 'redzone', 'danger'], a: 'In Fluff Arena, an air raid hits the red zone at the 10:00 mark. Dozens of missiles fall from the sky and nobody knows where they land, so get out fast when the warning appears.' },
      { k: ['blue', 'bluezone', 'drop', 'drops', 'rain'], a: 'In the last 5 minutes of a Fluff Arena round, a BLUE ZONE opens and ' + TICKER + ' rains down inside it. Expect a big fight there.' },
      { k: ['claim', 'claimable', 'withdraw', 'earn', 'earned', 'balance', 'carry'], a: 'Every ' + TICKER + ' you earn in Fluff Arena, plus your invite bonus, is added to your claimable balance. It is paid as real ' + TICKER + ' on Elysium mainnet: you claim it in the launchpad with your registered wallet.' },
      { k: ['key', 'access', 'login', 'password', 'device', 'lost'], a: 'When you join you get a private access key. You need it to log in on another phone or computer, and it protects your ' + TICKER + '. Find it under "my access key" after you log in. Never share it with anyone.' },
      { k: ['selection', 'selected', 'raffle', 'lottery', 'chosen', 'pick', 'picked', 'spots'], a: 'Selection:\n\nGame leaderboard: top ' + ((C.RULES || {}).GAME_GTD || 200) + ' get GTD, next ' + ((C.RULES || {}).GAME_FCFS || 300) + ' get FCFS.\nInvite leaderboard: top ' + ((C.RULES || {}).REF_GTD || 100) + ' get GTD, next ' + ((C.RULES || {}).REF_FCFS || 200) + ' get FCFS.\nAll remaining spots go to a raffle among everyone who joined the whitelist.' },
      { k: ['weapon', 'weapons', 'gun', 'guns', 'smg', 'shotgun', 'sniper', 'rocket', 'shield'], a: 'Weapon crates fall from the sky: Fluff SMG, Cloud Burst (shotgun), Halo Rail (sniper) and Crimson Rocket. Halo Shields absorb damage. You always keep your Blaster.' },
      { k: ['life', 'lives', '1up', 'respawn', 'revive', 'die', 'dead'], a: 'You have one life. If you are defeated, you are out, unless you picked up a 1UP. 1UPs fall from the sky now and then, and can drop from enemies you defeat.' },
      { k: ['map', 'maps', 'heaven', 'elysium map', 'city', 'core'], a: 'There are 3 maps: Elysium (the heaven above the chain), HyperEVM City and Crimson Core. Choose one, or pick Random.' },
      { k: ['leaderboard', 'top', 'rank', 'ranking', 'record'], a: 'The game leaderboard ranks everyone by total ' + TICKER + ' earned in Fluff Arena. Top ' + ((C.RULES || {}).GAME_GTD || 200) + ' get GTD, the next ' + ((C.RULES || {}).GAME_FCFS || 300) + ' get FCFS. There is also an invite leaderboard and a best single round board.' },
      { k: ['controls', 'jetpack', 'shoot', 'aim', 'move'], a: 'Touch: left stick moves, push it up to use the jetpack. Right stick aims, push it far to shoot.\nKeyboard: A/D move, W or space jetpack, mouse to aim, click to shoot, R to reload.' },
      { k: ['hi', 'hello', 'hey', 'gm', 'yo', 'sup'], a: 'Hey! I am the ElyFluff assistant. Ask me about the whitelist, the free mint, GTD and FCFS, the game, tokenomics or the roadmap.' },
      { k: ['what', 'about', 'elyfluff', 'project', 'explain', 'is'], a: 'ElyFluff is a ' + fmt(SUPPLY) + '-piece NFT collection paired with the ' + TICKER + ' token, launching on Elysium mainnet.\n\nThe NFT mint is free on OpenSea for selected wallets, and the ' + TICKER + ' you earn in Fluff Arena is paid on Elysium.' },
      { k: ['whitelist', 'wl', 'join', 'apply', 'how', 'task', 'tasks', 'qualify', 'eligible'], a: 'To join the whitelist:\n\n1. Enter your X username\n2. Follow ' + hx + ' on X\n3. Like and repost our post\n4. Write your comment here, it is posted as a reply on X\n5. Register your EVM wallet\n\nThen you get your access key, your ElyFluff card and an invite link.' },
      { k: ['gtd', 'guaranteed', 'guarantee'], a: 'GTD means guaranteed. GTD wallets get a FREE ElyFluff mint in the first OpenSea stage. GTD goes to the top ' + ((C.RULES || {}).GAME_GTD || 200) + ' of the game leaderboard, the top ' + ((C.RULES || {}).REF_GTD || 100) + ' inviters and raffle winners. Use the wallet checker to see if you are in.' },
      { k: ['fcfs', 'first', 'come', 'served'], a: 'FCFS means first come, first served. FCFS wallets also mint for FREE on OpenSea, in the stage right after GTD, while supply lasts.' },
      { k: ['difference', 'vs', 'versus', 'compare', 'gtd', 'fcfs'], a: 'Both are FREE mints on OpenSea.\n\nGTD: guaranteed, first stage.\nFCFS: second stage, first come first served, until the ' + fmt(SUPPLY) + ' supply is gone.' },
      { k: ['mint', 'price', 'cost', 'hype', 'pay', 'minting', 'free', 'opensea'], a: 'The ElyFluff mint is FREE and happens on OpenSea, not on this website. You only pay the network gas fee. One free mint per selected wallet. ' + (C.OPENSEA_URL ? 'Always use the OpenSea link in the launchpad section.' : 'The official OpenSea link will be shared on this site and on ' + hx + '.') },
      { k: ['token', 'fluff', 'ticker', 'supply', 'coin'], a: 'The token is ' + TICKER + '. The total supply is ' + (C.TOKEN_SUPPLY || 'TBA') + ' and will be announced later.' },
      { k: ['tokenomics', 'allocation', 'distribution', 'split', 'percent', 'share'], a: TICKER + ' allocation:\n\n40% NFT holders\n20% token holders\n15% Elysium active users\n15% liquidity\n5% team\n5% vault (marketing)' },
      { k: ['mainnet', 'elysium', 'launch', 'date', 'when', 'live', 'time'], a: 'ElyFluff launches on Elysium mainnet. The launch date is not set yet: it will be announced on ' + hx + ' and on this site.' },
      { k: ['testnet', 'hyperevm', 'hyperliquid', 'network', 'chain', 'faucet', 'gas'], a: 'There is no testnet phase. Everything happens on Elysium mainnet, Kinetiq\'s Layer 2 for Hyperliquid. Gas is paid in HYPE, so keep a little HYPE on Elysium.' },
      { k: ['selection', 'selected', 'announce', 'result', 'winner', 'status', 'check', 'checker', 'eligible'], a: 'Use the wallet checker on this site: paste your wallet address and it shows if you are GTD, FCFS or not selected yet. Selections are also announced on ' + hx + '.' },
      { k: ['referral', 'invite', 'ref', 'friends', 'code', 'bonus'], a: 'After you join you get an invite link. You earn ' + ((C.RULES || {}).REF_BONUS_PCT || 10) + '% of everything your friends earn in Fluff Arena. Friends count once they finish all tasks.\n\nTop ' + ((C.RULES || {}).REF_GTD || 100) + ' inviters get GTD, the next ' + ((C.RULES || {}).REF_FCFS || 200) + ' get FCFS.' },
      { k: ['card', 'social', 'image', 'download'], a: 'When you finish all 4 tasks, the site creates your ElyFluff card. You can download it and share it on X.' },
      { k: ['wallet', 'seed', 'phrase', 'private', 'safe', 'scam', 'dm', 'security'], a: 'Stay safe: we never ask for your seed phrase or private key, and we never DM you first. Only trust ' + hx + ' and this website. You only need to enter your public wallet address.' },
      { k: ['roadmap', 'phase', 'plan', 'next', 'steps'], a: 'Roadmap:\n\n1. Whitelist, Fluff Arena and invites (live now)\n2. Selection: game board, invite board, raffle\n3. Launch on Elysium mainnet (date announced on X)\n4. Free mint on OpenSea: GTD first, then FCFS\n5. ' + TICKER + ' claim on Elysium' },
      { k: ['team', 'founder', 'dev'], a: 'The team allocation is 5% of ' + TICKER + '. Follow ' + hx + ' on X for team updates.' },
      { k: ['vault', 'marketing'], a: 'The vault holds 5% of ' + TICKER + ' and is used for marketing.' },
      { k: ['liquidity', 'lp', 'pool'], a: '15% of ' + TICKER + ' is set aside for liquidity.' },
      { k: ['nft', 'collection', 'art', 'fluffs', 'traits'], a: 'The ElyFluff collection has ' + fmt(SUPPLY) + ' NFTs. NFT holders receive 40% of the ' + TICKER + ' supply, the largest share.' },
      { k: ['value', 'worth', 'profit', 'pump', 'moon', 'investment'], a: 'I cannot give price predictions or financial advice. Follow ' + hx + ' for official updates.' },
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
        return 'That is inside the ElyFluff vault. Complete the 4 whitelist tasks to unlock the tokenomics, the treasure map roadmap and the free mint launchpad.';
      }
      return best.a;
    }
    return 'I can help with ElyFluff details: the whitelist, the free mint, GTD and FCFS, tokenomics and the roadmap. For anything else, follow @' + handle() + ' on X.';
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
    var CH = ['What is ElyFluff?', 'How do I join?', 'Is the mint free?', 'How does the game work?', 'How is selection done?', 'Invite bonus', 'GTD vs FCFS', 'Tokenomics', 'When is mainnet?', 'Is it safe?'];
    CH.forEach(function (c) {
      var b = el('button', 'chip', c); b.type = 'button';
      b.addEventListener('click', function () { ask(c); });
      chips.appendChild(b);
    });
    function open() {
      box.hidden = false; document.body.classList.add('agent-open');
      if (!started) { started = true; typeOut('Hi, I am ElyFluff AI. Ask me anything about the project: whitelist, the free mint, GTD and FCFS, tokenomics or the roadmap.'); }
      setTimeout(function () { if (window.innerWidth > 600) inp.focus(); }, 200);
    }
    function close() { box.hidden = true; document.body.classList.remove('agent-open'); }
    $$('[data-open-agent]').forEach(function (b) { b.addEventListener('click', open); });
    $('#agentClose').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); var q = inp.value; inp.value = ''; ask(q); });
  }

  /* ---------- start ---------- */
  async function run() {
    OUT = $('#out'); SCREEN = $('#screen'); PROMPT = $('#prompt');
    if (WL.complete && WL.cardSeen) { FAST = true; await memberStage(); FAST = false; return; }
    FAST = !!WL.username;
    await boot();
    liveValues();
    await identify();
    if (WL.complete && WL.cardSeen) { FAST = false; await clearScreen(); await memberStage(); return; }
    if (!WL.complete) FAST = false;
    await tasksStage();
    await walletStage();
    FAST = false;
    await keyStage();
    await permitStage();
    await clearScreen();
    await memberStage();
  }
  function start() {
    fillConfig();
    agent();
    run();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { buildMap(false); }, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
