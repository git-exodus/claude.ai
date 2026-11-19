# Stegi

Ein Tamagotchi für ein Kind von 5 Jahren: Ein kleiner Stegosaurus schlüpft aus einem Ei, wächst in
30 Tagen groß und will gefüttert, getränkt, gestreichelt, gebadet und bespielt werden. Er schläft
nach der echten Uhrzeit (Standard 20:00–7:00). Man braucht nicht lesen zu können: alles läuft über
Bilder, Farben und Geräusche. **Der Stego stirbt nie** und wird nie krank. Vergisst man ihn, ist er
nur hungrig oder traurig.

**Stand: Version 0.1 (Runde 1 von 2).** Eine einzige HTML-Seite ohne externe Bilder oder Töne
(alles wird per Code gezeichnet und erzeugt), zusätzlich als Android-APK.

Diese Datei soll jeder späteren Sitzung reichen, um ohne Vorwissen weiterzuarbeiten.
**Wenn du etwas am Spiel änderst, halte diese Datei aktuell.** Aufbau und Werkzeuge sind dieselben
wie bei Burgwacht (`../burgwacht/README.md`). Die Arbeitsregeln mit dem Auftraggeber stehen in
`../CLAUDE.md` und in `../burgwacht/README.md`, Abschnitt 2. Sie gelten hier genauso.

---

## 1. Schnellstart

```bash
cd stegi && python3 build.py          # baut stegi.html und die APK-Seite aus src/
```

```bash
cd "$(mktemp -d)" && /pfad/zum/repo/stegi/tests/run.sh   # alle Tests, Bilder landen im aktuellen Ordner
```

```bash
cd stegi && ./build-apk.sh            # baut zusätzlich Stegi.apk (Android-SDK nötig, siehe Burgwacht-README 4.3)
```

Erwartet: **91 Prüfungen, 0 Fehler** (suite-core 52, suite-ui 39).

Nach jeder fertigen Änderungsrunde:

1. Version an drei Stellen erhöhen (4.3).
2. `tests/run.sh`: alles grün, sonst nicht ausliefern.
3. `./build-apk.sh`, dann `aapt2 dump badging Stegi.apk` (Version) und `apksigner verify --verbose Stegi.apk` (erste Zeile „Verifies“).
4. `stegi.html` auf das **bestehende** Artefakt veröffentlichen (4.2).
5. `android/app/src/main/assets/index.html` und `Stegi.apk` an den Auftraggeber schicken.
6. Diese README mitziehen, committen, pushen. Vor größeren Runden ein Backup nach `Backup/stegi-v<Version>/`.

---

## 2. Ordnerstruktur

```
stegi/
├── README.md              diese Datei
├── build.py               setzt src/ zu den beiden fertigen Seiten zusammen (wie bei Burgwacht)
├── build-apk.sh           build.py + Gradle-Build + Kopie nach Stegi.apk
├── stegi.html             ERZEUGT: Seite für das Claude-Artefakt (Schriften von Google Fonts)
├── Stegi.apk              ERZEUGT: Debug-signierte Android-App (wird mit eingecheckt)
├── src/
│   ├── page.html          Markup: Leisten, Futterleiste, Hauptmenü, Einstellungen, Rückfrage, Pause
│   ├── style.css          alle Styles
│   └── js/                Spielcode, siehe Abschnitt 5
├── fonts/                 Lilita One und Nunito (OFL), für die APK eingebettet
├── android/               WebView-App, Paket com.stegi.game, Hochformat
│   └── app/src/main/res/mipmap-xhdpi|xxxhdpi/ic_launcher.png   App-Symbol (mit tests/make-icon.js erzeugt)
└── tests/
    ├── lib.js             gemeinsame Hilfen (Laden, Zeitreise, schnelles Schlüpfen)
    ├── run.sh             baut und führt alle Testreihen aus
    ├── suite-core.js      Regeln: Uhr, Ei, Wachstum, Bedürfnisse, Kacka, Pflege, Schlaf, Speichern, Spielzeit
    ├── suite-ui.js        Bedienung mit echter Maus, Einstellungen, Zurück-Taste, Beenden, Musik, Bildschirmfotos
    └── make-icon.js       kein Test: zeichnet das App-Symbol mit dem Spielcode neu
```

**Niemals** `stegi.html` oder `android/app/src/main/assets/index.html` von Hand bearbeiten, immer `src/`.

---

## 3. Was das Kind sieht und tun kann

**Hauptmenü:** oben der Name, in der Mitte der Stego in seiner aktuellen Größe (am Anfang das Ei)
mit einem pulsierenden Kreis, unten „Beenden“ (nur in der APK; im Browser kann eine Seite sich nicht
schließen). Antippen des Stegos/Eis zoomt weich ins Spiel (0,7 s). Die Zurück-Taste führt aus dem
Spiel ins Menü.

**Ei:** im Nest. Mit dem Finger streicheln: Das Ei glüht, wackelt, Herzen steigen auf. Fünf Herzen
über dem Ei füllen sich mit dem heutigen Streicheln. Eine wischende Hand zeigt, was zu tun ist.

**Oben:** fünf Bedürfnisse als Symbol mit Balken (grün / gelb unter 30 / rot unter 20). Ein Symbol
unter 30 wackelt, und der Stego zeigt eine Gedankenblase mit dem, was er am dringendsten braucht.
Rechts das Zahnrad für die Eltern.

**Unten:** Essen, Trinken, Baden, Ball, Zähneputzen, und abends der Mond „Licht aus“.

| Tätigkeit | Wie |
|---|---|
| Streicheln | Finger über den Stego bewegen: Herzen, Schnurren, Rückenplatten wackeln |
| Antippen | er kichert und hüpft (nachts: murmelt und dreht sich um) |
| Essen | Futterleiste: Farn, Blatt, Beeren, Apfel, Melone. Antippen = fliegt zum Maul; oder zum Maul ziehen. Satt: schüttelt den Kopf |
| Trinken | Napf erscheint, er senkt den Kopf und schlabbert |
| Baden | Badewanne, mit dem Finger schrubben (Schaumblasen), dann Abbrausen und Glitzer |
| Zähne putzen | Zahnbürste folgt dem Finger, am Maul hin und her reiben |
| Ball | Ball wegschnipsen, er rennt hin, bringt ihn zurück und freut sich |
| Kacka | Häufchen mit Fliegen antippen: Pling, weg |
| Licht aus | ab 19:30: er legt sich schlafen |

**Gesichter:** fröhlich, Augen zu (gestreichelt), traurig mit Augenbraue (ein Bedürfnis unter 20),
kauen, gähnen, Zähne zeigen, schlafen (liegend, Zzz). Schmutzig: braune Flecken (Sauberkeit unter 50).

**Geräusche** (keine Sprache, so gewünscht): Schnurren, Kichern, Gähnen, Schnarchen, Winseln,
Bauchknurren, Schmatzen, Schlabbern, Platschen, Blubb, Pling, Ploppen, Knacken des Eis, Piepsen aus
dem Ei, Fanfare. Dazu eine leise Spieluhr-Melodie, nur tagsüber.

---

## 4. Ausliefern

### 4.1 Bauen

Wie bei Burgwacht (`build.py` klebt alle `src/js/*.js` in Namensreihenfolge in **eine** Funktion;
keine Module). Die APK braucht das Android-SDK in `/opt/android-sdk` (Burgwacht-README 4.3).

### 4.2 Artefakt und Dateien

- **Artefakt:** `stegi.html` auf **https://claude.ai/artifact/WXD6SMnTBsPSbvYhp2E45y** veröffentlichen.
  In einer neuen Sitzung die URL als `url` mitgeben (vorher `action: "read"`), sonst entsteht ein neuer Link.
- **Dateien:** `android/app/src/main/assets/index.html` (spielbar, offline) und `Stegi.apk` schicken.
- Die APK ist ein Debug-Build: Am Handy „Unbekannte Apps installieren“ erlauben.

### 4.3 Version erhöhen (drei Stellen)

| Stelle | Beispiel |
|---|---|
| `src/js/02-config.js` → `VERSION` | `const VERSION = '0.1';` |
| `src/page.html` → `#credit` (wird zusätzlich aus `VERSION` gesetzt) | `@made by Brownii (Claude.ai) · v0.1` |
| `android/app/build.gradle` → `versionCode` (+1) und `versionName` | `versionCode 1`, `versionName '0.1'` |

`suite-ui.js` prüft die Fußzeile in den Einstellungen.

---

## 5. Code-Architektur

| Datei | Inhalt |
|---|---|
| `01-core.js` | Mathe-Kürzel, `$()`, Canvas, Bildschirmmaße `W, H, DPR, U, groundY`, Farbmischung |
| `02-config.js` | **Alle Spielwerte** (Abschnitt 6) und die Symbole `ICONS` (SVG-Pfade, für Knöpfe *und* Canvas) |
| `03-clock.js` | Uhr `now()` (mit `clock.offset` für Zeitreisen in Tests), Tagesnummer, Nacht, müde, schlafend, wache Sekunden, Himmelslicht `skyAt` |
| `04-state.js` | Spielstand `S`, `blankSave`, `sanitizeSave`, Laden/Speichern/Zurücksetzen, `tick(t)` (Zeit vergeht), Stufe, Wachstum, Kacka-Plan, Spielzeit |
| `05-audio.js` | WebAudio: `tone`, `noise`, alle Geräusche in `SOUNDS`, `sound(name)`, Spieluhr-Musik `updateMusic` |
| `06-draw-stego.js` | `drawStego()`: der Stego in jeder Größe, Pose und Laune; gibt Maul-, Kopf- und Körperposition zurück |
| `07-draw-scene.js` | Himmel, Sonne/Mond, Sterne, Wolken, Hügel, Wiese, Nest, Ei mit Rissen, Kacka, Futter, Napf, Wanne, Bürste, Ball, Gedankenblase, Partikel |
| `08-game.js` | Zustand `game` und `pet`, Ei-Logik, alle Tätigkeiten, `update(dt)`, `drawWorld()` |
| `09-ui.js` | HTML-Teile: Leisten, Knöpfe, Futterleiste, Menü, Einstellungen (Zahnrad 3 s), Rückfrage, Pause, `window.__back` |
| `10-input.js` | Finger: Tippen, Streicheln, Ziehen, Werfen |
| `11-main.js` | `resize`, Bildschleife, Speichern alle 5 s und beim Verlassen, `start()` |
| `99-debug.js` | `window.__st` für die Tests (wird vom Spiel nicht benutzt), ruft `start()` auf |

**Wie Zeit vergeht:** Jedes Bild ruft `tick(now())`. `S.last` merkt, bis wann gerechnet wurde. Lange
Pausen (App zu) werden in Minutenschritten nachgerechnet, nur die **wachen** Minuten zählen.
So stimmen die Werte nach dem Öffnen am nächsten Morgen. Läuft die Uhr rückwärts, passiert nichts.

**Bildschirme und Tätigkeiten:** `game.screen` ist `menu` oder `game`; `game.trans` (0..1) ist der
Kamera-Zoom dazwischen. `game.mode` ist `idle | eat | drink | bath | brush | ball | hatch | party`.
Nach jedem Wechsel `refreshUI()` (wird zusätzlich alle 0,5 s aufgerufen). Fällt die Nacht, endet
jede Tätigkeit (`endMode`).

**Größen:** Alles in Vielfachen von `U` (1 auf einem 360 px breiten Handy). Der Stego wird in
„Einheiten“ gezeichnet (ausgewachsen ca. 260 lang) und auf `stegoSize` (92 % der Breite) skaliert,
mal `lerp(SIZE_MIN, 1, Wachstum)`.

---

## 6. Spielwerte (Stand 0.1, Quelle: `src/js/02-config.js`)

### 6.1 Ei und Schlüpfen

- Pro Kalendertag **2 Minuten** streicheln → ein Riss (höchstens einer pro Tag, 3 Risse).
- Am Tag **nach** dem 3. Riss: **15 Sekunden** streicheln → Schlüpfen (1,8 s Wackeln und Knacken,
  dann Schalen fliegen, Fanfare, Konfetti). Schnellstens also: Tag 1, 2, 3 je ein Riss, Tag 4 Schlüpfen.
- Vergessene Tage schaden nicht, es dauert nur länger. Nachts schläft auch das Ei (kein Streicheln).

### 6.2 Wachstum (Schlüpftag = Tag 1)

| Stufe | ab Tag | Rückenplatten | Schwanzstacheln |
|---|---|---|---|
| Baby | 1 | 4 | keine |
| Kind | 6 | 5 | 2 |
| Jugendlicher | 13 | 6 | 2 |
| Fast groß | 23 | 7 | 4 |
| Ganz groß | 30 | 7 | 4 |

Jeder Kalendertag zählt, auch ohne Besuch. Die Größe wächst täglich gleichmäßig von 55 % (Tag 1)
bis 100 % (Tag 30); Babys haben einen größeren Kopf und kürzere Beine. Jede neue Stufe wird beim
nächsten Hinsehen mit Fanfare und Konfetti gefeiert (`S.stageSeen`).

### 6.3 Bedürfnisse (0–100, nach dem Schlüpfen alle 70)

| Bedürfnis | von voll auf leer in (wache Stunden) | auffüllen |
|---|---|---|
| Essen | 8 | Farn 20, Blatt 20, Beeren 15, Apfel 25, Melone 30 (ab 95 lehnt er ab) |
| Trinken | 7 | ein Napf +35 (ab 95 lehnt er ab) |
| Liebe | 8 | Streicheln +3 je 90 U Fingerweg; Antippen +1; jeder Happen +1; Zähne +5 |
| Spaß | 8 | jeder zurückgebrachte Ball +12 |
| Sauberkeit | 16, mit Kacka schneller (je Häufchen einmal mehr) | Baden (6 s schrubben bis 100), Kacka weg +5, Zähne +10 |

- Nachts (Schlafenszeit bis Aufstehen) sinkt nichts.
- Unter 30: Gedankenblase und wackelndes Symbol; Essen unter 30: Bauchknurren alle 16–26 s.
- Unter 20: trauriges Gesicht, Winseln alle 18–28 s.
- **Kacka:** nach jedem 4. Happen, 2 Minuten später, höchstens 3 liegen herum.

### 6.4 Tag und Nacht (echte Uhrzeit, Eltern können sie ändern)

| Zeit (Standard) | Was passiert |
|---|---|
| 6:30 | Morgenrot beginnt |
| 7:00 | er wacht auf |
| ab 18:30 | Abendrot |
| 19:30 | müde: gähnt, „Licht aus“-Knopf leuchtet; Antippen legt ihn früher schlafen |
| 20:00 | schläft spätestens jetzt von selbst ein; Mond, Sterne, Zzz, Schnarchen; Knöpfe weg |

Die Sonne wandert zwischen Aufstehen und Schlafenszeit über den Himmel, der Mond in der Nacht.

### 6.5 Eltern-Einstellungen (Zahnrad **3 Sekunden** halten)

Anzeige „Tag x von 30 · Stufe“ bzw. „Noch im Ei · n Risse“. Name (max. 12 Zeichen), Geräusche an/aus,
Musik an/aus, Schlafenszeit 18:00–22:00, Aufstehen 5:30–9:00 (je halbe Stunde), Spielzeit pro Tag
(unbegrenzt / 15 / 30 / 45 / 60 / 90 Minuten; danach Pausen-Hinweis und zurück ins Menü bis morgen),
**Alles zurücksetzen** mit Rückfrage (neues Ei, alle Werte und Einstellungen auf Standard).

---

## 7. Spielstand

`localStorage['stegi-v1']` = `S` als JSON. Jedes Feld läuft beim Laden durch `sanitizeSave()`
(geprüft, begrenzt, fehlende Felder bekommen Standardwerte). **Neue Felder immer dort mit Standardwert
ergänzen**, alte Spielstände müssen weiter laden. Gespeichert wird bei jeder Tätigkeit, alle 5 s und
beim Verlassen der App. Deinstallieren der APK löscht den Stand.

---

## 8. Tests

`tests/run.sh` aus einem Scratch-Ordner. Die Tests laden die APK-Seite in headless Chromium,
stoppen die Echtzeit-Schleife (`__st.pause(true)`) und bewegen das Spiel mit `__st.step(sekunden)`.
Zeitreise: `__st.setTime('2026-11-20T10:00')`, `__st.travel(stunden)`, in lib.js `at(page, h, m)`.
`hatchQuick(page)` bringt ein neues Spiel in vier Spieltagen zum geschlüpften Baby.
`window.__stQuiet = true` (in lib.js gesetzt) schaltet die Musik aus.

Fallstricke:
- Werte sinken auch während der Testschritte minimal; Prüfungen mit kleiner Toleranz schreiben, nicht `===`.
- Beim Neuladen einer Seite die Testuhr **vorher** setzen (`page.addInitScript(o => window.__stOffset = o)`),
  sonst rechnet `tick` die Zeit zwischen echter und Test-Uhr als vergangen.
- Ton wird erst nach einer Berührung freigegeben (normale Autoplay-Regeln, wie am Handy). Nie mit
  `--autoplay-policy=no-user-gesture-required` testen.

---

## 9. Bekannte Eigenheiten

- **Nur im Emulator getestet** (Chromium, 360×740). Auf einem echten Handy noch nicht ausprobiert.
  Wie die Geräusche und die Musik klingen, ist ungeprüft.
- Keine Benachrichtigungen, wenn die App zu ist (bewusst nicht in Runde 1).
- Nachts kann man nicht füttern oder spielen; das ist so gewollt.
- Ändert man am Handy die Uhrzeit von Hand zurück und wieder vor, kann der Stego eine Weile „ohne Pflege“ erleben.

---

## 10. Versionsgeschichte

| Version | Inhalt |
|---|---|
| 0.1 | Runde 1: Hauptmenü mit Stego/Ei, Ei mit 3 Rissen und Schlüpfen, 5 Wachstumsstufen in 30 Tagen, 5 Bedürfnisse, Essen, Trinken, Streicheln, Baden, Zähneputzen, Ball, Kacka, Schlafen 20–7 Uhr mit Tag/Nacht-Himmel, Geräusche und Spieluhr, Eltern-Einstellungen mit Spielzeit-Grenze und „Alles zurücksetzen“ |

---

## 11. Offene Punkte (Runde 2, mit dem Auftraggeber vereinbart)

- **Verstecken:** er versteckt sich hinter Büschen/Steinen, man tippt, bis man ihn findet.
- **Musik machen:** Trommel und Xylophon mit großen Tasten, der Stego tanzt im Takt.
- **Verkleiden:** etwa 12 Teile (Hüte, Brillen, Schals, Schleifen, Krone), etwa alle 2–3 Tage ein neues als Geschenk.
- **Fotomodus und Album:** Kameraknopf mit Blitz, automatische Fotos beim Schlüpfen und bei jeder Stufe, höchstens 40.
- **Besuch:** höchstens einmal am Tag (T-Rex-Baby, Flugsaurier, Triceratops, Schildkröte, Schmetterlinge), ca. 1 Minute.
- **Wetter:** täglich zufällig Sonne, Wolken, Regen, im Winter Schnee, nach Regen manchmal ein Regenbogen.

Ausdrücklich **nicht** gewünscht: Garten, Sprachausgabe. Später möglich: Benachrichtigungen am Handy.
