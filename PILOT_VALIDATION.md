# Pilot validation notes (Weeks 11–12 buffer)

Use this checklist when onboarding real pilots. Complete [WEEK0_CHECKLIST.md](./WEEK0_CHECKLIST.md) first (DPA + sample log + pricing verify).

## Assumptions to validate

- [ ] Pilots have exportable, **client-tagged** AI request logs
- [ ] Log `client_id` values match `external_ref` on clients in the app
- [ ] Revenue CSV/JSON covers the same month as log uploads
- [ ] Margin numbers match pilot expectations within rounding tolerance
- [ ] First upload completed without eng support (or note what blocked them)
- [ ] Red-flag threshold (Settings) matches how the pilot thinks about “bad” margin

## Path A decision gate

**Do not build** live proxy until **3+ paying customers** specifically request real-time numbers over monthly upload.

Current status: _Not triggered — Path B only._

## Known limitations (MVP)

- Revenue sync is manual CSV/JSON (no Stripe/Paddle)
- Model pricing is admin-maintained (check provider pages monthly via Settings)
- Team invite requires teammate to sign up first, then owner adds their email
- Single currency field stored (USD assumed for display)
- Cached-input token pricing exists on `model_pricing` but is unused (uploads have no cached token column)

## Soft-launch smoke test (eng, before first pilot session)

- [ ] Signup → add clients → upload `fixtures/sample-logs.csv` + `fixtures/sample-revenue.csv`
- [ ] Overview shows margins for the fixture month (use month picker if needed)
- [ ] Red flags page filters correctly for threshold
- [ ] Settings: change threshold → Recompute margins → flags update
- [ ] Settings: rollback a batch → margins recompute
- [ ] `npm run test` and `npm run test:rls` (against real Supabase) pass

## Pilot feedback log

| Pilot | Log export OK? | First upload without support? | Margin looks right? | Notes |
|-------|----------------|-------------------------------|---------------------|-------|
|       |                |                               |                     |       |

## After first successful pilot

1. File any format quirks (column aliases) as follow-ups.
2. Revisit Path A only if the trigger above is met.
3. Keep `model_pricing.verified_at` current monthly.
