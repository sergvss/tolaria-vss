![Latest stable](https://img.shields.io/github/v/release/refactoringhq/tolaria?display_name=tag) [![CI](https://github.com/refactoringhq/tolaria/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/refactoringhq/tolaria/actions/workflows/ci.yml) [![Build](https://github.com/refactoringhq/tolaria/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/refactoringhq/tolaria/actions/workflows/release.yml) [![Codecov](https://codecov.io/gh/refactoringhq/tolaria/graph/badge.svg?branch=main)](https://codecov.io/gh/refactoringhq/tolaria) [![CodeScene Hotspot Code Health](https://codescene.io/projects/76865/status-badges/hotspot-code-health)](https://codescene.io/projects/76865)

> **Windows-friendly fork** maintained by [@sergvss](https://github.com/sergvss/tolaria-vss).
> Original project by Luca Rossi: [refactoringhq/tolaria](https://github.com/refactoringhq/tolaria).
>
> Jump to [Windows fork additions](#windows-fork-additions) for what this fork adds on top of upstream.

# 💧 Tolaria

Tolaria is a desktop app for Mac and Linux for managing **markdown knowledge bases**. People use it for a variety of use cases:

* Operate second brains and personal knowledge
* Organize company docs as context for AI
* Store OpenClaw/assistants memory and procedures

Personally, I use it to **run my life** (hey 👋 [Luca here](http://x.com/lucaronin)). I have a massive workspace of 10,000+ notes, which are the result of my [Refactoring](https://refactoring.fm/) work + a ton of personal journaling and *second braining*.

<img width="1000" height="656" alt="1776506856823-CleanShot_2026-04-18_at_12 06 57_2x" src="https://github.com/user-attachments/assets/8aeafb0a-b236-43c2-a083-ec111f903c38" />

## Walkthroughs

You can find some Loom walkthroughs below — they are short and to the point:
- [How I Organize My Own Tolaria Workspace](https://www.loom.com/share/bb3aaffa238b4be0bd62e4464bca2528)
- [My Inbox Workflow](https://www.loom.com/share/dffda263317b4fa8b47b59cdf9330571)
- [How I Save Web Resources to Tolaria](https://www.loom.com/share/8a3c1776f801402ebbf4d7b0f31e9882)

## Principles

- 📑 **Files-first** — Your notes are plain markdown files. They're portable, work with any editor, and require no export step. Your data belongs to you, not to any app.
- 🔌 **Git-first** — Every vault is a git repository. You get full version history, the ability to use any git remote, and zero dependency on Tolaria servers.
- 🛜 **Offline-first, zero lock-in** — No accounts, no subscriptions, no cloud dependencies. Your vault works completely offline and always will. If you stop using Tolaria, you lose nothing.
- 🔬 **Open source** — Tolaria is free and open source. I built this for [myself](https://x.com/lucaronin) and for sharing it with others.
- 📋 **Standards-based** — Notes are markdown files with YAML frontmatter. No proprietary formats, no locked-in data. Everything works with standard tools if you decide to move away from Tolaria.
- 🔍 **Types as lenses, not schemas** — Types in Tolaria are navigation aids, not enforcement mechanisms. There's no required fields, no validation, just helpful categories for finding notes.
- 🪄**AI-first but not AI-only** — A vault of files works very well with AI agents, but you are free to use whatever you want. We support Claude Code and Codex CLI (for now), but you can edit the vault with any AI you want. We provide an AGENTS file for your agents to figure out.
- ⌨️ **Keyboard-first** — Tolaria is designed for power-users who want to use keyboard as much as possible. A lot of how we designed the Editor and the Command Palette is based on this.
- 💪 **Built from real use** — Tolaria was created for manage my personal vault of 10,000+ notes, and I use it every day. Every feature exists because it solved a real problem.

## Getting started

Download the [latest release here](https://github.com/refactoringhq/tolaria/releases/latest/download/Tolaria.app.tar.gz).

When you open Tolaria for the first time you get the chance of cloning the [getting started vault](https://github.com/refactoringhq/tolaria-getting-started) — which gives you a walkthrough of the whole app.

## Open source and local setup

Tolaria is open source and built with Tauri, React, and TypeScript. If you want to run or contribute to the app locally, here is [how to get started](https://github.com/refactoringhq/tolaria/blob/main/docs/GETTING-STARTED.md). You can also find the gist below 👇

### Prerequisites

- Node.js 20+
- pnpm 8+
- Rust stable
- macOS or Linux for development

#### Linux system dependencies

Tauri 2 on Linux requires WebKit2GTK 4.1 and GTK 3:

- Arch / Manjaro:
  ```bash
  sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl \
    appmenu-gtk-module libappindicator-gtk3 librsvg
  ```
- Debian / Ubuntu (22.04+):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
    libsoup-3.0-dev patchelf
  ```
- Fedora 38+:
  ```bash
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
    libappindicator-gtk3-devel librsvg2-devel
  ```

The bundled MCP server still spawns the system `node` binary at runtime on Linux, so install Node from your distro package manager if you want the external AI tooling flow.

### Quick start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` for the browser-based mock mode, or run the native desktop app with:

```bash
pnpm tauri dev
```

## Tech Docs

- 📐 [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design, tech stack, data flow
- 🧩 [ABSTRACTIONS.md](docs/ABSTRACTIONS.md) — Core abstractions and models
- 🚀 [GETTING-STARTED.md](docs/GETTING-STARTED.md) — How to navigate the codebase
- 📚 [ADRs](docs/adr) — Architecture Decision Records

## Security

If you believe you have found a security issue, please report it privately as described in [SECURITY.md](./SECURITY.md).

## Windows fork additions

This fork at [sergvss/tolaria-vss](https://github.com/sergvss/tolaria-vss) is maintained by [@sergvss](https://github.com/sergvss). It tracks upstream and adds the following on top:

### Windows portability
- **Native Windows builds** - the upstream README still says "macOS or Linux for development". This fork compiles cleanly on `x86_64-pc-windows-msvc`, ships an NSIS installer (`Tolaria_YYYY.M.D-sergvss-win.N_x64-setup.exe`), and has CI green on `windows-2022`.
- **Path separator fix** - introduced `src/utils/pathSeparators.ts` (`splitPath`, `getBasename`, `getStem`) and replaced ~20 `path.split('/')` call sites that broke on Windows whenever an OS-native path leaked through Tauri's IPC normalization. Most visible symptom on upstream: editor losing focus after H1-driven auto-rename.
- **UNC `\\?\` prefix stripping** - `strip_extended_length_prefix` applied at every place a canonicalized path crossed back to the frontend, so `\\?\C:\Users\...\vault` no longer leaks into the UI.
- **Vault path normalization** - `normalize_vault_path` in `src-tauri/src/vault/mod.rs` forces forward slashes on every OS, used by cache, rename, and vault-list paths so the cache key shape is stable cross-platform.
- **CLI shim handling** - `Command::new(claude.cmd)` post-CVE-2024-24576 (Rust 1.77+) silently drops stdout for `.cmd` / `.bat` shims. `build_claude_command` in `claude_cli.rs` wraps the invocation as `cmd.exe /C <bin>` on Windows so the AI Agent panel actually receives streamed output. Same fix pattern is ready for Codex CLI.
- **Inspector toggle no longer drops fullscreen** - `update_current_window_min_size` snapshots `is_maximized()` up front and restores it after `set_min_size` / `set_size` so toggling Inspector / Sidebar never accidentally unmaximizes the main window.
- **Default vault folder on Windows** - `legacy_default_vault_path()` returns `%USERPROFILE%\Documents\Laputa` on Windows (Documents-folder convention), keeping the macOS/Linux path unchanged.
- **Windows-reserved filename rejection** - `vault::filename_rules` blocks `CON`, `PRN`, `AUX`, `NUL`, `COM1…`, `LPT1…` before they reach the filesystem, with image-upload tests pinning the rule.
- **Codex CLI `-c` arguments** - escapes Windows path separators via `serde_json::to_string` so the JSON-in-CLI-arg format remains valid when MCP server / vault paths contain backslashes.
- **Husky hooks on Windows** - pre-commit narrowed to skip Vitest on docs / Rust commits (saves ~10 minutes), pre-push gained `LAPUTA_SKIP_LOCAL_COVERAGE=1` escape hatch, and the Playwright smoke server now spawns `pnpm` via shell on Windows.
- **Postinstall** - `scripts/ensure-rust-toolchain.mjs` idempotently adds `llvm-tools-preview` so a fresh clone gets pre-push coverage working without docs digging.
- **Stamped fork builds** - `scripts/fork-build.mjs` calendar-versions installers (`YYYY.M.D-sergvss-win.N`) instead of shipping `0.1.0`. `bundle.createUpdaterArtifacts` is `false` so unsigned fork builds finish cleanly.

### Internationalization (English / Russian)
- **react-i18next** with synchronous resource loading, CLDR pluralization for `ru`, and `i18next` initialized once in `main.tsx` (and again in vitest setup so tests render translated strings, not bare keys).
- **Settings → Display language** picker (English / Русский) with `Settings.language` persisted by the Tauri backend. `applyLanguage()` switches i18next at runtime - no app reload needed.
- **OS locale auto-detect** on first launch: a Russian Windows lands on the Russian UI without touching settings.
- **Translation glossary** at [docs/i18n-glossary.md](docs/i18n-glossary.md) - source of truth for new keys (which terms stay English, which translate, plural forms, button casing, etc.).
- **First batch translated**: Settings panel, Sidebar nav, Create-Note dialog, Confirm-Delete dialog, About dialog. More UI areas (Command Palette, Status Bar, Editor toolbar, Inspector, AI Panel, Welcome screen) are tracked in the project todo and land incrementally.

### Auto-updater behaviour for the fork
- The upstream feed at `refactoringhq.github.io/tolaria` ships unmodified Tolaria binaries without this fork's Windows fixes, so clicking "Update Now" would silently overwrite the fork with vanilla upstream. To prevent that:
  - The "Update Now" button is removed from `UpdateBanner`. Only "Release Notes" + "Dismiss" remain - the banner becomes informational.
  - `download_and_install_app_update` returns a clear "auto-update is disabled in this fork build" error if some path still reaches it.
  - New Settings → Sync & Updates → **Disable update checks** toggle (`Settings.update_check_disabled`) short-circuits the check entirely.
  - New "Check upstream Tolaria releases" entry in the command palette opens the GitHub releases page - the maintainer can review what's new without the fork ever calling install.

### Branding & docs
- **About Tolaria** dialog - new modal reachable via the command palette, credits this fork (sergvss) and the upstream project (Luca Rossi), shows version + build number.
- **README maintainer note** at the top of this file plus this section listing concrete contributions.
- **Cargo.toml authors** updated to include the fork maintainer.
- **Russian docs** - `ARCHITECTURE.ru.md`, `ABSTRACTIONS.ru.md`, `GETTING-STARTED.ru.md`, `VISION.ru.md`, [WINDOWS-SETUP.ru.md](docs/WINDOWS-SETUP.ru.md). New [docs/WINDOWS-SETUP.md](docs/WINDOWS-SETUP.md) covers the toolchain, build, test, and known limitations on Windows.

### CI
- New Windows verification job pinned to `windows-2022` with workflow-level concurrency guard so PR runs cancel each other on push.
- macOS test job still enforces the ≥85 % Rust coverage gate; the Windows job pairs with it as a build/test guardrail.

If anything in this list belongs upstream and you want it as a PR series, [open an issue here](https://github.com/sergvss/tolaria-vss/issues) - the long-term plan is to land the bulk of the Windows port back in `refactoringhq/tolaria`.

## License

Tolaria is licensed under AGPL-3.0-or-later. The Tolaria name and logo remain covered by the project’s trademark policy.
