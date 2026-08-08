/**
 * Criterion: "The core imports nothing from React Native, Supabase, or any
 * clock, filesystem or randomness source."
 *
 * Spec #1 names the largest risk in this ticket: the core is specified as pure
 * and then quietly stops being pure — a clock read here, a network call there,
 * and by #4 the seam is decorative. A comment does not prevent that; this does.
 *
 * Static analysis rather than a runtime probe, because the failure this guards
 * is a source-level one and a runtime check would only catch the branches a
 * test happened to execute.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CORE = join(__dirname, '..');

/** Modules the core is permitted to import. It is its own dependency graph. */
function isInternalImport(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Core source only: the harness and the tests are not the core. */
function coreSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' || entry === 'testing' ? [] : coreSources(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

const files = coreSources(CORE);
const relative = (path: string) => path.slice(CORE.length + 1);

/** Every `from '...'` and `require('...')` specifier in a source file. */
function importsOf(source: string): string[] {
  const clean = stripComments(source);
  const specifiers: string[] = [];
  const patterns = [/\bfrom\s+['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g];

  for (const pattern of patterns) {
    for (const match of clean.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

describe('Core purity', () => {
  it('has core source files to check', () => {
    // Guards the vacuous pass: if the walk breaks, everything below goes green
    // over nothing.
    expect(files.length).toBeGreaterThan(0);
  });

  it('imports nothing outside itself', () => {
    // One assertion covers React Native, Supabase, node builtins and every
    // package not yet invented — a denylist would need editing each time
    // someone found a new way in.
    const offenders = files.flatMap((path) =>
      importsOf(readFileSync(path, 'utf8'))
        .filter((specifier) => !isInternalImport(specifier))
        .map((specifier) => `${relative(path)} imports ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it('never reads a clock', () => {
    // Time is an input. Every event carries its own timestamp, so a core that
    // reached for the ambient present would be answering a question nobody
    // asked it.
    const offenders = files.filter((path) => {
      const source = stripComments(readFileSync(path, 'utf8'));
      return /\bDate\.now\b|\bnew Date\b|\bperformance\.now\b|\bhrtime\b/.test(source);
    });

    expect(offenders.map(relative)).toEqual([]);
  });

  it('never reads a randomness source', () => {
    // Nothing needs randomness yet. The rule exists so that nothing later
    // smuggles in non-determinism.
    const offenders = files.filter((path) => {
      const source = stripComments(readFileSync(path, 'utf8'));
      return /\bMath\.random\b|\bcrypto\.(getRandomValues|randomUUID)\b|\brandomUUID\b/.test(
        source,
      );
    });

    expect(offenders.map(relative)).toEqual([]);
  });
});
