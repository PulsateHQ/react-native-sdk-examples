import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private static let attachmentUrlKey = "au"
  private static let attachmentTypeKey = "at"

  /// Guards the handler: the download completes on a URLSession queue while
  /// `serviceExtensionTimeWillExpire` arrives on main, and calling the handler
  /// twice is a programmer error that kills the extension.
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

  /// Takes the handler under the lock and delivers exactly once. `mutate` runs inside
  /// the locked region, so an attachment is never written while the expiry path is
  /// handing the same object to the system. Falls back to the unmodified request
  /// content if the mutable copy was never made.
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
