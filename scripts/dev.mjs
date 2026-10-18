import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--watch", "server/index.mjs"], {
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PORT || "3001" },
  }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
function stop() {
  for (const p of children) p.kill("SIGTERM");
}
for (const s of ["SIGINT", "SIGTERM"])
  process.on(s, () => {
    stop();
    process.exit(0);
  });
for (const p of children)
  p.on("exit", (code) => {
    stop();
    process.exit(code ?? 0);
  });
