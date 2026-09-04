import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationControlProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
  alwaysShowSummary?: boolean;
}

export function PaginationControl({
  currentPage,
  totalItems,
  pageSize = 15,
  onPageChange,
  className = "",
  itemLabel = "records",
  alwaysShowSummary = false,
}: PaginationControlProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If 15 or fewer items and summary is not explicitly forced, hide pagination
  if (totalItems <= pageSize && !alwaysShowSummary) {
    return null;
  }

  if (totalItems === 0) {
    return null;
  }

  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-5 py-3.5 bg-card/60 text-xs text-muted-foreground ${className}`}
    >
      <div>
        Showing <span className="font-semibold text-foreground">{start}</span> to{" "}
        <span className="font-semibold text-foreground">{end}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="h-8 w-8 rounded-lg"
            title="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-8 w-8 rounded-lg"
            title="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                type="button"
                key={`page-${p}`}
                variant={currentPage === p ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(p as number)}
                className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                  currentPage === p
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-secondary"
                }`}
              >
                {p}
              </Button>
            )
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 rounded-lg"
            title="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 rounded-lg"
            title="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize: number = 15) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const resetPage = React.useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    pageSize,
    totalItems: items.length,
    resetPage,
  };
}
