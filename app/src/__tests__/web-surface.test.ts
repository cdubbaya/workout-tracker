import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The web surface is static HTML with no build step and no framework, so its
 * acceptance criteria are content and shape claims rather than behaviour. They
 * are guarded the way `platform-neutrality.test.ts` guards its criterion: read
 * the files off disk and assert the property, with the criterion quoted above
 * each block.
 *
 * These tests read `web/` from the repo root rather than importing anything —
 * nothing in `web/` is importable by design (see the "no application logic"
 * criterion), so there is no public interface to exercise. The files themselves
 * are the artefact under test.
 *
 * They live in the app's Jest project because that is the only runner in the
 * repo. `web/` deliberately holds no config, no manifest and no JavaScript of
 * its own — a `jest.config.js` beside the pages would be a file Vercel serves,
 * and the deploy is a bare static directory by design. The tests reaching up
 * into the repo root is the one coupling; the deploy itself stays independent.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..');
const WEB = join(REPO_ROOT, 'web');
const PRIVACY = join(WEB, 'privacy.html');
const MARKETING = join(WEB, 'index.html');

function html(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Visible copy: tags and comments stripped, entities and whitespace normalised. */
function visibleText(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function filesUnder(dir: string): string[] {
  // Returns empty rather than throwing when `web/` is absent, so each
  // assertion reports its own criterion instead of the suite aborting.
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' || entry === 'node_modules' ? [] : filesUnder(path);
    }
    return [path];
  });
}

describe('The web surface', () => {
  it('has both pages on disk', () => {
    // Guards the vacuous pass: every assertion below reads one of these two
    // files, so a rename would turn the suite green over nothing.
    expect(existsSync(MARKETING)).toBe(true);
    expect(existsSync(PRIVACY)).toBe(true);
  });

  /**
   * Criterion: "The policy states plainly what never leaves the device and what
   * does."
   *
   * The sentence is fixed by ADR-0010 and vision §11 and is asserted as two
   * halves, because a policy that names only the reassuring half is the precise
   * failure the issue calls "worse than saying nothing". The assertions derive
   * their terms from the domain vocabulary in CONTEXT.md rather than pinning the
   * marketing phrasing, so the copy can be reworded without going green on a
   * policy that dropped the claim.
   */
  describe('privacy policy', () => {
    it('names what never leaves the device', () => {
      const text = visibleText(html(PRIVACY)).toLowerCase();

      expect(text).toMatch(/video/);
      expect(text).toMatch(/pose landmarks?/);
      expect(text).toMatch(/never leaves? your device|never leaves? the device/);
    });

    it('names what does leave the device, in the same breath', () => {
      const text = visibleText(html(PRIVACY)).toLowerCase();

      // The claim is only honest as a contrast. Both halves, one sentence.
      expect(text).toMatch(
        /video and pose landmarks never leave your device[^.]*workout results[^.]*friends list do/,
      );
    });

    it('discloses each category of data the server actually holds', () => {
      const text = visibleText(html(PRIVACY)).toLowerCase();

      // ADR-0010: "a server does hold identity, a friend graph, an XP ledger,
      // and per-Rep metrics". Every one of those has to be named.
      expect(text).toMatch(/identity|account|sign in/);
      expect(text).toMatch(/friend/);
      expect(text).toMatch(/xp/);
      expect(text).toMatch(/rep log|per-rep|rep metrics/);
    });

    /**
     * Criterion: "The policy covers what Apple's health-data rules require of
     * anything written to HealthKit: no advertising use, no sale to data
     * brokers."
     */
    it("covers Apple's health-data rules for HealthKit write-back", () => {
      const text = visibleText(html(PRIVACY)).toLowerCase();

      expect(text).toMatch(/healthkit/);
      expect(text).toMatch(/advertis/);
      expect(text).toMatch(/data broker/);
    });

    it('states the HealthKit rules as prohibitions, not permissions', () => {
      const text = visibleText(html(PRIVACY)).toLowerCase();

      // "we never use it for advertising", not "we may use it for advertising".
      // A policy that merely mentions the words would pass the test above.
      expect(text).toMatch(/(never|not|no)\b[^.]{0,80}advertis/);
      expect(text).toMatch(/(never|not|no)\b[^.]{0,80}data broker/);
    });

    it('is reachable at a stable path', () => {
      // The App Store listing points at /privacy. `cleanUrls` serves
      // privacy.html there, so the filename is part of the contract.
      expect(existsSync(join(WEB, 'privacy.html'))).toBe(true);
    });
  });

  /**
   * Criterion: "No application logic ships to the web surface."
   *
   * Asserted structurally rather than by reading the copy: no script, no
   * framework, no dependency manifest, nothing that could grow into the
   * throwaway prototype being promoted here.
   */
  describe('no application logic', () => {
    // Walked inside each test, not at describe time: a missing `web/` must fail
    // these assertions individually rather than abort collection, and
    // `declares no dependencies` would otherwise pass vacuously on an absent
    // directory.
    it('has files to check', () => {
      expect(filesUnder(WEB).length).toBeGreaterThan(0);
    });

    it('ships no JavaScript', () => {
      const scripts = filesUnder(WEB).filter((path) => /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(path));

      expect(scripts.map((p) => p.slice(WEB.length + 1))).toEqual([]);
    });

    it('has no inline script or event handlers in its markup', () => {
      const pages = filesUnder(WEB).filter((path) => path.endsWith('.html'));
      const offenders = pages.filter((path) => {
        const source = html(path).replace(/<!--[\s\S]*?-->/g, '');
        return /<script\b/i.test(source) || /\son[a-z]+\s*=/i.test(source);
      });

      expect(offenders.map((p) => p.slice(WEB.length + 1))).toEqual([]);
    });

    it('declares no dependencies and needs no build', () => {
      // A package.json here would couple the deploy to an install step and
      // invite exactly the application logic this criterion forbids. Guarded
      // against the vacuous pass an absent `web/` would otherwise give.
      expect(existsSync(WEB)).toBe(true);
      expect(existsSync(join(WEB, 'package.json'))).toBe(false);
      expect(existsSync(join(WEB, 'node_modules'))).toBe(false);
    });
  });

  /**
   * Criterion: "The deploy is reproducible and independent of the mobile app's
   * build."
   */
  describe('deploy independence', () => {
    /**
     * The config sits at the repo root, not in `web/`. Vercel reads
     * `vercel.json` from its Root Directory, which is `.` here, and rewrites
     * `/` and `/privacy` onto the files under `web/`. Keeping the project's
     * Root Directory at its default is what lets the whole deploy be
     * configured in committed code with no dashboard settings to drift.
     */
    const config = () => JSON.parse(readFileSync(join(REPO_ROOT, 'vercel.json'), 'utf8'));

    it('carries a Vercel config at the repo root', () => {
      expect(existsSync(join(REPO_ROOT, 'vercel.json'))).toBe(true);
    });

    it('builds and installs nothing', () => {
      // The Expo app lives in the same root. Any build or install step here
      // would be the mobile app's, which is exactly the coupling this
      // criterion forbids.
      expect(config().buildCommand).toBeNull();
      expect(config().installCommand).toBeNull();
      expect(config().framework).toBeNull();
    });

    it('serves the two pages at their public paths', () => {
      const rewrites: { source: string; destination: string }[] = config().rewrites ?? [];
      const routes = Object.fromEntries(rewrites.map((r) => [r.source, r.destination]));

      // `/privacy` is the path the App Store listing points at, so the mapping
      // is part of the contract rather than an implementation detail.
      expect(routes['/']).toBe('/web/index.html');
      expect(routes['/privacy']).toBe('/web/privacy.html');
    });

    /**
     * Serving the repo root is what removes the dashboard setting, and it is
     * also the one way this arrangement can leak: every path in the repo is a
     * candidate URL until `.vercelignore` excludes it. The vision doc, the
     * glossary and the whole app and prototype source sit at that root.
     */
    it('excludes everything outside the web surface from the deploy', () => {
      const ignore = readFileSync(join(REPO_ROOT, '.vercelignore'), 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));

      // Deny-by-default, then re-allow. An allowlist that forgot the `*` would
      // publish the repo, so assert the deny rule itself is present.
      expect(ignore).toContain('*');
      expect(ignore.filter((line) => line.startsWith('!'))).toEqual([
        '!web/',
        '!web/**',
        '!vercel.json',
      ]);
    });

    it('publishes nothing at the repo root but the surface itself', () => {
      const published = new Set(['web', 'vercel.json']);
      const infrastructure = new Set(['.git', '.gitignore', '.vercelignore']);

      const exposed = readdirSync(REPO_ROOT).filter(
        (entry) => !published.has(entry) && !infrastructure.has(entry),
      );

      // Every one of these is denied by the `*` rule above. This test is the
      // tripwire: adding a top-level file or directory fails here, which forces
      // a decision about whether it should be public rather than letting the
      // deploy answer silently.
      expect(exposed.sort()).toEqual([
        'CLAUDE.md',
        'CONTEXT.md',
        'app',
        'docs',
        'prototype',
        'pushup-counter-vision.md',
      ]);
    });

    it('references nothing outside web/', () => {
      const pages = filesUnder(WEB).filter((path) => path.endsWith('.html'));
      const offenders = pages.filter((path) => /(src|href)\s*=\s*["'][^"']*\.\.\//i.test(html(path)));

      // A `../app/...` reference would make the web build depend on the Expo
      // tree and break the root-directory isolation the deploy relies on.
      expect(offenders.map((p) => p.slice(WEB.length + 1))).toEqual([]);
    });
  });
});
