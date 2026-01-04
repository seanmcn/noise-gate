import { SentimentFilter } from './SentimentFilter';
import { CategoryFilter } from './CategoryFilter';
import { Sentiment, Category } from '@/types/article';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  sentimentFilters: Sentiment[];
  categoryFilters: Category[];
  showHidden: boolean;
  onSentimentToggle: (sentiment: Sentiment) => void;
  onCategoryToggle: (category: Category) => void;
  onToggleShowHidden: () => void;
}

export function FilterBar({
  sentimentFilters,
  categoryFilters,
  showHidden,
  onSentimentToggle,
  onCategoryToggle,
  onToggleShowHidden,
}: FilterBarProps) {
  return (
    <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-[73px] z-40">
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <CategoryFilter
              activeCategories={categoryFilters}
              onToggle={onCategoryToggle}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SentimentFilter
            activeFilters={sentimentFilters}
            onToggle={onSentimentToggle}
          />
          
          <button
            onClick={onToggleShowHidden}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-display text-sm transition-all duration-200 border',
              showHidden
                ? 'bg-secondary border-border text-foreground'
                : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
            )}
          >
            {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showHidden ? 'Showing read' : 'Show read'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
