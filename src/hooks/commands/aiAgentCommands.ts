import {
  AI_AGENT_DEFINITIONS,
  isAiAgentInstalled,
  type AiAgentId,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import {
  isVaultAiGuidanceStatusChecking,
  vaultAiGuidanceNeedsRestore,
  type VaultAiGuidanceStatus,
} from '../../lib/vaultAiGuidance'
import i18n from '../../i18n'
import type { CommandAction } from './types'

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string

interface AiAgentCommandsConfig {
  aiAgentsStatus?: AiAgentsStatus
  vaultAiGuidanceStatus?: VaultAiGuidanceStatus
  selectedAiAgent?: AiAgentId
  selectedAiAgentLabel?: string
  onOpenAiAgents?: () => void
  onRestoreVaultAiGuidance?: () => void
  onCycleDefaultAiAgent?: () => void
  onSetDefaultAiAgent?: (agent: AiAgentId) => void
}

function explicitSwitchCommands({
  aiAgentsStatus,
  selectedAiAgent,
  onSetDefaultAiAgent,
}: Pick<AiAgentCommandsConfig, 'aiAgentsStatus' | 'selectedAiAgent' | 'onSetDefaultAiAgent'>): CommandAction[] {
  if (!aiAgentsStatus || !selectedAiAgent || !onSetDefaultAiAgent) return []

  return AI_AGENT_DEFINITIONS
    .filter((definition) => definition.id !== selectedAiAgent)
    .filter((definition) => isAiAgentInstalled(aiAgentsStatus, definition.id))
    .map((definition) => ({
      id: `switch-ai-agent-${definition.id}`,
      label: t('commands.aiAgent.switchTo', { name: definition.label }),
      group: 'Settings',
      keywords: ['ai', 'agent', 'default', 'switch', 'claude', 'codex', definition.shortLabel.toLowerCase()],
      enabled: true,
      execute: () => onSetDefaultAiAgent(definition.id),
    }))
}

function restoreGuidanceCommands({
  vaultAiGuidanceStatus,
  onRestoreVaultAiGuidance,
}: Pick<AiAgentCommandsConfig, 'vaultAiGuidanceStatus' | 'onRestoreVaultAiGuidance'>): CommandAction[] {
  if (!vaultAiGuidanceStatus || !onRestoreVaultAiGuidance) return []
  if (isVaultAiGuidanceStatusChecking(vaultAiGuidanceStatus)) return []
  if (!vaultAiGuidanceNeedsRestore(vaultAiGuidanceStatus)) return []

  return [
    {
      id: 'restore-vault-ai-guidance',
      label: t('commands.aiAgent.restoreGuidance'),
      group: 'Settings',
      keywords: ['ai', 'agent', 'guidance', 'restore', 'repair', 'claude', 'codex', 'agents'],
      enabled: true,
      execute: () => onRestoreVaultAiGuidance(),
    },
  ]
}

export function buildAiAgentCommands({
  aiAgentsStatus,
  vaultAiGuidanceStatus,
  selectedAiAgent,
  selectedAiAgentLabel,
  onOpenAiAgents,
  onRestoreVaultAiGuidance,
  onCycleDefaultAiAgent,
  onSetDefaultAiAgent,
}: AiAgentCommandsConfig): CommandAction[] {
  const commands: CommandAction[] = [
    {
      id: 'open-ai-agents',
      label: t('commands.aiAgent.openAiAgents'),
      group: 'Settings',
      keywords: ['ai', 'agent', 'agents', 'assistant', 'claude', 'codex', 'settings'],
      enabled: !!onOpenAiAgents,
      execute: () => onOpenAiAgents?.(),
    },
  ]

  commands.push(...restoreGuidanceCommands({
    vaultAiGuidanceStatus,
    onRestoreVaultAiGuidance,
  }))

  const switchCommands = explicitSwitchCommands({
    aiAgentsStatus,
    selectedAiAgent,
    onSetDefaultAiAgent,
  })
  if (aiAgentsStatus && selectedAiAgent) {
    return [...commands, ...switchCommands]
  }

  commands.push({
    id: 'switch-default-ai-agent',
    label: selectedAiAgentLabel
      ? t('commands.aiAgent.switchDefaultWith', { label: selectedAiAgentLabel })
      : t('commands.aiAgent.switchDefault'),
    group: 'Settings',
    keywords: ['ai', 'agent', 'default', 'switch', 'claude', 'codex'],
    enabled: !!onCycleDefaultAiAgent,
    execute: () => onCycleDefaultAiAgent?.(),
  })

  return commands
}
