import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from './theme';

type CardProps = {
  onPress?: () => void;
  /** Renders dimmed and inert, `onPress` included. */
  disabled?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
};

export function Card({
  onPress,
  disabled = false,
  style,
  children,
}: CardProps) {
  const { dark, colors, spacing, radii, shadow } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: dark ? 1 : 0,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadow,
  };

  if (onPress === undefined || disabled) {
    return (
      <View style={[base, disabled && styles.disabled, style]}>{children}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.6 }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
});
