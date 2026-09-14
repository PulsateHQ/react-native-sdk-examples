import { StyleSheet, type TextStyle } from 'react-native';

import { useTheme } from '../theme/theme';

export function useInputStyle(): TextStyle {
  const { colors, radii, spacing, type } = useTheme();

  return {
    flex: 1,
    // Half the row at least: the device driver clears an input by tapping
    // its right edge, which only lands past the last character when the
    // default value fits.
    minWidth: '50%',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...type.body,
  };
}
