import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '../screens/routes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * The rule, deliberately the whole of it: this app owns the `pulsate://`
 * scheme, so a `pulsate://` URL names a destination it can render and anything
 * else — an `https://` campaign destination, say — does not and is left to the
 * `Linking.openURL` branch or to nothing at all. A real integrator reads host
 * and path here and picks a route per destination; the example app has one
 * target screen, so the scheme is the entire decision.
 */
function isRoutableLink(url: string): boolean {
  return url.startsWith('pulsate://');
}

let pendingUrl: string | null = null;

export function routeLink(url: string): void {
  if (!isRoutableLink(url)) {
    return;
  }
  if (!navigationRef.isReady()) {
    pendingUrl = url;
    return;
  }
  // `navigate`, not `push`: a second link re-uses the screen with new params
  // instead of stacking a target per tap, which would leave a tester several
  // back gestures from where they started.
  navigationRef.navigate('LinkTarget', { url });
}

/** Consumes a link held across bootstrap. Called from `onReady`. */
export function flushPendingLink(): void {
  if (pendingUrl === null) {
    return;
  }
  const url = pendingUrl;
  pendingUrl = null;
  routeLink(url);
}
