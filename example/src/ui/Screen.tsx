import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/theme';

type ScreenProps = {
  scroll?: boolean;
  children?: ReactNode;
};

export function Screen({ scroll = true, children }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const content = { gap: spacing.md, padding: spacing.lg };

  return (
    // The native-stack header owns the top inset; only the remaining edges here.
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.fill, { backgroundColor: colors.bg }]}
    >
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={content}
          // A tap on a button while the keyboard is up presses it, instead of
          // only dismissing the keyboard.
          keyboardShouldPersistTaps="handled"
          // iOS only: insets the content by the keyboard and keeps the focused
          // field visible. Android resizes the window instead (adjustResize).
          automaticallyAdjustKeyboardInsets
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
