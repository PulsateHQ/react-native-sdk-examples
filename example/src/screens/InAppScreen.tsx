import { useState } from 'react';
import { Switch, TextInput } from 'react-native';

import {
  getSmallInAppDuration,
  isInAppEnabled,
  setInAppEnabled,
  setSmallInAppDuration,
  showLastInApp,
} from '@pulsatehq/react-native-sdk';

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

export function InAppScreen() {
  const [enabled, setEnabled] = useState(true);
  const [setOutcome, setSetOutcome] = useState<Outcome>({ kind: 'idle' });
  const [readOutcome, setReadOutcome] = useState<Outcome>({ kind: 'idle' });

  // INAPP-01. The switch is local intent until the button is pressed, as on
  // the Push screen: the write and the read-back stay two visible calls.
  const onSetInAppEnabled = async () => {
    setSetOutcome({ kind: 'pending' });
    try {
      await setInAppEnabled(enabled);
      setSetOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setSetOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onIsInAppEnabled = async () => {
    setReadOutcome({ kind: 'pending' });
    try {
      const current = await isInAppEnabled();
      setReadOutcome({ kind: 'resolved', detail: `Resolved: ${current}.` });
    } catch (error: unknown) {
      setReadOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const [durationText, setDurationText] = useState('');
  const [setDurationOutcome, setSetDurationOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [readDurationOutcome, setReadDurationOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const inputStyle = useInputStyle();
  const { colors } = useTheme();

  const onSetSmallInAppDuration = async () => {
    setSetDurationOutcome({ kind: 'pending' });
    try {
      await setSmallInAppDuration(Number(durationText));
      setSetDurationOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setSetDurationOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onGetSmallInAppDuration = async () => {
    setReadDurationOutcome({ kind: 'pending' });
    try {
      const seconds = await getSmallInAppDuration();
      setReadDurationOutcome({
        kind: 'resolved',
        detail: `Resolved: ${seconds} s.`,
      });
    } catch (error: unknown) {
      setReadDurationOutcome({
        kind: 'rejected',
        ...describeRejection(error),
      });
    }
  };

  const [showLastOutcome, setShowLastOutcome] = useState<Outcome>({
    kind: 'idle',
  });

  const onShowLastInApp = async () => {
    setShowLastOutcome({ kind: 'pending' });
    try {
      await showLastInApp();
      setShowLastOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setShowLastOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="In-app display gate (INAPP-01)" />
      <Card>
        {/* The gate governs display, not delivery. A campaign that arrives
            while this is off is still received and still counts as delivered;
            the SDK withholds it and records it bounced. */}
        <Row
          label="Pulsate in-app enabled"
          value="Default is on, before anything writes it."
          right={<Switch value={enabled} onValueChange={setEnabled} />}
        />
        <Button
          title="Set in-app enabled"
          onPress={onSetInAppEnabled}
          disabled={setOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={setOutcome} pendingLabel="Setting…" />
        <Button
          title="Is in-app enabled?"
          onPress={onIsInAppEnabled}
          disabled={readOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={readOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="Small in-app duration (INAPP-02)" />
      <Card>
        <Row
          label="Seconds"
          right={
            <TextInput
              style={inputStyle}
              value={durationText}
              onChangeText={setDurationText}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              placeholder="positive integer, default 12"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Set duration"
          onPress={onSetSmallInAppDuration}
          disabled={setDurationOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={setDurationOutcome} pendingLabel="Setting…" />
        <Button
          title="Read duration back"
          onPress={onGetSmallInAppDuration}
          disabled={readDurationOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={readDurationOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="Withheld message (INAPP-03)" />
      <Card>
        <Button
          title="Show last in-app"
          onPress={onShowLastInApp}
          disabled={showLastOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={showLastOutcome} pendingLabel="Asking…" />
      </Card>

      <SectionHeader title="In-app errors (ERR-01)" />
      <Card>
        <Row label="Platform" value="Android only; never fires on iOS" />
        <Row
          label="Where it shows"
          value="Log screen + toast, ~85 s after a blocked in-app, foreground only"
        />
        <Row
          label="Needs"
          value="A dashboard in-app campaign on an event this app has sent"
        />
      </Card>
    </Screen>
  );
}
