import { ArticleCard } from './ArticleCard';
import { Pagination } from './Pagination';
import { Article } from '@/types/article';
import { Newspaper } from 'lucide-react';

interface NewsFeedProps {
  articles: Article[];
  currentPage: number;
  storyGroupCounts: Record<string, number>;
  onPageChange: (page: number) => void;
  onMarkSeen: (id: string) => void;
  onShowGroupedSources: (storyGroupId: string) => void;
  pageSize?: number;
}

export function NewsFeed({
  articles,
  currentPage,
  storyGroupCounts,
  onPageChange,
  onMarkSeen,
  onShowGroupedSources,
  pageSize = 12,
}: NewsFeedProps) {
  const totalPages = Math.ceil(articles.length / pageSize);
  const paginatedArticles = articles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="font-display text-lg text-muted-foreground mb-2">
          No articles match your filters
        </h3>
        <p className="text-sm text-muted-foreground/70">
          Try adjusting your filters or enable "Show read" to see read articles
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedArticles.map((article, index) => (
          <div
            key={article.id}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ArticleCard
              article={article}
              groupedCount={article.storyGroupId ? storyGroupCounts[article.storyGroupId] : undefined}
              onMarkSeen={onMarkSeen}
              onShowGroupedSources={onShowGroupedSources}
            />
          </div>
        ))}
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
