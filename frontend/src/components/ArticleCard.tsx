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
      "hover:border-primary/30",
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

      {article.summary && (
        <p className="text-sm text-foreground/80 mb-3 italic border-l-2 border-primary/30 pl-3">
          {article.summary}
        </p>
      )}

      {!article.summary && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {article.snippet}
        </p>
      )}

      <div className="flex items-center justify-between">
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
