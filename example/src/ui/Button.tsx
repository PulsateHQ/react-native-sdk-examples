import { Pressable, Text, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  testID?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: ButtonProps) {
  const { colors, spacing, radii, type } = useTheme();

  const shape: ViewStyle = {
    alignItems: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  };

  const skin: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.primary }
      : variant === 'secondary'
        ? { backgroundColor: colors.primarySoft }
        : {};

  const label: TextStyle = {
    ...type.body,
    fontWeight: '600',
    color: variant === 'primary' ? colors.onPrimary : colors.primary,
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        shape,
        skin,
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={label}>{title}</Text>
    </Pressable>
  );
}
