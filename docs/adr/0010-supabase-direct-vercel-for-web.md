# Supabase is the backend; Vercel hosts the web surface only

The app talks to Supabase directly, with row-level security as the access layer and Edge Functions for anything that must run server-side. There is no API tier in between. Vercel hosts what genuinely needs a browser: friend-invite landing pages for people who don't have the app yet, the marketing page, and the privacy policy the vision doc requires.

An API tier in front of a BaaS was the obvious alternative and it was rejected: writing the API is the work a BaaS exists to remove, and for a React Native client with no web frontend it buys an extra hop and an extra deploy target. Neon was considered and is a different category — serverless Postgres without auth, a client SDK, or realtime, so choosing it would have meant building the custom backend under a different name.

## What this does to the privacy claim

The vision doc's "video never leaves the device" survives intact — it still doesn't. But the claim now needs to be stated precisely rather than expansively, because a server does hold identity, a friend graph, an XP ledger, and per-Rep metrics (ADR-0009). The App Store listing should say what it means: video and pose landmarks never leave the device; workout results and your friends list do.

## Client timestamps are trusted

Sessions queue locally when offline and sync with the client's timestamp, which the server accepts. This follows decision #7 in the vision doc — client-authoritative, no attestation — and offline capture is a requirement rather than a nicety, since floor placement was chosen specifically to make hotel rooms and basements viable.

The exposure is worth naming because the vision doc predicted its shape. §9 observed that the attack which actually shows up is the one that "takes effort once and then costs a keystroke," in contrast to per-session effort like filming someone else. Rolling the device clock forward is exactly that: set once, then farm Streak days and Milestone bonuses indefinitely at no ongoing cost.

Server-authoritative time is available in one Edge Function whenever the stakes justify it — the friends-only scope is what makes it not worth doing now, so widening the audience is the trigger to revisit.
