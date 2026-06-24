# Data Alignment Gaps

Tracks values replaced to align static app data with Foundry agent KB output.
Each entry records the previous value, the replacement, and any related client feedback item.

---

## Round 1 — Agent Prompt 1 response (2026-06-24)

Source: agent response to "What's the market context relevant to Contoso Capital's mandate given today's energy shock?"

### `lib/irmData.ts` — MARKET_EVENT.crudePctChange
| Field | Previous | Aligned to |
|---|---|---|
| `crudePctChange` | `'+16.2%'` | `'+4.2%'` |

Notes: +16.2% was original fabricated/borrowed figure. Agent analysis states "up 4.2% today."
Client feedback item 3 had requested $108 crude price — superseded by KB alignment.

---

### `IRMDashboard.tsx` — Market Pulse COMMODITIES (MARKET_SECTIONS)

| Ticker | Field | Previous | Aligned to |
|---|---|---|---|
| WTI CRUDE | `last` | `'91.76'` | `'96.60'` |
| WTI CRUDE | `chg` | `'+7.04'` | `'+3.91'` |
| WTI CRUDE | `pct` | `'+16.20%'` | `'+4.20%'` |

Notes: BRENT and NAT GAS not yet updated — no agent data available for those rows.
Client feedback item 3 had requested $108 — superseded by KB alignment.

---

### `IRMDashboard.tsx` — IGSpreadChart bps values

Sectors and structure unchanged. Only bps values updated where the agent reported the same sector.

| Sector | Previous bps | Aligned to |
|---|---|---|
| Energy | 9 | 41 |
| Industrials | 5 | 33 |
| Utilities | 12 | 22 |
| Financials | 18 | 17 |
| Technology | 2 | _(no agent data — unchanged)_ |
| Healthcare | 1 | _(no agent data — unchanged)_ |

Max scale: `20` → `50` (required to accommodate new Energy value of 41).

---

### `IRMDashboard.tsx` — SectorHeatmap

No changes. Structure (sectors, periods) does not map directly to agent output.
Noted in "Not yet aligned" below.

---

---

## Round 2 — Agent Prompt 2 response (2026-06-24)

Source: agent response to "Show me Contoso's exposure sensitivity and the IC's current positioning on rates and credit."

### Net Flow Trend (90-Day)
No changes. `CONTOSO_DETAIL.netFlow90D: -42` and MarcusDashboard `"-$42M"` represent the
cumulative decline over the period (~$52M → ~$14M = -$38M ≈ -$42M). Consistent with chart.
Redemption sensitivity threshold from agent: **$14M** — not currently stored anywhere in the app.

### Allocation vs. IC Positioning
No changes. Agent chart categories (Cash, Govt Bonds, High Yield, IG Credit, Other) do not
map to `CONTOSO_DETAIL.allocation` categories (equities, fixedIncome, privateCredit, realAssets, liquidity).
No direct number alignment possible without a category remapping decision.

### Mandate Sensitivity vs. Bands
No changes. No counterpart in the app. `CONTOSO_DETAIL.posture` uses status labels (ok/warning/critical),
not numeric scores. Agent values for reference:

| Dimension | Current Exposure | Mandate Band |
|---|---|---|
| Concentration | ~58 | ~80 |
| Credit | ~62 | ~83 |
| Duration | ~68 | ~85 |
| Flow Risk | ~63 | ~88 |
| Liquidity | ~58 | ~85 |

---

## Not yet aligned

| Item | Location | Notes |
|---|---|---|
| Rate Curve SVG | `IRMDashboard.tsx` — `RateCurveChart` | Static SVG polyline; yield values readable from chart but imprecise. Pending agent KB access or manual re-read. |
| BRENT crude | `IRMDashboard.tsx` — MARKET_SECTIONS | No agent data for BRENT. Currently `94.23 / +15.00%`. |
| NAT GAS | `IRMDashboard.tsx` — MARKET_SECTIONS | No agent data for NAT GAS. Currently `3.264 / +6.08%`. |
| Crude oil 60-day data points | `irmData.ts` | No field exists yet; agent chart shows ~$86.40 (Apr 25) → ~$96.60 (Jun 24). |
