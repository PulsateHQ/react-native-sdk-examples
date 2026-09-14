import { useState } from 'react';
import { TextInput } from 'react-native';

import {
  createAttribute,
  createEvent,
  createEvents,
  decrementAttribute,
  incrementAttribute,
  type AttributeValue,
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

// The four attribute buttons differ only in the runtime type they send, so the
// outcome line names it: a tester reading "(number)" knows which SDK overload
// the value took, which is the whole point of having four buttons.
function describeAttributeValue(value: AttributeValue): string {
  if (value instanceof Date) {
    return `${value.toISOString()} (date)`;
  }
  if (typeof value === 'string') {
    return `${JSON.stringify(value)} (string)`;
  }
  return `${String(value)} (${typeof value})`;
}

export function AttributesScreen() {
  const { colors } = useTheme();
  const inputStyle = useInputStyle();
  const [attributeKey, setAttributeKey] = useState('rn_example_attr');
  const [attributeValue, setAttributeValue] = useState('hello');
  const [attributeOutcome, setAttributeOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [attributeStep, setAttributeStep] = useState('1');
  const [counterOutcome, setCounterOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [eventName, setEventName] = useState('rn_example_event');
  const [eventOutcome, setEventOutcome] = useState<Outcome>({ kind: 'idle' });
  const [eventsOutcome, setEventsOutcome] = useState<Outcome>({ kind: 'idle' });

  const onSendAttribute = async (value: AttributeValue) => {
    setAttributeOutcome({ kind: 'pending' });
    try {
      await createAttribute(attributeKey, value);
      setAttributeOutcome({
        kind: 'resolved',
        detail: `Dispatched: ${JSON.stringify(attributeKey)} = ${describeAttributeValue(value)}`,
      });
    } catch (error: unknown) {
      setAttributeOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onChangeCounter = async (direction: 'increment' | 'decrement') => {
    setCounterOutcome({ kind: 'pending' });
    const by = Number(attributeStep);
    try {
      // Number("") is 0, a valid step that resolves and changes nothing. A
      // non-numeric box is NaN, which the library rejects VALIDATION_ERROR
      // before the bridge — a refusal worth reaching from a device, so the
      // screen adds no guard of its own.
      await (direction === 'increment'
        ? incrementAttribute(attributeKey, by)
        : decrementAttribute(attributeKey, by));
      setCounterOutcome({
        kind: 'resolved',
        detail: `Dispatched: ${direction} ${JSON.stringify(attributeKey)} by ${by}.`,
      });
    } catch (error: unknown) {
      setCounterOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  // ATTR-03. The name is sent exactly as typed — no trim, no empty-name
  // guard — because the contract specifies no validation for it, so the
  // control is deliberately able to send a blank one.
  const onCreateEvent = async () => {
    setEventOutcome({ kind: 'pending' });
    try {
      await createEvent(eventName);
      setEventOutcome({
        kind: 'resolved',
        detail: `Dispatched: ${JSON.stringify(eventName)}.`,
      });
    } catch (error: unknown) {
      setEventOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onCreateEvents = async () => {
    setEventsOutcome({ kind: 'pending' });
    const names = eventName.split(',');
    try {
      await createEvents(names);
      setEventsOutcome({
        kind: 'resolved',
        detail: `Dispatched: ${JSON.stringify(names)}.`,
      });
    } catch (error: unknown) {
      setEventsOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Custom attributes (ATTR-01, ATTR-02)" />
      <Card>
        {/* ATTR-01 to ATTR-04 run on both platforms. */}
        <Row label="Platform" value="Both" />
        <Row
          label="Attribute key"
          right={
            <TextInput
              // The placeholder is the only text this input carries, and the
              // Row renders a label with the same word, so a text selector in
              // e2e/device cannot tell them apart.
              testID="attributes-key-input"
              style={inputStyle}
              value={attributeKey}
              onChangeText={setAttributeKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Attribute key"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Row
          label="Attribute value"
          right={
            <TextInput
              testID="attributes-value-input"
              style={inputStyle}
              value={attributeValue}
              onChangeText={setAttributeValue}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Attribute value"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        {/* One key and one value box feed four buttons, and the four share one
            outcome row: they are the same call, and what differs is only the
            JavaScript type the value is sent as, which decides the SDK overload
            and the type the value is stored under. */}
        <Button
          title="Send as string"
          onPress={() => onSendAttribute(attributeValue)}
          disabled={attributeOutcome.kind === 'pending'}
        />
        <Button
          title="Send as number"
          // Number("") is 0 and any other non-numeric box is NaN, which the
          // library rejects VALIDATION_ERROR before the bridge. That rejection
          // is worth reaching from a device, so the screen adds no guard of its
          // own and shows the library's own refusal.
          onPress={() => onSendAttribute(Number(attributeValue))}
          disabled={attributeOutcome.kind === 'pending'}
        />
        <Button
          title="Send as boolean"
          // Only the exact text "true" is true; every other box, empty
          // included, sends false.
          onPress={() => onSendAttribute(attributeValue === 'true')}
          disabled={attributeOutcome.kind === 'pending'}
        />
        <Button
          title="Send as date"
          // This button ignores the value box and sends the current instant:
          // typing a date by hand tests the text parser, not the date path.
          onPress={() => onSendAttribute(new Date())}
          disabled={attributeOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={attributeOutcome} pendingLabel="Sending…" />
        {/* The counter reuses the key box above — it is the same attribute —
            and takes its own step box, because the value box holds text for
            the four buttons above and a counter step is a number. */}
        <Row
          label="Counter step"
          right={
            <TextInput
              // The placeholder is the only text this input carries, and the
              // Row renders a label with the same words, so a text selector in
              // e2e/device cannot tell them apart.
              testID="attributes-step-input"
              style={inputStyle}
              value={attributeStep}
              onChangeText={setAttributeStep}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Counter step"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Increment"
          onPress={() => onChangeCounter('increment')}
          disabled={counterOutcome.kind === 'pending'}
        />
        <Button
          title="Decrement"
          onPress={() => onChangeCounter('decrement')}
          disabled={counterOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={counterOutcome} pendingLabel="Sending…" />
      </Card>

      <SectionHeader title="Custom events (ATTR-03, ATTR-04)" />
      <Card>
        {/* A custom event only becomes selectable as a campaign trigger in the
            dashboard once the app has sent it at least once — sending it from
            here is what registers the name. Start a session first: the event
            is attributed to the current user. */}
        <Row
          label="Event name"
          right={
            <TextInput
              // The placeholder is the only text this input carries, and the
              // Row renders a label with the same word, so a text selector in
              // e2e/device cannot tell them apart.
              testID="events-name-input"
              style={inputStyle}
              value={eventName}
              onChangeText={setEventName}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Event name"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          testID="Create event (ATTR-03)"
          title="Create event"
          onPress={onCreateEvent}
          disabled={eventOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={eventOutcome} pendingLabel="Sending…" />
        <Button
          title="Create events, split on commas"
          onPress={onCreateEvents}
          disabled={eventsOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={eventsOutcome} pendingLabel="Sending…" />
      </Card>
    </Screen>
  );
}
