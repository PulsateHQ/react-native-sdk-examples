import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * The map grows one entry per §4 screen as each phase lands its area.
 *
 * Credentials are not route params: §6 rule 3 keeps screens free of app
 * bootstrap, so `App.tsx` injects them as props at the stack screen instead.
 */
export type RootStackParamList = {
  Home: undefined;
  Sessions: undefined;
  Settings: undefined;
  Attributes: undefined;
  Feed: undefined;
  InApp: undefined;
  Push: undefined;
  Deeplinks: undefined;
  LinkTarget: { url: string };
  Location: undefined;
  Log: undefined;
};

export type RootScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;
