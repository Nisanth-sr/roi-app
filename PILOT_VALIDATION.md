# Pilot validation notes (Weeks 11–12 buffer)

Use this checklist when onboarding real pilots.

## Assumptions to validate

- [ ] Pilots have exportable, **client-tagged** AI request logs
- [ ] Log `client_id` values match `external_ref` on clients in the app
- [ ] Revenue CSV covers the same month as log uploads
- [ ] Margin numbers match pilot expectations within rounding tolerance

## Path A decision gate

**Do not build** live proxy until **3+ paying customers** specifically request real-time numbers over monthly upload.

Current status: _Not triggered — Path B only._

## Known limitations (MVP)

- Revenue sync is manual CSV (no Stripe/Paddle)
- Model pricing is admin-maintained (check provider pages monthly)
- Team invite requires teammate to sign up first
- Single currency field stored (USD assumed for display)

## Pilot feedback log

| Pilot | Log export OK? | First upload without support? | Notes |
|-------|----------------|-------------------------------|-------|
|       |                |                               |       |
