import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { replaceAll } from "@milkdown/kit/utils";
import { createElement, FileText, Folder, FolderOpen, ChevronRight, Plus } from "lucide";

const editor = await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, document.getElementById("editor"));
    })
    .use(commonmark)
    .create();

const sidebar = document.getElementById("sidebar")!;

// -------------------------
// Selection state
// -------------------------
let selectedEntry: any | null = null;

function setSelected(entry: any | null, el: HTMLElement | null) {
    // Deselect previous
    document.querySelector('.entry.selected')?.classList.remove('selected');
    selectedEntry = entry;
    if (el && entry) el.classList.add('selected');
}

// -------------------------
// Open folder persistence
// -------------------------
const OPEN_FOLDERS_KEY = 'nest:notes:openFolders';

function getOpenFolders(): Set<string> {
    try {
        const raw = localStorage.getItem(OPEN_FOLDERS_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveOpenFolders(set: Set<string>): void {
    localStorage.setItem(OPEN_FOLDERS_KEY, JSON.stringify([...set]));
}

// -------------------------
// API
// -------------------------
async function requestNotes(): Promise<any[]> {
    try {
        const res = await fetch('/api/notes/entries');
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}

// -------------------------
// Sidebar rendering
// -------------------------

// Build a nested tree from flat entries
function buildTree(entries: any[]): any {
    const root: Record<string, any> = {};

    // Sort: folders first, then files, both alphabetically
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
}

function createEntry(entry: any, depth: number): HTMLElement {
    const isFolder = entry.type === 'folder';
    const isActive = window.location.pathname === `/notes${entry.path
        .split('/').map(encodeURIComponent).join('/')}`;
    const isSelected = selectedEntry?.path === entry.path;

    const el = document.createElement('button');
    el.className = `entry ${entry.type}${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}`;
    el.style.paddingLeft = `${8 + depth * 20}px`;

    if (isFolder) {
        const chevron = createElement(ChevronRight, {
            class: 'chevron',
            width: '14',
            height: '14',
            'stroke-width': '2',
        });
        el.appendChild(chevron);
    }

    const icon = createElement(isFolder ? Folder : FileText, {
        class: 'icon',
        width: '15',
        height: '15',
        'stroke-width': '1.75',
    });
    el.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name.replace(/\.md$/, '');
    el.appendChild(name);

    return el;
}

function openFolder(el: HTMLElement, childContainer: HTMLElement, folderPath: string, openSet: Set<string>): void {
    el.classList.add('open');
    el.querySelector('.icon')?.replaceWith(
        createElement(FolderOpen, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' })
    );
    childContainer.classList.add('open');
    openSet.add(folderPath);
    saveOpenFolders(openSet);
}

function closeFolder(el: HTMLElement, childContainer: HTMLElement, folderPath: string, openSet: Set<string>): void {
    el.classList.remove('open');
    el.querySelector('.icon')?.replaceWith(
        createElement(Folder, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' })
    );
    childContainer.classList.remove('open');
    openSet.delete(folderPath);
    saveOpenFolders(openSet);
}

function renderTree(
    node: Record<string, any>,
    container: HTMLElement,
    openSet: Set<string>,
    depth: number = 0
) {
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

            // Restore open state from localStorage
            let open = openSet.has(entry.path);
            if (open) {
                el.classList.add('open');
                el.querySelector('.icon')?.replaceWith(
                    createElement(FolderOpen, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' })
                );
                childContainer.classList.add('open');
            }

            el.addEventListener('click', () => {
                // Toggle selection: deselect if already selected, otherwise select
                if (selectedEntry?.path === entry.path) {
                    setSelected(null, null);
                } else {
                    setSelected(entry, el);
                }
                // Always toggle open/close
                open = !open;
                if (open) {
                    openFolder(el, childContainer, entry.path, openSet);
                } else {
                    closeFolder(el, childContainer, entry.path, openSet);
                }
            });
        } else if (isFolder) {
            // Folder with no children — still selectable, no child container
            el.addEventListener('click', () => {
                if (selectedEntry?.path === entry.path) {
                    setSelected(null, null);
                } else {
                    setSelected(entry, el);
                }
            });
        } else {
            // File
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
}

// -------------------------
// New note
// -------------------------
function getTargetFolder(): string {
    if (!selectedEntry) return '/';
    if (selectedEntry.type === 'folder') return selectedEntry.path;
    // File: use parent directory
    const parts = selectedEntry.path.split('/');
    parts.pop();
    return parts.join('/') || '/';
}

function showNewNoteInput(entries: any[]) {
    // Remove any existing input
    document.querySelector('.new-note-input-row')?.remove();

    const targetFolder = getTargetFolder();
    const treeContainer = sidebar.querySelector<HTMLElement>('.sidebar-tree') ?? sidebar;

    // Find the container to insert into
    // For root, insert into tree container; for a subfolder, find its open child container
    let container: HTMLElement = treeContainer;
    if (targetFolder !== '/') {
        // Find the folder-children div that corresponds to targetFolder
        // We identify it by looking for the entry button with matching path, then its next sibling
        const allEntries = sidebar.querySelectorAll<HTMLElement>('.entry.folder');
        for (const el of allEntries) {
            // The entry's path is stored on selectedEntry
            if (selectedEntry?.type === 'folder' && el.classList.contains('selected')) {
                const next = el.nextElementSibling as HTMLElement | null;
                if (next?.classList.contains('folder-children')) {
                    // Ensure it's open
                    if (!next.classList.contains('open')) {
                        next.classList.add('open');
                    }
                    container = next;
                }
                break;
            } else if (selectedEntry?.type === 'file') {
                // Find the parent folder's child container
                // Walk up from the active file entry
                const activeFile = sidebar.querySelector<HTMLElement>('.entry.file.selected');
                if (activeFile) {
                    const parentContainer = activeFile.closest('.folder-children') as HTMLElement | null;
                    if (parentContainer) container = parentContainer;
                }
                break;
            }
        }
    }

    // Build the input row
    const depth = targetFolder === '/'
        ? 0
        : targetFolder.split('/').filter(Boolean).length;

    const row = document.createElement('div');
    row.className = 'new-note-input-row';
    row.style.paddingLeft = `${8 + depth * 20}px`;

    const icon = createElement(FileText, { class: 'icon', width: '15', height: '15', 'stroke-width': '1.75' });
    row.appendChild(icon);

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
            // Refresh entries and navigate
            const fresh = await requestNotes();
            setCachedEntries(fresh);
            await loadSidebar(fresh);
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
}

async function loadSidebar(entries: any[]) {
    const openSet = getOpenFolders();
    const tree = buildTree(entries);

    // Rebuild sidebar: header + tree
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
    newBtn.addEventListener('click', () => showNewNoteInput(entries));
    header.appendChild(newBtn);

    sidebar.appendChild(header);

    // Tree
    const tree_container = document.createElement('div');
    tree_container.className = 'sidebar-tree';
    renderTree(tree, tree_container, openSet);
    sidebar.appendChild(tree_container);
}

// -------------------------
// Note loading
// -------------------------
async function loadCurrentNote(entries: any[]) {
    const notePath = window.location.pathname.replace('/notes', '');

    // At root, load Home.md
    const isRoot = !notePath || notePath === '/';
    const targetPath = isRoot ? '/Home.md' : notePath;

    const currentNote = entries.find((entry: any) => {
        if (isRoot) return entry.path === '/Home.md';
        const encodedPath = entry.path
            .split('/')
            .map((e: string) => encodeURIComponent(e))
            .join('/');
        return encodedPath === targetPath;
    }) ?? null;

    if (!currentNote) return;

    const res = await fetch(`/api/notes/entries/${currentNote.uuid}`);
    const data = await res.json();
    editor.action(replaceAll(data.content ?? '', true));
}

// -------------------------
// Cache
// -------------------------
const ENTRIES_CACHE_KEY = 'nest:notes:entries';

function getCachedEntries(): any[] | null {
    try {
        const raw = localStorage.getItem(ENTRIES_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCachedEntries(entries: any[]): void {
    localStorage.setItem(ENTRIES_CACHE_KEY, JSON.stringify(entries));
}

// -------------------------
// Skeleton
// -------------------------
function renderSkeleton() {
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
}

// -------------------------
// Boot
// -------------------------
const cached = getCachedEntries();

if (cached) {
    // Render immediately from cache, show UI right away
    await loadSidebar(cached);
    document.body.classList.add('ready');
    // Fetch fresh data in the background
    const fresh = await requestNotes();
    setCachedEntries(fresh);
    await Promise.all([loadSidebar(fresh), loadCurrentNote(fresh)]);
} else {
    // First ever load — show skeleton while fetching
    renderSkeleton();
    document.body.classList.add('ready');
    const entries = await requestNotes();
    setCachedEntries(entries);
    await Promise.all([loadSidebar(entries), loadCurrentNote(entries)]);
}
