import { useState } from 'react';
import { SegmentedControl, type Segment } from '@/components/ui';
import { CategoriesPage } from '@/features/categories';
import { SubscriptionsPage } from '@/features/subscriptions';

type Section = 'categories' | 'subscriptions';

const SECTIONS: readonly Segment<Section>[] = [
  { value: 'categories', label: 'Categories', icon: 'categories' },
  { value: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
];

/**
 * Both halves of "how a month is set up" behind one tab.
 *
 * Categories and subscriptions were separate tabs, which is two thirds of the
 * bar spent on screens you visit when something changes rather than day to
 * day. Each half is still its own self-contained feature — this only chooses
 * which one is on screen.
 */
export default function PlanPage() {
  const [section, setSection] = useState<Section>('categories');

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Plan section"
        segments={SECTIONS}
        value={section}
        onChange={setSection}
      />
      {section === 'categories' ? <CategoriesPage /> : <SubscriptionsPage />}
    </div>
  );
}
