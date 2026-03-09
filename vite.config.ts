import { defineConfig, build } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';

const roomsPath = resolve('src/rooms');

const getRooms = (): string[] => {
    if (!fs.existsSync(roomsPath)) return [];
    return fs.readdirSync(roomsPath, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
};

const rooms = getRooms();

const inputs: Record<string, string> = {};
for (const room of rooms) {
    const htmlPath = resolve(`src/rooms/${room}/frontend/index.html`);
    if (fs.existsSync(htmlPath)) {
        inputs[room] = htmlPath;
    }
}

export default defineConfig({
    root: 'src',
    build: {
        outDir: resolve('dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: inputs,
            output: {
                assetFileNames: 'rooms/[name]/assets/[name]-[hash][extname]',
                chunkFileNames: 'rooms/[name]/assets/[name]-[hash].js',
                entryFileNames: 'rooms/[name]/[name].js',
            }
        }
    }
});