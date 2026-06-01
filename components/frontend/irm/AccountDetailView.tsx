'use client'

import {
  ChevronLeft,
  PieChart,
  Activity,
  TrendingDown,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Phone,
} from 'lucide-react'
import type { IRMScene } from '@/lib/irmTypes'
import { CONTOSO_DETAIL, CALL_SEGMENTS } from '@/lib/irmData'

interface AccountDetailViewProps {
  scene: IRMScene
  callSegmentIndex: number
  onSceneChange: (scene: IRMScene) => void
  onBack: () => void
}

export function AccountDetailView({
  scene,
  callSegmentIndex,
  onSceneChange,
  onBack,
}: AccountDetailViewProps) {
  const agentPanelActive = scene !== 'account-detail'

  const detail = CONTOSO_DETAIL

  const allocationBars = [
    { label: 'Equities', value: detail.allocation.equities, color: 'bg-blue-500', pct: '38%' },
    { label: 'Fixed Income', value: detail.allocation.fixedIncome, color: 'bg-indigo-600', pct: '42%' },
    { label: 'Private Credit', value: detail.allocation.privateCredit, color: 'bg-purple-500', pct: '8%' },
    { label: 'Real Assets', value: detail.allocation.realAssets, color: 'bg-teal-500', pct: '7%' },
    { label: 'Liquidity', value: detail.allocation.liquidity, color: 'bg-gray-400', pct: '5%' },
  ]

  const postureIcon = (status: 'ok' | 'warning' | 'critical') => {
    if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
    return <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
  }

  // ── RIGHT PANEL scenes ──────────────────────────────────────────────────────

  const RightPanelHeader = () => {
    const isCall = scene === 'call-active' || scene === 'call-next-steps'
    const label = (() => {
      if (scene === 'market-context') return 'Market Context'
      if (scene === 'exposure') return 'Exposure & IC Positioning'
      if (scene === 'compliance') return 'Compliance Guardrails'
      if (isCall) return null
      return ''
    })()

    return (
      <div className="bg-indigo-900 text-white px-6 py-4 flex-shrink-0 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-indigo-300" />
        <span className="font-semibold">Woodgrove Intelligence</span>
        <div className="ml-auto">
          {isCall ? (
            <div className="flex items-center gap-2">
              <span className="animate-pulse w-3 h-3 rounded-full bg-green-500 inline-block" />
              <span className="text-sm font-medium text-green-300">Live Call Assist</span>
            </div>
          ) : (
            <span className="text-sm bg-indigo-700 text-indigo-200 rounded-full px-3 py-1">{label}</span>
          )}
        </div>
      </div>
    )
  }

  const SentPrompt = ({ text }: { text: string }) => (
    <div className="bg-gray-100 text-gray-700 rounded-xl p-3 text-sm italic">{text}</div>
  )

  const ResponseCard = ({
    title,
    children,
    borderAccent,
  }: {
    title?: string
    children: React.ReactNode
    borderAccent?: string
  }) => (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${borderAccent ? `border-l-4 ${borderAccent}` : ''}`}
    >
      {title && <p className="font-semibold text-gray-800 text-sm mb-3">{title}</p>}
      {children}
    </div>
  )

  const Bullet = ({ text }: { text: string }) => (
    <li className="text-sm text-gray-700 leading-relaxed">{text}</li>
  )

  // ── SCENE: market-context ───────────────────────────────────────────────────

  const SceneMarketContext = () => (
    <>
      <SentPrompt text="What's the market context for Contoso Capital given today's energy shock?" />

      <ResponseCard title="What Changed — Energy Shock Drivers">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Crude oil spiked following Middle East supply disruption, driving inflation expectations higher" />
          <Bullet text="Long-end yields repriced meaningfully (+18–22bps 10Y–30Y), increasing duration sensitivity" />
          <Bullet text="Credit dispersion widened across IG sectors — financials and utilities most affected" />
          <Bullet text="Real asset correlations under pressure as energy-driven inflation diverges from broader commodities" />
        </ul>
      </ResponseCard>

      <ResponseCard title="Likely Client / Consultant Questions">
        <ul className="space-y-2">
          {[
            'Given the energy-driven move in long rates, how might tracking error behave relative to the liability benchmark?',
            'Has the oil-driven spread widening changed your view on maintaining BBB-rated financials within the mandate\'s risk budget?',
            'What is the read-through from energy price volatility to the real asset allocation?',
          ].map((q, i) => (
            <li key={i} className="text-sm italic text-gray-700 leading-relaxed">
              &ldquo;{q}&rdquo;
            </li>
          ))}
        </ul>
      </ResponseCard>

      <ResponseCard title="Liquidity & Implementation">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Secondary market depth in longer-duration IG corporates more episodic in recent sessions" />
          <Bullet text="Duration adjustment may require phased execution within mandate turnover guidelines" />
        </ul>
      </ResponseCard>

      {/* Rate Curve Chart */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-800">Rate Curve Shift</span>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-auto">Morningstar</span>
        </div>
        <svg width="280" height="120" viewBox="0 0 280 120" className="w-full">
          {/* Red shading between the two lines on the right portion */}
          <polygon
            points="120,68 160,65 200,62 280,60 280,30 200,45 160,62 120,68"
            fill="rgba(239,68,68,0.1)"
          />
          {/* Yesterday line */}
          <polyline
            points="0,70 40,70 80,68 120,67 160,65 200,62 280,60"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
          />
          {/* Today line */}
          <polyline
            points="0,72 40,71 80,69 120,68 160,62 200,45 280,30"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          {/* X-axis labels */}
          {['3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'].map((label, i) => {
            const xs = [0, 40, 80, 120, 160, 200, 280]
            return (
              <text key={label} x={xs[i]} y="115" textAnchor="middle" className="text-xs" fill="#9ca3af" fontSize="9">
                {label}
              </text>
            )
          })}
          {/* Annotation */}
          <text x="210" y="40" fill="#ef4444" fontSize="9" fontWeight="600">+18–22bps</text>
          {/* Legend */}
          <circle cx="8" cy="105" r="4" fill="#9ca3af" />
          <text x="16" y="108" fill="#6b7280" fontSize="8">Yesterday</text>
          <circle cx="68" cy="105" r="4" fill="#3b82f6" />
          <text x="76" y="108" fill="#3b82f6" fontSize="8">Today</text>
        </svg>
      </div>

      {/* Spread Heatmap */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-800">IG Spread Heatmap by Sector</span>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-auto">Morningstar</span>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="w-24 text-left text-gray-500 font-normal pb-1"></th>
                {['1W', '1M', '3M', 'QTD'].map((h) => (
                  <th key={h} className="text-gray-500 font-normal pb-1 px-1 text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              {[
                { label: 'Financials', cells: ['bg-red-300', 'bg-red-400', 'bg-red-500', 'bg-red-600'] },
                { label: 'Utilities', cells: ['bg-amber-300', 'bg-amber-400', 'bg-amber-500', 'bg-amber-500'] },
                { label: 'Industrials', cells: ['bg-green-200', 'bg-amber-200', 'bg-amber-300', 'bg-amber-300'] },
                { label: 'Healthcare', cells: ['bg-green-200', 'bg-green-200', 'bg-green-200', 'bg-green-300'] },
                { label: 'Technology', cells: ['bg-green-300', 'bg-green-200', 'bg-green-200', 'bg-green-200'] },
                { label: 'Energy', cells: ['bg-green-200', 'bg-amber-200', 'bg-amber-300', 'bg-amber-200'] },
                { label: 'Consumer', cells: ['bg-green-200', 'bg-green-200', 'bg-green-300', 'bg-amber-200'] },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="text-gray-600 pr-2 py-0.5 text-xs">{row.label}</td>
                  {row.cells.map((color, i) => (
                    <td key={i} className="px-1 py-0.5">
                      <div className={`w-7 h-5 rounded-sm ${color}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-300 inline-block" />Tight</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" />Widening</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Significant</span>
          </div>
        </div>
      </div>

      {/* Crude Oil Chart */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-800">Crude Oil — 60D</span>
          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full ml-auto font-medium">+16.2% today</span>
        </div>
        <svg width="280" height="80" viewBox="0 0 280 80" className="w-full">
          <polyline
            points="0,60 30,58 60,55 90,52 120,50 150,50 180,48 200,45 220,42 240,38 255,35 265,15"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
          />
          <line
            x1="255" y1="0" x2="255" y2="80"
            stroke="red"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text x="258" y="12" fill="#ef4444" fontSize="9" fontWeight="600">+16.2%</text>
        </svg>
      </div>

      <button
        onClick={() => onSceneChange('exposure')}
        className="bg-indigo-600 text-white w-full rounded-xl py-3 font-medium text-sm hover:bg-indigo-700 transition-colors"
      >
        Exposure &amp; IC Positioning &rarr;
      </button>
    </>
  )

  // ── SCENE: exposure ─────────────────────────────────────────────────────────

  const SceneExposure = () => (
    <>
      <SentPrompt text="Show me Contoso's exposure sensitivity and the IC's current positioning on rates and credit." />

      <ResponseCard title="Exposure Areas — Most Impacted">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Duration band approaching review" />
          <Bullet text="Flow trend -$42M (90D) elevated redemption sensitivity" />
          <Bullet text="IG financials concentration above IC recommendation" />
        </ul>
      </ResponseCard>

      <ResponseCard title="Investment Committee Positioning (as of June 12, 2025)">
        <ul className="space-y-2">
          <li className="text-sm text-gray-700"><span className="font-medium text-gray-800">Rates:</span> IC recommends maintaining defensive duration posture given energy-driven volatility</li>
          <li className="text-sm text-gray-700"><span className="font-medium text-gray-800">Credit:</span> Selective rotation within IG credit recommended to reduce financials concentration</li>
          <li className="text-sm text-gray-700"><span className="font-medium text-gray-800">Alternatives:</span> No change to alternatives allocation — pending liquidity review</li>
        </ul>
      </ResponseCard>

      <ResponseCard title="Alignment Gap — Contoso vs IC">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Current Contoso positioning is overweight IG financials relative to IC recommendation" />
          <Bullet text="Duration band approaching the review threshold under current rate conditions" />
        </ul>
      </ResponseCard>

      {/* Radar Chart */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-800 mb-3">Mandate Sensitivity Radar</p>
        <svg width="260" height="220" viewBox="0 0 260 220" className="w-full">
          {/* Outer pentagon — gray dashed */}
          <polygon
            points="130,20 225,65 200,185 60,185 35,65"
            fill="none"
            stroke="#d1d5db"
            strokeDasharray="4 3"
            strokeWidth="1.5"
          />
          {/* Axes */}
          <line x1="130" y1="110" x2="130" y2="20" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="130" y1="110" x2="225" y2="65" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="130" y1="110" x2="200" y2="185" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="130" y1="110" x2="60" y2="185" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="130" y1="110" x2="35" y2="65" stroke="#e5e7eb" strokeWidth="1" />
          {/* Contoso exposure polygon — Duration and Concentration exceed boundary */}
          {/* Duration: axis top = y=20, center=110, push to y=10 */}
          {/* CreditRisk: 60% of (225-130,65-110) = (57,−27) => (187, 83) */}
          {/* Concentration: push past (200,185) => (210,200) */}
          {/* Liquidity: 60% of (60-130,185-110) = (−42,45) => (88, 155) */}
          {/* FlowRisk: 60% of (35-130,65-110) = (−57,−27) => (73, 83) */}
          <polygon
            points="130,10 187,83 210,200 88,155 73,83"
            fill="rgba(99,102,241,0.2)"
            stroke="#6366f1"
            strokeWidth="2"
          />
          {/* Axis Labels */}
          <text x="130" y="14" textAnchor="middle" fill="#4b5563" fontSize="9">Duration Risk</text>
          <text x="232" y="65" textAnchor="start" fill="#4b5563" fontSize="9">Credit Risk</text>
          <text x="204" y="198" textAnchor="middle" fill="#4b5563" fontSize="9">Concentration</text>
          <text x="58" y="198" textAnchor="middle" fill="#4b5563" fontSize="9">Liquidity</text>
          <text x="28" y="65" textAnchor="end" fill="#4b5563" fontSize="9">Flow Risk</text>
        </svg>
      </div>

      {/* Bar Comparison */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-800 mb-3">Allocation vs IC Positioning</p>
        <div className="space-y-4">
          {/* IG Financials */}
          <div>
            <p className="text-xs text-gray-600 mb-1.5">IG Financials</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Contoso</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '18%' }} />
                </div>
                <span className="text-xs text-gray-600 w-8 text-right">18%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">IC</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '12%' }} />
                </div>
                <span className="text-xs text-gray-600 w-8 text-right">12%</span>
              </div>
            </div>
          </div>
          {/* Duration */}
          <div>
            <p className="text-xs text-gray-600 mb-1.5">Duration (years)</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Contoso</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }} />
                </div>
                <span className="text-xs text-gray-600 w-8 text-right">8.2yr</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">IC</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '75%' }} />
                </div>
                <span className="text-xs text-gray-600 w-8 text-right">7.5yr</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResponseCard title="Impact Bands">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-800 font-medium w-36 flex-shrink-0">Renewal Sensitivity</span>
            <span className="bg-red-100 text-red-700 text-xs rounded-full px-2 py-0.5 font-medium">Elevated</span>
            <span className="text-sm text-gray-500">Mandate renewal in 30 days, exposure questions unresolved</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-800 font-medium w-36 flex-shrink-0">Commercial Risk</span>
            <span className="bg-amber-100 text-amber-700 text-xs rounded-full px-2 py-0.5 font-medium">Medium</span>
            <span className="text-sm text-gray-500">Pricing/terms more sensitive under volatility</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-800 font-medium w-36 flex-shrink-0">Relationship</span>
            <span className="bg-amber-100 text-amber-700 text-xs rounded-full px-2 py-0.5 font-medium">Medium</span>
            <span className="text-sm text-gray-500">Proactive engagement critical to stakeholder confidence</span>
          </div>
        </div>
      </ResponseCard>

      <button
        onClick={() => onSceneChange('compliance')}
        className="bg-indigo-600 text-white w-full rounded-xl py-3 font-medium text-sm hover:bg-indigo-700 transition-colors"
      >
        Review Compliance Guardrails &rarr;
      </button>
    </>
  )

  // ── SCENE: compliance ───────────────────────────────────────────────────────

  const SceneCompliance = () => (
    <>
      <SentPrompt text="What are my communications guardrails for this conversation?" />

      <ResponseCard title="Allowed — After Your Review" borderAccent="border-green-400">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Factual non-committal language (Comms & Disclosures 2.1)" />
          <Bullet text="Pricing within standard bands (Pricing Policy 3.2)" />
          <Bullet text="Sharing approved collateral with required disclosures" />
        </ul>
      </ResponseCard>

      <ResponseCard title="Required Disclosures" borderAccent="border-amber-400">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Sensitivity descriptions require disclaimers (Comms & Disclosures 2.3)" />
          <Bullet text="Template language must include standard caveats" />
        </ul>
      </ResponseCard>

      <ResponseCard title="Requires Approval / Escalation" borderAccent="border-red-400">
        <ul className="space-y-1.5 list-disc list-inside">
          <Bullet text="Commitment language or threshold exceptions (Comms & Disclosures 3.1)" />
          <Bullet text="Pricing outside standard bands: senior authority (Pricing Policy 3.2)" />
          <Bullet text="Credit exposure $5M+: Credit Officer; $25M+: Credit Committee (Credit Authority 1.4)" />
        </ul>
      </ResponseCard>

      <ResponseCard title="Flagged for This Call" borderAccent="border-yellow-400">
        <p className="text-sm text-gray-700">
          Discussion of rotating out of IG financials may require pre-clearance if it implies a firm-level sector view.
        </p>
        <blockquote className="bg-yellow-50 rounded-lg p-3 italic text-sm text-yellow-900 mt-2 border border-yellow-200">
          &ldquo;Our investment teams are currently evaluating sector positioning, and we see merit in reviewing concentration within the mandate&rsquo;s risk budget.&rdquo;
        </blockquote>
      </ResponseCard>

      <button
        onClick={() => onSceneChange('call-active')}
        className="bg-green-600 text-white w-full rounded-xl py-3 font-medium text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <Phone className="w-4 h-4" />
        Connect to Contoso Capital &rarr;
      </button>
    </>
  )

  // ── SCENE: call-active / call-next-steps ────────────────────────────────────

  const SceneCallIntel = () => {
    const segment = CALL_SEGMENTS[callSegmentIndex]
    if (!segment) return null
    const intel = segment.agentIntel
    const isNextSteps = callSegmentIndex === 4

    const ComplianceBadge = () => (
      <div className="flex items-center gap-2 mb-4">
        {segment.complianceStatus === 'clear' ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs text-green-700 font-medium">Compliance: Clear</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span className="text-xs text-amber-700 font-medium">Compliance: Caution — pre-clearance recommended</span>
          </>
        )}
      </div>
    )

    if (intel.type === 'tracking') {
      return (
        <>
          <ComplianceBadge />
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-2">{intel.headline}</p>
            <ul className="space-y-1.5 list-disc list-inside">
              {intel.bullets.map((b, i) => (
                <li key={i} className="text-sm text-blue-700">{b}</li>
              ))}
            </ul>
          </div>
        </>
      )
    }

    if (intel.type === 'talking-point') {
      return (
        <>
          <ComplianceBadge />
          <div className="bg-white rounded-xl p-5 shadow-sm border border-indigo-100">
            <p className="text-sm font-semibold text-indigo-800 mb-3">{intel.headline}</p>
            <ul className="space-y-2">
              {intel.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </>
      )
    }

    if (intel.type === 'data-card') {
      return (
        <>
          <ComplianceBadge />
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-800 mb-3">{intel.headline}</p>
            <ul className="space-y-1.5 list-disc list-inside mb-3">
              {intel.bullets.map((b, i) => (
                <li key={i} className="text-sm text-gray-700">{b}</li>
              ))}
            </ul>
            {intel.approvedFraming && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 mt-2">
                <p className="text-xs text-green-600 uppercase font-medium mb-1">Approved Framing</p>
                <p className="text-sm italic text-green-800">{intel.approvedFraming}</p>
              </div>
            )}
          </div>
        </>
      )
    }

    if (intel.type === 'next-steps') {
      return (
        <>
          <ComplianceBadge />
          {isNextSteps && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 mb-1">
              <p className="text-sm font-semibold text-indigo-800">{intel.headline}</p>
            </div>
          )}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <ul className="space-y-2">
              {intel.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          {isNextSteps && (
            <button
              onClick={() => onSceneChange('cowork')}
              className="bg-indigo-600 text-white w-full rounded-xl py-3 font-medium text-sm hover:bg-indigo-700 transition-colors"
            >
              Open Cowork Artifacts &rarr;
            </button>
          )}
        </>
      )
    }

    return null
  }

  const rightPanelBody = () => {
    if (scene === 'market-context') return <SceneMarketContext />
    if (scene === 'exposure') return <SceneExposure />
    if (scene === 'compliance') return <SceneCompliance />
    if (scene === 'call-active' || scene === 'call-next-steps') return <SceneCallIntel />
    return null
  }

  // ── LEFT PANEL bottom section ───────────────────────────────────────────────

  const LeftPanelBottom = () => {
    if (scene === 'account-detail') {
      return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-700">Woodgrove Intelligence</span>
          </div>
          <button
            onClick={() => onSceneChange('market-context')}
            className="bg-white rounded-lg px-4 py-3 text-sm text-indigo-600 border border-indigo-200 cursor-pointer hover:bg-indigo-50 shadow-sm mt-3 w-full text-left"
          >
            What&rsquo;s the market context for this mandate given today&rsquo;s energy shock?
          </button>
        </div>
      )
    }

    if (scene === 'call-active' || scene === 'call-next-steps') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <span className="animate-pulse w-3 h-3 rounded-full bg-green-500 inline-block flex-shrink-0" />
          <span className="text-sm font-medium text-green-700">Live call with Marcus Chen (CIO)</span>
        </div>
      )
    }

    if (scene === 'market-context' || scene === 'exposure' || scene === 'compliance') {
      return (
        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          <span className="text-xs text-indigo-600">Woodgrove Intelligence active</span>
        </div>
      )
    }

    return null
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex overflow-hidden bg-gray-50">
      {/* LEFT PANEL */}
      <div
        className={`h-full overflow-y-auto flex-shrink-0 p-6 ${
          agentPanelActive ? 'w-[420px] border-r border-gray-200' : 'flex-1 max-w-3xl mx-auto'
        }`}
      >
        {/* Back bar */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-sm text-gray-400">/</span>
          <span className="text-sm text-gray-400">Contoso Capital</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="bg-amber-100 text-amber-700 text-xs rounded-full px-2 py-0.5">Tier 1</span>
            <span className="bg-gray-100 text-gray-500 text-xs rounded-full px-2 py-0.5">North America</span>
          </div>
        </div>

        {/* Account header card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Contoso Capital</h1>
          <div className="flex flex-wrap gap-2">
            {['$1.62B AUM', 'Custom LDI Blend', 'Next Review: 30 June'].map((chip) => (
              <span
                key={chip}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700"
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <TrendingDown className="text-red-500 w-4 h-4" />
            <span className="text-sm text-red-600">-$42M net flow (90D)</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3 inline-flex items-center gap-2">
            <Clock className="text-amber-500 w-4 h-4" />
            <span className="font-medium text-amber-700">Renewal in 30 days</span>
          </div>
        </div>

        {/* Allocation card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            <span className="font-medium text-gray-900">Allocation</span>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-auto">Morningstar</span>
          </div>
          <div className="mt-3 space-y-2">
            {allocationBars.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-600">{bar.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.value}%` }} />
                </div>
                <span className="w-8 text-xs text-gray-500 text-right">{bar.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Posture card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="font-medium text-gray-900">Posture Indicators</span>
          </div>
          <div className="mt-3 space-y-3">
            {detail.posture.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                {postureIcon(item.status)}
                <span className="font-medium text-gray-800 text-sm">{item.label}</span>
                <span className="text-gray-500 text-sm ml-auto">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <LeftPanelBottom />
      </div>

      {/* RIGHT PANEL */}
      {agentPanelActive && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <RightPanelHeader />
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {rightPanelBody()}
          </div>
        </div>
      )}
    </div>
  )
}
