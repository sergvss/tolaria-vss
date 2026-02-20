#!/usr/bin/env node
/**
 * WebSocket bridge for Laputa MCP tools.
 *
 * Exposes vault operations over WebSocket so the Laputa app frontend
 * can invoke MCP tools in real-time without going through stdio.
 *
 * Usage:
 *   VAULT_PATH=/path/to/vault WS_PORT=9710 node ws-bridge.js
 *
 * Protocol:
 *   Client sends:  { "id": "req-1", "tool": "search_notes", "args": { "query": "test" } }
 *   Server sends:  { "id": "req-1", "result": { ... } }
 *   On error:      { "id": "req-1", "error": "message" }
 */
import { WebSocketServer } from 'ws'
import { readNote, createNote, searchNotes, appendToNote } from './vault.js'

const VAULT_PATH = process.env.VAULT_PATH || process.env.HOME + '/Laputa'
const WS_PORT = parseInt(process.env.WS_PORT || '9710', 10)

const TOOL_HANDLERS = {
  open_note: (args) => readNote(VAULT_PATH, args.path).then(text => ({ content: text })),
  read_note: (args) => readNote(VAULT_PATH, args.path).then(text => ({ content: text })),
  create_note: (args) => createNote(VAULT_PATH, args.path, args.title, buildFrontmatter(args)),
  search_notes: (args) => searchNotes(VAULT_PATH, args.query, args.limit),
  append_to_note: (args) => appendToNote(VAULT_PATH, args.path, args.text).then(() => ({ ok: true })),
}

function buildFrontmatter(args) {
  const fm = {}
  if (args.is_a) fm.is_a = args.is_a
  return fm
}

async function handleMessage(data) {
  const msg = JSON.parse(data)
  const { id, tool, args } = msg

  const handler = TOOL_HANDLERS[tool]
  if (!handler) {
    return { id, error: `Unknown tool: ${tool}` }
  }

  try {
    const result = await handler(args || {})
    return { id, result }
  } catch (err) {
    return { id, error: err.message }
  }
}

export function startBridge(port = WS_PORT) {
  const wss = new WebSocketServer({ port })

  wss.on('connection', (ws) => {
    console.error(`[ws-bridge] Client connected (vault: ${VAULT_PATH})`)

    ws.on('message', async (raw) => {
      try {
        const response = await handleMessage(raw.toString())
        ws.send(JSON.stringify(response))
      } catch (err) {
        ws.send(JSON.stringify({ error: `Parse error: ${err.message}` }))
      }
    })

    ws.on('close', () => console.error('[ws-bridge] Client disconnected'))
  })

  console.error(`[ws-bridge] Listening on ws://localhost:${port}`)
  return wss
}

// Run directly if invoked as main module
const isMain = process.argv[1]?.endsWith('ws-bridge.js')
if (isMain) {
  startBridge()
}
