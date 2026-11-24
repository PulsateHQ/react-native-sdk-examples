# Choose where links open

At the end of this page the web links Pulsate hands your app open in the
in-app browser, or in the system browser, as you choose. It is for apps that
already subscribe to `onLink`, as [Getting started](getting-started.md) step 5
shows.

The SDK never opens a link in a React Native app. It hands each one to your
`onLink` handler, and the handler decides. The calls on this page are how a
handler opens a web link under the mode you choose.

## Requirements

- `@pulsatehq/react-native-sdk` 1.3 or later, with `configure()` resolved, as
  in [Getting started](getting-started.md).
- An `onLink` handler that runs at startup. See
  [Subscribe to SDK events](handling-events.md).

## 1. Open web links with `openUrl`

In your `onLink` handler, replace `Linking.openURL` with `openUrl` for the
links your app does not route itself.

```ts
// src/links.ts
import { addListener, openUrl } from '@pulsatehq/react-native-sdk';
import { Linking } from 'react-native';

addListener('onLink', async (url) => {
  if (url.startsWith('myapp://')) {
    routeInsideApp(url);
    return;
  }
  // A web link opens under the mode from step 2. `false` means Pulsate can't
  // open it (not an http or https URL, or on Android nothing on the device
  // can), so hand it to the system.
  const opened = await openUrl(url).catch(() => false);
  if (!opened) {
    Linking.openURL(url).catch(() => {});
  }
});
```

`routeInsideApp` stands for your own routing, as in
[Getting started](getting-started.md) step 5.

> [!IMPORTANT]
> A handler that routes only its own scheme and drops the rest opens nothing
> for every other link. On iOS, a push whose destination type is `url` now
> reaches `onLink` too, so such a handler leaves that push with no effect.
> Pass every link you do not route to `openUrl`.

`openUrl` opens only `http` and `https` URLs that have a host. For `tel:`,
`mailto:`, a custom scheme or a string with no scheme, it resolves `false` and
opens nothing. A `false` answer is not an error, so the `Linking.openURL`
fallback above is the place for those links.

## 2. Choose the mode

After `configure()` resolves, call `setUrlOpenMode`.

```ts
// src/pulsate.ts
import { configure, setUrlOpenMode } from '@pulsatehq/react-native-sdk';

export async function startPulsate() {
  await configure({ appId: '<YOUR_APP_ID>', appKey: '<YOUR_APP_KEY>' });
  await setUrlOpenMode('inApp');
}
```

| Mode | Where `openUrl` opens a web link |
|---|---|
| `'external'` | In the system browser, outside your app. This is the mode before you set one |
| `'inApp'` | In the in-app browser on top of your app: a Safari view controller on iOS, a Chrome Custom Tab on Android. Closing it returns the user to your app |

The mode is stored on the device. It survives restarts, updates and
sign-outs, so you can call `setUrlOpenMode` on every launch. Read it back with
`getUrlOpenMode()`.

If the in-app browser cannot be shown, the link opens in the system browser.
On Android that includes a default browser that has no Custom Tabs support.

## 3. Route your own web links first

Pulsate cannot tell a web page from a Universal Link on iOS or an App Link on
Android that your app owns. Both look like an `https` URL.

If your app handles links on its own domain, route them in the handler before
the `openUrl` call. Under `'inApp'`, an `https` link to your own domain that
reaches `openUrl` opens in the in-app browser, not in your app.

```ts
// src/links.ts
addListener('onLink', async (url) => {
  if (isOwnLink(url)) {
    routeInsideApp(url);
    return;
  }
  const opened = await openUrl(url).catch(() => false);
  if (!opened) {
    Linking.openURL(url).catch(() => {});
  }
});
```

`isOwnLink` stands for a check against your app's own scheme and domains.

## Verify

1. Call `setUrlOpenMode('inApp')`, then `getUrlOpenMode()`. It resolves
   `'inApp'`.
2. Call `openUrl('https://example.com')`. It resolves `true` and the page opens
   in the in-app browser.
3. Close the in-app browser. Your app is on the screen it was on.
4. Call `setUrlOpenMode('external')` and `openUrl('https://example.com')`
   again. The page opens in the system browser.
5. Call `openUrl('tel:123')`. It resolves `false` and nothing opens.
6. Tap a push whose destination is a web URL. The link opens in the browser
   you chose.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A tapped push or button opens nothing | The `onLink` handler neither routes the link nor passes it to `openUrl` | Step 1. Pass every link you do not route to `openUrl` |
| `setUrlOpenMode` or `getUrlOpenMode` rejects with `CONFIGURATION_ERROR`, or `openUrl` does on iOS | `configure()` has not resolved yet | Step 2. Await `configure()` first. In `onLink`, fall back to `Linking.openURL` as in step 1 |
| `setUrlOpenMode` rejects with `VALIDATION_ERROR` | The mode is neither `'inApp'` nor `'external'` | Pass one of the two strings |
| `openUrl` resolves `false` | The URL is not an `http` or `https` URL with a host, or, on Android, nothing on the device can open it | Step 1. Fall back to `Linking.openURL` |
| A link to your own domain opens in the in-app browser | The handler passed it to `openUrl` | Step 3. Route your own links before `openUrl` |
| The first push tap after an upgrade opened in the system browser | The push started the app before `setUrlOpenMode` ran | Expected once. See **How it works** |
| `openUrl` resolves `true` and nothing opens | The app was in the background. On iOS the browser needs a screen to show on, and from Android 10 the system can block a background app from starting the browser | Call `openUrl` while the app is in front |

## How it works

`openUrl` hands the URL to the SDK, which opens it the way it opens its own
links. The SDK does not call your `onLink` handler for it, so a link you pass
to `openUrl` does not come back as another event.

Call `openUrl` while your app is in the foreground, on both platforms. On
iOS, `true` means the SDK started opening the link. On Android, `true` means
Android accepted the start. From the background, Android 10 and later can
still refuse it.

`setUrlOpenMode` rejects until `configure()` has resolved. A push tapped while
the app was not running reaches `onLink` on iOS as soon as `configure()`
resolves, and on Android as soon as you subscribe, which can be before
`configure()` resolves. `openUrl` works then on Android, so the link still
opens. On the first launch after you upgrade, such a link can reach your
handler before your `setUrlOpenMode` call and open once with the previous
mode. Call `setUrlOpenMode` directly after `configure()` resolves to keep that
window as short as it can be. Later launches use the stored mode.

## Next steps

- [Subscribe to SDK events](handling-events.md)
- [Getting started](getting-started.md)
