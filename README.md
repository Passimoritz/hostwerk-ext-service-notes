# Service notes

Notes and checklists for every service – as its own tab on every detail page and in the right-click menu.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension and an **example of an extension that extends Hostwerk's own pages** (SDK 2.2):

- **Tab on every detail page** – web server, database, Minecraft, app, game server (`contributes.tabs`); Hostwerk passes the service as `Hostwerk.context`.
- **“Note …” in every right-click menu** and **“All notes” in the quick search** (`contributes.actions`, `Hostwerk.on('action')`).
- Overview page with search; checklist lines `- [ ] …` can be ticked off.
- Stored with Hostwerk (`Hostwerk.storage`, max. 256 KB) – no internet, no extra permissions.

## Permissions

| Permission | Why |
|---|---|
| `read:services` | Show service names next to the notes |
| `storage` | Keep the notes |

## Develop

Logic in `page/lib.js` (no DOM), tests: `node --test tests/*.test.js`.

License: MIT
