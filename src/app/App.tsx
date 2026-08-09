import { useState } from 'react';
import { useBankAutoSync } from '@/hooks/useBank';
import { useTheme } from '@/hooks/useTheme';
import { isOAuthRedirect } from '@/lib/oauthSession';
import Layout from './Layout';
import PwaStatus from './PwaStatus';
import { DEFAULT_PAGE, findNavItem, type PageId } from './navigation';

export default function App() {
  // A bank returning from its own sign-in page reloads the app, and the screen
  // that knows how to finish the connection is Settings — so open there rather
  // than on the dashboard, where nothing would happen at all.
  const [activePage, setActivePage] = useState<PageId>(() =>
    isOAuthRedirect() ? 'settings' : DEFAULT_PAGE,
  );
  useTheme();
  // Mounted once, here: whatever cleared at the bank since last time is already
  // counted by the time the dashboard is on screen.
  useBankAutoSync();

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
