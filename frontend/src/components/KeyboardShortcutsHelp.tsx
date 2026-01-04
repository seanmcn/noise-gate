import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: 'j', description: 'Move to next article' },
  { key: 'k', description: 'Move to previous article' },
  { key: 'o', description: 'Open selected article' },
  { key: 'Enter', description: 'Open selected article' },
  { key: 'm', description: 'Mark selected as read' },
  { key: 'Esc', description: 'Clear selection' },
  { key: '?', description: 'Show this help' },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-secondary border border-border rounded">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
