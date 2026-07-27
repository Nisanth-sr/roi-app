# Week 0 — Founder prerequisites (before pilot data)

These items are **not** engineering tasks. Complete in parallel with engineering polish. Track status here so the team knows when real data is allowed.

## Gates (block real pilot data)

| # | Item | Owner | Status | Notes / link |
|---|---|---|---|---|
| W0-1 | **Pilot log export:** Email first pilot — *"Can you send me a sample AI request log export with client tags right now?"* Point them at [Knowledge/how-to-export-logs.md](./Knowledge/how-to-export-logs.md) for expected columns and gateway revenue steps. | Founder | [ ] Open | Paste file name / date received below |
| W0-2 | **DPA legal review:** Engage a lawyer for a Data Processing Agreement before loading any real pilot revenue/usage data | Founder / legal | [ ] Open | Counsel: ____ · Signed date: ____ |

**Hard gate:** Do not load real pilot data until **W0-2** is signed. Synthetic fixtures (`fixtures/`) are fine without a DPA.

## Pricing verification (before first real log is priced)

| # | Item | Owner | Status |
|---|---|---|---|
| W0-3 | Re-check Bedrock rates on [aws.amazon.com/bedrock/pricing](https://aws.amazon.com/bedrock/pricing/) vs `model_pricing` seed / Settings UI | Eng or PM | [ ] Open |
| W0-4 | Re-check Vertex rates on [cloud.google.com/vertex-ai/generative-ai/pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) | Eng or PM | [ ] Open |
| W0-5 | Update rates in **Settings → Model pricing** (close & replace) and set `verified_at` | Owner in app | [ ] Open |

## Sample received log

| Field | Value |
|---|---|
| Pilot name | |
| Date received | |
| Format (CSV/JSON) | |
| Has client tags? | Yes / No |
| Columns observed | |
| Gaps vs our upload schema | |

## Next step after gates clear

Run [PILOT_VALIDATION.md](./PILOT_VALIDATION.md) with the first pilot (Weeks 11–12 buffer).
