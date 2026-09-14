import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/theme';

type RowProps = {
  label: string;
  value?: string;
  /** A second, muted line under the label. */
  detail?: string;
  right?: ReactNode;
  onPress?: () => void;
};

export function Row({ label, value, detail, right, onPress }: RowProps) {
  const { colors, spacing, type } = useTheme();

  const base: ViewStyle = {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  };

  const content = (
    <>
      <View style={styles.label}>
        <Text style={[type.body, { color: colors.text }]}>{label}</Text>
        {detail === undefined ? null : (
          <Text style={[type.caption, { color: colors.textMuted }]}>
            {detail}
          </Text>
        )}
      </View>
      {value === undefined ? null : (
        <Text style={[type.body, styles.value, { color: colors.textMuted }]}>
          {value}
        </Text>
      )}
      {right}
    </>
  );

  if (onPress === undefined) {
    return <View style={base}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.6 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The label can shrink so a long detail line does not push the value off
  // screen, but never below two fifths of the row: a long value wraps instead
  // of squeezing the label to a column of characters.
  label: { flexGrow: 1, flexShrink: 1, minWidth: '40%' },
  value: { flexShrink: 1, textAlign: 'right' },
});
