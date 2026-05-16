#!/usr/bin/env node
// Render a Choreo .traj file as an SVG with per-segment color matching the
// UI's linear-acceleration gradient from
// src/components/config/robotconfig/PathGradient.tsx (linearAcceleration).
//
// Usage:
//   node scripts/render-traj.mjs --traj <path.traj> --out <path.svg>
//                                [--field-svg <path>] [--title <str>]

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const argv = parseArgs(process.argv.slice(2));
if (!argv.traj || !argv.out) {
  console.error("usage: render-traj.mjs --traj <path> --out <path> [--field-svg <path>] [--title <str>]");
  process.exit(2);
}

// Field dimensions match src/components/field/svg/fields/FieldDimensions.tsx
const FIELD_W = 16.541;
const FIELD_H = 8.0692;
// Match FieldImage2026.svg's viewBox so the inlined background lines up.
const VB_X = -0.5, VB_Y = -0.5, VB_W = 17.541, VB_H = 9.0692;
// An SVG with only a viewBox renders at the CSS default 300x150 in GitHub's
// blob viewer (hence "tiny"). Give it an explicit intrinsic pixel size.
const PX_PER_M = 150;
const PX_W = Math.round(VB_W * PX_PER_M);
const PX_H = Math.round(VB_H * PX_PER_M);

const here = dirname(fileURLToPath(import.meta.url));
const defaultField = resolve(here, "..", "src", "components", "field", "svg", "fields", "FieldImage2026.svg");
const fieldPath = argv["field-svg"] ?? defaultField;
// Inline the field's vector markup rather than embedding it as a
// `data:image/svg+xml` <image>. GitHub serves raw blobs with CSP
// `default-src 'none'`, which blocks data: URIs — that's why the field
// vanished when the SVG was opened directly. FieldImage2026.svg is pure
// vector (no rasters), and its viewBox already matches ours, so its inner
// content can be dropped straight in.
const fieldInner = readFileSync(fieldPath, "utf8")
  .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
  .replace(/<\/svg>\s*$/i, "")
  .trim();

const traj = JSON.parse(readFileSync(argv.traj, "utf8")).trajectory;
const samples = traj.samples ?? [];

if (samples.length < 2) {
  writeFileSync(argv.out, emptySvg(argv.title, fieldInner));
  process.exit(0);
}

// Each segment runs from samples[i] -> samples[i+1] and is colored from the
// START sample's acceleration. Matches FieldGeneratedLines.tsx (i runs over
// segments, passed as `index: i` to the gradient function) and
// PathGradient.tsx:linearAcceleration (hsl(100*a/10, 100%, 50%) — NOT clamped;
// for accel > 10 m/s^2 the hue wraps past green into cyan/blue).
const segs = [];
for (let i = 0; i < samples.length - 1; i++) {
  const s0 = samples[i];
  const s1 = samples[i + 1];
  const a = s0.vl !== undefined
    ? Math.abs(s0.al + s0.ar) / 2
    : Math.hypot(s0.ax, s0.ay);
  const hue = (100 * a) / 10;
  segs.push(
    `<line x1="${fmt(s0.x)}" y1="${fmt(s0.y)}" x2="${fmt(s1.x)}" y2="${fmt(s1.y)}" stroke="hsl(${hue.toFixed(2)}, 100%, 50%)" stroke-width="0.05"/>`
  );
}

// The trajectory <g> uses the same flip transform as FieldImage2026.svg's
// internal <g id="field"> so we can write raw FRC field coords (origin at
// bottom-left) directly into <line> elements.
const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}" width="${PX_W}" height="${PX_H}">
  ${fieldInner}
  <g transform="scale(1 -1) translate(0 -${FIELD_H})">
    ${segs.join("\n    ")}
  </g>
  ${titleElement(argv.title)}
</svg>
`;

writeFileSync(argv.out, out);

function titleElement(title) {
  if (!title) return "";
  return `<text x="-0.4" y="-0.15" font-size="0.32" font-family="monospace" fill="white" stroke="black" stroke-width="0.02" paint-order="stroke fill">${escapeXml(title)}</text>`;
}

function emptySvg(title, fieldInner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}" width="${PX_W}" height="${PX_H}">
  ${fieldInner}
  <text x="${VB_X + VB_W / 2}" y="${VB_Y + VB_H / 2}" text-anchor="middle" font-size="0.5" font-family="monospace" fill="white" stroke="black" stroke-width="0.04" paint-order="stroke fill">no samples${title ? ` — ${escapeXml(title)}` : ""}</text>
</svg>
`;
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(4) : "0";
}

function escapeXml(s) {
  return String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}
