import type { Widget } from "./types";
import clock from "./clock/index";
import notes from "./notes/index";
import github from "./github/index";
import quicknote from "./quicknote/index";

const registry: Map<string, Widget> = new Map([
    [clock.manifest.id,     clock],
    [notes.manifest.id,     notes],
    [github.manifest.id,    github],
    [quicknote.manifest.id, quicknote],
]);

export const getWidget = (id: string): Widget | undefined => registry.get(id);
export const getAllWidgets = (): Widget[] => [...registry.values()];
export const getManifests = () => getAllWidgets().map(w => w.manifest);
