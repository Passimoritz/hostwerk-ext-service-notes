![Service notes](banner.svg)

# Service notes

Notes and checklists for every service – as its own tab on every detail page and in the right-click menu.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension and an **example of an extension that extends Hostwerk's own pages** (SDK 2.2):

- **Tab on every detail page** – web server, database, Minecraft, app, game server (`contributes.tabs`), plus one in the mail area for the mail catcher; Hostwerk passes the service as `Hostwerk.context`.
- **“Note …” in every right-click menu**, in the quick search and in Hostwerk's **“New” menu** (without a service you pick one first), **“All notes”** in the quick search and on **Ctrl+Alt+N** (`contributes.actions`, `contributes.new`, `contributes.shortcuts`).
- Saves by itself while you type – switching tabs or pages never loses anything.
- Overview page with search and delete (also notes of services that no longer exist); checklist lines `- [ ] …` can be ticked off.
- Simple, safe formatting: `**bold**`, backticks for code, `# heading` and web links (they open in the browser after asking) – nothing in a note ever becomes HTML.
- Stored with Hostwerk (`Hostwerk.storage`, max. 256 KB) – the page shows how much is used and says clearly when it is full. Everyone who uses this Hostwerk (also your team) sees the same notes.
- **In the knowledge graph** (Hostwerk 3.0+): every note becomes a node, linked to the projects of its web server or app – Claude and the knowledge graph page find it with the code.
- Other extensions may add tabs (`"allowExtensions": { "*": ["tabs"] }`) – the [add-on template](https://github.com/Passimoritz/hostwerk-ext-template-extend) adds a “Checklist” tab here.

## Permissions

**Where:** the “Notes” tab of every service – no own sidebar entry since 1.3.1; the full page stays under Extensions → Open

| Permission | Why |
|---|---|
| `read:services` | Show service names next to the notes (also game servers and the mail catcher) |
| `storage` | Keep the notes |
| `change:knowledge` | Put the notes into Hostwerk's knowledge graph as nodes (Hostwerk 3.0+, no prompt – only the graph's own data) |

## Develop

Logic in `page/lib.js` (no DOM), tests: `node --test tests/*.test.js`.

License: MIT
