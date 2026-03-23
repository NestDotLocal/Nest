import express from "express";
import db, { resetDatabase } from "../db/main";
import path from "path";
import { loadRooms } from "./util/loader";
import { createServer as createViteServer } from "vite";

const app = express();
const port = Number(process.env.PORT) || 4567;

app.use(express.json());

// Redirect root to dashboard
app.get("/", (_req, res) => res.redirect("/dashboard"));

// Serve global static assets
app.use("/app", express.static(path.join(__dirname, "..", "app")));

// API routes
app.post("/api/nest/reset", (req, res) => {
    resetDatabase();
    res.status(200).json({ message: "Database reset successfully" });
});

app.get("/api/rooms", (req, res) => {
    const rooms = db.instance.query("SELECT * FROM rooms").all();
    res.status(200).json(rooms);
});

if (process.env.NODE_ENV === "production") {
    await loadRooms(app);
    app.use("/", express.static(path.resolve("dist")));
} else {
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom",
    });
    app.use(vite.middlewares);
    await loadRooms(app, vite);
}

app.listen(port, "127.0.0.1", () => {
    console.log(`🪺 Nest is running on port ${port}`);
});

export default app;
