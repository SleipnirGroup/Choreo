#!/bin/bash
# This script forcibly updates all Rust and TypeScript dependencies.
# Make sure the result compiles and runs correctly before committing.
cargo update --breaking -Z unstable-options
cargo update
pnpm update --latest
