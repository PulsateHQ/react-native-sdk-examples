import { Text } from 'react-native';

import { useTheme } from '../theme/theme';

type SectionHeaderProps = {
  title: string;
};

// "Credentials (SESS-01)" renders the name in text colour and the trailing
// method-ID group muted, so the ID stays greppable on screen without competing
// with the name.
const TITLE_WITH_IDS = /^(.*?)(\s\([^()]*\))$/;

export function SectionHeader({ title }: SectionHeaderProps) {
  const { colors, spacing, type } = useTheme();
  const match = TITLE_WITH_IDS.exec(title);
  const name = match ? match[1] : title;
  const ids = match ? match[2] : '';

  return (
    <Text style={[type.heading, { color: colors.text, marginTop: spacing.sm }]}>
      {name}
      {ids === '' ? null : (
        <Text style={[type.caption, { color: colors.textMuted }]}>{ids}</Text>
      )}
    </Text>
  );
}
