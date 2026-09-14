import { Platform } from 'react-native';
import notifee from '@notifee/react-native';

import { record } from './record';

export const COEXIST_CATEGORY_ID = 'coexist-test-category';
export const COEXIST_ACTION_ID = 'coexist-test-action';

/**
 * iOS only: `setNotificationCategories` is a `UNUserNotificationCenter` call
 * and notifee's Android side has no equivalent — the same iOS-only guard the
 * rest of the rig uses.
 *
 * Returns nothing: bootstrap must not wait on it, and it reports its own
 * outcome to the Log screen either way.
 */
export function registerCoexistTestCategory(): void {
  if (Platform.OS !== 'ios') {
    return;
  }
  registerAsync();
}

async function registerAsync(): Promise<void> {
  try {
    await notifee.setNotificationCategories([
      {
        id: COEXIST_CATEGORY_ID,
        actions: [{ id: COEXIST_ACTION_ID, title: 'Coexist button' }],
      },
    ]);
    const registered = await notifee.getNotificationCategories();
    record('notifee', 'setNotificationCategories', {
      registered: registered.map((category) => category.id).sort(),
    });
  } catch (error: unknown) {
    record('notifee', 'setNotificationCategories.rejected', String(error));
  }
}
