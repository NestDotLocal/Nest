import type { Widget } from "../types";
import manifest from "./widget.json";

const render = (container: HTMLElement): void => {
    container.innerHTML = `
        <div class="widget-clock">
            <div class="widget-clock__time"></div>
            <div class="widget-clock__date"></div>
        </div>
    `;

    const timeEl = container.querySelector<HTMLElement>('.widget-clock__time')!;
    const dateEl = container.querySelector<HTMLElement>('.widget-clock__date')!;

    const tick = () => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };

    tick();
    const interval = setInterval(tick, 1000);
    // Store interval ID so destroy() can clean it up
    (container as any).__clockInterval = interval;
};

const destroy = (container: HTMLElement): void => {
    clearInterval((container as any).__clockInterval);
};

export default { manifest, render, destroy } satisfies Widget;
