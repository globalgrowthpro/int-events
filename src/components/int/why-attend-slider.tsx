import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReasonItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

export function WhyAttendSlider({ items }: { items: ReasonItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Auto-play timer on mobile (changes every 3.5 seconds)
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      // Swiped left -> next
      handleNext();
    } else if (diff < -45) {
      // Swiped right -> prev
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div>
      {/* Mobile Auto-Play Slider (Visible on < 640px) */}
      <div
        className="relative sm:hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-6 shadow-md transition-all">
          <div className="relative min-h-[160px] flex flex-col justify-between">
            {items.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === currentIndex;
              return (
                <div
                  key={item.title}
                  className={cn(
                    "transition-all duration-500 ease-out",
                    isActive
                      ? "opacity-100 translate-x-0 relative"
                      : "opacity-0 absolute inset-0 pointer-events-none translate-x-8"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] font-bold text-muted-foreground">
                      0{idx + 1} / 0{items.length}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls & Dot Indicators */}
          <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
            <div className="flex items-center gap-1.5">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === currentIndex
                      ? "w-7 bg-primary shadow-xs"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                aria-label="Previous reason"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-foreground shadow-2xs hover:bg-secondary active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next reason"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-foreground shadow-2xs hover:bg-secondary active:scale-95 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Grid (Visible on >= 640px) */}
      <div className="hidden sm:grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((r, idx) => {
          const Icon = r.icon;
          return (
            <div
              key={r.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-2xs hover:border-primary/40 hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-[10px] font-bold text-muted-foreground/60">0{idx + 1}</span>
              </div>
              <h3 className="text-base font-bold text-foreground">{r.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
