// Whether the designer runs in the desktop app (Tauri) rather than a browser
export const isDesktopApp = (): boolean => "__TAURI_INTERNALS__" in window;
