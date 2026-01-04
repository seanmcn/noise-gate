import { Smile, Meh, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sentiment } from '@/types/article';

interface SentimentFilterProps {
  activeFilters: Sentiment[];
  onToggle: (sentiment: Sentiment) => void;
}

const sentiments: { value: Sentiment; label: string; icon: typeof Smile }[] = [
  { value: 'positive', label: 'Good News', icon: Smile },
  { value: 'neutral', label: 'Neutral', icon: Meh },
  { value: 'negative', label: 'Bad News', icon: Frown },
];

export function SentimentFilter({ activeFilters, onToggle }: SentimentFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sentiments.map(({ value, label, icon: Icon }) => {
        const isActive = activeFilters.includes(value);
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-display text-sm transition-all duration-200',
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
  );
}
