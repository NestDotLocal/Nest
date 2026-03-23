import {
    scanRoom,
    reconcileRoom,
    watchRoom,
    startPeriodicScan,
} from "@nest/storage";
import { Router, type Express } from "express";
import { type ViteDevServer } from "vite";
import path from "node:path";
import { RoomRouter } from "@nest/router";

interface RoomOptions {
    name: string;
    srcDir: string;
    distDir: string;
    ensure?: () => void;
}

export class Room {
    readonly name: string;
    readonly api: Router;

    private readonly srcDir: string;
    private readonly distDir: string;
    private readonly ensure?: () => void;

    constructor({ name, srcDir, distDir, ensure }: RoomOptions) {
        this.name = name;
        this.srcDir = srcDir;
        this.distDir = distDir;
        this.ensure = ensure;
        this.api = Router();
    }

    setup(): void {
        scanRoom(this.name);
        reconcileRoom(this.name);
        watchRoom(this.name);
        startPeriodicScan(this.name);
        this.ensure?.();
        console.log(`[Room] Setup complete: ${this.name}`);
    }

    mount(app: Express, vite?: ViteDevServer): void {
        const distPath = path.resolve(
            this.distDir,
            "rooms",
            this.name,
            "frontend",
            "index.html",
        );

        const frontend = new RoomRouter({
            roomName: this.name,
            srcDir: this.srcDir,
            distPath,
            vite,
        });

        app.use(`/api/${this.name}`, this.api);
        app.use(`/${this.name}`, frontend.router);

        console.log(`[Room] Mounted: /${this.name}`);
    }
}
