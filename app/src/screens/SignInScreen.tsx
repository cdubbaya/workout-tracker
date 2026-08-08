/**
 * Email sign-in. One field, one password, one button that does both jobs.
 *
 * Sign-up and sign-in share a screen because for a returning user on a new
 * phone the distinction is noise — they know their address, and being told
 * "account already exists" is a dead end rather than an answer.
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SupabaseClient } from '@supabase/supabase-js';

import { colors, pageGradient, radius, shadow, spacing, type } from '../theme/tokens';

export type SignInScreenProps = {
  client: SupabaseClient;
};

export function SignInScreen({ client }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);

    // Try to sign in first. A new address fails with invalid credentials,
    // which is the signal to create the account rather than an error worth
    // showing anyone.
    const attempt = await client.auth.signInWithPassword({ email: email.trim(), password });

    if (!attempt.error) {
      setBusy(false);
      return;
    }

    const created = await client.auth.signUp({ email: email.trim(), password });
    setBusy(false);

    if (created.error) {
      setError(created.error.message);
      return;
    }

    // A project with email confirmation on returns a user but no session.
    // Saying so beats a button that appears to do nothing.
    if (!created.data.session) {
      setError('Check your email to confirm your account, then sign in.');
    }
  }, [client, email, password]);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <LinearGradient colors={pageGradient} style={styles.page}>
      <KeyboardAvoidingView behavior="padding" style={styles.centre}>
        <View style={styles.card}>
          <Text style={styles.title}>Push-ups</Text>
          <Text style={styles.subhead}>Sign in, or enter a new address to start.</Text>

          <TextInput
            testID="sign-in-email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
          />

          <TextInput
            testID="sign-in-password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.inkFaint}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            accessibilityLabel="Password"
          />

          {error ? (
            <Text testID="sign-in-error" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            testID="sign-in-submit"
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => {
              void submit();
            }}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonLabel}>Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  centre: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    ...shadow.card,
  },
  title: { ...type.title, color: colors.ink },
  subhead: { ...type.bodySmall, color: colors.inkSoft, marginBottom: spacing.xs },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: { ...type.bodySmall, color: colors.streak },
  button: {
    backgroundColor: colors.fullDeep,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { backgroundColor: colors.inkFaint },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { ...type.body, color: colors.white },
});
