import { useState } from 'react';

import {
  getFeedUnreadCount,
  isUserAuthorized,
  setUserAuthorized,
  showFeed,
  showLastUnauthorizedMessage,
} from '@pulsatehq/react-native-sdk';

import {
  Button,
  Card,
  OutcomeRow,
  Row,
  Screen,
  SectionHeader,
  describeRejection,
  outcomeText,
  type Outcome,
} from '../ui';

async function readUnreadCount(): Promise<Outcome> {
  const startedAt = Date.now();
  try {
    const unread = await getFeedUnreadCount();
    return {
      kind: 'resolved',
      detail: `Resolved: ${unread} unread, after ${Date.now() - startedAt} ms.`,
    };
  } catch (error: unknown) {
    const { code, message } = describeRejection(error);
    return {
      kind: 'rejected',
      code,
      message: `${message} — after ${Date.now() - startedAt} ms.`,
    };
  }
}

const IDLE: Outcome = { kind: 'idle' };
const BURST_SIZE = 3;

const burstOf = (outcome: Outcome): Outcome[] =>
  Array.from({ length: BURST_SIZE }, () => outcome);

export function FeedScreen() {
  const [showOutcome, setShowOutcome] = useState<Outcome>(IDLE);
  const [countOutcome, setCountOutcome] = useState<Outcome>(IDLE);
  const [burstOutcomes, setBurstOutcomes] = useState<Outcome[]>(burstOf(IDLE));
  const [authorizeOutcome, setAuthorizeOutcome] = useState<Outcome>(IDLE);
  const [readAuthorizedOutcome, setReadAuthorizedOutcome] =
    useState<Outcome>(IDLE);
  const [showLastOutcome, setShowLastOutcome] = useState<Outcome>(IDLE);

  const onShowFeed = async () => {
    setShowOutcome({ kind: 'pending' });
    try {
      await showFeed();
      setShowOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setShowOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  // FEED-04. One call on its own, so its duration is the plain case the burst
  // below is compared against.
  const onUnreadCount = async () => {
    setCountOutcome({ kind: 'pending' });
    setCountOutcome(await readUnreadCount());
  };

  const onUnreadCountBurst = async () => {
    setBurstOutcomes(burstOf({ kind: 'pending' }));
    const settle = (position: number, outcome: Outcome) => {
      setBurstOutcomes((current) =>
        current.map((existing, index) =>
          index === position ? outcome : existing
        )
      );
    };
    await Promise.all(
      Array.from({ length: BURST_SIZE }, async (_unused, position) => {
        settle(position, await readUnreadCount());
      })
    );
  };

  const burstPending = burstOutcomes.some(
    (outcome) => outcome.kind === 'pending'
  );

  const onSetUserAuthorized = async (authorized: boolean) => {
    setAuthorizeOutcome({ kind: 'pending' });
    try {
      await setUserAuthorized(authorized);
      setAuthorizeOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setAuthorizeOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onIsUserAuthorized = async () => {
    setReadAuthorizedOutcome({ kind: 'pending' });
    try {
      const authorized = await isUserAuthorized();
      setReadAuthorizedOutcome({
        kind: 'resolved',
        detail: authorized
          ? 'Resolved: authorized.'
          : 'Resolved: not authorized.',
      });
    } catch (error: unknown) {
      setReadAuthorizedOutcome({
        kind: 'rejected',
        ...describeRejection(error),
      });
    }
  };

  const onShowLastUnauthorizedMessage = async () => {
    setShowLastOutcome({ kind: 'pending' });
    try {
      await showLastUnauthorizedMessage();
      setShowLastOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setShowLastOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Feed (FEED-01)" />
      <Card>
        <Row
          label="Platform"
          value="Both platforms. On iOS the call can fail when there is no screen to present from. On Android a feed that fails to open still resolves."
        />
        <Button
          title="Show feed"
          onPress={onShowFeed}
          disabled={showOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={showOutcome} pendingLabel="Opening…" />
      </Card>

      <SectionHeader title="Unread count (FEED-04)" />
      <Card>
        <Row
          label="Rate limit"
          value="One read per 30 s inside the SDK; calls waiting together resolve together with the same number"
        />
        <Button
          title="Read unread count"
          onPress={onUnreadCount}
          disabled={countOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={countOutcome} pendingLabel="Reading…" />
      </Card>

      <SectionHeader title="Unread count ×3 (FEED-04)" />
      <Card>
        {/* The expected reading on Android, from a cold window: call 1 in a
            few hundred ms, calls 2 and 3 together at about 30 000 ms, all
            three with the same number — the opening run answers and drains the
            queue before calls 2 and 3 arrive, so they wait for the trailing
            run, which reads the count afresh at the 30 s mark. Measured on an
            Android emulator: 206 ms, then 29.3 s twice. The same 30 s debounce
            runs on iOS, but which reading you get there depends on where the
            burst lands in the window: pressed inside a window another call had
            already opened, all three wait for that run's callback and settle
            together — measured on the iPhone 17 Pro simulator, 8841/8842/8842 ms,
            all three with the same number. */}
        <Button
          title="Read unread count three times at once"
          onPress={onUnreadCountBurst}
          disabled={burstPending}
        />
        {burstOutcomes.map((outcome, index) => (
          <Row
            // The rows are fixed positions in a fixed-length burst, never
            // reordered or filtered, so the index is the identity.
            key={index}
            label={`Call ${index + 1}`}
            value={outcomeText(outcome, 'Waiting for the window…')}
          />
        ))}
      </Card>

      <SectionHeader title="Authorization (FEED-02, FEED-03, FEED-05)" />
      <Card>
        {/* The flag Pulsate checks before it shows anyone the feed. These
            buttons are the direct control over it; the Sessions screen's
            SESS-04 pair moves the same flag on the side. A fresh install is
            authorized, so the gate does nothing at all until Unauthorize.

            The recipe for watching the gate work on Android: Unauthorize, then
            "Show feed" above — the feed flashes and is gone, and the Log screen
            carries feed.unauthorized followed by feed.close. Then Authorize,
            then "Show last unauthorized message", and the feed the user was
            refused opens.

            On iOS the gate is not "Show feed": nothing here opens the feed yet
            (FEED-01). What produces onUnauthorizedAction there is Pulsate
            refusing a push campaign, an in-app campaign, a call to action or
            an action button to an unauthorized user — send a campaign from the
            dashboard with the user unauthorized, and the Log screen carries
            feed.unauthorized with the label that was refused. Then Authorize
            and Show last unauthorized message brings that campaign back. An
            action button is the one refusal that leaves nothing to bring back:
            Pulsate records no destination for it, so the replay resolves and
            does nothing, which looks the same as every other empty replay. */}
        <Row label="Platform" value="Both platforms" />
        <Row
          label="On iOS"
          value="Restarting the app authorizes the user again, so an unauthorized state does not survive a relaunch. The feed itself is not gated on iOS; what is withheld is push campaigns, in-app campaigns, calls to action and action buttons. Press Authorize before Show last unauthorized message, or the replay is refused. The replay shows a refused message once, so pressing it a second time shows nothing."
        />
        <Button
          title="Authorize"
          onPress={() => onSetUserAuthorized(true)}
          disabled={authorizeOutcome.kind === 'pending'}
        />
        <Button
          title="Unauthorize"
          onPress={() => onSetUserAuthorized(false)}
          variant="secondary"
          disabled={authorizeOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={authorizeOutcome} pendingLabel="Setting…" />
        <Button
          title="Is authorized?"
          onPress={onIsUserAuthorized}
          disabled={readAuthorizedOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={readAuthorizedOutcome} pendingLabel="Reading…" />
        <Button
          title="Show last unauthorized message"
          onPress={onShowLastUnauthorizedMessage}
          disabled={showLastOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={showLastOutcome} pendingLabel="Asking…" />
      </Card>

      <SectionHeader title="Feed events (FEED-08, FEED-07)" />
      <Card>
        <Row
          label="onFeedClose"
          value="Fires when a feed this screen opened closes; Log screen, feed.close"
        />
        <Row
          label="Not reported"
          value="A feed Pulsate opened by itself, from a push tap or a call to action. On Android the same goes for a feed reopened by the replay or by the Sessions screen's User has logged in button, and for a close that follows a locale, dark mode, font size or multi-window change made with the feed open."
        />
        <Row
          label="onUnauthorizedAction"
          value="On Android it fires whenever the feed comes to the front for an unauthorized user, with no payload (an empty action is expected), and feed.close follows it. On iOS it fires when Pulsate refuses a push campaign, an in-app campaign, a call to action or an action button, naming what was refused, and no feed.close follows."
        />
        <Row
          label="Rotation"
          value="Not a case on either platform. The Android feed is locked to portrait, and on iOS the event means the feed was released, not redrawn."
        />
      </Card>
    </Screen>
  );
}
