---
name: taqueria-dev
description: Workflow for TaqueriaPOS development. Use this skill when modifying core logic, SQLite persistence, or UI templates in TaqueriaPOS to ensure context efficiency and project consistency.
---

# Taqueria Dev Skill

## Architecture Overview
- **Frontend:** Single Page Application (SPA) using Vanilla JS/CSS.
- **Routing:** `router.js` handles view switching and sidebars.
- **Persistence:** `db.js` uses `@capacitor-community/sqlite` for native and Mock for web.
- **Sync:** `sync.js` implements a local HTTP server and discovery via ZeroConf/UDP.

## Optimization Strategy (Saving Quota)
- **Use Sub-agents:** For batch edits (e.g., updating all templates in `router.js`), use `invoke_agent('generalist', ...)`.
- **Reference DB Schema:** Instead of reading `db.js` to see tables, use `references/db_schema.md`.
- **Targeted Reads:** Always use `start_line` and `end_line` when reading `router.js` or `style.css` as they are large.

## Common Workflows
1. **Adding a View:**
   - Update `router.js` to add the template string.
   - Add the navigation button in `app.js` (startUI).
   - Add logic in `router.js` (render function).
2. **DB Migration:**
   - Update `sql/schema.sql`.
   - Update `db.js` (createTables and seedData).
3. **Sync Debugging:**
   - Check `sync.js` `startServer` and `broadcast`.
   - Verify `capacitor-community/http-server` plugin usage.

## Resources
- [DB Schema](references/db_schema.md): Detailed table definitions and seed data.
