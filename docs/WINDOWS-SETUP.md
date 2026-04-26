# Windows Setup

Tolaria runs natively on Windows 10 / 11 (x86_64). This guide covers the toolchain you need to develop, test, and run the app from source on Windows.

The upstream README and `GETTING-STARTED.md` describe macOS and Linux. On Windows you only need this page.

## Prerequisites

| Tool | Minimum version | Why |
|---|---|---|
| Node.js | 22 LTS | Frontend dev server, Vite, Vitest, MCP server runtime |
| pnpm | 10 | Package manager — required (not interchangeable with npm/yarn) |
| Rust | 1.77.2+ MSVC | Tauri backend, all `cargo` commands |
| Visual Studio Build Tools 2022 | C++ workload + Windows 11 SDK | MSVC linker for Rust |
| Git | 2.40+ | Source control plus Git Bash for husky hooks |

### One-shot install (PowerShell, no admin needed for most steps)

A UAC prompt will appear once for Visual Studio Build Tools.

```powershell
# Visual Studio Build Tools 2022 (C++ workload) — needed by Rust MSVC linker
winget install --id Microsoft.VisualStudio.2022.BuildTools --silent `
  --accept-package-agreements --accept-source-agreements `
  --override "--wait --quiet --norestart `
              --add Microsoft.VisualStudio.Workload.VCTools `
              --add Microsoft.VisualStudio.Component.Windows11SDK.22621 `
              --includeRecommended"

# Rustup (installs cargo + rustc + rustup; PATH is updated automatically)
winget install --id Rustlang.Rustup --silent `
  --accept-package-agreements --accept-source-agreements
rustup default stable-x86_64-pc-windows-msvc

# pnpm
winget install --id pnpm.pnpm --silent `
  --accept-package-agreements --accept-source-agreements
```

Restart your terminal once after these installs so the new entries in `PATH` are picked up.

### Verify the toolchain

Open a fresh PowerShell window (or Git Bash) and run:

```powershell
node --version    # v22.x
pnpm --version    # 10.x
cargo --version   # cargo 1.95.x
rustc --version   # rustc 1.95.x
```

If any of these say "command not found", restart the terminal — winget and rustup write to user `PATH`, but only new sessions see the change.

## Build and run

```powershell
git clone https://github.com/sergvss/tolaria-vss.git
cd tolaria-vss
pnpm install            # installs frontend deps and links husky hooks
pnpm tauri dev          # opens the native desktop app
```

The first `pnpm tauri dev` takes 3–5 minutes because Cargo compiles the full dependency graph. Subsequent runs are incremental and start in under 30 seconds.

To produce a Windows installer:

```powershell
pnpm tauri build --target x86_64-pc-windows-msvc --bundles nsis
```

The `.exe` installer appears under `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.

## Tests

```powershell
# Frontend (Vitest, jsdom)
pnpm test

# Rust (cargo test, all 615 lib tests)
cargo test --manifest-path=src-tauri/Cargo.toml --lib

# Full coverage (also enforced in CI)
pnpm test:coverage
cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85
```

## Husky hooks on Windows

Pre-commit and pre-push hooks run through Git Bash automatically. The `pnpm install` step links them via husky. Keep Git for Windows installed (it ships with Bash) — without it the hooks cannot fire.

Pre-commit only runs Vitest if frontend files (`.ts/.tsx/.js/.jsx`, `package.json`, `pnpm-lock.yaml`, Vite/Vitest config, anything under `src/test/`) are staged. Pure docs / Rust / CI commits skip Vitest and finish in seconds. The pre-push hook still runs the full coverage gate, so the safety ratchet stays intact.

## Slow pre-push? Use the local-only escape hatch

`cargo llvm-cov --fail-under-lines 85` adds 5-15 minutes per push on Windows because the instrumented build is rebuilt when host artifacts diverge. The macOS test job in CI enforces the same gate, so locally you can skip it:

```powershell
$env:LAPUTA_SKIP_LOCAL_COVERAGE = "1"
git push
```

Pre-push prints a "skipped" line and moves on; the push lands in seconds-to-minutes instead of 15+ minutes. The next commit on `main` triggers CI, which still enforces ≥85% coverage as the project ratchet.

Set this in your shell profile (PowerShell `$PROFILE` or Git Bash `~/.bashrc`) if you want it permanent on a personal Windows machine. Do **not** export it in CI workflows.

## Known limitations

- **`run_chat_stream_returns_result` and `run_agent_stream_returns_result` cargo tests are gated to non-Windows.** They invoke the real Claude CLI on every run and would burn API credit on a developer machine that has the CLI installed (mac/linux CI typically does not, so the call fails fast there). See the comment in `src-tauri/src/claude_cli.rs`.
- **Code signing** for the NSIS installer is not configured for the fork. The Tauri auto-updater works only for signed builds, so updates from a self-built installer will not be picked up by the app's updater. Reinstall a fresh `Tolaria_<version>_x64-setup.exe` to upgrade.
- **macOS-only QA scripts** under `~/.openclaw/skills/tolaria-qa/scripts/` (`focus-app.sh`, `screenshot.sh`, `osascript keystroke …`) do not run on Windows. Use the Playwright smoke lane (`pnpm playwright:smoke`) and manual native QA for keyboard interactions until the QA helpers are ported.

## Things that "just work"

These are explicitly verified on `x86_64-pc-windows-msvc`:

- App launches, opens the default vault. The legacy auto-discovery path is `%USERPROFILE%\Documents\Laputa` on Windows (Documents-folder convention) and `~/Laputa` on macOS / Linux. New users go through the onboarding flow which clones the Getting Started vault under `%USERPROFILE%\Documents\Getting Started`.
- ws-bridge spawns and stays connected
- Claude Code CLI detected automatically when installed via npm (`claude.cmd` shim under `%APPDATA%\Roaming\npm`), Anthropic local install (`.claude\local\claude.exe`), Scoop, or via a `CLAUDE_BIN` env override
- Codex CLI detected the same way (`CODEX_BIN` env override available)
- Git operations through the bundled `git` CLI from Git for Windows
- Vault cache incremental updates honor Windows path separators
- `vault::filename_rules` rejects Windows-reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1…`, `LPT1…`) before they reach the filesystem
- Unicode paths and paths with spaces inside `%USERPROFILE%` (tested with the default `C:\Users\<name>` setup)
