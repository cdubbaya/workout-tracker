/**
 * The RLS policy suite runs under plain Node, not `jest-expo`.
 *
 * It talks HTTP to a local Supabase instance and renders nothing, so the React
 * Native preset would only add a runtime it does not use. Kept as a separate
 * config — rather than a second project inside the app's — because the suite
 * lives outside `app/` and gates on Docker, which `npm test` must not.
 */

module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
  // Jest's runtime resolver needs the same pointer the tsconfig gives the
  // compiler: the suite is outside `app/`, its dependencies are inside it.
  modulePaths: ['<rootDir>/app/node_modules'],
  // `ts-jest` rather than the app's babel pipeline: this suite is plain
  // TypeScript with no JSX, and `babel-preset-expo` does not resolve from a
  // rootDir above `app/`.
  // Resolved from this file rather than by name: `rootDir` is the repo root,
  // but the dependency lives in `app/node_modules`.
  transform: {
    '^.+\\.tsx?$': [
      require.resolve('ts-jest'),
      // A real tsconfig beside the suite rather than inline options: type
      // resolution is relative to the config file, so this is what lets it
      // find `@types/jest` up in `app/node_modules`.
      { tsconfig: '<rootDir>/supabase/tests/tsconfig.json' },
    ],
  },
  // The suite creates users and waits on a container; the default 5s is tight.
  testTimeout: 30_000,
};
