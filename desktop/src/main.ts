import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";

import { startRpcServer } from "./backend/rpcServer";

const WS_PORT = 3210;

let mainWindow: BrowserWindow | null = null;
let stopServer: null | (() => Promise<void>) = null;

function resolveFrontendIndex(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "frontend", "index.html");
  }

  return path.resolve(__dirname, "../../dist/index.html");
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

function createWindow(): void {
  const indexFile = resolveFrontendIndex();
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
    },
  });

  void mainWindow.loadFile(indexFile);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap(): Promise<void> {
  const runtimeDir = resolveRuntimeDir();

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

  createWindow();
}

app.whenReady().then(() => {
  void bootstrap();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
