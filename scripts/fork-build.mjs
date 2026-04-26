#!/usr/bin/env node
// Build the Tolaria fork's Windows installer with an auto-stamped version
// of the form `YYYY.M.D-sergvss-win.N` instead of the upstream-default
// `0.1.0`. Mirrors the calendar-versioning approach used by upstream's
// `release.yml`, but counters live in a local `.fork-build-counter` file
// (gitignored) so we don't depend on the GitHub release pipeline.
//
// The stamp is applied to `src-tauri/Cargo.toml` and
// `src-tauri/tauri.conf.json` for the duration of the build, then reverted
// from a backup taken at stamp time. If the build is interrupted, the
// finally block still restores the original files.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CARGO_TOML = resolve(ROOT, 'src-tauri/Cargo.toml')
const TAURI_CONF = resolve(ROOT, 'src-tauri/tauri.conf.json')
const COUNTER_PATH = resolve(ROOT, '.fork-build-counter')
const CARGO_BACKUP = resolve(ROOT, '.fork-version-backup-cargo')
const TAURI_BACKUP = resolve(ROOT, '.fork-version-backup-tauri')

const FORK_SUFFIX = process.env.FORK_BUILD_SUFFIX ?? 'sergvss-win'
const TARGET = process.env.FORK_BUILD_TARGET ?? 'x86_64-pc-windows-msvc'
const BUNDLES = process.env.FORK_BUILD_BUNDLES ?? 'nsis'

function todayCalendar() {
  const d = new Date()
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

function readCounter(today) {
  if (!existsSync(COUNTER_PATH)) return { date: today, count: 0 }
  try {
    const stored = JSON.parse(readFileSync(COUNTER_PATH, 'utf8'))
    if (stored.date === today && typeof stored.count === 'number') return stored
  } catch {
    // Corrupted counter file — start over.
  }
  return { date: today, count: 0 }
}

function writeCounter(value) {
  writeFileSync(COUNTER_PATH, `${JSON.stringify(value, null, 2)}\n`)
}

function buildVersion(suffix) {
  const date = todayCalendar()
  const counter = readCounter(date)
  const next = { date, count: counter.count + 1 }
  writeCounter(next)
  return `${date}-${suffix}.${next.count}`
}

function stampVersion(version) {
  const cargoOriginal = readFileSync(CARGO_TOML, 'utf8')
  writeFileSync(CARGO_BACKUP, cargoOriginal)
  const cargoStamped = cargoOriginal.replace(
    /^version\s*=\s*"[^"]*"/m,
    `version = "${version}"`,
  )
  if (cargoStamped === cargoOriginal) {
    throw new Error('Failed to substitute version in Cargo.toml')
  }
  writeFileSync(CARGO_TOML, cargoStamped)

  const tauriOriginal = readFileSync(TAURI_CONF, 'utf8')
  writeFileSync(TAURI_BACKUP, tauriOriginal)
  const tauriParsed = JSON.parse(tauriOriginal)
  tauriParsed.version = version
  writeFileSync(TAURI_CONF, `${JSON.stringify(tauriParsed, null, 2)}\n`)
}

function restoreVersion() {
  if (existsSync(CARGO_BACKUP)) {
    writeFileSync(CARGO_TOML, readFileSync(CARGO_BACKUP, 'utf8'))
    unlinkSync(CARGO_BACKUP)
  }
  if (existsSync(TAURI_BACKUP)) {
    writeFileSync(TAURI_CONF, readFileSync(TAURI_BACKUP, 'utf8'))
    unlinkSync(TAURI_BACKUP)
  }
}

function runTauriBuild(extraArgs) {
  const pnpmExec = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  execFileSync(
    pnpmExec,
    ['tauri', 'build', '--target', TARGET, '--bundles', BUNDLES, ...extraArgs],
    { cwd: ROOT, stdio: 'inherit' },
  )
}

function main() {
  const version = buildVersion(FORK_SUFFIX)
  console.log(`[fork-build] stamping version: ${version}`)
  stampVersion(version)

  let exitCode = 0
  try {
    runTauriBuild(process.argv.slice(2))
    console.log(`[fork-build] success → installer name will include ${version}`)
  } catch (error) {
    exitCode = typeof error.status === 'number' ? error.status : 1
    console.error(`[fork-build] tauri build failed (exit ${exitCode})`)
  } finally {
    restoreVersion()
    console.log('[fork-build] restored Cargo.toml + tauri.conf.json to dev defaults')
  }
  process.exit(exitCode)
}

// Make sure the restore runs even on Ctrl+C / SIGTERM.
process.on('SIGINT', () => {
  restoreVersion()
  process.exit(130)
})
process.on('SIGTERM', () => {
  restoreVersion()
  process.exit(143)
})

main()
