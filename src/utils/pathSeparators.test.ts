import { describe, expect, it } from 'vitest'

import { getBasename, getStem, splitPath } from './pathSeparators'

describe('pathSeparators', () => {
  describe('splitPath', () => {
    it('splits Unix-style paths', () => {
      expect(splitPath('a/b/c')).toEqual(['a', 'b', 'c'])
    })

    it('splits Windows-style paths', () => {
      expect(splitPath('a\\b\\c')).toEqual(['a', 'b', 'c'])
    })

    it('splits mixed separators', () => {
      expect(splitPath('a/b\\c/d')).toEqual(['a', 'b', 'c', 'd'])
    })

    it('keeps empty leading segment for absolute Unix paths', () => {
      expect(splitPath('/a/b')).toEqual(['', 'a', 'b'])
    })

    it('handles a single segment', () => {
      expect(splitPath('note.md')).toEqual(['note.md'])
    })

    it('handles an empty string', () => {
      expect(splitPath('')).toEqual([''])
    })
  })

  describe('getBasename', () => {
    it('returns the last segment of a Unix path', () => {
      expect(getBasename('/Users/me/notes/note.md')).toBe('note.md')
    })

    it('returns the last segment of a Windows path', () => {
      expect(getBasename('C:\\Users\\me\\notes\\note.md')).toBe('note.md')
    })

    it('returns the last segment with mixed separators', () => {
      expect(getBasename('C:\\Users/me\\notes/note.md')).toBe('note.md')
    })

    it('returns the original string when there is no separator', () => {
      expect(getBasename('note.md')).toBe('note.md')
    })

    it('skips trailing empty segments from a trailing separator', () => {
      expect(getBasename('/a/b/')).toBe('b')
      expect(getBasename('a\\b\\')).toBe('b')
    })

    it('returns the original input for an empty string', () => {
      expect(getBasename('')).toBe('')
    })
  })

  describe('getStem', () => {
    it('strips the .md extension from a Unix path', () => {
      expect(getStem('/Users/me/notes/note.md')).toBe('note')
    })

    it('strips the .md extension from a Windows path', () => {
      expect(getStem('C:\\Users\\me\\notes\\note.md')).toBe('note')
    })

    it('returns the basename unchanged when there is no .md extension', () => {
      expect(getStem('/Users/me/folder')).toBe('folder')
    })

    it('handles untitled-style stems', () => {
      expect(getStem('C:\\vault\\untitled-note-1.md')).toBe('untitled-note-1')
    })

    it('handles a bare filename', () => {
      expect(getStem('note.md')).toBe('note')
    })
  })
})
