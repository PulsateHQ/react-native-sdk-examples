package pulsatehq.reactnativesdk.example

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.google.firebase.messaging.FirebaseMessaging

/**
 * Host responsibilities, kept in the host — the Android counterpart of the
 * iOS `ExamplePushRegistration` helper.
 *
 * On Android the notification prompt is a runtime permission, asked from
 * JavaScript with `PermissionsAndroid` (see `examplePushRegistration.ts`), so
 * this module carries only the registration readout: the FCM token. A refresh
 * arrives in the messaging service, long after any screen asked, so it is
 * recorded here and read back on demand; when nothing was refreshed in this
 * process, the current token is read from Firebase instead.
 */
object ExamplePushRegistration {
  @Volatile
  private var registrationOutcome: String? = null

  fun record(token: String) {
    registrationOutcome =
      "Token refreshed in this process: ${abbreviate(token)}. " +
        "Forwarded to Pulsate; user sync forced."
  }

  fun recordedOutcome(): String? = registrationOutcome

  fun abbreviate(token: String): String = "${token.take(8)}…${token.takeLast(4)} (${token.length} chars)"
}

class ExamplePushRegistrationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ExamplePushRegistration"

  /**
   * Resolves the outcome text, or `null` while Firebase has issued no token.
   * Reading the token is a `Task`; a failed read is a genuine failure and
   * rejects, but "no token yet" is an answer and resolves `null`.
   */
  @ReactMethod
  fun getRegistrationOutcome(promise: Promise) {
    ExamplePushRegistration.recordedOutcome()?.let {
      promise.resolve(it)
      return
    }
    // A build without google-services.json has no google_app_id resource, so
    // FirebaseInitProvider skips default-app init (the plugin runs with
    // missingGoogleServicesStrategy = WARN, so the build still succeeds) and
    // getInstance() throws IllegalStateException — a rejection, not a red box,
    // so the screen still says what is missing.
    val messaging =
      try {
        FirebaseMessaging.getInstance()
      } catch (error: IllegalStateException) {
        promise.reject("TOKEN_ERROR", error.message ?: "Firebase is not configured in this build.", error)
        return
      }
    // One completion listener rather than success + failure: a cancelled Task
    // fires neither of those, and a promise that never settles hangs the screen.
    messaging.token.addOnCompleteListener { task ->
      val token = if (task.isSuccessful) task.result else null
      when {
        task.isSuccessful && !token.isNullOrEmpty() ->
          promise.resolve("Token present: ${ExamplePushRegistration.abbreviate(token)}.")
        task.isSuccessful -> promise.resolve(null)
        else ->
          promise.reject(
            "TOKEN_ERROR",
            task.exception?.message ?: "Firebase could not read the FCM token.",
            task.exception
          )
      }
    }
  }
}

class ExamplePushRegistrationPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ExamplePushRegistrationModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
