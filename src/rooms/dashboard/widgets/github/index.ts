import type { Widget } from "../types";
import manifest from "./widget.json";

const render = (container: HTMLElement): void => {
    container.innerHTML = `
        <div class="widget-github">
            <div class="widget-github__message">
                <p>GitHub Notifications requires a personal access token.</p>
                <p>Configuration coming soon.</p>
            </div>
        </div>
    `;
};

export default { manifest, render } satisfies Widget;
