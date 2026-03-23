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
    srcDir: string;
    distPath: string;
    vite?: ViteDevServer;
}

export class RoomRouter {
    readonly router: Router;

    constructor({ roomName: _roomName, srcDir, distPath, vite }: RoomRouterOptions) {
        this.router = Router();

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

        this.router.get("/", (req: Request, res: Response, next: NextFunction) => {
            serveHtml(req.originalUrl, res, next);
        });

        this.router.get("/*path", (req: Request, res: Response, next: NextFunction) => {
            serveHtml(req.originalUrl, res, next);
        });

        this.router.use((_req: Request, _res: Response, next: NextFunction) => next());
    }
}
