# Send custom attributes and events

At the end of this page your app sends custom events, which campaigns
trigger on, and stores custom attributes, which segments filter on. Both
appear in the Pulsate dashboard. The page covers bare React Native and Expo apps alike.

## Requirements

- `@pulsatehq/react-native-sdk` installed and `configure()` resolved, as in
  [Getting started](getting-started.md).
- A session started with an alias, as in
  [Getting started](getting-started.md) step 3. Every step below depends on
  it.

## 1. Start a session with an alias

Start the session before the first event. Pulsate learns an event name only
from a session started with an alias. A campaign can trigger only on an event
name Pulsate has learned.

```ts
// src/pulsate/signIn.ts
import { startSession } from '@pulsatehq/react-native-sdk';

export async function signInToPulsate(alias: string) {
  await startSession(alias);
}
```

> [!IMPORTANT]
> Without a session started with an alias, your events never appear in the
> dashboard. Android drops them before sending, and iOS sends them without
> registering the name.

## 2. Send custom events

Call `createEvent` with the event's name when it happens. Use `createEvents`
when one user action produces several events: one request carries them all.

```ts
// src/analytics/pulsateEvents.ts
import { createEvent, createEvents } from '@pulsatehq/react-native-sdk';

export async function trackOffersViewed() {
  await createEvent('viewed_offers');
}

export async function trackCheckoutStarted() {
  await createEvents(['added_to_cart', 'started_checkout']);
}
```

Rules for this step:

- Pulsate receives the name exactly as written. Use one spelling for each
  event everywhere in the app.
- A resolved promise means the event was handed to the SDK, not that Pulsate
  accepted it.
- Do not send an empty name. `createEvent` drops it on Android and sends it
  on iOS; `createEvents` sends it on both.
- When an event triggers an in-app campaign, the SDK shows the message
  itself. No JavaScript event announces it.

## 3. Store custom attributes

Call `createAttribute` with a key and a value. The value's type decides the
type Pulsate stores.

```ts
// src/analytics/pulsateAttributes.ts
import { createAttribute } from '@pulsatehq/react-native-sdk';

export async function saveMembership(member: Member) {
  await createAttribute('plan', member.plan);                // string
  await createAttribute('loyalty_points', member.points);    // whole number
  await createAttribute('newsletter', member.newsletter);    // boolean
  await createAttribute('signed_up_at', member.signedUpAt);  // Date
}
```

`Member` stands for your own type.

| Value in JavaScript | Stored in Pulsate as |
|---|---|
| `string` | String |
| Whole number from -2147483648 to 2147483647 | Integer |
| Any other number from 3.4028234663852886e38 down to about 7e-46 in magnitude | Decimal |
| `NaN`, either infinity, or any other number outside those bounds | Rejected with `VALIDATION_ERROR`. Zero is stored as an integer |
| `boolean` | Boolean |
| `Date` | Date |

Rules for this step:

- Store identifiers, timestamps and amounts of money as strings. Android
  keeps about seven significant digits of a decimal and writes large numbers
  in exponent form, so `1694160000000` arrives as `1.69416E12`.
- Store a date as a string when its exact format matters. The two platforms
  send dates in different formats, and both drop the milliseconds.
- Write each key once before the changes are sent. If a key is written twice,
  Android sends the second value and iOS the first.
- Keep one type per key. On iOS a write whose type differs from a pending
  write for the same key is skipped.
- Do not use an empty key or an empty string value. Both SDKs drop an empty
  key. An empty value is stored on Android and dropped on iOS.
- Write attributes after the session starts. An attribute written before
  `startSession()` or after `logout()` goes to whoever is identified when it
  is sent.
- `createAttribute` rejects with `VALIDATION_ERROR` for `NaN`, either
  infinity, and an invalid `Date`. It also rejects a number above
  3.4028234663852886e38 in magnitude, and a nonzero number below about 7e-46.
  Zero itself is stored. The
  [`createAttribute` reference](api/attributes-and-events.md#createattribute)
  has the same bounds.

## 4. Count with increment and decrement

Use `incrementAttribute` and `decrementAttribute` when the app knows the
change rather than the total. They change the same attribute
`createAttribute` writes.

```ts
// src/analytics/pulsateCounters.ts
import { decrementAttribute, incrementAttribute } from '@pulsatehq/react-native-sdk';

export async function recordPurchase(pointsEarned: number) {
  await incrementAttribute('purchases');
  await incrementAttribute('loyalty_points', pointsEarned);
}

export async function spendCredits(credits: number) {
  await decrementAttribute('credits', credits);
}
```

Rules for this step:

- The step is a whole number from -2147483648 to 2147483647, and defaults
  to `1`. A decimal step, or one outside that range, rejects with
  `VALIDATION_ERROR`. A negative step reverses the direction, and a step of
  `0` changes nothing.
- Only one pending change per key reaches Pulsate each time the changes are
  sent. Android keeps the last change and iOS the first, so two increments of
  one key count once.
- A counter change and a `createAttribute` write on the same key compete the
  same way on Android, where the later call is kept. On iOS a counter change
  on a key with a pending write of another type is discarded.
- When every change must count, keep the total in the app and send it with
  `createAttribute`.

## 5. Send the changes

Attributes and counters wait on the device until the SDK next sends the
user's data to Pulsate. To send them sooner, call `forceAttributeSync()` once,
after the writes.

```ts
// src/analytics/completePurchase.ts
import { forceAttributeSync } from '@pulsatehq/react-native-sdk';

import { recordPurchase } from './pulsateCounters';
import { saveMembership } from './pulsateAttributes';

export async function completePurchase(member: Member, pointsEarned: number) {
  await saveMembership(member);
  await recordPurchase(pointsEarned);
  forceAttributeSync().catch(() => {});   // Not awaited: it can stay pending on iOS
}
```

Rules for this step:

- Call it once per user action, never in a loop.
- On Android it resolves at once, and the update leaves about 15 seconds
  later, when something is pending.
- On iOS it resolves when the data has been sent. The first call in a
  30-second window sends at once. A later call in the same window waits for
  the window to close.
- On iOS the SDK also sends the user's data by itself, inside the same
  30-second window. It does so after a location update or a geofence
  crossing, for example.
  A waiting call can be replaced by one of those sends and then never
  settles. Do not await `forceAttributeSync()` where the user is waiting.
- Custom events do not need it. Each event is sent on its own.

## Verify

1. Start a session with a test alias, as in step 1.
2. Call `createEvent('docs_test_event')`.
3. In the Pulsate dashboard, create a campaign and open its **Target** step.
   `docs_test_event` is in the list of events.
4. Call `createAttribute('docs_test_plan', 'gold')` and then
   `forceAttributeSync()`. Wait 20 seconds.
5. In the dashboard, open **Users**, search for the alias and open the user.
   `docs_test_plan` shows `gold`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| An event never appears in the dashboard | It was sent without a session started with an alias | Start the session first, as in step 1 |
| A campaign never triggers on an event that is listed | The event name differs in spelling, or the user is outside the campaign's segment | Use the exact name, as in step 2. Check the campaign's **Target** step |
| An attribute never appears on the user | The changes have not been sent yet | Call `forceAttributeSync()`, as in step 5 |
| An attribute shows an earlier value | The key was written twice before the changes were sent | Write each key once per send, as in step 3 |
| Two increments count once | Only one pending change per key is sent | Send the total with `createAttribute`, as in step 4 |
| A decimal or a large number differs on Android | Android stores decimals with about seven significant digits | Store the value as a string, as in step 3 |
| A date differs between iOS and Android | The platforms send dates in different formats | Store the date as a string, as in step 3 |
| `createAttribute` rejects with `VALIDATION_ERROR` | The number is not finite or out of range, or the `Date` is invalid | Check the value against the rules in step 3 |
| `incrementAttribute` rejects with `VALIDATION_ERROR` | The step is a decimal or out of range | Pass a whole number, as in step 4 |
| `forceAttributeSync()` never settles on iOS | A later call, or a send the SDK made by itself, replaced it inside the 30-second window | Do not await it, as in step 5 |
| An attribute appears on a different user | It was written before the session started or after `logout()` | Write attributes after `startSession()`, as in step 3 |

## How it works

Custom events are sent as they happen, one request per call. Pulsate adds a
new event name to the dashboard's list the first time it arrives from a
known user. That is why the session with an alias comes first.

Attributes and counter changes are stored on the device. The SDK sends them
in one request, together with the user's profile. It keeps one pending change
per key until that request leaves, which is where the one-change-per-key rule
comes from. `forceAttributeSync()` asks for that request to be sent sooner.

## Next steps

- [Update the user profile and privacy](user-profile.md)
- [Theme in-app messages](theming.md)
- [Attributes and events reference](api/attributes-and-events.md)
