#!/usr/bin/env node
// Build a markdown comparison report from two `run-bench.sh` outputs.
//
// Usage:
//   node scripts/bench-report.mjs \
//     --pr <PR test-projects dir>  --base <BASE test-projects dir> \
//     --pr-reports <PR out dir>    --base-reports <BASE out dir> \
//     --artifact-url <url>         --out <report.md>

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const argv = parseArgs(process.argv.slice(2));
for (const k of ["pr", "base", "pr-reports", "base-reports", "out"]) {
  if (!argv[k]) {
    console.error(`missing required --${k}`);
    process.exit(2);
  }
}
const artifactUrl = argv["artifact-url"] ?? null;

// Thresholds for highlighting regressions.
const SOLVE_PCT_THRESHOLD = 15;     // bold/red if |pctSolve| > 15%
const LEN_DELTA_THRESHOLD = 0.01;   // bold/red if |dLen| > 1 cm

const variants = listVariants(argv.pr);
const rows = [];
const summary = { regressed: 0, improved: 0, base_failed: 0, total: 0 };

for (const variant of variants) {
  const prReport  = loadReport(argv["pr-reports"],   variant);
  const baseReport = loadReport(argv["base-reports"], variant);
  const prDir   = join(argv.pr,   variant);
  const baseDir = join(argv.base, variant);

  if (!prReport) {
    rows.push(missingRow(variant, "(no PR report)"));
    continue;
  }

  for (const prEntry of prReport) {
    const name = prEntry.name;
    const baseEntry = baseReport?.find(r => r.name === name) ?? null;
    const prTraj   = trajMetrics(join(prDir,   `${name}.traj`));
    const baseTraj = trajMetrics(join(baseDir, `${name}.traj`));

    let status = "OK";
    if (!prEntry.ok)            status = "PR_FAILED";
    else if (!baseEntry)        status = "BASE_MISSING";
    else if (!baseEntry.ok)     status = "BASE_FAILED";

    const solvePr   = prEntry.ok ? prEntry.solve_ms : null;
    const solveBase = baseEntry?.ok ? baseEntry.solve_ms : null;
    const dSolve    = (solvePr != null && solveBase != null) ? solvePr - solveBase : null;
    const pctSolve  = (dSolve != null && solveBase > 0)      ? (dSolve / solveBase) * 100 : null;
    const dLen      = (prTraj && baseTraj)                    ? prTraj.length_m - baseTraj.length_m : null;
    const dTime     = (prTraj && baseTraj)                    ? prTraj.total_s - baseTraj.total_s   : null;

    const regressed =
      status !== "OK" ||
      (pctSolve != null && Math.abs(pctSolve) > SOLVE_PCT_THRESHOLD) ||
      (dLen     != null && Math.abs(dLen)     > LEN_DELTA_THRESHOLD);

    summary.total++;
    if (status === "BASE_MISSING" || status === "BASE_FAILED") summary.base_failed++;
    else if (regressed && pctSolve != null && pctSolve > 0) summary.regressed++;
    else if (pctSolve != null && pctSolve < -SOLVE_PCT_THRESHOLD) summary.improved++;

    rows.push({ variant, name, status, regressed,
                solvePr, solveBase, dSolve, pctSolve,
                lenPr: prTraj?.length_m, lenBase: baseTraj?.length_m, dLen,
                timePr: prTraj?.total_s, timeBase: baseTraj?.total_s, dTime,
                samplesPr: prTraj?.sample_count, samplesBase: baseTraj?.sample_count });
  }
}

writeFileSync(argv.out, renderMarkdown(rows, summary, artifactUrl));

// ---------- helpers ----------

function listVariants(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(n => statSync(join(dir, n)).isDirectory())
    .filter(n => existsSync(join(dir, n, "project.chor")))
    .sort();
}

function loadReport(dir, variant) {
  const p = join(dir, `${variant}.report.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch { return null; }
}

function trajMetrics(trajPath) {
  if (!existsSync(trajPath)) return null;
  let raw;
  try { raw = JSON.parse(readFileSync(trajPath, "utf8")); }
  catch { return null; }
  const samples = raw?.trajectory?.samples ?? [];
  if (samples.length < 2) return null;
  let len = 0;
  for (let i = 1; i < samples.length; i++) {
    len += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
  }
  return { length_m: len, total_s: samples[samples.length - 1].t, sample_count: samples.length };
}

function missingRow(variant, note) {
  return { variant, name: note, status: "NO_PR_REPORT", regressed: true };
}

function renderMarkdown(rows, summary, artifactUrl) {
  const lines = [];
  lines.push(`### Choreo trajectory benchmark`);
  lines.push("");
  lines.push(`Compared ${summary.total} trajectories across ${new Set(rows.map(r => r.variant)).size} project variant(s).`);
  const bits = [];
  if (summary.regressed)  bits.push(`**${summary.regressed} regressed** (solve time >${SOLVE_PCT_THRESHOLD}% slower or path length shifted >${LEN_DELTA_THRESHOLD}m)`);
  if (summary.improved)   bits.push(`${summary.improved} sped up`);
  if (summary.base_failed) bits.push(`${summary.base_failed} unable to compare to base`);
  lines.push(bits.length ? bits.join(" · ") : "No notable differences.");
  lines.push("");
  lines.push("| Variant | Trajectory | Solve (PR) | Solve (base) | Δsolve | Length Δ | Time Δ | Samples (PR/base) | Status |");
  lines.push("|---|---|---:|---:|---:|---:|---:|:---:|:---:|");
  for (const r of rows) {
    if (r.status === "NO_PR_REPORT") {
      lines.push(`| \`${r.variant}\` | — | — | — | — | — | — | — | **${r.status}** |`);
      continue;
    }
    lines.push("| " + [
      `\`${r.variant}\``,
      `\`${r.name}\``,
      fmtMs(r.solvePr),
      fmtMs(r.solveBase),
      fmtSolveDelta(r.dSolve, r.pctSolve, r.regressed),
      fmtLenDelta(r.dLen, r.regressed),
      fmtTimeDelta(r.dTime),
      r.samplesPr != null && r.samplesBase != null ? `${r.samplesPr}/${r.samplesBase}` : (r.samplesPr ?? "—"),
      r.status === "OK" ? "OK" : `**${r.status}**`,
    ].join(" | ") + " |");
  }
  lines.push("");
  if (artifactUrl) {
    lines.push(`Trajectory renderings (per-step linear-acceleration coloring, matching the UI gradient) are uploaded as a workflow artifact — open the run page to download:`);
    lines.push("");
    lines.push(`→ **[Download bench-output artifact](${artifactUrl})**`);
  }
  lines.push("");
  lines.push(`<sub>Solve times are wall-clock around \`generate()\` only (excluding CLI startup), measured with hyperfine \`--warmup 1 --runs 3\` and reported by the CLI's \`--report-json\`. \`Length Δ\` is the change in integrated path length (sum of segment lengths). \`Time Δ\` is the change in total trajectory duration. \`Samples\` shows the count from each side; very different counts mean point-wise comparisons would be misleading — use the artifact's SVGs for visual diff.</sub>`);
  return lines.join("\n") + "\n";
}

function fmtMs(v) {
  if (v == null) return "—";
  return `${v.toFixed(1)} ms`;
}

function fmtSolveDelta(d, pct, regressed) {
  if (d == null) return "—";
  const sign = d > 0 ? "+" : "";
  const txt = `${sign}${d.toFixed(1)} ms${pct != null ? ` (${sign}${pct.toFixed(1)}%)` : ""}`;
  return regressed && pct != null && Math.abs(pct) > SOLVE_PCT_THRESHOLD ? `**${txt}**` : txt;
}

function fmtLenDelta(d, regressed) {
  if (d == null) return "—";
  const sign = d >= 0 ? "+" : "";
  const txt = `${sign}${d.toFixed(4)} m`;
  return regressed && Math.abs(d) > LEN_DELTA_THRESHOLD ? `**${txt}**` : txt;
}

function fmtTimeDelta(d) {
  if (d == null) return "—";
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(3)} s`;
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) { out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}
