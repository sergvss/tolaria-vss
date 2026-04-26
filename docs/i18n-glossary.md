# i18n Glossary - Translation Reference (Tolaria fork: sergvss/tolaria-vss)

This is the **source of truth** for all UI translations between English (default) and Russian (`ru`). Any new string added to the UI must follow these rules. When in doubt, follow the patterns established here, not invented translations.

> Aligned with the user on 2026-04-26 before extraction began. Update this file before adding terms not listed.

## Address & tone

- **Address user formally as "Вы"** (capitalized): "Вы можете...", "Введите ваш...", "Сохранить ваши изменения".
- **Buttons in infinitive form**: "Сохранить", "Отменить", "Удалить" (NOT "Сохрани", "Сохраняй").
- **Sentence case** for headings and labels: "Новая заметка" (NOT "Новая Заметка").
- **No em-dash (—)** in any UI text. Use a regular hyphen `-` instead. (Project rule from `CLAUDE.md`.)
- Error messages: polite, short, action-oriented. "Не удалось сохранить заметку. Попробуйте ещё раз."

## Date & time

- **Date format**: `DD.MM.YYYY` (e.g., `26.04.2026`)
- **Time format**: 24-hour (e.g., `14:30`)
- **Relative time**: "5 минут назад", "вчера", "час назад" - use Russian plural rules.

## Pluralization

- **Enabled** via `react-i18next` ICU plural rules (CLDR for `ru`).
- Russian has **3 forms**: `one` / `few` / `many`.
  - `1 заметка` (one)
  - `2 заметки` (few - 2,3,4)
  - `5 заметок` (many - 0,5-20)
  - `21 заметка` (one - ends in 1, but not 11)
- All counters MUST use `t('notesCount', { count })` with proper plural keys, never string concatenation.

## Keyboard shortcuts

- **Always Latin**: `Ctrl+N`, `Cmd+S`, `Shift+Enter`. Never transliterate to Cyrillic.
- Reason: physical keys are ANSI/Latin, Russian users learned shortcuts in Latin.

## Translation table

### Keep English (technical / brand / format names)

These appear identically in both `en.json` and `ru.json`. Translating them would harm clarity for developers.

| Term | Why kept English |
|---|---|
| **Tolaria** | App brand name |
| **Vault** | NO - translated as "Хранилище" (see general UI) |
| **Push, Pull, Commit, Merge, Branch, Stash, Rebase, Diff, Conflict, Resolve** | Git operations - developers know these in English |
| **Wikilink** | Format name (`[[link]]`) |
| **Frontmatter** | YAML metadata block - technical format |
| **Markdown, YAML** | File / format names |
| **MCP, Cargo, Rust, Node, pnpm** | Tool names |
| **Claude, Codex** | AI provider brand names |
| **Pre-commit, Pre-push** | Git hook names |
| **GitHub** | Brand name |

### Tolaria-specific UI terms (translate)

| English | Russian |
|---|---|
| Vault | Хранилище |
| Note | Заметка |
| Notes | Заметки |
| Folder | Папка |
| Editor | Редактор |
| Inspector | Инспектор |
| Pulse | Активность |
| Backlinks | Обратные ссылки |
| Outline | Структура |
| Property / Properties | Свойство / Свойства |
| Type (note type) | Тип |
| Tag | Тег |
| Hashtag | Хэштег |
| Title | Заголовок |
| Untitled | Без названия |

### General UI / common terms

| English | Russian |
|---|---|
| Settings | Настройки |
| Search | Поиск |
| Recent | Недавние |
| Pinned | Закреплённые |
| Welcome | Добро пожаловать |
| Save | Сохранить |
| Cancel | Отменить |
| Close | Закрыть |
| Delete | Удалить |
| Open | Открыть |
| Create | Создать |
| New Note | Новая заметка |
| Confirm | Подтвердить |
| Yes / No | Да / Нет |
| OK | OK |
| Loading... | Загрузка... |
| Saving... | Сохранение... |
| Saved | Сохранено |
| Unsaved changes | Несохранённые изменения |
| Error | Ошибка |
| Warning | Предупреждение |
| Theme | Тема |
| Light mode | Светлая тема |
| Dark mode | Тёмная тема |
| Sync | Синхронизация |
| Auto-save | Автосохранение |
| Sidebar | Боковая панель |
| Toolbar | Панель инструментов |
| Status bar | Строка состояния |
| Sync & Updates | Синхронизация и обновления |

### File menu items (translate)

| English | Russian |
|---|---|
| File | Файл |
| Edit | Правка |
| View | Вид |
| Window | Окно |
| Help | Справка |
| About | О программе |
| Preferences | Настройки |
| Quit | Выход |

### AI-related terms

| English | Russian |
|---|---|
| AI Agent | ИИ-агент |
| AI | ИИ |
| Chat | Чат |
| Prompt | Промпт |
| Streaming response | Потоковый ответ |
| Streaming | Потоковый |
| Conversation | Беседа |
| Send message | Отправить сообщение |
| New chat | Новый чат |
| Stop | Остановить |

### Empty states

| English | Russian |
|---|---|
| No notes | Нет заметок |
| No results | Ничего не найдено |
| No tags | Нет тегов |
| No backlinks | Нет обратных ссылок |
| List is empty | Список пуст |

### Confirmation dialogs

| English | Russian |
|---|---|
| Delete this note? | Удалить эту заметку? |
| Discard unsaved changes? | Отменить несохранённые изменения? |
| Are you sure? | Вы уверены? |
| This action cannot be undone. | Это действие нельзя отменить. |

## Style examples

### Buttons (infinitive)
- ✅ "Сохранить", "Отменить", "Удалить", "Создать заметку"
- ❌ "Сохрани", "Создание заметки", "Сохранение"

### Tooltips (clear, brief)
- ✅ "Закрыть настройки", "Создать новую заметку (Ctrl+N)"
- ❌ "Кликни сюда чтобы закрыть"

### Empty states
- ✅ "Нет заметок. Создайте первую заметку нажатием Ctrl+N."
- ❌ "Заметок нет здесь сейчас"

### Errors
- ✅ "Не удалось сохранить заметку. Проверьте свободное место на диске."
- ❌ "Save failed (auto-translated to: Сохранение провалено)"

## When adding new terms

1. **Check this file first** - the term may already have a canonical translation.
2. **If new**: add it to the appropriate table, agree with the maintainer, then commit the glossary update **in the same PR** as the translation.
3. **Never invent ad-hoc translations** in component code - the glossary is the source of truth, components reference keys.

## Open items / future considerations

- Onboarding flow strings - not yet translated, deferred to phase 2
- Error messages from Tauri backend - some come from Rust (`format!("Failed to ...")`); these need a separate pass
- Date-fns locale: import `ru` locale for `formatDistanceToNow` etc.
