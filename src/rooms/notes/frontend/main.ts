import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { requestNotes, getCachedEntries, setCachedEntries } from "./api";
import { loadSidebar, renderSkeleton } from "./sidebar";
import { loadCurrentNote, saveCurrentNote } from "./editor";

const editor = await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, document.getElementById("editor"));
    })
    .use(commonmark)
    .create();

const sidebar = document.getElementById("sidebar")!;

// -------------------------
// Save indicator
// -------------------------
let saveIndicatorTimeout: ReturnType<typeof setTimeout> | null = null;

const showSaveIndicator = (success: boolean): void => {
    let indicator = document.getElementById('save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        document.body.appendChild(indicator);
    }
    indicator.textContent = success ? 'Saved' : 'Save failed';
    indicator.className = `save-indicator ${success ? 'success' : 'error'} visible`;

    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    saveIndicatorTimeout = setTimeout(() => {
        indicator!.classList.remove('visible');
    }, 2000);
};

// -------------------------
// Keybindings
// -------------------------
let currentEntries: any[] = [];

document.addEventListener('keydown', async (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const ok = await saveCurrentNote(editor, currentEntries);
        showSaveIndicator(ok);
    }
});

// -------------------------
// Boot
// -------------------------
const cached = getCachedEntries();

if (cached) {
    currentEntries = cached;
    loadSidebar(sidebar, cached);
    document.body.classList.add('ready');
    const fresh = await requestNotes();
    setCachedEntries(fresh);
    currentEntries = fresh;
    loadSidebar(sidebar, fresh);
    await loadCurrentNote(editor, fresh);
} else {
    renderSkeleton(sidebar);
    document.body.classList.add('ready');
    const entries = await requestNotes();
    setCachedEntries(entries);
    currentEntries = entries;
    loadSidebar(sidebar, entries);
    await loadCurrentNote(editor, entries);
}
