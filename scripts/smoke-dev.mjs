import { spawn } from "node:child_process";

const port = process.env.SMOKE_PORT || "3105";
const host = "127.0.0.1";
const baseUrl = `http://${host}:${port}`;

const routes = [
  { path: "/", mustInclude: ["Teamzone IUP"] },
  { path: "/settings", mustInclude: ["Teamzone IUP"] },
  { path: "/squad", mustInclude: ["Teamzone IUP"] },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "teamzone-iup-smoke",
    },
  });

  if (!response.ok) {
    throw new Error(`Smoke request failed for ${url}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Smoke request for ${url} returned non-HTML content: ${contentType}`);
  }

  return response.text();
};

const waitForServer = async () => {
  let lastError = null;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await fetchText(baseUrl);
      return;
    } catch (error) {
      lastError = error;
      await delay(1000);
    }
  }

  throw lastError ?? new Error("Smoke server did not start in time.");
};

const child = spawn("npx", ["next", "dev", "--hostname", host, "--port", port], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

const stopServer = async () => {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5000),
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
};

try {
  await waitForServer();

  for (const route of routes) {
    const html = await fetchText(`${baseUrl}${route.path}`);
    for (const snippet of route.mustInclude) {
      if (!html.includes(snippet)) {
        throw new Error(
          `Smoke route ${route.path} did not include expected text: ${snippet}`
        );
      }
    }
  }
} finally {
  await stopServer();
}
