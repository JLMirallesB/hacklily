import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { RenderBackend, RenderResult } from "./types";

const LILYPOND_TIMEOUT_MS = 25_000;
const MUSICXML_TIMEOUT_MS = 25_000;

interface CommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

interface RenderCommandContext {
  runtimeDir: string;
}

function toExecutable(baseDir: string, fileName: string): string {
  const binName = process.platform === "win32" ? `${fileName}.exe` : fileName;
  return path.join(baseDir, "bin", binName);
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
      },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

async function collectFiles(sessionDir: string, extension: string): Promise<string[]> {
  const entries = await fs.readdir(sessionDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("output") && name.endsWith(extension))
    .sort();

  const mapped: string[] = [];
  for (const name of files) {
    const filePath = path.join(sessionDir, name);
    if (extension === ".svg") {
      mapped.push(await fs.readFile(filePath, "utf8"));
    } else {
      mapped.push((await fs.readFile(filePath)).toString("base64"));
    }
  }

  return mapped;
}

async function collectMidi(sessionDir: string): Promise<string> {
  const entries = await fs.readdir(sessionDir, { withFileTypes: true });
  const midiFile = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find((name) => name.endsWith(".midi") || name.endsWith(".mid"));

  if (!midiFile) {
    return "";
  }

  return (await fs.readFile(path.join(sessionDir, midiFile))).toString("base64");
}

async function runLilypond(
  src: string,
  backend: Exclude<RenderBackend, "musicxml2ly">,
  context: RenderCommandContext,
): Promise<RenderResult> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hacklily-desktop-"));

  try {
    const lilypondBin = toExecutable(context.runtimeDir, "lilypond");
    const sourceFile = path.join(workDir, "input.ly");
    const outputPrefix = path.join(workDir, "output");

    const renderedSrc =
      backend === "svg" ? `#(ly:set-option 'backend 'svg)\n${src}` : src;

    await fs.writeFile(sourceFile, renderedSrc, "utf8");

    const result = await runCommand(
      lilypondBin,
      ["-dpoint-and-click=#f", "-o", outputPrefix, sourceFile],
      workDir,
      LILYPOND_TIMEOUT_MS,
    );

    const logs = [result.stderr, result.stdout]
      .filter((chunk) => chunk.trim().length > 0)
      .join("\n")
      .trim();

    if (result.timedOut) {
      return {
        files: [],
        logs: `${logs}\nTimeout: render exceeded ${LILYPOND_TIMEOUT_MS}ms.`.trim(),
        midi: "",
      };
    }

    if (result.code !== 0 && result.code !== null) {
      return {
        files: [],
        logs: `${logs}\nRenderer exited with code ${result.code}.`.trim(),
        midi: "",
      };
    }

    const extension = backend === "svg" ? ".svg" : ".pdf";

    return {
      files: await collectFiles(workDir, extension),
      logs,
      midi: await collectMidi(workDir),
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function runMusicXml2Ly(
  src: string,
  context: RenderCommandContext,
): Promise<RenderResult> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hacklily-desktop-"));

  try {
    const musicxmlBin = toExecutable(context.runtimeDir, "musicxml2ly");
    const inputPath = path.join(workDir, "input.musicxml");
    const outputPath = path.join(workDir, "output.musicxml2ly.ly");

    await fs.writeFile(inputPath, src, "utf8");

    const result = await runCommand(
      musicxmlBin,
      [inputPath, "-o", outputPath],
      workDir,
      MUSICXML_TIMEOUT_MS,
    );

    const logs = [result.stderr, result.stdout]
      .filter((chunk) => chunk.trim().length > 0)
      .join("\n")
      .trim();

    if (result.timedOut) {
      return {
        files: [],
        logs: `${logs}\nTimeout: musicxml2ly exceeded ${MUSICXML_TIMEOUT_MS}ms.`.trim(),
        midi: "",
      };
    }

    if (result.code !== 0 && result.code !== null) {
      return {
        files: [],
        logs: `${logs}\nmusicxml2ly exited with code ${result.code}.`.trim(),
        midi: "",
      };
    }

    const out = await fs.readFile(outputPath, "utf8");
    return {
      files: [out],
      logs,
      midi: "",
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function renderOffline(
  src: string,
  backend: RenderBackend,
  context: RenderCommandContext,
): Promise<RenderResult> {
  if (backend === "musicxml2ly") {
    return runMusicXml2Ly(src, context);
  }

  return runLilypond(src, backend, context);
}
