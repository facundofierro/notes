/**
 * Type declarations for the Electron API exposed via the preload script.
 * When running outside Electron (plain browser), window.electronAPI is undefined.
 */

declare global {
  interface ElectronBrowserViewAPI {
    loadUrl: (url: string) => Promise<void>;
    setBounds: (bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => void;
    hide: () => void;
    show: () => void;
    capture: () => Promise<string | null>;
    executeJs: (code: string) => Promise<unknown>;
    getUrl: () => Promise<string>;
    destroy: () => void;

    /** Listen for navigation events. Returns an unsubscribe function. */
    onNavigated: (callback: (url: string, isInsecure?: boolean) => void) => () => void;
    /** Listen for page title changes. Returns an unsubscribe function. */
    onTitleUpdated: (callback: (title: string) => void) => () => void;
    /** Listen for loading state changes. Returns an unsubscribe function. */
    onLoadingChanged: (callback: (loading: boolean) => void) => () => void;
    /** Listen for load failures. Returns an unsubscribe function. */
    onLoadFailed: (callback: (url: string, errorDescription: string, errorCode: number) => void) => () => void;
    /** Listen for network requests. Returns an unsubscribe function. */
    onNetworkRequest: (callback: (params: any) => void) => () => void;
    /** Listen for network responses. Returns an unsubscribe function. */
    onNetworkResponse: (callback: (params: any) => void) => () => void;
    /** Listen for network finished. Returns an unsubscribe function. */
    onNetworkFinished: (callback: (params: any) => void) => () => void;
    /** Listen for network failed. Returns an unsubscribe function. */
    onNetworkFailed: (callback: (params: any) => void) => () => void;
  }

  interface ElectronAPI {
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    browserView: ElectronBrowserViewAPI;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
