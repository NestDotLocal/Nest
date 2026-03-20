import { createElement, FileText, Folder, FolderOpen, ChevronRight, Plus } from "lucide";
import { requestNotes, setCachedEntries } from "./api";

// -------------------------
// Selection state
// -------------------------
let selectedEntry: any | null = null;

export const setSelected = (entry: any | null, el: HTMLElement | null): void => {
    document.querySelector('.entry.selected')?.classList.remove('selected');
    selectedEntry = entry;
    if (el && entry) el.classList.add('selected');
};

export const getSelectedEntry = (): any | null => selectedEntry;

// -------------------------
// Open folder persistence
// -------------------------
const OPEN_FOLDERS_KEY = 'nest:notes:openFolders';

const getOpenFolders = (): Set<string> => {
    try {
        const raw = localStorage.getItem(OPEN_FOLDERS_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
};

const saveOpenFolders = (set: Set<string>): void => {
    localStorage.setItem(OPEN_FOLDERS_KEY, JSON.stringify([...set]));
};

// -------------------------
// Tree building
// -------------------------
export const buildTree = (entries: any[]): any => {
    const root: Record<string, any> = {};

    const sorted = [...entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
        const parts = entry.path.replace(/^\//, '').split('/');
        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]]) node[parts[i]] = { __entry: null, __children: {} };
            node = node[parts[i]].__children;
        }
        const key = parts[parts.length - 1];
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
const createEntry = (entry: any, depth: number): HTMLElement => {
    const isFolder = entry.type === 'folder';
    const isActive = window.location.pathname === `/notes${entry.path
        .split('/').map(encodeURIComponent).join('/')}`;
    const isSelected = selectedEntry?.path === entry.path;

    const el = document.createElement('button');
    el.className = `entry ${entry.type}${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}`;
    el.style.paddingLeft = `${8 + depth * 20}px`;

    if (isFolder) {
        el.appendChild(createElement(ChevronRight, {
            class: 'chevron', width: '14', height: '14', 'stroke-width': '2',
        }));
    }

    el.appendChild(createElement(isFolder ? Folder : FileText, {
        class: 'icon', width: '15', height: '15', 'stroke-width': '1.75',
    }));

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name.replace(/\.md$/, '');
    el.appendChild(name);

    return el;
};

// -------------------------
// Folder open/close
// -------------------------
const openFolder = (el: HTMLElement, childContainer: HTMLElement, folderPath: string, openSet: Set<string>): void => {
    el.classList.add('open');
    el.querySelector('.icon')?.replaceWith(
        createElement(FolderOpen, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' })
    );
    childContainer.classList.add('open');
    openSet.add(folderPath);
    saveOpenFolders(openSet);
};

const closeFolder = (el: HTMLElement, childContainer: HTMLElement, folderPath: string, openSet: Set<string>): void => {
    el.classList.remove('open');
    el.querySelector('.icon')?.replaceWith(
        createElement(Folder, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' })
    );
    childContainer.classList.remove('open');
    openSet.delete(folderPath);
    saveOpenFolders(openSet);
};

// -------------------------
// Tree rendering
// -------------------------
const renderTree = (
    node: Record<string, any>,
    container: HTMLElement,
    openSet: Set<string>,
    depth: number = 0
): void => {
    for (const key of Object.keys(node)) {
        const { __entry: entry, __children: children } = node[key];
        if (!entry) continue;

        const el = createEntry(entry, depth);
        container.appendChild(el);

        const isFolder = entry.type === 'folder';
        const hasChildren = Object.keys(children).length > 0;

        if (isFolder && hasChildren) {
            const childContainer = document.createElement('div');
            childContainer.className = 'folder-children';
            renderTree(children, childContainer, openSet, depth + 1);
            container.appendChild(childContainer);

            let open = openSet.has(entry.path);
            if (open) {
                el.classList.add('open');
                el.querySelector('.icon')?.replaceWith(
                    createElement(FolderOpen, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' })
                );
                childContainer.classList.add('open');
            }

            el.addEventListener('click', () => {
                if (selectedEntry?.path === entry.path) {
                    setSelected(null, null);
                } else {
                    setSelected(entry, el);
                }
                open = !open;
                if (open) {
                    openFolder(el, childContainer, entry.path, openSet);
                } else {
                    closeFolder(el, childContainer, entry.path, openSet);
                }
            });
        } else if (isFolder) {
            el.addEventListener('click', () => {
                if (selectedEntry?.path === entry.path) {
                    setSelected(null, null);
                } else {
                    setSelected(entry, el);
                }
            });
        } else {
            const encodedPath = entry.path
                .split('/')
                .map((s: string) => encodeURIComponent(s))
                .join('/');

            el.addEventListener('click', () => {
                setSelected(entry, el);
                window.location.href = `/notes${encodedPath}`;
            });
        }
    }
};

// -------------------------
// New note
// -------------------------
const getTargetFolder = (): string => {
    if (!selectedEntry) return '/';
    if (selectedEntry.type === 'folder') return selectedEntry.path;
    const parts = selectedEntry.path.split('/');
    parts.pop();
    return parts.join('/') || '/';
};

export const showNewNoteInput = (sidebar: HTMLElement, entries: any[], onCreated: (fresh: any[]) => void): void => {
    document.querySelector('.new-note-input-row')?.remove();

    const targetFolder = getTargetFolder();
    const treeContainer = sidebar.querySelector<HTMLElement>('.sidebar-tree') ?? sidebar;

    let container: HTMLElement = treeContainer;
    if (targetFolder !== '/') {
        if (selectedEntry?.type === 'folder') {
            const selected = sidebar.querySelector<HTMLElement>('.entry.folder.selected');
            const next = selected?.nextElementSibling as HTMLElement | null;
            if (next?.classList.contains('folder-children')) {
                if (!next.classList.contains('open')) next.classList.add('open');
                container = next;
            }
        } else if (selectedEntry?.type === 'file') {
            const activeFile = sidebar.querySelector<HTMLElement>('.entry.file.selected');
            const parentContainer = activeFile?.closest('.folder-children') as HTMLElement | null;
            if (parentContainer) container = parentContainer;
        }
    }

    const depth = targetFolder === '/' ? 0 : targetFolder.split('/').filter(Boolean).length;

    const row = document.createElement('div');
    row.className = 'new-note-input-row';
    row.style.paddingLeft = `${8 + depth * 20}px`;
    row.appendChild(createElement(FileText, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' }));

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'new-note-input';
    input.placeholder = 'Note name';
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
            const res = await fetch('/api/notes/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, folder: targetFolder, content: '' }),
            });
            const newEntry = await res.json();
            const fresh = await requestNotes();
            setCachedEntries(fresh);
            onCreated(fresh);
            const encodedPath = newEntry.path
                .split('/')
                .map((s: string) => encodeURIComponent(s))
                .join('/');
            window.location.href = `/notes${encodedPath}`;
        } catch (e) {
            console.error('Failed to create note:', e);
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirm();
        if (e.key === 'Escape') row.remove();
    });

    input.addEventListener('blur', () => { if (!confirmed) row.remove(); });
};

// -------------------------
// Skeleton
// -------------------------
export const renderSkeleton = (sidebar: HTMLElement): void => {
    sidebar.innerHTML = '';
    const widths = ['55%', '40%', '70%', '45%', '60%'];
    for (const w of widths) {
        const el = document.createElement('div');
        el.className = 'skeleton-entry';
        const bar = document.createElement('div');
        bar.className = 'skeleton-bar';
        bar.style.width = w;
        el.appendChild(bar);
        sidebar.appendChild(el);
    }
};

// -------------------------
// Load sidebar
// -------------------------
export const loadSidebar = (sidebar: HTMLElement, entries: any[]): void => {
    const openSet = getOpenFolders();
    const tree = buildTree(entries);

    sidebar.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'sidebar-header';

    const title = document.createElement('span');
    title.className = 'sidebar-title';
    title.textContent = 'Notes';
    header.appendChild(title);

    const newBtn = document.createElement('button');
    newBtn.className = 'sidebar-action';
    newBtn.title = 'New note';
    newBtn.appendChild(createElement(Plus, { width: '15', height: '15', 'stroke-width': '2' }));
    newBtn.addEventListener('click', () => showNewNoteInput(sidebar, entries, (fresh) => loadSidebar(sidebar, fresh)));
    header.appendChild(newBtn);

    sidebar.appendChild(header);

    // Tree
    const treeContainer = document.createElement('div');
    treeContainer.className = 'sidebar-tree';
    renderTree(tree, treeContainer, openSet);
    sidebar.appendChild(treeContainer);
};
