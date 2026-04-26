#!/usr/bin/env node
// Idempotently install Rust toolchain components that the pre-push hook
// expects. Run from `package.json::postinstall`, so it fires on every
// `pnpm install` — that's fine because each `rustup component add` is a
// no-op when the component is already installed.
//
// Why this exists:
// - `.husky/pre-push` runs `cargo llvm-cov`, which requires the
//   `llvm-tools-preview` rustup component.
// - On a fresh clone the developer would otherwise hit a confusing
//   "no such command: llvm-cov" the first time they push — instead of
//   discovering the component requirement, they have to dig through
//   docs.
//
// Behaviour:
// - If `rustup` is not on PATH, print a one-line warning and exit 0
//   (do not fail `pnpm install`; not every contributor needs Rust).
// - If `rustup` exists, attempt to add `llvm-tools-preview`.
//   If the user is offline or rustup is misconfigured, log the failure
//   and exit 0 anyway — pre-push will surface a more actionable error
//   later.

import { spawnSync } from 'node:child_process'

function which(cmd) {
  const res = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    [cmd],
    { stdio: 'ignore' },
  )
  return res.status === 0
}

function ensureLlvmTools() {
  if (!which('rustup')) {
    console.log(
      '[ensure-rust-toolchain] rustup not found on PATH — skipping ' +
        '`rustup component add llvm-tools-preview`. Pre-push coverage ' +
        'will fail until Rust is installed.',
    )
    return
  }

  const result = spawnSync('rustup', ['component', 'add', 'llvm-tools-preview'], {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.warn(
      '[ensure-rust-toolchain] `rustup component add llvm-tools-preview` ' +
        `exited with code ${result.status}. Continuing anyway; pre-push ` +
        'coverage will surface the issue when needed.',
    )
  }
}

ensureLlvmTools()
