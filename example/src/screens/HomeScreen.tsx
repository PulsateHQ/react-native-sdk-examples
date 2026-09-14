import { Fragment } from 'react';

import { Badge, Card, Row, Screen, SectionHeader } from '../ui';
import type { RootScreenProps, RootStackParamList } from './routes';

type Area = {
  name: string;
  /** The area-ID range the screen owns, per the plan's §4 screen map. */
  ids: string;
  /** What the screen lets a tester do, in one line. */
  detail: string;
  /**
   * The menu navigates with no params, so it can only name a route that takes
   * none. `LinkTarget` is excluded for that reason and because nothing reaches
   * it from here: the `onLink` handler routes to it with the URL it consumed.
   */
  route: Exclude<keyof RootStackParamList, 'LinkTarget'>;
};

type Group = { title: string; areas: Area[] };

const GROUPS: Group[] = [
  {
    title: 'Setup',
    areas: [
      {
        name: 'Settings',
        ids: 'SESS-01',
        detail: 'Stored credentials, applied on the next cold launch.',
        route: 'Settings',
      },
      {
        name: 'Sessions & User',
        ids: 'SESS/USER',
        detail: 'Configure, start a session, log out, profile fields.',
        route: 'Sessions',
      },
    ],
  },
  {
    title: 'SDK areas',
    areas: [
      {
        name: 'Attributes & Events',
        ids: 'ATTR',
        detail:
          'Custom attributes and events, with the sync that carries them.',
        route: 'Attributes',
      },
      {
        name: 'Feed / Inbox',
        ids: 'FEED',
        detail: 'Open the feed, authorization, close events.',
        route: 'Feed',
      },
      {
        name: 'In-App',
        ids: 'INAPP',
        detail: 'Enable and show in-app messages.',
        route: 'InApp',
      },
      {
        name: 'Push & Badges',
        ids: 'PUSH/BADGE',
        detail: 'Permission, push preference, badge count, clear tray.',
        route: 'Push',
      },
      {
        name: 'Deeplinks',
        ids: 'LINK',
        detail: 'Link events, cold-start replay, JS routing.',
        route: 'Deeplinks',
      },
      {
        name: 'Location',
        ids: 'LOC',
        detail: 'Tracking, OS permission, geofence crossings.',
        route: 'Location',
      },
    ],
  },
  {
    title: 'Diagnostics',
    areas: [
      {
        name: 'Log',
        ids: 'all',
        detail: 'Every SDK event and app milestone, filterable, exportable.',
        route: 'Log',
      },
    ],
  },
];

export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  return (
    <Screen scroll>
      {GROUPS.map((group) => (
        <Fragment key={group.title}>
          <SectionHeader title={group.title} />
          {group.areas.map((area) => (
            <Card
              key={area.name}
              onPress={() => navigation.navigate(area.route)}
            >
              <Row
                label={area.name}
                detail={area.detail}
                right={<Badge label={area.ids} />}
              />
            </Card>
          ))}
        </Fragment>
      ))}
    </Screen>
  );
}
