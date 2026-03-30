import { Room } from "@nest/room";
import path from 'node:path';

export const room = new Room({
    name: "settings",
    srcDir: __dirname,
    distDir: path.join("..", "..", "..", "..", "dist")
})

