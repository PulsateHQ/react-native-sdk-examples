import { useEffect, useState } from 'react';
import { TextInput } from 'react-native';

import { configure } from '@pulsatehq/react-native-sdk';

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
    } catch (error: unknown) {
      setOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

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
    </Screen>
  );
}
