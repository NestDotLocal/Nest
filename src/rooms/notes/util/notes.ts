import { listEntries, getEntry, getEntryByUuid, createEntry, updateEntry, deleteEntry, readFile } from "../../../storage/main";
import type { StorageEntry } from "../../../storage/main";

// Returns all notes for the notes room from the SQLite index
export const getNotes = (): StorageEntry[] => {
    return listEntries("notes");
};

export const getNote = (uuid: string): (StorageEntry & { content: string | null; }) | null => {
    const entry = getEntryByUuid(uuid);
    if (!entry) return null;
    const content = readFile("notes", entry.path);
    return { ...entry, content };
};

const HOME_CONTENT = `# Home\n\nWelcome to Nest. This is your home note — edit it however you like.\n`;

export const ensureHome = (): StorageEntry => {
    const existing = getEntry("notes", "/Home.md");
    if (existing) return existing;
    return createEntry("notes", "/Home.md", "Home", "file", HOME_CONTENT);
};

export const createNote = (name: string, content: string = "", folder: string = "/"): StorageEntry => {
    const dir = folder.endsWith('/') ? folder : `${folder}/`;
    const entryPath = `${dir}${name}.md`;
    return createEntry("notes", entryPath, name, "file", content);
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
