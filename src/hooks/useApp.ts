import { useContext } from 'react';
import { AppContext } from '@/store/AppContext';

/** The one way into app state. Throws early if a component escapes the provider. */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}

export function useAppState() {
  return useApp().state;
}

export function useDispatch() {
  return useApp().dispatch;
}

export function useSettings() {
  return useApp().state.settings;
}
