import { useState } from 'react';
import { TextInput } from 'react-native';

import {
  configure,
  logout,
  forceAttributeSync,
  getPrivacy,
  setPrivacy,
  startSession,
  updateAge,
  updateEmail,
  updateFirstName,
  updateGender,
  updateLastName,
  updatePhoneNumber,
  userHasLoggedIn,
  userHasLoggedOut,
  type Gender,
  type PrivacyLevel,
} from '@pulsatehq/react-native-sdk';

import {
  Button,
  Card,
  OutcomeRow,
  Row,
  Screen,
  SectionHeader,
  describeRejection,
  useInputStyle,
  useTheme,
  type Outcome,
} from '../ui';

export type SessionsScreenProps = {
  defaultAppId: string;
  defaultAppKey: string;
};

export function SessionsScreen({
  defaultAppId,
  defaultAppKey,
}: SessionsScreenProps) {
  const { colors } = useTheme();
  const inputStyle = useInputStyle();
  const [appId, setAppId] = useState(defaultAppId);
  const [appKey, setAppKey] = useState(defaultAppKey);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [alias, setAlias] = useState('');
  const [sessionOutcome, setSessionOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [logoutOutcome, setLogoutOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [authSignalOutcome, setAuthSignalOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [syncOutcome, setSyncOutcome] = useState<Outcome>({ kind: 'idle' });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('');
  const [firstNameOutcome, setFirstNameOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [lastNameOutcome, setLastNameOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [emailOutcome, setEmailOutcome] = useState<Outcome>({ kind: 'idle' });
  const [genderOutcome, setGenderOutcome] = useState<Outcome>({ kind: 'idle' });
  const [ageOutcome, setAgeOutcome] = useState<Outcome>({ kind: 'idle' });
  const [phoneOutcome, setPhoneOutcome] = useState<Outcome>({ kind: 'idle' });
  const [privacyOutcome, setPrivacyOutcome] = useState<Outcome>({
    kind: 'idle',
  });
  const [privacyReadOutcome, setPrivacyReadOutcome] = useState<Outcome>({
    kind: 'idle',
  });

  const onConfigure = async () => {
    setOutcome({ kind: 'pending' });
    try {
      await configure({ appId, appKey });
      setOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onStartSession = async () => {
    setSessionOutcome({ kind: 'pending' });
    try {
      await startSession(alias, { debug: false });
      setSessionOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setSessionOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onLogout = async () => {
    setLogoutOutcome({ kind: 'pending' });
    try {
      await logout();
      setLogoutOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setLogoutOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onAuthSignal = async (signal: () => Promise<void>) => {
    setAuthSignalOutcome({ kind: 'pending' });
    try {
      await signal();
      setAuthSignalOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setAuthSignalOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onForceSync = async () => {
    setSyncOutcome({ kind: 'pending' });
    try {
      await forceAttributeSync();
      setSyncOutcome({ kind: 'resolved' });
    } catch (error: unknown) {
      setSyncOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onUserUpdate = async (
    update: () => Promise<void>,
    setUserOutcome: (outcome: Outcome) => void,
    dispatched: string
  ) => {
    setUserOutcome({ kind: 'pending' });
    try {
      await update();
      setUserOutcome({
        kind: 'resolved',
        detail: `Dispatched: ${dispatched}.`,
      });
    } catch (error: unknown) {
      setUserOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onSetPrivacy = async (level: PrivacyLevel) => {
    setPrivacyOutcome({ kind: 'pending' });
    try {
      await setPrivacy(level);
      setPrivacyOutcome({
        kind: 'resolved',
        detail: `Dispatched: ${JSON.stringify(level)}.`,
      });
    } catch (error: unknown) {
      setPrivacyOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  const onReadPrivacy = async () => {
    setPrivacyReadOutcome({ kind: 'pending' });
    try {
      const current = await getPrivacy();
      setPrivacyReadOutcome({
        kind: 'resolved',
        detail: `Resolved: ${current}.`,
      });
    } catch (error: unknown) {
      setPrivacyReadOutcome({ kind: 'rejected', ...describeRejection(error) });
    }
  };

  return (
    <Screen scroll>
      <SectionHeader title="Credentials (SESS-01)" />
      <Card>
        <Row
          label="App ID"
          right={
            <TextInput
              style={inputStyle}
              value={appId}
              onChangeText={setAppId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="App ID"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Row
          label="App Key"
          right={
            <TextInput
              style={inputStyle}
              value={appKey}
              onChangeText={setAppKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="App Key"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Configure"
          onPress={onConfigure}
          disabled={outcome.kind === 'pending'}
        />
        <OutcomeRow outcome={outcome} pendingLabel="Configuring…" />
      </Card>

      <SectionHeader title="Session (SESS-02, SESS-03)" />
      <Card>
        <Row
          label="Alias"
          right={
            <TextInput
              // The placeholder is the only text this input carries, and the
              // Row renders a label with the same word, so a text selector in
              // e2e/device cannot tell them apart.
              testID="sessions-alias-input"
              style={inputStyle}
              value={alias}
              onChangeText={setAlias}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Alias"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Row label="Debug (iOS-only) — support planned for a future release" />
        <Button
          testID="Start session (SESS-02)"
          title="Start session"
          onPress={onStartSession}
          disabled={sessionOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={sessionOutcome} pendingLabel="Starting session…" />
        <Button
          title="Logout"
          onPress={onLogout}
          variant="secondary"
          disabled={logoutOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={logoutOutcome} pendingLabel="Logging out…" />
      </Card>

      <SectionHeader title="Auth signals and sync (SESS-04, SESS-05)" />
      <Card>
        <Button
          title="User has logged in"
          onPress={() => onAuthSignal(userHasLoggedIn)}
          variant="secondary"
          disabled={authSignalOutcome.kind === 'pending'}
        />
        <Button
          title="User has logged out"
          onPress={() => onAuthSignal(userHasLoggedOut)}
          variant="secondary"
          disabled={authSignalOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={authSignalOutcome} pendingLabel="Signalling…" />
        <Button
          title="Force attribute sync"
          onPress={onForceSync}
          variant="secondary"
          disabled={syncOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={syncOutcome} pendingLabel="Syncing…" />
      </Card>

      <SectionHeader title="User profile (USER-01–USER-04)" />
      <Card>
        <Row label="Platform" value="Android and iOS" />
        <Row
          label="First name"
          right={
            <TextInput
              testID="user-first-name-input"
              style={inputStyle}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Update first name"
          onPress={() =>
            onUserUpdate(
              () => updateFirstName(firstName),
              setFirstNameOutcome,
              JSON.stringify(firstName)
            )
          }
          disabled={firstNameOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={firstNameOutcome} pendingLabel="Updating…" />
        <Row
          label="Last name"
          right={
            <TextInput
              testID="user-last-name-input"
              style={inputStyle}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Update last name"
          onPress={() =>
            onUserUpdate(
              () => updateLastName(lastName),
              setLastNameOutcome,
              JSON.stringify(lastName)
            )
          }
          disabled={lastNameOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={lastNameOutcome} pendingLabel="Updating…" />
        <Row
          label="Email"
          right={
            <TextInput
              testID="user-email-input"
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Update email"
          onPress={() =>
            onUserUpdate(
              () => updateEmail(email),
              setEmailOutcome,
              JSON.stringify(email)
            )
          }
          disabled={emailOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={emailOutcome} pendingLabel="Updating…" />
        <Row
          label="Gender"
          right={
            <>
              <Button
                title="Male"
                onPress={() => setGender('male')}
                variant={gender === 'male' ? 'primary' : 'secondary'}
              />
              <Button
                title="Female"
                onPress={() => setGender('female')}
                variant={gender === 'female' ? 'primary' : 'secondary'}
              />
            </>
          }
        />
        <Button
          title="Update gender"
          onPress={() =>
            onUserUpdate(
              () => updateGender(gender),
              setGenderOutcome,
              JSON.stringify(gender)
            )
          }
          disabled={genderOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={genderOutcome} pendingLabel="Updating…" />
        <Row
          label="Age (whole years)"
          right={
            <TextInput
              testID="user-age-input"
              style={inputStyle}
              value={age}
              onChangeText={setAge}
              autoCapitalize="none"
              autoCorrect={false}
              // "numeric" rather than "number-pad" on purpose: the decimal key
              // is what makes the TS VALIDATION_ERROR reachable from a device.
              keyboardType="numeric"
              placeholder="Age"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Update age"
          onPress={() =>
            // An empty or non-numeric box parses to NaN, which the library
            // refuses like any other non-integer; the screen adds no guard of
            // its own so the rejection shown is the library's.
            onUserUpdate(
              () => updateAge(Number.parseFloat(age)),
              setAgeOutcome,
              String(Number.parseFloat(age))
            )
          }
          disabled={ageOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={ageOutcome} pendingLabel="Updating…" />
        <Row
          label="Phone (E.164)"
          right={
            <TextInput
              testID="user-phone-input"
              style={inputStyle}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="phone-pad"
              placeholder="+40721234567"
              placeholderTextColor={colors.textMuted}
            />
          }
        />
        <Button
          title="Update phone number"
          onPress={() =>
            onUserUpdate(
              () => updatePhoneNumber(phoneNumber),
              setPhoneOutcome,
              JSON.stringify(phoneNumber)
            )
          }
          disabled={phoneOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={phoneOutcome} pendingLabel="Updating…" />
      </Card>

      <SectionHeader title="Privacy (USER-06)" />
      <Card>
        <Row label="Platform" value="Android and iOS" />
        {/* One outcome row for both levels: the two buttons set the same field,
            and the later tap is what the SDK acts on. */}
        <Button
          title="Subscribed"
          onPress={() => onSetPrivacy('subscribed')}
          disabled={privacyOutcome.kind === 'pending'}
        />
        <Button
          title="Unsubscribed"
          onPress={() => onSetPrivacy('unsubscribed')}
          disabled={privacyOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={privacyOutcome} pendingLabel="Updating…" />
        <Button
          title="Read privacy"
          onPress={onReadPrivacy}
          variant="secondary"
          disabled={privacyReadOutcome.kind === 'pending'}
        />
        <OutcomeRow outcome={privacyReadOutcome} pendingLabel="Reading…" />
      </Card>
    </Screen>
  );
}
