/* 18-photos.js – camera and photo albums (0.3, reworked in 0.5).
 *   Fototagebuch  own photos (camera button), at most PHOTO_PER_DAY per calendar day, PHOTO_OWN_MAX in all.
 *   Meilensteine  automatic photos: hatching, every new growth stage, every new place. Never removed.
 * Every photo shows the day of his life, so the album shows how he grew. A photo is the game picture
 * (without buttons) as a small JPEG, stored apart from the game in localStorage[PHOTO_KEY]
 * (test mode: TEST_KEYS.photos). If storing fails (a viewer that keeps no data, or full storage), the
 * photo stays in the album until the app closes and the settings show a warning (storageOk). */

/** Photo: { t, day (day of life), place, auto (true = milestone), kind: 'own'|'hatch'|'stage'|'place', label } */
let photos = [];
/** false once saving to the device failed (shown in the settings). */
let storageOk = true;

function loadPhotos() {
  try {
    const a = JSON.parse(localStorage.getItem(dev.on ? TEST_KEYS.photos : PHOTO_KEY));
    photos = Array.isArray(a) ? a.filter(p => p && typeof p.data === 'string')
      .map(p => ({ ...p, kind: p.kind || (p.auto ? 'stage' : 'own') })) : [];   // photos from 0.3/0.4 have no kind
  } catch (e) { photos = []; }
}

/** Stores all photos; never removes one because of an error. Returns true if it worked. */
function savePhotos() {
  try { localStorage.setItem(dev.on ? TEST_KEYS.photos : PHOTO_KEY, JSON.stringify(photos)); storageOk = true; return true; }
  catch (e) { storageOk = false; return false; }
}

/** Does this device keep data at all? (Some HTML viewers on phones do not.) */
function checkStorage() {
  try { localStorage.setItem('stegi-probe', '1'); localStorage.removeItem('stegi-probe'); return true; }
  catch (e) { return false; }
}

const ownPhotos = () => photos.filter(p => !p.auto);
/** Own photos taken today (calendar day). */
function ownToday() { const d = dayIndex(now()); return ownPhotos().filter(p => dayIndex(p.t) === d).length; }
const cameraFull = () => ownToday() >= PHOTO_PER_DAY;

/** Camera button: an own photo, if today's two are not used up. */
function cameraTap() {
  if (!hatched()) return;
  if (cameraFull()) { sound('refuse'); const b = $('b-camera'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
  takePhoto('own');
}

/** Asks for a photo; it is taken right after the next picture is drawn (see drawWorld).
 *  kind 'own' (camera) or a milestone: 'hatch' | 'stage' | 'place'. */
function takePhoto(kind = 'own', label = '') {
  game.photoPending = { kind, label };
  if (kind === 'own') { game.flash = 1; sound('shutter'); }
}

/** Called at the end of drawWorld, before the flash is drawn: copies the canvas into a photo. */
function capturePhoto() {
  const { kind, label } = game.photoPending;
  game.photoPending = null;
  const pw = PHOTO_W, ph = Math.round(PHOTO_W * H / W);
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  c.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, pw, ph);
  let data;
  try { data = c.toDataURL('image/jpeg', 0.72); } catch (e) { return; }
  const photo = { t: now(), day: lifeDay(now()), place: S.walk ? 'travel' : S.place, auto: kind !== 'own', kind, label, data };
  photos.push(photo);
  while (ownPhotos().length > PHOTO_OWN_MAX) photos.splice(photos.indexOf(ownPhotos()[0]), 1);
  savePhotos();
  if (kind === 'own') flyToAlbum(data);
  refreshCamera();
}

/** A small copy of the photo flies from the middle of the screen into the album button. */
function flyToAlbum(data) {
  const img = document.createElement('img');
  img.className = 'flyphoto'; img.src = data; img.alt = '';
  const w0 = W * 0.5, h0 = w0 * H / W;
  Object.assign(img.style, { left: (W - w0) / 2 + 'px', top: (H - h0) / 2 + 'px', width: w0 + 'px', height: h0 + 'px' });
  $('game').appendChild(img);
  const r = $('b-album').getBoundingClientRect();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    Object.assign(img.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.width * H / W + 'px', opacity: 0 });
  }));
  setTimeout(() => img.remove(), 1100);
}

/** Camera button state: greyed out with "2/2" when today's own photos are used up. */
function refreshCamera() {
  const b = $('b-camera');
  if (!b) return;
  const n = ownToday();
  b.classList.toggle('full', n >= PHOTO_PER_DAY);
  b.querySelector('.cnt').textContent = n + '/' + PHOTO_PER_DAY;
  b.querySelector('.cnt').hidden = n === 0;
}

/** Text under a photo: day of life, and for milestones what happened. */
function photoCaption(p, long) {
  const day = 'Tag ' + Math.max(1, p.day);
  const what = p.kind === 'hatch' ? 'Geschlüpft' : p.kind === 'place' ? placeById(p.place).name : p.kind === 'stage' ? (p.label || 'Gewachsen') : '';
  if (!long) return what ? day + ' · ' + what : day;
  const d = new Date(p.t);
  return day + ' · ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + (what ? ' · ' + what : p.place && p.place !== 'travel' ? ' · ' + placeById(p.place).name : '');
}

/* ---------- album ---------- */

let albumTab = 'diary';
function openAlbum(tab) {
  sound('tap');
  if (tab) albumTab = tab;
  $('a-title').textContent = dev.on ? 'Test-Fotos' : 'Fotoalbum';
  $('at-diary').classList.toggle('on', albumTab === 'diary');
  $('at-mile').classList.toggle('on', albumTab === 'mile');
  const list = $('photolist');
  const shown = photos.map((p, i) => ({ p, i })).filter(x => (albumTab === 'mile') === !!x.p.auto).reverse();
  if (!shown.length) list.innerHTML = '<p class="info empty">' + iconSVG('camera') + (albumTab === 'mile' ? 'Hier kommen Fotos vom Schlüpfen, vom Wachsen und von neuen Orten hin.' : 'Noch keine Fotos. Mit der Kamera gehen 2 Fotos pro Tag.') + '</p>';
  else list.innerHTML = shown.map(({ p, i }) => '<button class="ptile photo" id="ph-' + i + '" type="button" aria-label="Foto"><img alt="" src="' + p.data + '"><span>' + photoCaption(p) + '</span></button>').join('');
  shown.forEach(({ i }) => $('ph-' + i).addEventListener('click', () => showPhoto(i)));
  const left = PHOTO_PER_DAY - ownToday();
  $('photocount').textContent = albumTab === 'mile' ? shown.length + ' Meilensteine'
    : shown.length + ' Fotos · heute ' + (left > 0 ? 'noch ' + left + (left === 1 ? ' Foto' : ' Fotos') : 'keine mehr');
  $('album').hidden = false;
}
function closeAlbum() { $('album').hidden = true; $('photoview').hidden = true; }

let viewing = -1;
function showPhoto(i) {
  const p = photos[i];
  viewing = i;
  $('pv-img').src = p.data;
  $('pv-text').textContent = photoCaption(p, true);
  $('pv-delete').hidden = !!p.auto;   // only own photos can be deleted
  $('photoview').hidden = false;
}

/** Delete button in the big view: must be held PHOTO_DELETE_HOLD seconds (so the child does not delete by accident). */
function setupPhotoDelete() {
  const b = $('pv-delete'), fill = b.querySelector('.fill');
  let hold = null;
  const stop = () => { if (hold) cancelAnimationFrame(hold.raf); hold = null; fill.style.width = '0'; };
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); stop();
    const start = performance.now();
    const step = () => {
      const k = (performance.now() - start) / 1000 / PHOTO_DELETE_HOLD;
      fill.style.width = Math.min(100, k * 100) + '%';
      if (k >= 1) { stop(); deletePhoto(viewing); return; }
      hold.raf = requestAnimationFrame(step);
    };
    hold = { raf: requestAnimationFrame(step) };
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
}

function deletePhoto(i) {
  if (!photos[i] || photos[i].auto) return;
  photos.splice(i, 1);
  savePhotos();
  sound('pop');
  $('photoview').hidden = true;
  refreshCamera();
  openAlbum();
}
