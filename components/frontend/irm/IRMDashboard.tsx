'use client'

import { useState } from 'react'
import type { IRMScene } from '@/lib/irmTypes'
import { ACCOUNTS, MARKET_EVENT } from '@/lib/irmData'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Droplets,
  Video,
  Phone,
  Mail,
  BarChart2,
  Smartphone,
  ChevronRight,
  Landmark,
  Users,
} from 'lucide-react'

interface IRMDashboardProps {
  scene: IRMScene
  onSceneChange: (scene: IRMScene) => void
  approvedIds: Set<string>
  onApprove: (id: string) => void
  onSelectAccount: (id: string) => void
}

function formatAUM(billions: number): string {
  return `$${billions.toFixed(2)}B`
}

function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const styles =
    tier === 1
      ? 'bg-amber-100 text-amber-700'
      : tier === 2
        ? 'bg-indigo-50 text-indigo-600'
        : 'bg-gray-100 text-gray-500'
  return (
    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${styles}`}>
      Tier {tier}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles =
    severity === 'elevated'
      ? 'bg-red-50 text-red-700'
      : severity === 'moderate'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-yellow-50 text-yellow-700'
  const label =
    severity === 'elevated'
      ? 'Elevated'
      : severity === 'moderate'
        ? 'Moderate'
        : 'Low-Moderate'
  return (
    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${styles}`}>
      {label}
    </span>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case 'video':
      return <Video className="w-4 h-4" />
    case 'phone':
      return <Phone className="w-4 h-4" />
    case 'email':
      return <Mail className="w-4 h-4" />
    case 'bloomberg':
      return <BarChart2 className="w-4 h-4" />
    case 'sms':
      return <Smartphone className="w-4 h-4" />
    default:
      return null
  }
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'video':
      return 'Video Call'
    case 'phone':
      return 'Phone'
    case 'email':
      return 'Email'
    case 'bloomberg':
      return 'Bloomberg'
    case 'sms':
      return 'SMS'
    default:
      return channel
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'confirmed':
      return (
        <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-xs">
          ✓ Confirmed
        </span>
      )
    case 'sent':
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs">
          ⏱ Sent
        </span>
      )
    case 'delivered':
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs">
          Delivered
        </span>
      )
    default:
      return null
  }
}

const impactIcons = [TrendingUp, Activity, Layers, Droplets]

const affectedAccounts = ACCOUNTS.filter((a) => a.impactSeverity !== 'minimal')
const minimalAccounts = ACCOUNTS.filter((a) => a.impactSeverity === 'minimal')

// Tier breakdown computed from data
const tierStats = ([1, 2, 3] as const).map((tier) => {
  const accounts = ACCOUNTS.filter((a) => a.tier === tier)
  return {
    tier,
    count: accounts.length,
    aum: Math.round(accounts.reduce((sum, a) => sum + a.aumBillions, 0) * 100) / 100,
  }
})
const totalAUM = tierStats.reduce((sum, t) => sum + t.aum, 0)

const tierColors: Record<number, { bar: string; label: string; badge: string }> = {
  1: { bar: 'bg-amber-400',  label: 'text-amber-700',  badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  2: { bar: 'bg-indigo-500', label: 'text-indigo-700', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  3: { bar: 'bg-gray-400',   label: 'text-gray-600',   badge: 'bg-gray-50 border-gray-200 text-gray-600' },
}

function MetricsRow() {
  const metrics = [
    {
      title: 'Total AUM',
      value: '$7.42B',
      detail: 'Across all mandates',
      icon: Landmark,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Annual Revenue',
      value: '$20.2M',
      detail: 'Fee income YTD',
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Relationships',
      value: '10',
      detail: (
        <span>
          <span className="text-emerald-600 font-medium">5 healthy</span>
          {' · '}
          <span className="text-amber-600 font-medium">4 attention</span>
          {' · '}
          <span className="text-red-500 font-medium">1 at risk</span>
        </span>
      ),
      icon: Users,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-50',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Avg. YTD Alpha',
      value: '−5bps',
      detail: 'Book: +7.5% vs +7.6% benchmark',
      icon: TrendingDown,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      valueColor: 'text-red-600',
    },
  ] as const

  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <div key={m.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{m.title}</span>
              <div className={`${m.iconBg} rounded-lg p-1.5`}>
                <Icon className={`w-4 h-4 ${m.iconColor}`} />
              </div>
            </div>
            <div className={`text-[26px] font-bold ${m.valueColor} mb-1 leading-none`}>{m.value}</div>
            <div className="text-xs text-gray-400 leading-snug">{m.detail}</div>
          </div>
        )
      })}
    </div>
  )
}

function TierKPIBar() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">AUM by Tier</span>
        <span className="text-sm font-semibold text-gray-900">${totalAUM.toFixed(2)}B total</span>
      </div>

      {/* Segmented bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
        {tierStats.map((t) => (
          <div
            key={t.tier}
            className={`${tierColors[t.tier].bar} rounded-full transition-all`}
            style={{ width: `${(t.aum / totalAUM) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {tierStats.map((t) => (
          <div key={t.tier} className="flex items-center gap-2 flex-1">
            <span className={`border rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[t.tier].badge}`}>
              Tier {t.tier}
            </span>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${tierColors[t.tier].label}`}>${t.aum.toFixed(2)}B</div>
              <div className="text-xs text-gray-400">{t.count} account{t.count !== 1 ? 's' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GreetingRow({ scene }: { scene: IRMScene }) {
  const isTriage = scene === 'triage'
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        {isTriage ? 'Triage Panel' : 'Good morning, Serena — Accounts Overview'}
      </h1>
      <div className="flex items-center gap-2">
        <span className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm font-medium">
          $7.42B AUM
        </span>
        <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-1 text-sm">
          10 Active Accounts
        </span>
      </div>
    </div>
  )
}

function healthStatus(severity: string): { label: string; className: string } {
  if (severity === 'elevated') return { label: 'At Risk', className: 'bg-red-50 text-red-700' }
  if (severity === 'moderate' || severity === 'low-moderate') return { label: 'Attention', className: 'bg-amber-50 text-amber-700' }
  return { label: 'Healthy', className: 'bg-green-50 text-green-700' }
}

function reviewDaysBadge(days: number): string {
  if (days <= 7) return 'bg-red-50 text-red-600'
  if (days <= 14) return 'bg-amber-50 text-amber-600'
  return 'bg-indigo-50 text-indigo-600'
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const UPCOMING_REVIEWS = [
  { name: 'Contoso Capital',       days: 20 },
  { name: 'Pinnacle State Pension', days: 18 },
  { name: 'Vantage Capital Group',  days: 15 },
  { name: 'Apex Municipal Fund',    days: 7  },
]

function RelationshipsAndReviews() {
  return (
    <div className="grid grid-cols-3 gap-4 items-start">

      {/* Relationships — 2/3 width */}
      <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Relationships</h3>
        </div>
        <div>
          {ACCOUNTS.map((account, i) => {
            const { label, className } = healthStatus(account.impactSeverity)
            return (
              <div
                key={account.id}
                className={`flex items-center gap-4 px-5 py-3 ${i < ACCOUNTS.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}
              >
                {/* Name + tier */}
                <div className="flex items-center gap-2 w-56 shrink-0">
                  <span className="text-sm font-medium text-gray-900 truncate">{account.name}</span>
                  <TierBadge tier={account.tier} />
                </div>

                {/* Mandate */}
                <span className="text-xs text-gray-400 w-28 shrink-0">{account.mandateType}</span>

                {/* AUM */}
                <span className="text-sm font-medium text-gray-700 w-20 shrink-0">{formatAUM(account.aumBillions)}</span>

                {/* Status */}
                <div className="ml-auto">
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${className}`}>
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Reviews — 1/3 width */}
      <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Upcoming Reviews</h3>
        </div>
        <div className="p-4 space-y-3">
          {UPCOMING_REVIEWS.map(({ name, days }) => (
            <div key={name} className="flex items-start gap-3">
              {/* Day badge */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${reviewDaysBadge(days)}`}>
                {days}d
              </div>
              {/* Name + date */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{daysFromNow(days)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

function CollapsedAlertPill({
  onSceneChange,
}: {
  onSceneChange: (scene: IRMScene) => void
}) {
  return (
    <div
      className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-6 inline-flex items-center gap-2 cursor-pointer"
      onClick={() => onSceneChange('alert-expanded')}
    >
      <AlertTriangle className="w-4 h-4 text-amber-500" />
      <span className="text-sm text-amber-700">
        Energy Supply Shock · Crude +16.2%
      </span>
      <span className="text-amber-500">↗</span>
    </div>
  )
}

// ── Morningstar placeholder charts ────────────────────────────────────────────

function MorningstarBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
      Morningstar
    </span>
  )
}

function RateCurveChart() {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Rate Curve Shift</span>
        <MorningstarBadge />
      </div>
      <svg viewBox="0 0 260 110" className="w-full" style={{ height: 110 }}>
        {/* Grid lines */}
        {[20, 45, 70, 95].map(y => (
          <line key={y} x1="30" y1={y} x2="255" y2={y} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        {/* Yesterday curve — gray, mostly flat with gentle rise */}
        <polyline
          points="30,72 75,70 120,68 165,65 210,63 255,60"
          fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinejoin="round"
        />
        {/* Today curve — blue, long end reprices up sharply */}
        <polyline
          points="30,74 75,71 120,69 165,62 210,45 255,28"
          fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round"
        />
        {/* Shaded gap between curves on long end */}
        <polygon
          points="165,62 210,45 255,28 255,60 210,63 165,65"
          fill="rgba(239,68,68,0.08)"
        />
        {/* X-axis labels */}
        {['3M','1Y','5Y','10Y','30Y'].map((label, i) => (
          <text key={label} x={30 + i * 55.75} y="107" fontSize="9" fill="#9ca3af" textAnchor="middle">{label}</text>
        ))}
        {/* Annotation */}
        <text x="222" y="22" fontSize="9" fill="#dc2626" fontWeight="600">+18–22bps</text>
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-gray-400" />Yesterday</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-indigo-500" />Today</span>
        <span className="flex items-center gap-1 text-red-500 ml-auto">Long-end repricing</span>
      </div>
    </div>
  )
}

function SectorHeatmap() {
  const sectors = ['Financials','Utilities','Industrials','Healthcare','Technology','Energy','Consumer']
  const periods = ['1W','1M','3M','QTD']
  // color intensity per cell [sector][period]: 0=green, 1=amber, 2=red
  const heat = [
    [1,2,2,2], // Financials
    [1,1,2,2], // Utilities
    [0,1,1,1], // Industrials
    [0,0,0,0], // Healthcare
    [0,0,0,0], // Technology
    [0,1,1,1], // Energy
    [0,0,0,1], // Consumer
  ]
  const cellColor = (v: number) =>
    v === 2 ? 'bg-red-400' : v === 1 ? 'bg-amber-300' : 'bg-green-200'

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">IG Spread Heatmap</span>
        <MorningstarBadge />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] border-separate border-spacing-0.5">
          <thead>
            <tr>
              <td className="w-16" />
              {periods.map(p => (
                <td key={p} className="text-center text-gray-400 font-medium pb-1">{p}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector, si) => (
              <tr key={sector}>
                <td className="text-gray-500 pr-1 text-right leading-tight py-0.5">{sector}</td>
                {heat[si].map((v, pi) => (
                  <td key={pi} className="text-center py-0.5">
                    <div className={`${cellColor(v)} rounded-sm mx-auto`} style={{ width: 20, height: 14 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-sm bg-green-200" />Tight</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-sm bg-amber-300" />Widening</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-sm bg-red-400" />Significant</span>
      </div>
    </div>
  )
}

function IGSpreadChart() {
  const sectors = [
    { name: 'Financials', bps: 18, color: '#ef4444' },
    { name: 'Utilities',  bps: 12, color: '#f97316' },
    { name: 'Energy',     bps: 9,  color: '#f59e0b' },
    { name: 'Industrials',bps: 5,  color: '#fbbf24' },
    { name: 'Technology', bps: 2,  color: '#86efac' },
    { name: 'Healthcare', bps: 1,  color: '#86efac' },
  ]
  const max = 20
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">IG Spread Widening</span>
        <MorningstarBadge />
      </div>
      <div className="space-y-1.5 mt-1">
        {sectors.map(({ name, bps, color }) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-18 shrink-0" style={{ width: 64 }}>{name}</span>
            <div className="flex-1 h-4 bg-gray-50 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${(bps / max) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-600 w-8 text-right">+{bps}bp</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-400 mt-1">Day-over-day spread change (bps)</p>
    </div>
  )
}

// ── Scene: Dashboard ───────────────────────────────────────────────────────────

function SceneDashboard({
  onSceneChange,
  alertOpen,
  onToggleAlert,
}: {
  onSceneChange: (scene: IRMScene) => void
  alertOpen: boolean
  onToggleAlert: () => void
}) {
  return (
    <>
      <style>{`
        @keyframes alertIconPulse {
          0%, 100% { color: rgb(245, 158, 11); }
          50%       { color: rgb(220, 38, 38); }
        }
      `}</style>

      {/* Alert banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl mb-4 overflow-hidden">

        {/* Header row — always visible */}
        <div className="p-4 flex items-start gap-3">
          <AlertTriangle
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ animation: 'alertIconPulse 2s ease-in-out infinite' }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-900 transition-all duration-300">
              {alertOpen ? MARKET_EVENT.title : 'Market Alert'}
            </div>
            {alertOpen && (
              <div className="text-sm text-amber-700 mt-0.5">
                Crude {MARKET_EVENT.crudePctChange} overnight — {MARKET_EVENT.cause}
              </div>
            )}
          </div>
          <button
            onClick={onToggleAlert}
            className="shrink-0 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 font-medium text-sm rounded-lg px-4 py-2 transition-colors self-start"
          >
            Review Impact
          </button>
        </div>

        {/* Expanded content */}
        {alertOpen && (
          <div className="px-4 pb-5">
            {/* Morningstar charts */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <RateCurveChart />
              <SectorHeatmap />
              <IGSpreadChart />
            </div>

            {/* Impact bullets */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Impact across asset classes
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {MARKET_EVENT.impacts.map((impact, i) => {
                  const Icon = impactIcons[i] ?? Activity
                  return (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Icon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{impact}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-600">Source: Morningstar market data</span>
                <span className="text-xs text-gray-400">{MARKET_EVENT.asOfTimestamp}</span>
              </div>
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                onClick={() => onSceneChange('triage')}
              >
                See Triage Impact →
              </button>
            </div>
          </div>
        )}
      </div>

      <TierKPIBar />
      <MetricsRow />
      <RelationshipsAndReviews />
    </>
  )
}

function SceneAlertExpanded({
  onSceneChange,
}: {
  onSceneChange: (scene: IRMScene) => void
}) {
  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <span className="text-xl font-bold text-amber-900">
            {MARKET_EVENT.title}
          </span>
          <div className="ml-auto">
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">
              {MARKET_EVENT.timestamp}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-red-600">
            Crude {MARKET_EVENT.crudePctChange}
          </span>
          <span className="text-lg text-amber-700">overnight</span>
        </div>

        <p className="text-amber-800 mt-2">{MARKET_EVENT.cause}</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {MARKET_EVENT.impacts.map((impact, i) => {
            const Icon = impactIcons[i] ?? Activity
            return (
              <div
                key={i}
                className="bg-white rounded-lg p-3 text-sm text-gray-700 flex items-start gap-2"
              >
                <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span>{impact}</span>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-amber-600 mt-3">
          Source: Morningstar market data
        </p>
        <p className="text-xs text-gray-400">{MARKET_EVENT.asOfTimestamp}</p>

        <button
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-medium transition-colors"
          onClick={() => onSceneChange('triage')}
        >
          See Triage Impact →
        </button>
      </div>

      <RelationshipsAndReviews />
    </>
  )
}

function SceneTriage({
  onSceneChange,
  approvedIds,
  onApprove,
  onSelectAccount,
}: {
  onSceneChange: (scene: IRMScene) => void
  approvedIds: Set<string>
  onApprove: (id: string) => void
  onSelectAccount: (id: string) => void
}) {

  return (
    <>
      <CollapsedAlertPill onSceneChange={onSceneChange} />

      {/* Affected Accounts */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm font-medium">
            Affected Accounts (5)
          </div>
          <span className="text-sm text-gray-500">5 of 10 accounts materially affected</span>
        </div>

        {affectedAccounts.map((account, index) => {
          const isApproved = approvedIds.has(account.id)

          return (
            <div
              key={account.id}
              onClick={() => { onSelectAccount(account.id); onSceneChange('account-detail') }}
              className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-3 flex items-center gap-4 transition-all cursor-pointer hover:ring-2 hover:ring-indigo-200 hover:bg-indigo-50/30
                ${!isApproved ? 'bg-amber-50/30 border-amber-100' : ''}
              `}
            >
              {/* Rank */}
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {index + 1}
              </div>

              {/* Name + badges + reasons */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{account.name}</span>
                  <TierBadge tier={account.tier} />
                  <span className="text-sm text-gray-500">{formatAUM(account.aumBillions)}</span>
                  <SeverityBadge severity={account.impactSeverity} />
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {account.impactReasons.map((reason) => (
                    <span key={reason} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* Outreach info */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <ChannelIcon channel={account.contact.preferredChannel} />
                  <span>{channelLabel(account.contact.preferredChannel)}</span>
                </div>
                <span className="text-sm text-gray-700 whitespace-nowrap">{account.outreach.proposedTime}</span>

                {/* Approve / Adjust (pending) or Status badge (approved) */}
                {isApproved ? (
                  <StatusBadge status={account.outreach.status} />
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onApprove(account.id) }}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg px-3 py-1.5 border border-gray-200 transition-colors"
                    >
                      Adjust
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Minimal Impact */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gray-100 text-gray-500 rounded-lg px-3 py-2 text-sm font-medium">
            Minimal Impact (5)
          </div>
          <span className="text-sm text-gray-400 italic">No action required today</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {minimalAccounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm opacity-60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">{account.name}</span>
                <TierBadge tier={account.tier} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{account.mandateType}</span>
                <span className="text-xs text-gray-500">{formatAUM(account.aumBillions)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function SceneOutreach({
  onSceneChange,
}: {
  onSceneChange: (scene: IRMScene) => void
}) {
  return (
    <>
      <CollapsedAlertPill onSceneChange={onSceneChange} />

      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Outreach Orchestration
        </h2>
        <span className="text-sm text-gray-500">
          5 affected accounts · Based on client preferences
        </span>
      </div>

      {affectedAccounts.map((account) => {
        const isContoso = account.id === 'contoso-capital'
        return (
          <div
            key={account.id}
            className={`rounded-xl p-4 border shadow-sm mb-3 ${
              isContoso
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300 cursor-pointer'
                : 'bg-white border-gray-100'
            }`}
            onClick={isContoso ? () => onSceneChange('account-detail') : undefined}
          >
            <div className="flex items-center gap-4">
              {/* Account info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {account.name}
                  </span>
                  <TierBadge tier={account.tier} />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {account.contact.name} · {account.contact.title}
                </div>
              </div>

              {/* Channel */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0">
                <ChannelIcon channel={account.contact.preferredChannel} />
                <span>{channelLabel(account.contact.preferredChannel)}</span>
              </div>

              {/* Proposed time */}
              <div className="text-sm text-gray-700 shrink-0">
                {account.outreach.proposedTime}
              </div>

              {/* Status */}
              <div className="shrink-0">
                <StatusBadge status={account.outreach.status} />
              </div>

              {/* Engage button for Contoso only */}
              {isContoso && (
                <button
                  className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700 transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSceneChange('account-detail')
                  }}
                >
                  Engage →
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between mt-2">
        <span className="text-indigo-700 font-medium">
          Contoso Capital confirmed — ready to engage
        </span>
        <button
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-indigo-700 transition-colors"
          onClick={() => onSceneChange('account-detail')}
        >
          Connect Now →
        </button>
      </div>
    </>
  )
}

export function IRMDashboard({ scene, onSceneChange, approvedIds, onApprove, onSelectAccount }: IRMDashboardProps) {
  const [alertOpen, setAlertOpen] = useState(false)

  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <GreetingRow scene={scene} />

        {scene === 'dashboard' && (
          <SceneDashboard
            onSceneChange={onSceneChange}
            alertOpen={alertOpen}
            onToggleAlert={() => setAlertOpen(o => !o)}
          />
        )}

        {scene === 'alert-expanded' && (
          <SceneAlertExpanded onSceneChange={onSceneChange} />
        )}

        {scene === 'triage' && (
          <SceneTriage
            onSceneChange={onSceneChange}
            approvedIds={approvedIds}
            onApprove={onApprove}
            onSelectAccount={onSelectAccount}
          />
        )}

        {scene === 'outreach' && (
          <SceneOutreach onSceneChange={onSceneChange} />
        )}
      </div>
    </div>
  )
}
