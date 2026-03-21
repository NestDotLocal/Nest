import type { Widget } from "../types";
import manifest from "./widget.json";

const render = async (container: HTMLElement): Promise<void> => {
    container.innerHTML = `<div class="widget-notes"><div class="widget-notes__list widget-notes__list--loading"><div class="widget-notes__skeleton"></div><div class="widget-notes__skeleton"></div><div class="widget-notes__skeleton"></div></div></div>`;
    const list = container.querySelector<HTMLElement>(".widget-notes__list")!;

    const load = async () => {
        list.classList.remove("widget-notes__list--loading");
        try {
            const res = await fetch("/api/notes/entries");
            const entries: any[] = await res.json();
            const files = entries
                .filter((e) => e.type === "file")
                .sort(
                    (a, b) =>
                        new Date(b.updated_at).getTime() -
                        new Date(a.updated_at).getTime(),
                )
                .slice(0, 8);

            list.innerHTML =
                files.length === 0
                    ? `<div class="widget-notes__empty">No notes yet</div>`
                    : files
                          .map((e) => {
                              const encodedPath = e.path
                                  .split("/")
                                  .map(encodeURIComponent)
                                  .join("/");
                              const relTime = formatRelativeTime(
                                  new Date(e.updated_at),
                              );
                              return `
                        <a class="widget-notes__item" href="/notes${encodedPath}">
                            <span class="widget-notes__item-name">${e.name.replace(/\.md$/, "")}</span>
                            <span class="widget-notes__item-time">${relTime}</span>
                        </a>
                    `;
                          })
                          .join("");
        } catch {
            list.innerHTML = `<div class="widget-notes__empty">Failed to load notes</div>`;
        }
    };

    await load();
};

const formatRelativeTime = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default { manifest, render } satisfies Widget;
