import path from "node:path";
import { Room } from "@nest/room";
import { getLayout, saveLayout, ensureLayout } from "./util/layout";

export const room = new Room({
    name: "dashboard",
    srcDir: __dirname,
    distDir: path.resolve(__dirname, "..", "..", "..", "dist"),
    ensure: ensureLayout,
});

room.api.get("/", (_req, res) => {
    res.json({ room: "dashboard", status: "ok" });
});

room.api.get("/layout", (_req, res) => {
    res.json(getLayout());
});

room.api.patch("/layout", (req, res) => {
    const layout = req.body;
    if (!Array.isArray(layout)) {
        res.status(400).json({ error: "layout must be an array" });
        return;
    }
    if (!saveLayout(layout)) {
        res.status(500).json({ error: "Failed to save layout" });
        return;
    }
    res.json({ success: true });
});

room.api.get("/widgets", (_req, res) => {
    const widgetDirs = ["clock", "notes", "github", "quicknote"];
    const manifests = widgetDirs
        .map((id) => {
            try {
                return require(`./widgets/${id}/widget.json`);
            } catch {
                return null;
            }
        })
        .filter(Boolean);
    res.json(manifests);
});
