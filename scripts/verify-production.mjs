import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const startupTimeoutMs = 30_000;

const port = await getOpenPort();
const baseUrl = `http://localhost:${port}`;
const serverCommand = process.platform === "win32" ? "cmd.exe" : "pnpm";
const serverArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", `pnpm start -- -p ${port}`]
    : ["run", "start", "--", "-p", String(port)];
const accessPassword =
  process.env.ACCESS_WALL_PASSWORD || "frame-desk-production-verifier";

let server;

try {
  server = spawn(serverCommand, serverArgs, {
    env: {
      ...process.env,
      ACCESS_WALL_PASSWORD: accessPassword,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  await waitForServer(baseUrl, () => output);

  const verifier = spawn(process.execPath, ["scripts/verify.mjs"], {
    env: {
      ...process.env,
      CUTLAB_VERIFY_ACCESS_PASSWORD: accessPassword,
      CUTLAB_VERIFY_URL: baseUrl,
    },
    stdio: "inherit",
    windowsHide: true,
  });
  const code = await waitForExit(verifier);
  if (code !== 0) process.exit(code ?? 1);
} finally {
  if (server && !server.killed) {
    stopServer(server);
  }
}

async function getOpenPort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.on("error", reject);
    socket.listen(0, () => {
      const address = socket.address();
      if (!address || typeof address === "string") {
        socket.close(() =>
          reject(new Error("Could not allocate a local port."))
        );
        return;
      }
      const selectedPort = address.port;
      socket.close(() => resolve(selectedPort));
    });
  });
}

async function waitForServer(url, getOutput) {
  const started = Date.now();
  while (Date.now() - started < startupTimeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // Retry until the server is ready or the startup timeout expires.
    }
    if (server?.exitCode !== null) {
      throw new Error(
        `Production server exited before verification.\n${getOutput()}`
      );
    }
    await delay(300);
  }
  throw new Error(
    `Production server did not start within ${startupTimeoutMs / 1000}s.\n${getOutput()}`
  );
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code));
  });
}

function stopServer(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }
  child.kill("SIGTERM");
}
