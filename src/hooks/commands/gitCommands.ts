import i18n from '../../i18n'
import type { CommandAction } from './types'
import type { SidebarSelection } from '../../types'

const t = (key: string) => i18n.t(key)

interface GitCommandsConfig {
  modifiedCount: number
  canAddRemote: boolean
  onAddRemote?: () => void
  onCommitPush: () => void
  onPull?: () => void
  onResolveConflicts?: () => void
  onSelect: (sel: SidebarSelection) => void
}

export function buildGitCommands(config: GitCommandsConfig): CommandAction[] {
  const { modifiedCount, canAddRemote, onAddRemote, onCommitPush, onPull, onResolveConflicts, onSelect } = config
  return [
    { id: 'commit-push', label: t('commands.git.commitPush'), group: 'Git', keywords: ['git', 'save', 'sync'], enabled: modifiedCount > 0, execute: onCommitPush },
    { id: 'add-remote', label: t('commands.git.addRemote'), group: 'Git', keywords: ['git', 'remote', 'connect', 'origin', 'no remote'], enabled: canAddRemote && !!onAddRemote, execute: () => onAddRemote?.() },
    { id: 'git-pull', label: t('commands.git.pull'), group: 'Git', keywords: ['git', 'pull', 'fetch', 'download', 'sync', 'remote'], enabled: true, execute: () => onPull?.() },
    { id: 'resolve-conflicts', label: t('commands.git.resolveConflicts'), group: 'Git', keywords: ['conflict', 'merge', 'git', 'sync'], enabled: true, execute: () => onResolveConflicts?.() },
    { id: 'view-changes', label: t('commands.git.viewChanges'), group: 'Git', keywords: ['modified', 'diff'], enabled: true, execute: () => onSelect({ kind: 'filter', filter: 'changes' }) },
  ]
}
