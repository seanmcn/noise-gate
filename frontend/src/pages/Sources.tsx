import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Rss, Circle, AlertCircle, Globe, User, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
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
import { SourcePreviewDialog } from '@/components/SourcePreviewDialog';
import { useSourcesStore } from '@/store/sourcesStore';
import type { Source } from '@minfeed/shared';
import { formatRelativeTime } from '@minfeed/shared';

// Source health status indicator
function SourceHealthIndicator({ source }: { source: Source }) {
  const errors = source.consecutiveErrors || 0;

  let status: 'healthy' | 'warning' | 'error';
  let statusText: string;
  let colorClass: string;

  if (errors === 0) {
    status = 'healthy';
    statusText = source.lastSuccessAt
      ? `Healthy - last success ${formatRelativeTime(source.lastSuccessAt)}`
      : 'Healthy';
    colorClass = 'text-green-500';
  } else if (errors < 5) {
    status = 'warning';
    statusText = `${errors} error${errors > 1 ? 's' : ''} - ${source.lastError || 'Unknown error'}`;
    colorClass = 'text-yellow-500';
  } else {
    status = 'error';
    statusText = `Auto-disabled after ${errors} errors - ${source.lastError || 'Unknown error'}`;
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
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

  const {
    sources,
    subscriptions,
    isLoading,
    isSaving,
    error,
    customSourceLimit,
    systemSources,
    customSources,
    enabledSourceIds,
    customSourceCount,
    loadSources,
    toggleSourceEnabled,
    addCustomSource,
    removeCustomSource,
  } = useSourcesStore();

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleAdd = async () => {
    if (!url.trim() || !name.trim()) return;
    await addCustomSource(url.trim(), name.trim());
    setUrl('');
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && name.trim()) {
      handleAdd();
    }
  };

  const getSubscriptionForSource = (sourceId: string) => {
    return subscriptions.find(s => s.sourceId === sourceId);
  };

  const isSourceEnabled = (sourceId: string) => {
    return enabledSourceIds().has(sourceId);
  };

  const systemSourcesList = systemSources();
  const customSourcesList = customSources();
  const currentCustomCount = customSourceCount();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header signOut={signOut} isAuthenticated />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <SEO />
        <Header signOut={signOut} isAuthenticated />

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
              Manage your news sources. Toggle visibility or add custom feeds.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* System Sources Section */}
          <div className="card-gradient border border-border/50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">
                System Sources
              </h2>
              <span className="text-sm text-muted-foreground">
                ({systemSourcesList.filter(s => isSourceEnabled(s.id)).length} enabled)
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Default sources available to all users. Toggle to show/hide in your feed.
            </p>

            {systemSourcesList.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">
                  No system sources available yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {systemSourcesList.map((source) => {
                  const enabled = isSourceEnabled(source.id);
                  return (
                    <div
                      key={source.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        enabled
                          ? 'border-border/50 bg-secondary/20'
                          : 'border-border/30 bg-secondary/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleSourceEnabled(source.id)}
                          disabled={isSaving}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <SourceHealthIndicator source={source} />
                            <span className="font-display font-medium text-foreground truncate">
                              {source.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate ml-5">
                            {source.url}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewSource(source)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Sources Section */}
          <div className="card-gradient border border-border/50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">
                Custom Sources
              </h2>
              <span className="text-sm text-muted-foreground">
                ({currentCustomCount}/{customSourceLimit} used)
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Add your own RSS feeds. Limited to {customSourceLimit} sources.
            </p>

            {customSourcesList.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg mb-4">
                <Rss className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">
                  No custom sources yet. Add one below.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {customSourcesList.map((source) => {
                  const subscription = getSubscriptionForSource(source.id);
                  const enabled = isSourceEnabled(source.id);
                  return (
                    <div
                      key={source.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        enabled
                          ? 'border-border/50 bg-secondary/20'
                          : 'border-border/30 bg-secondary/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleSourceEnabled(source.id)}
                          disabled={isSaving}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <SourceHealthIndicator source={source} />
                            <span className="font-display font-medium text-foreground truncate">
                              {source.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate ml-5">
                            {source.url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewSource(source)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {subscription && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomSource(subscription.id, source.id)}
                            disabled={isSaving}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Custom Source Form */}
            {currentCustomCount < customSourceLimit && (
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-md font-semibold text-foreground">
                    Add Custom Source
                  </h3>
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
            )}

            {currentCustomCount >= customSourceLimit && (
              <div className="border-t border-border/50 pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  You've reached your limit of {customSourceLimit} custom sources.
                </p>
              </div>
            )}
          </div>
        </main>

        <SourcePreviewDialog
          source={previewSource}
          open={previewSource !== null}
          onOpenChange={(open) => !open && setPreviewSource(null)}
        />
      </div>
    </TooltipProvider>
  );
}

export default Sources;
