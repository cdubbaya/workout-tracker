import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen } from '../OnboardingScreen';

/**
 * Issue #10. The criteria here are content claims rather than behaviour, so they
 * are asserted the way `web-surface.test.ts` asserts the privacy policy's: read
 * the rendered copy and assert the property, with the criterion quoted above
 * each block.
 *
 * The assertions derive their terms from the domain vocabulary in CONTEXT.md and
 * from ADR-0007 rather than pinning the shipped phrasing, so the copy can be
 * reworded without going green on a screen that dropped the claim.
 */

async function renderOnboarding(props: Partial<Parameters<typeof OnboardingScreen>[0]> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 59, left: 0, right: 0, bottom: 34 },
      }}
    >
      <OnboardingScreen onAcknowledge={props.onAcknowledge ?? (() => {})} />
    </SafeAreaProvider>,
  );
}

/** Every string the screen rendered, flattened and normalised. */
async function copy(): Promise<string> {
  const { toJSON } = await renderOnboarding();

  const strings: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      strings.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object' && 'children' in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(toJSON());

  return strings.join(' ').replace(/\s+/g, ' ').toLowerCase();
}

describe('The medical disclaimer', () => {
  /**
   * Criterion: "A new user sees the medical disclaimer during onboarding, not
   * behind a terms link."
   */
  it('is on the screen itself, not behind a link', async () => {
    const { getByTestId } = await renderOnboarding();

    // Asserted as rendered text on the disclaimer block. A `Pressable` opening a
    // terms sheet would satisfy "the app mentions a disclaimer" and fail this.
    const disclaimer = getByTestId('onboarding-disclaimer');

    expect(disclaimer).toHaveTextContent(/doctor|medical|physician|health/i);
  });

  it('offers no terms link to bury itself behind', async () => {
    const { queryByTestId } = await renderOnboarding();

    // The failure mode the criterion names: a one-line summary plus "see terms"
    // is exactly the burial it forbids.
    expect(queryByTestId('onboarding-terms-link')).toBeNull();
  });

  /**
   * Criterion: "The disclaimer states that the user manages their own recovery."
   *
   * This is the load-bearing sentence. ADR-0007 removed scheduled rest days and
   * made recovery the user's decision, and this screen is where that
   * responsibility is actually stated — so the wording is checked against the
   * ADR rather than against another app's boilerplate.
   */
  it('says recovery is the user’s own to manage', async () => {
    const text = await copy();

    expect(text).toMatch(/recovery|rest/);
    // The claim is that the *user* decides, stated as their responsibility. A
    // disclaimer that merely used the word "recovery" would pass the line above.
    expect(text).toMatch(
      /you (decide|manage|choose)|your (own )?(call|decision|responsibility)|up to you/,
    );
  });

  it('says the program will not schedule rest for them', async () => {
    const text = await copy();

    // ADR-0007's actual consequence, and the part a user cannot infer: the app
    // never prescribes a rest day, so nothing in the product will tell them to
    // stop. Omitting this leaves the disclaimer ceremonial.
    expect(text).toMatch(
      /(does ?n[o']?t|never|no) [^.]{0,60}(schedule|prescribe|rest day|tell you to rest|days off)/,
    );
  });
});

describe('The camera explainer', () => {
  /**
   * Criterion: "The user is told what the camera is for, in the app, before iOS
   * prompts."
   *
   * The screen is reached before anything requests the permission — spec #2 owns
   * the request — so being on this screen at all satisfies "before iOS prompts".
   * What is asserted here is that it explains the purpose.
   */
  it('says what the camera is for', async () => {
    const { getByTestId } = await renderOnboarding();

    expect(getByTestId('onboarding-camera')).toHaveTextContent(/camera/i);
    expect(getByTestId('onboarding-camera')).toHaveTextContent(/count|counting/i);
  });

  it('requests nothing itself, so iOS has not prompted yet', async () => {
    const { queryByTestId } = await renderOnboarding();

    // The criterion is about ordering. Spec #2 owns the request; a permission
    // button here would put the prompt before the explanation on some path.
    expect(queryByTestId('onboarding-camera-permission')).toBeNull();
  });
});

describe('The privacy explainer', () => {
  /**
   * Criterion: "The user is told what never leaves the device and what does."
   *
   * Asserted as two halves, because a screen naming only the reassuring half is
   * the precise failure vision §11 calls worse than saying nothing. The sentence
   * is fixed by ADR-0009 and ADR-0010.
   */
  it('names what never leaves the device', async () => {
    const text = await copy();

    expect(text).toMatch(/video/);
    expect(text).toMatch(/pose landmarks?/);
    expect(text).toMatch(/never leaves? your device|never leaves? the device/);
  });

  it('names what does leave the device, in the same breath', async () => {
    const text = await copy();

    // The claim is only honest as a contrast. Both halves, one sentence — the
    // same sentence the privacy policy and the App Store listing carry.
    expect(text).toMatch(
      /video and pose landmarks never leave your device[^.]*workout results[^.]*friends list do/,
    );
  });
});

describe('Acknowledging', () => {
  it('reports that the user acknowledged', async () => {
    const onAcknowledge = jest.fn();
    const { getByTestId } = await renderOnboarding({ onAcknowledge });

    fireEvent.press(getByTestId('onboarding-acknowledge'));

    // The screen reports the intent; the core decides what it means and what it
    // writes. Same shape as Home's sign-out.
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('makes the button an acknowledgement rather than a dismissal', async () => {
    const { getByTestId } = await renderOnboarding();

    // "OK" or "Got it" dismisses a notice. The disclaimer is load-bearing, so
    // the button has to be the user accepting the responsibility ADR-0007 hands
    // them.
    expect(getByTestId('onboarding-acknowledge')).toHaveTextContent(
      /understand|agree|accept|got it/i,
    );
  });
});
