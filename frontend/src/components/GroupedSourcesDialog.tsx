import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';

interface GroupedSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Article[];
  onMarkSeen: (id: string) => void;
}

export function GroupedSourcesDialog({
  open,
  onOpenChange,
  articles,
  onMarkSeen,
}: GroupedSourcesDialogProps) {
  if (articles.length === 0) return null;

  const primaryArticle = articles[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-tight">
            {primaryArticle.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            This story is covered by {articles.length} source{articles.length > 1 ? 's' : ''}:
          </p>

          <div className="space-y-3">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onMarkSeen(article.id)}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="source">{article.sourceName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
