import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { showToast } from "@nest/toast";
import { registerShortcut } from "@nest/keys";
import { requestNotes, getCachedEntries, setCachedEntries } from "./api";
import { loadSidebar, renderSkeleton } from "./sidebar";
import { loadCurrentNote, saveCurrentNote } from "./editor";
import { createElement, Plus } from "lucide";

// -------------------------
// Add date button
// -------------------------
const addDateBtn = document.getElementById("attributes__add-date")!;
const dateInput = document.getElementById("attributes__date") as HTMLInputElement;

addDateBtn.appendChild(createElement(Plus));

addDateBtn.addEventListener("click", () => {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
    dateInput.style.display = "block";
    addDateBtn.style.display = "none";
    dateInput.showPicker?.();
});

const editor = await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, document.getElementById("editor"));
    })
    .use(commonmark)
    .create();

const sidebar = document.getElementById("sidebar")!;

// -------------------------
// Keybindings
// -------------------------
let currentEntries: any[] = [];

registerShortcut("s", async () => {
    const ok = await saveCurrentNote(editor, currentEntries);
    showToast(ok ? "Saved" : "Save failed", ok ? "success" : "error");
});

// -------------------------
// Boot
// -------------------------
const cached = getCachedEntries();

if (cached) {
    currentEntries = cached;
    loadSidebar(sidebar, cached);
    document.body.classList.add("ready");
    const fresh = await requestNotes();
    setCachedEntries(fresh);
    currentEntries = fresh;
    loadSidebar(sidebar, fresh);
    await loadCurrentNote(editor, fresh);
} else {
    renderSkeleton(sidebar);
    document.body.classList.add("ready");
    const entries = await requestNotes();
    setCachedEntries(entries);
    currentEntries = entries;
    loadSidebar(sidebar, entries);
    await loadCurrentNote(editor, entries);
}
