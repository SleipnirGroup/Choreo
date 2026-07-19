# Choreo API Tester

Standalone web app for testing the Choreo state-server API from `document/api-schema.json`.

## What it covers

- Hardcoded canonical fixtures sourced from `test/test-default.chor` and `test/test-default.traj` in the frontend bundle.
- Full HTTP route run across API v1 endpoints.
- `/progress` WebSocket subscriber connection with event logging.
- Unified timestamped logs for HTTP requests and WS messages.

## Run

1. Start state-server (defaults: HTTP `127.0.0.1:5810`, WS relay `127.0.0.1:5811`).
2. Install dependencies in this folder.
3. Start dev server and open the shown URL.

```bash
cd api-tester
npm install
npm run dev
```

By default the app uses Vite proxies:
- `/api/*` -> `http://127.0.0.1:5810`
- `/progress` -> `ws://127.0.0.1:5811/progress`

You can override HTTP/WS base values in the UI.
