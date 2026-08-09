import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Criterion: "The camera purpose string is declared in the build configuration."
 *
 * Nothing requests the camera until spec #2. It is declared here because the
 * copy that explains the camera ships here, and the two drifting apart is the
 * failure worth guarding: an in-app explainer promising one thing and the iOS
 * prompt saying another reads as a bait-and-switch at the exact moment the user
 * is deciding whether to trust the app with a lens.
 *
 * Asserted against `app.json` off disk rather than by importing it, matching
 * `web-surface.test.ts`: the config file is the artefact under test, and Expo
 * generates `Info.plist` from it at prebuild.
 */

const APP_JSON = join(__dirname, '..', '..', 'app.json');

const config = () => JSON.parse(readFileSync(APP_JSON, 'utf8'));

const purposeString = (): unknown =>
  config().expo?.ios?.infoPlist?.NSCameraUsageDescription;

describe('The camera purpose string', () => {
  it('is declared for iOS', () => {
    // Apple rejects a build that requests the camera without one, and Expo only
    // writes the key it is given — there is no default to fall back on.
    expect(typeof purposeString()).toBe('string');
  });

  it('says what the camera is for, not merely that it is wanted', () => {
    const text = String(purposeString()).toLowerCase();

    // "This app needs camera access" is the string Apple rejects and the user
    // learns nothing from. The purpose is counting reps, and the reason it is
    // acceptable is that nothing leaves the phone.
    expect(text).toMatch(/count|counting/);
    expect(text).toMatch(/push-?up|rep/);
  });

  it('carries the on-device claim, in the same words the app uses', () => {
    const text = String(purposeString()).toLowerCase();

    // The precise claim, not the expansive one (ADR-0009, vision §11). The
    // prompt is where a user who skipped the explainer meets this promise, so
    // it cannot be the one surface that omits it.
    expect(text).toMatch(/never leaves? (your|the) (phone|device)|on your device|stays on/);
  });

  it('does not overclaim on the prompt that only covers video', () => {
    const text = String(purposeString()).toLowerCase();

    // The honest half. A purpose string claiming *nothing* leaves the device
    // would contradict the privacy policy, which says workout results and the
    // friends list do.
    expect(text).not.toMatch(/nothing (ever )?leaves/);
  });
});
