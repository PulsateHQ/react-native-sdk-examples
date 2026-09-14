import Foundation
import React
import UIKit
import UserNotifications

@objc(ExamplePushRegistration)
final class ExamplePushRegistration: NSObject {
  private static let lock = NSLock()
  private static var registrationOutcome: String?

  static func record(deviceToken: Data) {
    let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
    record("Registered. Token \(hex.prefix(8))…\(hex.suffix(4)) (\(hex.count / 2) bytes).")
  }

  static func record(error: Error) {
    record("Registration failed: \(error.localizedDescription)")
  }

  private static func record(_ outcome: String) {
    lock.lock()
    defer { lock.unlock() }
    registrationOutcome = outcome
  }

  static func logRegisteredCategories(after event: String) {
    logRegisteredCategories(after: event, label: "t+0")
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
      logRegisteredCategories(after: event, label: "t+2s")
    }
  }

  private static func logRegisteredCategories(after event: String, label: String) {
    UNUserNotificationCenter.current().getNotificationCategories { categories in
      let identifiers = categories.map(\.identifier).sorted()
      // Pulsate registers a double-figure set of its own `PUL…` identifiers;
      // printing them all would bury the one identifier this run is about.
      let pulsate = identifiers.filter { $0.hasPrefix("PUL") }
      let others = identifiers.filter { !$0.hasPrefix("PUL") }
      NSLog(
        "[coexist] categories after %@: %@ %d ids: %@ (+%d PUL*)",
        event,
        label,
        identifiers.count,
        others.isEmpty ? "none" : others.joined(separator: ", "),
        pulsate.count
      )
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  /// Resolves the granted flag rather than rejecting on a denial: a "no" is an
  /// answer, not a failure — the same rule the library's own surface follows.
  @objc
  func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    UNUserNotificationCenter.current()
      .requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
        if let error {
          reject("AUTHORIZATION_ERROR", error.localizedDescription, error)
          return
        }
        if granted {
          // Registering is main-thread-only, and the callback arrives off it.
          DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
          }
        }
        resolve(granted)
      }
  }

  @objc
  func getRegistrationOutcome(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject _: @escaping RCTPromiseRejectBlock
  ) {
    Self.lock.lock()
    defer { Self.lock.unlock() }
    resolve(Self.registrationOutcome)
  }
}
