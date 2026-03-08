import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code ?? "unknown"}`));
      }
    });
  });
}

const desktopPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
);

const webpackBin = path.resolve(repoRoot, "node_modules", "webpack", "bin", "webpack.js");
const env = {
  ...process.env,
  REACT_APP_BACKEND_WS_URL: process.env.REACT_APP_BACKEND_WS_URL || "ws://127.0.0.1:3210",
  REACT_APP_GITHUB_CLIENT_ID: process.env.REACT_APP_GITHUB_CLIENT_ID || "",
  REACT_APP_VERSION: desktopPkg.version,
};

await run("node", [webpackBin], {
  cwd: repoRoot,
  env,
});
