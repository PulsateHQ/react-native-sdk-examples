import { Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';

type BadgeTone = 'default' | 'primary' | 'success' | 'danger';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const { colors, spacing, type } = useTheme();

  const toneColor: Record<BadgeTone, string> = {
    default: colors.textMuted,
    primary: colors.primary,
    success: colors.success,
    danger: colors.danger,
  };

  const container: ViewStyle = {
    alignSelf: 'flex-start',
    borderColor: toneColor[tone],
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  };

  const text: TextStyle = { ...type.label, color: toneColor[tone] };

  return (
    <View style={container}>
      <Text style={text}>{label}</Text>
    </View>
  );
}
