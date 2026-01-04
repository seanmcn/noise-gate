import { Smile, Meh, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Sentiment } from '@noise-gate/shared';
import { useFeedStore } from '@/store/feedStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const sentiments: { value: Sentiment; label: string; icon: typeof Smile }[] = [
  { value: 'positive', label: 'Good News', icon: Smile },
  { value: 'neutral', label: 'Neutral', icon: Meh },
  { value: 'negative', label: 'Bad News', icon: Frown },
];

export function VuMeterFilter() {
  const { sentimentFilters, toggleSentiment } = useFeedStore();
  const { setSentimentFilters, preferences } = useSettingsStore();

  const handleToggle = (sentiment: Sentiment) => {
    // Toggle in feedStore for immediate UI update
    toggleSentiment(sentiment);

    // Persist to backend
    const newFilters = sentimentFilters.includes(sentiment)
      ? sentimentFilters.filter((s) => s !== sentiment)
      : [...sentimentFilters, sentiment];
    setSentimentFilters(newFilters);
  };

  // Check if each sentiment type is active (being filtered for)
  const isPositiveActive = sentimentFilters.includes('positive');
  const isNeutralActive = sentimentFilters.includes('neutral');
  const isNegativeActive = sentimentFilters.includes('negative');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="vu-meter cursor-pointer hover:opacity-80 transition-opacity"
          title="Sentiment filters"
        >
          {/* Bars 1-2: Positive */}
          <div
            className={cn(
              'vu-bar h-2',
              isPositiveActive ? 'bg-sentiment-positive' : 'bg-sentiment-positive/30'
            )}
          />
          <div
            className={cn(
              'vu-bar h-3',
              isPositiveActive ? 'bg-sentiment-positive' : 'bg-sentiment-positive/30'
            )}
          />
          {/* Bar 3: Neutral */}
          <div
            className={cn(
              'vu-bar h-4',
              isNeutralActive ? 'bg-sentiment-neutral' : 'bg-sentiment-neutral/30'
            )}
          />
          {/* Bars 4-5: Negative */}
          <div
            className={cn(
              'vu-bar h-3',
              isNegativeActive ? 'bg-sentiment-negative' : 'bg-sentiment-negative/30'
            )}
          />
          <div
            className={cn(
              'vu-bar h-2',
              isNegativeActive ? 'bg-sentiment-negative' : 'bg-sentiment-negative/30'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="flex flex-col gap-1">
          {sentiments.map(({ value, label, icon: Icon }) => {
            const isActive = sentimentFilters.includes(value);
            return (
              <button
                key={value}
                onClick={() => handleToggle(value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md font-display text-sm transition-all duration-200',
                  'border',
                  isActive
                    ? value === 'positive'
                      ? 'bg-sentiment-positive/20 border-sentiment-positive text-sentiment-positive'
                      : value === 'neutral'
                      ? 'bg-sentiment-neutral/20 border-sentiment-neutral text-sentiment-neutral'
                      : 'bg-sentiment-negative/20 border-sentiment-negative text-sentiment-negative'
                    : 'bg-secondary/50 border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          {sentimentFilters.length === 0
            ? 'Showing all articles'
            : `Showing ${sentimentFilters.length} filter${sentimentFilters.length > 1 ? 's' : ''}`}
        </p>
      </PopoverContent>
    </Popover>
  );
}
