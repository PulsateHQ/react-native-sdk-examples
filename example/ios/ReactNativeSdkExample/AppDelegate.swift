import FirebaseCore
import FirebaseMessaging
import PulsateReactNative
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
      return true
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    if FirebaseApp.app() == nil,
      Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    }

    // PUSH-02: this app owns the UNUserNotificationCenter delegate and chains
    // by sender, which is the configuration partners run. Claiming it here,
    // before any push SDK's own setup, is what keeps the chaining in one place.
    UNUserNotificationCenter.current().delegate = self

    // iOS 27 SDK: the window is created by SceneDelegate, not here.

    return true
  }

  // MARK: - PUSH-02 registration callbacks

  // Forwarded unconditionally: no payload to inspect. Safe before configure()
  // — the bridge buffers and replays.
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    PulsatePush.didRegisterForRemoteNotifications(deviceToken: deviceToken)

    if FirebaseApp.app() != nil {
      Messaging.messaging().apnsToken = deviceToken
    }

    ExamplePushRegistration.record(deviceToken: deviceToken)

    ExamplePushRegistration.logRegisteredCategories(after: "token")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    PulsatePush.didFailToRegisterForRemoteNotifications(error: error)
    ExamplePushRegistration.record(error: error)

    ExamplePushRegistration.logRegisteredCategories(after: "token failure")
  }

  // MARK: - PUSH-02 notification and URL callbacks

  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    // `true` means Pulsate owns the completion handler from here. A `false`
    // would be this app's cue to hand the payload to another push SDK; there
    // is none in this app, so the handler is settled here instead.
    if PulsatePush.didReceiveRemoteNotification(
      userInfo,
      fetchCompletionHandler: completionHandler
    ) {
      return
    }
    completionHandler(.noData)
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if PulsatePush.application(open: url, options: options) {
      return true
    }
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if PulsatePush.application(continue: userActivity, restorationHandler: restorationHandler) {
      return true
    }
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

}

extension AppDelegate: UNUserNotificationCenterDelegate {
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if PulsatePush.willPresent(notification, withCompletionHandler: completionHandler) {
      return
    }
    // `false` is the sender gate doing its job: the payload is not Pulsate's,
    // the SDK was never called, and the handler is this app's again. Presenting
    // the notification here is the host behaviour the gate exists to make
    // possible, not a leak past it.
    completionHandler([.banner, .list, .badge, .sound])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if PulsatePush.didReceive(response, withCompletionHandler: completionHandler) {
      return
    }
    completionHandler()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}

// iOS 27 SDK requires the UIScene lifecycle. Push callbacks stay on the
// AppDelegate / UNUserNotificationCenter; only the window and URL opens move.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    let appDelegate = UIApplication.shared.delegate as? AppDelegate
    appDelegate?.window = window
    if let factory = appDelegate?.reactNativeFactory {
      // A launch URL reaches JS only through these launch options:
      // `Linking.getInitialURL()` reads nothing else, and an RCTLinkingManager
      // call here is lost because the Linking module is not listening yet.
      // Pulsate is not offered the URL either: before `configure()` it
      // answers false.
      var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
      if let url = connectionOptions.urlContexts.first?.url {
        launchOptions[.url] = url
      }
      factory.startReactNative(
        withModuleName: "ReactNativeSdkExample", in: window, launchOptions: launchOptions)
    } else {
      window.rootViewController = UIViewController()
      window.makeKeyAndVisible()
    }
  }

  // Empty options: Pulsate and RCTLinkingManager read only the URL.
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      if PulsatePush.application(open: context.url, options: [:]) {
        continue
      }
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    if PulsatePush.application(continue: userActivity, restorationHandler: { _ in }) {
      return
    }
    RCTLinkingManager.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
