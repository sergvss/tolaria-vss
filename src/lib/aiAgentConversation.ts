import type { Dispatch, SetStateAction } from 'react'
import type { AiAction } from '../components/AiMessage'
import { buildAgentSystemPrompt } from '../utils/ai-agent'
import {
  MAX_HISTORY_TOKENS,
  formatMessageWithHistory,
  nextMessageId,
  trimHistory,
  type ChatMessage,
} from '../utils/ai-chat'
import type { NoteReference } from '../utils/ai-context'
import type { AiAgentId } from './aiAgents'
import { getAiAgentDefinition } from './aiAgents'

export interface AiAgentMessage {
  userMessage: string
  references?: NoteReference[]
  reasoning?: string
  reasoningDone?: boolean
  actions: AiAction[]
  response?: string
  isStreaming?: boolean
  id?: string
}

export interface AgentExecutionContext {
  agent: AiAgentId
  ready: boolean
  vaultPath: string
  systemPromptOverride?: string
  /** Absolute path to the note the user has open. Prefixed onto every user
   *  message so Claude can't miss the focus, even if Claude Code's auto
   *  `git status` distracts it. */
  activeNotePath?: string
}

export interface PendingUserPrompt {
  text: string
  references?: NoteReference[]
}

function toChatHistory(messages: AiAgentMessage[]): ChatMessage[] {
  return messages.flatMap((message) => {
    const history: ChatMessage[] = [{ role: 'user', content: message.userMessage, id: message.id ?? '' }]
    if (message.response) {
      history.push({ role: 'assistant', content: message.response, id: `${message.id}-resp` })
    }
    return history
  })
}

export function createMissingAgentResponse(agent: AiAgentId): string {
  const definition = getAiAgentDefinition(agent)
  return `${definition.label} is not available on this machine. Install it or switch the default AI agent in Settings.`
}

export function appendLocalResponse(
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>,
  prompt: PendingUserPrompt,
  response: string,
): void {
  setMessages((current) => [
    ...current,
    {
      userMessage: prompt.text,
      references: prompt.references,
      actions: [],
      response,
      id: nextMessageId(),
    },
  ])
}

export function appendStreamingMessage(
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>,
  prompt: PendingUserPrompt,
): string {
  const messageId = nextMessageId()
  setMessages((current) => [
    ...current,
    {
      userMessage: prompt.text,
      references: prompt.references,
      actions: [],
      isStreaming: true,
      id: messageId,
    },
  ])
  return messageId
}

export function buildFormattedMessage(
  context: AgentExecutionContext,
  messages: AiAgentMessage[],
  prompt: PendingUserPrompt,
): { formattedMessage: string; systemPrompt: string } {
  const systemPrompt = context.systemPromptOverride ?? buildAgentSystemPrompt()
  const chatHistory = toChatHistory(messages.filter((message) => !message.isStreaming))
  const trimmedHistory = trimHistory(chatHistory, MAX_HISTORY_TOKENS)

  // Prepend the active note path so it lands in the freshest part of the
  // prompt — system prompts get cached and Claude weights recent user
  // turns more heavily, especially when its auto `git status` competes
  // for attention. Use a single-line separator (no `\n`) so Windows
  // `cmd.exe /C` fallback doesn't truncate the argument.
  const userText = context.activeNotePath
    ? `[active file: ${context.activeNotePath}] ${prompt.text}`
    : prompt.text

  return {
    formattedMessage: formatMessageWithHistory(trimmedHistory, userText),
    systemPrompt,
  }
}
