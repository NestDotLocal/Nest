import { type Express } from "express";
import { type ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";

export const loadApps = async (app: Express, vite?: ViteDevServer) => {
    const appsPath = path.resolve("src/rooms");
    if (!fs.existsSync(appsPath)) return;

    const reserved = ["static", "api", "favicon.ico"];
    const entries = fs.readdirSync(appsPath, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const roomName = entry.name;

        if (reserved.includes(roomName)) {
            console.warn(`[Router] Skipping reserved name: ${roomName}`);
            continue;
        }

        const appDir = path.join(appsPath, roomName);
        const mainPath = path.join(appDir, "main.ts");

        if (!fs.existsSync(mainPath)) {
            console.warn(`[Router] No main.ts found for: ${roomName}`);
            continue;
        }

        try {
            const module = await import(mainPath);
            const { api, createFrontend } = module;

            if (api) {
                app.use(`/api/${roomName}`, api);
                console.log(`[API] Loaded: /api/${roomName}`);
            } else {
                console.warn(`[API] No api export for: ${roomName}`);
            }

            if (createFrontend) {
                const router = createFrontend(vite);
                app.use(`/${roomName}`, router);
                console.log(`[Frontend] Loaded: /${roomName}`);
            } else {
                console.warn(
                    `[Frontend] No createFrontend export for: ${roomName}`,
                );
            }
        } catch (err) {
            console.error(`[Router] Failed to load: ${roomName}`, err);
        }

        console.log(`[Router] Loaded room: ${roomName}`);
    }
};
