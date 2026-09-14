package pulsatehq.reactnativesdk.example

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.pulsatehq.reactnativesdk.PulsatePush

class ExampleFirebaseMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    // `true` means Pulsate consumed the message and has already posted the
    // notification, synchronously on this thread — image downloads included,
    // so the call is not instant. A `false` would be this app's cue to pass the message
    // to another push library; there is none in this app, so it is logged
    // and dropped. Safe before configure(): the SDK exists from process
    // start, and in a process FCM started to deliver this push, JavaScript
    // may never run at all.
    if (PulsatePush.onMessageReceived(message)) {
      Log.i(TAG, "Pulsate consumed message ${message.messageId} from ${message.from}")
      return
    }
    Log.i(TAG, "Pulsate declined message ${message.messageId}: data keys ${message.data.keys.joinToString()}")
  }

  override fun onNewToken(token: String) {
    PulsatePush.onNewToken(token)
    ExamplePushRegistration.record(token)
  }

  private companion object {
    const val TAG = "ExamplePush"
  }
}
