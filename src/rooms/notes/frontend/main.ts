import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { requestNotes, getCachedEntries, setCachedEntries } from "./api";
import { loadSidebar, renderSkeleton } from "./sidebar";
import { loadCurrentNote } from "./editor";

const editor = await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, document.getElementById("editor"));
    })
    .use(commonmark)
    .create();

const sidebar = document.getElementById("sidebar")!;

// -------------------------
// Boot
// -------------------------
const cached = getCachedEntries();

if (cached) {
    // Render immediately from cache, show UI right away
    loadSidebar(sidebar, cached);
    document.body.classList.add('ready');
    // Fetch fresh data in the background
    const fresh = await requestNotes();
    setCachedEntries(fresh);
    loadSidebar(sidebar, fresh);
    await loadCurrentNote(editor, fresh);
} else {
    // First ever load — show skeleton while fetching
    renderSkeleton(sidebar);
    document.body.classList.add('ready');
    const entries = await requestNotes();
    setCachedEntries(entries);
    loadSidebar(sidebar, entries);
    await loadCurrentNote(editor, entries);
}
