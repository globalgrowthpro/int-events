import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { getActiveSliders, type SliderItem } from "@/lib/api";

export function HeroSlider() {
  const [slides, setSlides] = useState<SliderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Fetch only active, live sliders from Supabase database
  useEffect(() => {
    let active = true;
    getActiveSliders()
      .then((data) => {
        if (active) {
          setSlides(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("HeroSlider fetch error:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Auto-play timer every 5.5 seconds
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.targetTouches && e.targetTouches[0]) {
      touchStartX.current = e.targetTouches[0].clientX;
    }
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches && e.targetTouches[0]) {
      touchEndX.current = e.targetTouches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = 0;
  };

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0]!;

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-navy min-h-[460px] sm:min-h-[520px] md:min-h-[580px] flex items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Images with Crossfade */}
      {slides.map((slide, idx) => (
        <div
          key={slide.id || idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentIndex ? "opacity-100 z-1" : "opacity-0 pointer-events-none z-0"
          }`}
        >
          <img
            src={slide.image_url}
            alt={slide.title}
            className="h-full w-full object-cover opacity-100 transform scale-105 transition-transform duration-10000 ease-out"
          />
          {/* Subtle gradient vignette for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ))}

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-24 md:px-6 md:py-28 w-full">
        <div className="max-w-3xl space-y-4 sm:space-y-5 rounded-3xl bg-black/40 p-6 sm:p-8 backdrop-blur-xs border border-white/10 animate-in fade-in slide-in-from-left-4 duration-500 key={currentIndex}">
          {/* Subtitle / Location Pill */}
          {currentSlide.subtitle && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-xs shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{currentSlide.subtitle}</span>
            </div>
          )}

          {/* Slide Title */}
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-md">
            {currentSlide.title}
          </h1>

          {/* Description */}
          {currentSlide.description && (
            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-white/90 leading-relaxed drop-shadow-xs">
              {currentSlide.description}
            </p>
          )}

          {/* Action CTA Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {currentSlide.event_link ? (
              <Link
                to={currentSlide.event_link.replace(/^\/events\//, "/event/")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-tech hover:scale-105 active:scale-95"
              >
                <span>View Event Details</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/events"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-tech hover:scale-105 active:scale-95"
              >
                <span>Explore All Events</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <Link
              to="/events"
              className="inline-flex h-11 items-center rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/20"
            >
              All Events
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/60 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/60 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 backdrop-blur-md">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  i === currentIndex ? "w-7 bg-primary" : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
