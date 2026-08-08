import { useMemo } from 'react';
import { checkAllocation } from '@/lib/validation';
import type { Category } from '@/types';
import { useAppState } from './useApp';

export function useCategories(): readonly Category[] {
  return useAppState().categories;
}

export function useActiveCategories(): Category[] {
  const categories = useCategories();
  return useMemo(() => categories.filter((c) => !c.archived), [categories]);
}

/** Whether the percentage categories add up to 100%, for the nudge banner. */
export function useAllocationStatus() {
  const categories = useCategories();
  return useMemo(() => checkAllocation(categories), [categories]);
}

/** Fast id → category lookup for rendering names and colours in lists. */
export function useCategoryLookup(): Map<string, Category> {
  const categories = useCategories();
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}
