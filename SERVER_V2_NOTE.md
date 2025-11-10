# 📝 Server v2 Notes

## Important: Optional Dependencies

The enhanced server v2 uses SQLite database, which requires native compilation.
SQLite dependencies are marked as **optional** to prevent CI failures.

## Installation for v2 Server

If you want to use the enhanced server v2 with database features:

```bash
# Install optional SQLite dependencies
npm install sqlite sqlite3

# Build the project
npm run build

# Run v2 server
npm run server:v2
```

## Without SQLite

The main antidetect browser features work without SQLite.
The database is only required for the enhanced REST API server (v2).

```bash
# Use original server (no database required)
npm run server

# Or use the library directly in your code
import { createBrowser } from 'undetect-browser';
```

## CI/CD

GitHub Actions workflows will skip SQLite installation automatically
since it's marked as optional dependency. This ensures CI passes
even if SQLite compilation fails.
