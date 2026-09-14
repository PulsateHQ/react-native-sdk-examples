# Update the user profile and privacy

At the end of this page your app stores the user's name, email address,
gender, age and phone number in Pulsate. It also records whether the user
wants Pulsate campaigns. The page covers bare React Native and Expo apps alike.

## Requirements

- `@pulsatehq/react-native-sdk` installed and `configure()` resolved, as in
  [Getting started](getting-started.md).
- A session started with an alias, as in
  [Getting started](getting-started.md) step 3. Every step below assumes it
  is running.

## 1. Start the session first

Set profile fields and the privacy level after `startSession()` resolves.
Both SDKs keep these values for the user of the running session.

```ts
// src/pulsate/signIn.ts
import { startSession } from '@pulsatehq/react-native-sdk';

export async function signInToPulsate(alias: string) {
  await startSession(alias);
}
```

A value set before the session starts can be lost or can be stored for a
different user:

- On both platforms a profile field set before `startSession()` is not seen
  by the session that follows.
- On Android a privacy level set while no alias is active is discarded,
  unless a session starts within sixty seconds.
- On iOS the privacy level belongs to the device. A level set for one user
  stays in force for the next user who signs in on that device.

## 2. Set the profile fields

Call one function per field. Each call replaces the stored value.

```ts
// src/pulsate/syncProfile.ts
import {
  updateAge,
  updateEmail,
  updateFirstName,
  updateGender,
  updateLastName,
  updatePhoneNumber,
} from '@pulsatehq/react-native-sdk';

export async function syncProfile(user: AppUser) {
  await updateFirstName(user.firstName);
  await updateLastName(user.lastName);
  await updateEmail(user.email);
  await updateGender(user.gender);           // 'male' or 'female'
  await updateAge(user.age);                 // whole years
  await updatePhoneNumber(user.phoneE164);   // for example '+14155552671'
}
```

`AppUser` stands for your own user type. Its `gender` is `'male'` or
`'female'`, the two values `updateGender` accepts.

| Function | Accepts | Rejects with `VALIDATION_ERROR` |
|---|---|---|
| `updateFirstName`, `updateLastName` | Any string | Never |
| `updateEmail` | Any string. The address is not parsed | Never |
| `updateGender` | `'male'` or `'female'` | Any other value |
| `updateAge` | A whole number of years | A decimal, `NaN`, an infinity, or a whole number outside the safe integer range |
| `updatePhoneNumber` | A number in E.164 form | Never. An invalid number is dropped with no error |

Every call on this page also rejects with `CONFIGURATION_ERROR` before
`configure()` resolves.

Rules for this step:

- An empty string does not clear a field on the server. Blank fields are left
  out of the update the SDK sends.
- Nothing checks the values beyond the table. A negative age or an address
  without `@` is stored as given.
- Send phone numbers in E.164 form: `+`, the country code and the number,
  with no spaces. Each platform drops numbers it considers invalid, and the
  two apply different rules. A number outside E.164 can be kept on one
  platform and dropped on the other. An empty phone number is dropped on
  both platforms.
- A resolved promise means the value was handed to the SDK, not that it was
  stored or sent.

## 3. Get the profile to Pulsate

A profile change on its own sends nothing. The SDK sends the profile the next
time it sends the user's data to Pulsate. It does that only when something
else is pending: a custom attribute, or a user action such as a push. On
Android a delivered push counts. On iOS the push must reach the app, which a
campaign push does when the user opens it.
`forceAttributeSync()` does not send a profile change on its own.

When the app also writes custom attributes, write the profile first. The
request that carries the attributes then carries the whole profile too.

```ts
// src/pulsate/syncProfileAndPlan.ts
import { createAttribute, forceAttributeSync } from '@pulsatehq/react-native-sdk';

import { syncProfile } from './syncProfile';

export async function syncProfileAndPlan(user: AppUser) {
  await syncProfile(user);
  await createAttribute('plan', user.plan);
  forceAttributeSync().catch(() => {});   // Not awaited: it can stay pending on iOS
}
```

See [Send custom attributes and events](attributes-and-events.md) for when
that request leaves on each platform. A profile edit with no attribute
behind it waits for the next such push.

## 4. Record the privacy level

`setPrivacy` records whether the user wants Pulsate campaigns. Unlike the
profile fields, it sends its own request.

```ts
// src/settings/marketingConsent.ts
import { getPrivacy, setPrivacy } from '@pulsatehq/react-native-sdk';

export async function applyMarketingConsent(consented: boolean) {
  await setPrivacy(consented ? 'subscribed' : 'unsubscribed');
}

export async function readMarketingConsent() {
  return (await getPrivacy()) === 'subscribed';
}
```

`getPrivacy()` answers the level you set, before Pulsate has received it.
Before anything has set a level, it answers `'subscribed'`.

Rules for this step:

- Call it once per user decision. On iOS, a second level set while the first
  request is still in flight is dropped when that request succeeds. Do not
  set the level twice in a row.
- The two platforms send at different moments. Android sends `'subscribed'`
  at once and holds `'unsubscribed'` for sixty seconds. iOS sends the first
  change at once and holds any later change until sixty seconds have passed.
- On Android, a `'subscribed'` inside those sixty seconds cancels a held
  `'unsubscribed'`, so only the last choice is sent.
- On iOS a send that fails is kept and sent again at the next successful
  session start. Until then `getPrivacy()` answers a level Pulsate has not
  received.
- On iOS, call `setPrivacy` again after a different user signs in on the
  same device, because the level belongs to the device.
- On Android `getPrivacy()` rejects with `REQUEST_ERROR` when the SDK's local
  store cannot be read.
- Once Pulsate has stored `'unsubscribed'`, it refuses to start a session for
  that user. After a restart, `startSession()` rejects with `REQUEST_ERROR` on
  Android and resolves on iOS. On iOS, `setPrivacy('subscribed')` for the
  same alias lifts the refusal. On Android it does so only on the install
  that sent `'unsubscribed'`, called after the rejected `startSession()` in
  the same process. After a reinstall or on another device the call sends
  nothing, because `'subscribed'` equals the level stored there, and the user
  stays refused.

## Verify

1. Start a session with a test alias, as in step 1.
2. Run step 2 with test values, then step 3. Wait 20 seconds.
3. In the Pulsate dashboard, open **Users** and search for the alias. The
   user shows the name, email address, gender, age and phone number you set.
4. Call `applyMarketingConsent(false)`, then `readMarketingConsent()`. It
   resolves `false`.
5. Wait one minute and reopen the user in the dashboard. The user is
   unsubscribed.
6. Call `applyMarketingConsent(true)` to return the test user to subscribed.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Profile fields never appear in the dashboard | A profile change alone is never sent | Expect them with the next attribute update or push, as in step 3 |
| A field set before sign-in is missing | The field was stored before the session's alias existed | Set fields after `startSession()` resolves, as in step 1 |
| The phone number never appears | The SDK dropped a number it considers invalid | Send the number in E.164 form, as in step 2 |
| The phone number appears on one platform only | The platforms validate numbers differently | Send the number in E.164 form, as in step 2 |
| An emptied field keeps its old value in the dashboard | Blank fields are left out of the update | Send a replacement value instead of an empty string |
| `updateAge` rejects with `VALIDATION_ERROR` | The age is not a whole number, or is outside the safe integer range | Round the age to whole years, as in step 2 |
| `getPrivacy()` answers `'subscribed'` after the user unsubscribed on Android | The level was set while no alias was active | Call `setPrivacy` after `startSession()` resolves, as in step 1 |
| `startSession()` rejects with `REQUEST_ERROR` on Android for a user who unsubscribed earlier | Pulsate refuses a session for an unsubscribed user; iOS resolves in the same state | On the install that unsubscribed, call `setPrivacy('subscribed')` after the rejected `startSession()`, in the same process, then start the session again. After a reinstall or on another device the call sends nothing and the user stays refused |
| The dashboard still shows the old privacy level | The level is held for up to sixty seconds | Wait a minute. On iOS a failed send is retried at the next session start |
| A new user on an iOS device inherits the previous user's level | iOS keeps the level for the device | Call `setPrivacy` after each sign-in, as in step 4 |

## How it works

Profile fields are stored on the device. The SDK sends them in one request
that carries the whole profile along with pending attributes and user
actions. The SDK sends that request only when an attribute or a user action
is waiting, so a profile edit waits for one of them.

The privacy level has a request of its own. The SDK delays it for up to
sixty seconds, so that a quick change of mind becomes one request. Android
keeps the level for each user of the device, and iOS keeps one level for the
device.

## Next steps

- [Send custom attributes and events](attributes-and-events.md)
- [User profile reference](api/user-profile.md)
- [Declare the data the SDK collects](data-collection.md)
