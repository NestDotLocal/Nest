import { createElement, FileText, Plus } from "lucide";
import {
    buildTree,
    renderTree,
    renderSkeleton,
    getOpenFolders,
    getSelectedEntry,
    setSelected,
    type SidebarOptions,
} from "@nest/sidebar";
import { requestNotes, setCachedEntries } from "./api";

export { renderSkeleton, setSelected, getSelectedEntry };

const SIDEBAR_OPTIONS: SidebarOptions = {
    basePath: "/notes",
    apiPath: "/api/notes/entries",
    openFoldersKey: "nest:notes:openFolders",
};

// -------------------------
// New note input
// -------------------------
const getTargetFolder = (): string => {
    const selected = getSelectedEntry();
    if (!selected) return "/";
    if (selected.type === "folder") return selected.path;
    const parts = selected.path.split("/");
    parts.pop();
    return parts.join("/") || "/";
};

export const showNewNoteInput = (
    sidebar: HTMLElement,
    entries: any[],
    onCreated: (fresh: any[]) => void,
): void => {
    document.querySelector(".new-note-input-row")?.remove();

    const targetFolder = getTargetFolder();
    const treeContainer =
        sidebar.querySelector<HTMLElement>(".sidebar-tree") ?? sidebar;

    let container: HTMLElement = treeContainer;
    if (targetFolder !== "/") {
        const selected = getSelectedEntry();
        if (selected?.type === "folder") {
            const selectedEl = sidebar.querySelector<HTMLElement>(
                ".entry.folder.selected",
            );
            const next = selectedEl?.nextElementSibling as HTMLElement | null;
            if (next?.classList.contains("folder-children")) {
                if (!next.classList.contains("open"))
                    next.classList.add("open");
                container = next;
            }
        } else if (selected?.type === "file") {
            const activeFile = sidebar.querySelector<HTMLElement>(
                ".entry.file.selected",
            );
            const parentContainer = activeFile?.closest(
                ".folder-children",
            ) as HTMLElement | null;
            if (parentContainer) container = parentContainer;
        }
    }

    const depth =
        targetFolder === "/"
            ? 0
            : targetFolder.split("/").filter(Boolean).length;

    const row = document.createElement("div");
    row.className = "new-note-input-row";
    row.style.paddingLeft = `${8 + depth * 20}px`;
    row.appendChild(
        createElement(FileText, {
            class: "icon",
            width: "15",
            height: "15",
            "stroke-width": "1.75",
        }),
    );

    const input = document.createElement("input");
    input.type = "text";
    input.className = "new-note-input";
    input.placeholder = "Note name";
    row.appendChild(input);
    container.appendChild(row);
    input.focus();

    let confirmed = false;
    const confirm = async () => {
        if (confirmed) return;
        confirmed = true;
        const name = input.value.trim();
        row.remove();
        if (!name) return;
        try {
            const res = await fetch("/api/notes/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    folder: targetFolder,
                    content: "",
                }),
            });
            const newEntry = await res.json();
            const fresh = await requestNotes();
            setCachedEntries(fresh);
            onCreated(fresh);
            const encodedPath = newEntry.path
                .split("/")
                .map((s: string) => encodeURIComponent(s))
                .join("/");
            window.location.href = `/notes${encodedPath}`;
        } catch (e) {
            console.error("Failed to create note:", e);
        }
    };

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirm();
        if (e.key === "Escape") row.remove();
    });
    input.addEventListener("blur", () => {
        if (!confirmed) row.remove();
    });
};

// -------------------------
// Load sidebar
// -------------------------
export const loadSidebar = (sidebar: HTMLElement, entries: any[]): void => {
    const openSet = getOpenFolders(SIDEBAR_OPTIONS.openFoldersKey);
    const tree = buildTree(entries);

    sidebar.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "sidebar-header";

    const title = document.createElement("span");
    title.className = "sidebar-title";
    title.textContent = "Notes";
    header.appendChild(title);

    const newBtn = document.createElement("button");
    newBtn.className = "sidebar-action";
    newBtn.title = "New note";
    newBtn.appendChild(
        createElement(Plus, { width: "15", height: "15", "stroke-width": "2" }),
    );
    newBtn.addEventListener("click", () =>
        showNewNoteInput(sidebar, entries, (fresh) =>
            loadSidebar(sidebar, fresh),
        ),
    );
    header.appendChild(newBtn);
    sidebar.appendChild(header);

    // Tree
    const treeContainer = document.createElement("div");
    treeContainer.className = "sidebar-tree";
    renderTree(tree, treeContainer, SIDEBAR_OPTIONS, openSet);
    sidebar.appendChild(treeContainer);
};
