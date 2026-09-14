# Theme in-app messages

At the end of this page your app's in-app messages, and the iOS no-internet
banner, use your own colours. Theming is build-time configuration: you set the
colours in the app config or in native resource files, and a rebuild applies
them. To control when messages appear, see
[Control when in-app messages appear](in-app-messages.md).

Expo apps set the `theme` prop on the config plugin. Bare React Native apps
write the same two artifacts by hand. Both paths reach the same SDK code, so
pick the one that matches your project.

## Requirements

- `@pulsatehq/react-native-sdk` installed and `configure()` resolved, as in
  [Getting started](getting-started.md).
- React Native 0.76 or newer with the New Architecture enabled.
- iOS 15.1 or newer as the app's deployment target.
- Android `minSdkVersion` 28 or higher.
- Expo SDK 53 or newer, for the Expo path.
- A colour value for every key you set, as 6-digit hex: `#RRGGBB`.

## What you can theme

| Surface | Themeable | Set it |
|---|---|---|
| In-app messages, small and big | Colours | This page |
| The iOS feed's no-internet banner | Colours | This page |
| Everything else in the feed | Colours | **Settings → App Settings** in the Pulsate dashboard |
| Push notification text, in-app message text | Content | The campaign builder in the Pulsate dashboard |
| Android system strings the SDK shows | Text | The [Android strings](#android-strings) table on this page |

## 1. Set the colours

### Expo

Add the `theme` prop to the plugin entry, then prebuild.

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "@pulsatehq/react-native-sdk",
        {
          "iosRichPush": true,
          "androidNotificationIcon": "./assets/pulsate-status-icon.png",
          "theme": {
            "colors": {
              "smallInAppBackground": "#101828",
              "smallInAppText": "#FFFFFF",
              "bigInAppBackground": "#FFFFFF",
              "bigInAppHeader": "#0D7AFE",
              "bigInAppAdminName": "#101828",
              "bigInAppAdminTitle": "#667085",
              "bigInAppPersonalMessageBorder": "#D0D5DD",
              "bigInAppHeadline": "#101828",
              "bigInAppBody": "#344054",
              "bigInAppOneButton": "#0D7AFE",
              "bigInAppOneButtonText": "#FFFFFF",
              "bigInAppTwoButton": "#FFFFFF",
              "bigInAppTwoButtonText": "#0D7AFE",
              "bigInAppTwoButtonOutline": "#0D7AFE",
              "bigInAppMessageButtonBackground": "#0D7AFE",
              "bigInAppMessageButtonText": "#FFFFFF",
              "inAppRipple": "#BFDBFE",
              "userNoImageBackground": "#EAECF0",
              "dividerLines": "#D0D5DD",
              "noInternetBackground": "#101828",
              "noInternetText": "#FFFFFF"
            },
            "android": {
              "strings": {
                "pulsate_notification_channel_name": "Alerts"
              }
            }
          }
        }
      ]
    ]
  }
}
```

```sh
npx expo prebuild --clean
```

The prebuild fails if a key is not in the [colour table](#colour-keys) or in
the [Android strings](#android-strings) table. It also fails if a colour is not
`#RRGGBB`, or if an Android string value is empty or only whitespace. The error
names the key and the value.

Set every key you care about in one `colors` block. A key with no artifact on a
platform is written only for the platform that has one.

> [!IMPORTANT]
> Do not edit the generated `ios/` and `android/` folders. The next prebuild
> rewrites them.

### Bare React Native, iOS

In `ios/<YOUR_APP>/Info.plist`, add a `PulsateTheme` dictionary. The keys are
the **iOS raw keys** from the [colour table](#colour-keys), not the config
names. Include only the keys you want to change.

```xml
<!-- ios/<YOUR_APP>/Info.plist -->
<key>PulsateTheme</key>
<dict>
  <key>pulsate_small_in_app_message_background_color</key>
  <string>#101828</string>
  <key>pulsate_big_in_app_message_background_color</key>
  <string>#FFFFFF</string>
  <key>pulsate_big_in_app_header_color</key>
  <string>#0D7AFE</string>
  <key>pulsate_big_in_app_one_btn_color</key>
  <string>#0D7AFE</string>
  <key>pulsate_big_in_app_one_txt_color</key>
  <string>#FFFFFF</string>
  <key>pulsate_big_in_app_two_btn_color</key>
  <string>#FFFFFF</string>
  <key>pulsate_big_in_app_two_txt_color</key>
  <string>#0D7AFE</string>
  <key>pulsate_big_in_app_message_button_background_color</key>
  <string>#0D7AFE</string>
  <key>pulsate_big_in_app_message_button_background_text_color</key>
  <string>#FFFFFF</string>
  <key>pulsate_divider_lines_color</key>
  <string>#D0D5DD</string>
  <key>pulsate_no_internet_connection_background_color</key>
  <string>#101828</string>
  <key>pulsate_no_internet_connection_text_color</key>
  <string>#FFFFFF</string>
</dict>
```

The SDK holds these colours in memory only, so the bridge reads the dictionary
and applies it every time `configure()` succeeds. An app that never calls
`configure()` is never themed, and shows no Pulsate UI either.

### Bare React Native, Android

Create `android/app/src/main/res/values/pulsate_theme.xml`. The resource names
are the **Android resources** from the [colour table](#colour-keys). Same-name
resources in your app module replace the SDK's, so include only what you change.

```xml
<!-- android/app/src/main/res/values/pulsate_theme.xml -->
<resources>
  <color name="pulsate_small_in_app_message_background_color">#101828</color>
  <color name="pulsate_small_in_app_message_text_color">#FFFFFF</color>
  <color name="pulsate_big_in_app_message_background_color">#FFFFFF</color>
  <color name="pulsate_big_in_app_admin_name_text_color">#101828</color>
  <color name="pulsate_big_in_app_admin_title_text_color">#667085</color>
  <color name="pulsate_big_in_app_personal_message_border_color">#D0D5DD</color>
  <color name="pulsate_big_in_app_headline_text_color">#101828</color>
  <color name="pulsate_big_in_app_text_text_color">#344054</color>
  <color name="pulsate_big_in_app_one_button_color">#0D7AFE</color>
  <color name="pulsate_big_in_app_one_button_text_color">#FFFFFF</color>
  <color name="pulsate_big_in_app_two_button_color">#FFFFFF</color>
  <color name="pulsate_big_in_app_two_button_text_color">#0D7AFE</color>
  <color name="pulsate_big_in_app_two_button_outline_color">#0D7AFE</color>
  <color name="pulsate_in_app_ripple">#BFDBFE</color>
  <color name="pulsate_user_no_image_background_color">#EAECF0</color>
  <string name="pulsate_notification_channel_name">Alerts</string>
</resources>
```

## 2. Rebuild

Rebuild the app. On Expo, run `npx expo prebuild --clean` first.

## Verify

1. Run the build. It completes with no warning from
   `@pulsatehq/react-native-sdk`.
2. Start a session and send a small in-app message from the dashboard. Its
   background is the colour you set for `smallInAppBackground`.
3. Send a big in-app message with one button and no button colour set on the
   campaign. The button is the colour you set for `bigInAppOneButton`.

## Colour keys

The config key is what you write on the Expo path. `—` means the platform has no
artifact that reads that colour. A key the platform does not read is accepted
and ignored.

| Config key | iOS raw key | Android resource | What it colours |
|---|---|---|---|
| `smallInAppBackground` | `pulsate_small_in_app_message_background_color` | `pulsate_small_in_app_message_background_color` | Small in-app message background |
| `smallInAppText` | — | `pulsate_small_in_app_message_text_color` | Small in-app message text, corporate variant only. See [Limitations](#limitations) |
| `bigInAppBackground` | `pulsate_big_in_app_message_background_color` | `pulsate_big_in_app_message_background_color` | The big in-app message's card frame. It colours the strips around the content area, not the content |
| `bigInAppHeader` | `pulsate_big_in_app_header_color` | — | The header strip on big and small in-app messages |
| `bigInAppAdminName` | — | `pulsate_big_in_app_admin_name_text_color` | Sender name in the big in-app header |
| `bigInAppAdminTitle` | — | `pulsate_big_in_app_admin_title_text_color` | Sender title in the big in-app header |
| `bigInAppPersonalMessageBorder` | — | `pulsate_big_in_app_personal_message_border_color` | Border around a personal big in-app message |
| `bigInAppHeadline` | — | `pulsate_big_in_app_headline_text_color` | Big in-app headline text |
| `bigInAppBody` | — | `pulsate_big_in_app_text_text_color` | Big in-app body text |
| `bigInAppOneButton` | `pulsate_big_in_app_one_btn_color` | `pulsate_big_in_app_one_button_color` | Single-button background |
| `bigInAppOneButtonText` | `pulsate_big_in_app_one_txt_color` | `pulsate_big_in_app_one_button_text_color` | Single-button label |
| `bigInAppTwoButton` | `pulsate_big_in_app_two_btn_color` | `pulsate_big_in_app_two_button_color` | Two-button background |
| `bigInAppTwoButtonText` | `pulsate_big_in_app_two_txt_color` | `pulsate_big_in_app_two_button_text_color` | Two-button label |
| `bigInAppTwoButtonOutline` | — | `pulsate_big_in_app_two_button_outline_color` | Two-button stroke |
| `bigInAppMessageButtonBackground` | `pulsate_big_in_app_message_button_background_color` | — | Both big in-app buttons' background |
| `bigInAppMessageButtonText` | `pulsate_big_in_app_message_button_background_text_color` | — | Both big in-app buttons' label |
| `inAppRipple` | — | `pulsate_in_app_ripple` | Touch ripple on both in-app buttons |
| `userNoImageBackground` | — | `pulsate_user_no_image_background_color` | Avatar circle behind a sender with no image |
| `dividerLines` | `pulsate_divider_lines_color` | — | Separator under the small in-app message |
| `noInternetBackground` | `pulsate_no_internet_connection_background_color` | — | No-internet banner background |
| `noInternetText` | `pulsate_no_internet_connection_text_color` | — | No-internet banner text |

Twelve keys reach iOS, fifteen reach Android, six reach both. The plugin
accepts only these keys. In a bare Android project you can override any other
SDK colour resource by name.

> [!IMPORTANT]
> On iOS, `bigInAppMessageButtonBackground` and `bigInAppMessageButtonText`
> apply to both buttons. The SDK applies them after the campaign's own colours
> and after `bigInAppOneButton` and `bigInAppTwoButton`, so they take
> precedence over both. Leave them unset to colour the two buttons separately.

## Android strings

Android only. On the Expo path these go in `theme.android.strings`, keyed by the
resource name. In a bare project they are `<string>` entries in
`pulsate_theme.xml`.

| Resource | What it is |
|---|---|
| `pulsate_notification_channel_name` | Push notification channel name, as shown in Android system settings |
| `pulsate_notification_channel_description` | Push notification channel description, same screen |
| `pulsate_feed_error_title` | Feed error dialog title |
| `pulsate_feed_error_retry`, `pulsate_feed_error_exit` | Feed error dialog buttons |
| `pulsate_feed_error_403`, `pulsate_feed_error_404`, `pulsate_feed_error_500`, `pulsate_feed_error_error_opening_file`, `pulsate_feed_error_failed_to_connect`, `pulsate_feed_error_file_not_found`, `pulsate_feed_error_malformed_url`, `pulsate_feed_error_no_internet_connection`, `pulsate_feed_error_ssl_error`, `pulsate_feed_error_ssl_handshake_failed`, `pulsate_feed_error_time_out`, `pulsate_feed_error_unexpected_error`, `pulsate_feed_error_unknown_error`, `pulsate_feed_error_unsupported_url` | Feed error messages, one per failure the web feed reports |
| `big_in_app_content_desc_0` … `big_in_app_content_desc_7` | Screen-reader labels on the big in-app message |
| `content_description_close_in_app_message` | Screen-reader label on the in-app close button |

> [!WARNING]
> The last nine names carry no `pulsate_` prefix. If your app already defines a
> string with one of those names, the two collide and one replaces the other.
> Rename yours.

`pulsate_notification_channel_id` identifies the channel and is not themeable.

## Limitations

| Limit | Detail |
|---|---|
| 6-digit hex only | Every value matches `#RRGGBB`. Three- and eight-digit hex are refused, not padded. |
| No alpha | The iOS SDK drops the alpha channel, so a translucent colour would differ between platforms. |
| No dark mode | Neither SDK ships a dark variant. On Android you can add your own `values-night/` overrides, which on the Expo path means your own config plugin, since the next prebuild rewrites `android/`; iOS has no equivalent. |
| No fonts | Neither SDK exposes a typeface hook. Colours are the whole surface. |
| Keys are per platform | A key with no artifact on a platform reaches only the platform that has one. One `theme` block serves both builds. |
| `smallInAppText` reaches one Android layout | It colours the corporate small in-app message. The personal one takes its text colour from your app theme's `android:textAppearanceSmall`. Override that attribute in your theme to change it |
| Android resource shrinking | The SDK references its `pulsate_*` colours from its layouts, except the two sender-name colours (`bigInAppAdminName`, `bigInAppAdminTitle`), which it names only in code. The default `shrinkResources true` keeps both kinds. With `tools:shrinkMode="strict"`, add those two to a `tools:keep` list. The React Native and Expo templates leave `minifyEnabled` and `shrinkResources` off, and Pulsate builds with them off. If you turn them on, send yourself an in-app message and check the colours |
| Campaign colours beat the one- and two-button keys | On both platforms, a campaign that sets its own button and label colours overrides the four `bigInApp…Button` keys. The key is the fallback. On iOS, `bigInAppMessageButtonBackground` and `bigInAppMessageButtonText` are applied afterwards and win over the campaign. |
| Colours apply to the next message | Colours resolve when a view is built, so a message already on screen keeps the colours it was built with. |
| A change needs a rebuild | There is no runtime theming call. Change the config, rebuild, and on Expo prebuild again. |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Prebuild fails: ``unknown key `<key>` `` | A key is not in the colour table, the Android string table, or is a misspelled `colors` / `android` / `strings` container | Use a config key from the [colour table](#colour-keys). The error lists every valid key at that level |
| Prebuild fails: "is not a six-digit hex colour" | A value is short hex, has alpha, or is a named colour | Write the value as six hex digits after `#` |
| Prebuild fails: "the value must be a non-empty string" | An Android string value is empty or only whitespace | Give the string a value, or remove the key |
| iOS logs `Pulsate: ignoring unknown PulsateTheme key "<key>"` | The `Info.plist` dictionary uses a config key instead of the iOS raw key, or a key with no iOS column | Use the iOS raw key from the colour table |
| iOS logs `Pulsate: ignoring PulsateTheme value for "<key>": "<value>" is not a #RRGGBB colour` | A hand-edited `Info.plist` value is malformed | Correct the value. The other keys still applied |
| Colours change on iOS but not on Android | The Android build did not pick up `pulsate_theme.xml`, or the key has no Android resource | Check the file path and the Android column of the colour table, then rebuild |
| `smallInAppText` changes nothing on a personal small in-app message | That layout takes its text colour from your app theme, not from the resource | Set `android:textAppearanceSmall` in your app theme. The corporate small in-app message uses the resource |
| An in-app button keeps the campaign's colour on Android | The campaign sets `btnColor` or `txtColor`, which wins over the per-button keys there | Clear the colour on the campaign, or accept it. On iOS, `bigInAppMessageButtonBackground` and `bigInAppMessageButtonText` are applied after the campaign's colours |
| The feed is unthemed | Apart from the no-internet banner on iOS, feed colours do not come from this configuration | Set them in **Settings → App Settings** in the Pulsate dashboard |
| Nothing is themed at all | `configure()` never resolved, so no Pulsate UI runs | Follow [Getting started](getting-started.md) |

## How it works

On iOS the SDK's colour API is in-memory and needs a live manager. Nothing can
be applied before `configure()` succeeds, and nothing survives a launch. The
bridge reads the `PulsateTheme` dictionary from the app bundle on every
successful `configure()` and applies each entry. An unknown key or a malformed
value is logged and skipped; `configure()` never fails over a colour.

On Android there is no theming API. The SDK ships its colours and strings as
resources. A same-name resource in your app module replaces the SDK's when the
build merges them. No bridge code runs. The Android key set and the iOS key
set differ because each platform offers what its own SDK reaches.

The Expo plugin writes exactly these two artifacts. It validates the config at
prebuild time, where you are watching, rather than at runtime.

## Next steps

- [Control when in-app messages appear](in-app-messages.md)
- [Getting started](getting-started.md)
