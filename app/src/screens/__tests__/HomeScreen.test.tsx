import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HOME_SLOTS, HomeScreen } from '../HomeScreen';
import { colors, fonts, type } from '../../theme/tokens';

/**
 * Home reads safe-area insets, so it needs the provider App wraps it in. The
 * frame is supplied explicitly because the test renderer has no window to
 * measure — without it the provider never resolves and children never paint.
 *
 * `render` is async in React Native Testing Library 14 — it returns a Promise
 * and must be awaited before the result carries any queries.
 */
async function renderHome() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 59, left: 0, right: 0, bottom: 34 },
      }}
    >
      <HomeScreen />
    </SafeAreaProvider>,
  );
}

function escapeForRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * These assert the acceptance criteria of issue #7, not the particular copy the
 * empty state happens to ship with. A later ticket filling a slot with its real
 * card should not have to edit these.
 */

describe('Home slot layout', () => {
  it('reserves a slot for each card a later spec fills', () => {
    // The criterion is that budget, streak, level and challenge are each
    // accommodated without rework. Assert the slots by the spec that owns them,
    // so renaming a slot's label cannot silently drop one.
    const owners = HOME_SLOTS.map((slot) => slot.owner);

    expect(owners).toEqual(
      expect.arrayContaining(['budget', 'streak', 'week', 'level', 'challenge']),
    );
  });

  it('renders every declared slot', async () => {
    const { getByTestId } = await renderHome();

    // Each slot is present on the screen — a slot declared but never rendered
    // would satisfy the previous test and still leave the layout unbuilt.
    for (const slot of HOME_SLOTS) {
      expect(getByTestId(`home-slot-${slot.owner}`)).toBeTruthy();
    }
  });

  it('shows each slot in its empty state, with no fabricated data', async () => {
    const { getByTestId } = await renderHome();

    // The issue is explicit that there is no account, no workout and no data.
    // A placeholder number would read as real and is exactly what this guards.
    for (const slot of HOME_SLOTS) {
      // A substring match: the slot also renders its title, and this asserts
      // the empty state is present rather than pinning the card's full text.
      const node = getByTestId(`home-slot-${slot.owner}`);
      expect(node).toHaveTextContent(new RegExp(escapeForRegExp(slot.emptyLabel)));
    }
  });
});

describe('Typography', () => {
  it('uses Baloo 2 for display type and numerals', () => {
    // Criterion: Baloo 2 renders for display type and numerals. Assert against
    // the token, not a literal, so the two cannot drift apart.
    expect(type.hero.fontFamily).toBe(fonts.display);
    expect(type.numeral.fontFamily).toBe(fonts.display);
    expect(type.title.fontFamily).toBe(fonts.display);
    expect(fonts.display).toMatch(/^Baloo2_/);
  });

  it('uses Figtree for UI text', () => {
    expect(type.body.fontFamily).toBe(fonts.sans);
    expect(type.bodySmall.fontFamily).toBe(fonts.sans);
    expect(fonts.sans).toMatch(/^Figtree_/);
    expect(fonts.sansBold).toMatch(/^Figtree_/);
  });
});

describe('Palette', () => {
  it('holds to the settled palette with no purple', () => {
    // The direction names white, grey, green, blue, yellow and orange, and
    // rules out purple. Purple is red and blue high with green lagging both,
    // which is a property of the hex rather than a list of banned values.
    for (const [name, hex] of Object.entries(colors)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const isPurple = r > g && b > g && Math.min(r, b) - g > 24;

      expect(isPurple ? `${name} (${hex})` : null).toBeNull();
    }
  });
});
