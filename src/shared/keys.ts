type ShortcutHandler = (e: KeyboardEvent) => void;

export const registerShortcut = (
    key: string,
    handler: ShortcutHandler,
    options: {
        ctrl?: boolean;
        meta?: boolean;
        shift?: boolean;
        alt?: boolean;
    } = { ctrl: true },
): void => {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
        const ctrlOrMeta =
            options.ctrl || options.meta ? e.ctrlKey || e.metaKey : false;
        const shift = options.shift ? e.shiftKey : !e.shiftKey ? true : false;
        const alt = options.alt ? e.altKey : !e.altKey ? true : false;

        if (e.key === key && ctrlOrMeta && shift && alt) {
            e.preventDefault();
            handler(e);
        }
    });
};
