# API reference

## Modules

| Module | Description |
| ------ | ------ |
| [Sessions](sessions.md) | Initialise the SDK and manage the user's session: `configure`, `startSession`, `logout`, the sign-in signals, and `forceAttributeSync`. |
| [User profile](user-profile.md) | Set the profile fields Pulsate holds for the current user: first name, last name, email address, gender, age, and phone number. Set the privacy level that decides whether the user receives campaigns. |
| [Attributes and events](attributes-and-events.md) | Store custom attributes on the current user, and send the custom events that campaigns are triggered from. |
| [Feed](feed.md) | Open the Pulsate feed, read its unread count, and control who is allowed to see it. |
| [In-app notifications](in-app-notifications.md) | Control whether in-app messages are shown, how long a small banner stays on screen, and re-show a withheld message. |
| [Push notifications](push-notifications.md) | The per-user push preference and clearing the notification tray. Native push setup is in the platform guides. |
| [Location](location.md) | Turn Pulsate's location tracking on or off, read the last known fix, and follow geofence crossings. |
| [Events](events.md) | Subscribe to the events the SDK initiates. |
| [Errors](errors.md) | The error type every promise rejects with, and the rejection types. |
