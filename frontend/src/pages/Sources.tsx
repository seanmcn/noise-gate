import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Rss, Eye, Star, Circle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Header } from '@/components/Header';
import { FeedPreviewDialog } from '@/components/FeedPreviewDialog';
import { useFeedsStore } from '@/store/feedsStore';
import type { Feed } from '@noise-gate/shared';
import { formatRelativeTime } from '@noise-gate/shared';

// Feed health status indicator
function FeedHealthIndicator({ feed }: { feed: Feed }) {
  const errors = feed.consecutiveErrors || 0;

  // Determine health status
  let status: 'healthy' | 'warning' | 'error';
  let statusText: string;
  let colorClass: string;

  if (errors === 0) {
    status = 'healthy';
    statusText = feed.lastSuccessAt
      ? `Healthy - last success ${formatRelativeTime(feed.lastSuccessAt)}`
      : 'Healthy';
    colorClass = 'text-green-500';
  } else if (errors < 5) {
    status = 'warning';
    statusText = `${errors} error${errors > 1 ? 's' : ''} - ${feed.lastError || 'Unknown error'}`;
    colorClass = 'text-yellow-500';
  } else {
    status = 'error';
    statusText = `Auto-disabled after ${errors} errors - ${feed.lastError || 'Unknown error'}`;
    colorClass = 'text-red-500';
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={`${colorClass} cursor-default`}>
          {status === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Circle className={`w-3 h-3 ${status === 'healthy' ? 'fill-current' : ''}`} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{statusText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface SourcesProps {
  signOut: () => void;
}

export function Sources({ signOut }: SourcesProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [previewFeed, setPreviewFeed] = useState<Feed | null>(null);

  const {
    feeds,
    isLoading,
    isSaving,
    error,
    loadFeeds,
    addFeed,
    deleteFeed,
    toggleFeed,
    togglePriority,
  } = useFeedsStore();

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const handleAdd = async () => {
    if (!url.trim() || !name.trim()) return;

    await addFeed({ url: url.trim(), name: name.trim() });
    setUrl('');
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && name.trim()) {
      handleAdd();
    }
  };

  const activeCount = feeds.filter((f) => f.isActive).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header signOut={signOut} />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background">
      <Header signOut={signOut} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-display text-sm">Back to feed</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground">RSS Sources</h1>
          <p className="text-muted-foreground mt-2">
            Manage your news sources. Add, remove, or disable feeds.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="card-gradient border border-border/50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Add New Source
            </h2>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-display text-sm text-muted-foreground mb-1.5 block">
                Feed URL
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com/rss.xml"
                className="bg-secondary/50 border-border font-display text-sm"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="font-display text-sm text-muted-foreground mb-1.5 block">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="My Feed"
                className="bg-secondary/50 border-border font-display text-sm"
                disabled={isSaving}
              />
            </div>

            <Button
              onClick={handleAdd}
              disabled={isSaving || !url.trim() || !name.trim()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </div>
        </div>

        <div className="card-gradient border border-border/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Rss className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Your Sources
            </h2>
            <span className="text-sm text-muted-foreground">
              ({activeCount} active)
            </span>
          </div>

          {feeds.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Rss className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">
                No sources configured. Add a feed above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    feed.isActive
                      ? 'border-border/50 bg-secondary/20'
                      : 'border-border/30 bg-secondary/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Switch
                      checked={feed.isActive}
                      onCheckedChange={() => toggleFeed(feed.id)}
                      disabled={isSaving}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FeedHealthIndicator feed={feed} />
                        <span className="font-display font-medium text-foreground truncate">
                          {feed.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate ml-5">
                        {feed.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePriority(feed.id)}
                      disabled={isSaving}
                      className={feed.isPriority ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'}
                      title={feed.isPriority ? 'Remove priority' : 'Mark as priority'}
                    >
                      <Star className={`w-4 h-4 ${feed.isPriority ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewFeed(feed)}
                      disabled={isSaving}
                      className="text-muted-foreground hover:text-foreground"
                      title="Preview feed"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFeed(feed.id)}
                      disabled={isSaving}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <FeedPreviewDialog
        feed={previewFeed}
        open={previewFeed !== null}
        onOpenChange={(open) => !open && setPreviewFeed(null)}
      />
    </div>
    </TooltipProvider>
  );
}

export default Sources;
