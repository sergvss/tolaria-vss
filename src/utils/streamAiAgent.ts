import { isTauri } from '../mock-tauri'
import { getAiAgentDefinition, type AiAgentId } from '../lib/aiAgents'

type AiAgentStreamEvent =
  | { kind: 'Init'; session_id: string }
  | { kind: 'TextDelta'; text: string }
  | { kind: 'ThinkingDelta'; text: string }
  | { kind: 'ToolStart'; tool_name: string; tool_id: string; input?: string }
  | { kind: 'ToolDone'; tool_id: string; output?: string }
  | { kind: 'Error'; message: string }
  | { kind: 'Done' }

export interface AgentStreamCallbacks {
  onText: (text: string) => void
  onThinking: (text: string) => void
  onToolStart: (toolName: string, toolId: string, input?: string) => void
  onToolDone: (toolId: string, output?: string) => void
  onError: (message: string) => void
  onDone: () => void
}

export interface StreamAiAgentRequest {
  agent: AiAgentId
  message: string
  systemPrompt?: string
  vaultPath: string
  callbacks: AgentStreamCallbacks
}

function mockAgentResponse(agent: AiAgentId, message: string): string {
  const agentLabel = getAiAgentDefinition(agent).label
  if (message.includes('Earlier in this conversation:')) {
    const turns = (message.match(/I asked: /g) ?? []).length + 1
    const tail = message.split('Now I am asking: ').pop()?.trim() ?? ''
    return `[mock-${agentLabel.toLowerCase()} turns=${turns}] You asked: "${tail}" — This note is related to [[Build Laputa App]] and [[Matteo Cellini]].`
  }
  return `[mock-${agentLabel.toLowerCase()}] You said: "${message}" — This note is related to [[Build Laputa App]] and [[Matteo Cellini]].`
}

function handleStreamEvent(data: AiAgentStreamEvent, callbacks: AgentStreamCallbacks): void {
  switch (data.kind) {
    case 'TextDelta':
      callbacks.onText(data.text)
      return
    case 'ThinkingDelta':
      callbacks.onThinking(data.text)
      return
    case 'ToolStart':
      callbacks.onToolStart(data.tool_name, data.tool_id, data.input)
      return
    case 'ToolDone':
      callbacks.onToolDone(data.tool_id, data.output)
      return
    case 'Error':
      callbacks.onError(data.message)
      return
    case 'Done':
      callbacks.onDone()
      return
  }
}

export async function streamAiAgent(
  request: StreamAiAgentRequest,
): Promise<void> {
  const {
    agent,
    message,
    systemPrompt,
    vaultPath,
    callbacks,
  } = request

  if (!isTauri()) {
    setTimeout(() => {
      callbacks.onText(mockAgentResponse(agent, message))
      callbacks.onDone()
    }, 300)
    return
  }

  const { invoke } = await import('@tauri-apps/api/core')
  const { listen } = await import('@tauri-apps/api/event')
  let closed = false
  let unlisten: (() => void) | null = null

  const detach = (): void => {
    if (unlisten) {
      const fn = unlisten
      unlisten = null
      fn()
    }
  }

  const closeStream = (): void => {
    if (closed) return
    closed = true
    // Stop listening immediately so events from a NEXT request can't be
    // delivered to this stream's stale callbacks. Without this, two streams
    // overlap on the shared `'ai-agent-stream'` channel and the new request's
    // TextDeltas leak into the previous (already-closed) message — which the
    // user sees as "Claude Code finished without returning a reply" on the
    // current message.
    detach()
    callbacks.onDone()
  }

  unlisten = await listen<AiAgentStreamEvent>('ai-agent-stream', (event) => {
    if (closed) return
    if (event.payload.kind === 'Done') {
      closeStream()
      return
    }

    handleStreamEvent(event.payload, callbacks)
  })

  try {
    await invoke<string>('stream_ai_agent', {
      request: {
        agent,
        message,
        system_prompt: systemPrompt || null,
        vault_path: vaultPath,
      },
    })
    closeStream()
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err))
    closeStream()
  } finally {
    detach()
  }
}
