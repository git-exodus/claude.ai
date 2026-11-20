# Stegi

Ein Tamagotchi für ein Kind von 5 Jahren: Ein kleiner Stegosaurus schlüpft aus einem Ei, wächst in
30 Tagen groß und will gefüttert, getränkt, gestreichelt, gebadet und bespielt werden. Er schläft
nach der echten Uhrzeit (Standard 20:00–7:00) und wandert zu 30 Orten, die nach und nach entdeckt werden. Er spielt Ball, Verstecken und Musik,
bekommt Geschenke zum Verkleiden, Besuch von Freunden, erlebt Wetter, und man kann Fotos von ihm machen. Man braucht nicht lesen zu können: alles läuft über
Bilder, Farben und Geräusche. **Der Stego stirbt nie** und wird nie krank. Vergisst man ihn, ist er
nur hungrig oder traurig.

**Stand: Version 0.12.6.** Eine einzige HTML-Seite ohne externe Bilder oder Töne
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

Erwartet: **360 Prüfungen, 0 Fehler** (suite-core 52, suite-ui 40, suite-places 19, suite-extras 39, suite-dev 26, suite-photos 19, suite-apk 17, suite-design 12, suite-holidays 22, suite-training 26, suite-celebrate 17, suite-fun 26, suite-home 20, suite-family 25).

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
    ├── suite-photos.js    0.5: Fototagebuch (2 pro Tag), Meilensteine, Löschen, Testalbum, Gerät ohne Speicher
    ├── suite-apk.js       0.5.1: wie in der APK (mit Beenden-Knopf): kein Knopf verdeckt, nur Beenden im Menü schließt
    ├── suite-design.js    0.6: Horizont, Kleinigkeiten (schnuppern, staunen, freuen, hüpfen), Stauchen/Strecken, Vordergrund aller Orte
    ├── suite-holidays.js  0.7: Ostern-Datum, Baum/Geschenke/Feuerwerk/Eier nach Datum, 1 Geschenk pro Tag, Ball ohne Flackern
    ├── suite-training.js  0.8: Malprüfung, Trick-Auswahl mit „?“, Malen mit der Maus, Bauchplatscher, Lernen, Tricks von selbst
    ├── suite-celebrate.js 0.9: 7 Tricks nacheinander, Geburtstag (Daten, Kuchen, Kerzen, Hut), Gute-Nacht-Ritual
    ├── suite-fun.js       0.10: Jahreszeiten, Pfützen, Schneemann, Laubhaufen, Seifenblasen, Drachen, Sandburg, Melodie, Wünsche
    ├── suite-home.js      0.11: Sterne, Sticker-Heft, Zuhause, Laden, Möbel umstellen, Freundschaft, Speichern
    ├── suite-family.js    0.12: Geschwister-Ei ab Tag 32, Streicheln, Schlüpfen, Geschwisterchen folgt/hüpft/kichert/schläft/wächst, Testmodus
    ├── suite-dev.js       0.4: Testmodus (eigener Spielstand, Stufen, Zeitraffer, Sprünge, Helfer, echter Stand bleibt unberührt)
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
| Training | (Spielen → Stern) Trick wählen (gesperrte mit „?“), Symbol auf der Tafel oben nachmalen: Kreis = Rolle, Zickzack = Hinterbeine, Welle = Vorderbeine; nicht geschafft = Bauchplatscher; ◀ = anderen Trick wählen |
| Musik | (Spielen → Note) 6 farbige Xylophon-Stäbe und 2 Trommeln; bei jedem Ton tanzt er |
| Geschenk | liegt neben ihm und hüpft; antippen = auspacken und anziehen |
| Verkleiden | Partyhut-Knopf: alle 12 Teile, antippen = an, nochmal = aus; noch nicht fällige als Geschenkpaket |
| Foto | Kamera-Knopf: Klick, Blitz, ein kleines Bild fliegt zum Album; höchstens 2 eigene Fotos pro Tag, dann ist die Kamera grau („2/2“) |
| Album | zwei Reiter: **Fototagebuch** (eigene Fotos) und **Meilensteine** (automatisch); unter jedem Bild der Tag; antippen = groß mit Tag, Datum und Ort; eigene Fotos löschen: Knopf 3 Sekunden halten |
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
| `src/js/02-config.js` → `VERSION` | `const VERSION = '0.12.6';` |
| `src/page.html` → `#credit` (wird zusätzlich aus `VERSION` gesetzt) | `@made by Brownii (Claude.ai) · v0.12.6` |
| `android/app/build.gradle` → `versionCode` (+1) und `versionName` | `versionCode 22`, `versionName '0.12.6'` |

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
| `07-scenery.js` | 0.6: Sonnenstrahlen und Vögel (`drawSkyLife`), Vordergrund je Ort (`FOREGROUND`, `drawForeground`), Schmetterlinge und springende Fische (`drawGroundLife`) |
| `07-draw-scene.js` | Himmel je Ort und Wetter, Sonne/Mond, Sterne, Wolken, Regenbogen, Nest, Ei mit Rissen, Kacka, Futter, Napf, Wanne, Bürste, Ball, Gedankenblase, Partikel |
| `08-game.js` | Zustand `game` und `pet`, Ei-Logik, alle Tätigkeiten, `update(dt)`, `drawWorld()` |
| `09-ui.js` | HTML-Teile: Leisten, Knöpfe, Futterleiste, Menü, Einstellungen (Zahnrad 3 s), Rückfrage, Pause, `window.__back` |
| `10-input.js` | Finger: Tippen, Streicheln, Ziehen, Werfen |
| `13-travel.js` | Wandern, Ankunft, Tagesgrenze, Orte-Liste, Banner „neuer Ort“, Glühwürmchen |
| `14-weather.js` | Wetter des Tages `weatherAt`, Regen und Schnee zeichnen |
| `15-play.js` | Verstecken (`game.hide`, `pet.depth`) und Musik (`playKey`, Tanzen) |
| `16-visit.js` | Besuch planen und ablaufen lassen, die 5 Besucher zeichnen |
| `17-wardrobe.js` | Geschenke, Kleiderschrank, automatische Kleidung je Ort (`wearNow`) |
| `18-photos.js` | Kamera (2 pro Tag), Meilenstein-Fotos, Speichern (Fehler behalten das Foto), Album mit zwei Reitern, Löschen durch Halten |
| `20-holidays.js` | 0.7: Feiertage nach Handy-Datum: Weihnachtsbaum, Weihnachtsgeschenke, Silvester-Feuerwerk, Ostereier, Osterformel |
| `22-training.js` | 0.8: Training: Trick-Auswahl, Tafel mit Symbol, Malprüfung `judgeTrace`, Trick- und Bauchplatscher-Animation |
| `23-celebrate.js` | 0.9: monatlicher Geburtstag (Kuchen, Kerzen, Luftballons) und Gute-Nacht-Ritual (Schlaflied, Kuscheltier, dunkler) |
| `24-fun.js` | 0.10: Jahreszeiten, Wetter-Spiele, Spielzeug (Seifenblasen, Drachen, Sandburg), Melodie nachspielen, Wünsche |
| `25-home.js` | 0.11: Sterne (`earn`), Zuhause mit Möbeln, Laden, Sticker-Heft, Freundschaft und Freundes-Geschenke |
| `26-family.js` | 0.12: Familie: Geschwister-Ei im Nest, Schlüpfen, kleines Geschwisterchen ohne eigene Bedürfnisse |
| `19-dev.js` | Testmodus für Eltern: Wechsel auf den Test-Spielstand, Zeitraffer, Stufen, Helfer, Test-Fenster |
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

**Aussehen seit 0.6:** Licht von oben (Rücken heller, Bauch dunkler, Glanz auf Rücken und Kopf), Platten mit Verlauf,
größere Augen mit zwei Glanzpunkten, Augenbrauen (`brow`), rote Bäckchen (`blush`), weicher runder Schatten,
Stauchen/Strecken beim Hüpfen (`squash`), rundlicheres Baby. Der Horizont liegt bei 42 % der Höhe (vorher 52 %),
vor seinen Füßen wiegt sich ein Vordergrund passend zum Ort.

**Farbe:** schiefergrau mit leichtem Blaustich (`STEGO_COLORS`, Variante „A“ aus drei Vorschlägen, seit 0.2; vorher grün), orange Platten.

---

## 6. Spielwerte (Stand 0.4, Quelle: `src/js/02-config.js`)

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
vorher 55 %; seit 0.6 `SIZE_MIN` 0,42 wegen des rundlicheren Körpers) bis 100 % (Tag 30). Die Rückenplatten wachsen von 13 auf 39 Einheiten (+50 % seit 0.2), die
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
- Kacka bleibt beim Losgehen am alten Ort; unterwegs fällt keine neue an. Ein fälliges Geschenk wird unterwegs
  nicht gezeigt (es stünde sonst still auf dem fahrenden Boden) und liegt nach dem Ankommen wieder neben ihm.
- Unterwegs scrollen alle Ebenen mit (`walkFx.scroll`): Hügel 0,15/0,35, Bäume 0,7, Weg 1,0, Vordergrund an
  den Füßen 1,0, Gras und Blumen ganz vorne 1,3. Neue Dinge im Bild beim Wandern immer mitscrollen lassen.
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

**Höchstens ein Geschenk pro Kalendertag** (seit 0.7, `S.giftDay`): Sind mehrere fällig (Tage nicht reingeschaut,
Zeitraffer), kommt jeden Tag eins, bis alle da sind.

Pro Platz ein Teil. Am Strand und in der Wüste trägt er automatisch eine Sonnenbrille, im Schnee und
im Eisland einen Schal, aber nur wenn der Platz frei ist (eigene Sachen haben Vorrang).

### 6.10 Fotos (seit 0.3, Fototagebuch seit 0.5)

- **Fototagebuch:** eigene Fotos (Kamera), höchstens **2 pro Kalendertag** (`PHOTO_PER_DAY`), insgesamt
  höchstens 100 (`PHOTO_OWN_MAX`, dann geht das älteste). Löschen nur in der großen Ansicht, Knopf 3 s halten.
- **Meilensteine:** automatisch 1,6–1,8 s nach dem Schlüpfen, jeder neuen Wachstumsstufe und jedem neu
  entdeckten Ort (höchstens 1 + 4 + 29 = 34); werden nie gelöscht.
- Unter jedem Bild „Tag n“ (Tag seines Lebens), bei Meilensteinen dazu „Geschlüpft“, der Stufen- oder Ortsname.
- 240 px breite JPEGs (Qualität 0,72) in `stegi-photos-v1` (Test: `stegi-test-photos-v1`). Fotos aus 0.3/0.4
  ohne `kind` werden beim Laden einsortiert (automatisch → Meilenstein, sonst Tagebuch).
- **Speichert das Gerät nicht** (manche HTML-Viewer auf dem Handy): Fotos bleiben bis zum Schließen im Album
  (bis 0.4 wurden sie dann sofort verworfen – Fehler), und die Einstellungen zeigen einen roten Hinweis.
  Dort merkt sich auch das Spiel selbst nichts; zum Spielen die APK oder den Link nehmen.
- „Alles zurücksetzen“ löscht auch die Fotos. Im Testmodus heißt das Album „Test-Fotos“.

### 6.11 Besuch (seit 0.3)

Höchstens einmal am Tag, zu einer zufälligen Minute zwischen 9:00 und einer Stunde vor der Schlafenszeit.
Ist die App dann zu, kommt der Freund beim nächsten Hineinschauen (am selben Tag, solange er wach ist
und nicht wandert). Die Besucher wechseln sich nach Tagesnummer ab: T-Rex-Baby, Flugsaurier,
Triceratops, Schildkröte, Schmetterlinge. Ein Besuch dauert 1 Minute (alle 3 s hüpfen beide, Herzen),
danach Liebe +10 und Spaß +10. Seit 0.8.1 steht der Besucher **vor** ihm (vorderste Ebene), ein großer
Stego rückt währenddessen um bis zu 12 % der Bildbreite zur anderen Seite (`growth` × 12 %), und wandert er los,
läuft der Besucher vorne auf Höhe seiner Hinterbeine mit (`visit.along`; bei einem kleinen Stego bis zu 70 U weiter
hinten, damit er ihn nicht verdeckt). Beim Wandern schaut er immer nach rechts
(Laufrichtung), auch wenn er vorher einen Besuch links angeschaut hat (seit 0.8.2).

### 6.12 Verstecken und Musik (seit 0.3)

Verstecken: gefunden = Spaß +15; Hinweis nach 5 s, dann alle 4 s. Musik: jeder Ton Spaß +1,5; die
Hintergrundmusik pausiert dabei.

### 6.13 Testmodus (seit 0.4)

In den Eltern-Einstellungen: „Testmodus an“ wechselt auf einen **eigenen Test-Spielstand**
(`stegi-test-v1`, Fotos `stegi-test-photos-v1`, eigene Testuhr `stegi-test-clock`). Der echte Stegi,
seine Fotos und seine Uhr werden dabei nie verändert. Oben steht ein rotes Schild „TEST“ (mit Tempo).
Der Testmodus wird nicht gemerkt: Jeder Neustart der App beginnt mit dem echten Spielstand; der
Test-Stegi und die Testuhr bleiben aber für das nächste Mal erhalten.

Im Fenster „Test-Werkzeuge“ (Knopf in den Einstellungen, öffnet sich beim Einschalten):
- **Stufe:** Ei, Ei mit 1/2/3 Rissen (heute darf weiter gestreichelt werden), Schlüpftag, Baby, Kind,
  Jugendlicher, Fast groß, Ganz groß; Schieberegler Tag 1–30. Übersprungene Stufen werden nicht gefeiert.
- **Zeit:** Tempo 1×, 10×, 60×, 600× (600× = 10 Minuten pro Sekunde); Sprünge +1 Stunde, +1 Tag und
  zur nächsten 7:00 / 12:00 / 19:45 / 22:00 (immer vorwärts). Alles läuft mit: Bedürfnisse, Tag/Nacht,
  Wanderung, Ei-Tage, Geschenke, Besuch.
- **Helfer:** alles voll (100), fast leer (15), sofort ankommen (neuer Ort, ohne 2-pro-Tag-Grenze),
  alle Orte, alle Geschenke (in den Kleiderschrank), Besuch jetzt (bei jedem Druck der nächste Freund).
- **Wetter:** Normal, Sonne, Wolken, Regen, Schnee, Regenbogen (trockene Orte bleiben trotzdem sonnig).
- **Test-Spielstand zurücksetzen** (mit Rückfrage): Test-Ei, Testfotos und Testuhr neu.

Hinweis: Ist der Testmodus an, wirkt auch „Alles zurücksetzen“ in den Einstellungen nur auf den Test-Stegi.

### 6.14 Kleinigkeiten, die er von selbst macht (seit 0.6)

Passiert 7–14 Sekunden nichts (er läuft nicht, wandert nicht, hat keinen Besuch, ist nicht traurig oder müde),
macht er zufällig eins: **schnuppern** (Kopf zur Blume, 2,6 s), **staunen** (Blick nach oben, Augenbraue hoch,
2,2 s), **freuen** (Lachaugen, Bäckchen, Platten wackeln, 1,6 s) oder **hüpfen**. Antippen oder Streicheln
unterbricht es. Beim Streicheln und Kichern zeigt er jetzt auch Bäckchen und Augenbrauen.

Größe: Damit das rundlichere Baby so lang bleibt wie vereinbart (38,5 % der Endgröße), ist `SIZE_MIN` jetzt 0,42.

### 6.15 Feiertage (seit 0.7)

Erkannt an der Uhr des Handys (kein Internet). Ostersonntag rechnet `easterSunday` (Gauß/Meeus) aus.

| Wann | Was |
|---|---|
| 18.12. – 6.1. | Geschmückter Tannenbaum links neben ihm (Kugeln leuchten nachts, Stern), überall außer Höhle, Wolke und unterwegs |
| ab 24.12. (bis 6.1.) | 3 Geschenke unter dem Baum: Weihnachtsmütze und Rentier-Geweih (sofort auf, danach im Kleiderschrank), Zuckerstange (Essen +30). Jedes Jahr neu, die Sachen bleiben |
| 31.12. ganztags, 1.1. bis 12:00 | Feuerwerk am Himmel (alle 0,6 s eine Rakete, tagsüber etwas zarter); leises Knallen nur im Spiel und wenn er wach ist; er blinzelt beim Knall und staunt manchmal nach oben |
| Karfreitag – Ostermontag | 5 bunte Eier im Bild versteckt (zum Teil im Gras); alle gefunden = Schokohase, antippen = er frisst ihn (Essen +30). Jedes Jahr neu |

Test-Werkzeuge: Knöpfe „18.12.“, „24.12.“, „31.12.“, „Ostern“ springen mit der Testuhr dorthin (10:00 Uhr).

### 6.16 Training (seit 0.8)

- Spielen-Menü → Stern: Auswahl der 7 Tricks, die nacheinander frei werden (der nächste, sobald der vorige gelernt
  ist; gesperrte zeigen „?“): **Rolle** (Kreis), **Hinterbeine** (Zickzack), **Vorderbeine** (Welle), seit 0.9
  **Sitz** (Dreieck), **Drehen** (Spirale), **Schwanzstand** (seit 0.12.6 statt Küsschen: Pfeil nach oben; er richtet sich senkrecht
  auf die Schwanzspitze auf und hüpft einmal darauf), **Pirouette** (Stern, hoher Sprung).
- **Müdigkeit** (seit 0.12.6, ohne Anzeige): nach **2 neuen Sternen** (erfolgreiche Versuche bei noch nicht gelernten
  Tricks) ist er **1 Stunde** schlapp. Dann gähnt er nur: kein Training, keine ungelernten Tricks, Nachmalen
  gibt keinen Stern. Fehlversuche und schon gelernte Tricks zählen nicht. Pfeil-Prüfung etwas großzügiger
  (Reihenfolge 70 %, Abstand 13 U), ein Strich nach oben ohne Spitze reicht auch.
- Oben erscheint eine Tafel mit dem Symbol als gepunktete Linie (grüner Startpunkt, eine Hand fährt es alle 2,5 s vor).
  Rolle = Kreis, Hinterbeine = senkrechter Zickzack, Vorderbeine = waagerechte Welle (1,5 Wellen).
- **Prüfung** (`judgeTrace`, großzügig, aber kein Gekritzel): mindestens 72 % der Linie berührt (Abstand 28 U),
  80 % der Fingerlinie nah an der Linie, 80 % der Schritte in eine Richtung entlang der Linie, Länge 0,6–2,2-mal
  die Linie, seit 0.9 außerdem durchschnittlicher Abstand in beide Richtungen ≤ 11 U und 90 % der Fingerlinie ≤ 20 U
  (Kinderhand-Wackeln liegt unter 10, ein anderes der 7 Symbole bei 12 oder mehr – für jedes Paar gemessen).
  Startpunkt und Richtung egal. Geprüfte Fälle stehen in suite-training.js.
- Geschafft: Trick, Applaus, Sterne, Spaß +8. Nicht geschafft: Ansatz, dann Bauchplatscher mit Staub, Spaß +3.
- **3-mal geschafft = gelernt** (Fanfare). Gelernte Tricks macht er bei etwa jeder 5. Kleinigkeit von selbst
  (nur gelungene Tricks, kein Bauchplatscher). Nicht nachts, nicht unterwegs.

### 6.17 Geburtstag und Gute-Nacht-Ritual (seit 0.9)

- **Geburtstag** jeden Monat am Schlüpf-Datum (hat der Monat den Tag nicht, am letzten Tag), ab dem ersten Monat:
  Geburtstagslied (einmal), Partyhut (wenn der Kopf frei ist), drei Luftballons, Kuchen vorne links mit einer Kerze
  je Monat (ab dem ersten Jahr: je Jahr). Kuchen antippen = eine Kerze aus; alle aus = Fanfare, er frisst den
  Kuchen (Essen +30, Liebe +10). Test-Werkzeuge: Knopf „Geburtstag“.
- **Gute Nacht:** Schläft er ein, während man zuschaut (Licht aus oder Schlafenszeit), spielt einmal pro Nacht ein
  Schlaflied von der Spieluhr, ein rosa Kuschel-Dino liegt neben seinem Kopf, und das Bild wird in 5 s etwas dunkler.

### 6.18 Mehr zu tun (seit 0.10)

- **Jahreszeiten** (Orte mit Gras und unterwegs): Frühling (März–Mai) fallen Blüten, Herbst (Sept.–Nov.) goldener
  Boden und fallende Blätter, Winter (Dez.–Feb.) Raureif mit Glitzern; Sommer wie bisher.
- **Wetter-Spiele** (nicht nachts, nicht unterwegs): Regen = 3 Pfützen, antippen = er rennt hin und springt rein
  (Spaß +5, Sauberkeit −8). Schnee = Schneehaufen, 3-mal antippen = Schneemann mit Hut und Möhre (Spaß +10, bleibt
  bis Mitternacht). Herbst auf Gras = 2 Laubhaufen zum Reinspringen (Spaß +5, wachsen nach 10 s nach).
  Kacka antippen hat Vorrang, falls sie daneben liegt.
- **Spielzeug** im Spielmenü (jetzt zwei Reihen): **Seifenblasen** (antippen = plopp, er schnappt, Spaß +2),
  **Drachen** (mit dem Finger am Himmel führen, Spaß +1 alle 2 s; nicht bei Regen/Schnee, nicht in der Höhle),
  **Sandburg** (nur Strand, Insel, Lagune, Schatzinsel, Wüste: 4-mal antippen = fertig, Spaß +10; Stego antippen
  = er springt drauf, Spaß +3, neu bauen).
- **Melodie nachspielen** (Knopf über der großen Trommel, seit 0.12.3): er spielt 3 Töne vor (seit 0.12.3, vorher 2), man spielt sie nach; richtig = Applaus,
  Spaß +5, nächste Melodie einen Ton länger (bis 6); falsch = „mm-mm“ und er spielt sie nochmal vor.
- **Wünsche** (alle 10–20 Spielminuten, wenn Essen unter 80): Gedankenblase mit z. B. 3 Beeren (gegessene werden
  blass) oder einem Farbklecks (Rot = Apfel/Melone, Lila = Beeren, Grün = Farn/Blatt). Erfüllt = Tanz, Sterne,
  Liebe +10, Spaß +5. Verschwindet nach 8 Minuten.

### 6.19 Sterne, Zuhause, Laden, Sticker, Freundschaft (seit 0.11)

- **Sterne** (Anzeige ★ oben in der Knopfspalte): Füttern, Trinken, Kacka weg, Ball, Pfütze je 1; Baden, Zähneputzen,
  Verstecken, Trick, Melodie, Schneemann, Sandburg, Besuch je 2; Wunsch 3; neuer Ort und Geburtstag je 5;
  jeder neue Sticker 3. Zählt in `S.stats` mit, wie oft er was gemacht hat.
- **Zuhause** steht in der Orte-Liste immer ganz oben (offen, zählt nicht zu den 30 Orten, Wandern führt nie dorthin):
  Höhle mit Holzboden und rundem Himmelsloch, drinnen kein Wetter.
- **Laden** (Knopf nur zu Hause): 12 Möbel – Blätterbett 5, Holzbett 15, runder Teppich 8, Streifenteppich 12,
  Glühwürmchenglas 10, Pilzlampe 14, Sonnenbild 6, Eierbild 6, Farn 5, Blumentopf 7, Spielzeugkiste 10, Regal 12.
  Zu teure sind blass (Tippen = „mm-mm“). Gekauftes steht sofort am festen Platz; Möbel antippen wechselt zwischen
  gekauften Sachen für denselben Platz. Lampen leuchten nachts.
  Ebenen (seit 0.12.4) wie in einem echten Zimmer: Wandsachen, Teppich, Bett und Lampe stehen hinter ihm,
  Spielzeugkiste und Blumentopf weiter vorn und damit vor ihm (verdecken höchstens seine Beine).
- **Sticker-Heft** (Knopf ★-Heft): 24 Sticker für Meilensteine (Schlüpfen, Füttern, Tricks, Orte, Feste, Besuche …),
  noch nicht verdiente sind grau. Geprüft alle 2 s.
- **Freundschaft:** Jeder Besuch gibt diesem Freund ein Herz (bis 5). Beim 5. Herz bringt er ein Geschenk fürs Zuhause
  (T-Rex-Kuscheltier, Feder-Mobile, Blumenkranz, Muschellampe, Schmetterlingsbild), nur einmal.
- Testmodus: „+50 Sterne“ und „Beste Freunde“ (alle 5 Herzen und Geschenke).

### 6.20 Familie (seit 0.12)

- **Geschwister-Ei:** am Lebenstag 32 (2 Tage nachdem er „Ganz groß“ ist) liegt ein kleineres Ei in einem Nest vor
  seinen Füßen (etwas links der Mitte). Beim ersten Sehen glitzert es und piepst. Unterwegs ist es nicht zu sehen.
- **Streicheln wie beim eigenen Ei:** 2 Minuten am Tag = ein Riss (höchstens einer pro Tag), nach 3 Rissen am
  nächsten Tag 15 Sekunden = es schlüpft (Fest, Konfetti, Meilenstein-Foto „Geschwisterchen“). 5 kleine Herzen
  zeigen den Fortschritt, nachts schläft das Ei. Übers Ei streicheln streichelt nicht den Großen.
- **Geschwisterchen:** minzgrün mit hellblauen Platten, **keine eigenen Bedürfnisse**. Steht vor seinem Schwanz
  und schaut ihn an, läuft ihm hinterher, wandert mit, hüpft kurz nach ihm mit, hüpft ab und zu von selbst
  (alle 7–14 s), schaut beim Ballspiel dem Ball nach, tanzt bei Musik und Festen, schläft nachts neben ihm.
  Antippen = kichern, hüpfen, Herz, der Große freut sich.
- **Wachsen:** wie er (Stufen nach Tagen, ganz groß an Tag 30), aber höchstens **75 %** seiner Größe.
- Beim Antippen haben Pfützen, Kuchen und Feiertags-Sachen Vorrang vor dem Ei, das Ei vor den Möbeln.
- Testmodus: „Geschwister-Ei“, „Ei Schlüpftag“, „Geschwister da“, „Geschwister +5 Tage“.

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

- **Hauptmenü im Spiel:** Es muss unsichtbar *und* untastbar sein (`#menu.gone`, `pointer-events: none`). Bis 0.5
  war es nur durchsichtig, und der Beenden-Knopf (gibt es nur in der APK) schloss die App. Im Browser fiel
  das nicht auf; `suite-apk.js` testet deshalb mit nachgebautem `window.Android`.
- **Nur im Emulator getestet** (Chromium, 360×740). Auf einem echten Handy noch nicht ausprobiert.
  Wie die Geräusche und die Musik klingen, ist ungeprüft.
- Keine Benachrichtigungen, wenn die App zu ist (bewusst nicht in Runde 1).
- Nachts kann man nicht füttern oder spielen; das ist so gewollt.
- Ändert man am Handy die Uhrzeit von Hand zurück und wieder vor, kann der Stego eine Weile „ohne Pflege“ erleben.

---

## 10. Versionsgeschichte

| Version | Inhalt |
|---|---|
| 0.12.6 | Schwanzstand (Pfeil) statt Küsschen, Fortschritt bleibt erhalten; Training-Müdigkeit: nach 2 neuen Sternen 1 Stunde Pause (unsichtbar, er gähnt) |
| 0.12.5 | Weicher Hals (Vorschlag 1): Hals mit Licht und Schatten wie der Körper, keine Ecke mehr im Bauch; Halslinien nur außerhalb des Körpers (auch beim Trinken); gilt auch fürs Geschwisterchen |
| 0.12.4 | Zuhause: Spielzeugkiste und Blumentopf stehen vor dem Dino, alles andere dahinter |
| 0.12.3 | Melodie-Knopf über der großen Trommel, große Trommel 50 % lauter, Melodie nachspielen beginnt mit 3 Tönen |
| 0.12.2 | Nest geschlossen: kein grüner Spalt mehr zwischen hinterer und vorderer Nesthälfte (beide Nester) |
| 0.12.1 | Risse im Ei (eigenes und Geschwister-Ei) etwas tiefer und weiter innen, ragen nicht mehr über den Rand |
| 0.12 | Familie: Geschwister-Ei zwei Tage nach „Ganz groß“, streicheln wie das eigene Ei, kleines Geschwisterchen ohne eigene Bedürfnisse (folgt, wandert mit, hüpft, kichert, schläft, wächst bis 75 %) |
| 0.11 | Sterne, Zuhause (Höhle) in der Orte-Liste, Laden mit 12 Möbeln, Sticker-Heft mit 24 Stickern, Freundschaft mit Herzen und Geschenken fürs Zuhause |
| 0.10 | Jahreszeiten, Wetter-Spiele (Pfützen, Schneemann, Laubhaufen), Seifenblasen, Drachen, Sandburg, Melodie nachspielen, Wünsche (Zählen und Farben) |
| 0.9 | 4 neue Tricks (Sitz, Drehen, Küsschen, Pirouette), genauere Malprüfung für 7 Symbole, monatlicher Geburtstag mit Kuchen und Kerzen, Gute-Nacht-Ritual |
| 0.8.2 | Fehler behoben: Stand der Besuch links, lief er beim Losgehen rückwärts (schaute weiter den Besuch an); jetzt dreht er sich beim Wandern immer nach rechts, in allen Stufen geprüft |
| 0.8.1 | Besuch steht vor dem Stego, ein großer Stego rückt dafür etwas zur Seite; beim Wandern läuft der Besuch an den Hinterbeinen mit |
| 0.8 | Training: Tricks durch Nachmalen (Rolle/Kreis, Hinterbeine/Zickzack, Vorderbeine/Welle), freischalten nacheinander, Bauchplatscher bei Fehlversuch, gelernte Tricks von selbst |
| 0.7 | Höchstens 1 Geschenk pro Tag; Ballspielen ohne Flackern (dreht sich höchstens alle 0,4 s um, Ballseite einmal pro Wurf); Feiertage: Weihnachtsbaum ab 18.12., Geschenke am 24.12. (Mütze, Geweih, Zuckerstange), Silvester-Feuerwerk, Ostereiersuche mit Schokohase |
| 0.6.1 | Unterwegs wandern Gras und Blumen im Vordergrund mit dem Weg aus dem Bild (standen still); das Geschenk wartet unterwegs unsichtbar und liegt nach dem Ankommen wieder da |
| 0.6 | Neues Aussehen: Stego mit Licht und Schatten, größere Augen, Augenbrauen, Bäckchen, rundlicheres Baby, Stauchen/Strecken; Kleinigkeiten von selbst (schnuppern, staunen, freuen, hüpfen); höherer Horizont; Sonnenstrahlen, Vögel; Vordergrund für alle 30 Orte; Schmetterlinge und springende Fische |
| 0.5.1 | Fehler behoben: In der APK lag der unsichtbare Beenden-Knopf über Trinken, Baden, Spielen und Zähneputzen und schloss die App; neuer Test im APK-Modus |
| 0.5 | Fototagebuch mit 2 eigenen Fotos pro Tag und Meilensteine (auch neuer Ort), Bild fliegt zum Album, Löschen durch Halten, Fehler behoben: Fotos gingen verloren, wenn das Gerät nicht speichert; Hinweis in den Einstellungen |
| 0.4 | Testmodus für Eltern: eigener Test-Spielstand, Stufen wählen, Zeitraffer bis 600×, Zeitsprünge, Helfer, Wetter wählen |
| 0.3 | Spielen-Menü mit Verstecken und Musik (er tanzt), 12 Kleidungsstücke als Geschenke, Fotos und Album, Besuch von 5 Freunden, Wetter (Sonne, Wolken, Regen, Schnee, Regenbogen) |
| 0.2 | Farbe schiefergrau, Baby 30 % kleiner, Platten +50 %, Schwanzstacheln +25 %, App-Symbol Ei, Wandern zu 30 Orten mit Orte-Liste, Glühwürmchen |
| 0.1 | Runde 1: Hauptmenü mit Stego/Ei, Ei mit 3 Rissen und Schlüpfen, 5 Wachstumsstufen in 30 Tagen, 5 Bedürfnisse, Essen, Trinken, Streicheln, Baden, Zähneputzen, Ball, Kacka, Schlafen 20–7 Uhr mit Tag/Nacht-Himmel, Geräusche und Spieluhr, Eltern-Einstellungen mit Spielzeit-Grenze und „Alles zurücksetzen“ |

---

## 11. Offene Punkte

Gebaut bis 0.12.6. Alles Vereinbarte ist gebaut. Nicht gewünscht: Ausmalen, Eltern-Übersicht, Benachrichtigungen. Ausdrücklich **nicht** gewünscht: Garten, Sprachausgabe.

Mögliche nächste Schritte (noch nicht besprochen):
- Fotos aufs Handy speichern (heute nur im Spiel ansehen).
- Signierter Release-Build für den Play Store.
