import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const BUILT_IN_TYPES = [
  'Note',
  'Project',
  'Experiment',
  'Responsibility',
  'Procedure',
  'Person',
  'Event',
  'Topic',
] as const

export type NoteType = (typeof BUILT_IN_TYPES)[number]

interface CreateNoteDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (title: string, type: string) => void
  defaultType?: string
  /** Custom types from the vault (Type documents not in built-in list) */
  customTypes?: string[]
}

export function CreateNoteDialog({ open, onClose, onCreate, defaultType, customTypes = [] }: CreateNoteDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>('Note')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on dialog open
      setTitle(''); setType(defaultType ?? 'Note')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate(trimmed, type)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('createNote.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('createNote.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('createNote.labelTitle')}
            </label>
            <Input
              ref={inputRef}
              placeholder={t('createNote.placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('createNote.labelType')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BUILT_IN_TYPES.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={type === option ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "rounded-full text-xs",
                    type === option && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setType(option)}
                >
                  {option}
                </Button>
              ))}
              {customTypes.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={type === option ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "rounded-full text-xs",
                    type === option
                      ? "bg-[var(--accent-blue)] text-primary-foreground"
                      : "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  )}
                  onClick={() => setType(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {t('actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
