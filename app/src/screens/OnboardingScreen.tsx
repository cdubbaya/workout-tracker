/**
 * Onboarding: the medical disclaimer, what the camera is for, and what leaves
 * the phone.
 *
 * Three blocks on one scrolling screen, in that order, with nothing behind a
 * link. The ordering is the point of the screen:
 *
 * - The disclaimer comes first because it is load-bearing rather than
 *   ceremonial. ADR-0007 removed scheduled rest days and made recovery the
 *   user's decision; this is the only place the product says so. The copy is
 *   written against that ADR, not adapted from another app's boilerplate — a
 *   generic "consult a physician" notice would not tell the user the thing they
 *   cannot infer, which is that nothing here will ever tell them to rest.
 * - The camera explainer comes before anything requests the permission. Spec #2
 *   owns the request; this screen owns the explanation, so the user has already
 *   read why the lens is wanted by the time iOS asks.
 * - The privacy explainer states the precise claim rather than the expansive
 *   one (ADR-0009, ADR-0010, vision §11). Both halves in one sentence: an
 *   explainer naming only the reassuring half is worse than saying nothing.
 */

import { useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, pageGradient, radius, shadow, spacing, type } from '../theme/tokens';

export type OnboardingScreenProps = {
  /** The user accepted. The core decides what that means and what it writes. */
  onAcknowledge: () => void;
};

export function OnboardingScreen({ onAcknowledge }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  const acknowledge = useCallback(() => {
    onAcknowledge();
  }, [onAcknowledge]);

  return (
    <LinearGradient colors={pageGradient} style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xxxl,
          },
        ]}
      >
        <Text style={styles.title}>Before you start</Text>

        <View testID="onboarding-disclaimer" style={styles.card}>
          <Text style={styles.cardLabel}>Your health</Text>
          <Text style={styles.cardTitle}>You manage your own recovery</Text>

          <Text style={styles.body}>
            This app sets you a goal each day. It does not schedule rest days, and it will
            never tell you to take one — how hard any given day is, and when you need a
            lighter one, is your call.
          </Text>

          {/*
            The streak and challenges are named explicitly because they are the
            pressure ADR-0007 accepts. A user who knows a light day still pays is
            far less likely to overreach to protect a number.
          */}
          <Text style={styles.body}>
            Nothing here punishes an easy day. A single counted rep holds your streak, and
            showing up at all earns XP even if you stop well short of the goal. Stop when
            your body says to, not when the goal says to.
          </Text>

          <Text style={styles.body}>
            Push-ups load your shoulders, elbows and wrists. Talk to a doctor before
            starting if you are pregnant, recovering from injury or surgery, or have a
            heart, joint or blood-pressure condition. Stop if you feel pain, dizziness or
            chest discomfort — this app cannot see any of that.
          </Text>
        </View>

        <View testID="onboarding-camera" style={styles.card}>
          <Text style={styles.cardLabel}>The camera</Text>
          <Text style={styles.cardTitle}>It watches you, to count for you</Text>

          <Text style={styles.body}>
            Stand your phone up in front of you, three or four feet away, and the front
            camera counts your reps as you do them — how deep each one went and how long it
            took. That is the whole reason the camera is here.
          </Text>

          <Text style={styles.body}>
            {/*
              Named here rather than left for iOS to introduce: the system prompt
              arrives in spec #2, and a user meeting the request cold has no way
              to know why an exercise app wants a lens.
            */}
            Your phone will ask for camera permission the first time you start a session.
          </Text>
        </View>

        <View testID="onboarding-privacy" style={styles.card}>
          <Text style={styles.cardLabel}>Your privacy</Text>

          {/*
            One sentence, both halves. Same wording as the privacy policy and the
            App Store listing, so a user comparing them finds the same claim in
            all three places.
          */}
          <Text style={styles.claim}>
            Video and pose landmarks never leave your device; workout results and your
            friends list do.
          </Text>

          <Text style={styles.body}>
            The camera feed is processed on your phone, frame by frame. No video is
            uploaded and none is recorded — not even briefly. The coordinates describing
            where your body is exist in memory for the length of a rep and are then thrown
            away.
          </Text>

          <Text style={styles.body}>
            What does go to our server: your email, the results of each session, your XP,
            and your friends list. That is what makes your history survive a new phone and
            what makes challenges with friends possible.
          </Text>
        </View>

        <Pressable
          testID="onboarding-acknowledge"
          accessibilityRole="button"
          onPress={acknowledge}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          {/*
            An acceptance, not a dismissal. "OK" would make the disclaimer the
            ceremonial notice ADR-0007 says it must not be.
          */}
          <Text style={styles.buttonLabel}>I understand — let’s go</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...type.title,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardLabel: {
    ...type.label,
    color: colors.inkFaint,
  },
  cardTitle: {
    ...type.cardTitle,
    color: colors.ink,
  },
  body: {
    ...type.body,
    color: colors.inkSoft,
  },
  /** The privacy sentence carries the weight of a heading, so it reads as one. */
  claim: {
    ...type.cardTitle,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.fullDeep,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: { ...type.body, color: colors.white },
});
