# Windows Setup

Tolaria работает нативно на Windows 10 / 11 (x86_64). Этот гид покрывает toolchain, необходимый для разработки, тестирования и запуска приложения из исходников на Windows.

Upstream README и `GETTING-STARTED.md` описывают macOS и Linux. На Windows вам нужна только эта страница.

## Предварительные требования

| Инструмент | Минимальная версия | Зачем |
|---|---|---|
| Node.js | 22 LTS | Frontend dev-сервер, Vite, Vitest, runtime для MCP-сервера |
| pnpm | 10 | Менеджер пакетов — обязательный (не взаимозаменяем с npm/yarn) |
| Rust | 1.77.2+ MSVC | Backend Tauri, все команды `cargo` |
| Visual Studio Build Tools 2022 | C++ workload + Windows 11 SDK | MSVC-линкер для Rust |
| Git | 2.40+ | Source control плюс Git Bash для husky-хуков |

### Установка одной командой (PowerShell, для большинства шагов admin не нужен)

UAC-prompt появится один раз для Visual Studio Build Tools.

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

После этих установок один раз перезапустите терминал, чтобы новые записи в `PATH` подхватились.

### Проверьте toolchain

Откройте свежий PowerShell-window (или Git Bash) и запустите:

```powershell
node --version    # v22.x
pnpm --version    # 10.x
cargo --version   # cargo 1.95.x
rustc --version   # rustc 1.95.x
```

Если что-то из этого говорит "command not found" — перезапустите терминал — winget и rustup пишут в пользовательский `PATH`, но изменения видны только в новых сессиях.

## Сборка и запуск

```powershell
git clone https://github.com/sergvss/tolaria-vss.git
cd tolaria-vss
pnpm install            # installs frontend deps and links husky hooks
pnpm tauri dev          # opens the native desktop app
```

Первый `pnpm tauri dev` занимает 3–5 минут, потому что Cargo компилирует полный граф зависимостей. Последующие запуски инкрементальные и стартуют меньше чем за 30 секунд.

Чтобы получить инсталлятор Windows:

```powershell
pnpm tauri build --target x86_64-pc-windows-msvc --bundles nsis
```

Инсталлятор `.exe` появится в `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.

## Тесты

```powershell
# Frontend (Vitest, jsdom)
pnpm test

# Rust (cargo test, all 615 lib tests)
cargo test --manifest-path=src-tauri/Cargo.toml --lib

# Full coverage (also enforced in CI)
pnpm test:coverage
cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85
```

## Husky-хуки на Windows

Pre-commit и pre-push хуки автоматически запускаются через Git Bash. Шаг `pnpm install` подключает их через husky. Держите Git for Windows установленным (он поставляется с Bash) — без него хуки не сработают.

Pre-commit запускает Vitest, только если в стейдже есть frontend-файлы (`.ts/.tsx/.js/.jsx`, `package.json`, `pnpm-lock.yaml`, конфиг Vite/Vitest, что-либо под `src/test/`). Чисто документационные / Rust / CI коммиты пропускают Vitest и завершаются за секунды. Pre-push хук всё равно запускает полный coverage-гейт, поэтому safety-ratchet остаётся целым.

## Долгий pre-push? Используйте локальную «лазейку»

`cargo llvm-cov --fail-under-lines 85` добавляет к каждому push на Windows 5–15 минут, потому что инструментированный билд пересобирается, когда host-артефакты расходятся. Job на macOS в CI применяет тот же гейт, поэтому локально его можно пропустить:

```powershell
$env:LAPUTA_SKIP_LOCAL_COVERAGE = "1"
git push
```

Pre-push выводит строку «skipped» и идёт дальше; push занимает секунды-минуты вместо 15+ минут. Следующий коммит на `main` запустит CI, который всё равно требует ≥85% coverage как ratchet проекта.

Поставьте эту переменную в профиль шелла (PowerShell `$PROFILE` или Git Bash `~/.bashrc`), если хотите сделать её постоянной на личной Windows-машине. Не выставляйте её в CI workflows.

## Известные ограничения

- **cargo-тесты `run_chat_stream_returns_result` и `run_agent_stream_returns_result` отключены не на Windows.** Они вызывают реальный Claude CLI на каждом запуске и сожгут API-кредиты на машине разработчика, где CLI установлен (mac/linux CI обычно его не имеет, поэтому вызов там fail-fast'ится). См. комментарий в `src-tauri/src/claude_cli.rs`.
- **Code signing** для NSIS-инсталлятора в форке не настроен. Tauri auto-updater работает только для подписанных билдов, поэтому обновления из самостоятельно собранного инсталлятора апдейтером приложения подхвачены не будут. Для апгрейда переустановите свежий `Tolaria_<version>_x64-setup.exe`.
- **macOS-only QA-скрипты** в `~/.openclaw/skills/tolaria-qa/scripts/` (`focus-app.sh`, `screenshot.sh`, `osascript keystroke …`) на Windows не работают. Используйте Playwright smoke lane (`pnpm playwright:smoke`) и ручное нативное QA для клавиатурных взаимодействий, пока QA-хелперы не будут портированы.

## Что «просто работает»

Эти вещи явно проверены на `x86_64-pc-windows-msvc`:

- Приложение запускается, открывает дефолтный vault. Legacy auto-discovery путь — `%USERPROFILE%\Documents\Laputa` на Windows (по конвенции Documents-папки) и `~/Laputa` на macOS / Linux. Новые пользователи проходят onboarding-флоу, который клонирует Getting Started vault в `%USERPROFILE%\Documents\Getting Started`.
- ws-bridge спавнится и остаётся подключённым
- Claude Code CLI автоматически детектится при установке через npm (шим `claude.cmd` под `%APPDATA%\Roaming\npm`), Anthropic local install (`.claude\local\claude.exe`), Scoop, или через env-оверрайд `CLAUDE_BIN`
- Codex CLI детектится тем же образом (доступен env-оверрайд `CODEX_BIN`)
- Git-операции через bundled `git` CLI из Git for Windows
- Инкрементальные обновления кэша vault уважают Windows path separators
- `vault::filename_rules` отвергает Windows-reserved device-имена (`CON`, `PRN`, `AUX`, `NUL`, `COM1…`, `LPT1…`) до того, как они достигнут файловой системы
- Unicode-пути и пути с пробелами внутри `%USERPROFILE%` (протестировано на дефолтной настройке `C:\Users\<name>`)
