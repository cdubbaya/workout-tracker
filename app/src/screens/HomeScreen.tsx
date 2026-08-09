import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Identity } from '../core/events';
import { colors, pageGradient, radius, shadow, spacing, type } from '../theme/tokens';

/**
 * Home is a set of slots that later tickets fill in.
 *
 * Nothing here holds data — there is no account and no session yet. Each slot
 * ships its arrangement and its empty state so the ticket that owns it adds a
 * card rather than redesigning the screen. `owner` names the spec that fills
 * the slot; the layout was settled by the prototype's Home "Week dots" variant.
 */

export type HomeSlot = {
  /** The spec that fills this slot. */
  owner: 'budget' | 'streak' | 'week' | 'level' | 'challenge';
  /** The issue that owns it, for anyone reading the layout cold. */
  issue: number;
  title: string;
  /** Shown until that spec lands. States the absence; never a placeholder figure. */
  emptyLabel: string;
  /** Slots sharing a row sit side by side, as level and its neighbour do. */
  row?: 'pair';
};

export const HOME_SLOTS: readonly HomeSlot[] = [
  {
    owner: 'streak',
    issue: 4,
    title: 'Streak',
    emptyLabel: 'Your streak starts with your first session',
  },
  {
    owner: 'week',
    issue: 4,
    title: 'This week',
    emptyLabel: 'A fresh slate every Monday',
  },
  {
    owner: 'budget',
    issue: 3,
    title: "Today's session",
    emptyLabel: 'Set up your Max Test to get a Daily Budget',
  },
  {
    owner: 'level',
    issue: 4,
    title: 'Level',
    emptyLabel: 'Earn XP to start the Level track',
    row: 'pair',
  },
  {
    owner: 'challenge',
    issue: 6,
    title: 'Challenges',
    emptyLabel: 'Add a friend to start a Challenge',
    row: 'pair',
  },
];

function Slot({ slot }: { slot: HomeSlot }) {
  return (
    <View
      testID={`home-slot-${slot.owner}`}
      style={[styles.card, slot.row === 'pair' && styles.cardInPair]}
    >
      <Text style={styles.cardLabel}>{slot.title}</Text>
      <Text style={styles.cardEmpty}>{slot.emptyLabel}</Text>
    </View>
  );
}

export type HomeScreenProps = {
  /** The signed-in user, or `null` before anyone has signed in. */
  identity?: Identity | null;
  onSignOut?: () => void;
  /**
   * Called once the user has confirmed. The screen owns the confirmation; what
   * deletion *means* belongs to the core, as it does for sign-out.
   */
  onDeleteAccount?: () => void;
};

/**
 * Ask before destroying an account, and say plainly that it is permanent.
 *
 * A platform alert rather than a screen of its own: the decision is one
 * question with two answers, and routing to a page for it invites the user to
 * skim. The destructive style is what puts the weight on the right button.
 */
function confirmDeletion(onConfirm: () => void) {
  Alert.alert(
    'Delete your account?',
    'This deletes your account and every session, streak and challenge in it. ' +
      'It cannot be undone.',
    [
      // Cancel first, and the default: the safe answer should be the easy one.
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export function HomeScreen({
  identity = null,
  onSignOut,
  onDeleteAccount,
}: HomeScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const paired = HOME_SLOTS.filter((slot) => slot.row === 'pair');
  const stacked = HOME_SLOTS.filter((slot) => slot.row !== 'pair');

  return (
    <LinearGradient colors={pageGradient} style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        <Text style={styles.greeting}>Push-ups</Text>

        {identity ? (
          <View style={styles.identityRow}>
            <Text testID="home-identity" style={styles.subhead}>
              Signed in as {identity.email}
            </Text>
            {onSignOut ? (
              <Pressable
                testID="home-sign-out"
                accessibilityRole="button"
                onPress={onSignOut}
                hitSlop={spacing.sm}
              >
                <Text style={styles.signOut}>Sign out</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.subhead}>Nothing here yet — set up to get started.</Text>
        )}

        {stacked.map((slot) => (
          <Slot key={slot.owner} slot={slot} />
        ))}

        <View style={styles.pairRow}>
          {paired.map((slot) => (
            <Slot key={slot.owner} slot={slot} />
          ))}
        </View>

        {identity && onDeleteAccount ? (
          // Last on the screen and quiet: leaving should be findable without
          // being offered. Hidden entirely when signed out — there is no
          // account to delete.
          <Pressable
            testID="home-delete-account"
            accessibilityRole="button"
            onPress={() => confirmDeletion(onDeleteAccount)}
            hitSlop={spacing.sm}
            style={styles.deleteAccount}
          >
            <Text style={styles.deleteAccountLabel}>Delete account</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  greeting: {
    ...type.title,
    color: colors.ink,
  },
  subhead: {
    ...type.bodySmall,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  signOut: {
    ...type.bodySmall,
    color: colors.fullDeep,
    marginBottom: spacing.xs,
  },
  deleteAccount: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  deleteAccountLabel: {
    ...type.bodySmall,
    // Deliberately quiet, and in the same ink as the rest of the secondary
    // text. The destructive weight belongs on the alert's confirm button, where
    // the decision is actually made — a red link here would shout at a user who
    // is only scrolling past it. No danger token exists yet; the ticket that
    // needs one can add it.
    color: colors.inkFaint,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardInPair: {
    flex: 1,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardLabel: {
    ...type.label,
    color: colors.inkFaint,
  },
  cardEmpty: {
    ...type.body,
    color: colors.inkSoft,
  },
});
