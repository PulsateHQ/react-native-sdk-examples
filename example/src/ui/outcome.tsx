import { PulsateError } from '@pulsatehq/react-native-sdk';

import { Badge } from './Badge';
import { Row } from './Row';

/**
 * How every screen reports one call: the harness shows the promise's own
 * result, never a derived success state, so a resolve that means less than it
 * looks is visible as itself.
 */
export type Outcome =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'resolved'; detail?: string }
  | { kind: 'rejected'; code: string; message: string };

export function describeRejection(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof PulsateError) {
    return { code: error.type, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'unknown', message: error.message };
  }
  return { code: 'unknown', message: String(error) };
}

export function outcomeText(outcome: Outcome, pendingLabel: string): string {
  switch (outcome.kind) {
    case 'idle':
      return 'Not called yet.';
    case 'pending':
      return pendingLabel;
    case 'resolved':
      return outcome.detail ?? 'Dispatched: promise resolved.';
    case 'rejected':
      return `Rejected [${outcome.code}]: ${outcome.message}`;
  }
}

function outcomeTone(outcome: Outcome): 'default' | 'success' | 'danger' {
  if (outcome.kind === 'rejected') {
    return 'danger';
  }
  if (outcome.kind === 'resolved') {
    return 'success';
  }
  return 'default';
}

export function OutcomeRow({
  outcome,
  pendingLabel,
}: {
  outcome: Outcome;
  pendingLabel: string;
}) {
  return (
    <Row
      label="Outcome"
      value={outcomeText(outcome, pendingLabel)}
      right={<Badge label={outcome.kind} tone={outcomeTone(outcome)} />}
    />
  );
}
