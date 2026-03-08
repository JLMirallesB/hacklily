import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  session,
  shell,
} from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startRpcServer } from "./backend/rpcServer";

const WS_PORT = 3210;
const APP_SCHEME = "app";

// Must be called before app is ready.
// Registers "app://" as a standard secure scheme so that:
//  - fetch() works from pages loaded under this scheme
//  - Absolute paths like /hackmidi/samples/ resolve correctly
//    (they become app://frontend/hackmidi/samples/...)
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let stopServer: null | (() => Promise<void>) = null;
let runtimeDir: string | null = null;

function resolveFrontendDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "frontend");
  }

  const envPath = process.env.HACKLILY_FRONTEND_DIR;
  if (envPath) {
    return envPath;
  }

  return path.resolve(__dirname, "../../dist");
}

function resolveRuntimeDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "lilypond");
  }

  const envPath = process.env.HACKLILY_RUNTIME_DIR;
  if (envPath) {
    return envPath;
  }

  return path.resolve(__dirname, "../runtime/current");
}

function setupFrontendProtocol(frontendDir: string): void {
  session.defaultSession.protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    // url.pathname is already decoded and starts with "/"
    const relPath = url.pathname.replace(/^\/+/, "") || "index.html";
    const filePath = path.join(frontendDir, relPath);
    return net.fetch(`file://${filePath}`);
  });
}

function createWindow(frontendDir: string): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // loadURL with the custom scheme so absolute paths resolve correctly.
  // The page is served at app://frontend/index.html, meaning:
  //   fetch("/hackmidi/samples/x") → app://frontend/hackmidi/samples/x
  //   which our protocol handler maps to frontendDir/hackmidi/samples/x
  void mainWindow.loadURL(`${APP_SCHEME}://frontend/index.html`);

  // Open external https:// links in the system browser instead of Electron.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://`)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap(): Promise<void> {
  runtimeDir = resolveRuntimeDir();
  const frontendDir = resolveFrontendDir();

  setupFrontendProtocol(frontendDir);

  try {
    stopServer = await startRpcServer({
      runtimeDir,
      wsPort: WS_PORT,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not start the local renderer service.";

    dialog.showErrorBox(
      "Hacklily Desktop cannot start",
      [
        "No se pudo iniciar el backend local de render.",
        "Verifica que el runtime de LilyPond esté incluido en la app.",
        "",
        `Detalle: ${message}`,
      ].join("\n"),
    );
    app.exit(1);
    return;
  }

  createWindow(frontendDir);
}

// ── Local file IPC ──────────────────────────────────────────────────────────

ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Open LilyPond file",
    properties: ["openFile"],
    filters: [
      { name: "LilyPond files", extensions: ["ly"] },
      { name: "All files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  return { filePath, content };
});

ipcMain.handle(
  "file:save",
  async (_event, { content, filePath }: { content: string; filePath: string }) => {
    await fs.writeFile(filePath, content, "utf8");
    return true;
  },
);

ipcMain.handle(
  "file:saveAs",
  async (
    _event,
    { content, defaultName }: { content: string; defaultName?: string },
  ) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: "Save LilyPond file",
      defaultPath: defaultName ?? "untitled.ly",
      filters: [
        { name: "LilyPond files", extensions: ["ly"] },
        { name: "All files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, content, "utf8");
    return { filePath: result.filePath };
  },
);

interface ConvertLyIpcResult {
  converted: string;
  changed: boolean;
  logs: string;
}

ipcMain.handle(
  "file:convertLy",
  async (_event, { content }: { content: string }): Promise<ConvertLyIpcResult | null> => {
    if (!runtimeDir) return null;

    // convert-ly is a Python script in the LilyPond bundle — no .exe suffix.
    const convertLyBin = path.join(runtimeDir, "bin", "convert-ly");
    try {
      await fs.access(convertLyBin);
    } catch {
      return null; // binary not present in this runtime
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hacklily-cly-"));
    try {
      const inputPath = path.join(tmpDir, "input.ly");
      await fs.writeFile(inputPath, content, "utf8");

      // Extend PATH so convert-ly can find the bundled lilypond if needed.
      const binDir = path.join(runtimeDir, "bin");
      const pathSep = process.platform === "win32" ? ";" : ":";
      const extPath = `${binDir}${pathSep}${process.env.PATH ?? ""}`;

      return await new Promise<ConvertLyIpcResult | null>((resolve) => {
        let stdout = "";
        let stderr = "";

        const child = spawn(convertLyBin, [inputPath], {
          env: { ...process.env, PATH: extPath },
          stdio: ["ignore", "pipe", "pipe"],
        });

        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        child.on("error", () => resolve(null));

        child.on("close", (code) => {
          if (code !== 0 || !stdout.trim()) {
            resolve(null);
            return;
          }
          resolve({
            converted: stdout,
            changed: stdout.trimEnd() !== content.trimEnd(),
            logs: stderr.trim(),
          });
        });
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  },
);

interface ImportMidiIpcResult {
  content: string;
  logs: string;
}

ipcMain.handle(
  "file:importMidi",
  async (): Promise<ImportMidiIpcResult | { error: string } | null> => {
    if (!runtimeDir) return { error: "Runtime directory not found." };

    // midi2ly is a Python script in the LilyPond bundle — no .exe suffix.
    const midi2lyBin = path.join(runtimeDir, "bin", "midi2ly");
    try {
      await fs.access(midi2lyBin);
    } catch {
      return { error: "midi2ly is not available in the bundled LilyPond runtime." };
    }

    const openResult = await dialog.showOpenDialog(mainWindow!, {
      title: "Import MIDI file",
      properties: ["openFile"],
      filters: [
        { name: "MIDI files", extensions: ["mid", "midi"] },
        { name: "All files", extensions: ["*"] },
      ],
    });

    if (openResult.canceled || openResult.filePaths.length === 0) return null;

    const midiPath = openResult.filePaths[0];
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hacklily-midi-"));
    try {
      const outputPath = path.join(tmpDir, "out.ly");

      // Extend PATH so midi2ly can find the bundled Python/lilypond if needed.
      const binDir = path.join(runtimeDir, "bin");
      const pathSep = process.platform === "win32" ? ";" : ":";
      const extPath = `${binDir}${pathSep}${process.env.PATH ?? ""}`;

      let stderr = "";
      const exitCode = await new Promise<number | null>((resolve) => {
        const child = spawn(midi2lyBin, ["-o", outputPath, midiPath], {
          env: { ...process.env, PATH: extPath },
          stdio: ["ignore", "ignore", "pipe"],
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on("error", () => resolve(-1));
        child.on("close", resolve);
      });

      if (exitCode !== 0) {
        return {
          error: `midi2ly exited with code ${exitCode}.\n${stderr}`.trim(),
        };
      }

      const content = await fs.readFile(outputPath, "utf8");
      return { content, logs: stderr.trim() };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  },
);

// ── Snippets & net fetch IPC ─────────────────────────────────────────────────

ipcMain.handle(
  "net:fetch",
  async (_event, url: string): Promise<{ ok: boolean; status: number; text: string }> => {
    try {
      const response = await net.fetch(url, {
        headers: { "User-Agent": "Hacklily-Desktop/1.0" },
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        text: err instanceof Error ? err.message : "Network error",
      };
    }
  },
);

ipcMain.handle("snippets:read", async (): Promise<string | null> => {
  const filePath = path.join(app.getPath("userData"), "snippets.md");
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
});

ipcMain.handle(
  "snippets:write",
  async (_event, content: string): Promise<boolean> => {
    const filePath = path.join(app.getPath("userData"), "snippets.md");
    try {
      await fs.writeFile(filePath, content, "utf8");
      return true;
    } catch {
      return false;
    }
  },
);

// ────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  void bootstrap();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const frontendDir = resolveFrontendDir();
      createWindow(frontendDir);
    }
  });
});

app.on("window-all-closed", async () => {
  if (stopServer) {
    await stopServer();
    stopServer = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  if (stopServer) {
    await stopServer();
    stopServer = null;
  }
});
