#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    scope: "full",
    includeWs: true,
    host: "127.0.0.1",
    httpPort: 5810,
    wsPort: 5811,
    timeoutMs: 5000,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--scope" && argv[i + 1]) {
      args.scope = argv[++i];
      continue;
    }
    if (token === "--ws") {
      args.includeWs = true;
      continue;
    }
    if (token === "--no-ws") {
      args.includeWs = false;
      continue;
    }
    if (token === "--host" && argv[i + 1]) {
      args.host = argv[++i];
      continue;
    }
    if (token === "--http-port" && argv[i + 1]) {
      args.httpPort = Number(argv[++i]);
      continue;
    }
    if (token === "--ws-port" && argv[i + 1]) {
      args.wsPort = Number(argv[++i]);
      continue;
    }
    if (token === "--timeout-ms" && argv[i + 1]) {
      args.timeoutMs = Number(argv[++i]);
      continue;
    }
    if (token === "--help" || token === "-h") {
      printUsageAndExit(0);
    }
    console.error(`Unknown argument: ${token}`);
    printUsageAndExit(2);
  }

  if (!["smoke", "full"].includes(args.scope)) {
    console.error(`Invalid --scope value: ${args.scope}`);
    printUsageAndExit(2);
  }

  return args;
}

function printUsageAndExit(code) {
  console.log("Usage: node state-server/scripts/state-server-endpoint-checks.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --scope smoke|full   Endpoint coverage scope (default: full)");
  console.log("  --ws                 Include WebSocket checks (default)");
  console.log("  --no-ws              Skip WebSocket checks");
  console.log("  --host <host>        Server host (default: 127.0.0.1)");
  console.log("  --http-port <port>   HTTP port (default: 5810)");
  console.log("  --ws-port <port>     WS port (default: 5811)");
  console.log("  --timeout-ms <ms>    Request timeout in ms (default: 5000)");
  process.exit(code);
}

function createRunner() {
  return {
    passed: [],
    failed: [],
    warnings: [],
    pass(name, details) {
      this.passed.push({ name, details });
      console.log(`PASS ${name}: ${details}`);
    },
    fail(name, details, repro) {
      this.failed.push({ name, details, repro });
      console.error(`FAIL ${name}: ${details}`);
      if (repro) {
        console.error(`  repro: ${repro}`);
      }
    },
    warn(name, details) {
      this.warnings.push({ name, details });
      console.warn(`WARN ${name}: ${details}`);
    },
  };
}

async function jsonRequest(baseUrl, method, endpointPath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  try {
    const response = await fetch(`${baseUrl}${endpointPath}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let body = text;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") && text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    return {
      status: response.status,
      headers: response.headers,
      body,
      rawText: text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function requireStatus(runner, checkName, response, expected, repro) {
  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(response.status)) {
    const preview =
      typeof response.rawText === "string"
        ? response.rawText.slice(0, 200).replace(/\s+/g, " ")
        : "";
    runner.fail(
      checkName,
      `expected status ${expectedList.join("|")}, got ${response.status}${preview ? `, body=${preview}` : ""}`,
      repro
    );
    return false;
  }
  runner.pass(checkName, `status=${response.status}`);
  return true;
}

function assertCondition(runner, checkName, condition, details, repro) {
  if (!condition) {
    runner.fail(checkName, details, repro);
    return false;
  }
  runner.pass(checkName, details);
  return true;
}

function randomUuidLike() {
  const hex = "0123456789abcdef";
  const pick = (count) =>
    Array.from({ length: count }, () => hex[Math.floor(Math.random() * hex.length)]).join("");
  return `${pick(8)}-${pick(4)}-4${pick(3)}-8${pick(3)}-${pick(12)}`;
}

async function loadTrajectoryFixture() {
  const thisFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(thisFile), "..", "..");
  const fixturePath = path.join(repoRoot, "test", "test-default.traj");
  const text = await readFile(fixturePath, "utf8");
  return JSON.parse(text);
}

function wsAvailable() {
  return typeof WebSocket !== "undefined";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForWsEvent(target, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      target.removeEventListener("open", onOpen);
      target.removeEventListener("close", onClose);
      target.removeEventListener("message", onMessage);
      target.removeEventListener("error", onError);
    }

    function onOpen(event) {
      if (eventName === "open") {
        cleanup();
        resolve(event);
      }
    }

    function onClose(event) {
      if (eventName === "close") {
        cleanup();
        resolve(event);
      }
    }

    function onMessage(event) {
      if (eventName === "message") {
        cleanup();
        resolve(event);
      }
    }

    function onError(event) {
      cleanup();
      reject(new Error(`WebSocket error while waiting for ${eventName}: ${String(event.type)}`));
    }

    target.addEventListener("open", onOpen);
    target.addEventListener("close", onClose);
    target.addEventListener("message", onMessage);
    target.addEventListener("error", onError);
  });
}

function waitForWsCloseOrError(target, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for websocket close/error"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      target.removeEventListener("close", onClose);
      target.removeEventListener("error", onError);
    }

    function onClose(event) {
      cleanup();
      resolve({ kind: "close", event });
    }

    function onError(event) {
      cleanup();
      resolve({ kind: "error", event });
    }

    target.addEventListener("close", onClose);
    target.addEventListener("error", onError);
  });
}

async function runWsChecks(args, runner) {
  if (!wsAvailable()) {
    runner.warn("WS availability", "Global WebSocket API is not available in this Node runtime");
    return;
  }

  const wsBase = `ws://${args.host}:${args.wsPort}`;

  let subscriber;
  let producer;
  try {
    subscriber = new WebSocket(`${wsBase}/progress`);
    await waitForWsEvent(subscriber, "open", args.timeoutMs);
    runner.pass("WS /progress connect", `connected to ${wsBase}/progress`);

    const badProducer = new WebSocket(`${wsBase}/progress/not-a-number`);
    try {
      const badResult = await waitForWsCloseOrError(badProducer, args.timeoutMs);
      if (badResult.kind === "close" && Number(badResult.event.code) === 1008) {
        runner.pass("WS /progress/{operationId} invalid id", "closed with policy code 1008");
      } else if (badResult.kind === "error") {
        runner.pass("WS /progress/{operationId} invalid id", "connection was rejected with websocket error");
      } else {
        runner.fail(
          "WS /progress/{operationId} invalid id",
          `expected close code 1008 or connection error, got close code ${Number(badResult.event.code)}`,
          `node state-server/scripts/state-server-endpoint-checks.mjs --scope ${args.scope} --ws`
        );
      }
    } catch (err) {
      runner.warn(
        "WS /progress/{operationId} invalid id",
        `Did not observe close/error for invalid id within timeout: ${String(err)}`
      );
    }

    if (badProducer.readyState === WebSocket.OPEN) {
      badProducer.close(1000, "done");
    }

    const operationId = 999999;
    producer = new WebSocket(`${wsBase}/progress/${operationId}`);
    await waitForWsEvent(producer, "open", args.timeoutMs);

    const messagePromise = waitForWsEvent(subscriber, "message", args.timeoutMs);
    producer.send(JSON.stringify({ event: "running", source: "endpoint-check-script" }));
    const event = await messagePromise;
    let payload;
    try {
      payload = JSON.parse(String(event.data));
    } catch (err) {
      runner.fail(
        "WS wrapped payload parse",
        `subscriber received non-JSON message: ${String(err)}`,
        `node state-server/scripts/state-server-endpoint-checks.mjs --scope ${args.scope} --ws`
      );
      return;
    }

    const opMatches = payload && payload.operationId === operationId;
    const frameLooksRight = payload && payload.frame && payload.frame.event === "running";
    assertCondition(
      runner,
      "WS wrapped payload shape",
      opMatches && frameLooksRight,
      `received operationId=${payload.operationId}, frame.event=${payload.frame?.event}`,
      `node state-server/scripts/state-server-endpoint-checks.mjs --scope ${args.scope} --ws`
    );
  } catch (err) {
    runner.fail(
      "WS checks",
      String(err),
      `node state-server/scripts/state-server-endpoint-checks.mjs --scope ${args.scope} --ws`
    );
  } finally {
    if (producer && producer.readyState === WebSocket.OPEN) {
      producer.close(1000, "done");
    }
    if (subscriber && subscriber.readyState === WebSocket.OPEN) {
      subscriber.close(1000, "done");
    }
  }
}

async function runHttpChecks(args, runner) {
  const baseUrl = `http://${args.host}:${args.httpPort}`;
  const reproBase = `node state-server/scripts/state-server-endpoint-checks.mjs --scope ${args.scope} ${args.includeWs ? "--ws" : "--no-ws"}`;

  const health = await jsonRequest(baseUrl, "GET", "/api/v1/health", { timeoutMs: args.timeoutMs });
  if (requireStatus(runner, "GET /api/v1/health", health, 200, reproBase)) {
    const body = health.body;
    assertCondition(
      runner,
      "GET /api/v1/health shape",
      body && body.status === "ok" && typeof body.uptimeMs === "number",
      `status=${body?.status}, uptimeMsType=${typeof body?.uptimeMs}`,
      reproBase
    );
  }

  const project = await jsonRequest(baseUrl, "GET", "/api/v1/project", { timeoutMs: args.timeoutMs });
  let projectEtag = null;
  if (requireStatus(runner, "GET /api/v1/project", project, 200, reproBase)) {
    projectEtag = project.headers.get("etag");
    assertCondition(
      runner,
      "GET /api/v1/project etag",
      Boolean(projectEtag),
      `etag=${projectEtag}`,
      reproBase
    );
  }

  const putWithoutIfMatch = await jsonRequest(baseUrl, "PUT", "/api/v1/project", {
    timeoutMs: args.timeoutMs,
    body: project.body,
  });
  requireStatus(runner, "PUT /api/v1/project missing If-Match", putWithoutIfMatch, 428, reproBase);

  const putWithStaleIfMatch = await jsonRequest(baseUrl, "PUT", "/api/v1/project", {
    timeoutMs: args.timeoutMs,
    headers: { "If-Match": "\"project-0\"" },
    body: project.body,
  });
  requireStatus(runner, "PUT /api/v1/project stale If-Match", putWithStaleIfMatch, 409, reproBase);

  const listTrajectories = await jsonRequest(baseUrl, "GET", "/api/v1/trajectories", {
    timeoutMs: args.timeoutMs,
  });
  let templateTrajectory = null;
  if (requireStatus(runner, "GET /api/v1/trajectories", listTrajectories, 200, reproBase)) {
    const items = listTrajectories.body?.items;
    assertCondition(
      runner,
      "GET /api/v1/trajectories shape",
      Array.isArray(items),
      `itemsCount=${Array.isArray(items) ? items.length : "n/a"}`,
      reproBase
    );

    if (Array.isArray(items) && items.length > 0 && typeof items[0]?.uuid === "string") {
      const seedTrajectory = await jsonRequest(
        baseUrl,
        "GET",
        `/api/v1/trajectories/${items[0].uuid}`,
        { timeoutMs: args.timeoutMs }
      );
      if (seedTrajectory.status === 200 && seedTrajectory.body && typeof seedTrajectory.body === "object") {
        templateTrajectory = seedTrajectory.body;
      }
    }
  }

  const newUuid = randomUuidLike();
  const fixture = templateTrajectory
    ? JSON.parse(JSON.stringify(templateTrajectory))
    : await loadTrajectoryFixture();
  fixture.uuid = newUuid;
  fixture.name = `Endpoint Check ${newUuid.slice(0, 8)}`;

  const createTrajectory = await jsonRequest(baseUrl, "POST", "/api/v1/trajectories", {
    timeoutMs: args.timeoutMs,
    body: fixture,
  });
  let trajectoryEtag = null;
  const createdOk = requireStatus(runner, "POST /api/v1/trajectories", createTrajectory, 201, reproBase);
  if (createdOk) {
    trajectoryEtag = createTrajectory.headers.get("etag");
    assertCondition(
      runner,
      "POST /api/v1/trajectories etag",
      Boolean(trajectoryEtag),
      `etag=${trajectoryEtag}`,
      reproBase
    );
  } else {
    runner.warn("Trajectory-dependent checks", "Skipping trajectory mutation/generation checks because create failed");
  }

  if (!createdOk) {
    if (args.scope === "full") {
      const diagnostics = await jsonRequest(baseUrl, "GET", "/api/v1/diagnostics", {
        timeoutMs: args.timeoutMs,
      });
      requireStatus(runner, "GET /api/v1/diagnostics", diagnostics, 200, reproBase);
    }
    return;
  }

  const getTrajectory = await jsonRequest(baseUrl, "GET", `/api/v1/trajectories/${newUuid}`, {
    timeoutMs: args.timeoutMs,
  });
  if (requireStatus(runner, "GET /api/v1/trajectories/{uuid}", getTrajectory, 200, reproBase)) {
    trajectoryEtag = getTrajectory.headers.get("etag") || trajectoryEtag;
    assertCondition(
      runner,
      "GET /api/v1/trajectories/{uuid} body",
      getTrajectory.body?.uuid === newUuid,
      `uuid=${getTrajectory.body?.uuid}`,
      reproBase
    );
  }

  const patchWithoutIfMatch = await jsonRequest(baseUrl, "PATCH", `/api/v1/trajectories/${newUuid}`, {
    timeoutMs: args.timeoutMs,
    body: { name: "Should Fail Without If-Match" },
  });
  requireStatus(
    runner,
    "PATCH /api/v1/trajectories/{uuid} missing If-Match",
    patchWithoutIfMatch,
    428,
    reproBase
  );

  const patchWithStaleIfMatch = await jsonRequest(baseUrl, "PATCH", `/api/v1/trajectories/${newUuid}`, {
    timeoutMs: args.timeoutMs,
    headers: { "If-Match": "\"traj-stale\"" },
    body: { name: "Should Fail With Stale If-Match" },
  });
  requireStatus(
    runner,
    "PATCH /api/v1/trajectories/{uuid} stale If-Match",
    patchWithStaleIfMatch,
    409,
    reproBase
  );

  const generationStateWithoutIfMatch = await jsonRequest(
    baseUrl,
    "GET",
    `/api/v1/trajectories/${newUuid}/generation-state`,
    { timeoutMs: args.timeoutMs }
  );
  requireStatus(
    runner,
    "GET /api/v1/trajectories/{uuid}/generation-state missing If-Match",
    generationStateWithoutIfMatch,
    428,
    reproBase
  );

  if (trajectoryEtag) {
    const generationStateWithIfMatch = await jsonRequest(
      baseUrl,
      "GET",
      `/api/v1/trajectories/${newUuid}/generation-state`,
      {
        timeoutMs: args.timeoutMs,
        headers: { "If-Match": trajectoryEtag },
      }
    );
    requireStatus(
      runner,
      "GET /api/v1/trajectories/{uuid}/generation-state with If-Match",
      generationStateWithIfMatch,
      200,
      reproBase
    );

    const generate = await jsonRequest(baseUrl, "POST", `/api/v1/trajectories/${newUuid}/generate`, {
      timeoutMs: args.timeoutMs,
      headers: { "If-Match": trajectoryEtag },
      body: {},
    });

    let operationId = null;
    if (requireStatus(runner, "POST /api/v1/trajectories/{uuid}/generate", generate, 202, reproBase)) {
      operationId = generate.body?.operationId;
      assertCondition(
        runner,
        "POST /api/v1/trajectories/{uuid}/generate body",
        Number.isInteger(operationId),
        `operationId=${operationId}`,
        reproBase
      );
    }

    if (Number.isInteger(operationId)) {
      const getOperation = await jsonRequest(baseUrl, "GET", `/api/v1/operations/${operationId}`, {
        timeoutMs: args.timeoutMs,
      });
      requireStatus(runner, "GET /api/v1/operations/{operationId}", getOperation, 200, reproBase);

      await sleep(1500); // Wait for a short period before attempting to cancel the operation
      const cancelOperation = await jsonRequest(
        baseUrl,
        "POST",
        `/api/v1/operations/${operationId}/cancel`,
        {
          timeoutMs: args.timeoutMs,
        }
      );
      requireStatus(
        runner,
        "POST /api/v1/operations/{operationId}/cancel",
        cancelOperation,
        [202, 409],
        reproBase
      );
    }

    const cancelAll = await jsonRequest(
      baseUrl,
      "POST",
      "/api/v1/generate/cancel-all",
      { timeoutMs: args.timeoutMs }
    );
    requireStatus(
      runner,
      "POST /api/v1/generate/cancel-all",
      cancelAll,
      202,
      reproBase
    );
  } else {
    runner.warn(
      "Trajectory ETag dependent checks",
      "Skipped generate and generation-state positive checks because trajectory ETag was unavailable"
    );
  }

  if (args.scope === "full") {
    const diagnostics = await jsonRequest(baseUrl, "GET", "/api/v1/diagnostics", {
      timeoutMs: args.timeoutMs,
    });
    requireStatus(runner, "GET /api/v1/diagnostics", diagnostics, 200, reproBase);

    const exportRes = await jsonRequest(baseUrl, "GET", "/api/v1/export", {
      timeoutMs: args.timeoutMs,
    });

    let exportBundle = null;
    if (requireStatus(runner, "GET /api/v1/export", exportRes, 200, reproBase)) {
      exportBundle = exportRes.body;
      assertCondition(
        runner,
        "GET /api/v1/export shape",
        exportBundle && typeof exportBundle === "object",
        "received export bundle object",
        reproBase
      );
    }

    if (exportBundle) {
      const importRes = await jsonRequest(baseUrl, "POST", "/api/v1/import", {
        timeoutMs: args.timeoutMs,
        body: {
          mode: "merge",
          bundle: exportBundle,
          idempotencyKey: `endpoint-check-${Date.now()}`,
        },
      });
      requireStatus(runner, "POST /api/v1/import", importRes, 202, reproBase);
    }
  }

  const latestTrajectory = await jsonRequest(baseUrl, "GET", `/api/v1/trajectories/${newUuid}`, {
    timeoutMs: args.timeoutMs,
  });
  const latestEtag = latestTrajectory.headers.get("etag") || trajectoryEtag;

  const deleteHeaders = latestEtag ? { "If-Match": latestEtag } : {};
  const deleteTrajectory = await jsonRequest(baseUrl, "DELETE", `/api/v1/trajectories/${newUuid}`, {
    timeoutMs: args.timeoutMs,
    headers: deleteHeaders,
  });
  requireStatus(runner, "DELETE /api/v1/trajectories/{uuid}", deleteTrajectory, 204, reproBase);

  const getDeleted = await jsonRequest(baseUrl, "GET", `/api/v1/trajectories/${newUuid}`, {
    timeoutMs: args.timeoutMs,
  });
  requireStatus(runner, "GET deleted /api/v1/trajectories/{uuid}", getDeleted, 404, reproBase);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runner = createRunner();

  console.log("State-server endpoint checks");
  console.log(`scope=${args.scope} ws=${args.includeWs} http=${args.host}:${args.httpPort} ws=${args.host}:${args.wsPort}`);

  try {
    await runHttpChecks(args, runner);
    if (args.includeWs) {
      await runWsChecks(args, runner);
    }
  } catch (err) {
    runner.fail("Unexpected run error", String(err), "Inspect server logs and rerun script");
  }

  console.log("");
  console.log(`Summary: pass=${runner.passed.length} fail=${runner.failed.length} warn=${runner.warnings.length}`);

  if (runner.failed.length > 0) {
    process.exit(1);
  }
}

await main();
