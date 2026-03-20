import { createCache } from "@nest/cache";

const entriesCache = createCache<any[]>('nest:notes:entries');

export const requestNotes = async (): Promise<any[]> => {
    try {
        const res = await fetch('/api/notes/entries');
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getCachedEntries = (): any[] | null => entriesCache.get();
export const setCachedEntries = (entries: any[]): void => entriesCache.set(entries);
