import { useEffect, useState } from 'react';
import { Switch, TextInput } from 'react-native';

import {
  configure,
  isCrashReportingEnabled,
  setCrashReportingEnabled,
} from '@pulsatehq/react-native-sdk';

import {
  clearStoredCredentials,
  loadStoredCredentials,
  saveStoredCredentials,
} from '../storage/credentialStore';
import {
  Button,
  Card,
  OutcomeRow,
  Row,
  Screen,
  SectionHeader,
  describeRejection,
  useInputStyle,
  useTheme,
  type Outcome,
} from '../ui';

export type SettingsScreenProps = {
  seededAppId: string;
  seededAppKey: string;
  resolvedAppId: string;
  resolvedAppKey: string;
};

type SaveState = 'idle' | 'active' | 'stored' | 'saved' | 'reset' | 'error';

export function SettingsScreen({
  seededAppId,
  seededAppKey,
  resolvedAppId,
  resolvedAppKey,
}: SettingsScreenProps) {
  const { colors } = useTheme();
  const inputStyle = useInputStyle();
  const [appId, setAppId] = useState(seededAppId);
  const [appKey, setAppKey] = useState(seededAppKey);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [crashEnabled, setCrashEnabled] = useState(true);
  const [crashSetOutcome, setCrashSetOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [crashReadOutcome, setCrashReadOutcome] = useState<Outcome>({
    kind: 'idle',
  });

  useEffect(() => {
    let current = true;
    loadStoredCredentials().then((stored) => {
      if (current && stored !== null) {
        setAppId(stored.appId);
        setAppKey(stored.appKey);
        setSaveState(
          stored.appId === resolvedAppId && stored.appKey === resolvedAppKey
            ? 'active'
            : 'stored'
        );
      }
    });
    return () => {
      current = false;
    };
  }, [resolvedAppId, resolvedAppKey]);

  const onSave = async () => {
    try {
      await saveStoredCredentials({ appId, appKey });
      setSaveState('saved');
    } catch (error: unknown) {
      setSaveState('error');
      setSaveError(describeRejection(error).message);
    }
  };

  const onReset = async () => {
    try {
      await clearStoredCredentials();
      setAppId(seededAppId);
      setAppKey(seededAppKey);
      setSaveState('reset');
    } catch (error: unknown) {
      setSaveState('error');
      setSaveError(describeRejection(error).message);
    }
  };

  const onConfigure = async () => {
    setOutcome({ kind: 'pending' });
    try {
      await configure({ appId, appKey });
      setOutcome({
        kind: 'resolved',
        detail: 'Dispatched: configure resolved.',
      });
      await readCrashReporting('Resolved after configure');
    } catch (error: unknown) {
      setOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onSetCrashReporting = async () => {
    setCrashSetOutcome({ kind: 'pending' });
    try {
      await setCrashReportingEnabled(crashEnabled);
      setCrashSetOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setCrashSetOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  // The switch follows every successful read, so "Set" never writes this
  // screen's own default over a stored `false` after a cold launch.
  const readCrashReporting = async (
    label: string,
    isCurrent: () => boolean = () => true
  ) => {
    setCrashReadOutcome({ kind: 'pending' });
    try {
      const current = await isCrashReportingEnabled();
      if (isCurrent()) {
        setCrashEnabled(current);
        setCrashReadOutcome({
          kind: 'resolved',
          detail: `${label}: ${current}.`,
        });
      }
    } catch (error: unknown) {
      if (isCurrent()) {
        setCrashReadOutcome({ kind: 'rejected', ...describeRejection(error) });
      }
    }
  };

  const onIsCrashReporting = () => readCrashReporting('Resolved');

  // Read once on mount, as LOC-01 does. It rejects CONFIGURATION_ERROR when
  // bootstrap did not configure; a configure from this screen reads again.
  useEffect(() => {
    let current = true;
    readCrashReporting('Resolved on mount', () => current);
    return () => {
      current = false;
    };
  }, []);

  const saveText =
    saveState === 'saved'
      ? 'Stored. Takes effect on the next cold launch.'
      : saveState === 'active'
        ? 'Stored pair loaded — it configured this launch.'
        : saveState === 'stored'
          ? 'Stored pair loaded — takes effect on the next cold launch.'
          : saveState === 'reset'
            ? 'Cleared. The seeded credentials apply on the next cold launch.'
            : saveState === 'error'
              ? `Storage failed: ${saveError}`
              : 'Not stored yet — the seeded credentials are in use.';

  return (
    <Screen scroll>
      <SectionHeader title="Credentials" />
      <Card>
        <Row
          label="App ID"
          right={
            <TextInput
              style={inputStyle}
              value={appId}
              onChangeText={setAppId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="64-character App ID"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Row
          label="App Key"
          right={
            <TextInput
              style={inputStyle}
              value={appKey}
              onChangeText={setAppKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="64-character App Key"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button title="Save credentials" onPress={onSave} />
        <Row label="Stored" value={saveText} />
        <Button title="Reset to seeded" onPress={onReset} variant="secondary" />
        <Row label="Seeded from" value="credentials.local.ts, gitignored." />
      </Card>

      <SectionHeader title="Configure (SESS-01)" />
      <Card>
        <Row
          label="Idempotency"
          value="Configuring with the same keys resolves. Differing keys reject until the app is relaunched — iOS getInstance is one-shot, and on Android manifest keys take precedence."
        />
        <Row
          label="Validation"
          value="App ID and App Key must both be exactly 64 characters. A shorter value rejects with VALIDATION_ERROR in TypeScript, before the bridge."
        />
        <Button
          title="Configure"
          onPress={onConfigure}
          disabled={outcome.kind === 'pending'}
        />
        <OutcomeRow outcome={outcome} pendingLabel="Configuring…" />
        <Row
          label="What resolve means"
          value="Dispatched to native. Resolving means the call was handed over, not that the backend accepted it."
        />
      </Card>

      <SectionHeader title="Crash reporting (CRASH-01)" />
      <Card>
        <Row
          label="Pulsate crash reporting"
          value="On by default. Kept on the device across restarts and sign-outs."
          right={
            <Switch value={crashEnabled} onValueChange={setCrashEnabled} />
          }
        />
        <Button
          title="Set crash reporting"
          onPress={onSetCrashReporting}
          disabled={crashSetOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={crashSetOutcome} pendingLabel="Setting…" />
        <Button
          title="Is crash reporting enabled?"
          onPress={onIsCrashReporting}
          disabled={crashReadOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={crashReadOutcome} pendingLabel="Reading…" />
        <Row
          label="When it applies"
          value="Off stops capture and deletes waiting reports at once on both platforms. On resumes at once on iOS; on Android, after a launch with it off, from the next app start. iOS collects on 16.1 and later only."
        />
      </Card>
    </Screen>
  );
}
