import { type Editor } from "@milkdown/kit/core";
import { replaceAll } from "@milkdown/kit/utils";

// -------------------------
// Note loading
// -------------------------
export const loadCurrentNote = async (editor: Editor, entries: any[]): Promise<void> => {
    const notePath = window.location.pathname.replace('/notes', '');

    // At root, load Home.md
    const isRoot = !notePath || notePath === '/';

    const currentNote = entries.find((entry: any) => {
        if (isRoot) return entry.path === '/Home.md';
        const encodedPath = entry.path
            .split('/')
            .map((e: string) => encodeURIComponent(e))
            .join('/');
        return encodedPath === notePath;
    }) ?? null;

    if (!currentNote) return;

    const res = await fetch(`/api/notes/entries/${currentNote.uuid}`);
    const data = await res.json();
    editor.action(replaceAll(data.content ?? '', true));
};
