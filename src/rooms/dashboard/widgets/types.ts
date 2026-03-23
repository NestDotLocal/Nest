export interface WidgetManifest {
    id: string;
    name: string;
    defaultW: number;
    defaultH: number;
    minW: number;
    minH: number;
}

export interface Widget {
    manifest: WidgetManifest;
    render: (container: HTMLElement) => void;
    destroy?: (container: HTMLElement) => void;
}
