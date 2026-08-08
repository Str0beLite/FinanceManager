import {
  createContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { monthKeyOf } from '@/lib/dates';
import { loadState, saveState } from '@/lib/storage';
import type { AppState } from '@/types';
import { rootReducer, type AppAction } from './rootReducer';

interface AppContextValue {
  readonly state: AppState;
  readonly dispatch: Dispatch<AppAction>;
  /** Which month the UI is looking at. Not persisted — it resets to today. */
  readonly selectedMonth: string;
  readonly selectMonth: (key: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(rootReducer, undefined, () => loadState());
  const [selectedMonth, selectMonth] = useState(() => monthKeyOf());

  // Persist on every change. The state object is small enough that writing the
  // whole thing is simpler — and less bug-prone — than tracking dirty slices.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo(
    () => ({ state, dispatch, selectedMonth, selectMonth }),
    [state, selectedMonth],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
