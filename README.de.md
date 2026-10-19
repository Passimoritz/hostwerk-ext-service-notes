![Dienst-Notizen](banner.svg)

# Dienst-Notizen

Notizen und Checklisten zu jedem Dienst – als eigener Reiter auf jeder Detailseite und im Rechtsklick-Menü.

Eine offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung und ein **Beispiel für eine Erweiterung, die Hostwerks eigene Seiten erweitert** (SDK 2.2):

- **Reiter auf jeder Detailseite** – Webserver, Datenbank, Minecraft, App, Spiele-Server (`contributes.tabs`); Hostwerk übergibt den Dienst als `Hostwerk.context`.
- **„Notiz …“ in jedem Rechtsklick-Menü** und **„Alle Notizen“ in der Schnellsuche** (`contributes.actions`, `Hostwerk.on('action')`).
- Übersichtsseite mit Suche; Checklisten-Zeilen `- [ ] …` lassen sich abhaken.
- Gespeichert bei Hostwerk (`Hostwerk.storage`, max. 256 KB) – kein Internet, keine weiteren Rechte.

## Rechte

| Recht | Wofür |
|---|---|
| `read:services` | Dienstnamen neben den Notizen anzeigen |
| `storage` | Notizen aufbewahren |

## Entwickeln

Logik in `page/lib.js` (ohne DOM), Tests: `node --test tests/*.test.js`.

Lizenz: MIT
