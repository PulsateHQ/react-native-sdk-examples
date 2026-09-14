import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  clear,
  getEntries,
  subscribe,
  type LogEntry,
  type LogSource,
} from '../log/store';
import { logAppEvent } from '../log/registry';
import {
  Badge,
  Button,
  Card,
  Row,
  Screen,
  SectionHeader,
  useInputStyle,
  useTheme,
} from '../ui';

const SOURCE_FILTERS: readonly LogSource[] = ['event', 'app'];

// UTC, and says so — a bare time here reads as local when correlating
// against a dashboard send.
function formatTimestamp(timestampMs: number): string {
  return `${new Date(timestampMs).toISOString().slice(11, 23)}Z`;
}

function formatEntry(entry: LogEntry): string {
  const detail = entry.detail === '' ? '' : ` ${entry.detail}`;
  return `${formatTimestamp(entry.timestampMs)} [${entry.source}] ${entry.name}${detail}`;
}

export function LogScreen() {
  const { colors, spacing, type } = useTheme();
  const inputStyle = useInputStyle();
  const entries = useSyncExternalStore(subscribe, getEntries);
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<readonly LogSource[]>(SOURCE_FILTERS);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!sources.includes(entry.source)) {
        return false;
      }
      if (needle === '') {
        return true;
      }
      return `${entry.name} ${entry.detail}`.toLowerCase().includes(needle);
    });
  }, [entries, query, sources]);

  const toggleSource = (source: LogSource) => {
    setSources((current) =>
      current.includes(source)
        ? current.filter((each) => each !== source)
        : [...current, source]
    );
  };

  const onExport = async () => {
    try {
      // The visible entries, so an export is exactly what the filters describe.
      await Share.share({ message: visible.map(formatEntry).join('\n') });
    } catch (error: unknown) {
      // Android can reject when no activity resolves the share intent.
      logAppEvent(
        'log.export',
        `Rejected: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Filter" />
      <Card>
        <Row
          label="Contains"
          right={
            <TextInput
              // The device flows filter the list to one entry name so an
              // absence assertion is exact: unfiltered, "not visible" only
              // means "not in the part of the list the hierarchy holds".
              // The input's only text is its placeholder, which the Row's
              // label repeats, so a text selector taps the label instead.
              testID="log-filter-input"
              style={inputStyle}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Event name or detail"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Row
          label="Source"
          right={
            <View style={[styles.filters, { gap: spacing.sm }]}>
              {SOURCE_FILTERS.map((source) => (
                <Pressable key={source} onPress={() => toggleSource(source)}>
                  <Badge
                    label={source}
                    tone={sources.includes(source) ? 'primary' : 'default'}
                  />
                </Pressable>
              ))}
            </View>
          }
        />
        <Row label="Showing" value={`${visible.length} of ${entries.length}`} />
        <Button title="Export visible entries" onPress={onExport} />
        <Button title="Clear log" variant="secondary" onPress={clear} />
      </Card>

      <SectionHeader title="Entries" />
      <Card>
        {visible.length === 0 ? (
          <Text style={[type.body, { color: colors.textMuted }]}>
            {entries.length === 0
              ? 'No entries yet. SDK events and app milestones appear here as they happen, newest first.'
              : 'No entry matches the current filter.'}
          </Text>
        ) : (
          visible.map((entry) => (
            <View key={entry.id} style={{ paddingVertical: spacing.sm }}>
              <View style={[styles.entryHeader, { gap: spacing.sm }]}>
                <Text style={[type.caption, { color: colors.textMuted }]}>
                  {formatTimestamp(entry.timestampMs)}
                </Text>
                <Text
                  style={[type.body, styles.entryName, { color: colors.text }]}
                >
                  {entry.name}
                </Text>
                <Badge label={entry.source} />
              </View>
              {entry.detail === '' ? null : (
                <Text style={[type.caption, { color: colors.textMuted }]}>
                  {entry.detail}
                </Text>
              )}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row' },
  entryHeader: { alignItems: 'center', flexDirection: 'row' },
  entryName: { flexGrow: 1, flexShrink: 1 },
});
