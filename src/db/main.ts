import Database from "bun:sqlite";
import fs from "fs";
import path from "path";

const dbPath = path.join(__dirname, "..", "..", "nest", "nest.db");
let db = new Database(dbPath);

function initializeDatabase() {
    db.run(`
    CREATE TABLE IF NOT EXISTS nest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      last_update TEXT NOT NULL,
      first_run INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    const meta: any[] = db.query("SELECT * FROM nest LIMIT 1").all();
    const isFirstRun = meta.length === 0 || meta[0].first_run === 1;

    if (isFirstRun) {
        console.log("First time running Nest! Initializing database...");

        db.run(
            "INSERT INTO nest (version, last_update, first_run) VALUES (?, ?, 0)",
            ["0.1.0", new Date().toISOString()],
        );

        db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT,
                content TEXT,
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(room_id) REFERENCES rooms(id)
            )
        `);

        const roomsDir = path.join(__dirname, "..", "rooms");
        fs.readdirSync(roomsDir).forEach((room) => {
            const roomPath = path.join(roomsDir, room);
            if (!fs.lstatSync(roomPath).isDirectory()) return;
            db.run("INSERT OR IGNORE INTO rooms (name) VALUES (?)", [room]);
        });

        console.log("Welcome to Nest!");
    }
}

initializeDatabase();

export function resetDatabase() {
    if (!process.env.NODE_ENV || !(process.env.NODE_ENV === "development")) {
        console.warn(
            "Not in development environnment, refusing to reset database",
        );
        return;
    }

    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    db = new Database(dbPath);
    initializeDatabase();
}

export default db;
