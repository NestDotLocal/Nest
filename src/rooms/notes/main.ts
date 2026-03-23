import path from "node:path";
import { Room } from "@nest/room";
import {
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    ensureHome,
} from "./util/notes";

export const room = new Room({
    name: "notes",
    srcDir: __dirname,
    distDir: path.resolve(__dirname, "..", "..", "..", "dist"),
    ensure: ensureHome,
});

room.api.get("/", (_req, res) => {
    res.json({ room: "notes", status: "ok" });
});

room.api.get("/entries", (_req, res) => {
    res.json(getNotes());
});

room.api.post("/entries", (req, res) => {
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

room.api.get("/entries/:id", (req, res) => {
    const note = getNote(req.params.id);
    if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json(note);
});

room.api.patch("/entries/:id", (req, res) => {
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

room.api.delete("/entries/:id", (req, res) => {
    if (!deleteNote(req.params.id)) {
        res.status(404).json({ error: "Note not found" });
        return;
    }
    res.json({ success: true });
});
