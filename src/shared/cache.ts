export interface Cache<T> {
    get: () => T | null;
    set: (value: T) => void;
    clear: () => void;
}

export const createCache = <T>(key: string): Cache<T> => ({
    get: (): T | null => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    },
    set: (value: T): void => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    clear: (): void => {
        localStorage.removeItem(key);
    },
});
