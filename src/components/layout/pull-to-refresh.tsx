'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 80; // pixels to pull before triggering refresh

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start if at top of scroll
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Resistance effect - pull distance reduces as you pull further
      setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);

      // Refresh the page
      router.refresh();

      // Wait a bit for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      setRefreshing(false);
    }

    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, refreshing, router]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Pull indicator - positioned above content */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-200"
        style={{
          top: -50 + (refreshing ? THRESHOLD * 0.6 : pullDistance),
          opacity: pullDistance > 10 || refreshing ? 1 : 0
        }}
      >
        <div className={`p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
          <Loader2 className={`w-5 h-5 text-emerald-500 ${pullDistance >= THRESHOLD || refreshing ? 'opacity-100' : 'opacity-50'}`} />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${refreshing ? THRESHOLD * 0.5 : pullDistance}px)`,
          transitionDuration: pulling ? '0ms' : '200ms'
        }}
      >
        {children}
      </div>
    </div>
  );
}
