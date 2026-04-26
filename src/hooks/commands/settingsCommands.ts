import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import i18n from '../../i18n'
import type { CommandAction } from './types'
import { rememberFeedbackDialogOpener } from '../../lib/feedbackDialogOpener'
import { openExternalUrl } from '../../utils/url'

const UPSTREAM_RELEASES_URL = 'https://github.com/refactoringhq/tolaria/releases'

const t = (key: string) => i18n.t(key)

interface SettingsCommandsConfig {
  mcpStatus?: string
  vaultCount?: number
  isGettingStartedHidden?: boolean
  onOpenSettings: () => void
  onOpenFeedback?: () => void
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onRemoveActiveVault?: () => void
  onRestoreGettingStarted?: () => void
  onCheckForUpdates?: () => void
  onInstallMcp?: () => void
  onReloadVault?: () => void
  onRepairVault?: () => void
  onOpenAbout?: () => void
}

function buildPrimarySettingsCommands({
  onOpenSettings,
  onOpenFeedback,
  onCheckForUpdates,
}: Pick<SettingsCommandsConfig, 'onOpenSettings' | 'onOpenFeedback' | 'onCheckForUpdates'>): CommandAction[] {
  return [
    { id: 'open-settings', label: t('commands.settings.openSettings'), group: 'Settings', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.appSettings), keywords: ['preferences', 'config'], enabled: true, execute: onOpenSettings },
    {
      id: 'open-h1-auto-rename-setting',
      label: t('commands.settings.openH1AutoRename'),
      group: 'Settings',
      keywords: ['h1', 'title', 'filename', 'rename', 'auto', 'untitled', 'sync', 'preference'],
      enabled: true,
      execute: onOpenSettings,
    },
    {
      id: 'open-contribute',
      label: t('commands.settings.contribute'),
      group: 'Settings',
      keywords: ['contribute', 'feedback', 'feature', 'canny', 'discussion', 'github', 'bug', 'report'],
      enabled: !!onOpenFeedback,
      execute: () => {
        rememberFeedbackDialogOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null)
        onOpenFeedback?.()
      },
    },
    { id: 'check-updates', label: t('commands.settings.checkUpdates'), group: 'Settings', keywords: ['update', 'version', 'upgrade', 'release'], enabled: true, execute: () => onCheckForUpdates?.() },
    {
      id: 'check-upstream-releases',
      label: t('commands.settings.checkUpstreamReleases'),
      group: 'Settings',
      keywords: ['upstream', 'refactoringhq', 'tolaria', 'release', 'github', 'sync', 'merge'],
      enabled: true,
      execute: () => { void openExternalUrl(UPSTREAM_RELEASES_URL) },
    },
  ]
}

function buildAboutCommands({
  onOpenAbout,
}: Pick<SettingsCommandsConfig, 'onOpenAbout'>): CommandAction[] {
  return [
    {
      id: 'about-tolaria',
      label: t('commands.settings.aboutTolaria'),
      group: 'Settings',
      keywords: ['about', 'version', 'fork', 'sergvss', 'credits', 'license'],
      enabled: !!onOpenAbout,
      execute: () => onOpenAbout?.(),
    },
  ]
}

function buildVaultSettingsCommands({
  vaultCount,
  isGettingStartedHidden,
  onOpenVault,
  onCreateEmptyVault,
  onRemoveActiveVault,
  onRestoreGettingStarted,
}: Pick<SettingsCommandsConfig, 'vaultCount' | 'isGettingStartedHidden' | 'onOpenVault' | 'onCreateEmptyVault' | 'onRemoveActiveVault' | 'onRestoreGettingStarted'>): CommandAction[] {
  return [
    { id: 'create-empty-vault', label: t('commands.settings.createEmptyVault'), group: 'Settings', keywords: ['vault', 'create', 'new', 'empty', 'folder'], enabled: !!onCreateEmptyVault, execute: () => onCreateEmptyVault?.() },
    { id: 'open-vault', label: t('commands.settings.openVault'), group: 'Settings', keywords: ['vault', 'folder', 'switch', 'open', 'workspace'], enabled: true, execute: () => onOpenVault?.() },
    { id: 'remove-vault', label: t('commands.settings.removeVault'), group: 'Settings', keywords: ['vault', 'remove', 'disconnect', 'hide'], enabled: (vaultCount ?? 0) > 1 && !!onRemoveActiveVault, execute: () => onRemoveActiveVault?.() },
    { id: 'restore-getting-started', label: t('commands.settings.restoreGettingStarted'), group: 'Settings', keywords: ['vault', 'restore', 'demo', 'getting started', 'reset'], enabled: !!isGettingStartedHidden && !!onRestoreGettingStarted, execute: () => onRestoreGettingStarted?.() },
  ]
}

function buildMaintenanceCommands({
  mcpStatus,
  onInstallMcp,
  onReloadVault,
  onRepairVault,
}: Pick<SettingsCommandsConfig, 'mcpStatus' | 'onInstallMcp' | 'onReloadVault' | 'onRepairVault'>): CommandAction[] {
  return [
    {
      id: 'install-mcp',
      label: mcpStatus === 'installed' ? t('commands.settings.manageMcp') : t('commands.settings.setupMcp'),
      group: 'Settings',
      keywords: ['mcp', 'ai', 'tools', 'external', 'setup', 'connect', 'disconnect', 'claude', 'codex', 'cursor', 'consent'],
      enabled: true,
      execute: () => onInstallMcp?.(),
    },
    { id: 'reload-vault', label: t('commands.settings.reloadVault'), group: 'Settings', keywords: ['reload', 'refresh', 'rescan', 'sync', 'filesystem', 'cache'], enabled: !!onReloadVault, execute: () => onReloadVault?.() },
    { id: 'repair-vault', label: t('commands.settings.repairVault'), group: 'Settings', keywords: ['repair', 'fix', 'restore', 'config', 'agents', 'themes', 'missing', 'reset', 'flatten', 'structure'], enabled: !!onRepairVault, execute: () => onRepairVault?.() },
  ]
}

export function buildSettingsCommands(config: SettingsCommandsConfig): CommandAction[] {
  const {
    mcpStatus, vaultCount, isGettingStartedHidden,
    onOpenSettings, onOpenFeedback, onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onCheckForUpdates, onInstallMcp, onReloadVault, onRepairVault, onOpenAbout,
  } = config

  return [
    ...buildPrimarySettingsCommands({ onOpenSettings, onOpenFeedback, onCheckForUpdates }),
    ...buildVaultSettingsCommands({
      vaultCount,
      isGettingStartedHidden,
      onOpenVault,
      onCreateEmptyVault,
      onRemoveActiveVault,
      onRestoreGettingStarted,
    }),
    ...buildMaintenanceCommands({ mcpStatus, onInstallMcp, onReloadVault, onRepairVault }),
    ...buildAboutCommands({ onOpenAbout }),
  ]
}
