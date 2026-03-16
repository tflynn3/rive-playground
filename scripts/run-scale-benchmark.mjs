import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

const repoRoot = process.cwd();

function parseArgs(argv) {
  const args = {
    targets: "50,100,150,200",
    dwellMs: 800,
    hoverSampleSize: 4,
    minFps: null,
    browser: null,
    width: 1600,
    height: 900,
    deviceScaleFactor: 1
  };

  argv.forEach((arg) => {
    const [key, value] = arg.split("=");
    if (key === "--targets" && value) args.targets = value;
    if (key === "--dwellMs" && value) args.dwellMs = Number(value);
    if (key === "--hoverSampleSize" && value) args.hoverSampleSize = Number(value);
    if (key === "--minFps" && value) args.minFps = Number(value);
    if (key === "--browser" && value) args.browser = value;
    if (key === "--width" && value) args.width = Number(value);
    if (key === "--height" && value) args.height = Number(value);
    if (key === "--deviceScaleFactor" && value) args.deviceScaleFactor = Number(value);
  });

  return args;
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "text/plain; charset=utf-8";
}

async function createStaticServer(rootDir) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      let filePath = path.join(rootDir, safePath);
      const stat = await fs.stat(filePath).catch(() => null);
      if (stat && stat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      const data = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(data);
    } catch (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function resolveBrowser(preferred) {
  const candidates = preferred
    ? [preferred]
    : [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      ];

  return candidates.find((candidate) => {
    return !!candidate && existsSync(candidate);
  });
}

async function waitForDebugger(port, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch (error) {
      // Browser not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for Chrome DevTools endpoint.");
}

class CdpClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) {
          reject(new Error(payload.error.message || "CDP error"));
        } else {
          resolve(payload.result);
        }
        return;
      }
      if (payload.method) {
        const handlers = this.listeners.get(payload.method) || [];
        handlers.forEach((handler) => handler(payload.params));
      }
    });
  }

  async connect() {
    await this.opened;
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(message);
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) || [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  close() {
    this.socket.close();
  }
}

async function launchBrowser(browserPath, port, userDataDir, width, height, deviceScaleFactor) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    `--force-device-scale-factor=${deviceScaleFactor}`,
    "about:blank"
  ];
  return spawn(browserPath, args, { stdio: ["ignore", "ignore", "pipe"] });
}

async function closeBrowser(child) {
  if (!child || child.exitCode != null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
  });
}

async function runBrowser(browserPath, url, timeoutMs, viewport) {
  const remotePort = 9222 + Math.floor(Math.random() * 400);
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "rive-bench-"));
  const child = await launchBrowser(
    browserPath,
    remotePort,
    userDataDir,
    viewport.width,
    viewport.height,
    viewport.deviceScaleFactor
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  try {
    const pageTarget = await waitForDebugger(remotePort, 10000);
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      mobile: false
    });

    const loadEvent = new Promise((resolve) => client.on("Page.loadEventFired", resolve));
    await client.send("Page.navigate", { url });
    await loadEvent;

    const startedAt = Date.now();
    let lastResult = null;
    while (Date.now() - startedAt < timeoutMs) {
      const evaluation = await client.send("Runtime.evaluate", {
        expression: "JSON.stringify(window.__meshScaleTestResult || null)",
        returnByValue: true
      });
      const raw = evaluation.result?.value;
      if (raw) {
        lastResult = JSON.parse(raw);
        if (lastResult && (lastResult.status === "complete" || lastResult.status === "stopped")) {
          client.close();
          return lastResult;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    client.close();
    throw new Error(`Timed out waiting for scale test completion. Last result: ${JSON.stringify(lastResult)}\n${stderr}`);
  } finally {
    await closeBrowser(child);
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const browserPath = resolveBrowser(args.browser);
  if (!browserPath) {
    throw new Error("No supported browser found. Pass --browser=<path> to override.");
  }

  const server = await createStaticServer(repoRoot);
  const port = server.address().port;
  const params = new URLSearchParams({
    autorun: "1",
    overlay: "0",
    console: "0",
    targets: args.targets,
    dwellMs: String(args.dwellMs),
    hoverSampleSize: String(args.hoverSampleSize)
  });
  const url = `http://127.0.0.1:${port}/v2/core-gravity-dynamic-test.html?${params.toString()}`;
  const targets = args.targets.split(",").filter(Boolean);
  const timeoutMs = Math.max(20000, 5000 + (targets.length * (args.dwellMs * 4)));

  try {
    const result = await runBrowser(browserPath, url, timeoutMs, {
      width: args.width,
      height: args.height,
      deviceScaleFactor: args.deviceScaleFactor
    });

    console.log(`Benchmark status: ${result.status}`);
    if (result.results?.length) {
      console.table(result.results);
    }
    console.log(JSON.stringify(result, null, 2));

    if (args.minFps != null) {
      const finalFps = result.summary?.fps ?? result.results?.at(-1)?.fps ?? 0;
      if (finalFps < args.minFps) {
        process.exitCode = 1;
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();
