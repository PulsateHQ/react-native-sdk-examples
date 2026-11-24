# Links

Choose where the web links Pulsate hands your app open: in the app, or in
the system browser.

## Functions

### setUrlOpenMode()

```ts
function setUrlOpenMode(mode): Promise<void>;
```

Chooses where [openUrl](#openurl) opens web links.

`'inApp'` opens http and https links in the in-app browser: a
`SFSafariViewController` on iOS and a Chrome Custom Tab on Android, on top
of your app. Closing it returns the user to where they were. `'external'`
opens them in the system browser, outside your app. The choice is stored on
the device and survives restarts, updates and sign-outs.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mode` | [`UrlOpenMode`](#urlopenmode) |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `VALIDATION_ERROR` when the value is neither `'inApp'` nor `'external'`.
  The [UrlOpenMode](#urlopenmode) type prevents this in TypeScript. The rejection
  names the value it was given.

#### Remarks

- Pulsate opens nothing by itself in a React Native app, because the link
  listener hands every link to [\`onLink\`](events.md#addlistener). The mode
  applies to the links your own `onLink` handler passes to [openUrl](#openurl).
- Call it right after [Sessions.configure](sessions.md#configure) resolves. The call rejects
  until then. On the first launch after an upgrade, a link that cold-started
  the app can reach your handler before the mode is stored and open once
  with the previous mode: on Android it arrives as soon as you subscribe,
  on iOS when [Sessions.configure](sessions.md#configure) resolves.

#### Example

```ts
await configure({ appId, appKey });
await setUrlOpenMode('inApp');
```

***

### getUrlOpenMode()

```ts
function getUrlOpenMode(): Promise<UrlOpenMode>;
```

Reports the stored URL open mode for this device.

Reads the choice [setUrlOpenMode](#seturlopenmode) writes.

#### Returns

`Promise`\<[`UrlOpenMode`](#urlopenmode)\>

`'external'` until a mode has been set, `'inApp'` or `'external'`
after.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `VALUE_ERROR` when the SDK answers a mode outside [UrlOpenMode](#urlopenmode). The
  rejection names the mode it was given. The SDK versions this package wraps
  answer only the two modes.

#### Example

```ts
const mode = await getUrlOpenMode();
```

***

### openUrl()

```ts
function openUrl(url): Promise<boolean>;
```

Opens a web link the way Pulsate opens its own, under the current
[UrlOpenMode](#urlopenmode).

Call it from your [\`onLink\`](events.md#addlistener) handler for the links your
app does not route itself, in place of `Linking.openURL`. Pulsate does not
call `onLink` for a link opened this way.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `url` | `string` |

#### Returns

`Promise`\<`boolean`\>

`true` when the SDK started opening the link. `false` when `url` is
not an http or https URL with a host, or, on Android, when nothing on the
device could open it. Nothing opens for `false`. A `false` answer resolves
rather than rejecting, so you can fall back to `Linking.openURL`.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` on iOS before [Sessions.configure](sessions.md#configure) has
  resolved. On Android it works before [Sessions.configure](sessions.md#configure), so a link
  that cold-started the app opens as soon as your handler receives it.

#### Remarks

- Only http and https URLs open. `tel:`, `mailto:`, custom schemes and a
  string with no scheme resolve `false`.
- Route your own Universal Links and App Links before calling it. Pulsate
  cannot tell them from web pages, so under `'inApp'` an https link to your
  own domain opens in the in-app browser instead of in your app.
- Call it while your app is in the foreground, on both platforms. On
  Android, `true` means Android accepted the start. From the background,
  Android 10 and later can still block it.

#### Example

```ts
addListener('onLink', async (url) => {
  if (url.startsWith('myapp://')) {
    navigate(url);
    return;
  }
  const opened = await openUrl(url).catch(() => false);
  if (!opened) {
    Linking.openURL(url);
  }
});
```

## Type Aliases

### UrlOpenMode

```ts
type UrlOpenMode = "inApp" | "external";
```

Where [openUrl](#openurl) opens a web link.

`'external'` is the mode in force before anything has written one.
