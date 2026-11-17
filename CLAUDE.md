# CLAUDE.md

Dieses Repository enthält das Handyspiel **Burgwacht** (Ordner `burgwacht/`) und Sicherungskopien
früherer Versionen (Ordner `Backup/`).

**Lies vor jeder Arbeit `burgwacht/README.md` vollständig.** Dort stehen Aufbau, Bauen, Ausliefern,
alle Spielwerte, Tests und Fallstricke. Diese Datei fasst nur die Regeln zusammen, die nie vergessen
werden dürfen.

## Mit dem Auftraggeber

- Er schreibt Deutsch, antworte auf Deutsch. Code und Kommentare auf Englisch, Spieltexte auf Deutsch.
- **Erst fragen, dann handeln.** Nichts erstellen, ändern, starten oder umsetzen ohne sein „Ja“.
  Eine Frage von ihm („Kannst du …?“) ist keine Erlaubnis: erst sagen, ob und wie es geht, dann warten.
- Geht etwas nicht genau wie gesagt: anhalten, kurz erklären, Alternative nennen, fragen.
- Nicht mehr bauen als besprochen. Eigene Ideen vorschlagen, aber erst nach Zustimmung umsetzen.
  Was du selbst festgelegt hast (Zahlen, Auslegungen), in der Antwort offen nennen.
- Bei Rückfragen immer einen eigenen Vorschlag mitgeben. Im Zweifel lieber einmal mehr fragen.
- Ehrlich berichten, was getestet wurde (Browser-Emulator) und was nicht (echtes Handy, Klang).

## Bei jeder Änderung am Spiel

1. **Vor größeren Runden ein Backup** nach `Backup/burgwacht-v<Version>/` als eigenen Commit (README 4.5).
2. Nur `burgwacht/src/` bearbeiten – `burgwacht.html` und `android/app/src/main/assets/index.html` werden erzeugt.
3. Code kommentieren und veraltete Kommentare mit korrigieren.
4. Version an drei Stellen erhöhen (README 4.4).
5. Alle Tests aus einem Scratch-Ordner: `burgwacht/tests/run.sh` – nur ausliefern, wenn alles grün ist.
   Neue Funktionen bekommen eigene Prüfungen.
6. APK bauen: `burgwacht/build-apk.sh` (Android-SDK in `/opt/android-sdk`, sonst README 4.3).
7. `burgwacht/burgwacht.html` auf das **bestehende** Artefakt veröffentlichen:
   https://claude.ai/artifact/VDNPywsdLafNYmZQnJ6FWX (URL mitgeben, sonst entsteht ein neuer Link).
8. `burgwacht/android/app/src/main/assets/index.html` und `burgwacht/Burgwacht.apk` an ihn schicken.
9. `burgwacht/README.md` (Werte, Versionsgeschichte, offene Punkte) aktualisieren, committen, pushen.

Hilfsdateien, Probeskripte und Bilder gehören in den Scratchpad-Ordner, nicht ins Repository.
