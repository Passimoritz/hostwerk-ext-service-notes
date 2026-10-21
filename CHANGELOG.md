# Changelog

## 1.3.1

- Lives where it belongs: the “Notes” tab of every service – no own sidebar entry any more (Hostwerk 3.0+); the full page stays under Extensions → Open and can be pinned in the sidebar settings. / Steckt jetzt dort, wo sie hingehört: Reiter „Notizen“ jedes Dienstes – kein eigener Seitenleisten-Eintrag mehr (Hostwerk 3.0+); die ganze Seite bleibt unter Erweiterungen → Öffnen und lässt sich in den Seitenleisten-Einstellungen anheften.

## 1.3.0

- Notes as nodes in Hostwerk's knowledge graph (Hostwerk 3.0, SDK 3.1 `PUT /knowledge/notes`): each note is linked to the projects its web server or app belongs to and shows up in the source “Notes from Hostwerk”; classes a note names get an edge. Older Hostwerk: nothing changes. New permission `change:knowledge` (no prompt, only the graph's own data). / Notizen als Knoten im Wissensgraph – verknüpft mit den Projekten ihres Webservers bzw. ihrer App; neues Recht `change:knowledge` (ohne Rückfrage).

## 1.2.0

- Game servers and the mail catcher are full services now: names, "Open" button, no more "Service no longer exists"; a notes tab in the mail area. / Spiele-Server und Mail-Fänger vollständig unterstützt.
- Saves by itself while typing and before switching tabs – nothing unsaved gets lost. / Speichert von selbst, nichts geht beim Reiterwechsel verloren.
- The 256 KB storage limit is visible (usage on the page, clear message when full); save errors are caught. / Speichergrenze sichtbar, Fehler abgefangen.
- Notes can be deleted, also those of services that no longer exist. / Notizen löschbar, auch verwaiste.
- Safe formatting: bold, code, headings and links. / Sichere Formatierung mit Links.
- "New note" from the quick search and Hostwerk's "New" menu lets you pick a service; shortcut Ctrl+Alt+N for all notes; own place in the sidebar (`page.nav`). / „Neue Notiz“ mit Dienstauswahl, Kürzel, Platz in der Seitenleiste.
- Other extensions may add tabs (`allowExtensions`). / Andere Erweiterungen dürfen Reiter ergänzen.
- Error states with "Try again", dates in Hostwerk's language, sizes from the design scale. / Fehlerzustände, Datum in Hostwerks Sprache, Design-Skala.

## 1.1.1

- Own category “productivity” instead of “other”. / Eigene Kategorie „productivity“ statt „Sonstiges“.

## 1.1.0

- New animated icon and a banner for Hostwerk's new extension page. / Neues bewegtes Symbol und ein Banner für die neue Erweiterungsseite.

## 1.0.0

- First release: notes per service as a tab on every detail page, right-click action, overview with search, checklists. / Erste Fassung.
