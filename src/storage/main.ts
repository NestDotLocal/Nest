import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import chokidar from "chokidar";
import db from "../db/main";

export interface StorageEntry {
    uuid: string;
    room: string;
    path: string;
    type: "file" | "folder";
    name: string;
    created_at: string;
    updated_at: string;
}

// Convert absolute path to relative storage path
const toRelativePath = (roomDir: string, absPath: string): string =>
    absPath.replace(roomDir, "").replace(/\\/g, "/");

// Insert a single entry into the index if it doesn't exist
const indexEntry = (room: string, roomDir: string, absPath: string, isDir: boolean) => {
    const filePath = toRelativePath(roomDir, absPath);
    const name = path.basename(absPath);

    if (name.startsWith(".")) return; // skip hidden

    const existing = db.instance.query(
        `SELECT uuid FROM storage WHERE room = ? AND path = ?`
    ).get(room, filePath);

    if (!existing) {
        db.instance.run(`
            INSERT INTO storage (uuid, room, path, type, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            randomUUID(),
            room,
            filePath,
            isDir ? "folder" : "file",
            name,
            new Date().toISOString(),
            new Date().toISOString(),
        ]);
        console.log(`[Storage] Indexed: ${filePath}`);
    }
};

// Remove a single entry from the index
const removeEntry = (room: string, roomDir: string, absPath: string, isDir: boolean) => {
    const filePath = toRelativePath(roomDir, absPath);

    if (isDir) {
        db.instance.run(
            `DELETE FROM storage WHERE room = ? AND (path = ? OR path LIKE ?)`,
            [room, filePath, `${filePath}/%`]
        );
    } else {
        db.instance.run(
            `DELETE FROM storage WHERE room = ? AND path = ?`,
            [room, filePath]
        );
    }
    console.log(`[Storage] Removed from index: ${filePath}`);
};

// Scan a room's storage directory and populate the SQLite index
export const scanRoom = (room: string) => {
    const roomDir = path.resolve(`nest/storage/${room}`);

    if (!fs.existsSync(roomDir)) {
        fs.mkdirSync(roomDir, { recursive: true });
        console.log(`[Storage] Created storage directory for: ${room}`);
        return;
    }

    const entries = fs.readdirSync(roomDir, { withFileTypes: true, recursive: true });

    for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
        const absPath = path.join(entry.parentPath, entry.name);
        indexEntry(room, roomDir, absPath, entry.isDirectory());
    }

    console.log(`[Storage] Indexed storage for: ${room}`);
};

// Watch a room's storage directory for external changes
export const watchRoom = (room: string) => {
    const roomDir = path.resolve(`nest/storage/${room}`);

    if (!fs.existsSync(roomDir)) return;

    const watcher = chokidar.watch(roomDir, {
        ignoreInitial: true, // don't re-index on startup, scanRoom handles that
        ignored: /(^|[\/\\])\../, // skip hidden files
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100,
        },
    });

    watcher
        .on('add', (absPath) => indexEntry(room, roomDir, absPath, false))
        .on('addDir', (absPath) => indexEntry(room, roomDir, absPath, true))
        .on('unlink', (absPath) => removeEntry(room, roomDir, absPath, false))
        .on('unlinkDir', (absPath) => removeEntry(room, roomDir, absPath, true))
        .on('error', (err) => console.error(`[Storage] Watcher error:`, err));

    console.log(`[Storage] Watching: nest/storage/${room}`);
};

// List all entries for a room
export const listEntries = (room: string): StorageEntry[] => {
    return db.instance.query(
        `SELECT * FROM storage WHERE room = ? ORDER BY type DESC, name ASC`
    ).all(room) as StorageEntry[];
};

// Get a single entry by path
export const getEntry = (room: string, entryPath: string): StorageEntry | null => {
    return db.instance.query(
        `SELECT * FROM storage WHERE room = ? AND path = ?`
    ).get(room, entryPath) as StorageEntry | null;
};

// Get a single entry by UUID
export const getEntryByUuid = (uuid: string): StorageEntry | null => {
    return db.instance.query(
        `SELECT * FROM storage WHERE uuid = ?`
    ).get(uuid) as StorageEntry | null;
};

// Create a new file entry on disk and in the index
export const createEntry = (
    room: string,
    entryPath: string,
    name: string,
    type: "file" | "folder",
    content: string = ""
): StorageEntry => {
    const roomDir = path.resolve(`nest/storage/${room}`);
    const fullPath = path.join(roomDir, entryPath);
    const now = new Date().toISOString();
    const uuid = randomUUID();

    if (type === "folder") {
        fs.mkdirSync(fullPath, { recursive: true });
    } else {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, "utf-8");
    }

    db.instance.run(`
        INSERT INTO storage (uuid, room, path, type, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [uuid, room, entryPath, type, name, now, now]);

    return { uuid, room, path: entryPath, type, name, created_at: now, updated_at: now };
};

// Update file content on disk and updated_at in the index
export const updateEntry = (
    room: string,
    entryPath: string,
    content: string
): boolean => {
    const roomDir = path.resolve(`nest/storage/${room}`);
    const fullPath = path.join(roomDir, entryPath);
    const now = new Date().toISOString();

    if (!fs.existsSync(fullPath)) return false;

    fs.writeFileSync(fullPath, content, "utf-8");

    db.instance.run(
        `UPDATE storage SET updated_at = ? WHERE room = ? AND path = ?`,
        [now, room, entryPath]
    );

    return true;
};

// Delete a file/folder from disk and the index
export const deleteEntry = (room: string, entryPath: string): boolean => {
    const roomDir = path.resolve(`nest/storage/${room}`);
    const fullPath = path.join(roomDir, entryPath);

    if (!fs.existsSync(fullPath)) return false;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true });
        db.instance.run(
            `DELETE FROM storage WHERE room = ? AND (path = ? OR path LIKE ?)`,
            [room, entryPath, `${entryPath}/%`]
        );
    } else {
        fs.unlinkSync(fullPath);
        db.instance.run(
            `DELETE FROM storage WHERE room = ? AND path = ?`,
            [room, entryPath]
        );
    }

    return true;
};

// Read raw file content from disk
export const readFile = (room: string, entryPath: string): string | null => {
    const roomDir = path.resolve(`nest/storage/${room}`);
    const fullPath = path.join(roomDir, entryPath);

    if (!fs.existsSync(fullPath)) return null;

    return fs.readFileSync(fullPath, "utf-8");
};

// Reconcile any missing files into SQLite index
export const reconcileRoom = (room: string) => {
    const roomDir = path.resolve(`nest/storage/${room}`);
    const entries = listEntries(room);

    for (const entry of entries) {
        const fullPath = path.join(roomDir, entry.path);
        if (!fs.existsSync(fullPath)) {
            // reuse existing delete logic
            db.instance.run(
                `DELETE FROM storage WHERE room = ? AND (path = ? OR path LIKE ?)`,
                [room, entry.path, `${entry.path}/%`]
            );
            console.log(`[Storage] Reconciled (removed ghost): ${entry.path}`);
        }
    }

    console.log(`[Storage] Reconciled storage for: ${room}`);
};