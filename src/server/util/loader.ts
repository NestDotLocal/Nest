import { type Express } from "express";
import { type ViteDevServer } from "vite";
import { type Room } from "@nest/room";
import fs from "node:fs";
import path from "node:path";

export const loadRooms = async (app: Express, vite?: ViteDevServer) => {
    const roomsPath = path.resolve("src/rooms");
    if (!fs.existsSync(roomsPath)) return;

    const reserved = ["static", "api", "favicon.ico"];
    const entries = fs.readdirSync(roomsPath, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const roomName = entry.name;

        if (reserved.includes(roomName)) {
            console.warn(`[Loader] Skipping reserved name: ${roomName}`);
            continue;
        }

        const mainPath = path.join(roomsPath, roomName, "main.ts");

        if (!fs.existsSync(mainPath)) {
            console.warn(`[Loader] No main.ts found for: ${roomName}`);
            continue;
        }

        try {
            const module = await import(mainPath);
            const room: Room | undefined = module.room;

            if (!room) {
                console.warn(`[Loader] No room export for: ${roomName}`);
                continue;
            }

            room.mount(app, vite);
            room.setup();
        } catch (err) {
            console.error(`[Loader] Failed to load: ${roomName}`, err);
        }
    }
};
