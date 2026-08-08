import {
  Baloo2_600SemiBold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';

/**
 * The fonts the app loads at startup, keyed by the names `tokens.ts` refers to.
 *
 * Baloo 2 carries display type and numerals; Figtree carries UI text. Keeping
 * the map here and the names in `tokens.ts` means a screen never names a font
 * directly — it asks for `type.hero` and gets whatever that resolves to.
 */
export const appFonts = {
  Baloo2_800ExtraBold,
  Baloo2_600SemiBold,
  Figtree_600SemiBold,
  Figtree_700Bold,
} as const;
