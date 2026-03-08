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

export interface ImportMidiResult {
  content: string;
  logs: string;
}

export interface NetFetchResult {
  ok: boolean;
  status: number;
  text: string;
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

  /** Show native Open dialog for .mid/.midi, run midi2ly, return LilyPond source. */
  importMidi: (): Promise<ImportMidiResult | { error: string } | null> =>
    ipcRenderer.invoke("file:importMidi"),

  /** Fetch a URL via the main process (bypasses renderer CORS restrictions). */
  fetchUrl: (url: string): Promise<NetFetchResult> =>
    ipcRenderer.invoke("net:fetch", url),

  /** Read the user's personal snippets file. Returns null if not found. */
  readSnippetsFile: (): Promise<string | null> =>
    ipcRenderer.invoke("snippets:read"),

  /** Write the user's personal snippets file. Returns true on success. */
  writeSnippetsFile: (content: string): Promise<boolean> =>
    ipcRenderer.invoke("snippets:write", content),
});
