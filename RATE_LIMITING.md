# Rate Limiting Strategy

## Current Implementation (In-Code)
The `/api/crab-battle/start` and `/api/crab-battle/finish` endpoints perform lightweight checks combining:
- In-memory short burst limiting (process-local) – fast rejection for obvious spam.
- Database lookups for recent runs per user to ensure sustainable usage and prevent mass row inflation.

Because the in-memory limiter is per server instance, scaling horizontally would require a shared medium to remain strict globally.

## Dimensions Considered
- Per-user concurrent unfinished runs.
- Per-user finished runs in rolling window (e.g., last X minutes).
- Optional global cap safeguards (not yet implemented) to protect from sudden abusive scripts across many accounts.

## Why Hybrid?
Combining in-memory + DB avoids a DB round trip for extreme local bursts while still providing global consistency via persisted history.

## Future Enhancements
1. Distributed Counter Layer
   - Redis (INCR + EXPIRE) or Upstash for global per-user and per-IP counters.
   - Supabase Edge Function + Deno KV alternative if Redis unavailable.
2. Token Bucket / Leaky Bucket
   - Maintain refill logic in Redis script: tokens refill at 1 per N seconds up to capacity.
3. Sliding Window Approximation
   - Use Redis sorted sets keyed by user to prune timestamps beyond window; count remainder.
4. Adaptive Penalties
   - Escalate cooldown durations for repeated violations (store violation score in Redis separate key with TTL decay).
5. Integrity Signals
   - Correlate run duration vs. reported damage to flag improbable DPS spikes server-side.

## Suggested Constants (Tunable)
```
MAX_ACTIVE_UNFINISHED = 2
MAX_FINISHED_PER_5_MIN = 30
MIN_SECONDS_BETWEEN_STARTS = 2
```
(Use a config module to centralize; currently inline for rapid iteration.)

## Failure Modes & Mitigations
- Single Node Only: In-memory limiter gives false sense of security when horizontally scaling -> Add shared store.
- Clock Skew: Duration or DPS anomalies if client/system clocks drift -> Server always recomputes duration from stored timestamps.
- Race Conditions: Multiple finish calls -> DB update guards against already-finished state, return early.

## Monitoring Ideas
- Log (user_id, violation_type, timestamp) into a `rate_limit_violations` table for future tuning.
- Periodic job to aggregate and surface top violating users/IPs.

## Deployment Notes
Start simple (current hybrid) until actual user load justifies complexity. Instrument before optimizing: add lightweight counters & dashboards (SQL views) to derive 95p run frequency per user.
