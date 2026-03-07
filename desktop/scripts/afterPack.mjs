import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * electron-builder afterPack hook.
 * Signs the macOS app bundle with an ad-hoc identity ("-") so Gatekeeper
 * shows "developer cannot be verified" instead of "app is damaged".
 * Right-click → Open bypasses the warning without a paid Developer ID.
 */
export default async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[afterPack] Ad-hoc signing: ${appPath}`);

  execFileSync(
    "codesign",
    ["--deep", "--force", "--sign", "-", appPath],
    { stdio: "inherit" },
  );

  console.log("[afterPack] Ad-hoc signing complete.");
}
