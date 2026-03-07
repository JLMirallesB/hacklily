import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimeRoot = path.resolve(__dirname, "..", "runtime", "current", "bin");

const isWindows = process.platform === "win32";
const lilypondName = isWindows ? "lilypond.exe" : "lilypond";
const musicxml2lyName = isWindows ? "musicxml2ly.exe" : "musicxml2ly";

const lilypondPath = path.join(runtimeRoot, lilypondName);
const musicxml2lyPath = path.join(runtimeRoot, musicxml2lyName);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const hasLilypond = await exists(lilypondPath);
if (!hasLilypond) {
  throw new Error(
    [
      `Runtime missing: ${lilypondPath}`,
      "Place a packaged LilyPond runtime under desktop/runtime/current/bin before building installers.",
    ].join("\n"),
  );
}

const hasMusicxml2ly = await exists(musicxml2lyPath);
if (!hasMusicxml2ly) {
  console.warn(
    `Warning: ${musicxml2lyPath} was not found. The musicxml2ly converter screen will return an offline error.`,
  );
}
