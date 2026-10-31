# KeyQueue – Passwort-Liste für GitHub Pages

KeyQueue ist eine kleine, reduzierte Web-App, die eine TXT-Datei mit Passwort-Codes lädt und jeden Eintrag über einen Kopierbutton rechts nacheinander aus der Liste entfernt.

## Funktionsweise

1. Eine `.txt`-Datei auswählen (ein Passwort pro Zeile).
2. Die Passwörter erscheinen in exakt derselben Reihenfolge wie in der Datei.
3. Rechts neben einem Passwort auf **Kopieren** tippen. **Nur das Passwort** (ohne Nummerierung) wird kopiert.
4. Erst nach erfolgreichem Kopieren verschwindet die Zeile. Bei Kopierfehler bleibt sie sichtbar.
5. Die Liste rückt automatisch nach. Die **Seite selbst scrollt nicht**; bei langen Listen scrollt ausschließlich die Liste im dafür vorgesehenen Bereich.
6. Mit einer neuen Datei beginnt die Liste von vorne. "Leeren" verwirft die aktuelle Liste.

## Passwortregeln

- 8–10 Zeichen
- Mindestens ein Großbuchstabe, ein Kleinbuchstabe, eine Ziffer, ein Sonderzeichen
- Erlaubt sind alle druckbaren ASCII-Sonderzeichen (zum Beispiel `! @ # $ % & * ? + - _ = ; :`). Der Agenten-Prompt verwendet eine bewusst kleinere, gut kompatible Auswahl.
- Nur ASCII, keine Leerzeichen
- Ungültige und doppelte Einträge werden beim Laden übersprungen.
- Optional werden Nummerierungen wie `1. CODE` erkannt und entfernt, **vor dem Kopieren**. Empfohlen ist **keine Nummerierung in der Datei**.

## Beispieldatei und Prompt

- `BEISPIEL_120_PASSWOERTER.txt` enthält 120 zufällig generierte **Demo-Codes** für einen schnellen Test. **Nicht als echte Kontopasswörter verwenden**, weil die Beispieldatei öffentlich mit diesem ZIP verbreitet wird.
- `AGENT_PROMPT.txt` enthält einen sofort verwendbaren Prompt für einen Agenten, um eine eigene, kompatible Datei zu erzeugen.

## Installation via GitHub Pages

1. Auf GitHub ein **öffentliches Repository** z. B. `keyqueue` anlegen.
2. `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, die Icons und die weiteren Dateien hochladen – **nicht die ZIP als eine Datei**.
3. Unter **Settings → Pages → Build and deployment** die Option **Deploy from a branch** auswählen, Branch `main`, Verzeichnis `/(root)`, anschließend speichern.
4. Danach ist die App unter `https://DEINNAME.github.io/keyqueue/` erreichbar.

## Datenschutz und Hinweise

- Kein Backend, keine Anmeldung, keine externe Bibliothek. Der Dateitext wird lokal im Browser eingelesen und verarbeitet; die App überträgt ihn nicht an einen Server.
- Keine dauerhafte Speicherung der importierten Liste. Ein Neuladen der Website verwirft sie. Exportiere nicht benötigte echte Passwörter nicht öffentlich ins GitHub-Repository.
- Wie bei jeder Anwendung kann ein installierter Browser oder eine Betriebssystemfunktion Clipboard-Inhalte verarbeiten; die App löscht den letzten kopierten Code nicht automatisch aus der systemweiten Zwischenablage.
- **8–10 Zeichen** sind exakt für dieses gewünschte Format ausgelegt. Für echte, langfristig genutzte Konten sind im Allgemeinen längere Passwörter empfehlenswert.
- Die mobile Seite ist auf eine konstante Bildschirmgröße ausgelegt, ohne automatisches Zoomen beim Tippen.
