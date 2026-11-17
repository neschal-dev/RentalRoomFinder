"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// A row of cards that scrolls sideways. Arrow buttons on wide screens; swipe on phones.
// Each child should have a fixed width, for example w-64.
export function Carousel({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoOn, setCanGoOn] = useState(true);

  // Remembers whether there is more to scroll to on each side, to grey out the arrows.
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setCanGoBack(el.scrollLeft > 4);
    setCanGoOn(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function scroll(direction: 1 | -1) {
    const el = track.current;
    if (el)
      el.scrollBy({
        left: direction * el.clientWidth * 0.8,
        behavior: "smooth",
      });
  }

  const arrow =
    "hidden size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-sm transition-opacity hover:shadow-md disabled:cursor-default disabled:opacity-30 md:flex";

  return (
    <div className="relative">
      <div className="mb-3 flex justify-end gap-2 md:absolute md:-top-12 md:right-0 md:mb-0">
        <button
          type="button"
          aria-label="Scroll back"
          disabled={!canGoBack}
          onClick={() => scroll(-1)}
          className={arrow}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Scroll forward"
          disabled={!canGoOn}
          onClick={() => scroll(1)}
          className={arrow}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div
        ref={track}
        onScroll={update}
        className={cn(
          "-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-pl-6 sm:px-6",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Fixes the width of one card inside a Carousel and makes it snap into place.
export function CarouselItem({ children }: { children: ReactNode }) {
  return (
    <div className="w-[15.5rem] shrink-0 snap-start sm:w-[17rem]">
      {children}
    </div>
  );
}
