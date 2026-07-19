import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, "test");
const cloneDir = path.join(repoRoot, "build", "state-server-test-clone");

if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  console.error(`Source test directory not found: ${sourceDir}`);
  process.exit(1);
}

fs.rmSync(cloneDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(cloneDir), { recursive: true });
fs.cpSync(sourceDir, cloneDir, { recursive: true });

const stateServerPath =
  process.platform === "win32"
    ? path.join(repoRoot, "build", "state-server", "state-server.exe")
    : path.join(repoRoot, "build", "state-server", "state-server");

if (!fs.existsSync(stateServerPath)) {
  console.error(`state-server binary not found: ${stateServerPath}`);
  console.error("Build it first (e.g. configure/build the CMake project).");
  process.exit(1);
}

console.log(`Cloned ${sourceDir} -> ${cloneDir}`);
console.log(`Starting state-server with workspace: ${cloneDir}`);

const child = spawn(stateServerPath, [cloneDir], {
  stdio: "inherit"
});

child.on("error", (err) => {
  console.error("Failed to start state-server:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`state-server exited via signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
