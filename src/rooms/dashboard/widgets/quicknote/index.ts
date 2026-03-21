import type { Widget } from "../types";
import manifest from "./widget.json";
import { showToast } from "@nest/toast";

const render = (container: HTMLElement): void => {
    container.innerHTML = `
        <div class="widget-quicknote">
            <textarea class="widget-quicknote__input" placeholder="Jot something down..."></textarea>
            <div class="widget-quicknote__footer">
                <button class="widget-quicknote__save">Save as note</button>
            </div>
        </div>
    `;

    const textarea = container.querySelector<HTMLTextAreaElement>(
        ".widget-quicknote__input",
    )!;
    const saveBtn = container.querySelector<HTMLButtonElement>(
        ".widget-quicknote__save",
    )!;

    // Persist draft in localStorage between sessions
    const DRAFT_KEY = "nest:dashboard:quicknote";
    textarea.value = localStorage.getItem(DRAFT_KEY) ?? "";
    textarea.addEventListener("input", () => {
        localStorage.setItem(DRAFT_KEY, textarea.value);
    });

    saveBtn.addEventListener("click", async () => {
        const content = textarea.value.trim();
        if (!content) {
            showToast("You must type something in your quick note!", "info");
            return;
        }

        const baseName = `Quick Note ${new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;

        try {
            // Fetch existing entries to detect name collisions
            const entriesRes = await fetch("/api/notes/entries");
            const entries: any[] = await entriesRes.json();
            const existingNames = new Set(
                entries.map((e: any) => e.name.replace(/\.md$/, "")),
            );

            let name = baseName;
            if (existingNames.has(name)) {
                let n = 2;
                while (existingNames.has(`${baseName} #${n}`)) n++;
                name = `${baseName} #${n}`;
            }

            const res = await fetch("/api/notes/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, content, folder: "/" }),
            });
            if (res.ok) {
                textarea.value = "";
                localStorage.removeItem(DRAFT_KEY);
                showToast("Saved as note", "success");
            } else {
                showToast("Failed to save", "error");
            }
        } catch {
            showToast("Failed to save", "error");
        }
    });
};

export default { manifest, render } satisfies Widget;
