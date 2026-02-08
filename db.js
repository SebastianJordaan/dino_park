const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// 1. Get the path from Docker Environment Variable
// If not set, it defaults to 'park.db' in the current folder (for local testing)
const DB_PATH = process.env.DB_FILE || path.join(__dirname, "park.db");

console.log(`[DB Init] Attempting to connect to: ${DB_PATH}`);

// 2. IMPORTANT: Create the folder structure if it doesn't exist
// Docker mounts the volume, but sometimes the internal folder needs a nudge
const dirName = path.dirname(DB_PATH);
if (!fs.existsSync(dirName)) {
  console.log(`[DB Init] Directory ${dirName} not found. Creating it...`);
  try {
    fs.mkdirSync(dirName, { recursive: true });
  } catch (err) {
    console.error(`[DB Error] Could not create directory: ${err.message}`);
  }
}

// 3. Connect to Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(`[DB Error] Failed to open ${DB_PATH}:`, err.message);
  } else {
    console.log(`[DB Success] Connected to database at ${DB_PATH}`);
  }
});

// 4. Initialize Tables
db.serialize(() => {
  // WAL mode helps with multiple services writing at once
  db.run("PRAGMA journal_mode = WAL;");

  db.run(`CREATE TABLE IF NOT EXISTS dinos (
    id INTEGER PRIMARY KEY,
    name TEXT,
    species TEXT,
    gender TEXT,
    digestion_period_in_hours INTEGER,
    herbivore BOOLEAN,
    time TEXT,
    park_id INTEGER,
    location TEXT,
    lastFed TEXT,
    is_hungry BOOLEAN
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS grid (
    location TEXT PRIMARY KEY,
    lastVisited TEXT,
    maintenanceDue TEXT,
    repair_required BOOLEAN,
    lastMaintenance TEXT,
    grid_status TEXT
  )`);

  // Initialize grid only if empty
  db.get("SELECT COUNT(*) as count FROM grid", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("[DB Init] Seeding grid...");
      const columns = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
      const rows = Array.from({ length: 16 }, (_, i) => i + 1);
      const stmt = db.prepare("INSERT INTO grid (location, grid_status) VALUES (?, ?)");
      
      db.parallelize(() => {
        for (const col of columns) {
          for (const r of rows) {
             stmt.run(`${col}${r}`, "NA");
          }
        }
      });
      stmt.finalize();
    }
  });
});

module.exports = db;