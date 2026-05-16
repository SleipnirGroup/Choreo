// Stash the rendered SVGs as an orphan commit kept alive by a CUSTOM ref
// (`refs/bench-renders/<run_id>`), NOT a branch. Refs outside refs/heads/* and
// refs/tags/* don't appear in GitHub's Branches or Tags UI, so per-run pushes
// don't pollute it — but the commit is still reachable, so it won't be GC'd and
// its blobs stay viewable in the web UI. Links use the commit SHA directly
// (GitHub's blob viewer resolves any SHA reachable from any ref), so we never
// need a branch/tag name in the URL.

const fs = require("fs");
const path = require("path");

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const runId = process.env.GITHUB_RUN_ID;
  const refName = `bench-renders/${runId}`;

  const tree = [];
  for (const root of ["merged/tp-pr", "merged/tp-base"]) {
    if (!fs.existsSync(root)) continue;
    for (const rel of fs.readdirSync(root, { recursive: true })) {
      if (!rel.endsWith(".svg")) continue;
      const abs = path.join(root, rel);
      if (!fs.statSync(abs).isFile()) continue;
      const blob = await github.rest.git.createBlob({
        owner,
        repo,
        content: fs.readFileSync(abs).toString("base64"),
        encoding: "base64",
      });
      tree.push({
        path: rel.split(path.sep).join("/"),
        mode: "100644",
        type: "blob",
        sha: blob.data.sha,
      });
    }
  }
  if (tree.length === 0) {
    core.info("no SVGs to publish");
    return;
  }

  const t = await github.rest.git.createTree({ owner, repo, tree });
  const c = await github.rest.git.createCommit({
    owner,
    repo,
    tree: t.data.sha,
    parents: [],
    message: `bench renders — run ${runId} (${(process.env.HEAD_SHA || "").slice(0, 7)})`,
  });
  await github.rest.git.createRef({
    owner,
    repo,
    ref: `refs/${refName}`,
    sha: c.data.sha,
  });
  core.setOutput(
    "url",
    `${process.env.GITHUB_SERVER_URL}/${owner}/${repo}/blob/${c.data.sha}`,
  );
};
