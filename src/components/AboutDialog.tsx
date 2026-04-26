import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useBuildNumber } from '../hooks/useBuildNumber'
import { openExternalUrl } from '../utils/url'

const APP_VERSION = (import.meta as ImportMeta & { env: { VITE_APP_VERSION?: string } }).env
  .VITE_APP_VERSION ?? '0.1.0'

const FORK_REPO_URL = 'https://github.com/sergvss/tolaria-vss'
const ORIGINAL_REPO_URL = 'https://github.com/refactoringhq/tolaria'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const { t } = useTranslation()
  const buildNumber = useBuildNumber()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t('about.title')}</DialogTitle>
          <DialogDescription>{t('about.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('about.versionLabel')}</span>
            <span className="font-mono">{APP_VERSION}</span>
          </div>
          {buildNumber && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('about.buildLabel')}</span>
              <span className="font-mono">{buildNumber}</span>
            </div>
          )}

          <div className="border-t border-border pt-3 space-y-2">
            <div>
              <p className="text-muted-foreground text-xs">{t('about.forkBy')}</p>
              <button
                type="button"
                onClick={() => { void openExternalUrl(FORK_REPO_URL) }}
                className="text-left text-primary hover:underline"
              >
                {t('about.forkRepo')}
              </button>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">{t('about.originalProject')} Luca Restagno</p>
              <button
                type="button"
                onClick={() => { void openExternalUrl(ORIGINAL_REPO_URL) }}
                className="text-left text-primary hover:underline"
              >
                {t('about.originalRepo')}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            {t('about.license')}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>{t('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
