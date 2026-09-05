import { decodePreferences, encodePreferences } from './preferences.ts';
import type { Preferences } from './preferences.ts';

export const PREFERENCE_KEY = 'vadstena.preferences.v1';

export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;

export type StoredPreference = {
  value: Preferences;
  status: 'default' | 'saved' | 'invalid' | 'unavailable';
};

export function createPreferenceStore(getStorage: () => StoragePort) {
  let state: StoredPreference;
  try {
    const loaded = decodePreferences(getStorage().getItem(PREFERENCE_KEY));
    state = { value: loaded.value, status: loaded.source };
  } catch {
    state = { value: { version: 1, goreEnabled: true }, status: 'unavailable' };
  }

  function read(): StoredPreference {
    return { ...state, value: { ...state.value } };
  }

  function setGore(goreEnabled: boolean): StoredPreference {
    state = { value: { version: 1, goreEnabled }, status: 'saved' };
    try {
      getStorage().setItem(PREFERENCE_KEY, encodePreferences(state.value));
    } catch {
      state.status = 'unavailable';
    }
    return read();
  }

  return { read, setGore };
}
