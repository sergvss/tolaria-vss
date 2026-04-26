import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import i18n from '../../i18n'
import type { CommandAction } from './types'
import type { ViewMode } from '../useViewMode'
import { requestNewAiChat } from '../../utils/aiPromptBridge'

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string

interface ViewCommandsConfig {
  hasActiveNote: boolean
  activeNoteModified: boolean
  onSetViewMode: (mode: ViewMode) => void
  onToggleInspector: () => void
  onToggleDiff?: () => void
  onToggleRawEditor?: () => void
  onToggleAIChat?: () => void
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onCustomizeNoteListColumns?: () => void
  canCustomizeNoteListColumns?: boolean
  noteListColumnsLabel: string
}

export function buildViewCommands(config: ViewCommandsConfig): CommandAction[] {
  const {
    hasActiveNote, activeNoteModified,
    onSetViewMode, onToggleInspector, onToggleDiff, onToggleRawEditor, onToggleAIChat,
    zoomLevel, onZoomIn, onZoomOut, onZoomReset,
    onCustomizeNoteListColumns, canCustomizeNoteListColumns, noteListColumnsLabel,
  } = config

  return [
    { id: 'view-editor', label: t('commands.view.editorOnly'), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewEditorOnly), keywords: ['layout', 'focus'], enabled: true, execute: () => onSetViewMode('editor-only') },
    { id: 'view-editor-list', label: t('commands.view.editorList'), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewEditorList), keywords: ['layout'], enabled: true, execute: () => onSetViewMode('editor-list') },
    { id: 'view-all', label: t('commands.view.fullLayout'), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewAll), keywords: ['layout', 'sidebar'], enabled: true, execute: () => onSetViewMode('all') },
    { id: 'toggle-inspector', label: t('commands.view.toggleProperties'), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewToggleProperties), keywords: ['properties', 'inspector', 'panel', 'right', 'sidebar'], enabled: true, execute: onToggleInspector },
    { id: 'toggle-diff', label: t('commands.view.toggleDiff'), group: 'View', keywords: ['diff', 'changes', 'git', 'compare', 'version'], enabled: hasActiveNote && activeNoteModified, execute: () => onToggleDiff?.() },
    { id: 'toggle-raw-editor', label: t('commands.view.toggleRawEditor'), group: 'View', keywords: ['raw', 'source', 'markdown', 'frontmatter', 'code', 'textarea'], enabled: hasActiveNote && !!onToggleRawEditor, execute: () => onToggleRawEditor?.() },
    { id: 'toggle-ai-panel', label: t('commands.view.toggleAiPanel'), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewToggleAiChat), keywords: ['ai', 'agent', 'chat', 'assistant', 'contextual'], enabled: true, execute: () => onToggleAIChat?.() },
    { id: 'new-ai-chat', label: t('commands.view.newAiChat'), group: 'View', keywords: ['ai', 'agent', 'chat', 'assistant', 'new', 'fresh', 'conversation', 'reset'], enabled: true, execute: requestNewAiChat },
    { id: 'toggle-backlinks', label: t('commands.view.toggleBacklinks'), group: 'View', keywords: ['backlinks', 'references', 'links', 'mentions', 'incoming'], enabled: hasActiveNote, execute: onToggleInspector },
    { id: 'customize-note-list-columns', label: noteListColumnsLabel, group: 'View', keywords: ['all notes', 'inbox', 'columns', 'chips', 'properties', 'note list'], enabled: !!(canCustomizeNoteListColumns && onCustomizeNoteListColumns), execute: () => onCustomizeNoteListColumns?.() },
    { id: 'zoom-in', label: t('commands.view.zoomIn', { zoom: zoomLevel }), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewZoomIn), keywords: ['zoom', 'bigger', 'larger', 'scale'], enabled: zoomLevel < 150, execute: onZoomIn },
    { id: 'zoom-out', label: t('commands.view.zoomOut', { zoom: zoomLevel }), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewZoomOut), keywords: ['zoom', 'smaller', 'scale'], enabled: zoomLevel > 80, execute: onZoomOut },
    { id: 'zoom-reset', label: t('commands.view.zoomReset'), group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewZoomReset), keywords: ['zoom', 'actual', 'default', '100'], enabled: zoomLevel !== 100, execute: onZoomReset },
  ]
}
