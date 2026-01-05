import { useState, useEffect } from 'react';
import { ExternalLink, Loader2, RefreshCw, Database, Rss } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Source, Article } from '@noise-gate/shared';
import { dataApi } from '@/lib/data-api';
import { formatDistanceToNow } from 'date-fns';

interface PreviewItem {
  title: string;
  url: string;
  publishedAt: string;
  content: string;
}

interface SourcePreviewDialogProps {
  source: Source | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SourcePreviewDialog({
  source,
  open,
  onOpenChange,
}: SourcePreviewDialogProps) {
  const [tab, setTab] = useState<'imported' | 'live'>('imported');
  const [importedItems, setImportedItems] = useState<Article[]>([]);
  const [liveItems, setLiveItems] = useState<PreviewItem[]>([]);
  const [isLoadingImported, setIsLoadingImported] = useState(false);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveItemCount, setLiveItemCount] = useState<number | null>(null);

  // Load imported items when dialog opens
  useEffect(() => {
    if (open && source) {
      loadImportedItems();
    }
  }, [open, source]);

  const loadImportedItems = async () => {
    if (!source) return;
    setIsLoadingImported(true);
    try {
      const items = await dataApi.listFeedItemsBySource(source.id);
      setImportedItems(items);
    } catch (err) {
      console.error('Failed to load imported items:', err);
    } finally {
      setIsLoadingImported(false);
    }
  };

  const testLiveFeed = async () => {
    if (!source) return;
    setIsLoadingLive(true);
    setLiveError(null);
    setLiveItems([]);

    try {
      // For now, just show a message that live preview isn't available
      // This would require a Lambda function to fetch and parse the RSS feed
      setLiveError('Live preview not yet implemented');
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Failed to fetch feed');
    } finally {
      setIsLoadingLive(false);
    }
  };

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {source.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{source.url}</p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button
            onClick={() => setTab('imported')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'imported'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-4 h-4" />
            Imported ({importedItems.length})
          </button>
          <button
            onClick={() => {
              setTab('live');
              if (liveItems.length === 0 && !liveError) {
                testLiveFeed();
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'live'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Rss className="w-4 h-4" />
            Live Feed
            {liveItemCount !== null && ` (${liveItemCount})`}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'imported' && (
            <div className="space-y-2 py-2">
              {isLoadingImported ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : importedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No items imported from this source yet.
                  <br />
                  Wait for the RSS poller to run or trigger it manually.
                </div>
              ) : (
                importedItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          {item.sentiment && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                item.sentiment === 'positive'
                                  ? 'text-green-500 border-green-500/30'
                                  : item.sentiment === 'negative'
                                    ? 'text-red-500 border-red-500/30'
                                    : ''
                              }`}
                            >
                              {item.sentiment}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.publishedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </a>
                ))
              )}
            </div>
          )}

          {tab === 'live' && (
            <div className="space-y-2 py-2">
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testLiveFeed}
                  disabled={isLoadingLive}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoadingLive ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>

              {isLoadingLive ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : liveError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-2">{liveError}</p>
                </div>
              ) : liveItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Click Refresh to test the feed.
                </div>
              ) : (
                liveItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {item.content}
                        </p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {formatDistanceToNow(new Date(item.publishedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
