import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { HomeScreen } from './src/screens/HomeScreen';
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
        <HomeScreen />
      </View>
    </SafeAreaProvider>
  );
}
