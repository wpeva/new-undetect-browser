/**
 * Database connection and initialization
 * Using SQLite for simplicity and portability
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

/**
 * Initialize database connection
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'undetect.db');

  // Ensure data directory exists
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON;');

  // Create tables
  await createTables(db);

  console.log('✅ Database initialized successfully');
  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Create all required tables
 */
async function createTables(database: Database): Promise<void> {
  // Profiles table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_id TEXT,
      status TEXT DEFAULT 'idle',
      user_agent TEXT,
      fingerprint TEXT,
      proxy_id TEXT,
      cookies TEXT,
      local_storage TEXT,
      session_storage TEXT,
      tags TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_used INTEGER,
      use_count INTEGER DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES profile_groups(id) ON DELETE SET NULL,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    );
  `);

  // Profile groups table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS profile_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6',
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Proxies table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      country TEXT,
      city TEXT,
      status TEXT DEFAULT 'unchecked',
      last_checked INTEGER,
      speed INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Automation tasks table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS automation_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profile_id TEXT,
      script TEXT NOT NULL,
      schedule TEXT,
      status TEXT DEFAULT 'pending',
      last_run INTEGER,
      next_run INTEGER,
      runs_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  // Activity logs table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  // Sessions table (for active browser sessions)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      pid INTEGER,
      port INTEGER,
      status TEXT DEFAULT 'active',
      start_time INTEGER DEFAULT (strftime('%s', 'now')),
      end_time INTEGER,
      pages_visited INTEGER DEFAULT 0,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  // Settings table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Create indices for better performance
  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
    CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at);
    CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON automation_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_logs_profile ON activity_logs(profile_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id);
  `);

  console.log('✅ Database tables created successfully');
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}
