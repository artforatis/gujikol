/* ElyFluff Winner Checker page */
(function () {
  'use strict';
  var C = window.ELYFLUFF_CONFIG || {};
  var URL_ = C.WINNERS_SCRIPT_URL || '';
  var H = String(C.X_HANDLE || 'ElyFluff').replace(/^@/, '');
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  ['ckX', 'ckX2'].forEach(function (id) { var a = $(id); if (a) { a.href = 'https://x.com/' + H; a.textContent = '@' + H; } });

  /* rotate collection art in the header */
  var art = (C.COLLECTION || []).map(function (c) { return c.src; }).filter(Boolean);
  if (art.length > 1) {
    var ai = 0, av = $('ckAv');
    setInterval(function () { if (document.hidden) return; ai = (ai + 1) % art.length; av.src = art[ai]; }, 3500);
  }

  var form = $('ckForm'), inp = $('ckIn'), res = $('ckRes'), go = $('ckGo');

  function show(kind, icon, title, lines, actions) {
    res.hidden = false;
    res.className = 'ck-res wc-res ' + kind;
    res.textContent = '';
    res.appendChild(el('b', 'wc-i', icon));
    var d = el('div');
    d.appendChild(el('div', 'wc-t', title));
    (lines || []).forEach(function (l) { d.appendChild(el('div', 'wc-s', l)); });
    if (actions && actions.length) {
      var row = el('div', 'btn-row ck-act');
      actions.forEach(function (a) { row.appendChild(a); });
      d.appendChild(row);
    }
    res.appendChild(d);
  }
  function linkBtn(label, href, ghost) {
    var a = el('a', 'btn btn-sm' + (ghost ? ' btn-ghost' : ''), label);
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function pageUrl(q) {
    var base = location.href.split('?')[0].split('#')[0];
    return q ? base + '?q=' + encodeURIComponent(q) : base;
  }

  async function get(params) {
    var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 15000);
    try {
      var r = await fetch(URL_ + (URL_.indexOf('?') < 0 ? '?' : '&') + params, { signal: ctrl.signal });
      return await r.json();
    } catch (e) { return null; } finally { clearTimeout(to); }
  }

  function normalize(v) {
    v = String(v || '').trim();
    var m = v.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
    if (m) return m[1];
    return v.replace(/^@+/, '').replace(/\s+/g, '');
  }

  async function check(raw) {
    var q = normalize(raw);
    if (!q) { inp.focus(); return; }
    if (!URL_) { show('dim', '•', 'checker is not connected yet', ['the winners list will be online soon.']); return; }
    go.disabled = true; go.textContent = 'checking...';
    show('dim', '…', 'checking', [q.length > 20 ? q.slice(0, 6) + '...' + q.slice(-4) : '@' + q]);
    var r = await get('q=' + encodeURIComponent(q));
    go.disabled = false; go.textContent = 'check now';
    try { history.replaceState(null, '', pageUrl(q)); } catch (e) {}
    if (!r) { show('err', '✗', 'could not check right now', ['try again in a minute.']); return; }
    if (!r.ok) { show('err', '✗', String(r.error || 'something went wrong').toLowerCase(), []); return; }
    if (r.count === 0) { show('dim', '•', 'winners are not announced yet', ['follow @' + H + ' on X for the announcement.']); return; }
    if (r.found) {
      var who = r.user ? '@' + r.user : 'this wallet';
      var lines = [];
      if (r.wallet) lines.push('wallet ' + r.wallet);
      lines.push(r.tier === 'FCFS' ? 'FCFS · free mint on OpenSea, first come first served.' : r.tier === 'GTD' ? 'GTD · free mint guaranteed on OpenSea.' : 'free mint on OpenSea with your winning wallet.');
      var acts = [];
      if (C.OPENSEA_URL && C.MINT_LIVE) acts.push(linkBtn('mint on OpenSea ↗', C.OPENSEA_URL));
      var text = 'I am an ElyFluff winner' + (r.tier ? ' (' + r.tier + ')' : '') + '! Check yours:';
      acts.push(linkBtn('share on X ↗', 'https://x.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(pageUrl('')), true));
      show(r.tier === 'FCFS' ? 'fcfs' : 'gtd', '✓', 'WINNER · ' + who + (r.tier ? ' · ' + r.tier : ''), lines, acts);
    } else {
      show('err', '✗', 'not on the winners list', [r.by === 'wallet' ? 'this wallet is not a winner. try your X username too.' : '@' + q + ' is not a winner. try your wallet address too.']);
    }
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); check(inp.value); });

  /* shared link: checker.html?q=username */
  var q0 = new URLSearchParams(location.search).get('q');
  if (q0) { inp.value = q0; check(q0); }

  if (URL_) get('action=count').then(function (r) {
    if (r && r.ok && r.count > 0) $('ckCount').textContent = r.count.toLocaleString('en-US') + ' winners · free mint on OpenSea';
  });
})();
