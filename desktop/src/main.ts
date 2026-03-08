import { app, BrowserWindow, dialog, net, protocol, session, shell } from "electron";
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
  const runtimeDir = resolveRuntimeDir();
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
