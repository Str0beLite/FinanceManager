import type { AppState, Settings } from '@/types';

export type SettingsAction = { type: 'settings/update'; changes: Partial<Settings> };

export function settingsReducer(state: AppState, action: SettingsAction): AppState {
  switch (action.type) {
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.changes } };

    default:
      return state;
  }
}
