# Stegi

Ein Tamagotchi für ein Kind von 5 Jahren: Ein kleiner Stegosaurus schlüpft aus einem Ei, wächst in
30 Tagen groß und will gefüttert, getränkt, gestreichelt, gebadet und bespielt werden. Er schläft
nach der echten Uhrzeit (Standard 20:00–7:00) und wandert zu 30 Orten, die nach und nach entdeckt werden. Er spielt Ball, Verstecken und Musik,
bekommt Geschenke zum Verkleiden, Besuch von Freunden, erlebt Wetter, und man kann Fotos von ihm machen. Man braucht nicht lesen zu können: alles läuft über
Bilder, Farben und Geräusche. **Der Stego stirbt nie** und wird nie krank. Vergisst man ihn, ist er
nur hungrig oder traurig.

**Stand: Version 0.3.** Eine einzige HTML-Seite ohne externe Bilder oder Töne
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

Erwartet: **148 Prüfungen, 0 Fehler** (suite-core 52, suite-ui 40, suite-places 19, suite-extras 37).

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
│   └── js/                Spielcode, siehe Abschnitt 5 (die 30 Orte in 07-places.js)
├── fonts/                 Lilita One und Nunito (OFL), für die APK eingebettet
├── android/               WebView-App, Paket com.stegi.game, Hochformat
│   └── app/src/main/res/mipmap-xhdpi|xxxhdpi/ic_launcher.png   App-Symbol: Ei im Nest (mit tests/make-icon.js erzeugt)
└── tests/
    ├── lib.js             gemeinsame Hilfen (Laden, Zeitreise, schnelles Schlüpfen)
    ├── run.sh             baut und führt alle Testreihen aus
    ├── suite-core.js      Regeln: Uhr, Ei, Wachstum, Bedürfnisse, Kacka, Pflege, Schlaf, Speichern, Spielzeit
    ├── suite-ui.js        Bedienung mit echter Maus, Einstellungen, Zurück-Taste, Beenden, Musik, Bildschirmfotos
    ├── suite-places.js    0.2: Babygröße, Wandern (auch bei geschlossener App), 2 Orte pro Tag, Orte-Liste, Glühwürmchen
    ├── suite-extras.js    0.3: Wetter, Geschenke/Verkleiden, Fotos/Album, Besuch, Verstecken, Musik, Spielmenü
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

**Unten:** Essen, Trinken, Baden, Spielen (Ball-Symbol, öffnet Ball / Verstecken / Musik), Zähneputzen, Wandern
(Fußspuren); ab 19:30 ersetzt der Mond „Licht aus“ das Wandern.

**Rechts unter dem Zahnrad:** Landkarte (Orte), Partyhut (Verkleiden), Bilderrahmen (Fotoalbum), Kamera (Foto machen).

| Tätigkeit | Wie |
|---|---|
| Streicheln | Finger über den Stego bewegen: Herzen, Schnurren, Rückenplatten wackeln |
| Antippen | er kichert und hüpft (nachts: murmelt und dreht sich um) |
| Essen | Futterleiste: Farn, Blatt, Beeren, Apfel, Melone. Antippen = fliegt zum Maul; oder zum Maul ziehen. Satt: schüttelt den Kopf |
| Trinken | Napf erscheint, er senkt den Kopf und schlabbert |
| Baden | Badewanne, mit dem Finger schrubben (Schaumblasen), dann Abbrausen und Glitzer |
| Zähne putzen | Zahnbürste folgt dem Finger, am Maul hin und her reiben |
| Ball | (Spielen → Ball) Ball wegschnipsen, er rennt hin, bringt ihn zurück und freut sich |
| Verstecken | (Spielen → Busch) er versteckt sich hinter einem von zwei Büschen oder dem Felsen; antippen, wo er ist; falsch = wackelt; nach ein paar Sekunden wackelt sein Versteck und er kichert als Hinweis |
| Musik | (Spielen → Note) 6 farbige Xylophon-Stäbe und 2 Trommeln; bei jedem Ton tanzt er |
| Geschenk | liegt neben ihm und hüpft; antippen = auspacken und anziehen |
| Verkleiden | Partyhut-Knopf: alle 12 Teile, antippen = an, nochmal = aus; noch nicht fällige als Geschenkpaket |
| Foto | Kamera-Knopf: Klick und Blitz; Album zeigt alle Fotos, antippen = groß mit Tag, Datum und Ort |
| Kacka | Häufchen mit Fliegen antippen: Pling, weg |
| Licht aus | ab 19:30: er legt sich schlafen |
| Wandern | er läuft los, die Landschaft zieht vorbei, oben ein Balken von den Fußspuren zur Landkarte; nach 1 Stunde wacher Zeit (auch bei geschlossener App) ist er an einem neuen Ort und wartet dort |
| Orte | Landkarte: 30 Kärtchen, unentdeckte mit „?“; ein entdecktes antippen = er ist sofort dort |

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
| `src/js/02-config.js` → `VERSION` | `const VERSION = '0.3';` |
| `src/page.html` → `#credit` (wird zusätzlich aus `VERSION` gesetzt) | `@made by Brownii (Claude.ai) · v0.3` |
| `android/app/build.gradle` → `versionCode` (+1) und `versionName` | `versionCode 3`, `versionName '0.3'` |

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
| `06-draw-stego.js` | `drawStego()`: der Stego in jeder Größe, Pose und Laune; gibt Maul-, Kopf- und Körperposition zurück; `drawWear()`: die 12 Kleidungsstücke |
| `07-places.js` | Die 30 Orte und „unterwegs“ (`PLACE_DRAW`), Bausteine (Hügel, Bäume, Palmen, Wasser, Felsen, Berge …), Vorschaubilder `placePicture` |
| `07-draw-scene.js` | Himmel je Ort und Wetter, Sonne/Mond, Sterne, Wolken, Regenbogen, Nest, Ei mit Rissen, Kacka, Futter, Napf, Wanne, Bürste, Ball, Gedankenblase, Partikel |
| `08-game.js` | Zustand `game` und `pet`, Ei-Logik, alle Tätigkeiten, `update(dt)`, `drawWorld()` |
| `09-ui.js` | HTML-Teile: Leisten, Knöpfe, Futterleiste, Menü, Einstellungen (Zahnrad 3 s), Rückfrage, Pause, `window.__back` |
| `10-input.js` | Finger: Tippen, Streicheln, Ziehen, Werfen |
| `13-travel.js` | Wandern, Ankunft, Tagesgrenze, Orte-Liste, Banner „neuer Ort“, Glühwürmchen |
| `14-weather.js` | Wetter des Tages `weatherAt`, Regen und Schnee zeichnen |
| `15-play.js` | Verstecken (`game.hide`, `pet.depth`) und Musik (`playKey`, Tanzen) |
| `16-visit.js` | Besuch planen und ablaufen lassen, die 5 Besucher zeichnen |
| `17-wardrobe.js` | Geschenke, Kleiderschrank, automatische Kleidung je Ort (`wearNow`) |
| `18-photos.js` | Kamera, Fotos speichern (eigener Speicherplatz), Album |
| `11-main.js` | `resize`, Bildschleife, Speichern alle 5 s und beim Verlassen, `start()` |
| `99-debug.js` | `window.__st` für die Tests (wird vom Spiel nicht benutzt), ruft `start()` auf |

**Wie Zeit vergeht:** Jedes Bild ruft `tick(now())`. `S.last` merkt, bis wann gerechnet wurde. Lange
Pausen (App zu) werden in Minutenschritten nachgerechnet, nur die **wachen** Minuten zählen.
So stimmen die Werte nach dem Öffnen am nächsten Morgen. Läuft die Uhr rückwärts, passiert nichts.

**Bildschirme und Tätigkeiten:** `game.screen` ist `menu` oder `game`; `game.trans` (0..1) ist der
Kamera-Zoom dazwischen. `game.mode` ist `idle | eat | drink | bath | brush | ball | hatch | party | play | hide | music`
(`play` = das kleine Spielmenü).
Nach jedem Wechsel `refreshUI()` (wird zusätzlich alle 0,5 s aufgerufen). Fällt die Nacht, endet
jede Tätigkeit (`endMode`).

**Größen:** Alles in Vielfachen von `U` (1 auf einem 360 px breiten Handy). Der Stego wird in
„Einheiten“ gezeichnet (ausgewachsen ca. 260 lang) und auf `stegoSize` (92 % der Breite) skaliert,
mal `lerp(SIZE_MIN, 1, Wachstum)`.

**Farbe:** schiefergrau mit leichtem Blaustich (`STEGO_COLORS`, Variante „A“ aus drei Vorschlägen, seit 0.2; vorher grün), orange Platten.

---

## 6. Spielwerte (Stand 0.3, Quelle: `src/js/02-config.js`)

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

Jeder Kalendertag zählt, auch ohne Besuch. Die Größe wächst täglich gleichmäßig von 38,5 % (Tag 1, seit 0.2;
vorher 55 %) bis 100 % (Tag 30). Die Rückenplatten wachsen von 13 auf 39 Einheiten (+50 % seit 0.2), die
Schwanzstacheln von 4 auf 25 (+25 %); Babys haben einen größeren Kopf und kürzere Beine. Jede neue Stufe wird beim
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

### 6.6 Wandern und Orte (seit 0.2)

- Knopf „Wandern“: Nach **1 Stunde wacher Zeit** (`WALK_SECONDS`) ist er an einem zufälligen, noch nicht
  entdeckten Ort. Die Zeit läuft auch bei geschlossener App weiter (`tick`), nachts ruht sie.
- **Höchstens 2 neue Orte pro Kalendertag** (`WALK_PER_DAY`), danach schüttelt er beim Knopf den Kopf.
  Sind alle 30 entdeckt, wandert er ohne Grenze zu einem zufälligen bekannten Ort.
- Kacka bleibt beim Losgehen am alten Ort; unterwegs fällt keine neue an.
- Ankunft an einem **neuen** Ort: beim nächsten Hinsehen Fanfare, Konfetti und ein Bild mit dem Namen (4 s).
- Orte-Liste (Landkarte): entdeckte Orte antippen = sofort dort (eine laufende Wanderung endet).
- Die 30 Orte: Wiese (Start), Dschungel, Savanne, Vulkan, Kleine Insel, Am Fluss, Auf einer Wolke, Strand,
  Wasserfall, Wüste, Schneeberg, Kristallhöhle, Pilzwald, Sonnenblumenfeld, Bambuswald, Seerosenteich, Sumpf,
  Herbstwald, Kirschblütenhain, Felsenschlucht, Lagune, Regenbogenland, Dino-Tal, Bergsee, Heiße Quellen,
  Eisland (Polarlicht), Sternenhügel, Riesenbaum, Beerenhügel, Schatzinsel. Das Ei liegt immer auf der Wiese.

### 6.7 Glühwürmchen (seit 0.2)

Von einer Stunde vor der Schlafenszeit (Standard 19:00) bis zum Aufstehen. An Wald- und Wasserorten
(`ff` in `PLACES`) jede Nacht, sonst jede zweite (gerade Tagesnummer). Nicht in der Höhle, nicht bei Regen oder Schnee.

### 6.8 Wetter (seit 0.3)

Ein Wetter pro Kalendertag, aus der Tagesnummer berechnet (bleibt also auch nach Neustart gleich):
45 % Sonne, 25 % Wolken, 30 % Regen; Dezember bis Februar Schnee statt Regen; an Regentagen ab 15:00
ein Regenbogen statt Regen. Trockene Orte (Savanne, Vulkan, Wolke, Wüste, Schlucht) bleiben sonnig, an
kalten Orten (Schneeberg, Eisland) schneit es statt zu regnen, in der Höhle gibt es kein Wetter. Bei
Wolken und Regen wird der Himmel grauer, die Sonne verschwindet.

### 6.9 Geschenke und Verkleiden (seit 0.3)

| Tag | Teil | Platz | | Tag | Teil | Platz |
|---|---|---|---|---|---|---|
| 1 | Schleife | Kopf | | 16 | Zipfelmütze | Kopf |
| 3 | Sonnenbrille | Augen | | 18 | Krone | Kopf |
| 6 | Partyhut | Kopf | | 21 | Fliege | Hals |
| 8 | Schal | Hals | | 23 | Blumenkranz | Kopf |
| 11 | Sonnenhut | Kopf | | 26 | Piratenhut | Kopf |
| 13 | Brille | Augen | | 28 | Zauberhut | Kopf |

Pro Platz ein Teil. Am Strand und in der Wüste trägt er automatisch eine Sonnenbrille, im Schnee und
im Eisland einen Schal, aber nur wenn der Platz frei ist (eigene Sachen haben Vorrang).

### 6.10 Fotos (seit 0.3)

Höchstens 40 Fotos (240 px breite JPEGs, eigener Speicher `stegi-photos-v1`). Automatische Fotos beim
Schlüpfen und bei jeder neuen Stufe bleiben immer; ist das Album voll, fällt das älteste eigene Foto weg.
„Alles zurücksetzen“ löscht auch die Fotos.

### 6.11 Besuch (seit 0.3)

Höchstens einmal am Tag, zu einer zufälligen Minute zwischen 9:00 und einer Stunde vor der Schlafenszeit.
Ist die App dann zu, kommt der Freund beim nächsten Hineinschauen (am selben Tag, solange er wach ist
und nicht wandert). Die Besucher wechseln sich nach Tagesnummer ab: T-Rex-Baby, Flugsaurier,
Triceratops, Schildkröte, Schmetterlinge. Ein Besuch dauert 1 Minute (alle 3 s hüpfen beide, Herzen),
danach Liebe +10 und Spaß +10.

### 6.12 Verstecken und Musik (seit 0.3)

Verstecken: gefunden = Spaß +15; Hinweis nach 5 s, dann alle 4 s. Musik: jeder Ton Spaß +1,5; die
Hintergrundmusik pausiert dabei.

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
`loadClean` schaltet außerdem den Besuch aus (`__st.debugFlags.visit = false`), weil er zu einer
zufälligen Uhrzeit kommt und sonst Werte und Hüpfer in anderen Prüfungen verändert; nur suite-extras
ruft `hatchQuick(page, { visits: true })` auf und prüft den Besuch gezielt.

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
| 0.3 | Spielen-Menü mit Verstecken und Musik (er tanzt), 12 Kleidungsstücke als Geschenke, Fotos und Album, Besuch von 5 Freunden, Wetter (Sonne, Wolken, Regen, Schnee, Regenbogen) |
| 0.2 | Farbe schiefergrau, Baby 30 % kleiner, Platten +50 %, Schwanzstacheln +25 %, App-Symbol Ei, Wandern zu 30 Orten mit Orte-Liste, Glühwürmchen |
| 0.1 | Runde 1: Hauptmenü mit Stego/Ei, Ei mit 3 Rissen und Schlüpfen, 5 Wachstumsstufen in 30 Tagen, 5 Bedürfnisse, Essen, Trinken, Streicheln, Baden, Zähneputzen, Ball, Kacka, Schlafen 20–7 Uhr mit Tag/Nacht-Himmel, Geräusche und Spieluhr, Eltern-Einstellungen mit Spielzeit-Grenze und „Alles zurücksetzen“ |

---

## 11. Offene Punkte

Alles bisher Vereinbarte ist gebaut (0.1–0.3). Ausdrücklich **nicht** gewünscht: Garten, Sprachausgabe.

Mögliche nächste Schritte (noch nicht besprochen):
- Benachrichtigungen am Handy („Stegi hat Hunger“, „Stegi ist angekommen“) – braucht Android-Code.
- Fotos löschen oder aufs Handy speichern (heute nur ansehen).
- Signierter Release-Build für den Play Store.
