#include "progress_update_relay/dashboard_page.hpp"

#include <sstream>

namespace progress_update_relay {

std::string BuildDashboardHtml(const CliOptions& options) {
  std::ostringstream html;
  html << R"HTML(<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Choreo Progress Relay</title>
<style>
:root {
  --bg: #f4f7f5;
  --panel: #ffffff;
  --ink: #16231f;
  --muted: #4b6159;
  --accent: #0a7a5a;
  --warn: #9b2c2c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 1.2rem;
  font-family: "Segoe UI", "Trebuchet MS", sans-serif;
  background: radial-gradient(circle at top left, #dbeee6, #f4f7f5 60%);
  color: var(--ink);
}
main {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}
.card {
  background: var(--panel);
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 8px 30px rgba(20, 50, 40, 0.12);
}
h1 { margin: 0 0 0.5rem; font-size: 1.35rem; }
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.7rem;
}
.stat {
  border: 1px solid #d9e5df;
  border-radius: 10px;
  padding: 0.65rem;
}
.stat .k { font-size: 0.78rem; color: var(--muted); }
.stat .v { font-size: 1.1rem; font-weight: 650; margin-top: 0.2rem; }
#log {
  min-height: 260px;
  max-height: 52vh;
  overflow: auto;
  font-family: Consolas, Menlo, monospace;
  background: #0f1815;
  color: #d8fbe9;
  padding: 0.75rem;
  border-radius: 10px;
  white-space: pre-wrap;
}
.controls { display: flex; gap: 0.5rem; flex-wrap: wrap; }
button {
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}
button.alt { background: #39524a; }
#status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 0.35rem;
  background: #888;
}
</style>
</head>
<body>
<main>
  <section class="card">
    <h1>Choreo Progress Relay</h1>
    <div><span id="status-dot"></span><span id="status">Connecting...</span></div>
    <p id="producer">Producer: waiting for generator</p>
  </section>

  <section class="card stat-grid">
    <div class="stat"><div class="k">Last Event</div><div class="v" id="lastEvent">none</div></div>
    <div class="stat"><div class="k">Drive Type</div><div class="v" id="driveType">unknown</div></div>
    <div class="stat"><div class="k">Last Sample Count</div><div class="v" id="sampleCount">0</div></div>
    <div class="stat"><div class="k">Last Blob Bytes</div><div class="v" id="sampleBlobBytes">0</div></div>
    <div class="stat"><div class="k">Incomplete Events</div><div class="v" id="incompleteCount">0</div></div>
    <div class="stat"><div class="k">Diagnostic Events</div><div class="v" id="diagnosticCount">0</div></div>
    <div class="stat"><div class="k">Error Events</div><div class="v" id="errorCount">0</div></div>
    <div class="stat"><div class="k">Complete Events</div><div class="v" id="completeCount">0</div></div>
  </section>

  <section class="card">
    <div class="controls">
      <button id="clearBtn">Clear Log</button>
      <button class="alt" id="pauseBtn">Pause Auto-Scroll: Off</button>
      <button class="alt" id="copyBtn">Copy Last JSON</button>
    </div>
    <p id="copyState"></p>
    <div id="log"></div>
  </section>
</main>

<script>
const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const statusDot = document.getElementById('status-dot');
const producerEl = document.getElementById('producer');
const copyStateEl = document.getElementById('copyState');
const counts = { incomplete: 0, diagnostic: 0, error: 0, complete: 0 };
let autoScroll = true;
let lastJson = '';

function addLog(line) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${line}\n`;
  if (autoScroll) {
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function setConnection(isOpen) {
  statusDot.style.background = isOpen ? '#12a56f' : '#c93b3b';
  statusEl.textContent = isOpen ? 'Connected to relay' : 'Disconnected from relay';
}

function renderCounts() {
  document.getElementById('incompleteCount').textContent = String(counts.incomplete);
  document.getElementById('diagnosticCount').textContent = String(counts.diagnostic);
  document.getElementById('errorCount').textContent = String(counts.error);
  document.getElementById('completeCount').textContent = String(counts.complete);
}

function estimateBase64DecodedSize(encoded) {
  if (!encoded) {
    return 0;
  }
  const padded = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((encoded.length * 3) / 4) - padded;
  return bytes > 0 ? bytes : 0;
}

document.getElementById('clearBtn').addEventListener('click', () => {
  logEl.textContent = '';
});

document.getElementById('pauseBtn').addEventListener('click', (event) => {
  autoScroll = !autoScroll;
  event.target.textContent = `Pause Auto-Scroll: ${autoScroll ? 'Off' : 'On'}`;
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!lastJson) {
    copyStateEl.textContent = 'No JSON frame received yet.';
    return;
  }
  try {
    await navigator.clipboard.writeText(lastJson);
    copyStateEl.textContent = 'Copied last JSON frame.';
  } catch (_) {
    copyStateEl.textContent = 'Clipboard copy failed.';
  }
});

const ws = new WebSocket(`ws://${location.host})HTML" << options.dashboard_ws_path << R"HTML(`);

ws.onopen = () => {
  setConnection(true);
  addLog('Dashboard websocket opened.');
};

ws.onclose = () => {
  setConnection(false);
  addLog('Dashboard websocket closed.');
};

ws.onerror = () => {
  addLog('Websocket error.');
};

ws.onmessage = (event) => {
  lastJson = event.data;
  try {
    const msg = JSON.parse(event.data);
    if (msg.relay === 'producerStatus') {
      producerEl.textContent = `Producer: ${msg.connected ? 'connected' : 'disconnected'}`;
      return;
    }

    const evt = msg.event || 'unknown';
    document.getElementById('lastEvent').textContent = evt;

    if (evt === 'incompleteTrajectory') {
      counts.incomplete += 1;
      document.getElementById('driveType').textContent = msg.driveType || 'unknown';
      document.getElementById('sampleCount').textContent = String(msg.sampleCount || 0);
      const blobBytes =
        typeof msg.samplesBase64 === 'string'
          ? estimateBase64DecodedSize(msg.samplesBase64)
          : 0;
      document.getElementById('sampleBlobBytes').textContent = String(blobBytes);
    } else if (evt === 'diagnostic') {
      counts.diagnostic += 1;
    } else if (evt === 'error') {
      counts.error += 1;
    } else if (evt === 'completeTrajectory') {
      counts.complete += 1;
    }

    renderCounts();
    addLog(event.data);
  } catch (_) {
    addLog(`Non-JSON frame: ${event.data}`);
  }
};

renderCounts();
</script>
</body>
</html>)HTML";
  return html.str();
}

}  // namespace progress_update_relay
