import { Router } from "express";
import { type ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import frontmatter from "front-matter";
import db from "../../db/main";
import { randomUUID } from "node:crypto";

const notesDir = path.resolve("nest/storage/notes");

// API Router
const apiRouter = Router();

apiRouter.get("/", (req, res) => {
    res.json({ room: "notes", status: "ok" });
});

apiRouter.get("/entries", (req, res) => {
    const notes = db.instance.query("SELECT * FROM storage").all();
    res.json(notes);
});

apiRouter.post("/entries", (req, res) => {
    const path = req.body.path;
    const type = req.body.type;
    const title = req.body.title;
    const color = req.body.color;
    const created_at = new Date().toISOString();
    const updated_at = new Date().toISOString();

    db.instance.run(``);
});

export { apiRouter as api };

// Frontend Router
export const createFrontend = (vite?: ViteDevServer) => {
    const router = Router();

    router.get("/", async (req, res, next) => {
        try {
            let html = fs.readFileSync(
                path.resolve(__dirname, "frontend/index.html"),
                "utf-8",
            );
            if (vite) {
                html = await vite.transformIndexHtml(req.originalUrl, html);
            }
            res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } catch (e) {
            next(e);
        }
    });

    // Let everything else (assets, scripts) fall through to Vite
    router.use((req, res, next) => next());

    return router;
};

export const setup = async () => {
    if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir, { recursive: true });
        console.log('[Notes] Created storage directory');
        return;
    }

    const entries = fs.readdirSync(notesDir, { withFileTypes: true, recursive: true });

    for (const entry of entries) {
        const filePath = path.join(notesDir, entry.name);
        db.instance.run(`
            INSERT OR IGNORE INTO storage (uuid, room, path, type, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            randomUUID(),
            "notes",
            filePath,
            entry.isDirectory() ? "folder" : "file",
            entry.name,
            new Date().toISOString(),
            new Date().toISOString(),
        ]);
    }
};