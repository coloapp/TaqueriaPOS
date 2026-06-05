# Skill: Taqueria Frontend Expert (www/)
Expertise in Vanilla JS SPA architecture, router.js, and CSS styling. Use this skill when modifying the user interface, navigation logic, or frontend components.

## Efficiency Guidelines
- **Template Management:** Frontend templates are strings in `router.js`. Always use targeted `replace` for specific HTML sections instead of reading the whole file.
- **State Flow:** User and order state are kept in the `router` object. Ensure updates to `ordenActual` are reflected in `refreshOrderList()`.
- **UI Responsiveness:** Layout splitting for tablets is handled via CSS media queries (>900px).

## Sub-agent Instructions
Invoke a sub-agent with this skill context for batch UI refactors or style consistency checks.
