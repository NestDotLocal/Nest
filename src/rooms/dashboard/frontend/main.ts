import GridStack from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { createCache } from "@nest/cache";
import { showToast } from "@nest/toast";
import { getWidget, getManifests } from "../widgets/index";
import type { WidgetLayout } from "../util/layout";

// -------------------------
// Cache
// -------------------------
const layoutCache = createCache<WidgetLayout[]>('nest:dashboard:layout');

// -------------------------
// GridStack init
// -------------------------
const grid = GridStack.init({
    column: 12,
    cellHeight: 80,
    animate: true,
    margin: 8,
    handle: '.widget-handle',
    resizable: { handles: 'e, se, s, sw, w' },
});

// -------------------------
// Widget mounting
// -------------------------
const mountedWidgets = new Map<string, HTMLElement>();

const mountWidget = (layout: WidgetLayout): void => {
    const widget = getWidget(layout.id);
    if (!widget) {
        console.warn(`[Dashboard] Unknown widget: ${layout.id}`);
        return;
    }

    // Build gridstack item HTML
    const el = document.createElement('div');
    el.className = 'grid-stack-item';
    el.setAttribute('gs-id', layout.id);
    el.setAttribute('gs-x', String(layout.x));
    el.setAttribute('gs-y', String(layout.y));
    el.setAttribute('gs-w', String(layout.w));
    el.setAttribute('gs-h', String(layout.h));
    el.setAttribute('gs-min-w', String(widget.manifest.minW));
    el.setAttribute('gs-min-h', String(widget.manifest.minH));

    const inner = document.createElement('div');
    inner.className = 'grid-stack-item-content widget-card';
    inner.innerHTML = `
        <div class="widget-card__header">
            <span class="widget-card__title">${widget.manifest.name}</span>
            <span class="widget-handle">⠿</span>
        </div>
        <div class="widget-card__body"></div>
    `;
    el.appendChild(inner);

    grid.addWidget(el);

    const body = inner.querySelector<HTMLElement>('.widget-card__body')!;
    const result = widget.render(body);
    // Handle async renders (notes widget)
    if (result instanceof Promise) result.catch(console.error);

    mountedWidgets.set(layout.id, body);
};

const unmountWidget = (id: string): void => {
    const body = mountedWidgets.get(id);
    if (!body) return;
    // Call destroy if widget has cleanup
    getWidget(id)?.destroy?.(body);
    mountedWidgets.delete(id);
};

// -------------------------
// Layout persistence
// -------------------------
const serializeLayout = (): WidgetLayout[] => {
    return grid.save(false) as any[];
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const scheduleSave = (): void => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        const layout = serializeLayout();
        layoutCache.set(layout);
        try {
            const res = await fetch('/api/dashboard/layout', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layout),
            });
            if (!res.ok) showToast('Failed to save layout', 'error');
        } catch {
            showToast('Failed to save layout', 'error');
        }
    }, 500);
};

grid.on('change', scheduleSave);
grid.on('resizestop', scheduleSave);

// -------------------------
// Add widget panel
// -------------------------
const panel = document.getElementById('widget-panel')!;
const panelList = document.getElementById('widget-panel-list')!;

const openPanel = (): void => {
    const mounted = new Set(mountedWidgets.keys());
    const manifests = getManifests();

    panelList.innerHTML = manifests.map(m => `
        <button class="widget-panel__item ${mounted.has(m.id) ? 'widget-panel__item--active' : ''}"
                data-id="${m.id}">
            <span class="widget-panel__item-name">${m.name}</span>
            <span class="widget-panel__item-status">${mounted.has(m.id) ? 'Remove' : 'Add'}</span>
        </button>
    `).join('');

    panelList.querySelectorAll<HTMLButtonElement>('.widget-panel__item').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset['id']!;
            if (mountedWidgets.has(id)) {
                // Remove widget
                const el = document.querySelector(`.grid-stack-item[gs-id="${id}"]`);
                if (el) {
                    unmountWidget(id);
                    grid.removeWidget(el as HTMLElement);
                    scheduleSave();
                }
            } else {
                // Add widget with defaults
                const manifest = getManifests().find(m => m.id === id);
                if (!manifest) return;
                mountWidget({ id, x: 0, y: 0, w: manifest.defaultW, h: manifest.defaultH });
                scheduleSave();
            }
            panel.classList.add('hidden');
        });
    });

    panel.classList.remove('hidden');
};

document.getElementById('add-widget-btn')!.addEventListener('click', openPanel);
document.getElementById('widget-panel-close')!.addEventListener('click', () => {
    panel.classList.add('hidden');
});

// -------------------------
// Boot
// -------------------------
const loadLayout = async (): Promise<WidgetLayout[]> => {
    try {
        const res = await fetch('/api/dashboard/layout');
        const fresh = await res.json() as WidgetLayout[];
        layoutCache.set(fresh);
        return fresh;
    } catch {
        return layoutCache.get() ?? [];
    }
};

const cached = layoutCache.get();

if (cached) {
    // Paint immediately from cache
    cached.forEach(mountWidget);
    document.body.classList.add('ready');
    // Then refresh from server silently
    loadLayout().then(fresh => {
        // Only re-render if layout actually changed
        const cachedStr = JSON.stringify(cached.map(l => l.id).sort());
        const freshStr = JSON.stringify(fresh.map((l: WidgetLayout) => l.id).sort());
        if (cachedStr !== freshStr) {
            grid.removeAll();
            mountedWidgets.clear();
            fresh.forEach(mountWidget);
        }
    });
} else {
    document.body.classList.add('ready');
    const layout = await loadLayout();
    layout.forEach(mountWidget);
}
