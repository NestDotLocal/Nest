import {
    Router,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import { type ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";

interface RoomRouterOptions {
    roomName: string;
    srcDir: string; // __dirname of the room's main.ts
    distPath: string; // absolute path to the built index.html in dist
    vite?: ViteDevServer;
}

export const createRoomRouter = ({
    roomName,
    srcDir,
    distPath,
    vite,
}: RoomRouterOptions): Router => {
    const router = Router();

    const serveHtml = async (
        url: string,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const htmlPath = vite
                ? path.resolve(srcDir, "frontend/index.html")
                : distPath;
            let html = fs.readFileSync(htmlPath, "utf-8");
            if (vite) html = await vite.transformIndexHtml(url, html);
            res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } catch (e) {
            next(e);
        }
    };

    router.get("/", (req: Request, res: Response, next: NextFunction) => {
        serveHtml(req.originalUrl, res, next);
    });

    router.get("/*path", (req: Request, res: Response, next: NextFunction) => {
        serveHtml(req.originalUrl, res, next);
    });

    router.use((_req: Request, _res: Response, next: NextFunction) => next());

    return router;
};
