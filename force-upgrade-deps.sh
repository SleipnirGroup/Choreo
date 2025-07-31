#!/bin/bash
cargo update --breaking -Z unstable-options
cargo update
pnpm update --latest
