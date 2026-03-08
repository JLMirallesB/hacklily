/**
 * Preload script: runs in the renderer's isolated context with access to
 * ipcRenderer.  Exposes a minimal, typed API to the React app via
 * contextBridge so no Node.js APIs leak into the page.
 */

import { contextBridge, ipcRenderer } from "electron";

export interface OpenFileResult {
  filePath: string;
  content: string;
}

export interface SaveFileResult {
  filePath: string;
}

export interface ConvertLyResult {
  converted: string;
  changed: boolean;
  logs: string;
}

contextBridge.exposeInMainWorld("electronAPI", {
  /** Show native Open dialog and return {filePath, content}, or null if cancelled. */
  openFile: (): Promise<OpenFileResult | null> =>
    ipcRenderer.invoke("file:open"),

  /** Overwrite an existing file. Returns true on success. */
  saveFile: (content: string, filePath: string): Promise<boolean> =>
    ipcRenderer.invoke("file:save", { content, filePath }),

  /** Show native Save As dialog. Returns {filePath} or null if cancelled. */
  saveFileAs: (
    content: string,
    defaultName?: string,
  ): Promise<SaveFileResult | null> =>
    ipcRenderer.invoke("file:saveAs", { content, defaultName }),

  /** Run convert-ly on content. Returns updated content or null if unavailable/failed. */
  convertLy: (content: string): Promise<ConvertLyResult | null> =>
    ipcRenderer.invoke("file:convertLy", { content }),
});
