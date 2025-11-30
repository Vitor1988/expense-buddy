import { useState, useRef, useCallback } from 'react';

const DISTANCE_THRESHOLD = 10; // pixels
const TIME_THRESHOLD = 200; // milliseconds

/**
 * Hook for scroll-aware dropdown menu handling on mobile.
 * Prevents menu from opening accidentally during scroll gestures.
 *
 * Uses Pointer Events API with combined distance + time threshold
 * to distinguish between intentional taps and scroll gestures.
 *
 * @see https://github.com/radix-ui/primitives/issues/1912
 * @see https://github.com/radix-ui/primitives/issues/2418
 */
export function useScrollAwareMenu() {
  const [open, setOpen] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wasScrollingRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track touch events (not mouse)
    if (e.pointerType === 'touch') {
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };
      wasScrollingRef.current = false;
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !pointerStartRef.current) return;

    const deltaX = Math.abs(e.clientX - pointerStartRef.current.x);
    const deltaY = Math.abs(e.clientY - pointerStartRef.current.y);

    // If moved more than threshold, it's a scroll
    if (deltaX > DISTANCE_THRESHOLD || deltaY > DISTANCE_THRESHOLD) {
      wasScrollingRef.current = true;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Block click if it was a scroll gesture
    if (wasScrollingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasScrollingRef.current = false;
      pointerStartRef.current = null;
      return;
    }

    // Check time threshold (if took too long, probably slow scroll)
    if (pointerStartRef.current) {
      const elapsed = Date.now() - pointerStartRef.current.time;
      if (elapsed > TIME_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        pointerStartRef.current = null;
        return;
      }
    }

    pointerStartRef.current = null;
  }, []);

  const handlePointerUp = useCallback(() => {
    // Reset after small delay to ensure onClick has executed
    setTimeout(() => {
      wasScrollingRef.current = false;
    }, 50);
  }, []);

  const handlePointerCancel = useCallback(() => {
    pointerStartRef.current = null;
    wasScrollingRef.current = false;
  }, []);

  return {
    open,
    setOpen,
    triggerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onClick: handleClick,
    },
  };
}
