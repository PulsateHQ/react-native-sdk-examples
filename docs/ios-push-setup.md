# Set up push notifications on iOS

At the end of this page your bare React Native app receives Pulsate push
notifications on a physical iPhone, including notifications with images.
Your existing push library keeps working beside Pulsate. This page is for
apps that own their `AppDelegate` and Xcode project.

If you use Expo prebuild, follow [Set up the Expo config plugin](expo.md)
instead. The plugin performs steps 3 and 4 for you, and step 5 when you set
`iosRichPush` to `true`. It also writes the entitlement and the background
mode from step 1, point 4. The rest of step 1, and steps 2 and 6, stay
yours. The Android guide is [Set up push notifications on Android](android-push-setup.md).

## Requirements

- React Native 0.76 or newer with the New Architecture enabled.
- iOS 15.1 or newer as the app's deployment target.
- A paid Apple Developer Program membership. Push notifications are not
  available to free teams.
- `@pulsatehq/react-native-sdk` installed and `configure()` resolved, as in
  [Getting started](getting-started.md).
- A physical iPhone for verification. The simulator cannot receive remote
  push notifications.
- If the app also uses notifee: `@notifee/react-native` 7.9.0 or newer.

## 1. Register the app with APNs and Pulsate

1. In the Apple Developer portal, under **Certificates, Identifiers &
   Profiles → Keys**, create an APNs authentication key (`.p8`) with the
   **Apple Push Notifications service** enabled. Note the key ID and your
   team ID. One key serves both the APNs sandbox and production. Apple
   describes the procedure in
   [Establishing a token-based connection to APNs](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).
2. Under **Identifiers**, make sure the app's App ID has the **Push
   Notifications** capability enabled. Regenerate provisioning profiles after
   enabling it.
3. In the Pulsate dashboard, open **Settings → App Settings** and find
   **Apple Push Notification Service (APNs)**. Select **P8**, upload the
   `.p8` file with **Upload Certificate**, and fill in **Apple Bundle ID**,
   **Apple Key ID** and **Apple Team ID**. Save.
4. In Xcode, select the app target, open **Signing & Capabilities**, and add
   the **Push Notifications** capability. Add the **Background Modes**
   capability and check **Remote notifications**. Apple describes the
   procedure in
   [Adding capabilities to your app](https://developer.apple.com/documentation/xcode/adding-capabilities-to-your-app).

Step 4 writes the `aps-environment` entitlement and adds
`remote-notification` to `UIBackgroundModes` in `Info.plist`.

> [!IMPORTANT]
> Two settings decide whether a push arrives, and they must match. Your build
> configuration decides whether the device token comes from the APNs sandbox
> or production. The Pulsate app's mode, **Development Mode** or
> **Production Mode** in **Settings → App Manager**, decides which APNs
> endpoint Pulsate sends to. A debug build registered with a Production Mode
> app receives no push, and no error is surfaced. Use two Pulsate apps,
> one in each mode, and select the matching SDK App ID and SDK App Key per
> build configuration. There is no SDK call that switches this.

## 2. Request authorization and register for remote notifications

The Pulsate SDK does not request notification authorization and does not call
`registerForRemoteNotifications()`. Your app does both. Ask at a point that
makes sense in your product, then register on the main thread.

```swift
// Anywhere in your app, for example a "Turn on notifications" action
import UIKit
import UserNotifications

func requestPushAuthorization() {
  UNUserNotificationCenter.current()
    .requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
      guard granted else { return }
      DispatchQueue.main.async {
        UIApplication.shared.registerForRemoteNotifications()
      }
    }
}
```

The same request from Objective-C:

```objective-c
// Anywhere in your app, for example a "Turn on notifications" action
#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>

void RequestPushAuthorization(void)
{
  UNAuthorizationOptions options = UNAuthorizationOptionAlert |
                                   UNAuthorizationOptionBadge |
                                   UNAuthorizationOptionSound;
  [[UNUserNotificationCenter currentNotificationCenter]
      requestAuthorizationWithOptions:options
                    completionHandler:^(BOOL granted, NSError *error) {
                      if (!granted) {
                        return;
                      }
                      dispatch_async(dispatch_get_main_queue(), ^{
                        [[UIApplication sharedApplication] registerForRemoteNotifications];
                      });
                    }];
}
```

Registration produces a device token, which reaches Pulsate through the
`AppDelegate` callback in the next step.

If your app registers its own notification categories, register them at
startup, before you request the token. See
[How it works](#how-it-works) for why the order matters.

### Let users turn Pulsate push off

Pulsate keeps its own push preference for each user, separate from the
notification authorization above. Use it for an in-app switch such as
"Offers and news".

```ts
// src/settings/pulsatePush.ts
import { isPushEnabled, setPushEnabled } from '@pulsatehq/react-native-sdk';

export async function applyPushChoice(wantsPush: boolean) {
  await setPushEnabled(wantsPush);
}

export async function readPushChoice() {
  return isPushEnabled();
}
```

Rules for this switch:

- It never shows the system prompt, and it never revokes the authorization.
  A user can have Pulsate push on and notifications denied in **Settings**.
- `isPushEnabled()` answers the value set on this device at once. Pulsate
  receives the first change at once. The last change made inside the next
  sixty seconds is sent at the end of that minute, and the changes before it
  are dropped.
- On iOS a failed send is not reported and the local value stays.

To remove notifications already on screen, call `clearAllNotifications()`.
It removes every notification the app has posted, including those from other
libraries, and sets the app-icon badge to zero. The SDK does the same on
`logout()` and when a session starts for a different alias.

## 3. Forward the AppDelegate callbacks

You keep your `AppDelegate`; Pulsate does not replace it. Add the calls
marked `// Pulsate` to the five methods below. A method may already exist
because the app has deep links or another push library. In that case, merge
the Pulsate call into the existing body rather than adding a second method.

```swift
// AppDelegate.swift
import PulsateReactNative   // Pulsate
import React
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  // … your existing didFinishLaunchingWithOptions and the rest …

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    PulsatePush.didRegisterForRemoteNotifications(deviceToken: deviceToken)   // Pulsate
    // Keep the calls your other push library needs here, for example:
    // Messaging.messaging().apnsToken = deviceToken
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    PulsatePush.didFailToRegisterForRemoteNotifications(error: error)   // Pulsate
  }

  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    // true: Pulsate consumed the payload and calls completionHandler itself.
    if PulsatePush.didReceiveRemoteNotification(userInfo, fetchCompletionHandler: completionHandler) {   // Pulsate
      return
    }
    // Not a Pulsate notification. Hand it to your other push library, which
    // now owns completionHandler. If you have no other library, call
    // completionHandler(.noData) here.
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if PulsatePush.application(open: url, options: options) {   // Pulsate
      return true
    }
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if PulsatePush.application(continue: userActivity, restorationHandler: restorationHandler) {   // Pulsate
      return true
    }
    return RCTLinkingManager.application(
      application, continue: userActivity, restorationHandler: restorationHandler)
  }
}
```

> [!NOTE]
> This sample subclasses `UIResponder` and declares each method itself. If
> your `AppDelegate` inherits these methods from `RCTAppDelegate` or
> `ExpoAppDelegate`, mark each one `override`. Call `super` where the sample
> hands the callback on.

The same calls from Objective-C:

```objective-c
// AppDelegate.mm
#import "AppDelegate.h"
#import <PulsateReactNative/PulsateReactNative-Swift.h>   // Pulsate
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

// … your existing didFinishLaunchingWithOptions and the rest …

- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [PulsatePush didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];   // Pulsate
}

- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [PulsatePush didFailToRegisterForRemoteNotificationsWithError:error];   // Pulsate
}

- (void)application:(UIApplication *)application
    didReceiveRemoteNotification:(NSDictionary *)userInfo
          fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  if ([PulsatePush didReceiveRemoteNotification:userInfo
                        fetchCompletionHandler:completionHandler]) {   // Pulsate
    return;
  }
  // Not a Pulsate notification. Chain to your other push library, or call
  // completionHandler(UIBackgroundFetchResultNoData).
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  if ([PulsatePush applicationOpenURL:url options:options]) {   // Pulsate
    return YES;
  }
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(NSUserActivity *)userActivity
      restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *))restorationHandler
{
  if ([PulsatePush applicationContinueUserActivity:userActivity
                                restorationHandler:restorationHandler]) {   // Pulsate
    return YES;
  }
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

@end
```

Rules for this step:

- Forward both token callbacks every time iOS calls them. Neither carries a
  payload to inspect, and the SDK decides what to do with each one.
- The notification callback returns whether Pulsate consumed the payload. On
  `true`, Pulsate calls the completion handler. On `false`, the handler is
  still yours. Exactly one branch calls it, exactly once.
- `openURL` and `continueUserActivity` return whether Pulsate consumed the
  URL. Pulsate claims only its own URLs, so `false` is the normal answer for
  your deep links. The `false` branch must end in `RCTLinkingManager`. That
  call is the only source of React Native's `Linking` `url` event. It also
  delivers universal links to JavaScript.
- Do not forward the application lifecycle callbacks
  (`applicationDidBecomeActive` and the others). The SDK observes them
  itself.

> [!WARNING]
> `PulsateConfig` has two options, `iosPulsateAppDelegate` and
> `iosPulsateNotificationDelegate`. Leave both at their default, `false`. If
> you set one to `true`, the SDK takes over that delegate and forwards to
> your original delegate itself. If your delegate then also forwards to
> Pulsate, the two forward to each other in a loop and the app freezes. With
> `iosPulsateAppDelegate: true`, remove every call in this step. With
> `iosPulsateNotificationDelegate: true`, remove every call in step 4, and
> note that notifications from other senders are then never presented.

## 4. Chain the notification-centre delegate

Your app owns the `UNUserNotificationCenterDelegate`. Set it in
`didFinishLaunchingWithOptions`, then chain both callbacks through Pulsate
first and fall through on `false`.

Claim the delegate first. Add the line before the return of
`application(_:didFinishLaunchingWithOptions:)`, ahead of any other push
library's setup.

```swift
// AppDelegate.swift, inside application(_:didFinishLaunchingWithOptions:)
UNUserNotificationCenter.current().delegate = self   // Pulsate
```

```objective-c
// AppDelegate.mm, inside application:didFinishLaunchingWithOptions:
[UNUserNotificationCenter currentNotificationCenter].delegate = self;   // Pulsate
```

Then implement the two delegate callbacks.

```swift
// AppDelegate.swift
import PulsateReactNative   // Pulsate
import UserNotifications

extension AppDelegate: UNUserNotificationCenterDelegate {
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if PulsatePush.willPresent(notification, withCompletionHandler: completionHandler) {   // Pulsate
      return
    }
    // Not a Pulsate notification. Chain to your other push library if it has
    // a forwarding entry point; otherwise choose the presentation here.
    completionHandler([.banner, .list, .badge, .sound])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if PulsatePush.didReceive(response, withCompletionHandler: completionHandler) {   // Pulsate
      return
    }
    // Same rule: chain if you can, and call the handler exactly once.
    completionHandler()
  }
}
```

The block below is the same `@implementation AppDelegate` as in step 3, with
the step 3 methods still in it.

```objective-c
// AppDelegate.mm
#import "AppDelegate.h"
#import <PulsateReactNative/PulsateReactNative-Swift.h>   // Pulsate
#import <UserNotifications/UserNotifications.h>

@interface AppDelegate () <UNUserNotificationCenterDelegate>
@end

@implementation AppDelegate

// … your existing methods, including the step 3 callbacks …

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler
{
  if ([PulsatePush willPresentNotification:notification
                     withCompletionHandler:completionHandler]) {   // Pulsate
    return;
  }
  completionHandler(UNNotificationPresentationOptionBanner |
                    UNNotificationPresentationOptionList |
                    UNNotificationPresentationOptionBadge |
                    UNNotificationPresentationOptionSound);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
    didReceiveNotificationResponse:(UNNotificationResponse *)response
             withCompletionHandler:(void (^)(void))completionHandler
{
  if ([PulsatePush didReceiveNotificationResponse:response
                            withCompletionHandler:completionHandler]) {   // Pulsate
    return;
  }
  completionHandler();
}

@end
```

> [!IMPORTANT]
> A notification whose completion handler is never called is not presented.
> Exactly one branch calls the handler, exactly once, in both methods.

### If the app has another push library

Only one object can be the notification-centre delegate. Firebase Messaging
and notifee claim it during their own setup and chain back to the delegate
they find. Keep the delegate yours, as above, and chain to the other library
on the `false` branch. Then:

1. Stop the other library from claiming the delegate. For Firebase Messaging,
   set `FirebaseAppDelegateProxyEnabled` to `NO` in `Info.plist`.
2. Hand Firebase the APNs token yourself. That flag also disables Firebase's
   token swizzle, so add `Messaging.messaging().apnsToken = deviceToken`
   (Objective-C: `[FIRMessaging messaging].APNSToken = deviceToken`) inside
   `didRegisterForRemoteNotificationsWithDeviceToken`, in the slot step 3
   leaves for it. Without this line the app gets no Firebase push at all.
3. Use notifee 7.9.0 or newer. Older versions never forward a tap on a
   notification they did not post. Every Pulsate tap is then lost while iOS
   still foregrounds the app.

Firebase Messaging and notifee install their delegate after
`didFinishLaunching` returns and chain back to yours. Your `false`
branches are the end of the chain and must call the completion handler. The
presentation options you pass in `willPresent` are the ones iOS honours.
RNFirebase's `messaging_ios_foreground_presentation_options` in
`firebase.json` has no effect in an app wired this way.

`expo-notifications` behaves differently. It installs its own delegate only
while no other object holds one, and it does not chain to a delegate that is
already set. An app that claims the delegate as step 4 shows keeps it, and
`expo-notifications` forwards nothing, so its notification handlers do not
run. The two cannot share the delegate in either order.

## 5. Add the Notification Service Extension

Campaigns with an image are sent with `mutable-content: 1`. iOS attaches the
image only if the app ships a Notification Service Extension. Without one the
notification still arrives, as text.

The extension is a target in your app. It links no Pulsate framework and
needs no App Group. Apple describes the mechanism in
[Modifying content in newly delivered notifications](https://developer.apple.com/documentation/usernotifications/modifying-content-in-newly-delivered-notifications).

1. In Xcode, choose **File → New → Target… → Notification Service
   Extension**. Name the target `PulsateNotificationService`.
2. Give the target the bundle identifier
   `<YOUR_BUNDLE_ID>.PulsateNotificationService`. The Expo config plugin
   generates the same name and identifier, so both paths produce the same
   target.
3. Register that identifier and a provisioning profile in the Apple Developer
   portal.
4. Set the extension's deployment target no higher than the app's.
5. Replace the generated `NotificationService` source with the file below.

```swift
// NotificationService.swift
import UserNotifications

/// Attaches the media Pulsate sends as two top-level `userInfo` keys: `au`,
/// the URL, and `at`, the file extension. Any failure delivers the
/// notification unmodified.
final class NotificationService: UNNotificationServiceExtension {
  private static let attachmentUrlKey = "au"
  private static let attachmentTypeKey = "at"

  /// Guards the handler: the download completes on a URLSession queue while
  /// `serviceExtensionTimeWillExpire` arrives on main, and calling the handler
  /// twice kills the extension.
  private let lock = NSLock()
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var originalContent: UNNotificationContent?
  private var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    self.originalContent = request.content
    let bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent
    self.bestAttemptContent = bestAttemptContent

    let userInfo = request.content.userInfo
    guard
      let bestAttemptContent,
      let attachmentUrlString = userInfo[Self.attachmentUrlKey] as? String,
      let attachmentType = userInfo[Self.attachmentTypeKey] as? String,
      let attachmentUrl = URL(string: attachmentUrlString)
    else {
      deliverBestAttempt()
      return
    }

    let session = URLSession(configuration: .default)
    session.downloadTask(with: attachmentUrl) { [weak self] location, _, _ in
      guard let self else { return }
      guard
        let location,
        let attachment = Self.makeAttachment(from: location, extension: attachmentType)
      else {
        deliverBestAttempt()
        return
      }
      deliverBestAttempt { bestAttemptContent.attachments = [attachment] }
    }.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    deliverBestAttempt()
  }

  private static func makeAttachment(from location: URL, extension fileExtension: String) -> UNNotificationAttachment? {
    let typedUrl = URL(fileURLWithPath: location.path + "." + fileExtension)
    do {
      try FileManager.default.moveItem(at: location, to: typedUrl)
      return try UNNotificationAttachment(identifier: "", url: typedUrl, options: nil)
    } catch {
      return nil
    }
  }

  /// Takes the handler under the lock and delivers exactly once. `mutate` runs
  /// inside the locked region, so an attachment is never written while the
  /// expiry path is handing the same object to the system.
  private func deliverBestAttempt(mutate: () -> Void = {}) {
    lock.lock()
    let handler = contentHandler
    contentHandler = nil
    if handler != nil { mutate() }
    let content: UNNotificationContent? = bestAttemptContent ?? originalContent
    lock.unlock()
    guard let handler, let content else { return }
    handler(content)
  }
}
```

The same extension in Objective-C:

```objective-c
// NotificationService.m
#import <UserNotifications/UserNotifications.h>

static NSString *const PulsateAttachmentUrlKey = @"au";
static NSString *const PulsateAttachmentTypeKey = @"at";

/// Attaches the media Pulsate sends as two top-level `userInfo` keys: `au`,
/// the URL, and `at`, the file extension. Any failure delivers the
/// notification unmodified.
@interface NotificationService : UNNotificationServiceExtension
@end

@implementation NotificationService {
  /// Guards the handler: the download completes on a URLSession queue while
  /// `serviceExtensionTimeWillExpire` arrives on main, and calling the handler
  /// twice kills the extension.
  NSLock *_lock;
  void (^_contentHandler)(UNNotificationContent *);
  UNNotificationContent *_originalContent;
  UNMutableNotificationContent *_bestAttemptContent;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _lock = [[NSLock alloc] init];
  }
  return self;
}

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:(void (^)(UNNotificationContent *))contentHandler
{
  _contentHandler = [contentHandler copy];
  _originalContent = request.content;
  _bestAttemptContent = [request.content mutableCopy];

  NSDictionary *userInfo = request.content.userInfo;
  NSString *urlString = userInfo[PulsateAttachmentUrlKey];
  NSString *attachmentType = userInfo[PulsateAttachmentTypeKey];
  NSURL *attachmentUrl = [urlString isKindOfClass:[NSString class]]
                             ? [NSURL URLWithString:urlString]
                             : nil;
  if (_bestAttemptContent == nil || attachmentUrl == nil ||
      ![attachmentType isKindOfClass:[NSString class]]) {
    [self deliverBestAttempt:nil];
    return;
  }

  NSURLSession *session = [NSURLSession
      sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
  __weak NotificationService *weakSelf = self;
  [[session downloadTaskWithURL:attachmentUrl
              completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
                NotificationService *strongSelf = weakSelf;
                if (strongSelf == nil) {
                  return;
                }
                UNNotificationAttachment *attachment =
                    location == nil ? nil
                                    : [NotificationService attachmentFrom:location
                                                                extension:attachmentType];
                if (attachment == nil) {
                  [strongSelf deliverBestAttempt:nil];
                  return;
                }
                [strongSelf deliverBestAttempt:^(UNMutableNotificationContent *content) {
                  content.attachments = @[ attachment ];
                }];
              }] resume];
}

- (void)serviceExtensionTimeWillExpire
{
  [self deliverBestAttempt:nil];
}

+ (UNNotificationAttachment *)attachmentFrom:(NSURL *)location
                                   extension:(NSString *)fileExtension
{
  NSString *typedPath = [location.path stringByAppendingFormat:@".%@", fileExtension];
  NSURL *typedUrl = [NSURL fileURLWithPath:typedPath];
  NSError *error = nil;
  if (![[NSFileManager defaultManager] moveItemAtURL:location toURL:typedUrl error:&error]) {
    return nil;
  }
  return [UNNotificationAttachment attachmentWithIdentifier:@""
                                                        URL:typedUrl
                                                    options:nil
                                                      error:&error];
}

/// Takes the handler under the lock and delivers exactly once. The `mutate`
/// block runs inside the locked region, so an attachment is never written
/// while the expiry path is handing the same object to the system.
- (void)deliverBestAttempt:(void (^)(UNMutableNotificationContent *))mutate
{
  [_lock lock];
  void (^handler)(UNNotificationContent *) = _contentHandler;
  _contentHandler = nil;
  if (handler != nil && mutate != nil) {
    mutate(_bestAttemptContent);
  }
  UNNotificationContent *content = _bestAttemptContent ?: _originalContent;
  [_lock unlock];
  if (handler == nil || content == nil) {
    return;
  }
  handler(content);
}

@end
```

> [!WARNING]
> The extension is a separately signed binary with its own App ID and
> provisioning profile. If it is signed incorrectly, all pushes stop
> arriving, not only the ones with images. After adding the target, verify on
> a device that plain text pushes still arrive before you test images.

## 6. Verify

Use a development build on a physical iPhone and a Pulsate app in
**Development Mode**.

1. Launch the app, trigger your authorization request from step 2, and accept
   the prompt. Start a session with a test alias. The alias appears in the
   dashboard under **Users**.
2. Send a test push to that user from the dashboard. It arrives on the
   device.
3. Repeat with the app in the foreground, in the background, and terminated.
   In the foreground the banner is shown through `willPresent`.
4. Tap the notification. The app opens and the campaign's action runs.
5. Send a campaign with an image. The notification shows the image.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No device token; `didFailToRegister…` fires | The Push Notifications capability or the `aps-environment` entitlement is missing, or the provisioning profile predates enabling it | Step 1, point 4. Regenerate the profile |
| Token registers and the user appears in the dashboard, but no push arrives | APNs environment mismatch: a development build against a Production Mode app, or the reverse | Step 1, the callout. Match the build to the app's mode in **App Manager** |
| Pushes arrive but the dashboard records no opens, and campaign actions do not run | A forwarding call in step 3 or 4 is missing, or the notification is not a Pulsate one | Log `userInfo["sender"]` in `didReceive`; it must be `Pulsate`. Confirm `PulsatePush.didReceive` returns `true` |
| Your own deep links or universal links stopped reaching JavaScript | The `false` branch of `openURL` or `continueUserActivity` returns `false` instead of calling `RCTLinkingManager` | Step 3. End both `false` branches in `RCTLinkingManager` |
| The app hangs or crashes shortly after a notification | A delegate flag in `PulsateConfig` is `true` and the app still forwards | Step 3, the warning. Set the flag back to `false` or remove the forwarding |
| Notifications from your other push library stop appearing | `iosPulsateNotificationDelegate` is `true`, or a `false` branch never calls the completion handler | Step 4. Set the flag to `false`; call the handler exactly once on every branch |
| No Firebase push after adding Pulsate | `FirebaseAppDelegateProxyEnabled` is `NO` and the APNs token is no longer handed to Firebase | Step 4, the coexistence section, point 2. Set `Messaging.messaging().apnsToken` in the token callback |
| A tap on a Pulsate notification opens the app but nothing is recorded | notifee older than 7.9.0 drops taps on notifications it did not post | Step 4, the coexistence section, point 3. Update `@notifee/react-native` to 7.9.0 or newer |
| The notification arrives without its image | No Notification Service Extension, the extension is signed incorrectly, or its deployment target is above the device's iOS version | Step 5 |
| Your other push library's action buttons are gone | Your categories were registered during a token callback and were overwritten | Step 2. Register your categories at startup, before you request the token |

## How it works

**Ownership of the completion handler.** Each notification callback carries
a completion handler that iOS expects exactly one call on. The SDK's own
handling of a payload it does not recognise never calls the handler.
Forwarding every payload to Pulsate would leave foreign notifications
unpresented and the app held awake until iOS times it out. The bridge
therefore checks the payload's `sender` key first, `Pulsate` or
`PulsateDebug`, and calls the SDK only on a match. The boolean each
`PulsatePush` method returns tells you who now owns the handler.
`PulsatePush.isPulsateNotification(_:)` exposes the same check if you want
to route earlier.

**Callbacks before `configure()`.** The Pulsate SDK object exists only after
`configure()` runs. In a React Native app that is after JavaScript has
started, later than a cold-start push tap. The bridge holds the device token
and up to eight pending notifications and replays them when `configure()`
completes, token first. So the forwarding calls are safe from the first line
of `didFinishLaunchingWithOptions`.

**Notification categories.** When the device token is forwarded, the SDK
registers its own action-button categories with `setNotificationCategories`,
which replaces the whole set. The bridge reads the categories registered
before the forward. Once the SDK has written its own, the bridge registers
the union of both sets once on the main queue. Identifiers are deduplicated,
and where an identifier is Pulsate's own, Pulsate's definition wins. This
runs on every token forward, including the replay after `configure()` and a
token refresh. It cannot protect a registration that lands between the
bridge's read and its write. Your categories therefore belong at startup,
before the token is requested. If the app cannot register early, register
the union yourself in place of your own `setNotificationCategories` call:

```swift
import UserNotifications
import PULPulsate

func registerCategories(_ mine: Set<UNNotificationCategory>) {
  guard let manager = PULPulsateFactory.getDefaultInstance()?
    .getPulsateSystemManager() as? PULSystemManager else { return }

  var byIdentifier: [String: UNNotificationCategory] = [:]
  for category in manager.getAllNotificationCategories() {
    byIdentifier[category.identifier] = category
  }
  for category in mine { byIdentifier[category.identifier] = category }

  UNUserNotificationCenter.current()
    .setNotificationCategories(Set(byIdentifier.values))
}
```

The `guard` registers nothing before `configure()` has run, because there is
no SDK object yet and registering your set alone would wipe Pulsate's. Call
it again once `configure()` resolves.

**Lifecycle callbacks.** The bridge observes the `UIApplication` state
notifications itself, so session start and stop need no wiring from you.

**`continueUserActivity`.** Pulsate does nothing with user activities in
this version. The call is part of the wiring so a later SDK version works
without an integration change.

**What a Pulsate payload looks like.** The gating key is `sender` at the top
level of `userInfo`:

```json
{
  "aps": { "alert": { "title": "…", "body": "…" }, "sound": "default" },
  "sender": "Pulsate"
}
```

`PulsateDebug` marks a silent command push. The SDK handles it and presents
nothing. A push with an image adds `"mutable-content": 1` inside `aps`, plus
the `au` and `at` keys beside `sender`. A push from any other provider has no `sender` key, or a
different value, and is not forwarded to Pulsate.
