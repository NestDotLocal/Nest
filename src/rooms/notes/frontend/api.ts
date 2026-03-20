// -------------------------
// API
// -------------------------
export const requestNotes = async (): Promise<any[]> => {
    try {
        const res = await fetch('/api/notes/entries');
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

// -------------------------
// Cache
// -------------------------
const ENTRIES_CACHE_KEY = 'nest:notes:entries';

export const getCachedEntries = (): any[] | null => {
    try {
        const raw = localStorage.getItem(ENTRIES_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setCachedEntries = (entries: any[]): void => {
    localStorage.setItem(ENTRIES_CACHE_KEY, JSON.stringify(entries));
};
