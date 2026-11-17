# Burgwacht

Ein Inkrementalspiel für das Handy im Hochformat: In der Mitte steht eine kleine Burg, Gegner laufen
vom Bildschirmrand auf sie zu, und der Spieler greift mit dem Finger an der getippten Stelle an.
Waffen steigen durch besiegte Gegner im Level und bekommen an festen Stufen neue Fähigkeiten, die
sich alle addieren. Gold aus den Wellen fließt in einen Shop, der sich nur nach einer Niederlage öffnet.

**Stand: Version 0.8.** Das Spiel ist eine einzige HTML-Seite ohne externe Bilder oder Töne (alles
wird per Code gezeichnet und erzeugt) und wird zusätzlich als Android-APK ausgeliefert.

Diese Datei soll jeder späteren Sitzung (Mensch oder Claude) reichen, um ohne Vorwissen
weiterzuarbeiten. **Wenn du etwas am Spiel änderst, halte diese Datei aktuell.**

---

## Inhalt

1. [Schnellstart für eine neue Sitzung](#1-schnellstart-für-eine-neue-sitzung)
2. [Arbeitsweise mit dem Auftraggeber](#2-arbeitsweise-mit-dem-auftraggeber)
3. [Ordnerstruktur](#3-ordnerstruktur)
4. [Bauen und Ausliefern](#4-bauen-und-ausliefern)
5. [Code-Architektur](#5-code-architektur)
6. [Typische Änderungen – Schritt für Schritt](#6-typische-änderungen--schritt-für-schritt)
7. [Spielregeln und Balance (aktuelle Werte)](#7-spielregeln-und-balance-aktuelle-werte)
8. [Spielstand und Speicherformat](#8-spielstand-und-speicherformat)
9. [Tests](#9-tests)
10. [Bekannte Eigenheiten und Fallstricke](#10-bekannte-eigenheiten-und-fallstricke)
11. [Versionsgeschichte](#11-versionsgeschichte)
12. [Offene Punkte und Ideen](#12-offene-punkte-und-ideen)

---

## 1. Schnellstart für eine neue Sitzung

```bash
cd burgwacht
python3 build.py                      # baut burgwacht.html und die APK-Seite aus src/
```

```bash
cd "$(mktemp -d)" && /pfad/zum/repo/burgwacht/tests/run.sh   # alle Tests, Bilder landen im aktuellen Ordner
```

```bash
cd burgwacht && ./build-apk.sh        # baut zusätzlich Burgwacht.apk (braucht das Android-SDK, siehe 4.3)
```

Checkliste vor dem ersten Eingriff:

1. Diese README lesen, dann `src/js/02-config.js` (alle Spielwerte) überfliegen.
2. `tests/run.sh` laufen lassen. Erwartet: **275 Prüfungen, 0 Fehler** (111 + 57 + 24 + 52 + 31).
3. Prüfen, ob das Android-SDK da ist: `ls /opt/android-sdk/build-tools` → `34.0.0`. Wenn nicht, siehe 4.3.
4. Vor größeren Änderungen ein Backup anlegen (siehe 4.5) – das ist ausdrücklicher Wunsch des Auftraggebers.

Nach jeder fertigen Änderungsrunde:

1. Versionsnummer an drei Stellen erhöhen (siehe 4.4).
2. `tests/run.sh` – alles grün, sonst nicht ausliefern.
3. `./build-apk.sh` und die APK kurz prüfen (siehe 4.2).
4. `burgwacht.html` auf das **bestehende** Artefakt veröffentlichen (Link siehe 4.2).
5. Die spielbare Datei `android/app/src/main/assets/index.html` und `Burgwacht.apk` an den Auftraggeber schicken.
6. Committen und pushen. Diese README und die betroffenen Kommentare mit aktualisieren.

---

## 2. Arbeitsweise mit dem Auftraggeber

Der Auftraggeber schreibt Deutsch, alle Antworten an ihn sind auf Deutsch. Code und Code-Kommentare
sind auf Englisch, Texte im Spiel auf Deutsch.

Seine ausdrücklichen Wünsche:

- **Erst fragen, dann handeln.** Vor dem Erstellen, Ändern, Starten oder Umsetzen von etwas fragen
  und auf sein „Ja“ warten. Eine Frage von ihm („Kannst du …?“) ist keine Erlaubnis: erst sagen, ob
  und wie es geht, dann warten.
- **Abweichungen ansprechen.** Geht etwas nicht genau so wie gesagt: anhalten, kurz erklären, eine
  Alternative nennen und fragen. Nicht einfach die Alternative bauen.
- **Nicht mehr machen als besprochen.** Zusätzliche Ideen vorschlagen, aber erst nach Zustimmung bauen.
  Was du selbst festgelegt hast (Zahlen, Interpretationen), in der Antwort offen benennen.
- **Im Zweifel lieber einmal mehr fragen.** Bei Rückfragen immer einen eigenen Vorschlag mitliefern,
  dann reicht ihm ein kurzes „passt“.
- **Gründlich testen.** Nach jeder Änderung alle alten und neuen Funktionen prüfen und ehrlich sagen,
  was getestet wurde (Browser-Emulator, nicht echtes Handy) und was nicht (z. B. wie Musik klingt).
- **Backup vor größeren Runden** in den Ordner `Backup/` auf GitHub (siehe 4.5).
- **Code kommentieren**, damit jede spätere Sitzung ihn versteht.
- Er spielt am Handy (APK und Artefakt-Link) und gibt Feedback zu Balance und Gefühl
  („es soll befriedigend sein, viele Gegner umzuhauen“). Balance-Wünsche kommen oft als grobe
  Zahlen („30 % weniger“, „+1 HP pro Welle bis Welle 17“); bei Mehrdeutigkeit nachfragen und
  eine Tabelle mit den Folgen zeigen.

Die Fußzeile im Hauptmenü lautet `@made by Brownii (Claude.ai) · v<Version>` und soll so bleiben.

---

## 3. Ordnerstruktur

```
burgwacht/
├── README.md                  diese Datei
├── build.py                   setzt src/ zu den beiden fertigen Seiten zusammen
├── build-apk.sh               build.py + Gradle-Build der APK + Kopie nach Burgwacht.apk
├── burgwacht.html             ERZEUGT: Seite für das Claude-Artefakt (Schriften von Google Fonts)
├── Burgwacht.apk              ERZEUGT: Debug-signierte Android-App (wird mit eingecheckt)
├── src/
│   ├── page.html              Markup: Spielfeld, Leisten, Shop, Menüs, Dialoge
│   ├── style.css              alle Styles (dunkler „Glas“-Look)
│   └── js/                    Spielcode, siehe Abschnitt 5
├── fonts/                     Lilita One und Nunito als woff2 (+ Lizenzen, OFL); werden in die APK eingebettet
├── android/                   minimales Android-Projekt: eine Activity mit WebView
│   ├── build.gradle, settings.gradle, gradle.properties
│   └── app/
│       ├── build.gradle       versionCode/versionName, SDK 34, minSdk 24
│       └── src/main/
│           ├── AndroidManifest.xml          Hochformat, Berechtigung VIBRATE
│           ├── assets/index.html            ERZEUGT: eigenständige Spielseite (Schriften eingebettet)
│           ├── java/com/burgwacht/game/MainActivity.java   WebView, Exit-Brücke, Zurück-Taste
│           └── res/                         App-Icon (mipmap-xhdpi), Theme
└── tests/
    ├── lib.js                 gemeinsame Hilfen für alle Testreihen
    ├── run.sh                 baut und führt alle Testreihen aus
    ├── suite-core.js          Grundregeln
    ├── suite-menu.js          Menüs, Oberfläche, Komfort, Lasttest
    ├── suite-world.js         Wellen, Mauer, Wirtschaft, Welle 100
    ├── suite-progress.js      Balance, Shop, Spezialgegner, Truhe, Erfolge, Lava-Welt
    ├── suite-content.js       Inhalte aus 0.8 (Ritter, neue Gegner, Musik, Truhen-Animation)
    └── bench-weapons.js       Waffenvergleich auf Level 100 (kein Test, nur Tabelle)

Backup/                        (im Repo-Wurzelordner) Kopien früherer Versionen, siehe 4.5
CLAUDE.md                      (im Repo-Wurzelordner) Kurzfassung der Regeln, wird von Claude Code automatisch geladen
```

**Niemals** die erzeugten Dateien (`burgwacht.html`, `android/app/src/main/assets/index.html`) von
Hand bearbeiten – sie werden bei jedem `build.py` überschrieben. Immer `src/` ändern.

---

## 4. Bauen und Ausliefern

### 4.1 Seite bauen (`build.py`)

`python3 build.py` (aus `burgwacht/` oder mit Pfad) erzeugt zwei Dateien:

| Datei | Zweck | Schriften |
|---|---|---|
| `burgwacht.html` | Seitenfragment für das Claude-Artefakt (ohne `<html>`/`<head>`, das ergänzt der Artefakt-Host) | Link zu Google Fonts |
| `android/app/src/main/assets/index.html` | vollständige, eigenständige Seite für die APK und für die Tests | als Base64 eingebettet, funktioniert offline |

Alle Dateien in `src/js/` werden **in Namensreihenfolge** in **einen** gemeinsamen
Funktionsrumpf `(() => { 'use strict'; … })()` geklebt. Es gibt keine Module und keine Imports:
was eine Datei auf oberster Ebene deklariert, ist in allen späteren Dateien sichtbar. Die
Zahlen-Präfixe bestimmen also die Ladereihenfolge (siehe 5.1).

### 4.2 APK bauen (`build-apk.sh`) und ausliefern

`./build-apk.sh` ruft `build.py` auf, schreibt `android/local.properties`, baut mit Gradle
(`assembleDebug`) und kopiert das Ergebnis nach `burgwacht/Burgwacht.apk` (~150 KB).

Kurz prüfen:

```bash
/opt/android-sdk/build-tools/34.0.0/aapt2 dump badging Burgwacht.apk | head -1     # Version ok?
```

```bash
/opt/android-sdk/build-tools/34.0.0/apksigner verify --verbose Burgwacht.apk       # erste Zeile "Verifies"?
```

Die APK ist ein **Debug-Build** (Debug-Schlüssel von Gradle). Zum Installieren muss der Nutzer am
Handy „Unbekannte Apps installieren“ erlauben. Für den Play Store bräuchte es einen signierten
Release-Build – das ist noch nicht eingerichtet.

`MainActivity.java` macht nur drei Dinge: eine WebView mit `file:///android_asset/index.html`
zeigen, die JS-Brücke `window.Android.exit()` für den Exit-Knopf bereitstellen und die
Zurück-Taste an `window.__back()` im Spiel weitergeben (das entscheidet: Dialog schließen, Pause,
Menü verlassen oder App beenden).

**Auslieferung an den Auftraggeber:**

- **Artefakt (Spielen im Browser/Claude-App):** `burgwacht.html` mit dem Artifact-Tool auf
  **https://claude.ai/artifact/VDNPywsdLafNYmZQnJ6FWX** veröffentlichen. In einer neuen Sitzung die
  URL als `url` mitgeben (vorher `action: "read"`), sonst entsteht ein neues Artefakt mit neuem Link.
- **Dateien:** `android/app/src/main/assets/index.html` (spielbar, auch offline) und
  `Burgwacht.apk` mit SendUserFile schicken.
- Es gibt außerdem eine Musik-Hörprobe als eigenes Artefakt:
  https://claude.ai/artifact/FZRnBp3VR6zc1UFwujYvqn (vier Stücke, gewählt wurden jeweils „A“).
  Ihr Quelltext liegt nicht im Repo; die beiden gewählten Stücke stecken in `src/js/05-music.js`.

### 4.3 Android-SDK

Gebaut wird mit Gradle 8.14.3 (`/opt/gradle`), Java 21, Android Gradle Plugin 8.7.3, Plattform 34,
Build-Tools 34.0.0. Erwarteter SDK-Ort: `/opt/android-sdk` (oder `ANDROID_HOME`).

In den Cloud-Sitzungen des Auftraggebers gibt es dafür die Umgebung **„claude.ai Android-Build“**:
Sie erlaubt den Host `dl.google.com` und hat ein Setup-Skript, das das SDK beim Start einer frischen
Sitzung installiert. Fehlt das SDK trotzdem (andere Umgebung, Skript fehlgeschlagen), so installieren:

```bash
SDK=/opt/android-sdk; mkdir -p $SDK/cmdline-tools && cd /tmp && curl -fsSL -o clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && unzip -q -o clt.zip -d $SDK/cmdline-tools && mv $SDK/cmdline-tools/cmdline-tools $SDK/cmdline-tools/latest && yes | $SDK/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null; $SDK/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

Wird `dl.google.com` vom Netzwerk blockiert (`CONNECT tunnel failed, response 403`), muss der Host in
der Umgebung erlaubt werden. `maven.google.com` (für Gradle) war bisher ohne Freigabe erreichbar.

### 4.4 Version erhöhen

Die Version steht an **drei** Stellen, die gemeinsam geändert werden müssen:

| Stelle | Beispiel |
|---|---|
| `src/js/02-config.js` → `VERSION` | `const VERSION = '0.8';` |
| `src/page.html` → Fußzeile `#credit` | `@made by Brownii (Claude.ai) · v0.8` |
| `android/app/build.gradle` → `versionCode` (Ganzzahl, immer +1) und `versionName` | `versionCode 11`, `versionName '0.8'` |

`suite-menu.js` prüft, dass Fußzeile und `VERSION` übereinstimmen.

Bisheriges Schema: größere Runde → `0.x`, kleine Balance-Korrektur → `0.x.y`.

### 4.5 Backups

Vor größeren Änderungsrunden wünscht der Auftraggeber eine Kopie der aktuellen Version im Repo:

```bash
cd <repo> && dest=Backup/burgwacht-v<VERSION> && mkdir -p "$dest" && git ls-files burgwacht | while read f; do mkdir -p "$dest/$(dirname "${f#burgwacht/}")"; cp "$f" "$dest/${f#burgwacht/}"; done
```

Danach eine Zeile in `Backup/README.md` ergänzen und das Backup **als eigenen Commit** pushen,
bevor die neue Arbeit beginnt. Vorhanden: `burgwacht-v0.6.3`, `burgwacht-v0.7`.

### 4.6 Git

- Das Repository enthält nur diesen einen Branch (`claude/inspiring-franklin-mh5fxe`), er ist auch
  der Standard-Branch. Eine neue Sitzung bekommt einen eigenen Arbeits-Branch zugewiesen; der sollte
  vom aktuellen Stand dieses Branches ausgehen.
- Ein Hook der Cloud-Sitzung verlangt, dass am Ende nichts uncommittet bleibt. Hilfsdateien
  (Bilder, Probeskripte) deshalb im Scratchpad ablegen, nicht im Repo.
- Commit-Nachrichten sind auf Englisch; keine Modellnamen in Commits oder Code.

---

## 5. Code-Architektur

### 5.1 Dateien in `src/js/` (Ladereihenfolge)

| Datei | Inhalt |
|---|---|
| `01-core.js` | Mathe-Kürzel (`TAU`, `rnd`, `dist`, `clamp`, `distToSegment`), `$()`, Canvas `ctx`, Bildschirmmaße `W, H, DPR, U, cx, cy` |
| `02-config.js` | **Alle Spielwerte**: Waffen, Gegnertypen, Wellen, Welten, Gold, Shop-Preislisten, `debugFlags`. Keine Seiteneffekte. |
| `03-state.js` | Spielstand `S`, die zwei Speicherplätze `DB`, Laden/Speichern/Bereinigen, abgeleitete Werte (`damageOf`, `cooldownOf`, `maxHp`, …) |
| `04-world.js` | Laufzeitzustand des Kampfes (`world`, `castle`, `combat`, `wave`, `session`, `combo`) und Helfer: `after`, `addZone`, `addEffect`, `puff`, `ring`, `floatText`, `clearField` |
| `05-audio.js` | gemeinsamer `AudioContext` (`getAudio`), Effekt-Töne `sound()`, `vibrate()`, Angriffstöne je Waffe |
| `05-music.js` | Hintergrundmusik: Instrumente, die Stücke „Burghof“ (Menü) und „Wachtposten“ (Spiel), Abspieler `playMusic()` |
| `06-sprites.js` | Alles Gezeichnete: Waffenformen, Waffen-Icons, Burg, Mauer, alle Gegner, Soldat, Boden (Wiese/Lava) |
| `07-enemies.js` | Gegner erzeugen (`spawnEnemy`), Schaden (`hurt`, `areaDamage`), Tod (`kill`, `KILL_HOOKS`), Status, Bewegung, Armbrustschützen, Kontakt mit Mauer/Burg |
| `08-projectiles.js` | Allgemeine Geschosse (`addProjectile`, `PROJECTILE_KINDS`), Bewegung, Treffer, Abprallen, Zielsuche |
| `10-weapon-sword.js` … `14-weapon-wand.js` | je eine Waffe: Fähigkeiten, `WEAPONS.<id>.attack`, eigene Geschossarten und Kill-Hooks |
| `20-defenders.js` | Mauer- und Burgtreffer, Soldaten, Bogenschützen auf der Mauer, Ritter |
| `21-waves.js` | Wellen bauen (inkl. Wolfsrudel, Boss), spawnen, abschließen, Wellen-Pfeile, Niederlage, Weltwechsel |
| `22-progress.js` | Gold-Einnahmen, Statistik, Erfolge, Schatztruhe mit Animation und Boni |
| `30-hud.js` | Toasts, obere Leiste, Waffenleiste mit Infozeile, XP und Level-Up |
| `31-shop.js` | Shop (datengetrieben: `SHOP_TABS`, `SHOP_ITEMS`) |
| `32-menus.js` | Hauptmenü, Spielstände, Pause, Fähigkeiten-Übersicht, allgemeiner Dialog, Hinweise, Weltwahl, Zurück-Taste, Pausensteuerung |
| `40-main.js` | Angriff, `update(dt)`, Zeichnen, Eingabe (Tippen, Halten, Langdruck), `resize`, Spielschleife, Start |
| `99-debug.js` | `window.__bw`: Hooks für die Tests (siehe 9.3). Wird vom Spiel selbst nicht benutzt. |

Jede Datei beginnt mit einem Kopfkommentar, jede wichtige Funktion hat einen Kommentar.

### 5.2 Wichtige Objekte

| Objekt | Datei | Bedeutung |
|---|---|---|
| `S` | 03 | Spielstand des gerade gespielten Platzes. Immer **dasselbe** Objekt; Laden kopiert Felder hinein. |
| `DB` | 03 | `{ slots: [S1, S2], opts: { mute, music, vib, speed } }` – wird komplett in `localStorage` gespeichert. |
| `slot` | 03 | gespielter Platz (0/1), `-1` im Hauptmenü |
| `world` | 04 | Listen der Dinge auf dem Feld: `enemies, projectiles, zones, effects, particles, texts, timers, soldiers` |
| `castle` | 04 | `hp` (aktuelle Leben), `flash` (Treffer-Rückmeldung), `fallen` |
| `combat` | 04 | Cooldown, Angriffszähler (für „jeder n-te Angriff“), Pfeilzähler (Krit) |
| `wave` | 04 | Spawn-Warteschlange, Abstand, Pause vor der Welle |
| `session` | 04 | Spielzeit, Bildschirmwackeln, Pause, gehaltener Finger, Timer der Truppen |
| `knight` | 20 | Position und Zustand des Ritters (kein Eintrag in `world`) |
| `music` | 05-music | aktuelles Stück, Ausgangskette, Taktplanung |

**Einheit `U`:** Alle Größen und Geschwindigkeiten sind Vielfache von `U` (aus der Bildschirmgröße
berechnet, 0,75–1,7), damit das Spiel auf allen Handys gleich aussieht. Gegner und Burg werden
zusätzlich mit `CASTLE_SCALE = 0.6` verkleinert gezeichnet.

### 5.3 Ablauf eines Bildes

`frame()` (40-main) ruft bei Tempo x2 `update(dt)` zweimal auf, nie während einer Pause, und dann `draw()`.

`update(dt)` in dieser Reihenfolge: Spielzeit und Cooldown → Dauerfeuer, wenn ein Finger liegt →
`runTimers` → `updateWave` (spawnen, Welle abschließen) → `updateEnemies` (Status, Laufen, Kontakt) →
Serien-Zähler → Soldaten → Bogenschützen → Ritter → Geschosse → Zonen → Effekte/Partikel/Texte →
tote Gegner und Geschosse entfernen → ggf. Niederlage → Anzeigen → einmal pro Sekunde Erfolge prüfen.

`draw()`: Boden (vorgerendert) → Bodenzonen und -effekte → Burg, Mauer, Gegner, Soldaten,
Bogenschützen und Ritter **nach y sortiert** → Cooldown-Ring → Ziellinie (Dolche/Bogen) →
Geschosse → Luft-Zonen und -Effekte → Partikel → Schadenszahlen → Serien-Zähler.

### 5.4 Pause und Overlays

Das Spiel pausiert **genau dann**, wenn eines der Overlays aus `OVERLAY_IDS` (32-menus) sichtbar ist:
`menu, shop, pausep, abil, dialog, chestfx`. Nach jedem Ein- oder Ausblenden `refreshPause()`
aufrufen. Der allgemeine Dialog (`showDialog({ title, text, body, buttons, dismissable })`) dient
für Begrüßung, Hinweise, Truhenwahl, Weltwahl und Statistik.

### 5.5 Schaden

Alles läuft über `hurt(enemy, amount, source, viaProjectile)`. `source` ist ein Objekt wie
`{ weapon: 'sword', color: '#fff' }`; `dot: true` unterdrückt die Schadenszahl (Gift, Brand).
Schildträger blocken 75 % von Geschossen (`viaProjectile`), außer bei `heavy`-Geschossen
(Klingenwelle, Kugel, Riesenpfeil, Phönix). Beim Tod laufen alle Funktionen in `KILL_HOOKS`
(Schwertsplitter, Giftübertragung, Kettenexplosion, Dolch-Kettenreaktion, Schleimteilung).

---

## 6. Typische Änderungen – Schritt für Schritt

**Spielwert ändern (Preis, Leben, Tempo …):** fast immer nur `02-config.js`. Danach Tests laufen
lassen; viele Tests prüfen konkrete Zahlen und müssen bewusst mit angepasst werden. Diese README
(Abschnitt 7) mitziehen.

**Neuer Gegnertyp:**
1. Eintrag in `ENEMY_TYPES` (02) mit `name, r, hp, hpStep, sp, xp, color` und ggf. `boss/club/siege/shielded/ranged`.
2. Ab welcher Welle und wie häufig: Zeile in `ENEMY_SHARES` (02). Bosse: `BOSS_ROTATION`.
3. Lava-Farbe in `WORLDS.lava.colors`.
4. Zeichnung: Funktion in `06-sprites.js` schreiben und in `ENEMY_DRAWERS` eintragen (zeichnet Körper,
   Augen und Waffe selbst; Statusanzeigen kommen automatisch).
5. Besonderes Verhalten in `07-enemies.js` (Bewegung/Kontakt) bzw. `20-defenders.js` (gegen Soldaten).
6. Test in `suite-content.js` ergänzen.

**Neue Waffen-Fähigkeit:** In der Waffendatei eine kleine Funktion schreiben und in
`WEAPONS.<id>.attack` mit `if (level >= N)` aufrufen; den Namen in `milestones` (02) eintragen.
Dauerhafte Dinge mit `addZone` (mit `tag` und Obergrenze per `zoneCount`, sonst stapeln sie sich bei
kurzen Cooldowns), reine Optik mit `addEffect`, Verzögerungen mit `after`.

**Neues Shop-Angebot:** Eintrag in `SHOP_ITEMS` (31). Für einmalige Käufe `unlockOffer(...)` und das
Feld in `S.own` (03) ergänzen; für Stufen `prices`, `tierNames`, `level()`, `buy()` und ein neues Feld
in `blankSave()` **und** `sanitizeSave()`. Wirkung dort einbauen, wo der Wert gelesen wird.

**Neues Feld im Spielstand:** in `blankSave()` mit Kommentar anlegen, in `sanitizeSave()` prüfen und
begrenzen (alte Spielstände haben es nicht!). `SAVE_KEY` nur ändern, wenn das Format unvereinbar wird.

**Neuer einmaliger Hinweis:** Feld in `S.hints` (03, inkl. `sanitizeSave`), Funktion nach dem Muster
`showSkillHintOnce()` (32), Aufruf an der passenden Stelle; ggf. eigenes `debugFlags`-Feld, damit
Tests ihn abschalten können.

**Neue Welt:** Eintrag in `WORLDS` (02), Boden-Stil in `GROUND_STYLES` (06), Freischaltung und
Weltwahl in `21-waves.js`/`32-menus.js` erweitern (bisher gibt es genau zwei Welten und ein
`S.parked` für die jeweils andere – für drei Welten muss das zu einer Liste werden).

**Neues Overlay:** Markup in `page.html`, Id in `OVERLAY_IDS`, Zurück-Taste in `window.__back`.

---

## 7. Spielregeln und Balance (aktuelle Werte)

Quelle der Wahrheit ist `src/js/02-config.js`. Diese Tabellen geben den Stand von 0.8 wieder.

### 7.1 Waffen

| Waffe | Preis | Grundschaden Lvl 1 | Angriff alle … (Lvl 1 → 100) | Ziellinie |
|---|---|---|---|---|
| Dolche (Startwaffe) | – | 9 | 2,0 s → 0,3 s | ja |
| Schwert | 5 | 10 | 3,5 s → 0,5 s | – |
| Morgenstern | 10 | 16 | 5,0 s → 1,0 s | – |
| Bogen | 40 | 14 | 2,5 s → 0,4 s | ja |
| Feuerstab | 75 | 12 | 4,0 s → 0,8 s | – |

- Schaden = Grundschaden × (1 + 0,09 × (Level − 1)) × (1 + 0,1 × Schmiede-Stufen) × 1,25^(Truhenbonus „Scharfe Klingen“).
- Cooldown sinkt linear bis `ABILITY_CAP = 100` und bleibt dann; der Truhenbonus „Flinke Hände“ multipliziert mit 0,8 pro Stück, minimal 0,1 s.
- Neue Fähigkeiten bei Level 5, 10, 15, 25, 30, 40, 50, 60, 70, 80, 90, 100; sie addieren sich. Namen in `WEAPONS.<id>.milestones`.
- `MAX_LEVEL = 100`. Geplant ist 1000: dann nur diese Zahl ändern; die Formeln rechnen schon damit (getestet), Fähigkeiten gibt es aber weiter nur bis 100.
- XP für Level L → L+1: `round(4 + 6,4 · L^1,4)`. XP pro Kill = `xp` des Gegnertyps × Welt-Faktor × `XP_GAIN` (1,3) × XP-Bonus (Shop) × Truhenbonus. XP bekommt nur die gerade gewählte Waffe.
- Richtwert erstes Durchspielen ohne Wiederholen: Level 5 / 9 / 16 / 25 / 43 / 91 nach Welle 5 / 10 / 20 / 30 / 50 / 100.
- Halten des Fingers = Dauerfeuer im Takt des Cooldowns. Langes Drücken auf eine Waffe = Fähigkeiten-Übersicht.

Waffenvergleich (`bench-weapons.js`, jede Waffe allein auf Level 100, ohne Mauer und Truppen;
Mittel aus drei Läufen, „durchgekommen“ = verlorene Burgleben):

Stand 0.8:

| Waffe | Welle 50: durchgekommen | Welle 100: durchgekommen | Welle 100: max. gleichzeitig |
|---|---|---|---|
| Schwert | 0 | 0 | 259 |
| Bogen | 0 | 355 | 263 |
| Morgenstern | 0 | 665 | 262 |
| Feuerstab | 0 | 843 | 260 |
| Dolche | 0 | 2.397 | 263 |

Bis Welle 50 reicht jede Waffe auf Level 100 allein. In Welle 100 hält nur das Schwert ohne Hilfe; die
anderen brauchen Mauer, Truppen oder Schmiede. (In 0.5 hielten Schwert und Bogen Welle 100 noch
vollständig – seitdem sind die Leben ab Welle 60 gestiegen und Orks machen 2–3 Schaden.)

### 7.2 Gegner

| Gegner (Id) | ab Welle | Leben W1 | +pro Welle bis W17 | Tempo | XP | Besonderheit |
|---|---|---|---|---|---|---|
| Schleim (`slime`) | 1 | 3 | 1 | 20 | 1 | Lava: teilt sich beim Tod in zwei kleine (30 % Leben) |
| Fledermaus (`bat`) | 2 | 1 | 1 | 38 | 1 | fliegt in Wellenlinien |
| Oger (`ogre`) | 3 | 14 | 3 | 13 | 3 | |
| Flinker Kobold (`koboldFast`) | 4 | 2 | 1 | 50 | 1 | sehr schnell |
| Kobold (`koboldSlow`) | 4 | 7 | 2 | 10 | 2 | langsam, zäh |
| Wolf (`wolf`) | 6 | 3 | 1 | 46 | 1 | immer im Rudel zu viert |
| Schildträger (`shield`) | 8 | 14 | 1 | 16 | 2 | Geschosse machen nur 25 % Schaden |
| Ork mit Keule (`orcClub`) | 10 | 22 | 4 | 14 | 4 | trifft Soldaten doppelt, stößt sie weg |
| Armbrustschütze (`archer`) | 12 | 4 | 1 | 22 | 2 | bleibt bei 105 U stehen, schießt alle 4 s auf Mauer/Burg |
| Ork mit Axt (`orcAxe`) | 15 | 16 | 3 | 21 | 4 | 2 Schaden an Mauer/Burg |
| Schleimkönig (`boss`) | Boss | 90 | 15 | 9 | 20 | Lava: Drachenflügel |
| Wolfsalpha (`wolfAlpha`) | Boss | 70 | 12 | 26 | 20 | bringt ein Rudel aus 4 Wölfen mit |
| Orkkönig (`orcKing`) | Boss | 120 | 20 | 8 | 25 | Keule, 3 Schaden an Mauer/Burg |

- **Leben (Wiese):** Welle 1–17 linear (`hp + hpStep × (Welle − 1)`), danach der Wert von Welle 17 × `enemyHpFactor(Welle − 16)` mit `enemyHpFactor(n) = 1 + 0,22(n−1) + 0,015(n−1)²` – ohne Sprung.
- **Lava-Welt:** Leben = Wiesen-Welle-100-Wert × `(1 + 0,15(w−1) + 0,008(w−1)²)`, Tempo × 1,5, XP × 3.
- **Tempo Wiese:** × (1 + min(0,5; 0,02 × Welle)).
- **Häufigkeit:** `ENEMY_SHARES` – je Typ Anteil = min(Höchstwert, Rate × Welle); der Rest sind Schleime. Ein gewürfelter „Wolf“ ist ein ganzes Rudel (passt keins mehr in die Welle, wird es ein Schleim).
- **Bosse:** jede 5. Welle, im Wechsel Schleimkönig → Wolfsalpha → Orkkönig. Der Boss kommt in der Mitte der Welle und wird nie in ein Rudel eingefügt.

Leben pro Welle (aus dem Spiel ausgelesen):

| Gegner | W1 | W5 | W10 | W17 | W18 | W30 | W50 | W100 | Lava W1 | Lava W10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Schleim | 3 | 7 | 12 | 19 | 23,5 | 122 | 467 | 2.329 | 2.329 | 6.983 |
| Fledermaus | 1 | 5 | 10 | 17 | 21 | 109 | 418 | 2.084 | 2.084 | 6.248 |
| Kobold | 7 | 15 | 25 | 39 | 48,2 | 249 | 959 | 4.781 | 4.781 | 14.334 |
| Flinker Kobold | 2 | 6 | 11 | 18 | 22,2 | 115 | 443 | 2.207 | 2.207 | 6.616 |
| Wolf | 3 | 7 | 12 | 19 | 23,5 | 122 | 467 | 2.329 | 2.329 | 6.983 |
| Oger | 14 | 26 | 41 | 62 | 76,6 | 397 | 1.525 | 7.601 | 7.601 | 22.787 |
| Ork mit Keule | 22 | 38 | 58 | 86 | 106 | 550 | 2.115 | 10.543 | 10.543 | 31.608 |
| Ork mit Axt | 16 | 28 | 43 | 64 | 79 | 409 | 1.574 | 7.846 | 7.846 | 23.523 |
| Schildträger | 14 | 18 | 23 | 30 | 37,1 | 192 | 738 | 3.678 | 3.678 | 11.026 |
| Armbrustschütze | 4 | 8 | 13 | 20 | 24,7 | 128 | 492 | 2.452 | 2.452 | 7.351 |
| Schleimkönig | 90 | 150 | 225 | 330 | 408 | 2.110 | 8.116 | 40.456 | 40.456 | 121.288 |
| Wolfsalpha | 70 | 118 | 178 | 262 | 324 | 1.676 | 6.444 | 32.120 | 32.120 | 96.295 |
| Orkkönig | 120 | 200 | 300 | 440 | 543 | 2.814 | 10.822 | 53.942 | 53.942 | 161.718 |

### 7.3 Wellen

- **Gegnerzahl (Wiese):** 8 in Welle 1, dann +3 pro Welle bis 5, +5 bis 15, +10 bis 30, +15 bis 50, +20 danach
  (5: 20 · 15: 70 · 30: 220 · 50: 520 · 100: 1.520), plus Boss (und ggf. Rudel). Lava-Welle w hat so viele wie Wiesen-Welle w + 20.
- **Abstand:** einzeln, `clamp(min(80, 10 + 0,6·n) / n, 0,04 s, 1,5 s)` – eine Welle braucht höchstens ~80 s zum Hereinkommen. Höchstens 260 Gegner gleichzeitig, der Rest wartet.
- **Nach einer geschafften Welle:** Gold (7.4), +`heal` Leben (bis Maximum), nächste Welle – außer „Halten“ ist an. Alle 3 Wellen eine Truhe (7.6). Nach Welle 2 einmalig der Fähigkeiten-Hinweis.
- **Wellen-Pfeile:** jede Welle von 1 bis „höchste geschaffte + 1“; beim Wechsel werden die Gegner zurückgesetzt.
- **Niederlage** (Burg auf 0): Shop öffnet sich. Danach **dieselbe Welle** von vorn, Leben voll, Mauer repariert, Truhenboni verfallen. Nach der ersten Niederlage einmalig der Hinweis auf die Pfeile.

### 7.4 Gold

- Jede geschaffte Welle zahlt, auch wiederholte: **2 Gold in Welle 1–10, je weitere 10 Wellen 3 mehr** (11–20: 5, 21–30: 8, … 91–100: 29).
- × Welt (Lava 3) × Goldbonus (Shop 1 / 1,25 / 1,5) × 1,5 je Truhenbonus „Schatzkarte“, gerundet.
- Welle 1–100 einmal geschafft: 1.550 Gold. Alle festen Shop-Preise zusammen: 6.354 Gold (+ Schmiede).
- Erfolge zahlen einmalig zusätzlich, zusammen 675 Gold (7.7).

### 7.5 Shop (nur nach einer Niederlage)

| Reiter | Angebot | Preise | Wirkung |
|---|---|---|---|
| Waffen | Schwert / Morgenstern / Bogen / Feuerstab | 5 / 10 / 40 / 75 | Waffe freischalten |
| Burg | Heilung +2, +3 | 20, 32 | Leben nach jeder Welle |
| Burg | Mauer 3 / 5 / 10 / 25 HP | 15, 30, 120, 300 | fängt Treffer ab, nur nach Niederlage repariert |
| Burg | Burg-Leben 12, 15 | 60, 150 | mehr Leben (Standard 10) |
| Burg | Bogenschützen 1–10 | 60, 90, 130, 180, 240, 310, 390, 480, 580, 700 | stehen auf dem Mauerring und schießen selbst |
| Truppen | Soldat | 2 | alle 5 s ein Soldat aus dem Tor |
| Truppen | Soldaten-Tempo alle 4 s, 3 s | 25, 80 | |
| Truppen | Ritter | 300 | reitet um die Burg, stürmt nahe Gegner |
| Truppen | Rüstung | 50 | Soldaten halten 5 statt 3 Schläge |
| Truppen | Mehr Soldaten bis 6, 8, … 20 | 30, 50, 80, 120, 170, 230, 300, 400 | +2 gleichzeitige Soldaten je Stufe (Start 4) |
| Boni | Goldbonus +25 %, +50 % | 80, 200 | |
| Boni | XP-Bonus +25 %, +50 % | 60, 160 | |
| Schmiede* | „<Waffe> schmieden“ | 100 × 1,35^Stufe (100, 135, 182, …) | +10 % Schaden je Stufe, unbegrenzt, nur Waffen im Besitz |

\* Der Reiter Schmiede erscheint erst, wenn die Lava-Welt freigeschaltet ist.

Truppen im Detail (`20-defenders.js`):

- **Soldat:** läuft zum nächsten Gegner (bis 260 U), hält ihn fest, schlägt alle 0,8 s für `2 × (1 + 0,15 × (Welle − 1))`. Gegner schlagen ihn alle 1,2 s (Keulen-Orks doppelt). Ohne Gegner wartet er vor der Burg.
- **Bogenschütze:** gleichmäßig auf dem Mauerring verteilt, schießt alle 1,5 s auf den nächsten Gegner im Umkreis von 300 U, je 35 % eines Treffers der gewählten Waffe.
- **Ritter:** Patrouillenkreis 78 U (95 U/s). Ist ein Gegner näher als 150 U an der Burg, stürmt er mit 230 U/s hin; nie weiter als 175 U von der Burg. Überreiten: 120 % eines Treffers der gewählten Waffe + Rückstoß, je Gegner höchstens alle 0,6 s. Unverwundbar.

### 7.6 Schatztruhe

Nach jeder 3. Welle (einmal pro Welle und Lauf): erst eine ~2-Sekunden-Animation (Truhe fällt,
wackelt, springt mit Licht und Gold auf; Antippen überspringt nach 0,4 s), dann Auswahl aus drei
zufälligen Boni mit Info-Feld „Gilt bis zur nächsten Niederlage“. Die Auswahl lässt sich nicht
wegdrücken.

| Bonus | Wirkung |
|---|---|
| Scharfe Klingen | +25 % Schaden (stapelt multiplikativ) |
| Flinke Hände | 20 % schnellere Angriffe (stapelt) |
| Lehrmeister | +50 % XP (stapelt) |
| Schatzkarte | +50 % Gold pro Welle (stapelt) |
| Festmahl | Burg sofort voll geheilt (nur angeboten, wenn Leben fehlen) |
| Maurer | Mauer sofort repariert (nur angeboten, wenn beschädigt) |

### 7.7 Erfolge

14 Erfolge, je einmalige Goldbelohnung (zusammen 675): 100 / 1.000 / 10.000 Gegner (5/25/100),
Serie 25 / 100 (5/30), erster Boss (5), Welle 10 / 25 / 50 / 100 (10/25/60/200), alle fünf Waffen (30),
eine Waffe Level 50 / 100 (30/100), erste Lava-Welle (50). Statistik und Erfolge im Pause-Menü.

### 7.8 Welten

- **Wiese:** Start. Grüner Boden mit Blumen.
- **Lava-Welt:** freigeschaltet, sobald Wiesen-Welle 100 geschafft ist. Dann erscheint oben ein Welt-Knopf
  (Globus). Eigene Wellen ab 1, eigener Fortschritt (`S.parked` hält die jeweils andere Welt),
  Vulkanboden mit Lavaströmen, eigene Gegnerfarben, dreifaches Gold und XP, Schleime teilen sich.

### 7.9 Oberfläche, Ton und Musik

- Oben: Welle mit Pfeilen und Fortschrittsbalken, Herzen (ab 11 in zwei Reihen), Gold; darunter Pause,
  Tempo x1/x2, Weltwahl (Lava), „Welle halten“, Mauer-Symbole (mehrzeilig).
- Unten: runde Waffenknöpfe (Level-Abzeichen, Cooldown-Ring; gesperrt mit Preis) und die Infozeile
  „<Waffe> Lvl n · Schaden · alle x s · Neu ab Lvl m“, darunter der XP-Balken.
- Pause-Menü: Weiter, Ton, Musik, Vibration, Statistik & Erfolge, Hauptmenü.
- Musik: Menü „Burghof“ (Laute, D-dorisch, 3/4), Spiel „Wachtposten“ (Flöte, 6/8). Live erzeugt, startet
  mit dem ersten Tippen (Browser-Regel), pausiert im Hintergrund, eigener Schalter.
- Begrüßung bei jedem neuen Spiel: „Sire, die Monster greifen an. Nehmt Eure Dolche. Wir müssen uns aufrüsten!“

---

## 8. Spielstand und Speicherformat

- `localStorage['burgwacht-v3']` = `DB` als JSON: zwei Plätze und die Optionen.
- Beim Laden läuft jeder Platz durch `sanitizeSave()`: Jedes Feld wird geprüft und begrenzt,
  fehlende Felder bekommen Standardwerte. **Alte Spielstände müssen immer weiter laden.**
- Übernahmen aus alten Versionen (in `sanitizeSave`/`loadDatabase`):
  - `burgwacht-v2` (Einzelspielstand vor dem Startmenü) → Platz 1.
  - Kein `own.sword` gespeichert (vor 0.8, als das Schwert Startwaffe war) → Schwert gilt als gekauft.
  - `own.squad` (alte „Verstärkung“) → 1. Stufe „Mehr Soldaten“; `own.tower` (alter Turmschütze) → 1 Bogenschütze.
- Gespeichert wird nach Käufen, Wellen, Level-Ups, Einstellungen und zusätzlich alle 5 Sekunden.
- In der APK liegt `localStorage` in den App-Daten der WebView; Deinstallieren löscht es.

---

## 9. Tests

### 9.1 Ausführen

```bash
cd "$(mktemp -d)" && /pfad/zum/repo/burgwacht/tests/run.sh
```

`run.sh` baut zuerst und führt dann alle Testreihen gegen die **APK-Seite** aus. Ausgabe je Reihe
eine Zeile plus alle FAIL-Zeilen; Exit-Code 0 = alles grün. Eine Reihe einzeln:
`node burgwacht/tests/suite-content.js`. Zeigt eine Reihe „0 passed, 0 failed“, ist sie abgestürzt –
einzeln starten, um die Fehlermeldung zu sehen.

Playwright und Chromium sind in den Cloud-Sitzungen vorinstalliert (`require('playwright')` geht
überall). Nicht `playwright install` ausführen.

### 9.2 Die Testreihen

| Datei | Prüfungen | Inhalt |
|---|---|---|
| `suite-core.js` | 111 | Start, Cooldown, alle 5 Waffen auf allen 13 Stufen, XP, Wellen und Gold, Niederlage und Shop, Soldaten, Heilung, Boss, Speichern |
| `suite-menu.js` | 57 | Hauptmenü, Spielstände, Infozeile, Tempo, Dauerfeuer, Pause, x2, Halten, Fähigkeiten-Übersicht, Zurück/Exit (simuliert), Migration, Lasttest |
| `suite-world.js` | 24 | Gegnerzahlen, Größe, kein Wackeln im Shop, Wirtschaft, Mauer, Soldaten-Tempo, Serie, Welle 100 |
| `suite-progress.js` | 52 | Leben pro Welle, XP-Kurve, Level 1000, Ziellinie, Shop-Reiter, 20 Soldaten/10 Schützen, Schildträger, Armbrust, Truhe, Erfolge, Statistik, Lava-Welt, Schmiede |
| `suite-content.js` | 31 | Dolch-Start, Ritter, neue Gegner, Rudel, Bosse, Lava-Farben, Musik, Hinweis nach Welle 2, Truhen-Animation |

`bench-weapons.js` ist kein Test, sondern ein Vergleich für Balance-Entscheidungen (dauert mehrere Minuten).

### 9.3 Wie die Tests das Spiel steuern

- **Ruhemodus:** `tests/lib.js` setzt vor dem Laden `window.__bwQuiet = true`. Dann sind Erfolge,
  Truhen, Fähigkeiten-Hinweis, Truhen-Animation und Musik aus (`debugFlags` in 02-config), damit sie
  Messungen nicht stören. Einzelne lassen sich per `__bw.flags.<name> = true` wieder einschalten.
- **`window.__bw`** (99-debug) bietet u. a.: `S`, `DB`, `step(sekunden)` (simuliert Spielzeit mit 60
  Schritten pro Sekunde), `state()`, `spawn(typ)`, `ens()`, `clear()`, `attack(x,y)`, `ready()`
  (Cooldown auf 0), `hold(punkt)`, `setHp(n)`, `startGame(platz, neu)`, `showMenu()`,
  `switchWorld(id)`, `queue()`, `knight()`, `music()`, `groundSample()`, `pos()`.
- Viele Tests prüfen **konkrete Zahlen** (Preise, Leben, Gold). Wer Balance ändert, passt die
  betroffenen Erwartungen bewusst an und nennt die Änderung dem Auftraggeber.
- Wichtig beim Schreiben neuer Tests: Neue Spiele starten mit Dolchen. Wer Schwert-Mechanik testet,
  muss `S.own.sword = true` setzen – sonst ersetzt das Laden eines Platzes das ungekaufte Schwert
  stillschweigend durch die Dolche.

---

## 10. Bekannte Eigenheiten und Fallstricke

- **Nur im Emulator getestet.** Alles läuft in headless Chromium; ein echtes Android-Gerät stand nie
  zur Verfügung. Vibration, Exit, Zurück-Taste und Ton sind dort nur simuliert bzw. nicht hörbar.
- **Musik und Ton** brauchen eine Nutzergeste; die erste Berührung startet die Menümusik.
- **Exit-Knopf** gibt es nur in der APK (`window.Android`); im Browser ist er ausgeblendet.
- **Kleine Gegner:** Durch `CASTLE_SCALE = 0.6` sind Kobolde und Wölfe recht klein; Details erkennt man nur aus der Nähe.
- **Dolche** sind auf Level 100 in Welle 100 mit Abstand die schwächste Waffe, und außer dem Schwert hält keine Waffe Welle 100 allein (siehe 7.1).
- **Goldbonus bei kleinen Beträgen:** Es wird gerundet (2 × 1,25 = 2,5 → 3).
- **Wirtschaft:** Alle Käufe kosten viel mehr, als ein Durchspielen bringt; Farmen mit „Halten“ ist gewollt.
- **Lava-Welt** ist an Wiesen-Welle 100 gekoppelt: Wer die Kurve der Wiese ändert, ändert die Lava-Welt mit.
- **Effekt-Obergrenzen** (`FX_CAP_*`, `zoneCount`-Grenzen in den Waffen) verhindern Ruckeln bei kurzen
  Cooldowns; neue Fähigkeiten brauchen ebenfalls Grenzen.
- **Erzeugte Dateien** werden mit eingecheckt (`burgwacht.html`, `assets/index.html`, `Burgwacht.apk`),
  damit der Stand ohne Build spielbar ist. Nach Änderungen in `src/` immer neu bauen und mit committen.

---

## 11. Versionsgeschichte

| Version | Inhalt |
|---|---|
| 0.1 | Erste spielbare Fassung: Schwert, Dolche, Morgenstern mit Stufen bis 100, Burg, Wellen |
| 0.2 | Gold, Shop nach Niederlage, Wellenwahl, Soldaten |
| 0.3 | Startmenü, zwei Spielstände, Waffenwerte in der Leiste, eigene Angriffstempi, Dauerfeuer, Pause, x2, Halten |
| 0.4 | Größere Wellen, Mauer, Soldaten-Tempo, Treffer-Effekte und Serien-Zähler |
| 0.5 | Neues „Glas“-UI, Bogen und Feuerstab |
| 0.6 | Code aufgeteilt und kommentiert, Tests im Repo, Shop mit Reitern, Lava-Welt, Truhen, Erfolge, Schildträger und Armbrustschützen |
| 0.6.1–0.6.3 | Leichtere erste Wellen, Ziellinie, lineare Lebenspunkte bis Welle 17 |
| 0.7 | Gold für jede Welle, Truhe alle 3 Wellen, 20 Soldaten, 10 Bogenschützen, Neustart auf derselben Welle, +30 % XP |
| 0.8 | Dolche als Startwaffe, Ritter, Kobolde, Orks, Wölfe, Wolfsalpha, Orkkönig, Musik, Truhen-Animation, Fähigkeiten-Hinweis |

---

## 12. Offene Punkte und Ideen

Vom Auftraggeber angesprochen, aber noch nicht entschieden oder gebaut:

- **Waffen-Level bis 1000** (vorbereitet, siehe 7.1).
- **Prestige** (freiwilliger Neustart mit dauerhaftem Bonus) – ausdrücklich zurückgestellt.
- **Dolche** auf hohen Wellen weiter stärken? Bisher nur leicht angepasst.
- **Shop-Preise** passen nicht zur Goldmenge seit 0.7 – offen, ob Preise sinken sollen oder Farmen so gewollt ist.
- **Gegnergröße:** kleine Gegner eventuell etwas größer zeichnen.
- **Release-Build** der APK (signiert, für den Play Store).
