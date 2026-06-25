# Data Alignment Gaps

Tracks values replaced to align static app data with Foundry agent KB output.
Each entry records the previous value, the replacement, and any related client feedback item.

---

## Round 3 — Direct KB extraction (2026-06-24)

Source: direct data extraction prompt against Foundry agent KB. Values are authoritative field-level data, not agent-generated output.

### `lib/irmData.ts` — MARKET_EVENT.crudePctChange
| Field | Previous | Aligned to |
|---|---|---|
| `crudePctChange` | `'+4.2%'` | `'+6.9%'` |
| Opening segment bullet | `'crude +16.2%'` | `'crude +6.9%'` |

### `IRMDashboard.tsx` — Market Pulse COMMODITIES (MARKET_SECTIONS)

| Ticker | Field | Previous | Aligned to |
|---|---|---|---|
| WTI CRUDE | `last` | `'96.60'` | `'84.20'` |
| WTI CRUDE | `chg` | `'+3.91'` | `'+5.43'` |
| WTI CRUDE | `pct` | `'+4.20%'` | `'+6.90%'` |

KB source values: `crudeOilPriceCurrent: 84.20`, `crudeOilPriceRefPrev: 78.77`, `crudePctChange: 6.9`
Note: Customer cited $108 / +16.5% — KB does not support those values. KB is authoritative.
BRENT and NAT GAS still not in KB — unchanged.

### `IRMDashboard.tsx` — IGSpreadChart bps values

| Sector | Previous bps | Aligned to | KB source |
|---|---|---|---|
| Financials | 17 | 10 | `IGSpreadChange_bps.Financials: 10` |
| Utilities | 22 | 17 | `IGSpreadChange_bps.Utilities: 17` |
| Energy | 41 | 24 | `IGSpreadChange_bps.Energy: 24` |
| Industrials | 33 | 12 | `IGSpreadChange_bps.Industrials: 12` |
| Technology | 2 | _(no KB counterpart — unchanged)_ | — |
| Healthcare | 1 | _(no KB counterpart — unchanged)_ | — |

Max scale: `50` → `30` (Energy now 24; 30 provides headroom).
Note: KB has `Materials` sector (bps: 8) with no counterpart in app. App has Technology/Healthcare with no KB counterpart.

---

## KB Reference Values (confirmed, no app counterpart yet)

### portfolios.json — Contoso Capital mandate sensitivity scores
| Dimension | Current Score | Mandate Band |
|---|---|---|
| Duration | 68 | 80 |
| Credit | 73 | 80 |
| Concentration | 44 | 55 |
| Liquidity | 58 | 70 |
| Flow Risk | 61 | 65 |

Note: App's `posture` array uses status labels (ok/warning/critical), not numeric scores. No direct field to update.

### portfolios.json — Contoso net flow data points (90-Day)
| Date | Value ($M) |
|---|---|
| 2024-04-01 | 12.1 |
| 2024-04-16 | 8.4 |
| 2024-05-01 | 7.2 |
| 2024-05-16 | 4.7 |
| 2024-06-01 | 3.6 |
| 2024-06-16 | 2.6 |
| 2024-07-01 | 1.1 |

App has single `netFlow90D: -42` (cumulative). Different representations; no direct alignment without restructuring.
`RedemptionSensitivityThreshold: 2.0` ($M) — no app field exists.

### portfolios.json — Allocation weights
| Category | Current | IC Recommended |
|---|---|---|
| IG Credit | 35.2% | 33.0% |
| HY Credit | 11.9% | 13.0% |
| Securitized | 17.8% | 19.0% |
| Government | 29.7% | 30.0% |
| Cash | 5.4% | 5.0% |

App's `CONTOSO_DETAIL.allocation` uses different category names (equities/fixedIncome/etc.). No direct alignment.

### market_event.json — Yield curve (confirmed values)
| Maturity | Yield | Day-over-Day Change |
|---|---|---|
| 1Y | 4.88% | +0.16% |
| 2Y | 4.77% | +0.17% |
| 5Y | 4.41% | +0.12% |
| 7Y | 4.17% | +0.09% |
| 10Y | 4.12% | +0.08% |
| 20Y | 4.07% | +0.06% |
| 30Y | 4.06% | +0.04% |

App has static SVG polyline in `RateCurveChart` — no data fields to update without refactor.

### market_event.json — Crude oil 60-day data points
| Date | Price (USD/bbl) |
|---|---|
| 2024-04-28 | 78.21 |
| 2024-05-13 | 76.91 |
| 2024-05-28 | 77.44 |
| 2024-06-12 | 81.08 |
| 2024-06-27 | 84.20 |

No app field exists for this series.

---

## Superseded rounds

### Round 1 — Agent Prompt 1 response (2026-06-24)
Crude and IGSpread values aligned from agent-generated output. Superseded by Round 3 direct KB extraction.

### Round 2 — Agent Prompt 2 response (2026-06-24)
Net flow, allocation, mandate sensitivity values reviewed. No changes made. Confirmed gaps documented above.

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
