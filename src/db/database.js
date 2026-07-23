const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'eval.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
    db.run(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    persist();
  }

  return db;
}

function persist() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function getDb() {
  if (!db) throw new Error('Database has not been initialized yet. Call initDb() first.');
  return db;
}

// Returns every matching row as a plain object.
function all(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Returns the first matching row, or undefined.
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0];
}

// Runs an INSERT/UPDATE/DELETE, persists to disk, and returns the last insert id.
function run(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const [{ id } = {}] = all('SELECT last_insert_rowid() AS id');
  persist();
  return id;
}

module.exports = { initDb, getDb, all, get, run, persist, DB_PATH };
