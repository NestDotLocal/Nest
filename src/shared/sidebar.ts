import {
    createElement,
    FileText,
    Folder,
    FolderOpen,
    ChevronRight,
} from "lucide";

export interface SidebarEntry {
    uuid: string;
    path: string;
    name: string;
    type: "file" | "folder";
    [key: string]: any;
}

export interface SidebarOptions {
    basePath: string; // e.g. '/notes'
    apiPath: string; // e.g. '/api/notes/entries'
    openFoldersKey: string; // localStorage key for persisting open folders
    onFileClick?: (entry: SidebarEntry) => void; // override default navigation
}

// -------------------------
// Open folder persistence
// -------------------------
export const getOpenFolders = (key: string): Set<string> => {
    try {
        const raw = localStorage.getItem(key);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
};

export const saveOpenFolders = (key: string, set: Set<string>): void => {
    localStorage.setItem(key, JSON.stringify([...set]));
};

// -------------------------
// Selection
// -------------------------
let selectedEntry: SidebarEntry | null = null;

export const setSelected = (
    entry: SidebarEntry | null,
    el: HTMLElement | null,
): void => {
    document.querySelector(".entry.selected")?.classList.remove("selected");
    selectedEntry = entry;
    if (el && entry) el.classList.add("selected");
};

export const getSelectedEntry = (): SidebarEntry | null => selectedEntry;

// -------------------------
// Tree building
// -------------------------
export const buildTree = (entries: SidebarEntry[]): Record<string, any> => {
    const root: Record<string, any> = {};

    const sorted = [...entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
        const parts = entry.path.replace(/^\//, "").split("/");
        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]])
                node[parts[i]] = { __entry: null, __children: {} };
            node = node[parts[i]].__children;
        }
        const key = parts[parts.length - 1]!;
        if (node[key]) {
            node[key].__entry = entry;
        } else {
            node[key] = { __entry: entry, __children: {} };
        }
    }

    return root;
};

// -------------------------
// Entry element
// -------------------------
const createEntryEl = (
    entry: SidebarEntry,
    depth: number,
    basePath: string,
): HTMLElement => {
    const isFolder = entry.type === "folder";
    const isActive =
        window.location.pathname ===
        `${basePath}${entry.path.split("/").map(encodeURIComponent).join("/")}`;
    const isSelected = selectedEntry?.path === entry.path;

    const el = document.createElement("button");
    el.className = `entry ${entry.type}${isActive ? " active" : ""}${isSelected ? " selected" : ""}`;
    el.style.paddingLeft = `${8 + depth * 20}px`;

    if (isFolder) {
        el.appendChild(
            createElement(ChevronRight, {
                class: "chevron",
                width: "14",
                height: "14",
                "stroke-width": "2",
            }),
        );
    }

    el.appendChild(
        createElement(isFolder ? Folder : FileText, {
            class: "icon",
            width: "15",
            height: "15",
            "stroke-width": "1.75",
        }),
    );

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = entry.name.replace(/\.md$/, "");
    el.appendChild(name);

    return el;
};

// -------------------------
// Folder open/close
// -------------------------
const openFolder = (
    el: HTMLElement,
    childContainer: HTMLElement,
    folderPath: string,
    openSet: Set<string>,
    openFoldersKey: string,
): void => {
    el.classList.add("open");
    el.querySelector(".icon")?.replaceWith(
        createElement(FolderOpen, {
            class: "icon",
            width: "15",
            height: "15",
            "stroke-width": "1.75",
        }),
    );
    childContainer.classList.add("open");
    openSet.add(folderPath);
    saveOpenFolders(openFoldersKey, openSet);
};

const closeFolder = (
    el: HTMLElement,
    childContainer: HTMLElement,
    folderPath: string,
    openSet: Set<string>,
    openFoldersKey: string,
): void => {
    el.classList.remove("open");
    el.querySelector(".icon")?.replaceWith(
        createElement(Folder, {
            class: "icon",
            width: "15",
            height: "15",
            "stroke-width": "1.75",
        }),
    );
    childContainer.classList.remove("open");
    openSet.delete(folderPath);
    saveOpenFolders(openFoldersKey, openSet);
};

// -------------------------
// Tree rendering
// -------------------------
export const renderTree = (
    node: Record<string, any>,
    container: HTMLElement,
    options: SidebarOptions,
    openSet: Set<string>,
    depth: number = 0,
): void => {
    for (const key of Object.keys(node)) {
        const { __entry: entry, __children: children } = node[key];
        if (!entry) continue;

        const el = createEntryEl(entry, depth, options.basePath);
        container.appendChild(el);

        const isFolder = entry.type === "folder";
        const hasChildren = Object.keys(children).length > 0;

        if (isFolder && hasChildren) {
            const childContainer = document.createElement("div");
            childContainer.className = "folder-children";
            renderTree(children, childContainer, options, openSet, depth + 1);
            container.appendChild(childContainer);

            let open = openSet.has(entry.path);
            if (open) {
                el.classList.add("open");
                el.querySelector(".icon")?.replaceWith(
                    createElement(FolderOpen, {
                        class: "icon",
                        width: "15",
                        height: "15",
                        "stroke-width": "1.75",
                    }),
                );
                childContainer.classList.add("open");
            }

            el.addEventListener("click", () => {
                if (selectedEntry?.path === entry.path) {
                    setSelected(null, null);
                } else {
                    setSelected(entry, el);
                }
                open = !open;
                if (open) {
                    openFolder(
                        el,
                        childContainer,
                        entry.path,
                        openSet,
                        options.openFoldersKey,
                    );
                } else {
                    closeFolder(
                        el,
                        childContainer,
                        entry.path,
                        openSet,
                        options.openFoldersKey,
                    );
                }
            });
        } else if (isFolder) {
            el.addEventListener("click", () => {
                if (selectedEntry?.path === entry.path) {
                    setSelected(null, null);
                } else {
                    setSelected(entry, el);
                }
            });
        } else {
            el.addEventListener("click", () => {
                setSelected(entry, el);
                if (options.onFileClick) {
                    options.onFileClick(entry);
                } else {
                    const encodedPath = entry.path
                        .split("/")
                        .map((s: string) => encodeURIComponent(s))
                        .join("/");
                    window.location.href = `${options.basePath}${encodedPath}`;
                }
            });
        }
    }
};

// -------------------------
// Skeleton
// -------------------------
export const renderSkeleton = (container: HTMLElement): void => {
    container.innerHTML = "";
    const widths = ["55%", "40%", "70%", "45%", "60%"];
    for (const w of widths) {
        const el = document.createElement("div");
        el.className = "skeleton-entry";
        const bar = document.createElement("div");
        bar.className = "skeleton-bar";
        bar.style.width = w;
        el.appendChild(bar);
        container.appendChild(el);
    }
};
