import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error(
    "Shohstore needs Node.js 24 or newer. Install it from https://nodejs.org/ and run this launcher again.",
  );
  process.exit(1);
}
const isWindows = process.platform === "win32";
function npm(args) {
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
  });
  if (result.error) {
    console.error(
      "Cannot start npm. Reinstall Node.js 24 from https://nodejs.org/.",
      result.error.message,
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(
      "Setup did not complete. Check the error above, Internet access and free disk space, then run the launcher again.",
    );
    process.exit(result.status || 1);
  }
}
const stampPath = resolve("node_modules/.shohstore-install");
const stamp = createHash("sha256")
  .update(readFileSync("package-lock.json"))
  .update(process.versions.node.split(".")[0])
  .digest("hex");
if (
  !existsSync(stampPath) ||
  readFileSync(stampPath, "utf8") !== stamp ||
  !existsSync("node_modules/vite/bin/vite.js")
) {
  console.log(
    "\nShohstore: installing dependencies. The first launch needs Internet access.\n",
  );
  npm(["ci", "--include=dev", "--no-fund"]);
  writeFileSync(stampPath, stamp);
}
console.log("\nShohstore: preparing the shop.\n");
npm(["run", "build"]);
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be a number between 1 and 65535.");
  process.exit(1);
}
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server/index.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["inherit", "pipe", "inherit"],
});
let opened = false;
server.stdout.on("data", async (chunk) => {
  process.stdout.write(chunk);
  if (opened || !chunk.toString().includes("Shohstore running")) return;
  opened = true;
  try {
    const response = await fetch(url + "/api/health");
    if (!response.ok || !(await response.json()).ok)
      throw Error("Health check failed");
    console.log(
      `\nShohstore is ready: ${url}\nKeep this window open. Press Ctrl+C to stop the shop.\n`,
    );
    if (process.env.SHOHSTORE_NO_OPEN === "1") return;
    const command = isWindows
      ? "cmd.exe"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
    const args = isWindows ? ["/d", "/c", "start", "", url] : [url];
    const opener = spawn(command, args, { stdio: "ignore" });
    opener.on("error", () =>
      console.log("Open the address above in your browser."),
    );
    opener.unref();
  } catch (e) {
    console.error("The shop did not pass its readiness check:", e.message);
    server.kill("SIGTERM");
    process.exitCode = 1;
  }
});
server.on("error", (error) => {
  console.error("Cannot start the shop:", error.message);
  process.exitCode = 1;
});
server.on("exit", (code) => {
  process.exitCode = process.exitCode || code || 0;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.kill("SIGTERM");
  });
