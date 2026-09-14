import { useState, useSyncExternalStore } from 'react';
import { Linking, Switch, Text } from 'react-native';

import {
  getConsumeInJs,
  getLastLink,
  setConsumeInJs,
  subscribe,
  type LinkRecord,
} from '../links/store';
import { logAppEvent } from '../log/registry';
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

function describeDelivery(link: LinkRecord): string {
  if (link.sinceRegistryStartMs === null) {
    return 'Arrived before the registry started, which should be impossible.';
  }
  const offset = `+${link.sinceRegistryStartMs} ms after the registry started`;
  return link.fromStartupBurst
    ? `Replayed from the cold-start buffer, inferred (${offset})`
    : `Live (${offset})`;
}

export function DeeplinksScreen() {
  const { colors, type } = useTheme();
  const lastLink = useSyncExternalStore(subscribe, getLastLink);
  const consumeInJs = useSyncExternalStore(subscribe, getConsumeInJs);
  const [openOutcome, setOpenOutcome] = useState<Outcome>({ kind: 'idle' });

  const onToggleConsume = (value: boolean) => {
    setConsumeInJs(value);
    logAppEvent(
      'link.consumeInJs',
      value
        ? 'On: the handler consumes the link and nothing opens.'
        : 'Off: the handler forwards to Linking.openURL.'
    );
  };

  const onOpenLastLink = async () => {
    if (lastLink === null) {
      return;
    }
    setOpenOutcome({ kind: 'pending' });
    try {
      await Linking.openURL(lastLink.url);
      setOpenOutcome({ kind: 'resolved', detail: 'Opened.' });
      logAppEvent('link.openURL', `Manual: opened ${lastLink.url}`);
    } catch (error: unknown) {
      const rejection = describeRejection(error);
      setOpenOutcome({ kind: 'rejected', ...rejection });
      logAppEvent('link.openURL', `Manual: rejected — ${rejection.message}`);
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Link events (LINK-01)" />
      <Card>
        <Text style={[type.caption, { color: colors.textMuted }]}>
          There is nothing to press here. Links arrive on their own whenever
          Pulsate would have opened one: a push you tapped, an in-app button, a
          link inside the feed. A link that arrives before the app is running is
          held and delivered as soon as it starts, so a tap that cold-starts the
          app still shows up below and on the Log screen. On Android a claimed
          link also brings the app to the front.
        </Text>
        <Text style={[type.caption, { color: colors.textMuted }]}>
          What happens next is the app&apos;s own choice, not the SDK&apos;s:
          the Consume in JS switch below picks it.
        </Text>
        <Row
          label="Platform"
          value="Android and iOS (registered at configure)"
        />
        <Row
          label="Where it shows"
          value="Log screen + toast, and the readout below"
        />
        <Row
          label="iOS caveats"
          value="A push whose action is a plain web address is opened by Safari without reaching the app, so seeing no event for one is expected rather than a fault. A link inside the feed may also be handled by the system rather than this listener — check the Log screen to see which fired."
        />
      </Card>

      <SectionHeader title="Consume in JS" />
      <Card>
        <Row
          label="Consume in JS"
          right={<Switch value={consumeInJs} onValueChange={onToggleConsume} />}
        />
        <Row
          label="On"
          value="The app is the handler: the link is logged and recorded below, and a pulsate:// URL routes to the Deeplink target screen. Nothing outside the app opens."
        />
        <Row
          label="Off"
          value="The handler declines it and calls Linking.openURL, so an http(s) URL opens the browser."
        />
      </Card>

      <SectionHeader title="Last link" />
      <Card>
        <Row label="URL" value={lastLink?.url ?? 'None yet.'} />
        <Row
          label="Received"
          value={
            lastLink === null
              ? '—'
              : new Date(lastLink.receivedAtMs).toISOString()
          }
        />
        <Row
          label="Delivery"
          value={lastLink === null ? '—' : describeDelivery(lastLink)}
        />
        <Button
          title="Open last link"
          onPress={onOpenLastLink}
          variant="secondary"
          disabled={lastLink === null || openOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={openOutcome} pendingLabel="Opening…" />
      </Card>

      <SectionHeader title="How to trigger" />
      <Card>
        <Row
          label="Dashboard push"
          value="A campaign whose action is a URL or a deeplink; then tap the notification."
        />
        <Row
          label="In-app CTA"
          value="An in-app campaign with a link, url or deeplink button."
        />
        <Row
          label="FCM rig"
          value="Data keys d (the destination) and dt (url | deeplink)."
        />
        <Row
          label="Cold start"
          value="HOME, adb shell am kill <pkg> (or swipe the app away on iOS), then tap the push — the event must still arrive."
        />
        <Row
          label="iOS simulator"
          value="xcrun simctl push with data keys d and dt (deeplink). A url payload is opened by the system instead of reaching this listener."
        />
      </Card>
    </Screen>
  );
}
