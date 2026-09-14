import { useEffect, useState } from 'react';
import {
  Keyboard,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  configure,
  createEvent,
  startSession,
} from '@pulsatehq/react-native-sdk';

import { LOCAL_APP_ID, LOCAL_APP_KEY } from './credentials.local';
import { logEvent, startListenerRegistry, type LogLine } from './listeners';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useTheme } from './ui/theme';

const EVENT_NAME = 'rn_example_event';

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code, message } = error as { code?: string; message?: string };
    return `[${code ?? 'UNKNOWN'}] ${message ?? ''}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export default function App() {
  const { dark, colors, spacing, radii, type } = useTheme();
  const [lines, setLines] = useState<LogLine[]>([]);
  // `expo` plus a two-digit run number (`expo01`, `expo02`, …): the dashboard
  // cannot tell which build received a push, and this app shares its bundle id
  // (and therefore its device GUID) with the bare example — a distinct alias
  // per run is the only way to tell the two apart in the dashboard. See
  // README, "Shared identity".
  const [alias, setAlias] = useState('expo01');
  const [eventName, setEventName] = useState(EVENT_NAME);

  useEffect(
    () =>
      startListenerRegistry({
        onLine: (line) => setLines((prev) => [line, ...prev].slice(0, 50)),
      }),
    []
  );

  useEffect(() => {
    if (LOCAL_APP_ID === '' || LOCAL_APP_KEY === '') {
      logEvent('configure', 'Skipped: credentials.local.ts is blank.');
      return;
    }
    configure({ appId: LOCAL_APP_ID, appKey: LOCAL_APP_KEY })
      .then(() => logEvent('configure', 'Resolved.'))
      .catch((error: unknown) =>
        logEvent('configure', `Rejected: ${describe(error)}`)
      );
  }, []);

  const onStartSession = () => {
    const trimmed = alias.trim();
    if (trimmed === '') {
      logEvent('startSession', 'Rejected locally: alias is blank.');
      return;
    }
    startSession(trimmed)
      .then(() => logEvent('startSession', `Resolved for "${trimmed}".`))
      .catch((error: unknown) =>
        logEvent('startSession', `Rejected: ${describe(error)}`)
      );
  };

  const onCreateEvent = () => {
    // ATTR-03: sent exactly as typed, no trim and no blank guard, the same as
    // the bare example — the contract specifies no validation for the name.
    createEvent(eventName)
      .then(() => logEvent('createEvent', `Resolved for "${eventName}".`))
      .catch((error: unknown) =>
        logEvent('createEvent', `Rejected: ${describe(error)}`)
      );
  };

  const onRequestPermission = () => {
    if (Platform.OS !== 'android') {
      return;
    }
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    )
      .then((result) => logEvent('push.permission', `Result: ${result}.`))
      .catch((error: unknown) =>
        logEvent('push.permission', `Failed: ${describe(error)}`)
      );
  };

  const input = {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...type.body,
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.bg,
          gap: spacing.md,
          padding: spacing.lg,
          paddingTop: spacing.xl * 3,
        },
      ]}
    >
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {/* The title is the XCUITest driver's keyboard-dismissal target: there
          is no ScrollView here to swallow a stray tap, so it dismisses
          explicitly. onPress lives on the Text itself: a Pressable wrapper is
          accessible by default and would hide the StaticText from XCUITest. */}
      <Text
        style={[type.title, { color: colors.text }]}
        onPress={Keyboard.dismiss}
      >
        Pulsate Expo verification
      </Text>

      <Card>
        <TextInput
          testID="sessions-alias-input"
          style={input}
          value={alias}
          onChangeText={setAlias}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="alias"
          placeholderTextColor={colors.textMuted}
        />
        <Button
          testID="Start session (SESS-02)"
          title="Start session (alias)"
          onPress={onStartSession}
        />
      </Card>
      <Card>
        <TextInput
          testID="events-name-input"
          style={input}
          value={eventName}
          onChangeText={setEventName}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="event name"
          placeholderTextColor={colors.textMuted}
        />
        <Button
          testID="Create event (ATTR-03)"
          title="Send event"
          onPress={onCreateEvent}
        />
      </Card>
      {Platform.OS === 'android' ? (
        <Button
          testID="Request permission (PUSH-02)"
          title="Request push permission"
          onPress={onRequestPermission}
          variant="secondary"
        />
      ) : (
        <Text style={[type.caption, { color: colors.textMuted }]}>
          iOS: the host requests authorization natively — see
          docs/ios-push-setup.md.
        </Text>
      )}

      <Card style={styles.log}>
        <ScrollView>
          {/* Name and detail are separate, un-nested Texts on purpose: the
              XCUITest driver matches a detail — the `onLink` URL, the
              `onPushReceived` receipt — as a whole StaticText label, and
              nested Text collapses into one accessibility element on iOS. */}
          {lines.map((line) => (
            <View
              key={line.id}
              style={[
                styles.row,
                { gap: spacing.xs, marginBottom: spacing.xs },
              ]}
            >
              <Text style={[type.caption, styles.line, { color: colors.text }]}>
                {line.name}
              </Text>
              {line.detail === '' ? null : (
                <Text
                  style={[type.caption, styles.line, { color: colors.text }]}
                >
                  {line.detail}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  // padding and background come from the tokens at render time.
  screen: { flex: 1 },
  log: { flex: 1 },
  row: { flexDirection: 'row' },
  line: {
    flexShrink: 1,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});
