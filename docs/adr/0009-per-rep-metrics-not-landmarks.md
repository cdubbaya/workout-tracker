# Persist per-rep metrics, never the landmark stream

Pose landmarks live in memory for the duration of a Rep and are discarded. What persists is a small derived record per Rep — depth ratio, tempo, Variant, Full or Half, and detector confidence. The vision doc asked for the landmark stream to be kept "structured on-device" so that server-side recomputation stayed available if global leaderboards ever shipped; this satisfies that without keeping the stream.

The two sections of the vision doc were pulling against each other. Retaining a time-series of someone's joint positions, recorded on their bedroom floor, is not video — but it is not nothing either, and it sits awkwardly under a privacy claim strong enough to put in the App Store listing.

Per-rep metrics resolve it. They are enough to recompute whether a Rep should have counted, which is the entire point of the upgrade path. They are orders of magnitude smaller. And they cannot be reconstructed into anything resembling a body, a room, or a person.

## Consequences

- Threshold tuning loses its richest debugging material — you cannot replay a session's landmarks to see why a Rep was misjudged. Tuning has to run against instrumented builds and captured test sessions during development, with informed consent, rather than against production data.
- The miscount flag (which changes nothing but telemetry) becomes more valuable, since a flagged session's per-rep metrics are the only production evidence of a detector disagreement.
- The retained record is derived data about a workout, not biometric identification. That keeps the App Store privacy disclosure honest and simple.
