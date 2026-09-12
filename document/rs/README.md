# Choreo document types for Rust

This crate contains Rust types generated from `document/schema.json`.

Regenerate the committed source after changing the schema:

```sh
pnpm document:rs:generate
```

The generator is pinned through `Cargo.lock`, formats its output, and only
rewrites `src/generated.rs` when its contents change. Do not edit that file by
hand. Handwritten behavior belongs in a separate module exported by `src/lib.rs`.

CI can detect stale generated source with:

```sh
pnpm document:rs:check
```