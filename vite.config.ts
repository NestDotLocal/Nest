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

const alias = {
    "@nest/storage": resolve(__dirname, "src/lib/storage.ts"),
    "@nest/room": resolve(__dirname, "src/lib/room.ts"),
    "@nest/router": resolve(__dirname, "src/lib/router.ts"),
    "@nest/cache": resolve(__dirname, "src/shared/cache.ts"),
    "@nest/toast": resolve(__dirname, "src/shared/toast.ts"),
    "@nest/keys": resolve(__dirname, "src/shared/keys.ts"),
    "@nest/sidebar": resolve(__dirname, "src/shared/sidebar.ts"),
};

export default defineConfig({
    root: resolve(__dirname, "src"),
    resolve: { alias },
    server: {
        hmr: { port: 4568 },
    },
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
