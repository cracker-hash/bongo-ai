

## Plan: Daily Credit Reset at Midnight UTC (All Tiers)

### Problem
Currently, only the **free tier** gets a daily reset (and only client-side on page load -- unreliable). Paid tiers (lite/pro/max) only get credits on subscription change, with no recurring allocation. There's no server-side mechanism to guarantee credits reset at midnight.

### Solution

**1. Update credit allocations to be daily for all tiers**

Update `src/lib/creditConfig.ts`:
- Free: 200/day (unchanged)
- Lite: 500/day (15,000 ÷ 30)
- Pro: 1,666/day (50,000 ÷ 30)
- Max: 16,666/day (500,000 ÷ 30)

Add a new `TIER_DAILY_CREDITS` map that all reset logic uses.

**2. Create `reset-daily-credits` edge function**

New edge function that:
- Queries all `user_credits` rows where `last_daily_reset < today midnight UTC`
- Resets each user's balance to their tier's daily allocation
- Logs a `daily_reset` transaction in `credit_transactions`
- Uses service role key (no auth needed, called by cron)

**3. Add pg_cron job for midnight UTC**

```sql
SELECT cron.schedule(
  'reset-daily-credits',
  '0 0 * * *',  -- midnight UTC
  $$ SELECT net.http_post(...) $$
);
```

**4. Update client-side reset logic**

Update `useCredits.ts` `fetchCredits` to check daily reset for **all tiers** (not just free), using each tier's daily allocation. This serves as a fallback if the user loads the app after midnight but before the cron ran.

**5. Update `sync-credits` edge function**

Align with daily model -- when tier changes, set balance to the new tier's daily allocation instead of monthly.

### Files Changed

| File | Change |
|------|--------|
| `src/lib/creditConfig.ts` | Add `TIER_DAILY_CREDITS` map, update helpers |
| `src/hooks/useCredits.ts` | Reset all tiers daily (not just free) |
| `supabase/functions/reset-daily-credits/index.ts` | New edge function for bulk midnight reset |
| `supabase/config.toml` | Register new function |
| `supabase/functions/sync-credits/index.ts` | Use daily allocations |
| `src/components/credits/CreditBalance.tsx` | Update maxCredits to use daily values |
| DB (via insert tool) | Add pg_cron job for midnight |

### Flow

```text
Midnight UTC
  └─ pg_cron fires
       └─ net.http_post → /reset-daily-credits
            └─ For each user where last_daily_reset < today:
                 ├─ UPDATE user_credits SET balance = tier_daily, last_daily_reset = now()
                 └─ INSERT credit_transactions (daily_reset)

User opens app (fallback)
  └─ useCredits.fetchCredits()
       └─ If last_daily_reset < today midnight → reset balance client-side
```

