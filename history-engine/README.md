# History Engine

This component stores undo and redo history for one scope per HistoryEngine instance using JSON Patch style operations.

## Scope Model

Each HistoryEngine instance is created with one immutable scope key.

Examples:

- project
- trajectory:{uuid}

State-server keeps one HistoryEngine per scope key.

## Storage Format

Each entry stores:

- reason
- undo_patch
- redo_patch
- recorded_at

The engine stores patch documents rather than full before and after snapshots to reduce memory usage.

## Patch Direction

Given a mutation from before to after:

- redo_patch transforms before into after
- undo_patch transforms after into before

## Record Flow

1. Caller captures before snapshot.
2. Caller applies mutation.
3. Caller captures after snapshot.
4. Engine builds undo and redo patch documents.
5. Entry is pushed to the engine's undo stack and redo stack is cleared.

## Undo and Redo Flow

Undo:

1. Pop latest entry from the scope engine undo stack.
2. Apply undo_patch to current scope snapshot.
3. Write patched snapshot back through ApiServer validation path.
4. Push entry to the same scope engine redo stack.
5. Bump scope revision.

Redo:

1. Pop latest entry from the scope engine redo stack.
2. Apply redo_patch to current scope snapshot.
3. Write patched snapshot back through ApiServer validation path.
4. Push entry to the same scope engine undo stack.
5. Bump scope revision.

## Patch Constraints

The patch applier supports add, remove, and replace operations.

For arrays, diff generation uses index-by-index patching when lengths match.
If array lengths differ, the engine emits a full replace for that array.
This keeps patch generation deterministic and avoids index shift complexity.
