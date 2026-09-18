import { useState, useRef, useCallback, useEffect } from 'react';

interface VirtualListOptions {
  itemHeight: number;   // px, fixed row height
  overscan?: number;    // extra rows above/below viewport
}

export function useVirtualList<T>(items: T[], { itemHeight, overscan = 5 }: VirtualListOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, i) => ({
    item,
    index: startIndex + i,
    offsetTop: (startIndex + i) * itemHeight,
  }));

  return { containerRef, onScroll, totalHeight, visibleItems };
}
