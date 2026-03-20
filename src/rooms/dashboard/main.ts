import { Router } from "express";
import { type ViteDevServer } from "vite";
import path from "node:path";
import { setupRoom } from "@nest/room";
import { createRoomRouter } from "@nest/router";
import { getLayout, saveLayout, ensureLayout } from "./util/layout";

// -------------------------
// API
// -------------------------
const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
    res.json({ room: "dashboard", status: "ok" });
});

apiRouter.get("/layout", (_req, res) => {
    res.json(getLayout());
});

apiRouter.patch("/layout", (req, res) => {
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

apiRouter.get("/widgets", (_req, res) => {
    // Return available widget manifests — read from widget.json files at runtime
    // to avoid bundling server-side widget code on the client
    const widgetDirs = ["clock", "notes", "github", "quicknote"];
    const manifests = widgetDirs.map(id => {
        try {
            return require(`./widgets/${id}/widget.json`);
        } catch {
            return null;
        }
    }).filter(Boolean);
    res.json(manifests);
});

export { apiRouter as api };

// -------------------------
// Frontend
// -------------------------
export const createFrontend = (vite?: ViteDevServer) =>
    createRoomRouter({
        roomName: "dashboard",
        srcDir: __dirname,
        distPath: path.resolve(__dirname, "..", "..", "..", "dist", "rooms", "dashboard", "frontend", "index.html"),
        vite,
    });

// -------------------------
// Setup
// -------------------------
export const setup = async (): Promise<void> => {
    setupRoom({ room: "dashboard", ensure: ensureLayout });
};
