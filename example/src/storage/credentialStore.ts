import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredCredentials = {
  appId: string;
  appKey: string;
};

const APP_ID_KEY = 'pulsate.example.appId';
const APP_KEY_KEY = 'pulsate.example.appKey';

export async function loadStoredCredentials(): Promise<StoredCredentials | null> {
  const appId = await AsyncStorage.getItem(APP_ID_KEY);
  const appKey = await AsyncStorage.getItem(APP_KEY_KEY);

  if (appId === null || appKey === null) {
    return null;
  }

  return { appId, appKey };
}

export async function saveStoredCredentials(
  credentials: StoredCredentials
): Promise<void> {
  await AsyncStorage.setItem(APP_ID_KEY, credentials.appId);
  await AsyncStorage.setItem(APP_KEY_KEY, credentials.appKey);
}

/** Drops the override so the next cold launch falls back to the seed. */
export async function clearStoredCredentials(): Promise<void> {
  await AsyncStorage.removeItem(APP_ID_KEY);
  await AsyncStorage.removeItem(APP_KEY_KEY);
}

/**
 * What App.tsx resolves at bootstrap: the stored override if there is one,
 * otherwise the seeded defaults.
 */
export async function resolveCredentials(
  seeded: StoredCredentials
): Promise<StoredCredentials> {
  return (await loadStoredCredentials()) ?? seeded;
}
