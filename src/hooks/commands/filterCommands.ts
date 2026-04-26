import i18n from '../../i18n'
import type { CommandAction } from './types'
import type { NoteListFilter } from '../../utils/noteListHelpers'

const t = (key: string) => i18n.t(key)

interface FilterCommandsConfig {
  isSectionGroup: boolean
  noteListFilter?: NoteListFilter
  onSetNoteListFilter?: (filter: NoteListFilter) => void
}

export function buildFilterCommands(config: FilterCommandsConfig): CommandAction[] {
  const { isSectionGroup, noteListFilter, onSetNoteListFilter } = config
  return [
    { id: 'filter-open', label: t('commands.filter.showOpen'), group: 'Navigation', keywords: ['filter', 'open', 'active', 'pill'], enabled: !!isSectionGroup && noteListFilter !== 'open', execute: () => onSetNoteListFilter?.('open') },
    { id: 'filter-archived', label: t('commands.filter.showArchived'), group: 'Navigation', keywords: ['filter', 'archived', 'pill'], enabled: !!isSectionGroup && noteListFilter !== 'archived', execute: () => onSetNoteListFilter?.('archived') },
  ]
}
