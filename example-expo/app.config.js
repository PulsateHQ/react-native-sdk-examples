// CommonJS, not app.json, for one reason: `android.googleServicesFile` must be
// set ONLY when the file is actually next to this config. Expo prebuild fails
// hard when the key points at a missing file, and this repo does not carry
// `google-services.json` (CI never has one). JSON has no conditionals.
const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES = path.join(__dirname, 'google-services.json');

// These identifiers are Pulsate's own, so this example builds without
// setup. Change both to identifiers registered to your own Apple and
// Firebase accounts before testing push, then re-run `npm run prebuild`.
const IOS_BUNDLE_ID = 'pulsate.reactnativesdk.app';
const ANDROID_PACKAGE = 'pulsatehq.reactnativesdk.example';

module.exports = () => ({
  expo: {
    name: 'PulsateExpoExample',
    slug: 'pulsate-expo-example',
    scheme: 'pulsateexpo',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#4d68ac',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IOS_BUNDLE_ID,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#4d68ac',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: ANDROID_PACKAGE,
      ...(fs.existsSync(GOOGLE_SERVICES)
        ? { googleServicesFile: './google-services.json' }
        : {}),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        '@pulsatehq/react-native-sdk',
        {
          iosRichPush: true,
          androidNotificationIcon: './assets/pulsate-status-icon.png',
          theme: {
            colors: {
              bigInAppOneButton: '#FF00AA',
              bigInAppHeader: '#00E5FF',
              inAppRipple: '#FFD400',
            },
            android: {
              strings: { pulsate_notification_channel_name: 'Pulsate Alerts' },
            },
          },
        },
      ],
    ],
  },
});
