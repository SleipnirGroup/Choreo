#!/usr/bin/env node
// Build a markdown comparison report from two `run-bench.sh` output dirs.
//
// Usage:
//   node scripts/bench-report.mjs \
//     --pr <PR test-projects dir>  --base <BASE test-projects dir> \
//     --pr-reports <PR out dir>    --base-reports <BASE out dir> \
//     --artifact-url <url>         --commit <sha> --out <report.md>
//
// Each *-reports dir holds one CLI report per run: `<variant>.run<N>.report.json`
// (an array of {name, solve_ms, ok, error}). We aggregate the runs per
// trajectory into mean ± stdev. Trajectory geometry (length / duration /
// sample count) is read from the staged `<variant>/<name>.traj` ONLY when that
// side actually generated it this run (report says ok) — otherwise the `.traj`
// on disk is stale committed input, not this run's output.

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
const commit = argv.commit ?? null;
// Commit-pinned base blob URL (.../blob/<sha>) from publish-renders.cjs; SVGs
// live at <rendersUrl>/<variant>/<name>.{pr,base}.svg (matches the bench job's
// `${traj%.traj}.${side}.svg` render paths).
const rendersUrl = argv["renders-url"] ?? null;

// Solve-time regression highlight threshold (bold if |Δ%| exceeds this).
const SOLVE_PCT_THRESHOLD = 15;

const variants = listVariants(argv.pr);
const rows = [];
const summary = {
  total: 0,        // trajectories seen across all variants
  comparable: 0,   // generated OK on BOTH sides (the only ones scored)
  prFailed: 0,     // did not generate on PR (independent of base outcome)
  baseFailed: 0,   // did not generate on base (independent of PR outcome)
  flaky: 0,        // some-but-not-all runs OK on a side
  sumPr: 0,        // Σ mean solve ms over comparable
  sumBase: 0,
  pcts: [],        // per-trajectory solve Δ% over comparable
  durPcts: [],     // per-trajectory duration Δ% over comparable
  dTimeCount: 0,
};

for (const variant of variants) {
  const prRuns = loadRuns(argv["pr-reports"], variant);
  const baseRuns = loadRuns(argv["base-reports"], variant);

  if (prRuns.length === 0) {
    rows.push({ variant, noReport: true });
    continue;
  }

  // sort names for consistent order
  const names = [...new Set(prRuns.flatMap(r => r.map(e => e?.name).filter(Boolean)))].sort();
  for (const name of names) {
    const pr = aggregateSide(prRuns, name);
    const base = aggregateSide(baseRuns, name);
    const prOk = !!(pr && pr.ok);
    const baseOk = !!(base && base.ok);

    // Only trust geometry from a side that actually produced this traj.
    const prTraj = prOk ? trajMetrics(join(argv.pr, variant, `${name}.traj`)) : null;
    const baseTraj = baseOk ? trajMetrics(join(argv.base, variant, `${name}.traj`)) : null;

    let status;
    if (!prOk) status = "PR_FAILED";
    else if (!base || base.runs === 0) status = "BASE_MISSING";
    else if (!baseOk) status = "BASE_FAILED";
    else if (pr.flaky || base.flaky) status = "FLAKY";
    else status = "OK";

    const dSolve = prOk && baseOk ? pr.mean - base.mean : null;
    const pct = dSolve != null && base.mean > 0 ? (dSolve / base.mean) * 100 : null;
    const dLen = prTraj && baseTraj ? prTraj.length_m - baseTraj.length_m : null;
    const dTime = prTraj && baseTraj ? prTraj.total_s - baseTraj.total_s : null;

    summary.total++;
    if (!prOk) summary.prFailed++;
    if (!baseOk) summary.baseFailed++;
    if (prOk && baseOk) {
      summary.comparable++;
      summary.sumPr += pr.mean;
      summary.sumBase += base.mean;
      if (pct != null) summary.pcts.push(pct);
      if (dTime != null) {
        summary.dTimeCount++;
        if (baseTraj.total_s > 0) summary.durPcts.push((dTime / baseTraj.total_s) * 100);
      }
    }
    if ((pr && pr.flaky) || (base && base.flaky)) summary.flaky++;

    rows.push({
      variant, name, status, pr, base, prOk, baseOk, dSolve, pct,
      lenPr: prTraj?.length_m, lenBase: baseTraj?.length_m, dLen,
      timePr: prTraj?.total_s, timeBase: baseTraj?.total_s, dTime,
      samplesPr: prTraj?.sample_count, samplesBase: baseTraj?.sample_count,
    });
  }
}

writeFileSync(argv.out, renderMarkdown(rows, summary, artifactUrl, commit, rendersUrl));

// ---------- aggregation ----------

function listVariants(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(n => statSync(join(dir, n)).isDirectory())
    .filter(n => existsSync(join(dir, n, "project.chor")))
    .sort();
}

// All per-run report arrays for a variant: `<variant>.run<N>.report.json`,
// plus a legacy single `<variant>.report.json` if present.
function loadRuns(dir, variant) {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter(f =>
      f === `${variant}.report.json` ||
      (f.startsWith(`${variant}.run`) && f.endsWith(".report.json")))
    .sort();
  const runs = [];
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      if (Array.isArray(j)) runs.push(j);
    } catch { /* skip unparseable run */ }
  }
  return runs;
}

function aggregateSide(runs, name) {
  const entries = runs.map(r => r.find(e => e && e.name === name)).filter(Boolean);
  if (entries.length === 0) return null;
  const okEntries = entries.filter(e => e.ok);
  const samples = okEntries
    .map(e => e.solve_ms)
    .filter(v => typeof v === "number" && Number.isFinite(v));
  const ok = samples.length > 0;
  const mean = ok ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
  const sd = ok && samples.length > 1
    ? Math.sqrt(samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length - 1))
    : 0;
  const error = entries.filter(e => !e.ok).map(e => e.error).filter(Boolean).pop() ?? null;
  return {
    ok,
    flaky: ok && okEntries.length < entries.length,
    mean, sd, n: samples.length, runs: entries.length, error,
  };
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

// ---------- rendering ----------

function renderMarkdown(rows, summary, artifactUrl, commit, rendersUrl) {
  const L = [];
  L.push(commit
    ? `### Choreo trajectory benchmark — commit \`${commit}\``
    : `### Choreo trajectory benchmark`);
  L.push("");

  if (summary.comparable > 0) {
    const overall = ((summary.sumPr - summary.sumBase) / summary.sumBase) * 100;
    const med = median(summary.pcts);
    L.push(`**Solve time ${signedPct(overall)} overall** — PR ${fmtTotal(summary.sumPr)} vs base ${fmtTotal(summary.sumBase)} over ${summary.comparable} comparable trajector${summary.comparable === 1 ? "y" : "ies"} (median per-trajectory ${signedPct(med)}).`);
    L.push("");
    L.push(`Trajectory duration: median ${signedPct(median(summary.durPcts))} per trajectory across ${summary.dTimeCount} compared.`);
  } else {
    L.push(`**No trajectories generated successfully on both PR and base** — nothing to score. See per-variant statuses below.`);
  }
  L.push("");
  L.push(`${summary.comparable} comparable · ${summary.prFailed} failed on PR · ${summary.baseFailed} failed on base · ${summary.flaky} flaky · ${summary.total} total`);
  L.push("");

  // Overarching cross-dt tables (above the per-variant dropdowns). No-op when
  // no variant follows the `<family>-<tier>-dt` scheme.
  L.push(...dtSummaryTables(rows));

  // Group rows by variant (listVariants order is preserved by push order).
  const byVariant = new Map();
  for (const r of rows) {
    if (!byVariant.has(r.variant)) byVariant.set(r.variant, []);
    byVariant.get(r.variant).push(r);
  }

  // Auto-expand the single worst-regressed variant so reviewers see detail
  // without clicking.
  let worstVariant = null;
  let worstPct = -Infinity;
  for (const [v, rs] of byVariant) {
    const cmp = rs.filter(r => r.status === "OK" || r.status === "FLAKY");
    if (cmp.length === 0) continue;
    const sp = cmp.reduce((a, r) => a + r.pr.mean, 0);
    const sb = cmp.reduce((a, r) => a + r.base.mean, 0);
    if (sb > 0) {
      const p = ((sp - sb) / sb) * 100;
      if (p > worstPct) { worstPct = p; worstVariant = v; }
    }
  }

  for (const [variant, rs] of byVariant) {
    if (rs.length === 1 && rs[0].noReport) {
      L.push(`<details><summary><b>${variant}</b> — ⚠ no PR report</summary>`);
      L.push("");
      L.push(`The PR CLI produced no report for this variant (it crashed or was killed before writing one).`);
      L.push("");
      L.push(`</details>`);
      L.push("");
      continue;
    }

    const cmp = rs.filter(r => r.status === "OK" || r.status === "FLAKY");
    let verdict;
    if (cmp.length > 0) {
      const sp = cmp.reduce((a, r) => a + r.pr.mean, 0);
      const sb = cmp.reduce((a, r) => a + r.base.mean, 0);
      verdict = `solve ${signedPct(sb > 0 ? ((sp - sb) / sb) * 100 : 0)} (${cmp.length}/${rs.length} comparable)`;
    } else {
      verdict = `0/${rs.length} comparable`;
    }
    const open = variant === worstVariant ? " open" : "";
    L.push(`<details${open}><summary><b>${variant}</b> — ${verdict}</summary>`);
    L.push("");
    L.push(`| Trajectory | Solve (PR) | Solve (base) | Δsolve | Δlength | Δtime | Samples PR/base | Status |`);
    L.push(`|---|---:|---:|---:|---:|---:|:---:|:---:|`);
    for (const r of rs) {
      L.push("| " + [
        `\`${r.name}\``,
        fmtSolve(r.pr),
        fmtSolve(r.base),
        fmtDeltaSolve(r.dSolve, r.pct),
        fmtMeters(r.dLen),
        fmtSeconds(r.dTime),
        `${r.samplesPr ?? "—"}/${r.samplesBase ?? "—"}`,
        fmtStatus(r.status),
      ].join(" | ") + " |");
    }
    L.push("");

    if (rendersUrl) {
      const items = [];
      for (const r of rs) {
        const segs = [`${encodeURIComponent(r.variant)}/${encodeURIComponent(r.name)}`];
        const links = [];
        if (r.prOk) links.push(`[PR](${rendersUrl}/${segs}.pr.svg)`);
        if (r.baseOk) links.push(`[base](${rendersUrl}/${segs}.base.svg)`);
        if (links.length) items.push(`\`${r.name}\` — ${links.join(" · ")}`);
      }
      if (items.length) {
        L.push(`Renders (open in browser): ${items.join(" — ")}`);
        L.push("");
      }
    }

    L.push(`</details>`);
    L.push("");
  }

  if (artifactUrl) {
    L.push(`Trajectory renders can also be found as a workflow artifact:`);
    L.push(`→ [Download bench-output artifact](${artifactUrl})`);
    L.push("");
  }
  L.push(`<sub>Solve times are wall-clock averaged over ${rows.find(r => r.pr?.runs)?.pr.runs ?? "multiple"} runs per trajectory.</sub>`);
  return L.join("\n") + "\n";
}

// ---------- formatting ----------

function unitFor(ms) { return Math.abs(ms) >= 10000 ? "s" : "ms"; }
function inUnit(ms, u) { return u === "s" ? ms / 1000 : ms; }
function decimals(u) { return u === "s" ? 2 : 1; }

function fmtTotal(ms) {
  const u = unitFor(ms);
  return `${inUnit(ms, u).toFixed(decimals(u))} ${u}`;
}

function fmtSolve(s) {
  if (!s || !s.ok || s.mean == null) return "—";
  const u = unitFor(s.mean);
  const m = inUnit(s.mean, u).toFixed(decimals(u));
  const body = s.n > 1
    ? `${m} ± ${inUnit(s.sd, u).toFixed(decimals(u))} ${u}`
    : `${m} ${u}`;
  if (s.flaky) return `${body} ⚠ ${s.n}/${s.runs} ok`;
  return s.n > 1 ? body : `${body} (1 run)`;
}

function fmtDeltaSolve(d, pct) {
  if (d == null) return "—";
  const u = unitFor(d);
  const sign = d >= 0 ? "+" : "-";
  const mag = Math.abs(inUnit(d, u)).toFixed(decimals(u));
  const p = pct != null ? ` (${signedPct(pct)})` : "";
  const txt = `${sign}${mag} ${u}${p}`;
  return pct != null && Math.abs(pct) > SOLVE_PCT_THRESHOLD ? `**${txt}**` : txt;
}

function fmtMeters(d) {
  if (d == null) return "—";
  return `${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(4)} m`;
}

function fmtSeconds(d) {
  if (d == null) return "—";
  return `${signedFixed(d, 3)} s`;
}

function fmtStatus(s) {
  if (s === "OK") return "OK";
  if (s === "FLAKY") return "⚠ FLAKY";
  return `**${s}**`;
}

function signedPct(p) {
  if (p == null || !Number.isFinite(p)) return "n/a";
  return `${p >= 0 ? "+" : "-"}${Math.abs(p).toFixed(1)}%`;
}

function signedFixed(v, dp) {
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(dp)}`;
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Variants named `<family>-<tier>-dt` (e.g. swerve-base-extra-low-dt) feed the
// cross-dt summary tables.
function parseDt(variant) {
  if (typeof variant !== "string" || !variant.endsWith("-dt")) return null;
  const stem = variant.slice(0, -3); // strip trailing "-dt"
  // Test longest-first so the "-low" suffix can't steal "-extra-low".
  for (const tier of ["extra-low", "medium", "high", "low"]) {
    if (stem.endsWith(`-${tier}`)) {
      return { family: stem.slice(0, -(tier.length + 1)), tier };
    }
  }
  return null;
}

// Two overarching tables comparing the dt tiers. Returns [] (no-op) when no
// variant follows the scheme, so non-dt corpora are unaffected.
function dtSummaryTables(rows) {
  // Magnitude order — used for COLUMN order so the sweep reads low→high dt
  // (plain alphabetical would wrongly put "high" 2nd). Local const: this runs
  // via renderMarkdown at module-eval time, before a top-level const would init.
  const DT_TIERS = ["extra-low", "low", "medium", "high"];
  const tiersSeen = new Set();
  const families = new Set();
  const trajNames = new Set();
  const byFamilyTier = new Map(); // `${family} ${tier}` -> rows[]
  const byCell = new Map();       // `${family} ${traj} ${tier}` -> row

  for (const r of rows) {
    const d = parseDt(r.variant);
    if (!d) continue;
    families.add(d.family);
    tiersSeen.add(d.tier);
    if (r.noReport) continue; // counts toward family/tier, but has no rows
    trajNames.add(r.name);
    const ft = `${d.family} ${d.tier}`;
    if (!byFamilyTier.has(ft)) byFamilyTier.set(ft, []);
    byFamilyTier.get(ft).push(r);
    byCell.set(`${d.family} ${r.name} ${d.tier}`, r);
  }

  if (tiersSeen.size === 0) return [];

  const tiers = DT_TIERS.filter(t => tiersSeen.has(t)); // present, magnitude order
  const fams = [...families].sort();
  const trajs = [...trajNames].sort();
  const alignNum = tiers.map(() => "---:").join("|");

  const L = [];
  L.push(`#### dt sweep`);
  L.push("");

  // Table 1 — per-family rollup: Σ PR solve over the family's trajectories.
  L.push(`Total PR solve per family across dt tiers (sum over that family's trajectories; lower = faster).`);
  L.push("");
  L.push(`| Family | ${tiers.join(" | ")} |`);
  L.push(`|---|${alignNum}|`);
  let anyPartial = false;
  for (const fam of fams) {
    const cells = tiers.map(t => {
      const rs = byFamilyTier.get(`${fam} ${t}`);
      if (!rs || rs.length === 0) return "—";
      const ok = rs.filter(r => r.prOk && r.pr && Number.isFinite(r.pr.mean));
      if (ok.length === 0) return "—";
      const sum = ok.reduce((a, r) => a + r.pr.mean, 0);
      const partial = ok.length < trajs.length;
      if (partial) anyPartial = true;
      return `${fmtTotal(sum)}${partial ? ` \\*${ok.length}/${trajs.length}` : ""}`;
    });
    L.push(`| \`${fam}\` | ${cells.join(" | ")} |`);
  }
  if (anyPartial) {
    L.push("");
    L.push(`<sub>\\* partial — some trajectories failed on PR for that cell, so its total covers fewer trajectories and is not like-for-like across tiers.</sub>`);
  }
  L.push("");

  // Table 2 — regression across dt: PR-vs-base Δ% per family × trajectory.
  L.push(`PR-vs-base solve Δ% per trajectory across dt tiers (is a regression consistent, or dt-dependent?). Bold = |Δ| > ${SOLVE_PCT_THRESHOLD}%.`);
  L.push("");
  L.push(`| Family | Trajectory | ${tiers.join(" | ")} |`);
  L.push(`|---|---|${alignNum}|`);
  for (const fam of fams) {
    for (const tj of trajs) {
      const cells = tiers.map(t => {
        const r = byCell.get(`${fam} ${tj} ${t}`);
        if (!r) return "—";
        if (!r.prOk) return "PR✗";
        if (!r.baseOk) return "base✗";
        if (r.pct == null) return "~";
        const txt = signedPct(r.pct);
        return Math.abs(r.pct) > SOLVE_PCT_THRESHOLD ? `**${txt}**` : txt;
      });
      L.push(`| \`${fam}\` | \`${tj}\` | ${cells.join(" | ")} |`);
    }
  }
  L.push("");
  return L;
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
