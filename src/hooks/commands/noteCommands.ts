import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import i18n from '../../i18n'
import type { CommandAction } from './types'

const t = (key: string) => i18n.t(key)

interface NoteCommandsConfig {
  hasActiveNote: boolean
  activeTabPath: string | null
  isArchived: boolean
  activeNoteHasIcon?: boolean
  onCreateNote: () => void
  onCreateType?: () => void
  onSave: () => void
  onDeleteNote: (path: string) => void
  onArchiveNote: (path: string) => void
  onUnarchiveNote: (path: string) => void
  onChangeNoteType?: () => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  onSetNoteIcon?: () => void
  onRemoveNoteIcon?: () => void
  onOpenInNewWindow?: () => void
  onToggleFavorite?: (path: string) => void
  isFavorite?: boolean
  onToggleOrganized?: (path: string) => void
  isOrganized?: boolean
  onRestoreDeletedNote?: () => void
  canRestoreDeletedNote?: boolean
}

interface NoteCommandConfig {
  id: string
  label: string
  keywords: string[]
  enabled: boolean
  execute?: () => void
  shortcut?: string
  path?: string | null
  run?: (path: string) => void
}

function createNoteCommand(config: NoteCommandConfig): CommandAction {
  return {
    id: config.id,
    label: config.label,
    group: 'Note',
    shortcut: config.shortcut,
    keywords: config.keywords,
    enabled: config.enabled,
    execute: () => {
      if (config.path && config.run) {
        config.run(config.path)
        return
      }
      config.execute?.()
    },
  }
}

function buildCoreNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'create-note',
      label: t('commands.note.newNote'),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileNewNote),
      keywords: ['new', 'create', 'add'],
      enabled: true,
      execute: config.onCreateNote,
    }),
    createNoteCommand({
      id: 'create-type',
      label: t('commands.note.newType'),
      keywords: ['new', 'create', 'type', 'template'],
      enabled: !!config.onCreateType,
      execute: () => config.onCreateType?.(),
    }),
    createNoteCommand({
      id: 'save-note',
      label: t('commands.note.saveNote'),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileSave),
      keywords: ['write'],
      enabled: config.hasActiveNote,
      execute: config.onSave,
    }),
  ]
}

function buildPathNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildDestructiveNoteCommands(config),
    ...buildPinnedNoteCommands(config),
  ]
}

function buildDestructiveNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'delete-note',
      label: t('commands.note.deleteNote'),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteDelete),
      keywords: ['delete', 'remove'],
      enabled: config.hasActiveNote,
      path: config.activeTabPath,
      run: config.onDeleteNote,
    }),
    createNoteCommand({
      id: 'archive-note',
      label: config.isArchived ? t('commands.note.unarchiveNote') : t('commands.note.archiveNote'),
      keywords: ['archive'],
      enabled: config.hasActiveNote,
      path: config.activeTabPath,
      run: config.isArchived ? config.onUnarchiveNote : config.onArchiveNote,
    }),
  ]
}

function buildPinnedNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'toggle-favorite',
      label: config.isFavorite ? t('commands.note.removeFromFavorites') : t('commands.note.addToFavorites'),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteToggleFavorite),
      keywords: ['favorite', 'star', 'bookmark', 'pin'],
      enabled: config.hasActiveNote && !!config.onToggleFavorite,
      path: config.activeTabPath,
      run: (path) => config.onToggleFavorite?.(path),
    }),
    createNoteCommand({
      id: 'toggle-organized',
      label: config.isOrganized ? t('commands.note.markAsUnorganized') : t('commands.note.markAsOrganized'),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteToggleOrganized),
      keywords: ['organized', 'inbox', 'triage', 'done'],
      enabled: config.hasActiveNote && !!config.onToggleOrganized,
      path: config.activeTabPath,
      run: (path) => config.onToggleOrganized?.(path),
    }),
  ]
}

function buildOptionalNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildRecoveryCommands(config),
    ...buildRetargetingCommands(config),
    ...buildPresentationCommands(config),
  ]
}

function buildRecoveryCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'restore-deleted-note',
      label: t('commands.note.restoreDeleted'),
      keywords: ['restore', 'deleted', 'undelete', 'git', 'checkout'],
      enabled: !!config.canRestoreDeletedNote && !!config.onRestoreDeletedNote,
      execute: () => config.onRestoreDeletedNote?.(),
    }),
  ]
}

function buildRetargetingCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'set-note-icon',
      label: t('commands.note.setNoteIcon'),
      keywords: ['icon', 'emoji', 'set', 'add', 'change', 'picker'],
      enabled: config.hasActiveNote && !!config.onSetNoteIcon,
      execute: () => config.onSetNoteIcon?.(),
    }),
    createNoteCommand({
      id: 'change-note-type',
      label: t('commands.note.changeNoteType'),
      keywords: ['type', 'change', 'retarget', 'section', 'move'],
      enabled: config.hasActiveNote && !!config.onChangeNoteType,
      execute: () => config.onChangeNoteType?.(),
    }),
    createNoteCommand({
      id: 'move-note-to-folder',
      label: t('commands.note.moveToFolder'),
      keywords: ['folder', 'move', 'retarget', 'organize'],
      enabled: config.hasActiveNote && !!config.onMoveNoteToFolder && !!config.canMoveNoteToFolder,
      execute: () => config.onMoveNoteToFolder?.(),
    }),
  ]
}

function buildPresentationCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'remove-note-icon',
      label: t('commands.note.removeNoteIcon'),
      keywords: ['icon', 'emoji', 'remove', 'delete', 'clear'],
      enabled: config.hasActiveNote && !!config.activeNoteHasIcon && !!config.onRemoveNoteIcon,
      execute: () => config.onRemoveNoteIcon?.(),
    }),
    createNoteCommand({
      id: 'open-in-new-window',
      label: t('commands.note.openInNewWindow'),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteOpenInNewWindow),
      keywords: ['window', 'new', 'detach', 'pop', 'external', 'separate'],
      enabled: config.hasActiveNote,
      execute: () => config.onOpenInNewWindow?.(),
    }),
  ]
}

export function buildNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildCoreNoteCommands(config),
    ...buildPathNoteCommands(config),
    ...buildOptionalNoteCommands(config),
  ]
}
