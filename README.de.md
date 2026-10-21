![Dienst-Notizen](banner.svg)

# Dienst-Notizen

Notizen und Checklisten zu jedem Dienst – als eigener Reiter auf jeder Detailseite und im Rechtsklick-Menü.

Eine offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung und ein **Beispiel für eine Erweiterung, die Hostwerks eigene Seiten erweitert** (SDK 2.2):

- **Reiter auf jeder Detailseite** – Webserver, Datenbank, Minecraft, App, Spiele-Server (`contributes.tabs`), dazu einer im Mail-Bereich für den Mail-Fänger; Hostwerk übergibt den Dienst als `Hostwerk.context`.
- **„Notiz …“ in jedem Rechtsklick-Menü**, in der Schnellsuche und im **„Neu“-Menü** von Hostwerk (ohne Dienst wählst du erst einen), **„Alle Notizen“** in der Schnellsuche und auf **Strg+Alt+N** (`contributes.actions`, `contributes.new`, `contributes.shortcuts`).
- Speichert beim Tippen von selbst – beim Wechsel von Reiter oder Seite geht nichts verloren.
- Übersichtsseite mit Suche und Löschen (auch Notizen zu Diensten, die es nicht mehr gibt); Checklisten-Zeilen `- [ ] …` lassen sich abhaken.
- Einfache, sichere Formatierung: `**fett**`, Backticks für Code, `# Überschrift` und Weblinks (öffnen nach Rückfrage im Browser) – nichts in einer Notiz wird je zu HTML.
- Gespeichert bei Hostwerk (`Hostwerk.storage`, max. 256 KB) – die Seite zeigt, wie viel belegt ist, und sagt deutlich, wenn er voll ist. Alle, die dieses Hostwerk nutzen (auch dein Team), sehen dieselben Notizen.
- Andere Erweiterungen dürfen Reiter ergänzen (`"allowExtensions": { "*": ["tabs"] }`) – die [Zusatz-Vorlage](https://github.com/Passimoritz/hostwerk-ext-template-extend) setzt hier einen Reiter „Merkliste“ dazu.

## Rechte

| Recht | Wofür |
|---|---|
| `read:services` | Dienstnamen neben den Notizen anzeigen (auch Spiele-Server und Mail-Fänger) |
| `storage` | Notizen aufbewahren |

## Entwickeln

Logik in `page/lib.js` (ohne DOM), Tests: `node --test tests/*.test.js`.

Lizenz: MIT
