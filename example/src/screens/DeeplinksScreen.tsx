import { useEffect, useState, useSyncExternalStore } from 'react';
import { Linking, Switch, Text, TextInput } from 'react-native';

import {
  getUrlOpenMode,
  openUrl,
  setUrlOpenMode,
  type UrlOpenMode,
} from '@pulsatehq/react-native-sdk';

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
  useInputStyle,
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
  const inputStyle = useInputStyle();
  const lastLink = useSyncExternalStore(subscribe, getLastLink);
  const consumeInJs = useSyncExternalStore(subscribe, getConsumeInJs);
  const [openOutcome, setOpenOutcome] = useState<Outcome>({ kind: 'idle' });
  const [mode, setMode] = useState<UrlOpenMode | null>(null);
  const [modeOutcome, setModeOutcome] = useState<Outcome>({ kind: 'idle' });
  const [urlToOpen, setUrlToOpen] = useState('https://example.com');
  const [openUrlOutcome, setOpenUrlOutcome] = useState<Outcome>({
    kind: 'idle',
  });

  const readUrlOpenMode = async (
    label: string,
    isCurrent: () => boolean = () => true
  ) => {
    setModeOutcome({ kind: 'pending' });
    try {
      const stored = await getUrlOpenMode();
      if (isCurrent()) {
        setMode(stored);
        setModeOutcome({ kind: 'resolved', detail: `${label}: ${stored}.` });
      }
    } catch (error: unknown) {
      if (isCurrent()) {
        setModeOutcome({ kind: 'rejected', ...describeRejection(error) });
      }
    }
  };

  // LINK-02. Read once on mount, as Settings does for CRASH-01: it rejects
  // CONFIGURATION_ERROR when bootstrap did not configure.
  useEffect(() => {
    let current = true;
    readUrlOpenMode('Resolved on mount', () => current);
    return () => {
      current = false;
    };
  }, []);

  const onToggleMode = async (inApp: boolean) => {
    const next: UrlOpenMode = inApp ? 'inApp' : 'external';
    setModeOutcome({ kind: 'pending' });
    try {
      await setUrlOpenMode(next);
    } catch (error: unknown) {
      setModeOutcome({ kind: 'rejected', ...describeRejection(error) });
      return;
    }
    logAppEvent('link.urlOpenMode', `Set to ${next}.`);
    // The Stored mode row shows what getUrlOpenMode resolved, not `next`: the
    // device flows assert the SDK took the write.
    await readUrlOpenMode(`Set to ${next}, read back`);
  };

  const onOpenUrl = async () => {
    setOpenUrlOutcome({ kind: 'pending' });
    try {
      const opened = await openUrl(urlToOpen);
      setOpenUrlOutcome({ kind: 'resolved', detail: `openUrl: ${opened}.` });
      logAppEvent('link.openUrl', `Manual: ${urlToOpen} -> ${opened}`);
    } catch (error: unknown) {
      const rejection = describeRejection(error);
      setOpenUrlOutcome({ kind: 'rejected', ...rejection });
      logAppEvent('link.openUrl', `Manual: rejected — ${rejection.message}`);
    }
  };

  const onToggleConsume = async (value: boolean) => {
    const saving = setConsumeInJs(value);
    logAppEvent(
      'link.consumeInJs',
      value
        ? 'On: the handler consumes the link and nothing opens.'
        : 'Off: the handler forwards to openUrl.'
    );
    try {
      await saving;
    } catch (error: unknown) {
      logAppEvent(
        'link.consumeInJs',
        `Not stored, kept for this run only: ${describeRejection(error).message}`
      );
    }
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
          label="iOS caveat"
          value="A link inside the feed may be handled by the system rather than this listener — check the Log screen to see which fired."
        />
      </Card>

      <SectionHeader title="Consume in JS" />
      <Card>
        <Row
          label="Consume in JS"
          right={
            <Switch
              testID="consume-in-js-switch"
              value={consumeInJs}
              onValueChange={onToggleConsume}
            />
          }
        />
        <Row
          label="On"
          value="The app is the handler: the link is logged and recorded below, and a pulsate:// URL routes to the Deeplink target screen. Nothing outside the app opens."
        />
        <Row
          label="Off"
          value="The handler declines it and passes the link to openUrl, so an http(s) URL opens under the URL Open Mode below. Anything openUrl refuses or rejects falls back to Linking.openURL."
        />
      </Card>

      <SectionHeader title="URL Open Mode (LINK-02)" />
      <Card>
        <Row
          label="Open in the app"
          detail="Off opens http(s) links in the system browser."
          right={
            <Switch
              testID="url-open-mode-switch"
              value={mode === 'inApp'}
              onValueChange={onToggleMode}
              disabled={mode === null || modeOutcome.kind === 'pending'}
            />
          }
        />
        <Row label="Stored mode" value={mode ?? 'Not read yet'} />
        <OutcomeRow outcome={modeOutcome} pendingLabel="Setting…" />
        <Row
          label="URL"
          right={
            <TextInput
              testID="open-url-input"
              style={inputStyle}
              value={urlToOpen}
              onChangeText={setUrlToOpen}
              autoCapitalize="none"
              autoCorrect={false}
            />
          }
        />
        <Button
          title="Open URL"
          onPress={onOpenUrl}
          disabled={openUrlOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={openUrlOutcome} pendingLabel="Opening…" />
        <Row
          label="What it returns"
          value="true when the SDK started opening an http(s) link, false for anything else, which opens nothing. A universal link or app link this app routes itself must be routed before openUrl, or the in-app browser opens it."
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
          value="xcrun simctl push with data keys d and dt (url | deeplink)."
        />
      </Card>
    </Screen>
  );
}
