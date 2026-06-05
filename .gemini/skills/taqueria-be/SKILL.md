# Skill: Taqueria Persistence & Backend Expert (sql/ & db.js)
Expertise in SQLite schema design and `db.js` persistence logic. Use this skill when modifying database tables, migrations, or data access patterns.

## Efficiency Guidelines
- **Schema First:** Refer to `sql/schema.sql` before suggesting table changes.
- **SQLite Performance:** Use `dbConn.run` for single statements and `dbConn.execute` for batch schema updates.
- **Data Integrity:** Always use parameterized queries (e.g., `?`) to prevent corruption or issues with special characters in JSON strings.

## Sub-agent Instructions
Invoke a sub-agent with this skill context for database migrations or auditing large amounts of historical data.
