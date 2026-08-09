import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { createSupabaseClient } from './src/drivers/client';
import { screenFor } from './src/core/state';
import { useCore } from './src/session/useCore';
import { appFonts } from './src/theme/fonts';

// Hold the splash until the fonts are ready, so Home never paints in a system
// face and then reflow into Baloo 2 and Figtree.
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(appFonts);

  // Hiding on layout rather than in an effect means the first painted frame is
  // the one the user sees.
  const onLayout = useCallback(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // A font that fails to load should not leave the user on a blank screen —
  // render in the fallback face instead.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <StatusBar style="dark" />
        <Root />
      </View>
    </SafeAreaProvider>
  );
}

// Created once, outside the component: a client rebuilt on every render would
// drop the auth subscription and re-read the persisted session each time.
const client = createSupabaseClient();

/**
 * Renders the screen core state puts the user on.
 *
 * The choice itself is `screenFor` in the core, tested without a renderer. This
 * function only maps its answer to a component — so a returning user going
 * straight to Home, rather than through onboarding, is a rule with a test rather
 * than a condition in a component.
 *
 * A returning user never flashes sign-in either: `useCore` restores the
 * persisted session before reporting ready.
 */
function Root() {
  const { state, ready, dispatch, nextWriteId } = useCore(client);

  if (!ready) {
    return null;
  }

  switch (screenFor(state)) {
    case 'sign-in':
      return <SignInScreen client={client} />;

    case 'loading':
      // Signed in, profile has not answered yet. Blank rather than onboarding:
      // the disclaimer shown to someone who already accepted it is the failure
      // worth a frame of nothing.
      return null;

    case 'onboarding':
      return (
        <OnboardingScreen
          onAcknowledge={() => {
            // The screen reports the intent; the core records it and emits the
            // write. Timestamped and keyed here because this is the driver
            // layer — the core reads neither a clock nor a randomness source.
            dispatch({
              type: 'OnboardingAcknowledged',
              at: Date.now(),
              writeId: nextWriteId(),
            });
          }}
        />
      );

    case 'home':
      return (
        <HomeScreen
          identity={state.identity}
          onSignOut={() => {
            // Supabase's auth listener raises `SignedOut` through the core, so
            // the screen does not have to dispatch it and cannot get it wrong.
            void client.auth.signOut();
          }}
        />
      );
  }
}
