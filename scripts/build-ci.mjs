import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const distDir = ".next-ci";

await rm(distDir, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 250,
});

const child = spawn("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDir,
  },
});

const exitCode = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", resolve);
});

if (exitCode !== 0) {
  process.exit(exitCode ?? 1);
}
