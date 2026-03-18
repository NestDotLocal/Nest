import { Router } from "express";
import { type ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { scanRoom, listEntries, getEntry, createEntry, updateEntry, deleteEntry, readFile } from "../../storage/main";

// API Router
const apiRouter = Router();

apiRouter.get("/", (req, res) => {
    res.json({ room: "notes", status: "ok" });
});

// List all notes
apiRouter.get("/entries", (req, res) => {
    const notes = listEntries("notes");
    res.json(notes);
});

// Create a new note
apiRouter.post("/entries", (req, res) => {
    const { name, content = "" } = req.body;

    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    const entryPath = `/${name}.md`;

    try {
        const entry = createEntry("notes", entryPath, name, "file", content);
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ error: "Failed to create note" });
    }
});

// Get a single note's content
apiRouter.get("/entries/:id", (req, res) => {
    const entry = getEntry("notes", `/${req.params.id}`);
    if (!entry) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    const content = readFile("notes", entry.path);
    res.json({ ...entry, content });
});

// Update a note's content
apiRouter.patch("/entries/:id", (req, res) => {
    const { content } = req.body;
    if (content === undefined) {
        res.status(400).json({ error: "content is required" });
        return;
    }
    const entry = getEntry("notes", `/${req.params.id}`);
    if (!entry) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    const success = updateEntry("notes", entry.path, content);
    if (!success) {
        res.status(500).json({ error: "Failed to update note" });
        return;
    }
    res.json({ success: true });
});

// Delete a note
apiRouter.delete("/entries/:id", (req, res) => {
    const entry = getEntry("notes", `/${req.params.id}`);
    if (!entry) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    const success = deleteEntry("notes", entry.path);
    if (!success) {
        res.status(500).json({ error: "Failed to delete note" });
        return;
    }
    res.json({ success: true });
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
    scanRoom("notes");
};
