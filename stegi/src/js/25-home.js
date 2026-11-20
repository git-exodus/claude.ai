/* 25-home.js – stars, home, shop, sticker book and friendship (0.11).
 *   Stars     earned for caring and playing (earn(kind)); counted in S.stars, shown at the top of the button column.
 *   Home      a cosy cave ("Zuhause", first in the places list, always open). Furniture bought in the shop stands
 *             in its spot; tapping a piece switches to the next one owned for that spot. Friends' presents too.
 *   Shop      (bag button, only at home) furniture for stars.
 *   Stickers  24 stickers for things done (S.stats counters); not yet earned ones are grey. New sticker = +3 stars.
 *   Friends   every visit gives that friend a heart (max 5); at 5 hearts his next visit brings a present for home. */

/** Stars for each kind of thing; also counted in S.stats (for the stickers). */
const STAR_FOR = { feed: 1, drink: 1, bath: 2, brush: 2, poop: 1, fetch: 1, hide: 2, trick: 2, melody: 2, wish: 3, place: 5,
  snowman: 2, castle: 2, jump: 1, birthday: 5, visit: 2, photo: 0, bubble: 0 };

/** Counts a thing done and gives its stars (with a little star flying up). */
function earn(kind) {
  S.stats[kind] = (S.stats[kind] || 0) + 1;
  const n = STAR_FOR[kind] || 0;
  if (n) {
    S.stars += n;
    const h = game.stegoInfo ? game.stegoInfo.head : { x: W / 2, y: standY - 100 * U };
    for (let i = 0; i < Math.min(n, 3); i++) addPart('star', h.x + rnd(-30, 30) * U, h.y - 30 * U, { vy: -90 * U, size: 8, max: 1.2 });
  }
  checkStickers();
}

/* ---------- home and furniture ---------- */

/** Furniture: spot (where it stands), price in stars, friend = present from that visitor (not for sale). */
const FURNITURE = [
  { id: 'bed_leaves', spot: 'bed', price: 5, name: 'Blätterbett' }, { id: 'bed_wood', spot: 'bed', price: 15, name: 'Holzbett' },
  { id: 'rug_round', spot: 'rug', price: 8, name: 'Runder Teppich' }, { id: 'rug_stripes', spot: 'rug', price: 12, name: 'Streifenteppich' },
  { id: 'lamp_jar', spot: 'lamp', price: 10, name: 'Glühwürmchenglas' }, { id: 'lamp_mushroom', spot: 'lamp', price: 14, name: 'Pilzlampe' },
  { id: 'pic_sun', spot: 'pic', price: 6, name: 'Sonnenbild' }, { id: 'pic_egg', spot: 'pic', price: 6, name: 'Eierbild' },
  { id: 'plant_fern', spot: 'plant', price: 5, name: 'Farn im Topf' }, { id: 'plant_flower', spot: 'plant', price: 7, name: 'Blumentopf' },
  { id: 'toybox', spot: 'toys', price: 10, name: 'Spielzeugkiste' }, { id: 'shelf', spot: 'shelf', price: 12, name: 'Regal mit Muscheln' },
  { id: 'friend_trex', spot: 'f_trex', friend: 'trex', name: 'T-Rex-Kuscheltier' },
  { id: 'friend_ptero', spot: 'f_ptero', friend: 'ptero', name: 'Feder-Mobile' },
  { id: 'friend_trike', spot: 'f_trike', friend: 'trike', name: 'Blumenkranz' },
  { id: 'friend_turtle', spot: 'f_turtle', friend: 'turtle', name: 'Muschellampe' },
  { id: 'friend_butterflies', spot: 'f_butterflies', friend: 'butterflies', name: 'Schmetterlingsbild' },
];
const furn = id => FURNITURE.find(f => f.id === id);

/** Where each spot is in the home (fractions of the screen, y relative to standY / groundY). */
function spotPos(spot) {
  return {
    bed: { x: W * 0.2, y: standY + 6 * U }, rug: { x: W * 0.5, y: standY + 20 * U }, lamp: { x: W * 0.88, y: standY - 4 * U },
    pic: { x: W * 0.3, y: groundY - 110 * U }, plant: { x: W * 0.08, y: standY + 44 * U }, toys: { x: W * 0.78, y: standY + 52 * U },
    shelf: { x: W * 0.62, y: groundY - 70 * U }, f_trex: { x: W * 0.55, y: groundY - 82 * U }, f_ptero: { x: W * 0.5, y: 120 * U },
    f_trike: { x: W * 0.12, y: groundY - 120 * U }, f_turtle: { x: W * 0.72, y: groundY - 82 * U }, f_butterflies: { x: W * 0.45, y: groundY - 115 * U },
  }[spot];
}

const atHome = () => hatched() && !S.walk && S.place === 'home';

/** Buys a piece of furniture (if he has the stars) and puts it in its spot. */
function buyFurniture(id) {
  const f = furn(id);
  if (!f || f.friend || S.home.owned.includes(id) || S.stars < f.price) { sound('refuse'); return false; }
  S.stars -= f.price;
  S.home.owned.push(id);
  S.home.placed[f.spot] = id;
  sound('fanfare');
  save(); checkStickers();
  return true;
}

/** Tap at home: a placed piece switches to the next owned one for its spot (bed: leaves -> wood -> ...). */
function homeTap(x, y) {
  if (!atHome() || game.mode !== 'idle') return false;
  for (const spot of ['bed', 'rug', 'lamp', 'pic', 'plant']) {
    const id = S.home.placed[spot], p = spotPos(spot);
    if (!id || dist(x, y, p.x, p.y - 20 * U) > 34 * U) continue;
    const owned = FURNITURE.filter(f => f.spot === spot && S.home.owned.includes(f.id)).map(f => f.id);
    if (owned.length < 2) return false;
    S.home.placed[spot] = owned[(owned.indexOf(id) + 1) % owned.length];
    sound('pop'); save();
    return true;
  }
  return false;
}

/* ---------- friendship ---------- */

/** A visit ended: one more heart for that friend; with 5 hearts the next visit brings a present. */
function friendVisited(kind) {
  const h = S.friends[kind] = Math.min(5, (S.friends[kind] || 0) + 1);
  return h;
}
/** Called when a visitor arrives: a best friend (5 hearts) brings his present once. */
function friendArrives(kind) {
  const id = 'friend_' + kind;
  if ((S.friends[kind] || 0) >= 5 && !S.home.owned.includes(id)) {
    S.home.owned.push(id); S.home.placed[furn(id).spot] = id;
    sound('fanfare'); confetti(); save(); checkStickers();
    return true;
  }
  return false;
}

/* ---------- stickers ---------- */

/** 24 stickers: icon, colour and when it is earned (from S.stats and the game). */
const STICKERS = [
  { id: 'hatch', icon: 'love', col: '#ff8fb1', name: 'Geschlüpft', ok: () => hatched() },
  { id: 'feed1', icon: 'food', col: '#a5d6a7', name: 'Erstes Futter', ok: () => st('feed') >= 1 },
  { id: 'feed10', icon: 'food', col: '#66bb6a', name: '10-mal gefüttert', ok: () => st('feed') >= 10 },
  { id: 'bath1', icon: 'bath', col: '#81d4fa', name: 'Erstes Bad', ok: () => st('bath') >= 1 },
  { id: 'brush5', icon: 'brush', col: '#80cbc4', name: '5-mal Zähne geputzt', ok: () => st('brush') >= 5 },
  { id: 'poop10', icon: 'clean', col: '#bcaaa4', name: '10-mal Kacka weg', ok: () => st('poop') >= 10 },
  { id: 'fetch10', icon: 'fun', col: '#ffe082', name: '10 Bälle gebracht', ok: () => st('fetch') >= 10 },
  { id: 'hide5', icon: 'hide', col: '#c5e1a5', name: '5-mal gefunden', ok: () => st('hide') >= 5 },
  { id: 'trick1', icon: 'train', col: '#fff59d', name: 'Erster Trick', ok: () => learnedTricks().length >= 1 },
  { id: 'trick7', icon: 'train', col: '#ffd54f', name: 'Alle Tricks', ok: () => learnedTricks().length >= TRICKS.length },
  { id: 'melody', icon: 'melody', col: '#d1c4e9', name: 'Melodie nachgespielt', ok: () => st('melody') >= 1 },
  { id: 'wish', icon: 'love', col: '#f8bbd0', name: 'Wunsch erfüllt', ok: () => st('wish') >= 1 },
  { id: 'visit1', icon: 'love', col: '#ffccbc', name: 'Erster Besuch', ok: () => st('visit') >= 1 },
  { id: 'friend5', icon: 'love', col: '#ef9a9a', name: 'Bester Freund', ok: () => Object.values(S.friends).some(h => h >= 5) },
  { id: 'places5', icon: 'map', col: '#ffe0b2', name: '5 Orte', ok: () => realFound() >= 5 },
  { id: 'places15', icon: 'map', col: '#ffcc80', name: '15 Orte', ok: () => realFound() >= 15 },
  { id: 'places30', icon: 'map', col: '#ffb74d', name: 'Alle 30 Orte', ok: () => realFound() >= 30 },
  { id: 'photo1', icon: 'camera', col: '#b0bec5', name: 'Erstes Foto', ok: () => photos.some(p => !p.auto) },
  { id: 'snowman', icon: 'clean', col: '#e3f2fd', name: 'Schneemann', ok: () => st('snowman') >= 1 },
  { id: 'castle', icon: 'castle', col: '#ffe082', name: 'Sandburg', ok: () => st('castle') >= 1 },
  { id: 'jump', icon: 'drink', col: '#90caf9', name: 'Pfützen-Springer', ok: () => st('jump') >= 1 },
  { id: 'birthday', icon: 'hat', col: '#f48fb1', name: 'Geburtstag gefeiert', ok: () => st('birthday') >= 1 },
  { id: 'grown', icon: 'love', col: '#9575cd', name: 'Ganz groß', ok: () => hatched() && stageAt(now()) >= STAGES.length - 1 },
  { id: 'home5', icon: 'bed', col: '#a1887f', name: 'Zuhause eingerichtet', ok: () => S.home.owned.length >= 5 },
];
const st = k => S.stats[k] || 0;
const realFound = () => S.found.filter(f => f.id !== 'home').length;

/** Gives every sticker whose condition is now true (+3 stars and a little fanfare for each new one). */
function checkStickers() {
  let got = 0;
  for (const s of STICKERS) if (!S.stickers.includes(s.id) && s.ok()) { S.stickers.push(s.id); S.stars += 3; got++; }
  if (got && game.screen === 'game') { sound('sparkle'); const b = $('b-stickers'); if (b) { b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow'); } }
  if (got) save();
  return got;
}

function openStickers() {
  sound('tap');
  checkStickers();
  $('stickerlist').innerHTML = STICKERS.map(s => '<div class="sticker' + (S.stickers.includes(s.id) ? '' : ' locked') + '" style="--c:' + s.col + '"><span>' +
    iconSVG(s.icon) + '</span><i>' + s.name + '</i></div>').join('');
  $('stickercount').textContent = S.stickers.length + ' von ' + STICKERS.length + ' Stickern';
  $('stickers').hidden = false;
}
function closeStickers() { $('stickers').hidden = true; }

/* ---------- shop ---------- */

function openShop() {
  if (!atHome()) return;
  sound('tap');
  const items = FURNITURE.filter(f => !f.friend);
  $('shoplist').innerHTML = items.map(f => {
    const owned = S.home.owned.includes(f.id), can = S.stars >= f.price;
    return '<button class="shopitem' + (owned ? ' owned' : can ? '' : ' poor') + '" id="si-' + f.id + '" type="button"><canvas width="120" height="96"></canvas>' +
      '<b>' + (owned ? '✓' : '★ ' + f.price) + '</b><i>' + f.name + '</i></button>';
  }).join('');
  for (const f of items) {
    const el = $('si-' + f.id), c = el.querySelector('canvas').getContext('2d');
    c.save(); c.translate(60, 80); drawFurniture(c, f.id, 0, 0, 0.75, 0.5, 1); c.restore();
    el.addEventListener('click', () => { if (buyFurniture(f.id)) openShop(); else { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } });
  }
  $('shopstars').textContent = '★ ' + S.stars;
  $('shop').hidden = false;
}
function closeShop() { $('shop').hidden = true; }

/* ---------- drawing ---------- */

/** Draws one piece of furniture with its foot at (x, y), size s (1 = normal), light L, time t. */
function drawFurniture(c, id, x, y, s, t = 0, L = 1) {
  const u = U * s;
  c.save(); c.translate(x, y);
  if (id === 'bed_leaves') { c.fillStyle = '#7cb342'; for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse((i - 3) * 16 * u, -8 * u - (i % 2) * 4 * u, 18 * u, 9 * u, (i - 3) * 0.2, 0, TAU); c.fill(); } c.fillStyle = '#558b2f'; c.beginPath(); c.ellipse(0, -2 * u, 64 * u, 8 * u, 0, 0, TAU); c.fill(); }
  else if (id === 'bed_wood') { c.fillStyle = '#8d6e63'; c.fillRect(-66 * u, -22 * u, 132 * u, 18 * u); c.fillRect(-66 * u, -46 * u, 10 * u, 46 * u); c.fillStyle = '#90caf9'; c.fillRect(-56 * u, -30 * u, 120 * u, 10 * u); c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-40 * u, -32 * u, 16 * u, 7 * u, 0, 0, TAU); c.fill(); }
  else if (id === 'rug_round') { c.fillStyle = '#ef9a9a'; c.beginPath(); c.ellipse(0, 0, 110 * u, 18 * u, 0, 0, TAU); c.fill(); c.strokeStyle = '#fff3e0'; c.lineWidth = 3 * u; c.beginPath(); c.ellipse(0, 0, 80 * u, 12 * u, 0, 0, TAU); c.stroke(); }
  else if (id === 'rug_stripes') { const cols = ['#4fc3f7', '#fff59d', '#a5d6a7', '#ffab91']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.fillRect(-110 * u + i * 55 * u, -14 * u, 55 * u, 28 * u); } }
  else if (id === 'lamp_jar' || id === 'friend_turtle') {
    const glow = clamp(1.2 - L, 0.25, 1), col = id === 'lamp_jar' ? '#e6ff8c' : '#ffcc80';
    const g = c.createRadialGradient(0, -30 * u, 2, 0, -30 * u, 46 * u); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00');
    c.globalAlpha = glow; c.fillStyle = g; c.beginPath(); c.arc(0, -30 * u, 46 * u, 0, TAU); c.fill(); c.globalAlpha = 1;
    if (id === 'lamp_jar') { c.fillStyle = 'rgba(200,230,255,0.6)'; c.fillRect(-12 * u, -46 * u, 24 * u, 46 * u); c.fillStyle = '#8d6e63'; c.fillRect(-13 * u, -50 * u, 26 * u, 6 * u); c.fillStyle = col; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(Math.sin(t * 2 + i) * 6 * u, -10 * u - i * 9 * u, 2.5 * u, 0, TAU); c.fill(); } }
    else { c.fillStyle = '#ffccbc'; c.beginPath(); c.moveTo(-16 * u, -20 * u); c.lineTo(0, -44 * u); c.lineTo(16 * u, -20 * u); c.fill(); c.fillStyle = '#a1887f'; c.fillRect(-4 * u, -20 * u, 8 * u, 20 * u); }
  }
  else if (id === 'lamp_mushroom') { const glow = clamp(1.2 - L, 0.25, 1); const g = c.createRadialGradient(0, -40 * u, 2, 0, -40 * u, 50 * u); g.addColorStop(0, '#ffab91cc'); g.addColorStop(1, '#ffab9100'); c.globalAlpha = glow; c.fillStyle = g; c.beginPath(); c.arc(0, -40 * u, 50 * u, 0, TAU); c.fill(); c.globalAlpha = 1; c.fillStyle = '#f5ecd7'; c.fillRect(-5 * u, -40 * u, 10 * u, 40 * u); c.fillStyle = '#e57373'; c.beginPath(); c.ellipse(0, -40 * u, 24 * u, 16 * u, 0, Math.PI, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-8 * u, -48 * u, 3 * u, 0, TAU); c.arc(8 * u, -46 * u, 2.5 * u, 0, TAU); c.fill(); }
  else if (id === 'pic_sun' || id === 'pic_egg' || id === 'friend_butterflies') {
    c.fillStyle = '#8d6e63'; c.fillRect(-26 * u, -40 * u, 52 * u, 40 * u); c.fillStyle = '#e3f2fd'; c.fillRect(-21 * u, -35 * u, 42 * u, 30 * u);
    if (id === 'pic_sun') { c.fillStyle = '#ffd54f'; c.beginPath(); c.arc(0, -20 * u, 9 * u, 0, TAU); c.fill(); c.fillStyle = '#81c784'; c.fillRect(-21 * u, -12 * u, 42 * u, 7 * u); }
    else if (id === 'pic_egg') { c.fillStyle = '#fff4d6'; c.beginPath(); c.ellipse(0, -20 * u, 8 * u, 11 * u, 0, 0, TAU); c.fill(); c.fillStyle = '#9ad9b0'; c.beginPath(); c.arc(-3 * u, -22 * u, 2 * u, 0, TAU); c.arc(3 * u, -16 * u, 2 * u, 0, TAU); c.fill(); }
    else { for (const [ox, col] of [[-8, '#ff8a65'], [8, '#4fc3f7']]) { c.fillStyle = col; c.beginPath(); c.ellipse(ox * u - 4 * u, -20 * u, 5 * u, 7 * u, -0.4, 0, TAU); c.ellipse(ox * u + 4 * u, -20 * u, 5 * u, 7 * u, 0.4, 0, TAU); c.fill(); } }
  }
  else if (id === 'plant_fern' || id === 'plant_flower') { c.fillStyle = '#bf6d3a'; c.beginPath(); c.moveTo(-14 * u, -22 * u); c.lineTo(14 * u, -22 * u); c.lineTo(10 * u, 0); c.lineTo(-10 * u, 0); c.fill();
    if (id === 'plant_fern') { c.strokeStyle = '#43a047'; c.lineWidth = 3 * u; for (const a of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.moveTo(0, -22 * u); c.quadraticCurveTo(a * 40 * u, -50 * u, a * 60 * u, -40 * u); c.stroke(); } }
    else { c.strokeStyle = '#43a047'; c.lineWidth = 2.5 * u; for (const [ox, col] of [[-8, '#ec407a'], [2, '#ffca28'], [10, '#7e57c2']]) { c.beginPath(); c.moveTo(0, -22 * u); c.lineTo(ox * u, -44 * u); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(ox * u, -46 * u, 6 * u, 0, TAU); c.fill(); } } }
  else if (id === 'toybox') { c.fillStyle = '#ffb74d'; c.fillRect(-26 * u, -26 * u, 52 * u, 26 * u); c.fillStyle = '#ef6c00'; c.fillRect(-28 * u, -30 * u, 56 * u, 6 * u); drawBall(c, -8 * u, -34 * u, 9 * u, 0); c.fillStyle = '#42a5f5'; c.fillRect(6 * u, -40 * u, 10 * u, 10 * u); }
  else if (id === 'shelf') { c.fillStyle = '#8d6e63'; c.fillRect(-40 * u, -6 * u, 80 * u, 6 * u); for (const [ox, col] of [[-26, '#ffccbc'], [-6, '#f8bbd0'], [16, '#fff3e0']]) { c.fillStyle = col; c.beginPath(); c.arc(ox * u, -6 * u, 7 * u, Math.PI, TAU); c.fill(); } }
  else if (id === 'friend_trex') { c.fillStyle = '#ff8a4c'; c.beginPath(); c.ellipse(0, -12 * u, 12 * u, 11 * u, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(9 * u, -25 * u, 8 * u, 0, TAU); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(11 * u, -27 * u, 1.6 * u, 0, TAU); c.fill(); }
  else if (id === 'friend_ptero') { c.strokeStyle = '#8d6e63'; c.lineWidth = 1.5 * u; c.beginPath(); c.moveTo(0, -60 * u); c.lineTo(0, -20 * u); c.moveTo(-30 * u, -20 * u); c.lineTo(30 * u, -20 * u); c.stroke(); for (const [ox, col] of [[-30, '#b388ff'], [0, '#ffca28'], [30, '#4fc3f7']]) { c.fillStyle = col; c.beginPath(); c.ellipse(ox * u, -6 * u + Math.sin(t * 2 + ox) * 3 * u, 4 * u, 12 * u, 0.3, 0, TAU); c.fill(); } }
  else if (id === 'friend_trike') { for (let i = 0; i < 10; i++) { const a = i * TAU / 10; c.fillStyle = ['#ff8fb1', '#ffd54f', '#b39ddb'][i % 3]; c.beginPath(); c.arc(Math.cos(a) * 18 * u, -20 * u + Math.sin(a) * 18 * u, 5 * u, 0, TAU); c.fill(); } }
  c.restore();
}

/** The home's furniture (everything owned and placed), drawn behind him; the rug under him. */
/** 0.12.4: furniture is layered by where it stands, like in a real room. Things on the wall and things whose foot
 *  is level with his feet or further back (rug, bed, lamp) are drawn behind him (layer 'back'); the toy box and
 *  the plant stand further to the front (lower on screen than his feet) and are drawn in front of him and the
 *  sibling (layer 'front'). They can cover his legs, never his face. */
const HOME_FRONT = ['plant', 'toys'];

function drawHome(c, time, L, layer = 'back') {
  if (!atHome()) return;
  const pl = S.home.placed;
  const spots = ['rug', 'pic', 'shelf', 'f_trex', 'f_turtle', 'f_trike', 'f_butterflies', 'f_ptero', 'bed', 'lamp', 'plant', 'toys']
    .filter(sp => HOME_FRONT.includes(sp) === (layer === 'front'));
  for (const spot of spots) {
    const id = pl[spot]; if (!id) continue;
    const p = spotPos(spot);
    drawFurniture(c, id, p.x, p.y, ['pic', 'shelf', 'f_trex', 'f_turtle', 'f_trike', 'f_butterflies', 'f_ptero'].includes(spot) ? 1.25 : 1.4, time, L);   // bigger than in the shop
  }
}

/** The home itself: cave wall, a round opening to the sky (day or night), wooden floor. */
PLACE_DRAW.home = { indoor: true, draw(c, e) {
  const g = c.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, '#6d4c41'); g.addColorStop(1, '#8d6e63');
  c.fillStyle = g; c.fillRect(0, 0, W, groundY + 2);
  // Round opening with the sky outside.
  const ox = W * 0.8, oy = groundY * 0.42, r = Math.min(W * 0.16, 70 * U);
  c.fillStyle = mix(SKY.night[1], SKY.day[0], e.L); c.beginPath(); c.arc(ox, oy, r, 0, TAU); c.fill();
  if (e.L < 0.5) { c.fillStyle = '#fff8d8'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(ox + Math.cos(i * 2.1) * r * 0.6, oy + Math.sin(i * 1.7) * r * 0.5, 1.6 * U, 0, TAU); c.fill(); } }
  else { c.fillStyle = '#ffe066'; c.beginPath(); c.arc(ox + r * 0.3, oy - r * 0.2, r * 0.25, 0, TAU); c.fill(); }
  c.strokeStyle = '#4e342e'; c.lineWidth = 8 * U; c.beginPath(); c.arc(ox, oy, r, 0, TAU); c.stroke();
  // Stones in the wall.
  c.fillStyle = 'rgba(0,0,0,0.12)'; const r2 = mulberry(151);
  for (let i = 0; i < 14; i++) { c.beginPath(); c.ellipse(r2() * W, r2() * groundY, (10 + r2() * 14) * U, (6 + r2() * 8) * U, 0, 0, TAU); c.fill(); }
  // Wooden floor.
  pGround(c, { ...e, d: k => k }, '#c49a6c', '#a77b4f');
  c.strokeStyle = 'rgba(80,50,30,0.25)'; c.lineWidth = 2 * U;
  for (let y = groundY + 24 * U; y < H; y += 26 * U) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
} };
