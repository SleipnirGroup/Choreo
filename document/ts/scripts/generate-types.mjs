import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(__dirname, "..");
const schemaPath = path.resolve(moduleRoot, "..", "schema.json");
const outputPath = path.resolve(moduleRoot, "src", "generated", "types.ts");

const schemaText = await readFile(schemaPath, "utf8");
const schema = JSON.parse(schemaText);

function extractCommentSummary(commentBody) {
  const lines = commentBody
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("This interface was referenced")) {
      continue;
    }

    if (
      line ===
      "A mathematical expression paired with a pre-evaluated numeric value in SI base units."
    ) {
      continue;
    }

    return line;
  }

  return null;
}

function normalizeSchemaName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildExprDescriptionMap(jsonSchema) {
  const defs = jsonSchema?.$defs;
  if (!defs || typeof defs !== "object") {
    return new Map();
  }

  const descriptionMap = new Map();
  for (const [defName, defValue] of Object.entries(defs)) {
    if (!defValue || typeof defValue !== "object") {
      continue;
    }

    if (
      defValue.type !== "object" ||
      !defValue.properties ||
      typeof defValue.properties !== "object"
    ) {
      continue;
    }

    const fieldDescriptions = new Map();
    for (const [propertyName, propertyValue] of Object.entries(
      defValue.properties
    )) {
      if (!propertyValue || typeof propertyValue !== "object") {
        continue;
      }

      if (typeof propertyValue.description !== "string") {
        continue;
      }

      const ref = propertyValue.$ref;
      if (ref === "#/$defs/Expr") {
        fieldDescriptions.set(propertyName, propertyValue.description);
      }
    }

    if (fieldDescriptions.size > 0) {
      descriptionMap.set(normalizeSchemaName(defName), fieldDescriptions);
    }
  }

  return descriptionMap;
}

function applySchemaExprDescriptions(typeText, exprDescriptionMap) {
  const lines = typeText.split("\n");
  const outputLines = [];
  const interfaceStack = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const interfaceMatch =
      /^export interface ([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*$/.exec(line);
    if (interfaceMatch) {
      interfaceStack.push({ name: interfaceMatch[1], depth: 1 });
      outputLines.push(line);
      continue;
    }

    if (interfaceStack.length > 0) {
      const fieldMatch = /^(\s*)([A-Za-z_][A-Za-z0-9_]*\??):\s*Expr;\s*$/.exec(
        line
      );
      if (fieldMatch) {
        const currentInterface = interfaceStack[interfaceStack.length - 1].name;
        const lookupName = normalizeSchemaName(currentInterface).replace(
          /\d+$/,
          ""
        );
        const fieldDescriptions =
          exprDescriptionMap.get(normalizeSchemaName(currentInterface)) ??
          exprDescriptionMap.get(lookupName);
        const propertyName = fieldMatch[2].replace(/\?$/, "");
        const description = fieldDescriptions?.get(propertyName);

        if (description) {
          // Remove an immediate preceding JSDoc block so we can write the canonical schema description.
          let removeCommentStart = outputLines.length;
          if (
            outputLines.length > 0 &&
            outputLines[outputLines.length - 1].trim() === "*/"
          ) {
            let j = outputLines.length - 1;
            while (j >= 0 && !outputLines[j].includes("/**")) {
              j -= 1;
            }
            if (j >= 0) {
              removeCommentStart = j;
            }
          }
          outputLines.length = removeCommentStart;

          outputLines.push(`${fieldMatch[1]}/**`);
          outputLines.push(`${fieldMatch[1]} * ${description}`);
          outputLines.push(`${fieldMatch[1]} */`);
        }
      }

      outputLines.push(line);

      const openCount = (line.match(/\{/g) ?? []).length;
      const closeCount = (line.match(/\}/g) ?? []).length;
      if (interfaceStack.length > 0) {
        interfaceStack[interfaceStack.length - 1].depth +=
          openCount - closeCount;
        if (interfaceStack[interfaceStack.length - 1].depth <= 0) {
          interfaceStack.pop();
        }
      }

      continue;
    }

    outputLines.push(line);
  }

  return outputLines.join("\n");
}

function normalizeExprTypes(typeText) {
  const exprCommentById = new Map();
  const linesForExtraction = typeText.split("\n");

  for (let i = 0; i < linesForExtraction.length; i += 1) {
    const exprMatch = /^export interface Expr(\d+)\s*\{\s*$/.exec(
      linesForExtraction[i]
    );
    if (!exprMatch) {
      continue;
    }

    // Find an immediately preceding JSDoc block.
    let end = i - 1;
    while (end >= 0 && linesForExtraction[end].trim() === "") {
      end -= 1;
    }
    if (end < 0 || linesForExtraction[end].trim() !== "*/") {
      continue;
    }

    let start = end;
    while (start >= 0 && !linesForExtraction[start].includes("/**")) {
      start -= 1;
    }
    if (start < 0) {
      continue;
    }

    const commentBody = linesForExtraction.slice(start + 1, end).join("\n");
    const summary = extractCommentSummary(commentBody);
    if (summary) {
      exprCommentById.set(exprMatch[1], summary);
    }
  }

  let output = typeText.replace(
    /(\n)(\s*)([A-Za-z_][A-Za-z0-9_]*\??):\s*Expr(\d+);/g,
    (fullMatch, lineStart, indent, fieldName, exprId) => {
      const summary = exprCommentById.get(exprId);
      const comment = summary
        ? `${lineStart}${indent}/**\n${indent} * ${summary}\n${indent} */`
        : "";

      return `${comment}${lineStart}${indent}${fieldName}: Expr;`;
    }
  );

  const lines = output.split("\n");
  const keptLines = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (/^export interface Expr\d+\s*\{\s*$/.test(lines[i])) {
      // Drop an immediately preceding JSDoc block for this ExprN declaration.
      let removeCommentStart = keptLines.length;
      if (
        keptLines.length > 0 &&
        keptLines[keptLines.length - 1].trim() === "*/"
      ) {
        let j = keptLines.length - 1;
        while (j >= 0 && !keptLines[j].includes("/**")) {
          j -= 1;
        }
        if (j >= 0) {
          removeCommentStart = j;
        }
      }
      keptLines.length = removeCommentStart;

      // Skip this ExprN interface body.
      let braceDepth = 0;
      do {
        braceDepth += (lines[i].match(/\{/g) ?? []).length;
        braceDepth -= (lines[i].match(/\}/g) ?? []).length;
        i += 1;
      } while (i < lines.length && braceDepth > 0);

      i -= 1;
      continue;
    }

    keptLines.push(lines[i]);
  }

  output = keptLines.join("\n");
  output = output.replace(/\bExpr\d+\b/g, "Expr");

  const exprDescriptionMap = buildExprDescriptionMap(schema);
  return applySchemaExprDescriptions(output, exprDescriptionMap);
}

const rawTypes = await compile(schema, "ChoreoDocumentSchema", {
  bannerComment: `/* eslint-disable */\n/**\n * Auto-generated from document/schema.json.\n * Run \"pnpm --dir document/ts generate\" to regenerate.\n */`,
  unreachableDefinitions: true
});
const types = normalizeExprTypes(rawTypes);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, types, "utf8");

console.log(`Wrote generated types to ${outputPath}`);
