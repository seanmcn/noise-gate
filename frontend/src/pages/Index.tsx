import { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, Clock, Zap, Star } from 'lucide-react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { NewsFeed } from '@/components/NewsFeed';
import { GroupedSourcesDialog } from '@/components/GroupedSourcesDialog';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFeedStore, type SortOption } from '@/store/feedStore';
import { useFeedsStore } from '@/store/feedsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface IndexProps {
  signOut: () => void;
}

const Index = ({ signOut }: IndexProps) => {
  const {
    articles,
    isLoading,
    sentimentFilters,
    categoryFilters,
    showHidden,
    sortBy,
    collapseDuplicates,
    currentPage,
    toggleCategory,
    toggleShowHidden,
    setSortBy,
    setPage,
    markAsSeen,
  } = useFeedStore();

  const { preferences } = useSettingsStore();
  const { feeds } = useFeedsStore();

  const blockedWords = preferences?.blockedWords ?? [];

  // Create a lookup for priority feeds
  const priorityFeedIds = useMemo(() => {
    return new Set(feeds.filter((f) => f.isPriority).map((f) => f.id));
  }, [feeds]);

  const [selectedStoryGroupId, setSelectedStoryGroupId] = useState<string | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const pageSize = preferences?.articlesPerPage ?? 12;

  // Calculate how many articles are in each story group
  const storyGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const article of articles) {
      if (article.storyGroupId) {
        counts[article.storyGroupId] = (counts[article.storyGroupId] || 0) + 1;
      }
    }
    return counts;
  }, [articles]);

  // Get articles for the selected story group
  const groupedArticles = useMemo(() => {
    if (!selectedStoryGroupId) return [];
    return articles.filter((a) => a.storyGroupId === selectedStoryGroupId);
  }, [articles, selectedStoryGroupId]);

  const filteredArticles = useMemo(() => {
    const filtered = articles.filter((article) => {
      if (sentimentFilters.length > 0 && !sentimentFilters.includes(article.sentiment)) return false;
      if (categoryFilters.length > 0 && !categoryFilters.includes(article.category)) return false;
      const content = `${article.title} ${article.snippet}`.toLowerCase();
      for (const word of blockedWords) {
        if (content.includes(word.toLowerCase())) return false;
      }
      // Hide read articles (unless showHidden is on)
      if (!showHidden && article.seenAt) return false;
      return true;
    });

    // Apply sorting
    let sorted: typeof filtered;
    if (sortBy === 'importance') {
      sorted = [...filtered].sort((a, b) => {
        const scoreA = a.importanceScore ?? 50;
        const scoreB = b.importanceScore ?? 50;
        // Higher importance first, then by date
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    } else if (sortBy === 'priority') {
      sorted = [...filtered].sort((a, b) => {
        const aPriority = priorityFeedIds.has(a.feedId) ? 1 : 0;
        const bPriority = priorityFeedIds.has(b.feedId) ? 1 : 0;
        // Priority sources first, then by date
        if (bPriority !== aPriority) return bPriority - aPriority;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    } else {
      // Default: newest first (already sorted by API)
      sorted = filtered;
    }

    // Collapse duplicates: only show the first article from each story group
    if (collapseDuplicates) {
      const seenGroups = new Set<string>();
      return sorted.filter((article) => {
        if (!article.storyGroupId) return true; // No group, always show
        if (seenGroups.has(article.storyGroupId)) return false; // Already seen this group
        seenGroups.add(article.storyGroupId);
        return true;
      });
    }

    return sorted;
  }, [articles, sentimentFilters, categoryFilters, blockedWords, showHidden, sortBy, priorityFeedIds, collapseDuplicates]);

  const visibleCount = filteredArticles.length;
  const totalPages = Math.ceil(visibleCount / pageSize);

  // Keyboard navigation
  const { selectedIndex } = useKeyboardShortcuts({
    articles: filteredArticles,
    onMarkSeen: markAsSeen,
    onShowHelp: () => setShowShortcutsHelp(true),
    pageSize,
    currentPage,
    totalPages,
    onPageChange: setPage,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header signOut={signOut} showHidden={showHidden} onToggleShowHidden={toggleShowHidden} />
      <Hero />
      <FilterBar
        categoryFilters={categoryFilters}
        onCategoryToggle={toggleCategory}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg text-muted-foreground">
            <span className="text-foreground">{visibleCount}</span> stories
            {isLoading && <span className="ml-2 text-sm">(loading...)</span>}
          </h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ArrowDownWideNarrow className="w-4 h-4" />
                {sortBy === 'newest' ? 'Newest' : sortBy === 'importance' ? 'Important' : 'Priority'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSortBy('newest')}
                className={sortBy === 'newest' ? 'bg-secondary' : ''}
              >
                <Clock className="w-4 h-4 mr-2" />
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy('importance')}
                className={sortBy === 'importance' ? 'bg-secondary' : ''}
              >
                <Zap className="w-4 h-4 mr-2" />
                Most important
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy('priority')}
                className={sortBy === 'priority' ? 'bg-secondary' : ''}
              >
                <Star className="w-4 h-4 mr-2" />
                Priority sources
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <NewsFeed
          articles={filteredArticles}
          currentPage={currentPage}
          storyGroupCounts={storyGroupCounts}
          priorityFeedIds={priorityFeedIds}
          selectedIndex={selectedIndex}
          onPageChange={setPage}
          onMarkSeen={markAsSeen}
          onShowGroupedSources={setSelectedStoryGroupId}
          pageSize={pageSize}
        />

        <GroupedSourcesDialog
          open={selectedStoryGroupId !== null}
          onOpenChange={(open) => !open && setSelectedStoryGroupId(null)}
          articles={groupedArticles}
          onMarkSeen={markAsSeen}
        />

        <KeyboardShortcutsHelp
          open={showShortcutsHelp}
          onOpenChange={setShowShortcutsHelp}
        />
      </main>

      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-sm text-muted-foreground">
            <span className="text-gradient">NOISE</span>GATE — Filter the noise, find the signal
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
