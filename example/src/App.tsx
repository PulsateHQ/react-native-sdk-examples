import { useEffect, useState } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, useColorScheme } from 'react-native';

import { configure } from '@pulsatehq/react-native-sdk';

import { startCoexistListeners } from './coexist/bootstrap';
import { DEFAULT_APP_ID, DEFAULT_APP_KEY } from './credentials';
import { flushPendingLink, navigationRef } from './links/navigation';
import { logAppEvent, startListenerRegistry } from './log/registry';
import { AttributesScreen } from './screens/AttributesScreen';
import { DeeplinksScreen } from './screens/DeeplinksScreen';
import { FeedScreen } from './screens/FeedScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InAppScreen } from './screens/InAppScreen';
import { LinkTargetScreen } from './screens/LinkTargetScreen';
import { LocationScreen } from './screens/LocationScreen';
import { LogScreen } from './screens/LogScreen';
import { PushScreen } from './screens/PushScreen';
import { SessionsScreen } from './screens/SessionsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { RootStackParamList } from './screens/routes';
import { resolveCredentials } from './storage/credentialStore';
import { ToastHost, describeRejection, showToast, useTheme } from './ui';

const Stack = createNativeStackNavigator<RootStackParamList>();

// SESS-01: configure at bootstrap — the integration flow a partner app
// actually uses, and what keeps every screen (not only Sessions) working on a
// fresh launch. The Sessions and Settings inputs stay as manual overrides for
// the idempotency and rejection paths.
async function autoConfigure(credentials: {
  appId: string;
  appKey: string;
}): Promise<void> {
  if (!credentials.appId || !credentials.appKey) {
    logAppEvent(
      'configure.bootstrap',
      'Skipped: credentials.local.ts is blank.'
    );
    return;
  }
  try {
    await configure(credentials);
    logAppEvent('configure.bootstrap', 'Dispatched: configure resolved.');
  } catch (error: unknown) {
    const { code, message } = describeRejection(error);
    logAppEvent('configure.bootstrap', `Rejected [${code}]: ${message}`);
  }
}

export default function App() {
  const { colors } = useTheme();
  const isDark = useColorScheme() === 'dark';

  useEffect(() => startListenerRegistry({ notify: showToast }), []);

  useEffect(() => startCoexistListeners(), []);

  const [credentials, setCredentials] = useState<{
    appId: string;
    appKey: string;
  } | null>(null);
  useEffect(() => {
    const seeded = { appId: DEFAULT_APP_ID, appKey: DEFAULT_APP_KEY };
    resolveCredentials(seeded)
      .catch((error: unknown) => {
        // A failed read falls through to the seed, per resolveCredentials'
        // own contract — a storage fault must not blank the whole app.
        logAppEvent(
          'credentials.load',
          `Rejected, using the seed: ${error instanceof Error ? error.message : String(error)}`
        );
        return seeded;
      })
      .then((resolved) => {
        setCredentials(resolved);
        autoConfigure(resolved);
      });
  }, []);

  const navigationTheme: Theme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
    fonts: isDark ? DarkTheme.fonts : DefaultTheme.fonts,
  };

  if (credentials === null) {
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingLink}
      theme={navigationTheme}
    >
      {/* react-native-screens draws the header under the status bar, so on
          Android 15+ (edge-to-edge enforced) the icons sit on our light
          surface and must follow the scheme or they disappear. backgroundColor
          only matters on API < 35, where it paints the opaque bar the header
          colour; Android 15+ ignores it. barStyle also sets the iOS bar, since
          UIViewControllerBasedStatusBarAppearance is false. */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Pulsate example' }}
        />
        <Stack.Screen name="Sessions" options={{ title: 'Sessions & User' }}>
          {/* §6 rule 3: credentials are injected here, never imported by the
              screen. */}
          {() => (
            <SessionsScreen
              defaultAppId={credentials.appId}
              defaultAppKey={credentials.appKey}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
          {() => (
            <SettingsScreen
              seededAppId={DEFAULT_APP_ID}
              seededAppKey={DEFAULT_APP_KEY}
              resolvedAppId={credentials.appId}
              resolvedAppKey={credentials.appKey}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Attributes"
          component={AttributesScreen}
          options={{ title: 'Attributes & Events' }}
        />
        <Stack.Screen
          name="Feed"
          component={FeedScreen}
          options={{ title: 'Feed / Inbox' }}
        />
        <Stack.Screen
          name="InApp"
          component={InAppScreen}
          options={{ title: 'In-App' }}
        />
        <Stack.Screen
          name="Push"
          component={PushScreen}
          options={{ title: 'Push & Badges' }}
        />
        <Stack.Screen
          name="Deeplinks"
          component={DeeplinksScreen}
          options={{ title: 'Deeplinks' }}
        />
        {/* Not on the Home menu: the only way here is the onLink handler
            routing to it. */}
        <Stack.Screen
          name="LinkTarget"
          component={LinkTargetScreen}
          options={{ title: 'Deeplink target' }}
        />
        <Stack.Screen
          name="Location"
          component={LocationScreen}
          options={{ title: 'Location' }}
        />
        <Stack.Screen
          name="Log"
          component={LogScreen}
          options={{ title: 'Log' }}
        />
      </Stack.Navigator>
      <ToastHost />
    </NavigationContainer>
  );
}
