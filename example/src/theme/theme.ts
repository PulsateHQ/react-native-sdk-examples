import { useColorScheme } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radii = {
  sm: 6,
  md: 12,
} as const;

export type Spacing = typeof spacing;
export type Radii = typeof radii;

export type ColorName =
  | 'bg'
  | 'surface'
  | 'border'
  | 'text'
  | 'textMuted'
  | 'primary'
  | 'primarySoft'
  | 'onPrimary'
  | 'success'
  | 'danger';

export type Colors = Record<ColorName, string>;

// `primary` is Pulsate's brand indigo, so the harness reads as the product it
// demonstrates rather than as a stock template.
const lightColors: Colors = {
  bg: '#f3f4f8',
  surface: '#ffffff',
  border: '#e1e4ec',
  text: '#171a26',
  textMuted: '#646b80',
  primary: '#4d68ac',
  primarySoft: '#e9edf8',
  onPrimary: '#ffffff',
  success: '#1a7f37',
  danger: '#b3261e',
};

const darkColors: Colors = {
  bg: '#101218',
  surface: '#1a1d27',
  border: '#2c303d',
  text: '#eef0f6',
  textMuted: '#9aa1b4',
  primary: '#93a8e6',
  primarySoft: '#262c40',
  onPrimary: '#101218',
  success: '#4ac97e',
  danger: '#f2726b',
};

export type TypeName = 'title' | 'heading' | 'body' | 'caption' | 'label';

export type Type = Record<
  TypeName,
  Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight'>
>;

export const type: Type = {
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  heading: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
};

export type Theme = {
  dark: boolean;
  colors: Colors;
  spacing: Spacing;
  type: Type;
  radii: Radii;
  /** Surface elevation. Empty in dark mode, where a border does the job. */
  shadow: ViewStyle;
};

const lightShadow: ViewStyle = {
  shadowColor: '#171a26',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  spacing,
  type,
  radii,
  shadow: lightShadow,
};
const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  spacing,
  type,
  radii,
  shadow: {},
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
