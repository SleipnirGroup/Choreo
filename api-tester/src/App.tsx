import { useMemo, useRef, useState } from "react";
import {
  CONSTRAINT_TO_ADD,
  IMPORT_BUNDLE,
  MARKER_TO_ADD,
  PROJECT_FIXTURE,
  TRAJECTORY_FIXTURE,
  WAYPOINT_TO_ADD,
  type JsonRecord
} from "./fixtures";

type LogKind = "http" | "ws" | "info" | "error";

type LogEntry = {
  id: number;
  ts: string;
  kind: LogKind;
  title: string;
  details: string;
};

type RuntimeState = {
  projectEtag: string | null;
  trajectoryEtag: string | null;
  operationId: number | null;
  importOperationId: number | null;
  activeTrajectoryUuid: string;
  activeWaypointUuid: string;
  activeConstraintUuid: string;
  activeMarkerUuid: string;
};

type RequestSpec = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  withProjectEtag?: boolean;
  withTrajectoryEtag?: boolean;
  expectedStatus: number | number[];
};

let logIdCounter = 1;

const initialRuntimeState: RuntimeState = {
  projectEtag: null,
  trajectoryEtag: null,
  operationId: null,
  importOperationId: null,
  activeTrajectoryUuid: String(TRAJECTORY_FIXTURE.uuid),
  activeWaypointUuid: String(WAYPOINT_TO_ADD.uuid),
  activeConstraintUuid: String(CONSTRAINT_TO_ADD.uuid),
  activeMarkerUuid: String(MARKER_TO_ADD.uuid)
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function wsUrlFromBase(wsBase: string): string {
  if (wsBase.startsWith("ws://") || wsBase.startsWith("wss://")) {
    return `${wsBase.replace(/\/$/, "")}/progress`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (!wsBase) {
    return `${protocol}://${window.location.host}/progress`;
  }

  if (wsBase.startsWith("http://") || wsBase.startsWith("https://")) {
    const parsed = new URL(wsBase);
    const wsProto = parsed.protocol === "https:" ? "wss" : "ws";
    return `${wsProto}://${parsed.host}/progress`;
  }

  return `${protocol}://${wsBase.replace(/\/$/, "")}/progress`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function App() {
  const [httpBase, setHttpBase] = useState("");
  const [wsBase, setWsBase] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [routePath, setRoutePath] = useState("/api/v1/health");
  const [routeMethod, setRouteMethod] = useState<RequestSpec["method"]>("GET");
  const [routeBody, setRouteBody] = useState("{}");
  const [runtime, setRuntime] = useState<RuntimeState>(initialRuntimeState);
  const runtimeRef = useRef<RuntimeState>(initialRuntimeState);
  const wsRef = useRef<WebSocket | null>(null);

  const resolvedHttpBase = useMemo(
    () => httpBase.replace(/\/$/, ""),
    [httpBase]
  );

  const appendLog = (kind: LogKind, title: string, details: string) => {
    const entry: LogEntry = {
      id: logIdCounter++,
      ts: new Date().toISOString(),
      kind,
      title,
      details
    };
    setLogs((prev) => [entry, ...prev]);
  };

  const updateRuntime = (updater: (prev: RuntimeState) => RuntimeState) => {
    setRuntime((prev) => {
      const next = updater(prev);
      runtimeRef.current = next;
      return next;
    });
  };

  const applyEtag = (path: string, etag: string | null) => {
    if (!etag) {
      return;
    }

    if (path === "/api/v1/project") {
      updateRuntime((prev) => ({ ...prev, projectEtag: etag }));
      return;
    }

    if (path.startsWith("/api/v1/trajectories/")) {
      updateRuntime((prev) => ({ ...prev, trajectoryEtag: etag }));
    }
  };

  const runRequest = async (spec: RequestSpec): Promise<{ status: number; body: unknown }> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (spec.withProjectEtag && runtimeRef.current.projectEtag) {
      headers["If-Match"] = runtimeRef.current.projectEtag;
    }

    if (spec.withTrajectoryEtag && runtimeRef.current.trajectoryEtag) {
      headers["If-Match"] = runtimeRef.current.trajectoryEtag;
    }

    const fullUrl = `${resolvedHttpBase}${spec.path}`;
    const started = performance.now();

    const response = await fetch(fullUrl, {
      method: spec.method,
      headers,
      body: spec.body === undefined || spec.method === "GET" || spec.method === "DELETE"
        ? undefined
        : JSON.stringify(spec.body)
    });

    const elapsed = Math.round(performance.now() - started);
    const etag = response.headers.get("etag");
    applyEtag(spec.path, etag);

    const text = await response.text();
    let body: unknown = text;
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    } else {
      body = null;
    }

    const expected = Array.isArray(spec.expectedStatus)
      ? spec.expectedStatus
      : [spec.expectedStatus];
    const ok = expected.includes(response.status);
    const details = [
      `${spec.method} ${spec.path}`,
      `expected=${expected.join("|")} actual=${response.status} elapsedMs=${elapsed}`,
      `ifMatch=${headers["If-Match"] ?? "none"}`,
      `etag=${etag ?? "none"}`,
      `requestBody=${spec.body === undefined ? "<none>" : safeJson(spec.body)}`,
      `responseBody=${safeJson(body)}`
    ].join("\n");

    appendLog(ok ? "http" : "error", ok ? "HTTP PASS" : "HTTP FAIL", details);

    if (!ok) {
      throw new Error(`Unexpected status for ${spec.method} ${spec.path}: ${response.status}`);
    }

    return { status: response.status, body };
  };

  const runFullHttpSuite = async () => {
    setRunning(true);
    runtimeRef.current = initialRuntimeState;
    setRuntime(initialRuntimeState);
    appendLog("info", "Suite", "Starting full HTTP route coverage run");

    try {
      await runRequest({ method: "GET", path: "/api/v1/health", expectedStatus: 200 });

      await runRequest({ method: "GET", path: "/api/v1/project", expectedStatus: 200 });
      await runRequest({
        method: "PUT",
        path: "/api/v1/project",
        withProjectEtag: true,
        body: PROJECT_FIXTURE,
        expectedStatus: 200
      });
      await runRequest({
        method: "PATCH",
        path: "/api/v1/project",
        withProjectEtag: true,
        body: { name: "API Tester Project (Patched)" },
        expectedStatus: 200
      });

      await runRequest({ method: "GET", path: "/api/v1/trajectories", expectedStatus: 200 });

      // Make reruns deterministic when a previous run failed before cleanup.
      const preexistingGet = await fetch(`${resolvedHttpBase}/api/v1/trajectories/${runtime.activeTrajectoryUuid}`);
      if (preexistingGet.status === 200) {
        const preexistingEtag = preexistingGet.headers.get("etag");
        const deleteHeaders: Record<string, string> = {};
        if (preexistingEtag) {
          deleteHeaders["If-Match"] = preexistingEtag;
        }
        const preexistingDelete = await fetch(`${resolvedHttpBase}/api/v1/trajectories/${runtime.activeTrajectoryUuid}`, {
          method: "DELETE",
          headers: deleteHeaders
        });
        if (preexistingDelete.status !== 204) {
          throw new Error(`Unexpected status for pre-clean DELETE /api/v1/trajectories/${runtime.activeTrajectoryUuid}: ${preexistingDelete.status}`);
        }
      } else if (preexistingGet.status !== 404) {
        throw new Error(`Unexpected status for pre-clean GET /api/v1/trajectories/${runtime.activeTrajectoryUuid}: ${preexistingGet.status}`);
      }

      await runRequest({
        method: "POST",
        path: "/api/v1/trajectories",
        body: TRAJECTORY_FIXTURE,
        expectedStatus: 201
      });

      const uuid = runtime.activeTrajectoryUuid;

      const refreshTrajectoryEtag = async () => {
        await runRequest({ method: "GET", path: `/api/v1/trajectories/${uuid}`, expectedStatus: 200 });
      };

      await runRequest({ method: "GET", path: `/api/v1/trajectories/${uuid}`, expectedStatus: 200 });
      await runRequest({
        method: "PUT",
        path: `/api/v1/trajectories/${uuid}`,
        withTrajectoryEtag: true,
        body: { ...TRAJECTORY_FIXTURE, name: "API Tester Trajectory (PUT)" },
        expectedStatus: 200
      });
      await runRequest({
        method: "PATCH",
        path: `/api/v1/trajectories/${uuid}`,
        withTrajectoryEtag: true,
        body: { name: "API Tester Trajectory (PATCH)" },
        expectedStatus: 200
      });
      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/rename`,
        withTrajectoryEtag: true,
        body: { name: "API Tester Trajectory (Renamed)" },
        expectedStatus: 200
      });

      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/waypoints`,
        withTrajectoryEtag: true,
        body: { waypoint: WAYPOINT_TO_ADD },
        expectedStatus: 201
      });
      await runRequest({
        method: "PATCH",
        path: `/api/v1/trajectories/${uuid}/waypoints/${runtime.activeWaypointUuid}`,
        withTrajectoryEtag: true,
        body: { split: true, override_intervals: false },
        expectedStatus: 200
      });

      const reorderedWaypoints = [
        String((TRAJECTORY_FIXTURE.params as JsonRecord).waypoints && (TRAJECTORY_FIXTURE.params as JsonRecord).waypoints instanceof Array ? ((TRAJECTORY_FIXTURE.params as JsonRecord).waypoints as Array<JsonRecord>)[0].uuid : ""),
        runtime.activeWaypointUuid,
        String((TRAJECTORY_FIXTURE.params as JsonRecord).waypoints && (TRAJECTORY_FIXTURE.params as JsonRecord).waypoints instanceof Array ? ((TRAJECTORY_FIXTURE.params as JsonRecord).waypoints as Array<JsonRecord>)[1].uuid : "")
      ];

      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/waypoints/reorder`,
        withTrajectoryEtag: true,
        body: { order: reorderedWaypoints },
        expectedStatus: 200
      });
      await runRequest({
        method: "DELETE",
        path: `/api/v1/trajectories/${uuid}/waypoints/${runtime.activeWaypointUuid}`,
        withTrajectoryEtag: true,
        expectedStatus: 204
      });
      await refreshTrajectoryEtag();

      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/constraints`,
        withTrajectoryEtag: true,
        body: { constraint: CONSTRAINT_TO_ADD },
        expectedStatus: 201
      });
      await runRequest({
        method: "PATCH",
        path: `/api/v1/trajectories/${uuid}/constraints/${runtime.activeConstraintUuid}`,
        withTrajectoryEtag: true,
        body: { enabled: false },
        expectedStatus: 200
      });
      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/constraints/reorder`,
        withTrajectoryEtag: true,
        body: {
          order: [
            ...(((TRAJECTORY_FIXTURE.params as JsonRecord).constraints && (TRAJECTORY_FIXTURE.params as JsonRecord).constraints instanceof Array
              ? ((TRAJECTORY_FIXTURE.params as JsonRecord).constraints as Array<JsonRecord>).map((c) => String(c.uuid ?? ""))
              : [])),
            runtime.activeConstraintUuid
          ].filter((id, index, arr) => id.length > 0 && arr.indexOf(id) === index)
        },
        expectedStatus: 200
      });
      await runRequest({
        method: "DELETE",
        path: `/api/v1/trajectories/${uuid}/constraints/${runtime.activeConstraintUuid}`,
        withTrajectoryEtag: true,
        expectedStatus: 204
      });
      await refreshTrajectoryEtag();

      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/markers`,
        withTrajectoryEtag: true,
        body: { marker: MARKER_TO_ADD },
        expectedStatus: 201
      });
      await runRequest({
        method: "PATCH",
        path: `/api/v1/trajectories/${uuid}/markers/${runtime.activeMarkerUuid}`,
        withTrajectoryEtag: true,
        body: { name: "Mid Marker Patched" },
        expectedStatus: 200
      });
      await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/markers/reorder`,
        withTrajectoryEtag: true,
        body: {
          order: [
            ...((TRAJECTORY_FIXTURE.events as Array<JsonRecord>).map((event) => String(event.uuid ?? ""))),
            runtime.activeMarkerUuid
          ].filter((id, index, arr) => id.length > 0 && arr.indexOf(id) === index)
        },
        expectedStatus: 200
      });
      await runRequest({
        method: "DELETE",
        path: `/api/v1/trajectories/${uuid}/markers/${runtime.activeMarkerUuid}`,
        withTrajectoryEtag: true,
        expectedStatus: 204
      });
      await refreshTrajectoryEtag();

      const generateResult = await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/generate`,
        withTrajectoryEtag: true,
        body: {},
        expectedStatus: 202
      });
      const operationId = Number((generateResult.body as JsonRecord)?.operationId ?? 0);
      updateRuntime((prev) => ({ ...prev, operationId }));

      await runRequest({
        method: "GET",
        path: `/api/v1/trajectories/${uuid}/generation-state`,
        withTrajectoryEtag: true,
        expectedStatus: 200
      });
      await sleep(1500); // Wait for a short period before attempting to cancel all generate operations
      await runRequest({
        method: "POST",
        path: "/api/v1/generate/cancel-all",
        expectedStatus: 202
      });

      await runRequest({ method: "GET", path: "/api/v1/diagnostics", expectedStatus: 200 });
      await runRequest({ method: "GET", path: "/api/v1/export", expectedStatus: 200 });

      const importResult = await runRequest({
        method: "POST",
        path: "/api/v1/import",
        body: {
          mode: "merge",
          bundle: IMPORT_BUNDLE,
          idempotencyKey: "api-tester-import-1"
        },
        expectedStatus: 202
      });
      const importOperationId = Number((importResult.body as JsonRecord)?.operationId ?? 0);
      updateRuntime((prev) => ({ ...prev, importOperationId }));

      const opToQuery = operationId || importOperationId;
      await runRequest({
        method: "GET",
        path: `/api/v1/operations/${opToQuery}`,
        expectedStatus: 200
      });
      await runRequest({
        method: "POST",
        path: `/api/v1/operations/${opToQuery}/cancel`,
        expectedStatus: [202, 409]
      });

      await refreshTrajectoryEtag();
      await runRequest({
        method: "DELETE",
        path: `/api/v1/trajectories/${uuid}`,
        withTrajectoryEtag: true,
        expectedStatus: 204
      });

      appendLog("info", "Suite", "Completed full HTTP route coverage run");
    } catch (err) {
      appendLog("error", "Suite Error", String(err));
    } finally {
      setRunning(false);
    }
  };

  const runGenerationRoutine = async () => {
    setRunning(true);
    runtimeRef.current = initialRuntimeState;
    setRuntime(initialRuntimeState);
    appendLog("info", "Generation", "Starting generation-only routine");

    try {
      const uuid = initialRuntimeState.activeTrajectoryUuid;

      // Ensure reruns are deterministic if a previous attempt left fixture state behind.
      const preexistingGet = await fetch(`${resolvedHttpBase}/api/v1/trajectories/${uuid}`);
      if (preexistingGet.status === 200) {
        const preexistingEtag = preexistingGet.headers.get("etag");
        const deleteHeaders: Record<string, string> = {};
        if (preexistingEtag) {
          deleteHeaders["If-Match"] = preexistingEtag;
        }
        const preexistingDelete = await fetch(`${resolvedHttpBase}/api/v1/trajectories/${uuid}`, {
          method: "DELETE",
          headers: deleteHeaders
        });
        if (preexistingDelete.status !== 204) {
          throw new Error(`Unexpected status for pre-clean DELETE /api/v1/trajectories/${uuid}: ${preexistingDelete.status}`);
        }
      } else if (preexistingGet.status !== 404) {
        throw new Error(`Unexpected status for pre-clean GET /api/v1/trajectories/${uuid}: ${preexistingGet.status}`);
      }

      await runRequest({
        method: "POST",
        path: "/api/v1/trajectories",
        body: TRAJECTORY_FIXTURE,
        expectedStatus: 201
      });

      await runRequest({ method: "GET", path: `/api/v1/trajectories/${uuid}`, expectedStatus: 200 });

      const generateResult = await runRequest({
        method: "POST",
        path: `/api/v1/trajectories/${uuid}/generate`,
        withTrajectoryEtag: true,
        body: {},
        expectedStatus: 202
      });

      const operationId = Number((generateResult.body as JsonRecord)?.operationId ?? 0);
      updateRuntime((prev) => ({ ...prev, operationId }));

      await runRequest({
        method: "GET",
        path: `/api/v1/trajectories/${uuid}/generation-state`,
        withTrajectoryEtag: true,
        expectedStatus: 200
      });

      await sleep(1500);

      await runRequest({
        method: "POST",
        path: "/api/v1/generate/cancel-all",
        expectedStatus: 202
      });

      await runRequest({ method: "GET", path: `/api/v1/trajectories/${uuid}`, expectedStatus: 200 });
      await runRequest({
        method: "DELETE",
        path: `/api/v1/trajectories/${uuid}`,
        withTrajectoryEtag: true,
        expectedStatus: 204
      });

      appendLog("info", "Generation", "Completed generation-only routine");
    } catch (err) {
      appendLog("error", "Generation Error", String(err));
    } finally {
      setRunning(false);
    }
  };

  const runSingleRoute = async () => {
    setRunning(true);
    try {
      const parsedBody = routeMethod === "GET" || routeMethod === "DELETE"
        ? undefined
        : JSON.parse(routeBody || "{}");

      await runRequest({
        method: routeMethod,
        path: routePath,
        body: parsedBody,
        expectedStatus: 200
      });
    } catch (err) {
      appendLog("error", "Single Route Error", String(err));
    } finally {
      setRunning(false);
    }
  };

  const connectWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = wsUrlFromBase(wsBase);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      appendLog("info", "WS Connected", `Connected to ${url}`);
    };

    ws.onclose = (event) => {
      setWsConnected(false);
      appendLog("info", "WS Closed", `code=${event.code} reason=${event.reason || "none"}`);
    };

    ws.onerror = () => {
      appendLog("error", "WS Error", "WebSocket error event");
    };

    ws.onmessage = (event) => {
      let parsed: unknown = event.data;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        parsed = event.data;
      }
      appendLog("ws", "Progress Event", safeJson(parsed));
    };
  };

  const disconnectWs = () => {
    wsRef.current?.close(1000, "manual_disconnect");
    wsRef.current = null;
    setWsConnected(false);
  };

  return (
    <div className="app">
      <header className="appHeader">
        <h1>Choreo API Tester</h1>
        <p>Hardcoded fixtures + full HTTP route coverage + /progress subscriber logging</p>
      </header>

      <main className="layout">
        <div className="leftColumn">
          <section className="panel">
            <h2>Connection Settings</h2>
            <div className="grid2 compact">
              <label>
                HTTP Base (empty uses Vite proxy)
                <input
                  value={httpBase}
                  onChange={(e) => setHttpBase(e.target.value)}
                  placeholder=""
                />
              </label>
              <label>
                WS Base (empty uses browser origin)
                <input
                  value={wsBase}
                  onChange={(e) => setWsBase(e.target.value)}
                  placeholder=""
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>HTTP Routes</h2>
            <div className="row">
              <button disabled={running} onClick={runFullHttpSuite}>Run Full HTTP Coverage</button>
              <button disabled={running} onClick={runGenerationRoutine}>Run Generation Routine</button>
              <button disabled={running} onClick={() => setLogs([])}>Clear Logs</button>
            </div>
            <div className="singleRoute">
              <h3>Single Route Runner</h3>
              <div className="grid3">
                <label>
                  Method
                  <select value={routeMethod} onChange={(e) => setRouteMethod(e.target.value as RequestSpec["method"])}>
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                </label>
                <label className="wide">
                  Path
                  <input value={routePath} onChange={(e) => setRoutePath(e.target.value)} />
                </label>
                <button disabled={running} onClick={runSingleRoute}>Run Route</button>
              </div>
              <label>
                JSON Body
                <textarea value={routeBody} onChange={(e) => setRouteBody(e.target.value)} rows={3} />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>WebSocket /progress Subscriber</h2>
            <div className="row">
              <button onClick={connectWs} disabled={wsConnected}>Connect</button>
              <button onClick={disconnectWs} disabled={!wsConnected}>Disconnect</button>
              <span className={wsConnected ? "badge on" : "badge off"}>
                {wsConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </section>
        </div>

        <div className="rightColumn">
          <section className="panel runtimePanel">
            <h2>Runtime State</h2>
            <pre>{safeJson(runtime)}</pre>
          </section>

          <section className="panel logs">
            <h2>Logs</h2>
            <div className="logList">
              {logs.map((entry) => (
                <article key={entry.id} className={`log ${entry.kind}`}>
                  <div className="logHead">
                    <strong>{entry.title}</strong>
                    <span>{entry.ts}</span>
                  </div>
                  <pre>{entry.details}</pre>
                </article>
              ))}
              {logs.length === 0 ? <p>No logs yet.</p> : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}