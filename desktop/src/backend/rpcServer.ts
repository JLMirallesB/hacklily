import fs from "node:fs/promises";
import path from "node:path";

import { WebSocket, WebSocketServer } from "ws";

import { renderOffline } from "./render";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  RenderParams,
  RuntimeConfig,
} from "./types";

interface RuntimeStats {
  startupTime: Date;
  renders: number;
  saves: number;
  signIns: number;
  inFlight: number;
  queued: number;
}

function isRenderParams(value: unknown): value is RenderParams {
  if (!value || typeof value !== "object") {
    return false;
  }

  const { backend, src } = value as Partial<RenderParams>;
  const validBackend =
    backend === "svg" || backend === "pdf" || backend === "musicxml2ly";
  return validBackend && typeof src === "string";
}

function send(socket: WebSocket, payload: JsonRpcResponse): void {
  socket.send(JSON.stringify(payload));
}

function makeError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    id,
    jsonrpc: "2.0",
    error: {
      code,
      message,
      data,
    },
  };
}

function makeResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return {
    id,
    jsonrpc: "2.0",
    result,
  };
}

async function assertRuntime(runtimeDir: string): Promise<void> {
  const lilypondPath = path.join(
    runtimeDir,
    "bin",
    process.platform === "win32" ? "lilypond.exe" : "lilypond",
  );

  await fs.access(lilypondPath);
}

export async function startRpcServer(config: RuntimeConfig): Promise<() => Promise<void>> {
  await assertRuntime(config.runtimeDir);

  const stats: RuntimeStats = {
    startupTime: new Date(),
    renders: 0,
    saves: 0,
    signIns: 0,
    inFlight: 0,
    queued: 0,
  };

  const wss = new WebSocketServer({ host: "127.0.0.1", port: config.wsPort });

  let renderQueue = Promise.resolve();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    stats.queued += 1;

    const run = async () => {
      stats.queued -= 1;
      stats.inFlight += 1;
      try {
        return await task();
      } finally {
        stats.inFlight -= 1;
      }
    };

    const next = renderQueue.then(run, run);
    renderQueue = next.then(() => undefined, () => undefined);
    return next;
  }

  wss.on("connection", (socket) => {
    socket.on("message", async (raw) => {
      let parsed: JsonRpcRequest;
      try {
        parsed = JSON.parse(raw.toString()) as JsonRpcRequest;
      } catch {
        send(socket, makeError(null, -32700, "Parse error"));
        return;
      }

      const id =
        typeof parsed.id === "string" || typeof parsed.id === "number"
          ? parsed.id
          : null;

      if (parsed.jsonrpc !== "2.0" || typeof parsed.method !== "string") {
        send(socket, makeError(id, -32600, "Invalid request"));
        return;
      }

      switch (parsed.method) {
        case "ping": {
          send(socket, makeResult(id, "pong"));
          return;
        }

        case "notifySaved": {
          stats.saves += 1;
          send(socket, makeResult(id, "ok"));
          return;
        }

        case "get_status": {
          const uptimeSecs = Math.floor(
            (Date.now() - stats.startupTime.getTime()) / 1000,
          );

          send(
            socket,
            makeResult(id, {
              alive: true,
              backlog: stats.queued,
              busy_worker_count: stats.inFlight,
              free_worker_count: stats.inFlight > 0 ? 0 : 1,
              local_worker_count: 1,
              remote_worker_count: 0,
              startup_time: stats.startupTime.toISOString(),
              total_worker_count: 1,
              uptime_secs: uptimeSecs,
              current_active_users: wss.clients.size,
              analytics_renders: stats.renders,
              analytics_saves: stats.saves,
              analytics_sign_in: stats.signIns,
            }),
          );
          return;
        }

        case "signIn":
        case "signOut": {
          stats.signIns += 1;
          send(
            socket,
            makeError(
              id,
              -32000,
              "GitHub integration is disabled in desktop local mode.",
            ),
          );
          return;
        }

        case "render": {
          if (!isRenderParams(parsed.params)) {
            send(socket, makeError(id, -32602, "Invalid params"));
            return;
          }

          stats.renders += 1;

          try {
            const result = await enqueue(() =>
              renderOffline(parsed.params.src, parsed.params.backend, {
                runtimeDir: config.runtimeDir,
              }),
            );

            send(socket, makeResult(id, result));
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Unknown renderer error in offline backend.";

            send(socket, makeError(id, 2, "Render failed", { logs: message }));
          }

          return;
        }

        default: {
          send(socket, makeError(id, -32601, "Method not found"));
        }
      }
    });
  });

  return async () => {
    await new Promise<void>((resolve, reject) => {
      wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };
}
