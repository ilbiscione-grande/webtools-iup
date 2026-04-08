import { readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const distPrefix = ".next-ci-";
const distDir = `${distPrefix}${Date.now()}`;
const tsconfigPath = `tsconfig.ci.${Date.now()}.json`;

const cleanupOldCiDirs = async () => {
  const entries = await readdir(".", { withFileTypes: true });
  const targets = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(distPrefix))
    .map((entry) => entry.name)
    .sort()
    .slice(0, -2);

  await Promise.all(
    targets.map(async (target) => {
      try {
        await rm(target, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 250,
        });
      } catch {
        // Locked Windows build artifacts should not fail the current CI run.
      }
    })
  );
};

await cleanupOldCiDirs();

await writeFile(
  tsconfigPath,
  `${JSON.stringify(
    {
      extends: "./tsconfig.json",
      include: [
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        `${distDir}/types/**/*.ts`,
        `${distDir}/dev/types/**/*.ts`,
      ],
      exclude: ["node_modules"],
    },
    null,
    2
  )}\n`
);

const child = spawn("npx", ["next", "build", "--webpack"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDir,
    NEXT_TSCONFIG_PATH: tsconfigPath,
  },
});

const exitCode = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", resolve);
});

try {
  await rm(path.resolve(tsconfigPath), { force: true });
} catch {
  // Temp tsconfig cleanup should not affect CI result.
}

if (exitCode !== 0) {
  process.exit(exitCode ?? 1);
}
