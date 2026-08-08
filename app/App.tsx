import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { HomeScreen } from './src/screens/HomeScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { createSupabaseClient } from './src/drivers/client';
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
 * Chooses the screen from core state.
 *
 * A returning user goes straight to Home — `useCore` restores the persisted
 * session before reporting ready, so the app never flashes sign-in at someone
 * who is already signed in.
 */
function Root() {
  const { state, ready } = useCore(client);

  if (!ready) {
    return null;
  }

  if (!state.identity) {
    return <SignInScreen client={client} />;
  }

  return (
    <HomeScreen
      identity={state.identity}
      onSignOut={() => {
        // Supabase's auth listener raises `SignedOut` through the core, so the
        // screen does not have to dispatch it and cannot get it wrong.
        void client.auth.signOut();
      }}
    />
  );
}
