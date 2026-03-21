let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export const showToast = (message: string, variant: ToastVariant = 'info', duration = 2000): void => {
    let el = document.getElementById('nest-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'nest-toast';
        document.body.appendChild(el);
    }

    el.textContent = message;
    el.className = `nest-toast ${variant} visible`;

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        el!.classList.remove('visible');
    }, duration);
};
