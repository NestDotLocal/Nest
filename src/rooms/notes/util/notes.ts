import {
    listEntries,
    getEntry,
    getEntryByUuid,
    createEntry,
    updateEntry,
    deleteEntry,
    readFile,
} from "@nest/storage";
import type { StorageEntry } from "@nest/storage";

export const getNotes = (): StorageEntry[] => listEntries("notes");

export const getNote = (
    uuid: string,
): (StorageEntry & { content: string | null }) | null => {
    const entry = getEntryByUuid(uuid);
    if (!entry) return null;
    return { ...entry, content: readFile("notes", entry.path) };
};

const HOME_CONTENT = `# Home\n\nWelcome to Nest. This is your home note — edit it however you like.\n`;

export const ensureHome = (): StorageEntry => {
    const existing = getEntry("notes", "/Home.md");
    if (existing) return existing;
    return createEntry("notes", "/Home.md", "Home", "file", HOME_CONTENT);
};

export const createNote = (
    name: string,
    content: string = "",
    folder: string = "/",
): StorageEntry => {
    const dir = folder.endsWith("/") ? folder : `${folder}/`;
    return createEntry("notes", `${dir}${name}.md`, name, "file", content);
};

export const updateNote = (uuid: string, content: string): boolean => {
    const entry = getEntryByUuid(uuid);
    if (!entry) return false;
    return updateEntry("notes", entry.path, content);
};

export const deleteNote = (uuid: string): boolean => {
    const entry = getEntryByUuid(uuid);
    if (!entry) return false;
    return deleteEntry("notes", entry.path);
};
