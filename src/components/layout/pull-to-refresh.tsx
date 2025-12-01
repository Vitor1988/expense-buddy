'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 80;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start if page is at top (window scroll)
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      router.refresh();
      await new Promise(resolve => setTimeout(resolve, 500));
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, refreshing, router]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Spinner - FIXED at top of screen */}
      <div
        className="fixed left-0 right-0 flex justify-center pointer-events-none z-50 transition-all duration-200"
        style={{
          top: -40 + (refreshing ? 50 : pullDistance),
          opacity: pullDistance > 10 || refreshing ? 1 : 0
        }}
      >
        <div className={`p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
          <Loader2 className={`w-5 h-5 text-emerald-500 ${pullDistance >= THRESHOLD || refreshing ? 'opacity-100' : 'opacity-50'}`} />
        </div>
      </div>

      {/* Content - slides down when pulling/refreshing */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${refreshing ? 50 : pullDistance}px)`,
          transitionDuration: pulling ? '0ms' : '200ms'
        }}
      >
        {children}
      </div>
    </div>
  );
}
