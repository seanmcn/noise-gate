import { Link } from 'react-router-dom';
import { ArticleCard } from './ArticleCard';
import { Pagination } from './Pagination';
import { Article } from '@/types/article';
import { Newspaper, Loader2 } from 'lucide-react';

interface NewsFeedProps {
  articles: Article[];
  currentPage: number;
  storyGroupCounts: Record<string, number>;
  prioritySourceIds?: Set<string>;
  selectedIndex?: number | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  onPageChange: (page: number) => void;
  onMarkSeen: (id: string) => void;
  onShowGroupedSources: (storyGroupId: string) => void;
  pageSize?: number;
}

export function NewsFeed({
  articles,
  currentPage,
  storyGroupCounts,
  prioritySourceIds,
  selectedIndex,
  isLoading = false,
  isAuthenticated = false,
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

  // Show loading state
  if (isLoading && articles.length === 0) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
        <h3 className="font-display text-lg text-muted-foreground mb-2">
          Loading articles...
        </h3>
      </div>
    );
  }

  // Show empty state (different messaging based on auth status)
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="font-display text-lg text-muted-foreground mb-2">
          No articles match your filters
        </h3>
        {isAuthenticated ? (
          <p className="text-sm text-muted-foreground/70">
            Try adjusting your filters or enable "Show read" to see read articles
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70">
            Try adjusting your filters or{' '}
            <Link to="/sources" className="text-primary hover:underline">
              browse our sources
            </Link>{' '}
            to find content you like
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedArticles.map((article, index) => (
          <div
            key={article.id}
            data-article-index={index}
            data-tour={index === 0 ? 'article' : undefined}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ArticleCard
              article={article}
              groupedCount={article.storyGroupId ? storyGroupCounts[article.storyGroupId] : undefined}
              isPrioritySource={prioritySourceIds?.has(article.sourceId)}
              isSelected={selectedIndex === index}
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
