import { useState, useRef, useCallback } from 'react';

const SCROLL_THRESHOLD = 10; // pixels

/**
 * Hook for scroll-aware dropdown menu handling on mobile.
 * Prevents menu from opening accidentally during scroll gestures.
 *
 * v4 Approach: Intercepts onOpenChange and blocks opening if scroll was detected.
 * This works because:
 * 1. onTouchMove fires and sets isScrollingRef = true
 * 2. Radix calls onOpenChange(true)
 * 3. We check isScrollingRef and return without calling setOpen(true)
 * 4. Menu never opens!
 *
 * @see https://github.com/radix-ui/primitives/issues/1912
 * @see https://github.com/radix-ui/primitives/issues/2418
 */
export function useScrollAwareMenu() {
  const [open, setOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  // Track touch start position
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;
  }, []);

  // Detect scroll movement
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
      isScrollingRef.current = true;
    }
  }, []);

  // Reset on touch end
  const handleTouchEnd = useCallback(() => {
    // Small delay to let onOpenChange fire first
    setTimeout(() => {
      touchStartRef.current = null;
      isScrollingRef.current = false;
    }, 100);
  }, []);

  // CRITICAL: Intercept open change and block if scrolling
  const handleOpenChange = useCallback((newOpen: boolean) => {
    // Always allow closing
    if (!newOpen) {
      setOpen(false);
      return;
    }

    // Block opening if we detected scrolling
    if (isScrollingRef.current) {
      return; // Don't open!
    }

    setOpen(true);
  }, []);

  // Check if currently scrolling (for custom open change handlers)
  const isScrolling = useCallback(() => isScrollingRef.current, []);

  return {
    open,
    setOpen,
    onOpenChange: handleOpenChange,
    isScrolling,
    triggerProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
