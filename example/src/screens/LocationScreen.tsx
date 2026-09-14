import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  Switch,
  Text,
} from 'react-native';

import {
  getLastKnownLocation,
  isLocationEnabled,
  setLocationEnabled,
} from '@pulsatehq/react-native-sdk';

import { getEntries, subscribe } from '../log/store';
import {
  Button,
  Card,
  OutcomeRow,
  Row,
  Screen,
  SectionHeader,
  describeRejection,
  useTheme,
  type Outcome,
} from '../ui';

const FINE_PERMISSION = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;

const COARSE_PERMISSION = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

const FOREGROUND_PERMISSIONS = [FINE_PERMISSION, COARSE_PERMISSION];

const BACKGROUND_PERMISSION =
  PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;

const ANDROID_BACKGROUND_PERMISSION_API = 29;

/**
 * From API 30 a runtime request for `ACCESS_BACKGROUND_LOCATION` shows no
 * dialog and returns denied — the grant exists only on the app's own settings
 * page, and Android reaches it through "Allow all the time". So the second step
 * of the two-step flow is a settings trip rather than a prompt, and a rig that
 * only calls `request()` can never produce the state `LOC-04` needs.
 */
const ANDROID_BACKGROUND_SETTINGS_ONLY_API = 30;

function describeFix(fix: Awaited<ReturnType<typeof getLastKnownLocation>>) {
  if (fix === null) {
    return 'Resolved: none. The SDK holds no fix — including when the app has no location permission.';
  }
  // The raw millis is printed alongside the ISO string on purpose: a
  // seconds/millis conversion bug is invisible in a formatted date and obvious
  // in the number (a 1970 date is the same bug seen from the other end).
  // `accuracy` is optional and absent for a fix the platform reports none for,
  // so it is printed as `n/a` rather than run through a unit suffix.
  return [
    `lat ${fix.latitude}`,
    `lng ${fix.longitude}`,
    fix.accuracy === undefined ? 'accuracy n/a' : `accuracy ${fix.accuracy} m`,
    `timestamp ${fix.timestamp} (${new Date(fix.timestamp).toISOString()})`,
  ].join(', ');
}

export function LocationScreen() {
  const { colors, type } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [setOutcome, setSetOutcome] = useState<Outcome>({ kind: 'idle' });
  const [readOutcome, setReadOutcome] = useState<Outcome>({ kind: 'idle' });
  const [fixOutcome, setFixOutcome] = useState<Outcome>({ kind: 'idle' });
  const [permissionOutcome, setPermissionOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [grantState, setGrantState] = useState(
    Platform.OS === 'android'
      ? 'Not checked yet.'
      : 'Managed by the SDK prompt.'
  );

  const entries = useSyncExternalStore(subscribe, getEntries);
  const crossings = useMemo(
    () => entries.filter((entry) => entry.name === 'onGeofence'),
    [entries]
  );

  // The guard is a parameter rather than a closed-over flag because both awaits
  // below outlive the mount effect that starts the first read.
  const readGrantState = async (isCancelled: () => boolean = () => false) => {
    if (Platform.OS !== 'android') {
      return;
    }
    const fine = await PermissionsAndroid.check(FINE_PERMISSION);
    const coarse = await PermissionsAndroid.check(COARSE_PERMISSION);
    const background = await PermissionsAndroid.check(BACKGROUND_PERMISSION);
    if (isCancelled()) {
      return;
    }
    setGrantState(
      `fine ${fine ? 'granted' : 'denied'}, coarse ${
        coarse ? 'granted' : 'denied'
      }, background ${background ? 'granted' : 'denied'}`
    );
  };

  // LOC-01: the flag is read once on mount, so the switch shows what the SDK
  // holds rather than this screen's own default.
  useEffect(() => {
    let cancelled = false;
    isLocationEnabled().then(
      (current) => {
        if (!cancelled) {
          setEnabled(current);
          setReadOutcome({
            kind: 'resolved',
            detail: `Resolved on mount: ${current}.`,
          });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setReadOutcome({ kind: 'rejected', ...describeRejection(error) });
        }
      }
    );
    readGrantState(() => cancelled).catch(() => {
      if (!cancelled) {
        setGrantState('Could not be read.');
      }
    });
    return () => {
      cancelled = true;
    };
    // Mount only: a later read is what the button is for.
  }, []);

  const onToggle = async (value: boolean) => {
    setEnabled(value);
    setSetOutcome({ kind: 'pending' });
    try {
      await setLocationEnabled(value);
      setSetOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      // The switch was moved before the await, so a rejection has to move it
      // back: leaving it where the tap put it would show tracking as on while
      // the SDK holds the opposite. Both platforms answer the switch from the
      // SDK, so what it shows after a settled tap is the SDK's own value.
      setEnabled(!value);
      setSetOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onIsLocationEnabled = async () => {
    setReadOutcome({ kind: 'pending' });
    try {
      const current = await isLocationEnabled();
      setReadOutcome({ kind: 'resolved', detail: `Resolved: ${current}.` });
    } catch (error: unknown) {
      setReadOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onGetLastKnownLocation = async () => {
    setFixOutcome({ kind: 'pending' });
    try {
      const fix = await getLastKnownLocation();
      setFixOutcome({ kind: 'resolved', detail: describeFix(fix) });
    } catch (error: unknown) {
      setFixOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const requestAndroidPermissions = async () => {
    const granted = await PermissionsAndroid.requestMultiple(
      FOREGROUND_PERMISSIONS
    );
    const isGranted = (permission: (typeof FOREGROUND_PERMISSIONS)[number]) =>
      granted[permission] === PermissionsAndroid.RESULTS.GRANTED;

    // Three outcomes, not two: "Approximate" on the system dialog grants coarse
    // and denies fine, which is neither of the other two. The SDK checks the
    // fine grant alone, so a coarse-only device stores no fix and monitors no
    // geofence — the outcome says to ask again and choose Precise.
    if (!isGranted(FINE_PERMISSION) && !isGranted(COARSE_PERMISSION)) {
      return 'Foreground denied. No geofence is monitored.';
    }
    if (!isGranted(FINE_PERMISSION)) {
      return 'Approximate location only: coarse granted, precise denied. Ask again and choose Precise for the background step.';
    }
    if (Number(Platform.Version) < ANDROID_BACKGROUND_PERMISSION_API) {
      return 'Foreground granted. This API level has no separate background permission.';
    }
    if (Number(Platform.Version) >= ANDROID_BACKGROUND_SETTINGS_ONLY_API) {
      if (await PermissionsAndroid.check(BACKGROUND_PERMISSION)) {
        return 'Foreground and background granted. Geofences can register.';
      }
      await Linking.openSettings();
      return 'Foreground granted. From API 30 the background grant has no dialog, so this opened the app settings page: choose Allow all the time there, come back, and read the grant state again. Until then geofences are downloaded but nothing is monitored.';
    }
    const background = await PermissionsAndroid.request(BACKGROUND_PERMISSION);
    return background === PermissionsAndroid.RESULTS.GRANTED
      ? 'Foreground and background granted. Geofences can register.'
      : 'Foreground granted, background denied. Geofences are downloaded, but nothing is monitored.';
  };

  const onRequestPermission = async () => {
    setPermissionOutcome({ kind: 'pending' });
    try {
      setPermissionOutcome({
        kind: 'resolved',
        detail: await requestAndroidPermissions(),
      });
    } catch (error: unknown) {
      setPermissionOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
    // Outside the try deliberately: the readback is a separate question, and a
    // failure in it must not rewrite a grant result that has already settled.
    readGrantState().catch(() => {
      setGrantState('Could not be read.');
    });
  };

  const caption = [type.caption, { color: colors.textMuted }];

  return (
    <Screen scroll>
      <SectionHeader title="Location tracking (LOC-01)" />
      <Card>
        <Row
          label="Location tracking enabled"
          right={
            <Switch
              value={enabled}
              onValueChange={(value) => {
                // onToggle settles every path into an Outcome, so there is
                // nothing here for a rejection handler to do.
                onToggle(value);
              }}
            />
          }
        />
        <OutcomeRow outcome={setOutcome} pendingLabel="Setting…" />
        <Button
          title="Is location enabled?"
          onPress={onIsLocationEnabled}
          disabled={readOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={readOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="OS permission" />
      <Card>
        <Text style={caption}>
          {Platform.OS === 'android'
            ? 'The app asks, never the SDK. Android needs two steps: foreground location first, then background location — which from API 30 has no dialog at all, so the second step opens the app settings page and the tester picks Allow all the time there. Geofences register only while background location is granted; with foreground alone the SDK downloads them and monitors nothing.'
            : 'There is no React Native core API for the Core Location prompt and no location library here. The SDK asks instead: turning tracking on above starts Core Location, which shows the system Always prompt the first time and never again. The flag already reads on after a fresh install, so the first prompt needs the toggle switched off and then on again.'}
        </Text>
        <Row label="Grant state" value={grantState} />
        {Platform.OS === 'android' && (
          <>
            <Button
              title="Request location permission"
              onPress={onRequestPermission}
              disabled={permissionOutcome.kind === 'pending'}
            />
            <OutcomeRow outcome={permissionOutcome} pendingLabel="Asking…" />
          </>
        )}
      </Card>

      <SectionHeader title="Last known location (LOC-03)" />
      <Card>
        {/* LOC-03. The absence of a fix is a negative answer, not a failure: it
            resolves null, permission-less devices included. On Android that
            null can take up to about ten seconds with the permission granted:
            the SDK walks memory, its database and two five-second attempts at
            the fused provider before it answers; without the permission it
            answers at once. `accuracy` is absent when the fix carries none, and
            prints as `n/a`. The timestamp is printed raw as well as formatted,
            which is where a seconds/millis bug shows. */}
        <Button
          title="Get last known location"
          onPress={onGetLastKnownLocation}
          disabled={fixOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={fixOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="Geofence events (LOC-04)" />
      <Card>
        <Row
          label="Platform"
          value={
            Platform.OS === 'android'
              ? 'Android: needs tracking on, background permission, and geofences downloaded'
              : 'iOS never emits it — the SDK reports crossings itself'
          }
        />
        {crossings.length === 0 ? (
          <Text style={caption}>No crossings yet.</Text>
        ) : (
          crossings.map((entry) => (
            <Row
              key={entry.id}
              label={new Date(entry.timestampMs).toLocaleTimeString()}
              value={entry.detail}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}
