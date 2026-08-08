import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import Layout from './Layout';
import PwaStatus from './PwaStatus';
import { DEFAULT_PAGE, findNavItem, type PageId } from './navigation';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>(DEFAULT_PAGE);
  useTheme();

  const ActiveComponent = findNavItem(activePage).component;

  return (
    <>
      <Layout activePage={activePage} onNavigate={setActivePage}>
        <ActiveComponent onNavigate={setActivePage} />
      </Layout>
      <PwaStatus />
    </>
  );
}
