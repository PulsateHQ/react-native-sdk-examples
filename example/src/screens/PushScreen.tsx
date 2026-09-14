import { useState } from 'react';
import { Platform, Switch, Text } from 'react-native';

import {
  clearAllNotifications,
  isPushEnabled,
  setPushEnabled,
} from '@pulsatehq/react-native-sdk';

import {
  displayCoexistLocalNotification,
  logFcmToken,
} from '../coexist/actions';
import {
  getRegistrationOutcome,
  isPushRegistrationAvailable,
  requestPushAuthorization,
} from '../native/examplePushRegistration';
import {
  Button,
  Card,
  OutcomeRow,
  Row,
  Screen,
  SectionHeader,
  describeRejection,
  type Outcome,
  useTheme,
} from '../ui';

export function PushScreen() {
  const { colors, type } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [setOutcome, setSetOutcome] = useState<Outcome>({ kind: 'idle' });
  const [readOutcome, setReadOutcome] = useState<Outcome>({ kind: 'idle' });
  const [clearOutcome, setClearOutcome] = useState<Outcome>({ kind: 'idle' });
  const [permissionOutcome, setPermissionOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [registrationOutcome, setRegistrationOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [notifeeOutcome, setNotifeeOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [fcmTokenOutcome, setFcmTokenOutcome] = useState<Outcome>({
    kind: 'idle',
  });

  // PUSH-01. The switch is local intent until the button is pressed: the
  // screen deliberately does not write the flag on toggle, so a QA pass can
  // see the write and the read-back as two separate calls.
  const onSetPushEnabled = async () => {
    setSetOutcome({ kind: 'pending' });
    try {
      await setPushEnabled(enabled);
      setSetOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setSetOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onIsPushEnabled = async () => {
    setReadOutcome({ kind: 'pending' });
    try {
      const current = await isPushEnabled();
      setReadOutcome({ kind: 'resolved', detail: `Resolved: ${current}.` });
    } catch (error: unknown) {
      setReadOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onClearAllNotifications = async () => {
    setClearOutcome({ kind: 'pending' });
    try {
      await clearAllNotifications();
      setClearOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setClearOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onRequestPermission = async () => {
    setPermissionOutcome({ kind: 'pending' });
    try {
      const outcome = await requestPushAuthorization();
      setPermissionOutcome({
        kind: 'resolved',
        detail: {
          granted: Platform.select({
            ios: 'Granted. Registration dispatched; the token arrives in the AppDelegate.',
            default:
              'Granted. Pulsate notifications can now be posted; the FCM token exists independently of this prompt.',
          }),
          denied: Platform.select({
            ios: 'Denied. No registration attempted.',
            default:
              'Denied. The FCM token still exists, but nothing can be posted to the tray.',
          }),
          // Android only: the dialog will not be shown again, so the button
          // cannot recover this — only the system settings can.
          blocked:
            'Blocked: Android will not prompt again. Enable notifications for this app in system settings.',
        }[outcome],
      });
    } catch (error: unknown) {
      setPermissionOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onNotifeeLocal = async () => {
    setNotifeeOutcome({ kind: 'pending' });
    try {
      const id = await displayCoexistLocalNotification();
      setNotifeeOutcome({ kind: 'resolved', detail: `Displayed: ${id}.` });
    } catch (error: unknown) {
      setNotifeeOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onLogFcmToken = async () => {
    setFcmTokenOutcome({ kind: 'pending' });
    try {
      const token = await logFcmToken();
      setFcmTokenOutcome({
        kind: 'resolved',
        detail: `Logged: ${token.slice(0, 12)}… (${token.length} chars).`,
      });
    } catch (error: unknown) {
      setFcmTokenOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onReadRegistrationOutcome = async () => {
    setRegistrationOutcome({ kind: 'pending' });
    try {
      const outcome = await getRegistrationOutcome();
      setRegistrationOutcome({
        kind: 'resolved',
        detail:
          outcome ??
          Platform.select({
            ios: 'APNs has not answered yet.',
            default: 'FCM has not issued a token yet.',
          }),
      });
    } catch (error: unknown) {
      setRegistrationOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Push preference (PUSH-01)" />
      <Card>
        {/* The flag is Pulsate's own push gate. It neither prompts for nor
            revokes the OS notification permission, which the host app owns —
            so "enabled" here and a user who denied notifications agree. */}
        <Row
          label="Pulsate push enabled"
          right={<Switch value={enabled} onValueChange={setEnabled} />}
        />
        <Button
          title="Set push enabled"
          onPress={onSetPushEnabled}
          disabled={setOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={setOutcome} pendingLabel="Setting…" />
        <Button
          title="Is push enabled?"
          onPress={onIsPushEnabled}
          disabled={readOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={readOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="OS registration (PUSH-02)" />
      <Card>
        {/* The OS notification permission, which is the host app's to ask for
            and is unrelated to the Pulsate flag above. On iOS there is no
            device token without it; on Android the FCM token exists either
            way, but nothing reaches the tray without it. PUSH-02 has no JS
            call in the library (plan §4): these two controls are the example
            app's own native helper. */}
        <Row
          label="Native helper"
          value={
            isPushRegistrationAvailable
              ? 'Linked.'
              : 'Not linked into this build.'
          }
        />
        <Button
          title="Request permission"
          testID="Request permission (PUSH-02)"
          onPress={onRequestPermission}
          disabled={
            !isPushRegistrationAvailable || permissionOutcome.kind === 'pending'
          }
        />
        <OutcomeRow outcome={permissionOutcome} pendingLabel="Asking…" />
        <Button
          title="Registration outcome"
          onPress={onReadRegistrationOutcome}
          variant="secondary"
          disabled={
            !isPushRegistrationAvailable ||
            registrationOutcome.kind === 'pending'
          }
        />
        <OutcomeRow outcome={registrationOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="Notifications (PUSH-03)" />
      <Card>
        <Button
          title="Clear all notifications"
          onPress={onClearAllNotifications}
          disabled={clearOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={clearOutcome} pendingLabel="Clearing…" />
      </Card>

      <SectionHeader title="Badge updates (BADGE-02)" />
      <Card>
        <Row
          label="Platform"
          value="Both platforms; the triggers differ, see Log"
        />
        <Row
          label="Where it shows"
          value="Log screen + toast: Android once after configure, then per push; iOS not with today's payloads"
        />
        <Row
          label="First value"
          value="Android: 0 on a fresh install or a failed fetch. iOS: none — no campaign push reaches the badge path today"
        />
      </Card>

      {Platform.OS === 'ios' && (
        <>
          <SectionHeader title="Neighbour push stack" />
          <Card>
            <Text style={[type.caption, { color: colors.textMuted }]}>
              RNFirebase and notifee are installed here only to prove Pulsate
              coexists with another push stack that owns the notification
              delegate. Pulsate does not need them. iOS only for now.
            </Text>
            <Button
              title="Show a notifee notification"
              onPress={onNotifeeLocal}
              disabled={notifeeOutcome.kind === 'pending'}
            />
            <OutcomeRow outcome={notifeeOutcome} pendingLabel="Displaying…" />
            <Button
              title="Log the FCM token"
              onPress={onLogFcmToken}
              variant="secondary"
              disabled={fcmTokenOutcome.kind === 'pending'}
            />
            <OutcomeRow outcome={fcmTokenOutcome} pendingLabel="Reading…" />
          </Card>
        </>
      )}
    </Screen>
  );
}
