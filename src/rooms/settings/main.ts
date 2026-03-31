import { Room } from "@nest/room";
import path from 'node:path';
import db from "../../db/main";

export const room = new Room({
    name: "settings",
    srcDir: __dirname,
    distDir: path.join("..", "..", "..", "..", "dist")
});

const settingsCategories = [
    {
        name: "General",
        id: "general"
    }
];

room.api.get("/categories", (req, res) => {
    res.json(settingsCategories);
});