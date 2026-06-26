import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'database.db');
const LEGACY_JSON_PATH = path.join(process.cwd(), 'database.json');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS predictions (
      userId TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  migrateFromLegacyJSON();
}

function migrateFromLegacyJSON() {
  // Only migrate if we have the old JSON and the DB is empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const countRow = countStmt.get() as { count: number };
  if (countRow.count > 0) return;

  if (fs.existsSync(LEGACY_JSON_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf-8'));
      console.log('Migrating data from database.json to SQLite...');

      const insertUser = db.prepare('INSERT INTO users (id, email, createdAt) VALUES (?, ?, ?)');
      const insertHistory = db.prepare('INSERT INTO history (id, userId, domain, category, timestamp) VALUES (?, ?, ?, ?, ?)');
      const insertPrediction = db.prepare('INSERT INTO predictions (userId, state) VALUES (?, ?)');

      db.transaction(() => {
        if (data.users) {
          for (const u of data.users) {
            insertUser.run(u.id, u.email, u.createdAt);
          }
        }
        if (data.history) {
          for (const h of data.history) {
            insertHistory.run(h.id, h.userId, h.domain, h.category, h.timestamp);
          }
        }
        if (data.predictions) {
          for (const [userId, state] of Object.entries(data.predictions)) {
            insertPrediction.run(userId, JSON.stringify(state));
          }
        }
      })();
      console.log('Migration complete. Leaving database.json as a backup.');
    } catch (e) {
      console.error('Error migrating database.json:', e);
    }
  } else {
    // Seed default user
    const DEFAULT_USER_ID = "user_devanshi1896";
    const DEFAULT_USER_EMAIL = "devanshi1896@gmail.com";
    try {
      db.prepare('INSERT INTO users (id, email, createdAt) VALUES (?, ?, ?)').run(DEFAULT_USER_ID, DEFAULT_USER_EMAIL, new Date().toISOString());
    } catch (e) {
      // Ignore if exists
    }
  }
}

// Queries
export function getUsers() {
  return db.prepare('SELECT * FROM users').all();
}

export function getUser(id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function addUser(id: string, email: string) {
  const stmt = db.prepare('INSERT OR IGNORE INTO users (id, email, createdAt) VALUES (?, ?, ?)');
  stmt.run(id, email, new Date().toISOString());
}

export function getHistory(userId: string) {
  return db.prepare('SELECT * FROM history WHERE userId = ? ORDER BY timestamp DESC').all(userId);
}

export function addHistoryItem(item: { id: string, userId: string, domain: string, category: string, timestamp: string }) {
  const stmt = db.prepare('INSERT INTO history (id, userId, domain, category, timestamp) VALUES (?, ?, ?, ?, ?)');
  stmt.run(item.id, item.userId, item.domain, item.category, item.timestamp);
}

export function deleteHistoryItem(id: string) {
  const stmt = db.prepare('DELETE FROM history WHERE id = ?');
  stmt.run(id);
}

export function deleteHistoryForUser(userId: string) {
  const stmt = db.prepare('DELETE FROM history WHERE userId = ?');
  stmt.run(userId);
}

export function getPredictionState(userId: string): any {
  const row = db.prepare('SELECT state FROM predictions WHERE userId = ?').get(userId) as { state: string };
  return row ? JSON.parse(row.state) : null;
}

export function savePredictionState(userId: string, state: any) {
  const stmt = db.prepare('INSERT INTO predictions (userId, state) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET state = excluded.state');
  stmt.run(userId, JSON.stringify(state));
}
