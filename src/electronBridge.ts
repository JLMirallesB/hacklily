/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

/**
 * Type-safe wrapper around the Electron IPC API exposed by the preload script
 * via contextBridge.exposeInMainWorld("electronAPI", ...).
 *
 * In the web build, window.electronAPI is undefined and every helper here
 * degrades gracefully (returns null / false).
 */

export interface OpenFileResult {
  filePath: string;
  content: string;
}

export interface SaveFileResult {
  filePath: string;
}

export interface ConvertLyResult {
  /** The updated LilyPond source after running convert-ly. */
  converted: string;
  /** True if convert-ly actually modified the source. */
  changed: boolean;
  /** Any warnings/messages printed to stderr by convert-ly. */
  logs: string;
}

export interface ImportMidiResult {
  /** The LilyPond source produced by midi2ly. */
  content: string;
  /** Any warnings/messages printed to stderr by midi2ly. */
  logs: string;
}

export interface NetFetchResult {
  ok: boolean;
  status: number;
  text: string;
}

interface ElectronAPI {
  openFile(): Promise<OpenFileResult | null>;
  saveFile(content: string, filePath: string): Promise<boolean>;
  saveFileAs(
    content: string,
    defaultName?: string,
  ): Promise<SaveFileResult | null>;
  convertLy(content: string): Promise<ConvertLyResult | null>;
  importMidi?(): Promise<ImportMidiResult | { error: string } | null>;
  fetchUrl?(url: string): Promise<NetFetchResult>;
  readSnippetsFile?(): Promise<string | null>;
  writeSnippetsFile?(content: string): Promise<boolean>;
}

function getAPI(): ElectronAPI | null {
  return (
    (window as unknown as { electronAPI?: ElectronAPI }).electronAPI ?? null
  );
}

/** True only when running inside Electron Desktop. */
export function isDesktop(): boolean {
  return getAPI() !== null;
}

/** Show the native "Open File" dialog. Returns null if user cancelled. */
export async function openFile(): Promise<OpenFileResult | null> {
  return (await getAPI()?.openFile()) ?? null;
}

/** Overwrite an existing file on disk. Returns false on failure. */
export async function saveFile(
  content: string,
  filePath: string,
): Promise<boolean> {
  return (await getAPI()?.saveFile(content, filePath)) ?? false;
}

/** Show the native "Save As" dialog. Returns null if user cancelled. */
export async function saveFileAs(
  content: string,
  defaultName?: string,
): Promise<SaveFileResult | null> {
  return (await getAPI()?.saveFileAs(content, defaultName)) ?? null;
}

/**
 * Run convert-ly on the given LilyPond source to update old syntax.
 * Returns null if convert-ly is unavailable or the conversion failed.
 */
export async function convertLy(
  content: string,
): Promise<ConvertLyResult | null> {
  return (await getAPI()?.convertLy(content)) ?? null;
}

/**
 * Show a native MIDI file picker and convert the selected file to LilyPond
 * source using the bundled midi2ly binary.
 * Returns null if the user cancelled or midi2ly is unavailable.
 * Returns { error } if midi2ly ran but failed.
 */
export async function importMidi(): Promise<
  ImportMidiResult | { error: string } | null
> {
  return (await getAPI()?.importMidi?.()) ?? null;
}

/**
 * Fetch a URL via the Electron main process, bypassing renderer CORS restrictions.
 * Returns null when not running in Electron.
 */
export async function fetchUrl(
  url: string,
): Promise<NetFetchResult | null> {
  return (await getAPI()?.fetchUrl?.(url)) ?? null;
}

/** Read the user's personal snippets markdown file. Returns null if not found or not in desktop mode. */
export async function readSnippetsFile(): Promise<string | null> {
  return (await getAPI()?.readSnippetsFile?.()) ?? null;
}

/** Write the user's personal snippets markdown file. Returns false if not in desktop mode. */
export async function writeSnippetsFile(content: string): Promise<boolean> {
  return (await getAPI()?.writeSnippetsFile?.(content)) ?? false;
}
