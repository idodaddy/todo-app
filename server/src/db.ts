import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "todos.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// 기존 테이블에 priority 컬럼이 없으면 추가
const columns = db.prepare("PRAGMA table_info(todos)").all() as { name: string }[];
if (!columns.some((col) => col.name === "priority")) {
  db.exec("ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'))");
}

export default db;
