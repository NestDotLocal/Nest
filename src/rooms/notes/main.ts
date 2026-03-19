import { Router } from "express";
import { type ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { scanRoom, watchRoom } from "../../storage/main";
import { getNotes, getNote, createNote, updateNote, deleteNote, ensureHome } from "./util/notes";

// API Router - handles all /api/notes/* routes
const apiRouter = Router();

apiRouter.get("/", (req, res) => {
    res.json({ room: "notes", status: "ok" });
});

// List all notes
apiRouter.get("/entries", (req, res) => {
    const notes = getNotes();
    res.json(notes);
});

// Create a new note
apiRouter.post("/entries", (req, res) => {
    const { name, content = "", folder = "/" } = req.body;
    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }
    try {
        const entry = createNote(name, content, folder);
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ error: "Failed to create note" });
    }
});

// Get a single note's content
apiRouter.get("/entries/:id", (req, res) => {
    const note = getNote(req.params.id);
    if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json(note);
});

// Update a note's content
apiRouter.patch("/entries/:id", (req, res) => {
    const { content } = req.body;
    if (content === undefined) {
        res.status(400).json({ error: "content is required" });
        return;
    }
    const success = updateNote(req.params.id, content);
    if (!success) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json({ success: true });
});

// Delete a note
apiRouter.delete("/entries/:id", (req, res) => {
    const success = deleteNote(req.params.id);
    if (!success) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json({ success: true });
});

export { apiRouter as api };

// Frontend Router
export const createFrontend = (vite?: ViteDevServer) => {
    const router = Router();

    const serveHtml = async (url: string, res: any, next: any) => {
        try {
            const htmlPath = vite
                ? path.resolve(__dirname, "frontend/index.html")
                : path.resolve(__dirname, "..", "..", "..", "dist", "rooms", "notes", "frontend", "index.html");
            let html = fs.readFileSync(htmlPath, "utf-8");
            if (vite) {
                html = await vite.transformIndexHtml(url, html);
            }
            res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } catch (e) {
            next(e);
        }
    };

    router.get("/", (req, res, next) => {
        serveHtml(req.originalUrl, res, next);
    });

    router.get("/*path", (req, res, next) => {
        const notePath = decodeURIComponent((req.params as any).path.join('/'));
        serveHtml(req.originalUrl, res, next);
    });

    // Let everything else (assets, scripts) fall through to Vite
    router.use((req, res, next) => next());

    return router;
};

export const setup = async () => {
    scanRoom("notes");
    watchRoom("notes");
    ensureHome();
};
