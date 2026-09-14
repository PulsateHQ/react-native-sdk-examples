# Show the Pulsate feed

At the end of this page your app opens the Pulsate feed and shows its unread
count. You also decide which users may see what Pulsate delivers. It covers
bare React Native and Expo apps alike, because the feed needs no native setup.

## Requirements

- `@pulsatehq/react-native-sdk` installed, `configure()` resolved and a
  session started with an alias, as in [Getting started](getting-started.md).
- A campaign in the Pulsate dashboard with a feed card, so the feed has
  something to show.

## 1. Open the feed

Call `showFeed()` from a screen that is on display, such as the handler of an
inbox button. The SDK presents the feed full screen over your app.

```tsx
// src/screens/InboxButton.tsx
import { Button } from 'react-native';
import { showFeed } from '@pulsatehq/react-native-sdk';

export function InboxButton() {
  return <Button title="Inbox" onPress={() => showFeed().catch(() => {})} />;
}
```

The feed appears over the current screen. On Android it opens as its own
task, and the system back button closes it. On iOS it has no system back
button, so the user closes it with the arrow in the feed's header.

Rules for this step:

- A resolved promise means the feed was asked for, not that it appeared.
- On iOS `showFeed()` rejects with `REQUEST_ERROR` when there is no visible
  screen to present from. It also rejects when Pulsate hands back nothing that
  can be presented. [Errors](errors.md) lists the causes.
- Do not call it again while the first feed is still animating in. On iOS
  the second call resolves and shows nothing.

## 2. Know when the user comes back

Subscribe to `onFeedClose` once at startup, next to your other Pulsate
listeners. It fires when a feed that `showFeed()` opened closes.

```ts
// index.js
import { addListener, getFeedUnreadCount } from '@pulsatehq/react-native-sdk';

addListener('onFeedClose', () => {
  getFeedUnreadCount().then(setInboxBadge, () => {});
});
```

`setInboxBadge` stands for your own state update. A good use of the event is
refreshing the unread count, because reading the feed changes it.

`onFeedClose` does not fire for a feed Pulsate opened by itself, such as
after a push tap whose destination is the feed. See
[Subscribe to SDK events](handling-events.md) for the full rules.

## 3. Show the unread count

Read the count when a screen that displays it appears, then keep it current
from the events.

```ts
// src/inbox/useUnreadCount.ts
import { useEffect, useState } from 'react';
import { addListener, getFeedUnreadCount } from '@pulsatehq/react-native-sdk';

export function useUnreadCount() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getFeedUnreadCount().then(setUnread, () => {});
    const subscription = addListener('onBadgeUpdate', setUnread);
    return () => subscription.remove();
  }, []);

  return unread;
}
```

Rules for this step:

- The SDK reads the count at most once every 30 seconds, on both platforms.
  A call made sooner waits for the next read, up to 30 seconds, and resolves
  with that count. Calls that wait together resolve with the same number.
- Do not poll. Read the count when a screen appears and when the feed
  closes.
- `0` is also the answer before a user is identified and when the read fails,
  on both platforms. On Android the call rejects with `REQUEST_ERROR` when the
  SDK cannot start the read at all.
- On iOS a read can stay pending. When Pulsate answers with an empty
  response, that read does not settle, and neither do the reads waiting with
  it. They settle once a later read succeeds. Never block a screen on the
  count.
- Rarely, on Android a read that arrives exactly as the 30-second window
  closes is settled by the next read instead of its own.
- On Android `onBadgeUpdate` fires shortly after `configure()` resolves, and
  for each Pulsate push that arrives while the app runs. It does not fire on
  session start or when the feed closes, so read the count at those points.
- On iOS `onBadgeUpdate` fires for a push whose `sender` is `Pulsate` and
  that carries `content-available` and `aps.badge`. The app must declare the
  `remote-notification` background mode. Pulsate campaign pushes carry no
  `content-available`, so iOS relies on the reads above.

## 4. Decide who may see Pulsate content

Pulsate keeps an authorization flag for the current user. When the flag is
`false`, Pulsate refuses content to that user and reports each refusal as
`onUnauthorizedAction`. What it refuses differs by platform:

| Platform | What the flag gates | When the check runs |
|---|---|---|
| Android | The feed | Every time the feed comes to the front |
| iOS | Push campaigns, in-app campaigns, calls to action and action buttons | When Pulsate would act on one |

On iOS the feed itself is not gated. On Android nothing but the feed is.

If your app has its own sign-in, the signals from
[Getting started](getting-started.md) step 4 already set the flag.
`userHasLoggedIn()` sets it to `true`, and `userHasLoggedOut()` sets it to
`false`. Set it directly only when you decide on some other basis, such as a
biometric check.

```ts
// src/auth/pulsateAuthorization.ts
import {
  isUserAuthorized,
  setUserAuthorized,
} from '@pulsatehq/react-native-sdk';

export async function applyPulsateAuthorization(signedIn: boolean) {
  await setUserAuthorized(signedIn);
}

export async function pulsateMayShowContent() {
  return isUserAuthorized();
}
```

`isUserAuthorized(): Promise<boolean>` reports whether the current user is
marked as authorized. It reads the flag on the device, not the one Pulsate
holds.

Rules for this step:

- A new install starts authorized.
- The flag is stored on the device. It reaches Pulsate with the next profile
  update or session start, not with the call itself.
- On iOS `configure()` marks the user authorized again on every launch.
  Apply your own answer after `configure()` resolves, every time the app
  starts. On Android the flag is stored per user and survives a restart.
- On Android, marking a user unauthorized does not close a feed that is
  already open. The feed closes the next time it comes to the front.
- On Android a feed `showLastUnauthorizedMessage()` re-opens stays exempt from
  the check until it closes.
- On Android `isUserAuthorized()` can trail a `userHasLoggedIn()` or a
  `userHasLoggedOut()` for a moment, because those write the flag the same way.

## 5. Bring back what was refused

Subscribe to `onUnauthorizedAction` at startup. When it fires, send the user
to your own sign-in. After they sign in, mark them authorized first, then
ask Pulsate to show what it refused.

```ts
// index.js
import {
  addListener,
  setUserAuthorized,
  showLastUnauthorizedMessage,
} from '@pulsatehq/react-native-sdk';

addListener('onUnauthorizedAction', ({ action }) => {
  console.log('Pulsate refused content', action);
  openSignIn({
    onSignedIn: async () => {
      await setUserAuthorized(true);
      await showLastUnauthorizedMessage();
    },
  });
});
```

`openSignIn` stands for your own sign-in flow. `userHasLoggedIn()` makes the
same two calls. It also turns in-app messages on and shows the last withheld
in-app message. Use it only when that is what you want.

Rules for this step:

- Keep the order. On iOS `showLastUnauthorizedMessage()` does nothing while
  the user is unauthorized. On Android it shows the feed without checking
  the flag.
- `action` is present on iOS only. It names what was refused and is meant
  for logs. Do not branch on its value.
- On iOS the refused item is shown once. A second call shows nothing.
- The feed this opens does not fire `onFeedClose`. Only a feed `showFeed()`
  opened does.
- Pulsate forgets the refused item when the alias changes at session start, on
  `logout()`, after showing it, and when the app leaves the foreground.
  `userHasLoggedOut()` does not make it forget. Treat a refused item as
  available only for the rest of the foreground session.

## Verify

1. Tap the button from step 1. The feed opens over the app.
2. Close the feed. `onFeedClose` fires once, on both platforms.
3. Mount the hook from step 3. The count resolves to a whole number, and the
   number matches the unread cards in the feed.
4. On Android, call `setUserAuthorized(false)`, then open the feed. The feed
   closes at once, and `onUnauthorizedAction` fires, followed by
   `onFeedClose`.
5. On Android, call `setUserAuthorized(true)` and then
   `showLastUnauthorizedMessage()`. The feed opens again.
6. On iOS, call `setUserAuthorized(false)` and tap a Pulsate push whose
   campaign has a call to action. Nothing opens, and `onUnauthorizedAction`
   fires with an `action` label.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `showFeed()` rejects with `REQUEST_ERROR` on iOS | No screen was visible to present the feed from, often because the call ran during startup, or Pulsate handed back nothing that can be presented | Call it from a mounted screen, as in step 1 |
| `showFeed()` resolves but nothing appears on iOS | A previous feed was still animating in | Call it once per tap. Disable the button until `onFeedClose` fires |
| `onFeedClose` never fires | The feed was opened by Pulsate, not by `showFeed()`, or nothing was subscribed when it closed | Subscribe at startup, as in step 2. Expect no event for feeds Pulsate opens |
| `onFeedClose` fires while the feed is still open on Android | The system recreated the feed screen after a language, font size, dark mode or multi-window change | Treat the event as a hint to refresh, not as proof the feed is gone |
| The unread count takes up to 30 seconds to resolve | Another read ran within the last 30 seconds | Read on screen appearance and on `onFeedClose` only, as in step 3 |
| The unread count never resolves on iOS | Pulsate answered a read with an empty response | Read again later. Never block a screen on the count, as in step 3 |
| The unread count is always `0` | No session with an alias is running, or the read failed on either platform | Start a session first. Retry after 30 seconds |
| The feed closes as soon as it opens on Android | The user is marked unauthorized | Call `setUserAuthorized(true)` or `userHasLoggedIn()`, as in step 4 |
| A user marked unauthorized is authorized again after a restart on iOS | `configure()` authorizes the user on every launch | Apply your own answer after `configure()` resolves, as in step 4 |
| `showLastUnauthorizedMessage()` shows nothing on iOS | The user was still unauthorized, or the item was already shown once | Call `setUserAuthorized(true)` first, as in step 5 |
| `showLastUnauthorizedMessage()` shows a feed the user was refused before signing out | `userHasLoggedOut()` does not clear the refused item on Android | Call `logout()` when the user's identity should leave the device |

## How it works

The feed is a screen the SDK owns. The bridge asks for it and reports its
close; it never embeds the feed in your navigation. On Android the close
event follows the feed screen's destruction. On iOS it follows the screen's
release, which lands a moment after the closing animation.

The unread count is one of Pulsate's heavier requests, so both SDKs allow one
read every 30 seconds. The bridge groups calls that arrive inside that window
and answers them all from the next read. That read also sends pending profile
and attribute changes first, because they can change the count.

The authorization flag lives on the device. On Android it sits in the SDK's
per-user store and is checked whenever the feed comes to the front. On iOS
it sits in the app's defaults, and `configure()` sets it again. It is
checked when Pulsate is about to act on a campaign.

## Next steps

- [Subscribe to SDK events](handling-events.md)
- [Feed reference](api/feed.md)
- [Events reference](api/events.md)
