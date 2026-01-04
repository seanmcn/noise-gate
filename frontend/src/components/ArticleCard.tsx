import { ExternalLink, Clock, Check, Layers, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Article } from '@/types/article';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCardProps {
  article: Article;
  groupedCount?: number;
  isPrioritySource?: boolean;
  isSelected?: boolean;
  onMarkSeen: (id: string) => void;
  onShowGroupedSources?: (storyGroupId: string) => void;
}

const categoryLabels: Record<string, string> = {
  world: 'World News',
  tech: 'Technology',
  programming: 'Programming',
  science: 'Science',
  business: 'Business',
  local: 'Local',
  health: 'Health',
  other: 'Other',
};

export function ArticleCard({ article, groupedCount, isPrioritySource, isSelected, onMarkSeen, onShowGroupedSources }: ArticleCardProps) {
  const isSeen = Boolean(article.seenAt);

  return (
    <article className={cn(
      "group card-gradient border border-border/50 rounded-lg p-5 transition-all duration-300 animate-slide-up",
      "hover:border-primary/30 h-full flex flex-col",
      isSeen && "opacity-75",
      isSelected && "ring-2 ring-primary border-primary/50"
    )}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="source" className={isPrioritySource ? 'ring-1 ring-amber-500/50' : ''}>
            {isPrioritySource && <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />}
            {article.feedName}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-display uppercase">
            {categoryLabels[article.category] || article.category || 'Uncategorized'}
          </Badge>
          {article.storyGroupId && groupedCount && groupedCount > 1 && (
            <button
              onClick={() => onShowGroupedSources?.(article.storyGroupId!)}
              className="inline-flex"
            >
              <Badge
                variant="outline"
                className="text-[10px] font-display flex items-center gap-1 cursor-pointer hover:bg-secondary/50 transition-colors"
                title="Click to see other sources"
              >
                <Layers className="w-3 h-3" />
                {groupedCount} sources
              </Badge>
            </button>
          )}
          {article.importanceScore !== undefined && article.importanceScore >= 70 && (
            <Badge
              variant="outline"
              className="text-[10px] font-display flex items-center gap-1 text-amber-500 border-amber-500/30"
              title={`Importance: ${article.importanceScore}/100`}
            >
              <Zap className="w-3 h-3" />
              Important
            </Badge>
          )}
        </div>
        
        <SentimentMeter score={article.score} sentiment={article.sentiment} />
      </div>

      <h3 className="font-sans font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {article.title}
      </h3>

      <div className="flex-1 min-h-0 overflow-hidden">
        {article.summary && (
          <SummaryBlock summary={article.summary} />
        )}

        {!article.summary && (
          <p className="text-muted-foreground text-sm line-clamp-3">
            {article.snippet}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3">
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
          </div>
          {isSeen && (
            <div className="flex items-center gap-1 text-primary/60" title="Already read">
              <Check className="w-3.5 h-3.5" />
              <span>Read</span>
            </div>
          )}
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMarkSeen(article.id)}
          className="flex items-center gap-1.5 text-primary text-sm font-display hover:underline"
        >
          Read more
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}

function SummaryBlock({ summary }: { summary: string }) {
  // Parse "TL;DR: ... Why it matters: ..." format
  const tldrMatch = summary.match(/^(?:TL;DR:\s*)?(.+?)(?:\s*Why it matters:\s*(.+))?$/i);

  if (!tldrMatch) {
    // Fallback: just show the summary as-is
    return (
      <p className="text-sm text-foreground/80 mb-3 italic border-l-2 border-primary/30 pl-3">
        {summary}
      </p>
    );
  }

  const tldr = tldrMatch[1]?.trim();
  const whyItMatters = tldrMatch[2]?.trim();

  return (
    <div className="text-sm space-y-1 border-l-2 border-primary/30 pl-3">
      {tldr && (
        <p className="text-foreground/90 line-clamp-2">
          {tldr}
        </p>
      )}
      {whyItMatters && (
        <p className="text-muted-foreground text-xs line-clamp-2">
          <span className="font-medium text-primary/70">Why it matters:</span>{' '}
          {whyItMatters}
        </p>
      )}
    </div>
  );
}

function SentimentMeter({ score, sentiment }: { score: number; sentiment: string }) {
  const bars = 5;
  const activeBars = Math.ceil((score / 100) * bars);
  
  return (
    <div className="vu-meter" title={`Sentiment: ${sentiment} (${score}/100)`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'vu-bar',
            i < activeBars
              ? sentiment === 'positive'
                ? 'bg-sentiment-positive'
                : sentiment === 'neutral'
                ? 'bg-sentiment-neutral'
                : 'bg-sentiment-negative'
              : 'bg-border'
          )}
          style={{ height: `${((i + 1) / bars) * 16}px` }}
        />
      ))}
    </div>
  );
}
