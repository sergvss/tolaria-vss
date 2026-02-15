import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { livePreview } from './livePreview'
import { frontmatterHide, findFrontmatter } from './frontmatterHide'
import { wikilinks } from './wikilinks'
import type { VaultEntry } from '../types'
import './Editor.css'

interface Tab {
  entry: VaultEntry
  content: string
}

interface EditorProps {
  tabs: Tab[]
  activeTabPath: string | null
  onSwitchTab: (path: string) => void
  onCloseTab: (path: string) => void
  onNavigateWikilink: (target: string) => void
  onLoadDiff?: (path: string) => Promise<string>
  isModified?: (path: string) => boolean
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  },
  '.cm-scroller': {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    padding: '20px 0',
    lineHeight: '1.7',
  },
  '.cm-content': {
    padding: '0 40px',
    maxWidth: '760px',
    caretColor: 'var(--text-primary)',
  },
  '.cm-line': {
    paddingTop: '1px',
    paddingBottom: '1px',
  },
  '.cm-gutters': {
    background: 'var(--bg-primary)',
    border: 'none',
    color: 'var(--text-faint)',
  },
  '.cm-activeLineGutter': {
    background: 'var(--bg-hover-subtle)',
  },
  '.cm-activeLine': {
    background: 'rgba(128, 128, 128, 0.06)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--text-primary)',
    borderLeftWidth: '1.5px',
  },
  '.cm-selectionBackground': {
    background: 'var(--bg-selected) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    background: 'var(--bg-selected) !important',
  },
})

function DiffView({ diff }: { diff: string }) {
  if (!diff) {
    return (
      <div className="diff-view__empty">
        No changes to display
      </div>
    )
  }

  const lines = diff.split('\n')

  return (
    <div className="diff-view">
      {lines.map((line, i) => {
        let className = 'diff-view__line diff-view__line--context'
        if (line.startsWith('+') && !line.startsWith('+++')) {
          className = 'diff-view__line diff-view__line--added'
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          className = 'diff-view__line diff-view__line--removed'
        } else if (line.startsWith('@@')) {
          className = 'diff-view__line diff-view__line--hunk'
        } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++') || line.startsWith('new file')) {
          className = 'diff-view__line diff-view__line--header'
        }

        return (
          <div key={i} className={className}>
            <span className="diff-view__line-number">{i + 1}</span>
            <span className="diff-view__line-content">{line || '\u00A0'}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Editor({ tabs, activeTabPath, onSwitchTab, onCloseTab, onNavigateWikilink, onLoadDiff, isModified }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const navigateRef = useRef(onNavigateWikilink)
  navigateRef.current = onNavigateWikilink

  const [diffMode, setDiffMode] = useState(false)
  const [diffContent, setDiffContent] = useState<string | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  const activeTab = tabs.find((t) => t.entry.path === activeTabPath) ?? null
  const showDiffToggle = activeTab && isModified?.(activeTab.entry.path)

  // Reset diff mode when switching tabs
  useEffect(() => {
    setDiffMode(false)
    setDiffContent(null)
  }, [activeTabPath])

  const handleToggleDiff = useCallback(async () => {
    if (diffMode) {
      setDiffMode(false)
      setDiffContent(null)
      return
    }
    if (!activeTabPath || !onLoadDiff) return
    setDiffLoading(true)
    try {
      const diff = await onLoadDiff(activeTabPath)
      setDiffContent(diff)
      setDiffMode(true)
    } catch (err) {
      console.warn('Failed to load diff:', err)
    } finally {
      setDiffLoading(false)
    }
  }, [diffMode, activeTabPath, onLoadDiff])

  // Create/destroy editor view when active tab changes
  useEffect(() => {
    if (!containerRef.current || !activeTab || diffMode) return

    // If view already exists for this tab, skip
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    // Place cursor after frontmatter so it starts hidden
    const fmRange = findFrontmatter(activeTab.content)
    const initialCursor = fmRange ? fmRange[1] : 0

    const state = EditorState.create({
      doc: activeTab.content,
      selection: { anchor: initialCursor },
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        editorTheme,
        livePreview(),
        frontmatterHide(),
        wikilinks((target) => navigateRef.current(target)),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabPath, activeTab?.content, diffMode])

  if (tabs.length === 0) {
    return (
      <div className="editor">
        <div className="editor__drag-strip" data-tauri-drag-region />
        <div className="editor__placeholder">
          <p>Select a note to start editing</p>
          <span className="editor__placeholder-hint">Cmd+P to search &middot; Cmd+N to create</span>
        </div>
      </div>
    )
  }

  return (
    <div className="editor">
      <div className="editor__tab-bar" data-tauri-drag-region>
        {tabs.map((tab) => (
          <div
            key={tab.entry.path}
            className={`editor__tab${tab.entry.path === activeTabPath ? ' editor__tab--active' : ''}`}
            onClick={() => onSwitchTab(tab.entry.path)}
          >
            <span className="editor__tab-title">{tab.entry.title}</span>
            <button
              className="editor__tab-close"
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.entry.path)
              }}
            >
              ×
            </button>
          </div>
        ))}
        {showDiffToggle && (
          <div className="editor__tab-bar-actions">
            <button
              className={`editor__diff-toggle${diffMode ? ' editor__diff-toggle--active' : ''}`}
              onClick={handleToggleDiff}
              disabled={diffLoading}
              title={diffMode ? 'Switch to Edit view' : 'Show diff'}
            >
              {diffLoading ? '...' : diffMode ? 'Edit' : 'Diff'}
            </button>
          </div>
        )}
      </div>
      {diffMode ? (
        <div className="editor__diff-container">
          <DiffView diff={diffContent ?? ''} />
        </div>
      ) : (
        <div className="editor__cm-container" ref={containerRef} />
      )}
    </div>
  )
}
