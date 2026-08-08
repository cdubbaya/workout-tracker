import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Criterion: "Nothing in the app assumes iOS outside of platform drivers."
 *
 * The app is iOS-first because the detector is (see the vision doc), but the
 * thresholds and the domain port either way. This guards the drift where an
 * `ios`-only branch or a `.ios.tsx` file lands in screen or domain code and is
 * only discovered when Android is stood up.
 *
 * A platform driver is a module whose job *is* the platform difference. None
 * exist yet — the walking skeleton has no camera and no native module — so the
 * allowlist is empty and additions are a deliberate, reviewable act.
 */

const SRC = join(__dirname, '..');

/** Modules permitted to branch on platform. Add with a comment saying why. */
const PLATFORM_DRIVERS: readonly string[] = [];

/**
 * Strip comments so prose about `Platform.select` — including the paragraph
 * explaining why a token file avoids it — is not read as a platform branch.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('Platform neutrality', () => {
  const files = sourceFiles(SRC).filter(
    (path) => !PLATFORM_DRIVERS.includes(path.slice(SRC.length + 1)),
  );

  it('has source files to check', () => {
    // Guards the vacuous pass: if the walk breaks, every test below goes green
    // over nothing.
    expect(files.length).toBeGreaterThan(0);
  });

  it('does not branch on the platform outside platform drivers', () => {
    const offenders = files.filter((path) => {
      const source = stripComments(readFileSync(path, 'utf8'));
      return /Platform\.(OS|select)\b/.test(source);
    });

    expect(offenders.map((p) => p.slice(SRC.length + 1))).toEqual([]);
  });

  it('has no platform-suffixed modules outside platform drivers', () => {
    // `Foo.ios.tsx` resolves per-platform, so an Android build silently gets a
    // different module — or none.
    const suffixed = files.filter((path) => /\.(ios|android)\.tsx?$/.test(path));

    expect(suffixed.map((p) => p.slice(SRC.length + 1))).toEqual([]);
  });
});
