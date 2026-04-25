# Getting Started

Как ориентироваться в кодовой базе, запускать приложение и находить нужное.

## Предварительные требования

- **Node.js** 18+ и **pnpm**
- **Rust** 1.77.2+ (для бэкенда Tauri)
- **git** CLI (требуется фичами интеграции с git)

### Системные зависимости Linux

Если запускаете десктоп-приложение на Linux, сначала установите зависимости WebKit2GTK 4.1, нужные Tauri:

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

## Быстрый старт

```bash
# Install dependencies
pnpm install

# Run in browser (no Rust needed — uses mock data)
pnpm dev
# Open http://localhost:5173

# Run with Tauri (full app, requires Rust)
pnpm tauri dev

# Run tests
pnpm test          # Vitest unit tests
cargo test         # Rust tests (from src-tauri/)
pnpm playwright:smoke  # Curated Playwright core smoke lane (~5 min)
pnpm playwright:regression  # Full Playwright regression suite
```

## Стартовые vault'ы и remote'ы

`create_getting_started_vault` клонирует публичный starter-репо, а потом удаляет каждый git remote из новой локальной копии. Это значит, что Getting Started vaults открываются local-only по умолчанию. Пользователи позже подключают совместимый remote через чип `No remote` в нижней панели или через командную палитру; оба пути ведут в один и тот же `AddRemoteModal` и backend-flow `git_add_remote`.

## Структура директорий

```
tolaria/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point (renders <App />)
│   ├── App.tsx                   # Root component — orchestrates layout + state
│   ├── App.css                   # App shell layout styles
│   ├── types.ts                  # Shared TS types (VaultEntry, Settings, etc.)
│   ├── mock-tauri.ts             # Mock Tauri layer for browser testing
│   ├── theme.json                # Editor typography theme configuration
│   ├── index.css                 # Semantic app theme variables + Tailwind setup
│   │
│   ├── components/               # UI components (~98 files)
│   │   ├── Sidebar.tsx           # Left panel: filters + type groups
│   │   ├── SidebarParts.tsx      # Sidebar subcomponents
│   │   ├── NoteList.tsx          # Second panel: filtered note list
│   │   ├── NoteItem.tsx          # Individual note item
│   │   ├── PulseView.tsx         # Git activity feed (replaces NoteList)
│   │   ├── Editor.tsx            # Third panel: editor orchestration
│   │   ├── EditorContent.tsx     # Editor content area
│   │   ├── EditorRightPanel.tsx  # Right panel toggle
│   │   ├── editorSchema.tsx      # BlockNote schema + wikilink type
│   │   ├── RawEditorView.tsx     # CodeMirror raw editor
│   │   ├── Inspector.tsx         # Fourth panel: metadata + relationships
│   │   ├── DynamicPropertiesPanel.tsx  # Editable frontmatter properties
│   │   ├── AiPanel.tsx           # AI agent panel (selected CLI agent)
│   │   ├── AiMessage.tsx         # Agent message display
│   │   ├── AiActionCard.tsx      # Agent tool action cards
│   │   ├── AiAgentsOnboardingPrompt.tsx # First-launch AI agent installer prompt
│   │   ├── SearchPanel.tsx       # Search interface
│   │   ├── SettingsPanel.tsx     # App settings
│   │   ├── StatusBar.tsx         # Bottom bar: vault picker + sync
│   │   ├── CommandPalette.tsx    # Cmd+K command launcher
│   │   ├── BreadcrumbBar.tsx     # Breadcrumb + word count + actions
│   │   ├── WelcomeScreen.tsx     # Onboarding screen
│   │   ├── LinuxTitlebar.tsx     # Linux-only custom window chrome + controls
│   │   ├── LinuxMenuButton.tsx   # Linux titlebar menu mirroring app commands
│   │   ├── CloneVaultModal.tsx   # Clone a vault from any git URL
│   │   ├── AddRemoteModal.tsx    # Connect a local-only vault to a remote later
│   │   ├── ConflictResolverModal.tsx # Git conflict resolution
│   │   ├── CommitDialog.tsx      # Git commit modal
│   │   ├── CreateNoteDialog.tsx  # New note modal
│   │   ├── CreateTypeDialog.tsx  # New type modal
│   │   ├── UpdateBanner.tsx      # In-app update notification
│   │   ├── inspector/            # Inspector sub-panels
│   │   │   ├── BacklinksPanel.tsx
│   │   │   ├── RelationshipsPanel.tsx
│   │   │   ├── GitHistoryPanel.tsx
│   │   │   └── ...
│   │   └── ui/                   # shadcn/ui primitives
│   │       ├── button.tsx, dialog.tsx, input.tsx, ...
│   │
│   ├── hooks/                    # Custom React hooks (~87 files)
│   │   ├── useVaultLoader.ts     # Loads vault entries + content
│   │   ├── useVaultSwitcher.ts   # Multi-vault management
│   │   ├── useVaultConfig.ts     # Per-vault UI settings
│   │   ├── useNoteActions.ts     # Composes creation + rename + frontmatter
│   │   ├── useNoteCreation.ts    # Note/type creation
│   │   ├── useNoteRename.ts     # Note renaming + wikilink updates
│   │   ├── useAiAgent.ts         # Legacy Claude-specific stream helpers reused by the shared agent hook
│   │   ├── useCliAiAgent.ts      # Selected AI agent state + normalized tool tracking
│   │   ├── useAiAgentsStatus.ts  # Claude/Codex availability polling
│   │   ├── useAiAgentPreferences.ts # Default-agent persistence + cycling
│   │   ├── useAiActivity.ts      # MCP UI bridge listener
│   │   ├── useAutoSync.ts        # Auto git pull/push
│   │   ├── useConflictResolver.ts # Git conflict handling
│   │   ├── useEditorSave.ts      # Auto-save with debounce
│   │   ├── useTheme.ts           # Flatten theme.json → CSS vars
│   │   ├── useUnifiedSearch.ts   # Keyword search
│   │   ├── useNoteSearch.ts      # Note search
│   │   ├── useCommandRegistry.ts # Command palette registry
│   │   ├── useAppCommands.ts     # App-level commands
│   │   ├── useAppKeyboard.ts     # Keyboard shortcuts
│   │   ├── appCommandCatalog.ts  # Shortcut combos + command metadata
│   │   ├── appCommandDispatcher.ts # Shared shortcut/menu command IDs + dispatch
│   │   ├── useSettings.ts        # App settings
│   │   ├── useGettingStartedClone.ts # Shared Getting Started clone action
│   │   ├── useOnboarding.ts      # First-launch flow
│   │   ├── useCodeMirror.ts      # CodeMirror raw editor
│   │   ├── useMcpBridge.ts       # MCP WebSocket client
│   │   ├── useMcpStatus.ts       # Explicit external AI tool connection status + connect/disconnect actions
│   │   ├── useUpdater.ts         # In-app updates
│   │   └── ...
│   │
│   ├── utils/                    # Pure utility functions (~48 files)
│   │   ├── wikilinks.ts          # Wikilink preprocessing pipeline
│   │   ├── frontmatter.ts        # TypeScript YAML parser
│   │   ├── platform.ts           # Runtime platform + Linux chrome gating helpers
│   │   ├── ai-agent.ts           # Agent stream utilities
│   │   ├── ai-chat.ts            # Token estimation utilities
│   │   ├── ai-context.ts         # Context snapshot builder
│   │   ├── noteListHelpers.ts    # Sorting, filtering, date formatting
│   │   ├── wikilink.ts           # Wikilink resolution
│   │   ├── configMigration.ts    # localStorage → vault config migration
│   │   ├── iconRegistry.ts       # Phosphor icon registry
│   │   ├── propertyTypes.ts      # Property type definitions
│   │   ├── vaultListStore.ts     # Vault list persistence
│   │   ├── vaultConfigStore.ts   # Vault config store
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── aiAgents.ts           # Shared agent registry + status helpers
│   │   ├── appUpdater.ts         # Frontend wrapper around channel-aware updater commands
│   │   ├── releaseChannel.ts     # Alpha/stable normalization helpers
│   │   └── utils.ts              # Tailwind merge + cn() helper
│   │
│   └── test/
│       └── setup.ts              # Vitest test environment setup
│
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   ├── build.rs                  # Tauri build script
│   ├── tauri.conf.json           # Tauri app configuration
│   ├── capabilities/             # Tauri v2 security capabilities
│   ├── src/
│   │   ├── main.rs               # Entry point (calls lib::run())
│   │   ├── lib.rs                # Tauri setup + command registration
│   │   ├── commands/             # Tauri command handlers (split into modules)
│   │   ├── vault/                # Vault module
│   │   │   ├── mod.rs            # Core types, parse_md_file, scan_vault
│   │   │   ├── cache.rs          # Git-based incremental caching
│   │   │   ├── parsing.rs        # Text processing + title extraction
│   │   │   ├── rename.rs         # Rename + cross-vault wikilink update
│   │   │   ├── image.rs          # Image attachment saving
│   │   │   ├── migration.rs      # Frontmatter migration
│   │   │   └── getting_started.rs # Getting Started vault clone orchestration
│   │   ├── frontmatter/          # Frontmatter module
│   │   │   ├── mod.rs, yaml.rs, ops.rs
│   │   ├── git/                  # Git module
│   │   │   ├── mod.rs, commit.rs, status.rs, history.rs, clone.rs, connect.rs
│   │   │   ├── conflict.rs, remote.rs, pulse.rs
│   │   ├── telemetry.rs          # Sentry init + path scrubber
│   │   ├── search.rs             # Keyword search (walkdir-based)
│   │   ├── ai_agents.rs          # Shared CLI-agent detection + stream adapters
│   │   ├── claude_cli.rs         # Claude CLI subprocess management
│   │   ├── mcp.rs                # MCP server lifecycle + explicit config registration/removal
│   │   ├── app_updater.rs        # Alpha/stable updater endpoint selection
│   │   ├── settings.rs           # App settings persistence
│   │   ├── vault_config.rs       # Per-vault UI config
│   │   ├── vault_list.rs         # Vault list persistence
│   │   └── menu.rs               # Native macOS menu bar
│   └── icons/                    # App icons
│
├── mcp-server/                   # MCP bridge (Node.js)
│   ├── index.js                  # MCP server entry (stdio, 14 tools)
│   ├── vault.js                  # Vault file operations
│   ├── ws-bridge.js              # WebSocket bridge (ports 9710, 9711)
│   ├── test.js                   # MCP server tests
│   └── package.json
│
├── e2e/                          # Playwright E2E tests (~26 specs)
├── tests/smoke/                  # Playwright specs (full regression + @smoke subset)
├── design/                       # Per-task design files
├── demo-vault-v2/                # Curated local QA fixture for native/dev flows
├── scripts/                      # Build/utility scripts
│
├── package.json                  # Frontend dependencies + scripts
├── vite.config.ts                # Vite bundler config
├── tsconfig.json                 # TypeScript config
├── playwright.config.ts          # Full Playwright regression config
├── playwright.smoke.config.ts    # Curated pre-push Playwright config
├── ui-design.pen                 # Master design file
├── AGENTS.md                     # Canonical shared instructions for coding agents
├── CLAUDE.md                     # Claude Code compatibility shim importing AGENTS.md as an organized Note
└── docs/                         # This documentation
```

## Ключевые файлы, которые стоит знать

### Фикстуры

- `demo-vault-v2/` — это маленькая закоммиченная QA-фикстура, используемая для нативных/мануальных flow Tolaria. Она намеренно curated вокруг нескольких сценариев search, relationship, project-navigation и attachment.
- `tests/fixtures/test-vault/` — детерминированная Playwright-фикстура, копируемая во временные директории для изолированных integration- и smoke-тестов.
- `python3 scripts/generate_demo_vault.py` генерирует более крупный синтетический vault по требованию в `generated-fixtures/demo-vault-large/` для экспериментов масштаба/производительности. Этот вывод gitignored и не должен раздувать обычную QA-фикстуру.

### Начните отсюда

| Файл | Почему важен |
|------|---------------|
| `src/App.tsx` | Корневой компонент. Показывает 4-панельный layout, поток состояния и как все фичи соединяются. |
| `src/types.ts` | Все общие TypeScript-типы. Прочитайте сначала, чтобы понять модель данных. |
| `src-tauri/src/commands/` | Хендлеры Tauri-команд (разбиты на модули). Это API-поверхность frontend-backend. |
| `src-tauri/src/lib.rs` | Tauri setup, регистрация команд, startup-задачи, жизненный цикл WebSocket bridge. |

### Слой данных

| Файл | Почему важен |
|------|---------------|
| `src/hooks/useVaultLoader.ts` | Как данные vault загружаются и управляются. Паттерн ветвления Tauri/mock. |
| `src/hooks/useNoteActions.ts` | Оркестрирует операции с заметкой: композирует `useNoteCreation`, `useNoteRename`, frontmatter CRUD и навигацию по wikilink. |
| `src/hooks/useVaultSwitcher.ts` | Multi-vault управление, переключение vault'ов и сохранение клонированных vault'ов в списке switcher'а. |
| `src/hooks/useGettingStartedClone.ts` | Общее действие "Clone Getting Started Vault" для статус-бара и командной палитры. |
| `src/components/AddRemoteModal.tsx` | UI модального окна для подключения local-only vault к совместимому remote. |
| `src/mock-tauri.ts` | Mock-данные для тестирования в браузере. Показывает форму всех ответов Tauri. |

### Бэкенд

| Файл | Почему важен |
|------|---------------|
| `src-tauri/src/vault/mod.rs` | Сканирование vault, парсинг frontmatter, вывод типа сущности, извлечение связей. |
| `src-tauri/src/vault/cache.rs` | Инкрементальное кэширование на основе git — как большие vault'ы загружаются быстро. |
| `src-tauri/src/frontmatter/ops.rs` | YAML-манипуляции — как свойства обновляются/удаляются в файлах. |
| `src-tauri/src/git/` | Все git-операции (clone, commit, pull, push, conflicts, pulse, add-remote). |
| `src-tauri/src/search.rs` | Keyword-поиск — сканирует файлы vault через walkdir. |
| `src-tauri/src/ai_agents.rs` | Общие проверки доступности CLI-агентов, безопасный по умолчанию адаптер Codex и нормализация стрима. |
| `src-tauri/src/claude_cli.rs` | Спавн подпроцесса Claude CLI + парсинг NDJSON-стрима. |
| `src-tauri/src/app_updater.rs` | Мост desktop-updater'а — выбирает alpha/stable манифесты и стримит прогресс установки. |

### Редактор

| Файл | Почему важен |
|------|---------------|
| `src/components/Editor.tsx` | Setup BlockNote, breadcrumb-бар, тумблер diff/raw. |
| `src/components/SingleEditorView.tsx` | Общая оболочка BlockNote, контроллеры форматирования Tolaria и suggestion-меню. |
| `src/components/editorSchema.tsx` | Определение кастомного типа inline content для wikilink. |
| `src/components/tolariaEditorFormatting.tsx` | Markdown-безопасная поверхность toolbar форматирования для BlockNote. |
| `src/components/tolariaEditorFormattingConfig.ts` | Фильтрует команды toolbar и slash-меню до markdown-roundtrippable действий. |
| `src/utils/wikilinks.ts` | Pipeline препроцессинга wikilink (markdown ↔ BlockNote). |
| `src/components/RawEditorView.tsx` | Raw markdown-редактор на CodeMirror 6. |

### AI

| Файл | Почему важен |
|------|---------------|
| `src/components/AiPanel.tsx` | Панель AI-агента — выбранный CLI-агент с выполнением инструментов, рассуждениями и действиями. |
| `src/hooks/useCliAiAgent.ts` | Состояние агента: messages, streaming, отслеживание инструментов, детекция файлов. |
| `src/lib/aiAgents.ts` | Определения поддерживаемых агентов, нормализация статуса и хелперы дефолтного агента. |
| `src/utils/ai-context.ts` | Сборщик снимка контекста для AI-разговоров. |

### Стилизация

| Файл | Почему важен |
|------|---------------|
| `src/index.css` | Семантические CSS custom properties для светлой/тёмной тем, принадлежащих приложению. |
| `src/theme.json` | Editor-specific тема типографики (шрифты, заголовки, списки, кодовые блоки). |

### Settings & Config

| Файл | Почему важен |
|------|---------------|
| `src/hooks/useSettings.ts` | Настройки приложения (telemetry, release channel, theme mode, интервал auto-sync, дефолтный AI-агент). |
| `src/lib/releaseChannel.ts` | Нормализует сохранённые значения канала updater'а (`stable` по умолчанию, опциональный `alpha`). |
| `src/lib/appUpdater.ts` | Frontend-обёртка для channel-aware команд updater'а. |
| `src/hooks/useMainWindowSizeConstraints.ts` | Выводит минимальную ширину главного окна из видимых панелей и просит Tauri вырасти, чтобы вместить более широкие layout'ы. |
| `src/hooks/useVaultConfig.ts` | Per-vault локальные UI-предпочтения (zoom, view mode, цвета, колонки Inbox, explicit organization workflow). |
| `src/components/SettingsPanel.tsx` | UI настроек для telemetry, release channel, интервала sync, дефолтного AI-агента и vault-level тумблера explicit organization. |
| `src/hooks/useUpdater.ts` | In-app обновления через выбранный alpha/stable feed. |

## Архитектурные паттерны

### Tauri/Mock Branching

Каждая операция выборки данных проверяет `isTauri()` и ветвится:

```typescript
if (isTauri()) {
  result = await invoke<T>('command', { args })
} else {
  result = await mockInvoke<T>('command', { args })
}
```

Это живёт в `useVaultLoader.ts` и `useNoteActions.ts`. Компоненты никогда не вызывают Tauri напрямую.

### Props-Down, Callbacks-Up

Никакого глобального state-management (ни Redux, ни Context). `App.tsx` владеет состоянием и передаёт его вниз как props. Связь child-to-parent через callback-props (`onSelectNote` и т. д.).

### Discriminated Unions для состояния выбора

```typescript
type SidebarSelection =
  | { kind: 'filter'; filter: SidebarFilter }
  | { kind: 'sectionGroup'; type: string }
  | { kind: 'folder'; path: string }
  | { kind: 'entity'; entry: VaultEntry }
  | { kind: 'view'; filename: string }
```

### Реестр команд

`useCommandRegistry` + `useAppCommands` строят централизованный реестр команд. Команды регистрируются с лейблами, шорткатами и хендлерами. `CommandPalette` (Cmd+K) делает fuzzy-search по этому реестру. Шорткаты живут в `appCommandCatalog.ts`; реальные нажатия всегда идут через `useAppKeyboard`, нативные клики меню эмитят те же ID команд через `useMenuEvents`, а `appCommandDispatcher.ts` подавляет дублирующий native/renderer echo от одного шортката. На macOS любой browser-reserved chord, который WKWebView съедает до этого пути, должен быть также добавлен в узкую регистрацию `tauri-plugin-prevent-default` в `src-tauri/src/lib.rs`. На Linux `LinuxTitlebar.tsx` и `LinuxMenuButton.tsx` переиспользуют те же ID команд через `trigger_menu_command`, потому что нативная GTK menu bar намеренно не монтируется. Тот же манифест шорткатов также объявляет детерминированный QA-режим для каждой команды, поддерживающей шорткаты.

Команды, чья доступность зависит от текущей заметки или git-состояния, должны также проходить через `update_menu_state`, чтобы нативное меню оставалось синхронизированным с командной палитрой. Действие восстановления удалённой заметки в виде Changes — это reference-пример: строка открывает удалённый diff-preview, командная палитра экспонирует "Restore Deleted Note", а меню Note включает то же действие только пока этот preview активен.

Для автоматизированного QA шорткатов используйте явный путь доказательства из `appCommandCatalog.ts`:

- `window.__laputaTest.triggerShortcutCommand()` для детерминированного покрытия renderer shortcut-event
- `window.__laputaTest.triggerMenuCommand()` для детерминированного покрытия native menu-command

Этот browser-харнес — детерминированный мост desktop-команд, а не реальное QA нативных акселераторов. Для browser-reserved chord'ов macOS всё ещё выполняйте нативное QA в реальном Tauri-приложении, потому что webview-init слой prevent-default активен только там. Не считайте flaky синтезированные macOS-нажатия доказательством работы шортката, пока не подтвердите видимое поведение приложения.

## Запуск тестов

```bash
# Unit tests (fast, no browser)
pnpm test

# Unit tests with coverage (must pass ≥70%)
pnpm test:coverage

# Rust tests
cargo test

# Rust coverage (must pass ≥85% line coverage)
cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85

# Playwright core smoke lane (requires dev server)
BASE_URL="http://localhost:5173" pnpm playwright:smoke

# Full Playwright regression suite
BASE_URL="http://localhost:5173" pnpm playwright:regression

# Single Playwright test
BASE_URL="http://localhost:5173" npx playwright test tests/smoke/<slug>.spec.ts
```

## Типичные задачи

### Добавить новую Tauri-команду

1. Напишите Rust-функцию в подходящем модуле (`vault/`, `git/` и т. д.)
2. Добавьте хендлер команды в `commands/`
3. Зарегистрируйте её в макросе `generate_handler![]` в `lib.rs`
4. Вызовите её из фронтенда через `invoke()` в подходящем хуке
5. Добавьте mock-хендлер в `mock-tauri.ts`

### Добавить новый компонент

1. Создайте `src/components/MyComponent.tsx`
2. Если нужны данные vault, получайте их как props от родителя
3. Подключите его в `App.tsx` или соответствующий родительский компонент
4. Добавьте тестовый файл `src/components/MyComponent.test.tsx`

### Добавить новый тип сущности

1. Создайте type-документ: `type/mytype.md` с frontmatter `type: Type` (icon, color, order и т. д.)
2. Группы секций сайдбара авто-генерируются из type-документов — изменения кода не требуются, если `visible: true`
3. Обновите опции типа в `CreateNoteDialog.tsx`, если пользователи должны иметь возможность создавать его из диалога
4. Заметки этого типа создаются в корне vault с `type: MyType` во frontmatter — отдельная папка не нужна

### Добавить запись в командную палитру

1. Зарегистрируйте команду в `useAppCommands.ts` через реестр команд
2. Добавьте соответствующий пункт меню в `menu.rs` для discoverability
3. Если у неё клавиатурный шорткат, зарегистрируйте его в `appCommandCatalog.ts` с каноническим ID команды, правилом модификатора и детерминированным QA-режимом, затем подключите соответствующий нативный пункт меню в `menu.rs`, если он также должен появиться в menu bar
4. Если её состояние enabled зависит от runtime-выбора (активная заметка, deleted preview, git-статус и т. д.), пробросьте этот флаг через `useMenuEvents.ts` и `update_menu_state`, чтобы нативное меню корректно включало/отключало

### Изменить стилизацию

1. **Глобальные app/theme переменные**: редактируйте `src/index.css`
2. **Типографика редактора**: редактируйте `src/theme.json`

### Работа с AI-агентом

1. **System-prompt агента**: редактируйте `src/utils/ai-agent.ts` (inline system-prompt-строка)
2. **Сборка контекста**: редактируйте `src/utils/ai-context.ts` для того, какие данные отправляются агенту
3. **Отображение действий инструмента**: редактируйте `src/components/AiActionCard.tsx`
4. **Аргументы Claude CLI**: редактируйте `src-tauri/src/claude_cli.rs` (`run_agent_stream()`)
5. **Общие адаптеры агентов / аргументы Codex**: редактируйте `src-tauri/src/ai_agents.rs` (держите Codex на нормальном пути approval/sandbox, если только намеренно не проектируете advanced-режим)
