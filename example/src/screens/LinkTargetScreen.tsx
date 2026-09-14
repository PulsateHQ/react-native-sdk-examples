import { Text } from 'react-native';

import { Button, Card, Row, Screen, SectionHeader, useTheme } from '../ui';
import type { RootScreenProps } from './routes';

export function LinkTargetScreen({
  navigation,
  route,
}: RootScreenProps<'LinkTarget'>) {
  const { colors, type } = useTheme();
  const { url } = route.params;

  return (
    <Screen scroll>
      <SectionHeader title="Routed here by onLink" />
      <Card>
        {/* One string, URL included, because that is what the device flows
            assert: a separate label and value would be two elements on iOS and
            the assertion would have to know which. */}
        <Text
          testID="link-target-url"
          style={[type.heading, { color: colors.text }]}
        >
          Opened from {url}
        </Text>
        <Text style={[type.caption, { color: colors.textMuted }]}>
          The SDK claimed this URL and handed it to the onLink handler, which
          consumed it and navigated here — the same thing a partner app does
          with its own routes. Turn "Consume in JS" off on the Deeplinks screen
          and the handler declines instead, forwarding to Linking.openURL, and
          this screen is never reached.
        </Text>
      </Card>

      <SectionHeader title="The rule" />
      <Card>
        <Row
          label="Routed"
          value="Any pulsate:// URL. The example app owns that scheme and has one target screen, so the scheme is the whole rule."
        />
        <Row
          label="Not routed"
          value="Anything else — an https:// campaign destination is recorded and left alone."
        />
        <Row
          label="Cold start"
          value="A link that started the app is replayed before navigation is ready; the handler holds it and routes on onReady."
        />
      </Card>

      <Button
        title="Go back"
        onPress={() => navigation.goBack()}
        variant="secondary"
      />
    </Screen>
  );
}
