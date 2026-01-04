import { useEffect, useCallback, useState } from 'react';

interface UseKeyboardShortcutsOptions {
  articles: { id: string; url: string }[];
  onMarkSeen: (id: string) => void;
  onShowHelp: () => void;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function useKeyboardShortcuts({
  articles,
  onMarkSeen,
  onShowHelp,
  pageSize,
  currentPage,
  totalPages,
  onPageChange,
}: UseKeyboardShortcutsOptions) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Get articles on current page
  const startIndex = (currentPage - 1) * pageSize;
  const pageArticles = articles.slice(startIndex, startIndex + pageSize);

  // Reset selection when page changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [currentPage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'j': // Move down
          e.preventDefault();
          setSelectedIndex((prev) => {
            if (prev === null) return 0;
            if (prev < pageArticles.length - 1) return prev + 1;
            // At end of page, go to next page
            if (currentPage < totalPages) {
              onPageChange(currentPage + 1);
              return 0;
            }
            return prev;
          });
          break;

        case 'k': // Move up
          e.preventDefault();
          setSelectedIndex((prev) => {
            if (prev === null) return pageArticles.length - 1;
            if (prev > 0) return prev - 1;
            // At start of page, go to previous page
            if (currentPage > 1) {
              onPageChange(currentPage - 1);
              return pageSize - 1;
            }
            return prev;
          });
          break;

        case 'o': // Open article
        case 'Enter':
          if (selectedIndex !== null && pageArticles[selectedIndex]) {
            e.preventDefault();
            const article = pageArticles[selectedIndex];
            onMarkSeen(article.id);
            window.open(article.url, '_blank', 'noopener,noreferrer');
          }
          break;

        case 'm': // Mark as seen
          if (selectedIndex !== null && pageArticles[selectedIndex]) {
            e.preventDefault();
            onMarkSeen(pageArticles[selectedIndex].id);
          }
          break;

        case '?': // Show help
          e.preventDefault();
          onShowHelp();
          break;

        case 'Escape': // Clear selection
          e.preventDefault();
          setSelectedIndex(null);
          break;
      }
    },
    [pageArticles, selectedIndex, currentPage, totalPages, pageSize, onMarkSeen, onShowHelp, onPageChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected article into view
  useEffect(() => {
    if (selectedIndex !== null) {
      const articleElements = document.querySelectorAll('[data-article-index]');
      const selectedElement = articleElements[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
  };
}
