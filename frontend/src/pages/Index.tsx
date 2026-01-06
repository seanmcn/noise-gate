import { useMemo, useState, useCallback } from 'react';
import { ArrowDownWideNarrow, Clock, Zap, Eye, EyeOff } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Header } from '@/components/Header';
import { useMarkSeenMutation } from '@/hooks/useFeedQuery';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { VuMeterFilter } from '@/components/VuMeterFilter';
import { TimeRangeFilter } from '@/components/TimeRangeFilter';
import { NewsFeed } from '@/components/NewsFeed';
import { GroupedSourcesDialog } from '@/components/GroupedSourcesDialog';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { FeatureTour } from '@/components/FeatureTour';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFeedStore, type SortOption } from '@/store/feedStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTour } from '@/hooks/useTour';
import type { TimeRange } from '@minfeed/shared';

interface IndexProps {
  signOut?: () => void;
  isAuthenticated?: boolean;
}

const Index = ({ signOut, isAuthenticated = false }: IndexProps) => {
  const {
    articles,
    isLoading,
    sentimentFilters,
    categoryFilters,
    showHidden,
    sortBy,
    collapseDuplicates,
    timeRange,
    currentPage,
    toggleCategory,
    toggleShowHidden,
    setSortBy,
    setTimeRange: setFeedTimeRange,
    setPage,
    markAsSeen,
  } = useFeedStore();

  const { preferences, setTimeRange: setPreferencesTimeRange } = useSettingsStore();
  const markSeenMutation = useMarkSeenMutation();

  // Wrap markAsSeen to call both local update and API
  const handleMarkSeen = useCallback(
    (id: string) => {
      markAsSeen(id); // Immediate local update
      markSeenMutation.mutate(id); // API call (only runs if authenticated via dataApi)
    },
    [markAsSeen, markSeenMutation]
  );

  const blockedWords = useMemo(() => preferences?.blockedWords ?? [], [preferences?.blockedWords]);

  // Helper to get time range boundaries
  const getTimeRangeBoundary = useCallback((range: TimeRange): Date => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case 'today':
        return startOfToday;
      case 'yesterday':
        return new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      case 'last7days':
        return new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last14days':
        return new Date(startOfToday.getTime() - 14 * 24 * 60 * 60 * 1000);
      default:
        return startOfToday;
    }
  }, []);

  // Handle time range change - update local store and save to preferences for auth users
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setFeedTimeRange(range);
      if (isAuthenticated) {
        setPreferencesTimeRange(range);
      }
    },
    [isAuthenticated, setFeedTimeRange, setPreferencesTimeRange]
  );

  const [selectedStoryGroupId, setSelectedStoryGroupId] = useState<string | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Feature tour
  const tour = useTour();

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
    const timeRangeBoundary = getTimeRangeBoundary(timeRange);

    const filtered = articles.filter((article) => {
      // Time range filtering
      const publishedDate = new Date(article.publishedAt);
      if (publishedDate < timeRangeBoundary) return false;

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
  }, [articles, sentimentFilters, categoryFilters, blockedWords, showHidden, sortBy, collapseDuplicates, timeRange, getTimeRangeBoundary]);

  const visibleCount = filteredArticles.length;
  const totalPages = Math.ceil(visibleCount / pageSize);

  // Keyboard navigation
  const { selectedIndex } = useKeyboardShortcuts({
    articles: filteredArticles,
    onMarkSeen: handleMarkSeen,
    onShowHelp: () => setShowShortcutsHelp(true),
    pageSize,
    currentPage,
    totalPages,
    onPageChange: setPage,
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO />
      <Header signOut={signOut} isAuthenticated={isAuthenticated} />
      {!isAuthenticated && <Hero onStartTour={tour.start} />}
      <div data-tour="categories">
        <FilterBar
          categoryFilters={categoryFilters}
          onCategoryToggle={toggleCategory}
        />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg text-muted-foreground">
            <span className="text-foreground">{visibleCount}</span> stories
            {isLoading && <span className="ml-2 text-sm">(loading...)</span>}
          </h2>

          <div className="flex items-center gap-2">
            <div data-tour="sentiment">
              <VuMeterFilter />
            </div>

            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleShowHidden}
                className={`gap-2 ${showHidden ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showHidden ? 'Showing read' : 'Show read'}
              </Button>
            )}

            <TimeRangeFilter value={timeRange} onChange={handleTimeRangeChange} />

            <div data-tour="sort">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <ArrowDownWideNarrow className="w-4 h-4" />
                    {sortBy === 'newest' ? 'Newest' : 'Important'}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <NewsFeed
          articles={filteredArticles}
          currentPage={currentPage}
          storyGroupCounts={storyGroupCounts}
          selectedIndex={selectedIndex}
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          onPageChange={setPage}
          onMarkSeen={handleMarkSeen}
          onShowGroupedSources={setSelectedStoryGroupId}
          pageSize={pageSize}
        />

        <GroupedSourcesDialog
          open={selectedStoryGroupId !== null}
          onOpenChange={(open) => !open && setSelectedStoryGroupId(null)}
          articles={groupedArticles}
          onMarkSeen={handleMarkSeen}
        />

        <KeyboardShortcutsHelp
          open={showShortcutsHelp}
          onOpenChange={setShowShortcutsHelp}
        />

        <FeatureTour
          isOpen={tour.isOpen}
          currentStep={tour.currentStep}
          totalSteps={tour.totalSteps}
          stepData={tour.currentStepData}
          onNext={tour.next}
          onPrevious={tour.previous}
          onClose={tour.close}
          isFirstStep={tour.isFirstStep}
          isLastStep={tour.isLastStep}
        />
      </main>

      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-sm text-muted-foreground">
            <span className="text-gradient">MIN</span>FEED — Filter the noise, find the signal
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
