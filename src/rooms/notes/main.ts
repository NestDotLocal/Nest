import { Router } from "express";
import { type ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";

// API Router
const apiRouter = Router();

apiRouter.get("/", (req, res) => {
    res.json({ room: "notes", status: "ok" });
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
