'use client';

import { useEffect, useRef } from 'react';
import { processRecurringExpenses } from '@/app/actions/recurring';

export function RecurringProcessor() {
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    processRecurringExpenses().catch(() => {
      // Recurring expense processing failed silently
    });
  }, []);

  return null;
}
