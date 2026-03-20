import fs from "node:fs";
import path from "node:path";

export interface WidgetLayout {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const LAYOUT_PATH = path.resolve("nest/storage/dashboard/layout.json");

const DEFAULT_LAYOUT: WidgetLayout[] = [
    { id: "clock",     x: 0, y: 0, w: 2, h: 3 },
    { id: "notes",     x: 2, y: 0, w: 3, h: 6 },
    { id: "github",    x: 5, y: 0, w: 7, h: 3 },
    { id: "quicknote", x: 5, y: 3, w: 7, h: 3 },
];

export const getLayout = (): WidgetLayout[] => {
    try {
        if (!fs.existsSync(LAYOUT_PATH)) return DEFAULT_LAYOUT;
        const raw = fs.readFileSync(LAYOUT_PATH, "utf-8");
        return JSON.parse(raw) as WidgetLayout[];
    } catch (err) {
        console.warn("[Dashboard] Failed to read layout.json, using default:", err);
        return DEFAULT_LAYOUT;
    }
};

export const saveLayout = (layout: WidgetLayout[]): boolean => {
    try {
        fs.mkdirSync(path.dirname(LAYOUT_PATH), { recursive: true });
        fs.writeFileSync(LAYOUT_PATH, JSON.stringify(layout, null, 2), "utf-8");
        return true;
    } catch (err) {
        console.error("[Dashboard] Failed to save layout.json:", err);
        return false;
    }
};

export const ensureLayout = (): void => {
    if (!fs.existsSync(LAYOUT_PATH)) {
        saveLayout(DEFAULT_LAYOUT);
        console.log("[Dashboard] Created default layout.json");
    }
};
