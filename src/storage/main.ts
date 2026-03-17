import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
        // Skip hidden files and symlinks
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;

        const filePath = path.join(entry.parentPath, entry.name)
            .replace(roomDir, "")
            .replace(/\\/g, "/");

        db.instance.run(`
            INSERT OR IGNORE INTO storage (uuid, room, path, type, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            randomUUID(),
            room,
            filePath,
            entry.isDirectory() ? "folder" : "file",
            entry.name,
            new Date().toISOString(),
            new Date().toISOString(),
        ]);
    }

    console.log(`[Storage] Indexed storage for: ${room}`);
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
        // Remove folder and all children from index
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
