export type RenderBackend = "svg" | "pdf" | "musicxml2ly";

export interface RenderParams {
  backend: RenderBackend;
  src: string;
  version?: "stable" | "unstable";
}

export interface RenderResult {
  files: string[];
  logs: string;
  midi: string;
}

export interface JsonRpcRequest {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  id: string | number | null;
  jsonrpc: "2.0";
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface RuntimeConfig {
  runtimeDir: string;
  wsPort: number;
}
