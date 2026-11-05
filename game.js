/* =========================================================
   Fluff Arena: 2D jetpack shooter for ElyFluff
   ========================================================= */
(function () {
  'use strict';

  var C = window.ELYFLUFF_CONFIG || {};
  var TICKER = C.TICKER || '$FLUFF';
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  var ROUND = Math.round(num(C.GAME_ROUND_MIN, 15) * 60);
  var RED_AT = Math.round(num(C.GAME_RED_AT_MIN, 10) * 60);
  var BLUE_AT = Math.round(num(C.GAME_BLUE_AT_MIN, 10) * 60);
  var NBOTS = Math.max(1, Math.min(12, Math.round(num(C.GAME_BOTS, 7))));
  var RED_WARN = 20, RED_DUR = 90;

  var WW = 3600, WH = 1500, GROUND = WH - 60;
  var HW = 15, HH = 80;
  var GRAV = 1700, RUN = 330, AIR_RUN = 300, JET = 2650, MAXFALL = 1050, MAXUP = 560;
  var FUEL_USE = 40, FUEL_REGEN_G = 60, FUEL_REGEN_A = 6;
  var REGEN_DELAY = 3, REGEN = 16, PLAYER_HP = 150;
  var KILL_COINS = 4, KILL_COIN_VAL = 5, BLUE_COIN_VAL = 10, BLUE_INIT = 24, BLUE_EVERY = 8, BLUE_N = 2, SURVIVE_BONUS = 50;
  var BOT_DMG = 0.5;
  var STEP = 1 / 60;
  var INK = '#171717', TEAL = '#5EE6CF', TEAL2 = '#97FCE4', SKY = '#6EC8F5', CR = '#A31C1B', CR2 = '#E0453F', GOLD = '#E8C15A';
  var FONT = '"IBM Plex Mono", ui-monospace, monospace';

  var WEAPONS = {
    blaster: { name: 'Blaster', rate: 0.11, dmg: 11, speed: 1550, spread: 0.03, clip: 24, reload: 1.3, life: 0.8, pellets: 1, ammo: Infinity, len: 22, col: '#171717', tip: TEAL },
    smg: { name: 'Fluff SMG', rate: 0.065, dmg: 7.5, speed: 1500, spread: 0.075, clip: 40, reload: 1.5, life: 0.7, pellets: 1, ammo: 160, len: 26, col: '#2B3036', tip: SKY },
    shotgun: { name: 'Cloud Burst', rate: 0.75, dmg: 10, speed: 1250, spread: 0.24, clip: 6, reload: 1.8, life: 0.36, pellets: 7, ammo: 30, len: 28, col: '#5A3A1E', tip: '#F4D35E' },
    sniper: { name: 'Halo Rail', rate: 1.1, dmg: 78, speed: 3400, spread: 0, clip: 4, reload: 2.0, life: 1.1, pellets: 1, ammo: 16, len: 42, col: '#E9E9E9', tip: GOLD, rail: true },
    rocket: { name: 'Crimson Rocket', rate: 1.2, dmg: 0, speed: 850, spread: 0, clip: 3, reload: 2.4, life: 2.5, pellets: 1, ammo: 9, len: 32, col: CR, tip: '#FFB25B', rocket: true, blast: 115, blastDmg: 85 }
  };
  var WKEYS = ['smg', 'shotgun', 'sniper', 'rocket'];

  function P(a) { return a.map(function (p) { return { x: p[0], y: p[1], w: p[2], h: p[3], ground: p[1] === GROUND && p[2] === WW, thin: p[3] <= 26 }; }); }
  var MAPS = {
    elysium: {
      name: 'Elysium', sub: 'the heaven above the chain', theme: 'heaven',
      plats: P([
        [0, GROUND, WW, 60],
        [150, 1250, 320, 26], [620, 1120, 260, 26], [1050, 1240, 380, 26], [1550, 1100, 500, 26], [2170, 1240, 380, 26], [2720, 1120, 260, 26], [3130, 1250, 320, 26],
        [700, 1360, 50, 80], [2850, 1360, 50, 80],
        [300, 920, 300, 26], [850, 820, 320, 26], [1400, 760, 800, 26], [2430, 820, 320, 26], [3000, 920, 300, 26],
        [1420, 640, 40, 120], [2140, 640, 40, 120],
        [100, 620, 260, 26], [650, 520, 280, 26], [1200, 420, 260, 26], [2140, 420, 260, 26], [2670, 520, 280, 26], [3240, 620, 260, 26],
        [1650, 260, 300, 26]
      ]),
      blue: [[1800, 640], [450, 1050], [3150, 1050], [1800, 220], [1000, 950], [2600, 950]]
    },
    city: {
      name: 'HyperEVM City', sub: 'neon rooftops of the testnet', theme: 'city',
      plats: P([
        [0, GROUND, WW, 60],
        [180, 1270, 360, 24], [720, 1150, 300, 24], [1180, 1280, 420, 24], [1720, 1130, 260, 24], [2080, 1280, 420, 24], [2620, 1150, 300, 24], [3060, 1270, 360, 24],
        [620, 1330, 44, 110], [1640, 1340, 56, 100], [1940, 1340, 56, 100], [2940, 1330, 44, 110],
        [380, 990, 300, 24], [960, 890, 340, 24], [1480, 950, 640, 24], [2300, 890, 340, 24], [2920, 990, 300, 24],
        [1560, 900, 40, 50], [2000, 900, 40, 50],
        [140, 730, 300, 24], [700, 660, 260, 24], [1240, 620, 300, 24], [2060, 620, 300, 24], [2640, 660, 260, 24], [3160, 730, 300, 24],
        [900, 400, 260, 24], [1650, 440, 300, 24], [2440, 400, 260, 24]
      ]),
      blue: [[1800, 800], [560, 1080], [3040, 1080], [1790, 360], [1030, 1050], [2560, 1050]]
    },
    core: {
      name: 'Crimson Core', sub: 'the molten heart of the vault', theme: 'core',
      plats: P([
        [0, GROUND, WW, 60],
        [100, 1280, 500, 24], [800, 1180, 300, 24], [1300, 1300, 1000, 24], [2500, 1180, 300, 24], [3000, 1280, 500, 24],
        [600, 1240, 40, 200], [2960, 1240, 40, 200], [1750, 1324, 100, 116],
        [400, 1000, 400, 24], [1000, 900, 250, 24], [1550, 980, 500, 24], [2350, 900, 250, 24], [2800, 1000, 400, 24],
        [1560, 900, 40, 80], [2000, 900, 40, 80],
        [150, 720, 350, 24], [800, 620, 300, 24], [1450, 560, 700, 24], [2500, 620, 300, 24], [3100, 720, 350, 24],
        [1000, 350, 300, 24], [2300, 350, 300, 24], [1700, 250, 200, 24]
      ]),
      blue: [[1800, 1150], [600, 850], [3000, 850], [1800, 420], [1125, 750], [2475, 750]]
    }
  };
  var MAP_KEYS = ['elysium', 'city', 'core'];
  var M = MAPS.elysium, PLATS = M.plats, SPAWNS = [];
  function useMap(key) {
    M = MAPS[key] || MAPS.elysium; PLATS = M.plats; SPAWNS = [];
    PLATS.forEach(function (p) {
      if (p.thin) SPAWNS.push({ x1: p.x + 30, x2: p.x + p.w - 30, y: p.y });
      if (p.ground) [[80, 560], [760, 1600], [2000, 2800], [2960, 3520]].forEach(function (r) { SPAWNS.push({ x1: r[0], x2: r[1], y: p.y }); });
    });
    if (scene) scene.key = '';
  }

  var BOT_NAMES = ['Mochi', 'Nori', 'Yuzu', 'Kiwi', 'Taro', 'Momo', 'Pudding', 'Bao', 'Toffee', 'Sesame', 'Miso', 'Peach', 'Dango', 'Ube', 'Matcha', 'Biscuit', 'Clover', 'Pebble', 'Maple', 'Ginger'];
  var HATS = [['#B9BEC6', '#E9ECEF'], ['#9FE7C9', '#E8FBF3'], ['#F4D35E', '#FFF4CC'], ['#8FCBF2', '#E3F4FF'], ['#C3B2F2', '#F0EBFF'], ['#F5A35C', '#FFE9D2'], ['#E46A6A', '#FFE0E0']];
  var JACKETS = [['#3E4A5C', '#E25D5D', '#7A8BA8'], ['#7A5CD6', '#F4D35E', '#4B3A99'], ['#2F8F83', '#F5A35C', '#1F5F57'], ['#D98E2B', '#3E4A5C', '#8A5A16'], ['#355FB8', '#E46A6A', '#22407D'], ['#C2405A', '#9FE7C9', '#7E2438']];
  var SKINS = ['#D8A06A', '#F1C9A0', '#B57A4E', '#E6B184', '#8F5B3A'];
  var PLAYER_PAL = { hat: '#F2A6C2', hat2: '#F7E9C9', j1: '#36C6B1', j2: '#F0735C', j3: '#4D6FD8', skin: '#D8A06A' };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtT(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function solidAt(x, y) {
    for (var i = 0; i < PLATS.length; i++) { var p = PLATS[i]; if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return p; }
    return null;
  }
  function los(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy), n = Math.ceil(d / 18);
    for (var i = 1; i < n; i++) { if (solidAt(ax + dx * i / n, ay + dy * i / n)) return false; }
    return true;
  }

  /* ---------- token sprite ---------- */
  var coinImg = null, coinReady = false;
  function loadCoin() {
    if (coinImg) return;
    coinImg = new Image();
    coinImg.onload = function () { coinReady = true; };
    coinImg.src = C.TOKEN_LOGO || 'fluff-token.svg';
  }
  function drawCoin(gc, x, y, r, squash) {
    var w = r * (squash == null ? 1 : squash);
    if (coinReady) { gc.drawImage(coinImg, x - w, y - r, w * 2, r * 2); return; }
    gc.fillStyle = TEAL; gc.strokeStyle = INK; gc.lineWidth = 2.4;
    gc.beginPath(); gc.ellipse(x, y, Math.max(1, w), r, 0, 0, Math.PI * 2); gc.fill(); gc.stroke();
  }

  /* ---------- state ---------- */
  var S = null, ui = null, raf = 0, last = 0, acc = 0, opts = null, mapChoice = 'random';
  var keys = {}, mouse = { x: 0, y: 0, down: false, used: false }, sticks = { L: null, R: null }, isTouch = false;
  var nameIdx = 0;

  function botPal(i) { var h = HATS[i % HATS.length], j = JACKETS[(i * 5 + 2) % JACKETS.length]; return { hat: h[0], hat2: h[1], j1: j[0], j2: j[1], j3: j[2], skin: pick(SKINS) }; }
  function makeFighter(name, isPlayer, pal) {
    return { name: name, isPlayer: isPlayer, pal: pal, x: 0, y: 0, vx: 0, vy: 0, face: 1, aim: 0, hp: 100, shield: 0, fuel: 100, onGround: false, jetting: false,
      w: 'blaster', clip: WEAPONS.blaster.clip, ammo: Infinity, reloadT: 0, fireT: 0, dead: false, out: false, respawnT: 0, lives: 0,
      lastHit: -99, hitFlash: 0, spawnT: 0, kills: 0, deaths: 0, tokens: 0, collected: 0, anim: Math.random() * 10,
      inp: { move: 0, jet: false, aim: 0, fire: false, reload: false },
      ai: isPlayer ? null : { think: 0, target: null, goal: null, react: 0, los: false, pref: rnd(240, 460), strafe: 1, strafeT: 0, stuck: 0, jetT: 0, wp: null, err: 0, redDelay: rnd(0, 13), redSeen: -1 } };
  }
  function giveWeapon(f, key) {
    var W = WEAPONS[key]; f.w = key; f.clip = W.clip; f.ammo = W.ammo === Infinity ? Infinity : W.ammo - W.clip; f.reloadT = 0; f.fireT = 0.15;
  }
  function newBot() {
    var name = BOT_NAMES[nameIdx % BOT_NAMES.length] + (nameIdx >= BOT_NAMES.length ? ' ' + (Math.floor(nameIdx / BOT_NAMES.length) + 1) : '');
    var b = makeFighter(name, false, botPal(nameIdx));
    nameIdx++;
    var r = Math.random();
    giveWeapon(b, r < 0.5 ? 'blaster' : r < 0.7 ? 'smg' : r < 0.85 ? 'shotgun' : r < 0.93 ? 'sniper' : 'rocket');
    return b;
  }
  function newState() {
    var st = { t: 0, running: false, paused: false, over: false, tokens: 0, fighters: [], bullets: [], coins: [], items: [], parts: [], missiles: [], feed: [], msgs: [],
      red: { state: 'idle', x1: 0, x2: 0, strikeT: 0 }, blue: { state: 'idle', x: 0, y: 0, r: 320, spawnT: 0, initLeft: 0 },
      cam: { x: 0, y: 0 }, shake: 0, matchId: null, hint: 5, reinT: 25, crateT: 4, lifeT: 60, shieldT: 25, endT: -1, survived: false };
    var p = makeFighter(opts.username ? '@' + opts.username : 'you', true, PLAYER_PAL);
    giveWeapon(p, 'blaster');
    p.maxHp = PLAYER_HP; p.hp = PLAYER_HP; p.shield = 60;
    st.player = p; st.fighters.push(p);
    nameIdx = Math.floor(Math.random() * BOT_NAMES.length);
    for (var i = 0; i < NBOTS; i++) st.fighters.push(newBot());
    return st;
  }
  function spawn(f, protect, sky) {
    var best = null, bestScore = -1e9;
    for (var k = 0; k < 14; k++) {
      var s = pick(SPAWNS), x = rnd(s.x1, s.x2), y = s.y, score = Math.random() * 120;
      if (S.red.state === 'warn' || S.red.state === 'active') { if (x > S.red.x1 - 150 && x < S.red.x2 + 150) score -= 5000; }
      S.fighters.forEach(function (o) { if (o !== f && !o.dead && !o.out) { var d = Math.abs(o.x - x) + Math.abs(o.y - y); if (d < 450) score -= (450 - d) * 3; } });
      if (score > bestScore) { bestScore = score; best = { x: x, y: y }; }
    }
    f.x = best.x; f.y = sky ? HH + 10 : best.y; f.vx = 0; f.vy = 0; f.hp = f.maxHp || 100; f.fuel = 100; f.dead = false; f.spawnT = protect ? 2 : 0;
  }

  /* ---------- physics ---------- */
  function overlap(f, p) { return f.x - HW < p.x + p.w && f.x + HW > p.x && f.y - HH < p.y + p.h && f.y > p.y; }
  function moveFighter(f, dt) {
    f.x += f.vx * dt;
    for (var i = 0; i < PLATS.length; i++) {
      var p = PLATS[i];
      if (overlap(f, p)) { if (f.vx > 0) f.x = p.x - HW; else if (f.vx < 0) f.x = p.x + p.w + HW; f.vx = 0; }
    }
    f.x = clamp(f.x, HW, WW - HW);
    f.y += f.vy * dt; f.onGround = false;
    for (var j = 0; j < PLATS.length; j++) {
      var q = PLATS[j];
      if (overlap(f, q)) {
        if (f.vy > 0) { f.y = q.y; f.onGround = true; } else if (f.vy < 0) { f.y = q.y + q.h + HH; }
        f.vy = 0;
      }
    }
    if (f.y - HH < 0) { f.y = HH; if (f.vy < 0) f.vy = 0; }
  }
  function settle(o, dt, r) {
    if (o.rest) return;
    o.vy = Math.min(o.vy + GRAV * (o.chute ? 0.12 : 0.7) * dt, o.chute ? 160 : 900);
    o.x += o.vx * dt; o.y += o.vy * dt;
    var sp = solidAt(o.x, o.y + r);
    if (sp && o.vy > 0) { o.y = sp.y - r; o.vy = 0; o.vx *= 0.4; o.chute = false; if (Math.abs(o.vx) < 10) o.rest = true; }
    if (o.y > GROUND - r) { o.y = GROUND - r; o.vy = 0; o.rest = true; o.chute = false; }
    o.x = clamp(o.x, 12, WW - 12);
  }

  function fire(f) {
    var W = WEAPONS[f.w], sx = f.x + f.face, sy = f.y - 36;
    var mx = sx + Math.cos(f.aim) * (W.len + 12), my = sy + Math.sin(f.aim) * (W.len + 12);
    var mult = f.isPlayer ? 1 : BOT_DMG, spreadExtra = f.isPlayer ? 0 : 0.08;
    for (var k = 0; k < W.pellets; k++) {
      var a = f.aim + rnd(-W.spread - spreadExtra, W.spread + spreadExtra);
      S.bullets.push({ x: mx, y: my, vx: Math.cos(a) * W.speed * rnd(0.92, 1), vy: Math.sin(a) * W.speed, life: W.life, owner: f, dmg: W.dmg * mult, rocket: !!W.rocket, rail: !!W.rail });
    }
    f.clip--; f.fireT = W.rate * (f.isPlayer ? 1 : 1.8);
    if (W.rocket || W.pellets > 1) f.vx -= Math.cos(f.aim) * 120;
    S.parts.push({ x: mx, y: my, vx: 0, vy: 0, life: 0.06, max: 0.06, color: f.isPlayer ? TEAL2 : '#FFB3A8', size: W.pellets > 1 || W.rocket ? 16 : 9, type: 'flash' });
    if (f.clip <= 0) startReload(f);
  }
  function startReload(f) {
    var W = WEAPONS[f.w];
    if (f.ammo !== Infinity && f.ammo <= 0) { giveWeapon(f, 'blaster'); if (f.isPlayer) msg(W.name + ' empty · back to blaster', '#EAFBF7', 1.6); return; }
    f.reloadT = W.reload;
  }
  function finishReload(f) {
    var W = WEAPONS[f.w], need = W.clip - f.clip;
    if (f.ammo === Infinity) f.clip = W.clip;
    else { var take = Math.min(need, f.ammo); f.clip += take; f.ammo -= take; }
  }

  function updateFighter(f, dt) {
    if (f.out) return;
    if (f.dead) {
      f.respawnT -= dt;
      if (f.respawnT <= 0) { spawn(f, true); if (f.isPlayer) msg('1UP USED · BACK IN THE FIGHT', TEAL2, 2); }
      return;
    }
    var ip = f.inp;
    var target = ip.move * (f.onGround ? RUN : AIR_RUN);
    f.vx += (target - f.vx) * Math.min(1, dt * (f.onGround ? 14 : 5));
    f.jetting = false;
    if (ip.jet && f.fuel > 0) { f.vy -= JET * dt; f.fuel = Math.max(0, f.fuel - FUEL_USE * dt); f.jetting = true; }
    f.vy = clamp(f.vy + GRAV * dt, -MAXUP, MAXFALL);
    if (!f.jetting) f.fuel = Math.min(100, f.fuel + (f.onGround ? FUEL_REGEN_G : FUEL_REGEN_A) * dt);
    moveFighter(f, dt);
    f.aim = ip.aim;
    f.face = Math.cos(f.aim) >= 0 ? 1 : -1;
    f.anim += dt;
    if (f.spawnT > 0) f.spawnT -= dt;
    if (f.hitFlash > 0) f.hitFlash -= dt;
    if (f.fireT > 0) f.fireT -= dt;
    if (f.reloadT > 0) { f.reloadT -= dt; if (f.reloadT <= 0) finishReload(f); }
    if (ip.reload && f.reloadT <= 0 && f.clip < WEAPONS[f.w].clip) startReload(f);
    if (ip.fire && f.fireT <= 0 && f.reloadT <= 0 && f.clip > 0) fire(f);
    if (S.t - f.lastHit > REGEN_DELAY && f.hp < (f.maxHp || 100)) f.hp = Math.min(f.maxHp || 100, f.hp + REGEN * dt);
    if (S.red.state === 'active' && f.x > S.red.x1 && f.x < S.red.x2) damage(f, 9 * dt, null, 0, true);
    pickups(f);
  }

  function pickups(f) {
    var cy = f.y - 40, rad = f.isPlayer ? 40 : 32, i;
    for (i = S.coins.length - 1; i >= 0; i--) {
      var c = S.coins[i], dx = f.x - c.x, dy = cy - c.y;
      if (dx * dx + dy * dy < rad * rad && c.age > 0.35) {
        if (f.isPlayer) { S.tokens += c.val; f.collected += c.val; S.parts.push({ x: c.x, y: c.y - 10, vx: 0, vy: -70, life: 0.9, max: 0.9, color: c.kind === 'blue' ? SKY : TEAL2, size: 15, type: 'text', text: '+' + c.val }); }
        else { f.tokens += c.val; f.collected += c.val; S.parts.push({ x: c.x, y: c.y - 10, vx: 0, vy: -60, life: 0.7, max: 0.7, color: '#FF8A80', size: 13, type: 'text', text: 'stolen ' + c.val }); }
        S.coins.splice(i, 1);
      }
    }
    for (i = S.items.length - 1; i >= 0; i--) {
      var it = S.items[i], ix = f.x - it.x, iy = cy - it.y;
      if (ix * ix + iy * iy > 46 * 46) continue;
      if (it.type === 'weapon') {
        if (f.w === it.w) { f.ammo = (f.ammo === Infinity ? 0 : f.ammo) + WEAPONS[it.w].ammo; }
        else giveWeapon(f, it.w);
        if (f.isPlayer) msg('PICKED UP ' + WEAPONS[it.w].name.toUpperCase(), GOLD, 1.6);
      } else if (it.type === 'life') {
        if (f.lives >= 3) continue;
        f.lives++;
        if (f.isPlayer) msg('+1 LIFE · 1UP x' + f.lives, CR2, 2);
      } else if (it.type === 'shield') {
        if (f.shield >= 60) continue;
        f.shield = 60;
        if (f.isPlayer) msg('HALO SHIELD ON', GOLD, 1.6);
      }
      S.items.splice(i, 1);
    }
  }

  function damage(t, amt, src, dir, quiet) {
    if (t.dead || t.out || t.spawnT > 0) return;
    if (t.shield > 0) { var ab = Math.min(t.shield, amt); t.shield -= ab; amt -= ab; }
    t.hp -= amt; t.lastHit = S.t;
    if (!quiet) { t.hitFlash = 0.1; t.vx += dir * 60; }
    if (t === S.player && !quiet) S.shake = Math.max(S.shake, 5);
    if (t.hp <= 0) kill(t, src);
  }
  function dropCoins(x, y, total, val, kind) {
    while (total > 0) {
      var v = Math.min(val, total); total -= v;
      S.coins.push({ x: x + rnd(-10, 10), y: y, vx: rnd(-240, 240), vy: rnd(-560, -280), val: v, ttl: 40, kind: kind || 'kill', spin: Math.random() * 6, age: 0 });
    }
  }
  function kill(t, src) {
    t.dead = true; t.hp = 0; t.deaths++; t.shield = 0;
    burst(t.x, t.y - 40, [t.pal.hat, t.pal.j1, t.pal.j2, '#FFFFFF'], 26, 360);
    if (t.lives > 0) { t.lives--; t.respawnT = 3; } else t.out = true;
    if (!t.isPlayer && t.tokens > 0) { dropCoins(t.x, t.y - 50, t.tokens, 10, 'kill'); t.tokens = 0; }
    var line;
    if (src && src !== t) {
      src.kills++;
      line = { a: src.name, b: t.name, me: src.isPlayer || t.isPlayer, t: S.t };
      if (src.isPlayer) {
        dropCoins(t.x, t.y - 50, KILL_COINS * KILL_COIN_VAL, KILL_COIN_VAL, 'kill');
        if (Math.random() < 0.12) S.items.push({ type: 'life', x: t.x, y: t.y - 60, vx: 0, vy: -300, rest: false, bob: 0 });
        msg('+' + (KILL_COINS * KILL_COIN_VAL) + ' ' + TICKER + ' dropped · grab it before bots do', TEAL2, 1.8);
      }
    } else line = { a: 'AIR RAID', b: t.name, me: t.isPlayer, t: S.t, zone: true };
    S.feed.push(line); if (S.feed.length > 5) S.feed.shift();
    if (t.isPlayer) {
      S.shake = 10;
      if (t.out) { S.endT = 2.4; msg('ELIMINATED · NO 1UP LEFT', CR2, 3); }
      else msg('DOWN · 1UP IN 3s', '#FF8A80', 2);
    }
  }

  /* ---------- bots ---------- */
  function pickTarget(b) {
    var best = null, bs = 1e9;
    S.fighters.forEach(function (o) {
      if (o === b || o.dead || o.out || o.spawnT > 0) return;
      var dx = o.x - b.x, dy = o.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1100) return;
      var s = d * (o.isPlayer ? 1.2 : 1);
      if (!los(b.x, b.y - 45, o.x, o.y - 45)) s += 500;
      if (s < bs) { bs = s; best = o; }
    });
    return best;
  }
  function nearestLoot(b) {
    var best = null, bd = 520 * 520;
    S.coins.forEach(function (c) { if (c.age < 0.35) return; var dx = c.x - b.x, dy = c.y - (b.y - 40), d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } });
    S.items.forEach(function (it) {
      if (it.type === 'weapon' && b.w !== 'blaster') return;
      if (it.type === 'life' && b.lives >= 1) return;
      var dx = it.x - b.x, dy = it.y - (b.y - 40), d = (dx * dx + dy * dy) * 0.8; if (d < bd) { bd = d; best = it; }
    });
    return best;
  }
  function botThink(b, dt) {
    var ai = b.ai, ip = b.inp;
    ai.think -= dt; ai.react -= dt; ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafe = Math.random() < 0.5 ? -1 : 1; ai.strafeT = rnd(0.8, 2); }
    var flee = 0, red = S.red;
    if (red.state === 'warn' || red.state === 'active') {
      if (ai.redSeen < 0) ai.redSeen = S.t;
      if (S.t - ai.redSeen >= ai.redDelay && b.x > red.x1 - 80 && b.x < red.x2 + 80) {
        if (red.x1 < 20) flee = 1; else if (red.x2 > WW - 20) flee = -1; else flee = (b.x - red.x1 < red.x2 - b.x) ? -1 : 1;
      }
    }
    if (ai.think <= 0) {
      ai.think = rnd(0.2, 0.4);
      var nt = pickTarget(b);
      if (nt !== ai.target) { ai.target = nt; ai.react = rnd(0.45, 0.8); }
      ai.los = ai.target ? los(b.x, b.y - 36, ai.target.x, ai.target.y - 42) : false;
      ai.err = rnd(-0.14, 0.14);
      ai.goal = nearestLoot(b);
    }
    var t = ai.target && !ai.target.dead && !ai.target.out ? ai.target : null;
    var loot = ai.goal && (S.coins.indexOf(ai.goal) !== -1 || S.items.indexOf(ai.goal) !== -1) ? ai.goal : null;
    var move = 0, jet = false;
    if (flee) move = flee;
    else if (loot && (!t || !ai.los || Math.abs(loot.x - b.x) < 260)) {
      if (Math.abs(loot.x - b.x) > 14) move = loot.x > b.x ? 1 : -1;
      if (loot.y < b.y - 70 && b.fuel > 20) jet = true;
    } else if (t) {
      var dx = t.x - b.x, adx = Math.abs(dx), pref = b.w === 'shotgun' ? 160 : b.w === 'sniper' ? 650 : ai.pref;
      if (adx > pref + 140) move = dx > 0 ? 1 : -1;
      else if (adx < pref - 160) move = dx > 0 ? -1 : 1;
      else move = ai.strafe * 0.7;
      if (t.y < b.y - 90 && b.fuel > 25) jet = true;
      if (!ai.los && b.fuel > 50 && Math.random() < 0.02) ai.jetT = 0.5;
    } else {
      var gl;
      if (S.blue.state === 'active') gl = { x: S.blue.x + ai.strafe * 120, y: S.blue.y };
      else {
        if (!ai.wp || Math.abs(ai.wp.x - b.x) < 60) { var s = pick(SPAWNS); ai.wp = { x: rnd(s.x1, s.x2), y: s.y }; }
        gl = ai.wp;
      }
      if (Math.abs(gl.x - b.x) > 40) move = gl.x > b.x ? 1 : -1;
      if (gl.y < b.y - 100 && b.fuel > 30) jet = true;
    }
    if (move !== 0 && Math.abs(b.vx) < 40) ai.stuck += dt; else ai.stuck = 0;
    if (ai.stuck > 0.3) { ai.jetT = rnd(0.5, 0.9); ai.stuck = 0; }
    if (ai.jetT > 0) { ai.jetT -= dt; jet = true; }
    if (b.fuel < 8) jet = false;
    ip.move = move; ip.jet = jet; ip.reload = false; ip.fire = false;
    if (t) {
      ip.aim = Math.atan2((t.y - 42) - (b.y - 36), t.x - b.x) + ai.err;
      var range = b.w === 'shotgun' ? 380 : b.w === 'sniper' ? 1300 : 950;
      ip.fire = ai.los && ai.react <= 0 && Math.abs(t.x - b.x) < range;
    } else {
      ip.aim = move < 0 ? Math.PI : 0;
      if (b.clip < WEAPONS[b.w].clip * 0.5) ip.reload = true;
    }
  }

  /* ---------- zones, items, reinforcements ---------- */
  function updateWorld(dt) {
    var red = S.red, blue = S.blue, p = S.player;
    if (red.state === 'idle' && S.t >= RED_AT - RED_WARN && RED_AT < ROUND) {
      var w = 1300, choices = [[0, w], [(WW - w) / 2, (WW + w) / 2], [WW - w, WW]];
      var c = Math.random() < 0.55 ? choices.filter(function (r) { return p.x > r[0] && p.x < r[1]; })[0] || pick(choices) : pick(choices);
      red.x1 = c[0]; red.x2 = c[1]; red.state = 'warn';
      msg('AIR RAID INCOMING · RED ZONE · GET OUT', CR2, 3.5);
    }
    if (red.state === 'warn' && S.t >= RED_AT) { red.state = 'active'; msg('MISSILES INBOUND', CR2, 2.5); }
    if (red.state === 'active') {
      if (S.t >= RED_AT + RED_DUR) { red.state = 'over'; msg('air raid over', TEAL2, 2); }
      else {
        red.strikeT -= dt;
        while (red.strikeT <= 0) { red.strikeT += rnd(0.035, 0.09); launchMissile(Math.random() < 0.85 ? rnd(red.x1 + 10, red.x2 - 10) : rnd(40, WW - 40)); }
      }
    }
    if (blue.state === 'idle' && S.t >= BLUE_AT && BLUE_AT < ROUND) {
      var rc = (red.x1 + red.x2) / 2, best = M.blue[0], bd = -1;
      M.blue.forEach(function (s) { var d = red.state === 'idle' ? Math.random() : Math.abs(s[0] - rc) + Math.random() * 200; if (d > bd) { bd = d; best = s; } });
      blue.x = best[0]; blue.y = best[1]; blue.state = 'active'; blue.initLeft = BLUE_INIT; blue.spawnT = 0;
      msg('BLUE ZONE OPEN · ' + TICKER + ' RAINS DOWN', SKY, 3.5);
    }
    if (blue.state === 'active') {
      blue.spawnT -= dt;
      if (blue.initLeft > 0) { if (blue.spawnT <= 0) { blue.spawnT = 0.15; blue.initLeft--; dropBlue(); } }
      else if (blue.spawnT <= 0) { blue.spawnT = BLUE_EVERY; for (var i = 0; i < BLUE_N; i++) dropBlue(); }
    }
    S.crateT -= dt; S.lifeT -= dt; S.shieldT -= dt; S.reinT -= dt;
    var nW = 0, nL = 0, nS = 0;
    S.items.forEach(function (it) { if (it.type === 'weapon') nW++; else if (it.type === 'life') nL++; else nS++; });
    if (S.crateT <= 0) { S.crateT = rnd(12, 20); if (nW < 4) dropItem({ type: 'weapon', w: pick(WKEYS) }); }
    if (S.lifeT <= 0) { S.lifeT = rnd(70, 100); if (nL < 1) { dropItem({ type: 'life' }); msg('A 1UP IS FALLING FROM THE SKY', CR2, 2.4); } }
    if (S.shieldT <= 0) { S.shieldT = rnd(35, 50); if (nS < 2) dropItem({ type: 'shield' }); }
    if (S.reinT <= 0) {
      S.reinT = rnd(6, 12);
      var alive = S.fighters.filter(function (f) { return !f.isPlayer && !f.out; }).length;
      for (var n = 0; n < 2 && alive < NBOTS; n++, alive++) {
        var nb = newBot(); S.fighters.push(nb); spawn(nb, true, true);
        S.feed.push({ a: nb.name, b: 'joined the arena', join: true, t: S.t }); if (S.feed.length > 5) S.feed.shift();
      }
    }
  }
  function dropItem(it) {
    var s = pick(SPAWNS);
    it.x = rnd(s.x1, s.x2); it.y = -30; it.vx = 0; it.vy = 0; it.rest = false; it.chute = true; it.bob = Math.random() * 6;
    S.items.push(it);
  }
  function dropBlue() {
    if (S.coins.length > 160) return;
    var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * S.blue.r * 0.9;
    S.coins.push({ x: clamp(S.blue.x + Math.cos(a) * r, 30, WW - 30), y: S.blue.y - S.blue.r - rnd(20, 200), vx: rnd(-30, 30), vy: rnd(0, 100), val: BLUE_COIN_VAL, ttl: 9999, kind: 'blue', spin: Math.random() * 6, age: 1 });
  }
  function launchMissile(x) {
    var vx = rnd(-260, 260), vy = rnd(950, 1350), m = { x: x - vx * 0.6, y: -60, vx: vx, vy: vy, ix: x, iy: GROUND };
    var cx = m.x, cy = m.y;
    for (var k = 0; k < 120; k++) { cx += vx * 0.02; cy += vy * 0.02; if (cy > GROUND || solidAt(cx, cy)) { m.ix = cx; m.iy = Math.min(cy, GROUND); break; } }
    S.missiles.push(m);
  }
  function explode(x, y, src, R, dmg) {
    R = R || 120; dmg = dmg || 70;
    S.fighters.forEach(function (f) {
      if (f.dead || f.out || (src && f === src)) return;
      var dx = f.x - x, dy = (f.y - 40) - y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < R) { var k = 1 - d / R; f.vx += (dx >= 0 ? 1 : -1) * 420 * k; f.vy -= 360 * k; f.hitFlash = 0.15; damage(f, dmg * k, src, 0, true); }
    });
    burst(x, y, [CR2, '#FF9F43', '#FFE29A', INK], 22, 420);
    S.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.35, max: 0.35, color: '#FFB25B', size: R, type: 'ring' });
    var px = S.player.x, py = S.player.y;
    if (Math.abs(px - x) < 700 && Math.abs(py - y) < 500) S.shake = Math.max(S.shake, 6);
  }

  /* ---------- particles / messages ---------- */
  function burst(x, y, colors, n, sp) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = rnd(sp * 0.3, sp);
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: rnd(0.35, 0.8), max: 0.8, color: pick(colors), size: rnd(3, 7), type: 'dot' });
    }
    if (S.parts.length > 600) S.parts.splice(0, S.parts.length - 600);
  }
  function msg(text, color, dur) { S.msgs.push({ text: text, color: color, t: dur, max: dur }); if (S.msgs.length > 3) S.msgs.shift(); }

  /* ---------- update ---------- */
  function playerInput() {
    var p = S.player, ip = p.inp;
    var mv = 0, jet = false, fireB = false;
    if (keys.a || keys.arrowleft) mv -= 1;
    if (keys.d || keys.arrowright) mv += 1;
    if (keys.w || keys.arrowup || keys[' ']) jet = true;
    if (mouse.down) fireB = true;
    if (mouse.used) { var wp = screenToWorld(mouse.x, mouse.y); ip.aim = Math.atan2(wp.y - (p.y - 36), wp.x - p.x); }
    if (sticks.L) { var v = stickVec(sticks.L); if (Math.abs(v.x) > 0.2) mv = v.x; if (v.y < -0.38) jet = true; }
    if (sticks.R) {
      var dx = sticks.R.x - sticks.R.ox, dy = sticks.R.y - sticks.R.oy, len = Math.sqrt(dx * dx + dy * dy);
      if (len > 10) ip.aim = Math.atan2(dy, dx);
      if (len > 26) fireB = true;
    } else if (!mouse.used && Math.abs(mv) > 0.2) ip.aim = mv < 0 ? Math.PI : 0;
    ip.move = clamp(mv, -1, 1); ip.jet = jet; ip.fire = fireB; ip.reload = !!keys.r;
  }
  function update(dt) {
    S.t += dt;
    if (S.hint > 0) S.hint -= dt;
    if (!S.player.out) playerInput(); else { S.player.inp.move = 0; S.player.inp.fire = false; S.player.inp.jet = false; }
    S.fighters.forEach(function (f) { if (!f.isPlayer && !f.dead && !f.out) botThink(f, dt); });
    S.fighters.forEach(function (f) { updateFighter(f, dt); });
    updateWorld(dt);
    var i;
    for (i = S.bullets.length - 1; i >= 0; i--) {
      var b = S.bullets[i], hit = false, subs = b.rail ? 4 : 2;
      for (var s = 0; s < subs && !hit; s++) {
        b.x += b.vx * dt / subs; b.y += b.vy * dt / subs;
        if (b.rocket && s === 0) S.parts.push({ x: b.x, y: b.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.3, max: 0.3, color: Math.random() < 0.5 ? '#FFB25B' : '#EAEAEA', size: 5, type: 'dot0' });
        if (b.x < 0 || b.x > WW || b.y < 0 || b.y > WH || solidAt(b.x, b.y)) {
          hit = true;
          if (b.rocket) explode(b.x, b.y, b.owner, WEAPONS.rocket.blast, WEAPONS.rocket.blastDmg * (b.owner.isPlayer ? 1 : BOT_DMG));
          else S.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.12, max: 0.12, color: b.owner.isPlayer ? TEAL : CR2, size: 6, type: 'flash' });
          break;
        }
        for (var k = 0; k < S.fighters.length; k++) {
          var f = S.fighters[k];
          if (f === b.owner || f.dead || f.out) continue;
          if (b.x > f.x - HW && b.x < f.x + HW && b.y > f.y - HH && b.y < f.y) {
            if (b.rocket) explode(b.x, b.y, b.owner, WEAPONS.rocket.blast, WEAPONS.rocket.blastDmg * (b.owner.isPlayer ? 1 : BOT_DMG));
            else {
              var head = b.y < f.y - 52;
              damage(f, b.dmg * (head ? 1.6 : 1), b.owner, b.vx > 0 ? 1 : -1);
              S.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.15, max: 0.15, color: '#FFFFFF', size: 7, type: 'flash' });
            }
            hit = true; break;
          }
        }
      }
      b.life -= dt;
      if (hit || b.life <= 0) S.bullets.splice(i, 1);
    }
    for (i = S.missiles.length - 1; i >= 0; i--) {
      var m = S.missiles[i]; m.x += m.vx * dt; m.y += m.vy * dt;
      if (Math.random() < 0.5) S.parts.push({ x: m.x - m.vx * 0.02, y: m.y - m.vy * 0.02, vx: 0, vy: -30, life: 0.4, max: 0.4, color: 'rgba(230,230,230,0.8)', size: 6, type: 'dot0' });
      if (m.y > GROUND || solidAt(m.x, m.y)) { explode(m.x, Math.min(m.y, GROUND), null, 115, 70); S.missiles.splice(i, 1); }
    }
    var p = S.player;
    for (i = S.coins.length - 1; i >= 0; i--) {
      var c = S.coins[i];
      c.ttl -= dt; c.spin += dt * 4; c.age += dt;
      if (c.ttl <= 0) { S.coins.splice(i, 1); continue; }
      if (!p.dead && !p.out && c.age > 0.35) {
        var pdx = p.x - c.x, pdy = (p.y - 40) - c.y, pd = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pd < 75) { c.vx += pdx / pd * 900 * dt; c.vy += pdy / pd * 900 * dt; c.rest = false; }
      }
      settle(c, dt, 11);
    }
    S.items.forEach(function (it) { it.bob += dt * 3; settle(it, dt, 18); });
    for (i = S.parts.length - 1; i >= 0; i--) {
      var q = S.parts[i]; q.life -= dt;
      if (q.life <= 0) { S.parts.splice(i, 1); continue; }
      if (q.type === 'dot') { q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      else if (q.type === 'dot0' || q.type === 'text') { q.x += q.vx * dt; q.y += q.vy * dt; }
    }
    S.msgs.forEach(function (mm) { mm.t -= dt; });
    S.msgs = S.msgs.filter(function (mm) { return mm.t > 0; });
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 30);
    if (S.endT > 0) { S.endT -= dt; if (S.endT <= 0) endRound('eliminated'); }
    if (S.t >= ROUND && !S.over) {
      if (!p.out) { S.survived = true; S.tokens += SURVIVE_BONUS; }
      endRound(p.out ? 'eliminated' : 'survived');
    }
  }

  /* ---------- rendering ---------- */
  var cv, g, cssW = 0, cssH = 0, dpr = 1, scale = 1, scene = { key: '' };
  function resize() {
    if (!cv) return;
    cssW = window.innerWidth; cssH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    scale = clamp(Math.min(cssH / 640, cssW / 1000), 0.58, 1.35);
    if (ui) ui.rot.hidden = !(isTouch && cssH > cssW) || ui.rotDismissed;
  }
  function screenToWorld(sx, sy) { return { x: S.cam.x + (sx - cssW / 2) / scale, y: S.cam.y + (sy - cssH / 2) / scale }; }
  function worldToScreen(x, y) { return { x: (x - S.cam.x) * scale + cssW / 2, y: (y - S.cam.y) * scale + cssH / 2 }; }
  function buildScene() {
    scene = { key: M.theme, hills: [], blocks: [], clouds: [], embers: [] };
    function layer(n, base, amp, mul) { var pts = []; for (var i = 0; i <= n; i++) pts.push(base - Math.abs(Math.sin(i * 1.7 * mul) * amp) - Math.random() * amp * 0.4); return pts; }
    scene.hills = [layer(40, 0.62, 0.16, 1), layer(48, 0.8, 0.1, 1.3)];
    for (var i = 0; i < 60; i++) scene.blocks.push({ x: i * 140 + rnd(-30, 30), w: rnd(50, 110), h: rnd(80, 260), win: Math.random() });
    for (var c = 0; c < 46; c++) scene.clouds.push({ x: rnd(0, 4200), y: rnd(0.08, 0.9), s: rnd(0.5, 1.6), f: rnd(0.05, 0.4), a: rnd(0.35, 0.9) });
    for (var e = 0; e < 70; e++) scene.embers.push({ x: Math.random(), sp: rnd(20, 70), ph: Math.random() * 1000, s: rnd(1.5, 3.5) });
  }
  function rays(cx, cy, col, n) {
    g.save(); g.translate(cx, cy); g.fillStyle = col;
    for (var r = 0; r < n; r++) { g.rotate(Math.PI * 2 / n); g.beginPath(); g.moveTo(0, 0); g.lineTo(2400, -70); g.lineTo(2400, 70); g.closePath(); g.fill(); }
    g.restore();
  }
  function hillLayer(pts, fac, col) {
    var span = cssW * 1.6, off = -(S.cam.x * fac) % span;
    g.fillStyle = col; g.beginPath(); g.moveTo(0, cssH);
    for (var rep = -1; rep < 2; rep++) for (var i = 0; i < pts.length; i++) { var x = off + rep * span + i / (pts.length - 1) * span; g.lineTo(x, pts[i] * cssH + (S.cam.y - WH / 2) * -fac * 0.3); }
    g.lineTo(cssW, cssH); g.closePath(); g.fill();
  }
  function cloudPuff(x, y, s, col) {
    g.fillStyle = col; g.beginPath();
    g.arc(x, y, 40 * s, 0, Math.PI * 2); g.arc(x + 45 * s, y - 18 * s, 50 * s, 0, Math.PI * 2); g.arc(x + 100 * s, y, 42 * s, 0, Math.PI * 2); g.arc(x + 50 * s, y + 14 * s, 44 * s, 0, Math.PI * 2);
    g.fill();
  }
  function drawBackground() {
    if (scene.key !== M.theme) buildScene();
    var th = M.theme, gr;
    if (th === 'heaven') {
      gr = g.createLinearGradient(0, 0, 0, cssH);
      gr.addColorStop(0, '#FFF3D6'); gr.addColorStop(0.45, '#D6F7EF'); gr.addColorStop(1, '#86D9C8');
      g.fillStyle = gr; g.fillRect(0, 0, cssW, cssH);
      var sx = cssW * 0.5 - (S.cam.x - WW / 2) * 0.03, sy = cssH * 0.18;
      var gl = g.createRadialGradient(sx, sy, 10, sx, sy, Math.max(cssW, cssH) * 0.7);
      gl.addColorStop(0, 'rgba(255,236,170,0.9)'); gl.addColorStop(0.25, 'rgba(255,226,150,0.35)'); gl.addColorStop(1, 'rgba(255,226,150,0)');
      g.fillStyle = gl; g.fillRect(0, 0, cssW, cssH);
      rays(sx, sy, 'rgba(232,193,90,0.10)', 28);
      var gx = cssW / 2 - (S.cam.x - WW / 2) * 0.12, gy = cssH * 0.78 - (S.cam.y - WH / 2) * 0.06, gs = Math.min(cssW, cssH) / 600;
      g.save(); g.translate(gx, gy); g.scale(gs, gs); g.fillStyle = 'rgba(232,193,90,0.28)';
      g.fillRect(-260, -380, 60, 380); g.fillRect(200, -380, 60, 380); g.fillRect(-290, -410, 120, 34); g.fillRect(170, -410, 120, 34);
      g.beginPath(); g.moveTo(-230, -400); g.quadraticCurveTo(0, -620, 230, -400); g.lineTo(230, -370); g.quadraticCurveTo(0, -560, -230, -370); g.closePath(); g.fill();
      g.beginPath(); g.arc(0, -560, 46, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = 'rgba(232,193,90,0.45)'; g.stroke();
      [-520, -420, 420, 520].forEach(function (cx) { g.fillRect(cx - 18, -240, 36, 240); g.fillRect(cx - 28, -256, 56, 18); });
      g.restore();
      scene.clouds.forEach(function (c) {
        var x = ((c.x - S.cam.x * c.f) % 4200 + 4200) % 4200 - 300, y = c.y * cssH - (S.cam.y - WH / 2) * c.f * 0.3;
        if (x < -400 || x > cssW + 100) return;
        cloudPuff(x, y, c.s * Math.max(0.6, cssH / 800), 'rgba(255,255,255,' + c.a * 0.7 + ')');
      });
      hillLayer(scene.hills[1], 0.3, 'rgba(255,255,255,0.75)');
    } else if (th === 'core') {
      gr = g.createLinearGradient(0, 0, 0, cssH);
      gr.addColorStop(0, '#0E0505'); gr.addColorStop(0.55, '#2B0A0A'); gr.addColorStop(1, '#5A1510');
      g.fillStyle = gr; g.fillRect(0, 0, cssW, cssH);
      var cx2 = cssW * 0.5 - (S.cam.x - WW / 2) * 0.05, cy2 = cssH * 0.55;
      var cg = g.createRadialGradient(cx2, cy2, 10, cx2, cy2, Math.max(cssW, cssH) * 0.55);
      cg.addColorStop(0, 'rgba(255,110,60,0.45)'); cg.addColorStop(0.4, 'rgba(163,28,27,0.25)'); cg.addColorStop(1, 'rgba(163,28,27,0)');
      g.fillStyle = cg; g.fillRect(0, 0, cssW, cssH);
      rays(cx2, cy2, 'rgba(255,120,80,0.05)', 20);
      hillLayer(scene.hills[0], 0.1, '#1D0808');
      var off = -S.cam.x * 0.25, by = cssH * 0.88 - (S.cam.y - WH / 2) * 0.08;
      scene.blocks.forEach(function (b, i) {
        var x = b.x + off; if (x < -150 || x > cssW + 150) return;
        g.fillStyle = '#160606'; g.fillRect(x, by - b.h, b.w, b.h + 400);
        if (i % 3 === 0) { g.fillRect(x + b.w * 0.35, by - b.h - 70, b.w * 0.2, 70); g.fillStyle = 'rgba(255,120,80,0.5)'; g.fillRect(x + b.w * 0.35, by - b.h - 74, b.w * 0.2, 4); }
      });
      var tt = performance.now() / 1000;
      scene.embers.forEach(function (e) {
        var y = cssH - ((tt * e.sp + e.ph) % (cssH + 40)), x = e.x * cssW + Math.sin(tt + e.ph) * 12;
        g.fillStyle = 'rgba(255,' + (120 + Math.round(e.ph % 80)) + ',60,0.7)'; g.fillRect(x, y, e.s, e.s);
      });
      hillLayer(scene.hills[1], 0.35, '#0F0404');
    } else {
      gr = g.createLinearGradient(0, 0, 0, cssH);
      gr.addColorStop(0, '#031512'); gr.addColorStop(0.55, '#0A3E36'); gr.addColorStop(1, '#0E5246');
      g.fillStyle = gr; g.fillRect(0, 0, cssW, cssH);
      var hx = cssW * 0.5 - (S.cam.x - WW / 2) * 0.04, hy = cssH * 0.32;
      var hg = g.createRadialGradient(hx, hy, 10, hx, hy, Math.max(cssW, cssH) * 0.6);
      hg.addColorStop(0, 'rgba(151,252,228,0.35)'); hg.addColorStop(0.35, 'rgba(94,230,207,0.12)'); hg.addColorStop(1, 'rgba(94,230,207,0)');
      g.fillStyle = hg; g.fillRect(0, 0, cssW, cssH);
      rays(hx, hy, 'rgba(151,252,228,0.05)', 24);
      g.fillStyle = CR; g.beginPath(); g.arc(cssW * 0.82 - S.cam.x * 0.02, cssH * 0.2, Math.min(cssW, cssH) * 0.06, 0, Math.PI * 2); g.fill();
      hillLayer(scene.hills[0], 0.1, '#0B3A33');
      var boff = -S.cam.x * 0.25, bby = cssH * 0.86 - (S.cam.y - WH / 2) * 0.08;
      scene.blocks.forEach(function (b) {
        var x = b.x + boff; if (x < -150 || x > cssW + 150) return;
        g.fillStyle = '#082A25'; g.fillRect(x, bby - b.h, b.w, b.h + 400);
        g.fillStyle = b.win > 0.5 ? 'rgba(94,230,207,0.35)' : 'rgba(224,69,63,0.35)';
        for (var yy = bby - b.h + 14; yy < bby - 10; yy += 22) for (var xx = x + 10; xx < x + b.w - 10; xx += 18) if (((xx * 7 + yy * 3) | 0) % 5 < 2) g.fillRect(xx, yy, 6, 8);
      });
      hillLayer(scene.hills[1], 0.35, '#06221E');
    }
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawPlat(p) {
    var th = M.theme;
    if (th === 'heaven') {
      if (p.ground) {
        g.fillStyle = '#FFFFFF'; g.fillRect(p.x, p.y + 8, p.w, p.h);
        for (var x = p.x; x < p.x + p.w; x += 34) { g.beginPath(); g.arc(x + 17, p.y + 10, 20, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(134,217,200,0.35)'; g.fillRect(p.x, p.y + 40, p.w, 20);
        g.fillStyle = GOLD; g.fillRect(p.x, p.y + 30, p.w, 3);
        return;
      }
      if (p.thin) {
        g.fillStyle = 'rgba(80,140,130,0.25)'; rr(p.x + 4, p.y + 8, p.w, p.h, 12); g.fill();
        g.fillStyle = '#FFFFFF';
        for (var cx = p.x + 12; cx < p.x + p.w - 6; cx += 26) { g.beginPath(); g.arc(cx, p.y + 6, 13, 0, Math.PI * 2); g.fill(); }
        rr(p.x, p.y, p.w, p.h, 12); g.fill();
        g.fillStyle = '#DDF2EE'; g.fillRect(p.x + 8, p.y + p.h - 7, p.w - 16, 5);
        g.fillStyle = GOLD; g.fillRect(p.x + 6, p.y + 2, p.w - 12, 3);
      } else {
        g.fillStyle = '#F6F0E2'; g.fillRect(p.x, p.y, p.w, p.h);
        g.strokeStyle = 'rgba(180,150,80,0.35)'; g.lineWidth = 2;
        for (var k = p.x + 8; k < p.x + p.w - 4; k += 10) { g.beginPath(); g.moveTo(k, p.y + 14); g.lineTo(k, p.y + p.h - 6); g.stroke(); }
        g.fillStyle = GOLD; g.fillRect(p.x - 6, p.y, p.w + 12, 10); g.fillRect(p.x - 4, p.y + p.h - 6, p.w + 8, 6);
      }
      return;
    }
    if (th === 'core') {
      if (p.ground) {
        g.fillStyle = '#140D0D'; g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = '#FF7A3C'; g.fillRect(p.x, p.y, p.w, 3); g.fillStyle = CR; g.fillRect(p.x, p.y + 3, p.w, 4);
        g.fillStyle = 'rgba(255,122,60,0.15)'; for (var x2 = 6; x2 < p.w; x2 += 40) g.fillRect(p.x + x2, p.y + 18, 20, 3);
        return;
      }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(p.x + 6, p.y + 6, p.w, p.h);
      g.fillStyle = '#1C1C1C'; g.fillRect(p.x, p.y, p.w, p.h);
      if (p.thin) {
        g.fillStyle = CR2; g.fillRect(p.x, p.y, p.w, 4);
        g.fillStyle = '#555'; for (var r2 = p.x + 8; r2 < p.x + p.w - 4; r2 += 22) g.fillRect(r2, p.y + 12, 4, 4);
      } else {
        g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
        g.strokeStyle = '#F4D35E'; g.lineWidth = 8;
        for (var s2 = p.x - p.h; s2 < p.x + p.w + p.h; s2 += 22) { g.beginPath(); g.moveTo(s2, p.y); g.lineTo(s2 + p.h, p.y + p.h); g.stroke(); }
        g.restore(); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(p.x, p.y, p.w, p.h);
      }
      return;
    }
    if (p.ground) {
      g.fillStyle = '#121212'; g.fillRect(p.x, p.y, p.w, p.h);
      g.fillStyle = 'rgba(94,230,207,0.12)';
      for (var x3 = 8; x3 < p.w; x3 += 24) g.fillRect(p.x + x3, p.y + 20, 3, 3);
      g.fillStyle = TEAL; g.fillRect(p.x, p.y, p.w, 4);
      g.fillStyle = CR; g.fillRect(p.x, p.y + 4, p.w, 3);
      return;
    }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(p.x + 6, p.y + 6, p.w, p.h);
    g.fillStyle = p.thin ? INK : '#222'; g.fillRect(p.x, p.y, p.w, p.h);
    if (p.thin) { g.fillStyle = TEAL; g.fillRect(p.x, p.y, p.w, 4); g.fillStyle = 'rgba(94,230,207,0.25)'; for (var k2 = p.x + 10; k2 < p.x + p.w - 6; k2 += 16) g.fillRect(k2, p.y + 12, 6, 2); }
    else { g.fillStyle = CR; g.fillRect(p.x, p.y, p.w, 4); g.strokeStyle = 'rgba(224,69,63,0.3)'; g.lineWidth = 2; for (var yy = p.y + 14; yy < p.y + p.h; yy += 14) { g.beginPath(); g.moveTo(p.x + 4, yy); g.lineTo(p.x + p.w - 4, yy); g.stroke(); } }
  }
  function label(text, x, y, col) {
    g.font = '700 12px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = INK; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y);
  }
  function drawItem(it) {
    var bob = it.rest ? Math.sin(it.bob) * 4 : 0, x = it.x, y = it.y + bob;
    if (it.chute && !it.rest) {
      g.strokeStyle = 'rgba(23,23,23,0.6)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - 16, y - 12); g.lineTo(x - 30, y - 60); g.moveTo(x + 16, y - 12); g.lineTo(x + 30, y - 60); g.stroke();
      g.fillStyle = it.type === 'life' ? CR2 : it.type === 'shield' ? GOLD : TEAL; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x - 38, y - 58); g.quadraticCurveTo(x, y - 104, x + 38, y - 58); g.closePath(); g.fill(); g.stroke();
    }
    g.lineWidth = 2.5; g.strokeStyle = INK;
    if (it.type === 'weapon') {
      var W = WEAPONS[it.w];
      g.fillStyle = 'rgba(232,193,90,0.25)'; g.beginPath(); g.arc(x, y, 30, 0, Math.PI * 2); g.fill();
      rr(x - 22, y - 16, 44, 32, 5); g.fillStyle = '#3A2A1A'; g.fill(); g.stroke();
      g.fillStyle = GOLD; g.fillRect(x - 22, y - 3, 44, 6);
      g.fillStyle = W.col; g.fillRect(x - 14, y - 12, W.len * 0.7, 6); g.fillStyle = W.tip; g.fillRect(x - 14 + W.len * 0.7 - 4, y - 12, 4, 6);
      label(W.name, x, y - 26, GOLD);
    } else if (it.type === 'life') {
      g.fillStyle = 'rgba(224,69,63,0.3)'; g.beginPath(); g.arc(x, y, 26 + Math.sin(it.bob * 2) * 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = CR2; g.beginPath(); g.moveTo(x, y + 14); g.bezierCurveTo(x - 26, y - 4, x - 14, y - 22, x, y - 10); g.bezierCurveTo(x + 14, y - 22, x + 26, y - 4, x, y + 14); g.fill(); g.stroke();
      label('1UP', x, y - 26, '#FFFFFF');
    } else {
      g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.ellipse(x, y - 6, 22, 8, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(232,193,90,0.25)'; g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill();
      label('SHIELD', x, y - 22, GOLD);
    }
  }

  function drawWorld() {
    var red = S.red, blue = S.blue, t = S.t;
    if (red.state === 'warn' || red.state === 'active') {
      var on = red.state === 'active';
      g.fillStyle = on ? 'rgba(224,69,63,' + (0.18 + Math.sin(t * 8) * 0.05) + ')' : 'rgba(163,28,27,0.12)';
      g.fillRect(red.x1, 0, red.x2 - red.x1, WH);
      g.save(); g.beginPath(); g.rect(red.x1, 0, red.x2 - red.x1, WH); g.clip();
      g.strokeStyle = on ? 'rgba(224,69,63,0.25)' : 'rgba(163,28,27,0.18)'; g.lineWidth = 14;
      var o = (t * 60) % 80;
      for (var sx = red.x1 - WH; sx < red.x2 + 80; sx += 80) { g.beginPath(); g.moveTo(sx + o, 0); g.lineTo(sx + o + WH, WH); g.stroke(); }
      g.restore();
      g.strokeStyle = CR2; g.lineWidth = 4; g.setLineDash([22, 14]); g.lineDashOffset = -t * 40;
      g.beginPath(); g.moveTo(red.x1, 0); g.lineTo(red.x1, WH); g.moveTo(red.x2, 0); g.lineTo(red.x2, WH); g.stroke(); g.setLineDash([]);
      g.font = '700 34px ' + FONT; g.fillStyle = CR2; g.textAlign = 'center';
      g.fillText(on ? 'AIR RAID' : 'AIR RAID IN ' + fmtT(RED_AT - t), (red.x1 + red.x2) / 2, 120);
    }
    if (blue.state === 'active') {
      g.fillStyle = 'rgba(110,200,245,0.12)'; g.beginPath(); g.arc(blue.x, blue.y, blue.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = SKY; g.lineWidth = 4; g.setLineDash([18, 12]); g.lineDashOffset = t * 30;
      g.beginPath(); g.arc(blue.x, blue.y, blue.r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.font = '700 28px ' + FONT; g.fillStyle = M.theme === 'heaven' ? '#1F78B0' : SKY; g.textAlign = 'center';
      g.fillText('BLUE ZONE', blue.x, blue.y - blue.r - 16);
    }
    PLATS.forEach(drawPlat);
    S.missiles.forEach(function (m) {
      var pulse = 0.5 + Math.sin(t * 20) * 0.5;
      g.strokeStyle = 'rgba(224,69,63,' + (0.5 + pulse * 0.4) + ')'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(m.ix, m.iy - 2, 26, 7, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(m.ix - 10, m.iy - 2); g.lineTo(m.ix + 10, m.iy - 2); g.moveTo(m.ix, m.iy - 9); g.lineTo(m.ix, m.iy + 5); g.stroke();
    });
    S.coins.forEach(function (c) {
      var bob = c.rest ? Math.sin(c.spin) * 3 : 0, sq = Math.abs(Math.cos(c.spin * 0.6)) * 0.85 + 0.15;
      if (c.kind === 'blue') { g.fillStyle = 'rgba(110,200,245,0.28)'; g.beginPath(); g.arc(c.x, c.y + bob, 18, 0, Math.PI * 2); g.fill(); }
      drawCoin(g, c.x, c.y + bob, c.kind === 'blue' ? 13 : 11, sq);
    });
    S.items.forEach(drawItem);
    S.fighters.forEach(function (f) { if (!f.dead && !f.out) drawChar(f); });
    S.bullets.forEach(function (b) {
      if (b.rocket) {
        var an = Math.atan2(b.vy, b.vx);
        g.save(); g.translate(b.x, b.y); g.rotate(an);
        g.fillStyle = CR; g.strokeStyle = INK; g.lineWidth = 2; rr(-14, -5, 24, 10, 4); g.fill(); g.stroke();
        g.fillStyle = '#FFB25B'; g.beginPath(); g.moveTo(-14, -4); g.lineTo(-24 - Math.random() * 8, 0); g.lineTo(-14, 4); g.closePath(); g.fill();
        g.restore(); return;
      }
      var len = b.rail ? 0.05 : 0.018;
      g.strokeStyle = b.rail ? GOLD : (b.owner.isPlayer ? TEAL2 : '#FF8A80'); g.lineWidth = b.rail ? 4 : 3.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(b.x - b.vx * len, b.y - b.vy * len); g.lineTo(b.x, b.y); g.stroke();
    });
    S.missiles.forEach(function (m) {
      var an = Math.atan2(m.vy, m.vx);
      g.strokeStyle = 'rgba(255,178,91,0.5)'; g.lineWidth = 7; g.beginPath(); g.moveTo(m.x - m.vx * 0.05, m.y - m.vy * 0.05); g.lineTo(m.x, m.y); g.stroke();
      g.save(); g.translate(m.x, m.y); g.rotate(an);
      g.fillStyle = CR; g.strokeStyle = INK; g.lineWidth = 2; rr(-20, -6, 30, 12, 5); g.fill(); g.stroke();
      g.fillStyle = '#F2F2F2'; g.beginPath(); g.moveTo(10, -6); g.lineTo(20, 0); g.lineTo(10, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#FFB25B'; g.beginPath(); g.moveTo(-20, -5); g.lineTo(-34 - Math.random() * 10, 0); g.lineTo(-20, 5); g.closePath(); g.fill();
      g.restore();
    });
    S.parts.forEach(function (q) {
      var a = Math.max(0, q.life / q.max);
      if (q.type === 'dot' || q.type === 'dot0') { g.globalAlpha = a; g.fillStyle = q.color; g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
      else if (q.type === 'flash') { g.globalAlpha = a; g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size, 0, Math.PI * 2); g.fill(); }
      else if (q.type === 'ring') { g.globalAlpha = a; g.strokeStyle = q.color; g.lineWidth = 8 * a + 1; g.beginPath(); g.arc(q.x, q.y, q.size * (1 - a * 0.6), 0, Math.PI * 2); g.stroke(); }
      else if (q.type === 'text') { g.globalAlpha = a; g.font = '700 ' + q.size + 'px ' + FONT; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = INK; g.strokeText(q.text, q.x, q.y); g.fillStyle = q.color; g.fillText(q.text, q.x, q.y); }
    });
    g.globalAlpha = 1;
  }

  function drawChar(f) {
    var Pl = f.pal, t = S.t, W = WEAPONS[f.w];
    g.save();
    g.translate(f.x, f.y);
    if (f.spawnT > 0 && Math.floor(t * 12) % 2) g.globalAlpha = 0.45;
    var face = f.face, la = face === 1 ? f.aim : Math.PI - f.aim;
    while (la > Math.PI) la -= Math.PI * 2; while (la < -Math.PI) la += Math.PI * 2;
    var lvx = f.vx * face, sp = Math.min(1, Math.abs(f.vx) / 220);
    var run = f.onGround ? Math.sin(f.anim * 15) * sp : 0.35;
    var bob = f.onGround ? Math.abs(Math.sin(f.anim * 15)) * 2.2 * sp : 0;
    g.scale(face, 1);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 2.4;
    var stroke = f.hitFlash > 0 ? CR2 : INK; g.strokeStyle = stroke;
    if (f.jetting) {
      var fl = 16 + Math.random() * 12;
      g.fillStyle = 'rgba(151,252,228,0.85)'; g.beginPath(); g.moveTo(-23, -22); g.lineTo(-17, -22 + fl); g.lineTo(-11, -22); g.closePath(); g.fill();
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-20, -22); g.lineTo(-17, -22 + fl * 0.55); g.lineTo(-14, -22); g.closePath(); g.fill();
    }
    rr(-24, -46, 11, 24, 3); g.fillStyle = '#2B3036'; g.fill(); g.stroke();
    g.fillStyle = f.jetting ? TEAL2 : TEAL; g.fillRect(-20.5, -40, 4, 4);
    function leg(ox) {
      g.fillStyle = '#2A2F45'; rr(ox - 3.5, -20, 7, 18, 2); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.ellipse(ox + 2, -1.5, 6, 3.2, 0, 0, Math.PI * 2); g.fill();
    }
    leg(-4 - run * 5); leg(5 + run * 5);
    g.save(); rr(-13, -46 - bob, 26, 28, 7); g.fillStyle = Pl.j1; g.fill(); g.clip();
    g.fillStyle = Pl.j2; g.beginPath(); g.moveTo(-14, -40 - bob); g.lineTo(14, -30 - bob); g.lineTo(14, -24 - bob); g.lineTo(-14, -32 - bob); g.closePath(); g.fill();
    g.fillStyle = Pl.j3; g.fillRect(-14, -26 - bob, 28, 10);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(4, -46 - bob); g.lineTo(4, -18); g.stroke();
    g.restore();
    g.strokeStyle = stroke; g.lineWidth = 2.4; rr(-13, -46 - bob, 26, 28, 7); g.stroke();
    var hy = -60 - bob;
    var swing = clamp(lvx * 0.0016, -0.5, 0.8) + clamp(f.vy * 0.0006, -0.4, 0.5) * -1 + Math.sin(t * 3 + f.anim) * 0.06;
    function ear(ex, ey, s) {
      g.save(); g.translate(ex, ey); g.rotate(swing * s);
      rr(-5.5, 0, 11, 32, 5.5); g.fillStyle = Pl.hat; g.fill(); g.stroke();
      rr(-2.5, 4, 5, 22, 2.5); g.fillStyle = Pl.hat2; g.fill();
      g.restore();
    }
    ear(-13, hy - 2, 1);
    g.fillStyle = INK; g.beginPath(); g.ellipse(-2, hy + 2, 16, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = Pl.skin; g.beginPath(); g.arc(3, hy + 2, 14, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.moveTo(-11, hy - 6); g.lineTo(-6, hy + 1); g.lineTo(-2, hy - 5); g.lineTo(3, hy + 0); g.lineTo(7, hy - 5); g.lineTo(12, hy - 1); g.lineTo(15, hy - 7); g.lineTo(15, hy - 9); g.lineTo(-11, hy - 9); g.closePath(); g.fill();
    var pdx = Math.cos(la) * 1.5, pdy = Math.sin(la) * 1.8;
    [[3, hy + 2], [12, hy + 2]].forEach(function (e) {
      g.fillStyle = '#F5ECB5'; g.beginPath(); g.ellipse(e[0], e[1], 4.4, 5.4, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 1.8; g.stroke();
      g.fillStyle = INK; g.beginPath(); g.ellipse(e[0] + pdx, e[1] + pdy, 2.3, 3, 0, 0, Math.PI * 2); g.fill();
    });
    g.lineWidth = 1.8; g.beginPath(); g.arc(8, hy + 8, 4.5, 0.25 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = '#B87A4E'; g.beginPath(); g.moveTo(16, hy + 3); g.lineTo(18, hy + 6); g.lineTo(15, hy + 6); g.closePath(); g.fill();
    g.lineWidth = 2.4;
    g.fillStyle = Pl.hat; g.beginPath(); g.ellipse(2, hy - 6, 17.5, 14, 0, Math.PI, 0); g.lineTo(19.5, hy - 3); g.quadraticCurveTo(2, hy - 1, -15.5, hy - 3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = Pl.hat2; g.beginPath(); g.ellipse(9, hy - 10, 7.5, 5.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK; g.beginPath(); g.arc(5.5, hy - 12, 1.4, 0, Math.PI * 2); g.arc(12.5, hy - 12, 1.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#E87B9C'; g.beginPath(); g.moveTo(7.5, hy - 9.5); g.lineTo(10.5, hy - 9.5); g.lineTo(9, hy - 7.5); g.closePath(); g.fill();
    g.fillStyle = Pl.hat; g.beginPath(); g.arc(-3, hy - 20, 4.8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = Pl.hat2; g.beginPath(); g.arc(-3, hy - 20, 2.2, 0, Math.PI * 2); g.fill();
    ear(17, hy - 2, 0.8);
    g.save(); g.translate(1, -36 - bob); g.rotate(la);
    rr(0, -4, 15, 8, 4); g.fillStyle = Pl.j1; g.fill(); g.stroke();
    var gh = W.rocket ? 11 : W.pellets > 1 ? 10 : 9;
    g.fillStyle = W.col; rr(12, -gh / 2, W.len, gh, 2); g.fill(); g.lineWidth = 1.6; g.stroke();
    g.fillStyle = W.tip; g.fillRect(12 + W.len - 6, -2.5, 6, 3);
    if (W.rail) { g.fillStyle = GOLD; g.fillRect(18, -gh / 2 - 3, 12, 3); }
    g.fillStyle = Pl.skin; g.beginPath(); g.arc(14, 1, 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
    g.restore();
    g.globalAlpha = 1;
    if (f.shield > 0) {
      g.strokeStyle = 'rgba(232,193,90,' + (0.5 + Math.sin(t * 6) * 0.2) + ')'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(f.x, f.y - 88, 16, 5, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(232,193,90,0.25)'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, f.y - 40, 30, 46, 0, 0, Math.PI * 2); g.stroke();
    }
    var ny = f.y - 104;
    g.font = '600 13px ' + FONT; g.textAlign = 'center';
    var lab = f.isPlayer ? f.name : f.name + (f.tokens ? ' · ' + f.tokens : '');
    var tw = g.measureText(lab).width + 12;
    g.fillStyle = f.isPlayer ? 'rgba(6,39,35,0.85)' : 'rgba(23,23,23,0.75)'; g.fillRect(f.x - tw / 2, ny - 13, tw, 18);
    g.fillStyle = f.isPlayer ? TEAL2 : '#F2F2F2'; g.fillText(lab, f.x, ny);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(f.x - 22, ny + 7, 44, 5);
    var fr = Math.max(0, f.hp) / (f.maxHp || 100); g.fillStyle = fr > 0.5 ? TEAL : fr > 0.25 ? '#F4D35E' : CR2; g.fillRect(f.x - 22, ny + 7, 44 * fr, 5);
    if (f.shield > 0) { g.fillStyle = GOLD; g.fillRect(f.x - 22, ny + 13, 44 * f.shield / 60, 3); }
    if (f.lives > 0) { g.fillStyle = CR2; g.font = '700 11px ' + FONT; g.fillText('♥'.repeat(Math.min(3, f.lives)), f.x, ny - 18); }
  }

  function drawHUD() {
    var p = S.player, t = S.t, left = ROUND - t;
    g.textAlign = 'center';
    var bw = 132, bx = cssW / 2 - bw / 2;
    g.fillStyle = INK; g.fillRect(bx, 12, bw, 46); g.fillStyle = CR; g.fillRect(bx + 4, 58, bw, 4);
    g.font = '700 28px ' + FONT; g.fillStyle = left < 60 ? '#FF8A80' : TEAL2; g.fillText(fmtT(left), cssW / 2, 45);
    var phase = '', pc = '#EAFBF7';
    if (S.red.state === 'idle' && RED_AT < ROUND) phase = M.name + ' · air raid in ' + fmtT(RED_AT - t);
    else if (S.red.state === 'warn') { phase = 'AIR RAID IN ' + fmtT(RED_AT - t) + ' · MOVE OUT'; pc = Math.floor(t * 3) % 2 ? '#FF8A80' : '#FFFFFF'; }
    else if (S.red.state === 'active') { phase = 'MISSILES ' + fmtT(RED_AT + RED_DUR - t); pc = '#FF8A80'; }
    else if (S.blue.state === 'active') { phase = 'BLUE ZONE OPEN · ' + TICKER + ' DROPS'; pc = SKY; }
    if (phase) {
      g.font = '600 13px ' + FONT; var pw = g.measureText(phase).width + 18;
      g.fillStyle = 'rgba(23,23,23,0.82)'; g.fillRect(cssW / 2 - pw / 2, 68, pw, 22);
      g.fillStyle = pc; g.fillText(phase, cssW / 2, 84);
    }
    g.textAlign = 'left';
    var x0 = 14, y0 = 64, W = WEAPONS[p.w];
    g.fillStyle = 'rgba(23,23,23,0.8)'; g.fillRect(x0 - 6, y0 - 6, 196, 88);
    g.font = '600 11px ' + FONT; g.fillStyle = '#EAFBF7';
    g.fillText('HP', x0, y0 + 9); g.fillText('JET', x0, y0 + 27);
    g.fillStyle = '#333'; g.fillRect(x0 + 34, y0, 146, 10); g.fillRect(x0 + 34, y0 + 18, 146, 10);
    var hpr = Math.max(0, p.hp) / (p.maxHp || 100); g.fillStyle = hpr > 0.5 ? TEAL : hpr > 0.25 ? '#F4D35E' : CR2; g.fillRect(x0 + 34, y0, 146 * hpr, 10);
    if (p.shield > 0) { g.fillStyle = GOLD; g.fillRect(x0 + 34, y0 - 3, 146 * p.shield / 60, 3); }
    g.fillStyle = SKY; g.fillRect(x0 + 34, y0 + 18, 146 * p.fuel / 100, 10);
    g.fillStyle = GOLD; g.font = '700 12px ' + FONT; g.fillText(W.name, x0, y0 + 48);
    g.fillStyle = '#EAFBF7'; g.font = '600 12px ' + FONT;
    g.fillText(p.reloadT > 0 ? 'reloading...' : p.clip + ' / ' + (p.ammo === Infinity ? '∞' : p.ammo), x0 + 112, y0 + 48);
    g.fillStyle = CR2; g.font = '700 12px ' + FONT; g.fillText('LIFE ♥' + (p.lives ? ' + 1UP x' + p.lives : '  · no 1UP'), x0, y0 + 68);
    var fy = y0 + 104;
    S.feed.forEach(function (k) {
      var age = t - k.t; if (age > 6) return;
      g.globalAlpha = Math.min(1, (6 - age) / 1.5);
      var txt = k.join ? '+ ' + k.a + ' ' + k.b : (k.zone ? '☠ ' : '') + k.a + ' → ' + k.b;
      g.font = '600 12px ' + FONT; var w = g.measureText(txt).width + 12;
      g.fillStyle = k.me ? 'rgba(163,28,27,0.85)' : 'rgba(23,23,23,0.72)'; g.fillRect(x0 - 6, fy - 13, w, 18);
      g.fillStyle = '#FFFFFF'; g.fillText(txt, x0, fy); fy += 22;
    });
    g.globalAlpha = 1;
    g.textAlign = 'right';
    var rx = cssW - 14;
    g.fillStyle = 'rgba(23,23,23,0.82)'; g.fillRect(rx - 214, 12, 220, 58);
    g.font = '700 22px ' + FONT; g.fillStyle = TEAL2; var st = TICKER + ' ' + S.tokens; g.fillText(st, rx - 4, 38);
    drawCoin(g, rx - 18 - g.measureText(st).width, 31, 11, 1);
    var alive = S.fighters.filter(function (f) { return !f.isPlayer && !f.out; }).length;
    g.font = '600 12px ' + FONT; g.fillStyle = '#EAFBF7'; g.fillText('kills ' + p.kills + ' · enemies ' + alive, rx - 4, 58);
    var mw = Math.min(210, cssW * 0.22), mh = mw * WH / WW, mx = rx - mw + 2, my = 78, k2 = mw / WW;
    g.fillStyle = 'rgba(23,23,23,0.78)'; g.fillRect(mx - 4, my - 4, mw + 4, mh + 8);
    if (S.red.state === 'warn' || S.red.state === 'active') { g.fillStyle = 'rgba(224,69,63,0.45)'; g.fillRect(mx + S.red.x1 * k2, my, (S.red.x2 - S.red.x1) * k2, mh); }
    if (S.blue.state === 'active') { g.strokeStyle = SKY; g.lineWidth = 1.5; g.beginPath(); g.arc(mx + S.blue.x * k2, my + S.blue.y * k2, S.blue.r * k2, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(94,230,207,0.6)';
    PLATS.forEach(function (q) { g.fillRect(mx + q.x * k2, my + q.y * k2, Math.max(1, q.w * k2), Math.max(1, q.h * k2 * (q.ground ? 0.3 : 1))); });
    S.items.forEach(function (it) { g.fillStyle = it.type === 'life' ? CR2 : GOLD; g.fillRect(mx + it.x * k2 - 2, my + it.y * k2 - 2, 4, 4); });
    S.fighters.forEach(function (f) { if (f.dead || f.out) return; g.fillStyle = f.isPlayer ? '#FFFFFF' : CR2; g.fillRect(mx + f.x * k2 - 2, my + (f.y - 40) * k2 - 2, f.isPlayer ? 5 : 4, f.isPlayer ? 5 : 4); });
    if (S.blue.state === 'active') arrowTo(S.blue.x, S.blue.y, SKY);
    S.items.forEach(function (it) { if (it.type === 'life') arrowTo(it.x, it.y, CR2); });
    g.textAlign = 'center';
    var my2 = cssH * 0.3;
    S.msgs.forEach(function (m) {
      var a = Math.min(1, m.t / 0.5, (m.max - m.t) / 0.25 + 0.2);
      g.globalAlpha = clamp(a, 0, 1);
      g.font = '700 ' + (cssW < 600 ? 17 : 24) + 'px ' + FONT;
      g.lineWidth = 5; g.strokeStyle = INK; g.strokeText(m.text, cssW / 2, my2); g.fillStyle = m.color; g.fillText(m.text, cssW / 2, my2);
      my2 += 32;
    });
    g.globalAlpha = 1;
    if (p.dead && !p.out) {
      g.fillStyle = 'rgba(23,23,23,0.55)'; g.fillRect(0, cssH / 2 - 40, cssW, 80);
      g.font = '700 26px ' + FONT; g.fillStyle = '#FF8A80'; g.fillText('DOWN · USING 1UP', cssW / 2, cssH / 2 - 4);
      g.font = '600 15px ' + FONT; g.fillStyle = '#EAFBF7'; g.fillText('back in ' + Math.ceil(p.respawnT) + ' · your ' + TICKER + ' is safe', cssW / 2, cssH / 2 + 24);
    }
    if (S.hint > 0 && !p.dead) {
      g.globalAlpha = Math.min(1, S.hint);
      g.font = '600 14px ' + FONT; g.fillStyle = M.theme === 'heaven' ? INK : '#EAFBF7';
      g.fillText(isTouch ? 'left stick: move · push up: jetpack   |   right stick: aim + shoot' : 'A/D move · W/space jetpack · mouse aim · click shoot · R reload', cssW / 2, cssH - 24);
      g.globalAlpha = 1;
    }
    if (isTouch) drawSticks();
  }
  function arrowTo(x, y, col) {
    var sp = worldToScreen(x, y);
    if (sp.x >= 0 && sp.x <= cssW && sp.y >= 0 && sp.y <= cssH) return;
    var ax = clamp(sp.x, 40, cssW - 40), ay = clamp(sp.y, 110, cssH - 40), ang = Math.atan2(sp.y - cssH / 2, sp.x - cssW / 2);
    g.save(); g.translate(ax, ay); g.rotate(ang); g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.moveTo(16, 0); g.lineTo(-10, -11); g.lineTo(-4, 0); g.lineTo(-10, 11); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  function stickVec(s) { var dx = (s.x - s.ox) / 60, dy = (s.y - s.oy) / 60, l = Math.sqrt(dx * dx + dy * dy); if (l > 1) { dx /= l; dy /= l; } return { x: dx, y: dy }; }
  function drawSticks() {
    function one(s, dx, dy, lab, col) {
      var ox = s ? s.ox : dx, oy = s ? s.oy : dy, kx = ox, ky = oy;
      if (s) { var ddx = s.x - ox, ddy = s.y - oy, l = Math.sqrt(ddx * ddx + ddy * ddy), m = Math.min(l, 60) / (l || 1); kx = ox + ddx * m; ky = oy + ddy * m; }
      g.globalAlpha = s ? 0.9 : 0.4;
      g.fillStyle = 'rgba(23,23,23,0.45)'; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.arc(ox, oy, 60, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(kx, ky, 26, 0, Math.PI * 2); g.fill();
      g.font = '700 11px ' + FONT; g.fillStyle = INK; g.textAlign = 'center'; g.fillText(lab, kx, ky + 4);
      g.globalAlpha = 1;
    }
    one(sticks.L, 100, cssH - 110, 'MOVE', TEAL);
    one(sticks.R, cssW - 100, cssH - 110, 'FIRE', CR2);
  }

  function render() {
    if (!g || !S) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var p = S.player, tx = clamp(p.x, cssW / 2 / scale, WW - cssW / 2 / scale), ty = clamp(p.y - 60, cssH / 2 / scale, WH - cssH / 2 / scale);
    if (WW * scale < cssW) tx = WW / 2;
    if (WH * scale < cssH) ty = WH / 2;
    if (!S.camInit) { S.cam.x = tx; S.cam.y = ty; S.camInit = true; }
    S.cam.x += (tx - S.cam.x) * 0.12; S.cam.y += (ty - S.cam.y) * 0.12;
    drawBackground();
    g.save();
    var sh = S.shake;
    g.translate(cssW / 2 + (sh ? rnd(-sh, sh) : 0), cssH / 2 + (sh ? rnd(-sh, sh) : 0));
    g.scale(scale, scale);
    g.translate(-S.cam.x, -S.cam.y);
    drawWorld();
    g.restore();
    drawHUD();
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.running && !S.paused && !S.over) {
      acc += dt;
      var n = 0;
      while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; }
      if (n === 6) acc = 0;
    }
    render();
  }

  /* ---------- input ---------- */
  function onKey(e) {
    if (!S) return;
    var k = e.key.toLowerCase(), down = e.type === 'keydown';
    if (['a', 'd', 'w', 'r', ' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].indexOf(k) !== -1) { keys[k] = down; e.preventDefault(); }
    if (down && (k === 'escape' || k === 'p') && S.running && !S.over) togglePause(!S.paused);
  }
  function onMouse(e) {
    if (!S || e.pointerType === 'touch') return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.used = true;
    if (e.type === 'pointerdown' && e.button === 0) mouse.down = true;
    if (e.type === 'pointerup') mouse.down = false;
  }
  function onTouch(e) {
    if (!S) return;
    isTouch = true; mouse.used = false;
    e.preventDefault();
    var i, tch;
    if (e.type === 'touchstart') {
      for (i = 0; i < e.changedTouches.length; i++) {
        tch = e.changedTouches[i];
        var side = tch.clientX < cssW / 2 ? 'L' : 'R';
        if (!sticks[side]) sticks[side] = { id: tch.identifier, ox: tch.clientX, oy: tch.clientY, x: tch.clientX, y: tch.clientY };
      }
    } else if (e.type === 'touchmove') {
      for (i = 0; i < e.changedTouches.length; i++) {
        tch = e.changedTouches[i];
        ['L', 'R'].forEach(function (s) { if (sticks[s] && sticks[s].id === tch.identifier) { sticks[s].x = tch.clientX; sticks[s].y = tch.clientY; } });
      }
    } else {
      for (i = 0; i < e.changedTouches.length; i++) {
        tch = e.changedTouches[i];
        ['L', 'R'].forEach(function (s) { if (sticks[s] && sticks[s].id === tch.identifier) sticks[s] = null; });
      }
    }
  }
  function onVis() { if (document.hidden && S && S.running && !S.over) togglePause(true); }

  /* ---------- UI ---------- */
  function button(lab, cls, fn) { var b = el('button', 'ga-btn' + (cls ? ' ' + cls : ''), lab); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function panel(name) { var p = el('div', 'ga-panel'); p.setAttribute('data-p', name); p.hidden = true; ui.root.appendChild(p); return p; }
  function show(name) { ['ready', 'pause', 'end'].forEach(function (n) { ui[n].hidden = n !== name; }); }
  function headWithLogo(text) {
    var th = el('div', 'ga-head');
    var logo = el('img', 'ga-logo'); logo.src = C.TOKEN_LOGO || 'fluff-token.svg'; logo.alt = TICKER;
    th.appendChild(logo); th.appendChild(el('h2', 'ga-title', text));
    return th;
  }
  function buildUI() {
    var root = el('div', 'ga'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Fluff Arena');
    cv = el('canvas', 'ga-cv'); g = cv.getContext('2d');
    root.appendChild(cv);
    var top = el('div', 'ga-top');
    top.appendChild(button('pause', 'ga-mini', function () { togglePause(true); }));
    root.appendChild(top);
    ui = { root: root, top: top };
    var rot = el('div', 'ga-rot');
    rot.appendChild(el('span', null, 'rotate your device for the best view'));
    rot.appendChild(button('ok', 'ga-mini', function () { ui.rotDismissed = true; rot.hidden = true; }));
    ui.rot = rot; root.appendChild(rot);
    ui.ready = panel('ready'); ui.pause = panel('pause'); ui.end = panel('end');
    var r = ui.ready;
    r.appendChild(el('div', 'ga-bar', 'elyfluff@arena: ~'));
    var body = el('div', 'ga-body');
    body.appendChild(headWithLogo('FLUFF ARENA'));
    body.appendChild(el('div', 'ga-sub', 'choose a map'));
    var maps = el('div', 'ga-maps');
    ui.mapBtns = {};
    ['random'].concat(MAP_KEYS).forEach(function (k) {
      var b = el('button', 'ga-map ga-map-' + k + (k === mapChoice ? ' on' : ''));
      b.type = 'button';
      b.appendChild(el('b', null, k === 'random' ? 'Random' : MAPS[k].name));
      b.appendChild(el('span', null, k === 'random' ? 'surprise me' : MAPS[k].sub));
      b.addEventListener('click', function () {
        mapChoice = k; try { localStorage.setItem('ef_map', k); } catch (e) {}
        Object.keys(ui.mapBtns).forEach(function (x) { ui.mapBtns[x].classList.toggle('on', x === k); });
      });
      ui.mapBtns[k] = b; maps.appendChild(b);
    });
    body.appendChild(maps);
    [['round', fmtT(ROUND) + ' · you vs ' + NBOTS + ' fighters'],
     ['life', 'one life · grab a 1UP to come back'],
     ['loot', 'defeated enemies drop ' + TICKER + ' · bots grab it too'],
     ['arms', 'weapon crates and shields fall from the sky'],
     [fmtT(RED_AT), 'air raid · missiles rain on the red zone'],
     [fmtT(BLUE_AT), 'blue zone opens · ' + TICKER + ' rains down'],
     ['claim', 'your ' + TICKER + ' becomes claimable on testnet']].forEach(function (l) {
      var d = el('div', 'ga-ln'); d.appendChild(el('span', 'ga-k', l[0])); d.appendChild(el('span', null, l[1])); body.appendChild(d);
    });
    var ctl = el('div', 'ga-ctl');
    ctl.appendChild(el('div', null, 'touch: left stick move · push up jetpack · right stick aim + shoot'));
    ctl.appendChild(el('div', null, 'keyboard: A/D move · W or space jetpack · mouse aim · click shoot · R reload'));
    body.appendChild(ctl);
    ui.readyMsg = el('div', 'ga-ln ga-status', '');
    body.appendChild(ui.readyMsg);
    var row = el('div', 'ga-row');
    ui.startBtn = button('start round ▶', 'ga-go', startRound);
    row.appendChild(ui.startBtn);
    row.appendChild(button('back', '', close));
    body.appendChild(row);
    r.appendChild(body);
    var p = ui.pause;
    p.appendChild(el('div', 'ga-bar', 'elyfluff@arena: ~/paused'));
    var pb2 = el('div', 'ga-body');
    pb2.appendChild(el('h2', 'ga-title', 'PAUSED'));
    ui.pauseInfo = el('div', 'ga-ln', ''); pb2.appendChild(ui.pauseInfo);
    var prow = el('div', 'ga-row');
    prow.appendChild(button('resume ▶', 'ga-go', function () { togglePause(false); }));
    prow.appendChild(button('leave round (keep ' + TICKER + ')', '', function () { endRound('left'); }));
    pb2.appendChild(prow); p.appendChild(pb2);
    var e = ui.end;
    e.appendChild(el('div', 'ga-bar', 'elyfluff@arena: ~/results'));
    ui.endBody = el('div', 'ga-body'); e.appendChild(ui.endBody);
    document.body.appendChild(root);
  }
  function togglePause(on) {
    if (!S || S.over || !S.running) return;
    S.paused = on;
    keys = {}; mouse.down = false; sticks.L = sticks.R = null;
    if (on) { ui.pauseInfo.textContent = M.name + ' · time left ' + fmtT(ROUND - S.t) + ' · ' + TICKER + ' ' + S.tokens + ' · kills ' + S.player.kills; show('pause'); }
    else { show(null); last = performance.now(); }
  }
  async function startRound() {
    ui.startBtn.disabled = true;
    ui.readyMsg.textContent = '> connecting...';
    try {
      var de = document.documentElement;
      if (isTouch && de.requestFullscreen && !document.fullscreenElement) {
        await de.requestFullscreen({ navigationUI: 'hide' }).catch(function () {});
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
      }
    } catch (err) {}
    var res = null;
    try { res = opts.onStart ? await opts.onStart() : { ok: true, matchId: null }; } catch (err) { res = { ok: false }; }
    if (!res || !res.ok) { ui.readyMsg.textContent = '✗ ' + ((res && res.error) || 'could not start, try again'); ui.startBtn.disabled = false; return; }
    useMap(mapChoice === 'random' ? pick(MAP_KEYS) : mapChoice);
    S = newState();
    S.matchId = res.matchId || null;
    S.fighters.forEach(function (f) { spawn(f, true); });
    S.player.spawnT = 3;
    S.running = true;
    show(null);
    last = performance.now(); acc = 0;
    msg(M.name.toUpperCase() + ' · ONE LIFE · COLLECT ' + TICKER, TEAL2, 3);
    resize();
  }
  async function endRound(kind) {
    if (!S || S.over) return;
    S.over = true; S.running = false; S.paused = false;
    keys = {}; mouse.down = false; sticks.L = sticks.R = null;
    var p = S.player;
    var result = { matchId: S.matchId, tokens: S.tokens, kills: p.kills, deaths: p.deaths, secs: Math.round(S.t), outcome: kind, map: M.name };
    var b = ui.endBody; b.textContent = '';
    var titles = { survived: 'YOU SURVIVED', eliminated: 'ELIMINATED', left: 'ROUND LEFT' };
    b.appendChild(headWithLogo(titles[kind] || 'ROUND OVER'));
    var big = el('div', 'ga-earn');
    big.appendChild(el('span', null, 'you earned'));
    big.appendChild(el('b', null, S.tokens + ' ' + TICKER));
    b.appendChild(big);
    var board = S.fighters.slice().sort(function (a, c) { return (c.isPlayer ? S.tokens : c.collected) - (a.isPlayer ? S.tokens : a.collected) || c.kills - a.kills; });
    var rank = board.indexOf(p) + 1;
    [['map', M.name], ['time', fmtT(S.t)], ['kills', String(p.kills)], ['bonus', S.survived ? '+' + SURVIVE_BONUS + ' survival' : '-'], ['rank', '#' + rank + ' of ' + board.length]].forEach(function (l) {
      var d = el('div', 'ga-ln'); d.appendChild(el('span', 'ga-k', l[0])); d.appendChild(el('b', null, l[1])); b.appendChild(d);
    });
    var tb = el('div', 'ga-board');
    var hd = el('div', 'ga-br ga-bh'); hd.appendChild(el('span', null, '#')); hd.appendChild(el('span', null, 'fighter')); hd.appendChild(el('span', null, TICKER + ' · kills')); tb.appendChild(hd);
    board.slice(0, 10).forEach(function (f, i) {
      var d = el('div', 'ga-br' + (f.isPlayer ? ' me' : ''));
      d.appendChild(el('span', null, String(i + 1).padStart(2, '0')));
      d.appendChild(el('span', null, (f.isPlayer ? f.name : f.name + ' · bot') + (f.out ? ' ☠' : '')));
      d.appendChild(el('span', null, (f.isPlayer ? S.tokens : f.collected) + ' · ' + f.kills));
      tb.appendChild(d);
    });
    b.appendChild(tb);
    var st = el('div', 'ga-ln ga-status', '> saving your ' + TICKER + '...');
    b.appendChild(st);
    var row = el('div', 'ga-row');
    row.appendChild(button('play again ▶', 'ga-go', function () { show('ready'); ui.startBtn.disabled = false; ui.readyMsg.textContent = ''; }));
    row.appendChild(button('back to site', '', close));
    b.appendChild(row);
    show('end');
    try {
      var rs = opts.onEnd ? await opts.onEnd(result) : null;
      if (rs && rs.ok) st.textContent = '✓ +' + (rs.saved != null ? rs.saved : S.tokens) + ' ' + TICKER + ' added · claimable on testnet: ' + (rs.total != null ? rs.total : S.tokens);
      else st.textContent = rs && rs.demo ? '[demo] not saved: the sheet is not connected yet' : '✗ ' + ((rs && rs.error) || 'could not save');
    } catch (err) { st.textContent = '✗ could not save'; }
  }
  function close() {
    if (S && S.running && !S.over) { endRound('left'); return; }
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
    window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pointerup', onMouse);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    if (ui && ui.root) ui.root.remove();
    document.body.classList.remove('ga-open');
    ui = null; cv = null; g = null; S = null;
    if (opts && opts.onClose) opts.onClose();
  }

  function open(o) {
    if (ui) return;
    opts = o || {};
    loadCoin();
    try { var mc = localStorage.getItem('ef_map'); if (mc && (mc === 'random' || MAPS[mc])) mapChoice = mc; } catch (e) {}
    isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    keys = {}; mouse = { x: 0, y: 0, down: false, used: false }; sticks = { L: null, R: null };
    useMap(mapChoice === 'random' ? 'elysium' : mapChoice);
    buildUI();
    document.body.classList.add('ga-open');
    S = newState();
    S.fighters.forEach(function (f) { spawn(f, false); });
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', onVis);
    cv.addEventListener('pointerdown', onMouse); cv.addEventListener('pointermove', onMouse); window.addEventListener('pointerup', onMouse);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (n) { cv.addEventListener(n, onTouch, { passive: false }); });
    resize();
    show('ready');
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  window.FluffArena = {
    open: open,
    _skip: function (sec) { if (S && S.running) { var target = Math.min(ROUND - 1, S.t + sec); while (S.t < target && !S.over) update(STEP); } },
    _state: function () { return S; },
    config: { round: ROUND, redAt: RED_AT, blueAt: BLUE_AT, bots: NBOTS, maps: MAP_KEYS.map(function (k) { return MAPS[k].name; }) }
  };
})();
