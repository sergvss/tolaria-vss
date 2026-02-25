import { useState, useMemo, useCallback, useEffect } from 'react'
import type { VaultEntry } from '../types'
import { fuzzyMatch } from '../utils/fuzzyMatch'
import { getTypeColor } from '../utils/typeColors'
import type { NoteSearchResultItem } from '../components/NoteSearchList'

const DEFAULT_MAX_RESULTS = 20

export interface NoteSearchResult extends NoteSearchResultItem {
  entry: VaultEntry
}

function toResult(e: VaultEntry): NoteSearchResult {
  const noteType = e.isA && e.isA !== 'Note' ? e.isA : undefined
  return {
    entry: e,
    title: e.title,
    noteType,
    typeColor: noteType ? getTypeColor(e.isA) : undefined,
  }
}

export function useNoteSearch(entries: VaultEntry[], query: string, maxResults = DEFAULT_MAX_RESULTS) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results: NoteSearchResult[] = useMemo(() => {
    if (!query.trim()) {
      return [...entries]
        .sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0))
        .slice(0, maxResults)
        .map(toResult)
    }
    return entries
      .map((e) => ({ entry: e, ...fuzzyMatch(query, e.title) }))
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((r) => toResult(r.entry))
  }, [entries, query, maxResults])

  useEffect(() => {
    setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset on query change
  }, [query])

  const selectedEntry = results[selectedIndex]?.entry ?? null

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
    },
    [results.length],
  )

  return { results, selectedIndex, setSelectedIndex, selectedEntry, handleKeyDown }
}
