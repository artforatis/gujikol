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
    var map = { TICKER: TICKER, NFT_SUPPLY_FMT: fmt(SUPPLY), TOKEN_SUPPLY: C.TOKEN_SUPPLY || 'TBA', X_HANDLE_AT: '@' + handle(), GTD_MINT_PRICE: C.GTD_MINT_PRICE || '0.33 HYPE' };
    $$('[data-cfg]').forEach(function (e) { var v = map[e.getAttribute('data-cfg')]; if (v != null) e.textContent = v; });
    $$('[data-x-profile]').forEach(function (a) { a.href = 'https://x.com/' + encodeURIComponent(handle()); });
    var t = $('.title');
    if (t) { t.textContent = ''; t.appendChild(document.createTextNode('Ely')); t.appendChild(el('span', 't2', 'Fluff')); }
    var av = $('#avatar');
    if (av) { var ac = av.getContext('2d'); ac.imageSmoothingEnabled = false; drawFluff(ac, av.width, 4242); }
  }

  /* ---------- state ---------- */
  var WL_KEY = 'ef_term_v1';
  var EMPTY = function () { return { username: '', done: { follow: false, like: false, repost: false, comment: false }, opened: {}, comment: '', wallet: '', applicantId: '', complete: false }; };
  var WL = Object.assign(EMPTY(), store.get(WL_KEY) || {});
  WL.done = Object.assign(EMPTY().done, WL.done || {});
  WL.opened = WL.opened || {};
  function save() { store.set(WL_KEY, WL); }
  function isUnlocked() { return !!WL.complete; }
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
  function siteBase() { var s = String(C.SITE_URL || '').replace(/\/+$/, ''); return s || (location.origin + location.pathname).replace(/\/index\.html$/, '').replace(/\/+$/, ''); }
  function refLink() { return siteBase() + '/?ref=' + encodeURIComponent(WL.applicantId || ''); }
  (function captureRef() {
    try { var r = new URLSearchParams(location.search).get('ref'); if (r && REF_RE.test(r.toUpperCase())) store.set('ef_ref', r.toUpperCase()); } catch (e) {}
  })();

  /* ---------- api ---------- */
  async function api(action, data) {
    var body = Object.assign({ action: action }, data);
    if (DEMO) {
      await sleep(700);
      if (action === 'ask') return { ok: false };
      var steps = { follow: 2, engage: 3, comment: 4, wallet: 5 };
      return { ok: true, step: steps[action], applicantId: WL.applicantId || ('EF-' + pad(1 + Math.floor(Math.random() * 999), 5)) };
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
  function win(title, cls) {
    var w = el('div', 'win' + (cls ? ' ' + cls : ''));
    var b = el('div', 'win-bar');
    var dots = el('span', 'dots'); dots.appendChild(el('i', 'd1')); dots.appendChild(el('i')); dots.appendChild(el('i'));
    b.appendChild(dots); b.appendChild(el('span', 'win-title', title)); b.appendChild(el('span'));
    var body = el('div', 'win-body');
    w.appendChild(b); w.appendChild(body);
    OUT.appendChild(w); scrollEnd();
    return body;
  }
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

  /* ---------- live values ---------- */
  function liveValues() {
    function cdTick() {
      var t = timeLeft(); if (!t) return;
      var txt = t.live ? 'LIVE' : t.d + 'd ' + pad(t.h, 2) + 'h ' + pad(t.m, 2) + 'm ' + pad(t.s, 2) + 's';
      $$('.cdv').forEach(function (e) { e.textContent = txt; });
    }
    cdTick(); setInterval(cdTick, 1000);

    var url = C.HYPEREVM_TESTNET_RPC, last = 0, fails = 0, timer;
    async function blk() {
      try {
        var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 6000);
        var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}', signal: ctrl.signal });
        clearTimeout(to);
        var n = parseInt((await r.json()).result, 16);
        if (!isFinite(n)) throw 0;
        fails = 0;
        if (n !== last) { last = n; $$('.blk').forEach(function (e) { e.textContent = '#' + fmt(n); e.classList.remove('tick'); void e.offsetWidth; e.classList.add('tick'); }); }
      } catch (e) {
        if (++fails > 2) { clearInterval(timer); if (!last) $$('.blk').forEach(function (e) { e.textContent = 'online'; }); }
      }
    }
    if (url) { blk(); timer = setInterval(function () { if (!document.hidden) blk(); }, 4000); }
    else $$('.blk').forEach(function (e) { e.textContent = 'online'; });

    async function stats() {
      var j = await apiGet('action=stats');
      if (!j || !j.ok) return;
      var n = Number(j.count) || 0;
      $$('.apps').forEach(function (e) {
        var v = n > 0 ? fmt(n) + ' whitelisted' : 'be the first';
        if (e.textContent !== v) { e.textContent = v; e.classList.remove('tick'); void e.offsetWidth; e.classList.add('tick'); }
      });
      renderFeed(j);
    }
    if (!DEMO) { stats(); setInterval(function () { if (!document.hidden) stats(); }, 20000); }
    else $$('.apps').forEach(function (e) { e.textContent = 'demo mode'; });
  }

  /* ---------- boot ---------- */
  async function boot() {
    await typeLine('$ ./whitelist --project elyfluff', null, 24);
    await pause(250);
    line('[boot] loading whitelist protocol... done', 'dim'); await pause(150);
    line('[boot] network: hyperevm testnet → elysium mainnet', 'dim'); await pause(150);
    line([['dim', '[boot] hyperevm testnet block: '], ['live-v blk', 'syncing...']]); await pause(150);
    line([['dim', '[boot] elysium mainnet in: '], ['live-v cdv', '--']]); await pause(150);
    line([['dim', '[boot] applicants: '], ['live-v apps', '--']]); await pause(150);
    line([['dim', '[boot] status: '], ['hl', TICKER + ' WHITELIST OPEN']]);
    gap();
    await typeLine('$ ./scan --collection elyfluff --live', null, 18);
    scanWindow();
    gap();
    if (!WL.complete) {
      line([['dim', '[vault] project files are encrypted. complete the tasks to decrypt.']]);
      var v = el('div', 'vault-locked');
      [['about.txt'], ['tokenomics.cfg'], ['launchpad.sh'], ['treasure_map.png'], ['live_feed.log']].forEach(function (f) {
        var r = el('div', 'f'); r.appendChild(el('span', null, f[0])); r.appendChild(el('span', null, '[locked]')); v.appendChild(r);
      });
      OUT.appendChild(v);
      gap();
    }
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

  /* ---------- identify ---------- */
  async function identify() {
    line('? identify yourself. enter your X username.');
    if (WL.username) {
      line([['ps', 'x_user@elyfluff:~$ '], WL.username]);
    } else {
      while (true) {
        var v = await ask('x_user@elyfluff:~$', 'username', { max: 60 });
        line([['ps', 'x_user@elyfluff:~$ '], v]);
        var u = parseUsername(v);
        if (u) { WL.username = u; save(); break; }
        line('✗ invalid username. use letters, numbers or _ (max 15).', 'err');
      }
    }
    if (!WL.complete && !DEMO) {
      var c = await apiGet('action=check&u=' + encodeURIComponent(WL.username));
      if (c && c.ok && (c.status === 'PENDING' || c.status === 'GTD' || c.status === 'FCFS')) {
        WL.complete = true; WL.done = { follow: true, like: true, repost: true, comment: true };
        if (c.id) WL.applicantId = c.id;
        if (c.wallet) WL.wallet = c.wallet;
        save();
        FAST = true;
      }
    }
    var w = line([['ok', '✓ welcome' + (WL.complete ? ' back' : '') + ', @' + WL.username + '  ']]);
    var reset = el('button', 'btn btn-sm btn-ghost', 'not you? reset');
    reset.type = 'button';
    reset.addEventListener('click', function () { store.del(WL_KEY); location.reload(); });
    w.appendChild(reset);
    gap();
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
        { k: 'comment', h: 'Comment on the post', d: 'reply with anything, then paste your reply link here', ok: 'comment complete', url: 'https://x.com/intent/tweet?in_reply_to=' + pid }
      ];
      var wrap = el('div', 'tasks'); OUT.appendChild(wrap);
      var busyK = {}, errK = {}, boxes = {}, finished = false;
      defs.forEach(function (d, i) {
        var b = el('div', 'task'); b.setAttribute('role', 'button'); b.tabIndex = 0;
        var hh = el('div', 't-h'); hh.appendChild(el('em', null, '[0' + (i + 1) + '/04] ')); hh.appendChild(document.createTextNode(d.h));
        b.appendChild(hh); b.appendChild(el('div', 't-d', d.d));
        var st = el('span', 't-s'); b.appendChild(st);
        d.st = st; d.box = b; d.i = i; boxes[d.k] = d;
        b.addEventListener('click', function (e) { if (e.target.closest('.task-extra')) return; tap(d); });
        b.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.task-extra')) { e.preventDefault(); tap(d); } });
        wrap.appendChild(b);
      });
      function prevDone(d) { return d.i === 0 || WL.done[defs[d.i - 1].k]; }
      function state(d) {
        if (WL.done[d.k]) return 'done';
        if (!prevDone(d)) return 'locked';
        if (busyK[d.k]) return 'busy';
        if (WL.opened[d.k]) return 'wait';
        return 'idle';
      }
      function refresh() {
        defs.forEach(function (d) {
          var s = state(d), b = d.box;
          b.classList.toggle('done', s === 'done'); b.classList.toggle('locked', s === 'locked'); b.classList.toggle('wait', s === 'wait' || s === 'busy');
          if (s !== 'busy') {
            d.st.className = 't-s';
            if (s === 'done') d.st.textContent = '✓ ' + d.ok;
            else if (s === 'locked') d.st.textContent = '[locked] finish task 0' + d.i + ' first';
            else if (s === 'wait') d.st.textContent = errK[d.k] ? '✗ ' + errK[d.k] + ' · tap to try again' : (d.k === 'comment' ? '→ paste your reply link below' : '… finish on X, then come back here');
            else { d.st.textContent = ''; d.st.appendChild(el('span', 'go', '→ tap to open X')); }
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
        if (s === 'locked' || s === 'done' || s === 'busy') return;
        if (s === 'wait' && errK[d.k] && d.k !== 'comment') { verify(d); return; }
        openUrl(d.url);
        WL.opened[d.k] = Date.now(); errK[d.k] = ''; save();
        refresh();
      }
      async function verify(d, extra) {
        busyK[d.k] = true; errK[d.k] = ''; refresh();
        var stop = spinner(d.st, 'verifying ' + d.k + '...');
        var resp = { ok: true };
        await sleep(FAST ? 0 : 900);
        if (d.k === 'follow') {
          resp = await api('follow', { username: WL.username, ref: store.get('ef_ref') || '' });
          if (resp && resp.ok) {
            if (resp.applicantId) WL.applicantId = resp.applicantId;
            if (resp.step > 2) { WL.done.like = true; WL.done.repost = true; }
            if (resp.step > 3) WL.done.comment = true;
            if (resp.step >= 5) { WL.complete = true; if (resp.wallet) WL.wallet = resp.wallet; }
          }
        } else if (d.k === 'repost') {
          for (var tries = 0; tries < 3; tries++) {
            resp = await api('engage', { username: WL.username });
            if (resp && resp.ok) break;
            if (!(resp && /too fast/i.test(resp.error || ''))) break;
            await sleep(3000);
          }
        } else if (d.k === 'comment') {
          resp = await api('comment', { username: WL.username, commentUrl: extra });
          if (resp && resp.ok) WL.comment = extra;
        }
        stop();
        busyK[d.k] = false;
        if (resp && resp.ok) { WL.done[d.k] = true; save(); }
        else { errK[d.k] = (resp && resp.error ? String(resp.error).toLowerCase().replace(/\.$/, '') : 'could not verify'); }
        refresh();
      }
      function commentExtra(d, s) {
        var ex = d.box.querySelector('.task-extra');
        if (s !== 'wait') { if (ex) ex.remove(); return; }
        if (ex) return;
        ex = el('div', 'task-extra');
        ex.appendChild(el('div', 'dim', 'on X: tap share on your reply → copy link → paste here'));
        var row = el('div', 'inrow');
        var box = el('label', 'inbox'), inp = el('input');
        inp.type = 'url'; inp.placeholder = 'https://x.com/you/status/...'; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize', 'off'); inp.spellcheck = false; inp.maxLength = 200;
        inp.setAttribute('aria-label', 'Your reply link');
        box.appendChild(inp); row.appendChild(box);
        row.appendChild(button('paste', 'btn-sm btn-ghost', async function () { try { var t = await navigator.clipboard.readText(); if (t) inp.value = t.trim(); } catch (e) { inp.focus(); } }));
        row.appendChild(button('verify ↵', 'btn-sm', submit));
        row.appendChild(button('open X ↗', 'btn-sm btn-ghost', function () { openUrl(d.url); WL.opened.comment = Date.now(); save(); }));
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        ex.appendChild(row);
        d.box.appendChild(ex);
        function submit() {
          var m = String(inp.value || '').trim().match(REPLY_RE);
          if (!m) { errK.comment = 'paste the link of your reply'; refresh(); return; }
          if (m[1].toLowerCase() !== WL.username.toLowerCase()) { errK.comment = 'this reply is not from @' + WL.username; refresh(); return; }
          if (m[2] === postId()) { errK.comment = 'that is our post, paste your own reply'; refresh(); return; }
          var left = Math.ceil(MIN_SEC - (Date.now() - (WL.opened.comment || 0)) / 1000);
          if (left > 0) { errK.comment = 'finish on X first, try again in ' + left + 's'; refresh(); return; }
          verify(d, 'https://x.com/' + m[1] + '/status/' + m[2]);
        }
      }
      function autoCheck() {
        if (finished) return;
        defs.forEach(function (d) {
          if (d.k === 'comment' || state(d) !== 'wait' || errK[d.k]) return;
          if (Date.now() - (WL.opened[d.k] || 0) >= MIN_SEC * 1000) verify(d);
        });
      }
      var iv = setInterval(function () { if (finished) { clearInterval(iv); return; } if (!document.hidden) autoCheck(); }, 1200);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(autoCheck, 400); });
      refresh();
    });
  }

  /* ---------- wallet ---------- */
  async function walletStage() {
    gap();
    line('? enter your EVM wallet address for HyperEVM testnet (starts with 0x).');
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
      var resp = await api('wallet', { username: WL.username, wallet: v });
      stop(); t.textContent = 'transmitting... done';
      if (!resp || !resp.ok) { line('✗ ' + String((resp && resp.error) || 'could not save, try again').toLowerCase(), 'err'); continue; }
      WL.wallet = v; WL.complete = true;
      if (resp.applicantId) WL.applicantId = resp.applicantId;
      save();
      line('✓ whitelisted', 'ok');
      break;
    }
  }

  /* ---------- permit ---------- */
  async function permitStage() {
    await typeLine('$ ./print_permit --holder @' + WL.username, null, 18);
    var body = win('elyfluff@permit: ~/permits/' + (WL.applicantId || 'EF-00000') + '.txt', 'red permit');
    var cv = el('canvas'); cv.width = 1200; cv.height = 720; cv.setAttribute('aria-label', 'Your ElyFluff whitelist permit');
    body.appendChild(cv);
    await drawPermit(cv);
    var row = el('div', 'btn-row');
    row.appendChild(button('download ↓', '', function () { downloadCanvas(cv); }));
    row.appendChild(button('share on X ↗', 'btn-ghost', function () {
      var text = 'I just got my ' + (C.PROJECT_NAME || 'ElyFluff') + ' whitelist permit.\n\n' + fmt(SUPPLY) + ' NFTs + ' + TICKER + '. Testnet on HyperEVM, mainnet on Elysium.\n\nJoin with my invite: ' + refLink() + '\n\n@' + handle();
      openUrl('https://x.com/intent/tweet?text=' + encodeURIComponent(text));
    }));
    var cp = button('copy invite link', 'btn-ghost', async function () {
      try { await navigator.clipboard.writeText(refLink()); cp.textContent = 'copied ✓'; } catch (e) { cp.textContent = 'copy failed'; }
      setTimeout(function () { cp.textContent = 'copy invite link'; }, 1800);
    });
    row.appendChild(cp);
    OUT.appendChild(row);
    line([['dim', 'your invite link: '], ['sky', refLink()]]);
    line('keep notifications on for @' + handle() + ', updates will be announced there.', 'dim');
    gap();
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
    var sp = document.createElement('canvas'); sp.width = sp.height = is;
    var spx = sp.getContext('2d', { willReadFrequently: true });
    var imgs = (C.NFT_IMAGES || []).filter(function (i) { return i && i.src; });
    var specId = 1 + (seed % SUPPLY), drawn = false;
    if (imgs.length) { var item = imgs[seed % imgs.length], im = await loadImg(item.src); if (im) { coverDraw(spx, im, is); drawn = true; specId = item.id || specId; } }
    if (!drawn) drawFluff(spx, is, seed);
    x.drawImage(sp, ix, iy);
    T('holder_photo: [ELYFLUFF #' + pad(specId) + ']', ix, iy + is + 44, '500 17px "IBM Plex Mono", monospace', '#5F6E6A', 0.5);
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

    var rows = [['wallet', shortWallet(WL.wallet) || '0x...'], ['permit_id', WL.applicantId || 'EF-00000'], ['issued', new Date().toLocaleDateString('en-GB').replace(/\//g, '.')], ['network', 'hyperevm → elysium']];
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

  /* ---------- vault ---------- */
  async function vaultStage() {
    await typeLine('$ ./vault --decrypt', null, 20);
    var t = line('', 'dim'), stop = spinner(t, 'decrypting project files...');
    await pause(1100);
    stop(); t.textContent = 'decrypting project files... done';
    line([['ok', '✓ access granted. '], ['hl teal', '5 FILES DECRYPTED']]);
    gap();

    await typeLine('$ cat about.txt', null, 16);
    var a = win('elyfluff@vault: ~/about.txt');
    [['ElyFluff is a ' + fmt(SUPPLY) + '-piece NFT collection paired with the ' + TICKER + ' token, built for the Elysium mainnet.'],
     ['Before mainnet, ElyFluff runs a full test launch on HyperEVM Testnet. Wallets that hold the testnet NFT or testnet ' + TICKER + ' qualify for Elysium mainnet.'],
     ['Access is earned, not bought. Complete the tasks, get selected, secure your spot.']].forEach(function (p) { a.appendChild(el('div', 'ln', p[0])); });
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

    await typeLine('$ ./launchpad.sh --network hyperevm-testnet', null, 16);
    var lp = win('elyfluff@vault: ~/launchpad.sh', 'red');
    var pd = el('div', 'pad');
    function mintCard(cls, tier, title, rows, label, url) {
      var m = el('div', 'mint ' + cls);
      m.appendChild(el('span', 'hl' + (cls === 'fcfs' ? ' ink' : ''), tier));
      m.appendChild(el('h4', null, title));
      rows.forEach(function (r) { var rw = el('div', 'row'); rw.appendChild(el('span', null, r[0])); rw.appendChild(el('span', null, r[1])); m.appendChild(rw); });
      var live = !!C.MINT_LIVE && !!url;
      var s = el(live ? 'button' : 'div', 'soon' + (live ? ' live' : ''), live ? label + ' ↗' : '[ coming soon ]');
      if (live) { s.type = 'button'; s.addEventListener('click', function () { openUrl(url); }); }
      m.appendChild(s);
      return m;
    }
    pd.appendChild(mintCard('gtd', 'GTD', 'Guaranteed mint', [['price', C.GTD_MINT_PRICE || '0.33 HYPE'], ['asset', 'ElyFluff NFT'], ['network', 'HyperEVM Testnet'], ['access', 'GTD list only']], 'mint now', C.GTD_MINT_URL));
    pd.appendChild(mintCard('fcfs', 'FCFS', 'Token claim', [['delivery', 'claim or distribution'], ['asset', 'testnet ' + TICKER], ['network', 'HyperEVM Testnet'], ['access', 'first come, first served']], 'claim now', C.FCFS_CLAIM_URL));
    lp.appendChild(pd);
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
      var s = r.status;
      if (s === 'GTD') { cout.className = 'ln ok'; cout.textContent = '✓ @' + u + ' is selected for GTD. you can mint the testnet NFT.'; }
      else if (s === 'FCFS') { cout.className = 'ln sky'; cout.textContent = '✓ @' + u + ' is selected for FCFS. you will receive testnet ' + TICKER + '.'; }
      else if (s === 'PENDING') { cout.className = 'ln ok'; cout.textContent = '✓ @' + u + ' is whitelisted. selection is pending.'; }
      else if (s === 'IN_PROGRESS') { cout.className = 'ln err'; cout.textContent = '✗ @' + u + ' has not finished all tasks.'; }
      else { cout.className = 'ln err'; cout.textContent = '✗ @' + u + ' is not on the list.'; }
    }));
    chk.appendChild(crow); chk.appendChild(cout);
    lp.appendChild(chk);
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

  var lastStats = null;
  function renderFeed(j) {
    if (j) lastStats = j;
    var fd = $('#feed');
    if (!fd) return;
    fd.textContent = '';
    var recent = (lastStats && Array.isArray(lastStats.recent)) ? lastStats.recent : [];
    var top = (lastStats && Array.isArray(lastStats.top)) ? lastStats.top : [];
    if (!recent.length) fd.appendChild(el('div', 'ln dim', DEMO ? '[demo] live entries appear here once the sheet is connected.' : '[feed] waiting for the first entries...'));
    recent.slice(0, 8).forEach(function (r) {
      var d = el('div', 'ln'); d.appendChild(el('span', 'dim', '[' + ago(r.t) + '] ')); d.appendChild(el('span', 'ps', '@' + r.u)); d.appendChild(el('span', 'ok', ' joined the whitelist ✓'));
      fd.appendChild(d);
    });
    fd.appendChild(el('div', 'ln board-h', '# top inviters'));
    if (!top.length) fd.appendChild(el('div', 'ln dim', 'no invites yet. share your invite link.'));
    top.slice(0, 7).forEach(function (r, i) {
      var d = el('div', 'ln'); d.appendChild(el('span', i === 0 ? 'hl' : 'dim', String(i + 1).padStart(2, '0'))); d.appendChild(document.createTextNode('  @' + r.u + '  ')); d.appendChild(el('span', 'ok', r.n + (r.n === 1 ? ' invite' : ' invites')));
      fd.appendChild(d);
    });
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
  async function run() {
    OUT = $('#out'); SCREEN = $('#screen'); PROMPT = $('#prompt');
    FAST = !!WL.username;
    await boot();
    liveValues();
    await identify();
    if (!WL.complete) FAST = false;
    await tasksStage();
    await walletStage();
    await permitStage();
    await vaultStage();
    FAST = false;
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
