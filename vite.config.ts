import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "node:fs";

const roomsDir = resolve(__dirname, "src/rooms");
const roomEntries = fs.existsSync(roomsDir)
    ? fs
        .readdirSync(roomsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .reduce(
            (acc, dirent) => {
                const roomName = dirent.name;
                const indexPath = resolve(
                    roomsDir,
                    roomName,
                    "frontend/index.html",
                );
                if (fs.existsSync(indexPath)) {
                    acc[roomName] = indexPath;
                }
                return acc;
            },
            {} as Record<string, string>,
        )
    : {};

export default defineConfig({
    root: resolve(__dirname, "src"),
    build: {
        outDir: resolve(__dirname, "dist"),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, "src/app/index.html"),
                ...roomEntries,
            },
        },
    },
});
