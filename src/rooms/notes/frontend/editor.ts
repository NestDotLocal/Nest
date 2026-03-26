import { type Editor } from "@milkdown/kit/core";
import { replaceAll, getMarkdown } from "@milkdown/kit/utils";
import fm from "front-matter";

export const loadCurrentNote = async (
    editor: Editor,
    entries: any[],
): Promise<void> => {
    const notePath = window.location.pathname.replace("/notes", "");
    const isRoot = !notePath || notePath === "/";

    const currentNote =
        entries.find((entry: any) => {
            if (isRoot) return entry.path === "/Home.md";
            const encodedPath = entry.path
                .split("/")
                .map((e: string) => encodeURIComponent(e))
                .join("/");
            return encodedPath === notePath;
        }) ?? null;

    if (!currentNote) return;

    const res = await fetch(`/api/notes/entries/${currentNote.uuid}`);
    const data = await res.json();

    const { attributes, body } = fm<{ date?: string | Date; }>(data.content ?? "");

    const dateEl = document.getElementById("attributes__date") as HTMLInputElement;
    const addDateBtn = document.getElementById("attributes__add-date") as HTMLButtonElement;

    if (attributes.date) {
        const dateStr = attributes.date instanceof Date
            ? attributes.date.toISOString().slice(0, 10)
            : String(attributes.date);
        dateEl.value = dateStr;
        dateEl.style.display = "block";
        addDateBtn.style.display = "none";
    } else {
        dateEl.value = "";
        dateEl.style.display = "none";
        addDateBtn.style.display = "flex";
    }

    editor.action(replaceAll(body, true));
};

// -------------------------
// Note saving
// -------------------------
export const saveCurrentNote = async (
    editor: Editor,
    entries: any[],
): Promise<boolean> => {
    const notePath = window.location.pathname.replace("/notes", "");
    const isRoot = !notePath || notePath === "/";

    const currentNote =
        entries.find((entry: any) => {
            if (isRoot) return entry.path === "/Home.md";
            const encodedPath = entry.path
                .split("/")
                .map((e: string) => encodeURIComponent(e))
                .join("/");
            return encodedPath === notePath;
        }) ?? null;

    if (!currentNote) return false;

    const body = editor.action(getMarkdown());

    const dateEl = document.getElementById("attributes__date") as HTMLInputElement;
    const dateValue = dateEl?.value?.trim();
    const content = dateValue
        ? `---\ndate: ${dateValue}\n---\n${body}`
        : body;

    const res = await fetch(`/api/notes/entries/${currentNote.uuid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });

    return res.ok;
};
