import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';

const VISIBLE_MS = 2500;

type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();

/**
 * Shows a toast if a `ToastHost` is mounted, and is a no-op otherwise — a
 * missing host must never break the call that raised the message, since the
 * persistent record is the log store either way.
 */
export function showToast(message: string): void {
  for (const listener of [...listeners]) {
    listener(message);
  }
}

/**
 * Rendered once, above the navigator. Only the newest message is shown: the
 * toast is a glance, and the Log screen is the record.
 */
export function ToastHost() {
  const { dark, colors, spacing, radii, type, shadow } = useTheme();
  const [message, setMessage] = useState<string | undefined>(undefined);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const listener: ToastListener = (next) => {
      setMessage(next);
      if (timeout.current !== undefined) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => {
        setMessage(undefined);
      }, VISIBLE_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timeout.current !== undefined) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  if (message === undefined) {
    return null;
  }

  const container: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: dark ? 1 : 0,
    bottom: spacing.xl,
    left: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    right: spacing.lg,
    ...shadow,
  };

  return (
    <View pointerEvents="none" style={[styles.overlay, container]}>
      <Text numberOfLines={3} style={[type.body, { color: colors.text }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute' },
});
