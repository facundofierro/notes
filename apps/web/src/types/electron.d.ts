/**
 * Type declarations for the Electron API exposed via the preload script.
 * When running outside Electron (plain browser), window.electronAPI is undefined.
 */

declare global {
  interface ElectronBrowserViewAPI {
    loadUrl: (url: string, tabIndex?: number) => Promise<void>;
    setBounds: (
      bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
      tabIndex?: number,
    ) => void;
    hide: (tabIndex?: number) => void;
    show: (tabIndex?: number) => void;
    capture: (tabIndex?: number) => Promise<string | null>;
    executeJs: (code: string, tabIndex?: number) => Promise<unknown>;
    getUrl: (tabIndex?: number) => Promise<string>;
    destroy: (tabIndex?: number) => void;
    reload: (tabIndex?: number) => void;

    /** Listen for navigation events. Returns an unsubscribe function. */
    onNavigated: (
      callback: (url: string, isInsecure?: boolean, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for page title changes. Returns an unsubscribe function. */
    onTitleUpdated: (
      callback: (title: string, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for loading state changes. Returns an unsubscribe function. */
    onLoadingChanged: (
      callback: (loading: boolean, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for load failures. Returns an unsubscribe function. */
    onLoadFailed: (
      callback: (
        url: string,
        errorDescription: string,
        errorCode: number,
        tabIndex?: number,
      ) => void,
    ) => () => void;
    /** Listen for network requests. Returns an unsubscribe function. */
    onNetworkRequest: (
      callback: (params: any, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for network responses. Returns an unsubscribe function. */
    onNetworkResponse: (
      callback: (params: any, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for network finished. Returns an unsubscribe function. */
    onNetworkFinished: (
      callback: (params: any, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for network failed. Returns an unsubscribe function. */
    onNetworkFailed: (
      callback: (params: any, tabIndex?: number) => void,
    ) => () => void;
    /** Listen for favicon updates. Returns an unsubscribe function. */
    onFaviconUpdated: (
      callback: (favicon: string, tabIndex?: number) => void,
    ) => () => void;
  }

  interface ElectronAPI {
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    browserView: ElectronBrowserViewAPI;
    openExternal: (url: string) => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
