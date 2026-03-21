import { Router } from "express";
import { type ViteDevServer } from "vite";
import path from "node:path";
import { setupRoom } from "@nest/room";
import { createRoomRouter } from "@nest/router";
import {
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    ensureHome,
} from "./util/notes";

// -------------------------
// API
// -------------------------
const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
    res.json({ room: "notes", status: "ok" });
});

apiRouter.get("/entries", (_req, res) => {
    res.json(getNotes());
});

apiRouter.post("/entries", (req, res) => {
    const { name, content = "", folder = "/" } = req.body;
    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }
    try {
        res.status(201).json(createNote(name, content, folder));
    } catch {
        res.status(500).json({ error: "Failed to create note" });
    }
});

apiRouter.get("/entries/:id", (req, res) => {
    const note = getNote(req.params.id);
    if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json(note);
});

apiRouter.patch("/entries/:id", (req, res) => {
    const { content } = req.body;
    if (content === undefined) {
        res.status(400).json({ error: "content is required" });
        return;
    }
    if (!updateNote(req.params.id, content)) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json({ success: true });
});

apiRouter.delete("/entries/:id", (req, res) => {
    if (!deleteNote(req.params.id)) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json({ success: true });
});

export { apiRouter as api };

// -------------------------
// Frontend
// -------------------------
export const createFrontend = (vite?: ViteDevServer) =>
    createRoomRouter({
        roomName: "notes",
        srcDir: __dirname,
        distPath: path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "dist",
            "rooms",
            "notes",
            "frontend",
            "index.html",
        ),
        vite,
    });

// -------------------------
// Setup
// -------------------------
export const setup = async (): Promise<void> => {
    setupRoom({ room: "notes", ensure: ensureHome });
};
