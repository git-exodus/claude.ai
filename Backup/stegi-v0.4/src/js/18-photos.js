/* 18-photos.js – camera and photo album (0.3). A photo is the game picture (without buttons) as a
 * small JPEG, stored apart from the game in localStorage[PHOTO_KEY] (test mode: TEST_KEYS.photos). Automatic photos are taken when
 * he hatches and at every new growth stage; they are kept. When there are PHOTO_MAX photos, the oldest
 * own photo makes room. If the phone's storage is full, old own photos are dropped until it fits. */

let photos = [];
function loadPhotos() {
  try { const a = JSON.parse(localStorage.getItem(dev.on ? TEST_KEYS.photos : PHOTO_KEY)); photos = Array.isArray(a) ? a.filter(p => p && typeof p.data === 'string') : []; }
  catch (e) { photos = []; }
}
function savePhotos() {
  for (;;) {
    try { localStorage.setItem(dev.on ? TEST_KEYS.photos : PHOTO_KEY, JSON.stringify(photos)); return true; }
    catch (e) {
      const i = photos.findIndex(p => !p.auto);
      if (i < 0) return false;
      photos.splice(i, 1);
    }
  }
}

/** Asks for a photo; it is taken right after the next picture is drawn (see drawWorld). */
function takePhoto(auto = false) {
  game.photoPending = auto ? 'auto' : 'own';
  if (!auto) { game.flash = 1; sound('shutter'); }
}

/** Called at the end of drawWorld, before the flash is drawn: copies the canvas into a photo. */
function capturePhoto() {
  const kind = game.photoPending;
  game.photoPending = null;
  const pw = PHOTO_W, ph = Math.round(PHOTO_W * H / W);
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  c.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, pw, ph);
  let data;
  try { data = c.toDataURL('image/jpeg', 0.72); } catch (e) { return; }
  photos.push({ t: now(), day: lifeDay(now()), place: S.walk ? 'travel' : S.place, auto: kind === 'auto', data });
  while (photos.length > PHOTO_MAX) {
    const i = photos.findIndex(p => !p.auto);
    photos.splice(i < 0 ? 0 : i, 1);
  }
  savePhotos();
}

/* ---------- album ---------- */

function openAlbum() {
  sound('tap');
  const list = $('photolist');
  if (!photos.length) list.innerHTML = '<p class="info empty">' + iconSVG('camera') + 'Noch keine Fotos.</p>';
  else list.innerHTML = photos.map((p, i) => '<button class="ptile photo" id="ph-' + i + '" type="button" aria-label="Foto"><img alt="" src="' + p.data + '">' +
    '<span>Tag ' + Math.max(1, p.day) + '</span></button>').reverse().join('');
  photos.forEach((p, i) => { const el = $('ph-' + i); if (el) el.addEventListener('click', () => showPhoto(i)); });
  $('photocount').textContent = photos.length + ' von ' + PHOTO_MAX + ' Fotos';
  $('album').hidden = false;
}
function closeAlbum() { $('album').hidden = true; $('photoview').hidden = true; }

function showPhoto(i) {
  const p = photos[i];
  $('pv-img').src = p.data;
  const d = new Date(p.t);
  $('pv-text').textContent = 'Tag ' + Math.max(1, p.day) + ' · ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() +
    (p.place && p.place !== 'travel' ? ' · ' + placeById(p.place).name : '');
  $('photoview').hidden = false;
}
