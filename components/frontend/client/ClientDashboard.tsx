"use client"

import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle2,
  Video,
  Mail,
  Landmark,
  BarChart2,
  CalendarClock,
} from 'lucide-react'
import { CONTOSO_DETAIL, MARKET_EVENT } from '@/lib/irmData'

// ── Helpers ───────────────────────────────────────────────────────────────────

const allocationColors: Record<string, string> = {
  equities:      'bg-blue-500',
  fixedIncome:   'bg-indigo-600',
  privateCredit: 'bg-purple-500',
  realAssets:    'bg-teal-500',
  liquidity:     'bg-gray-400',
}
const allocationLabels: Record<string, string> = {
  equities:      'Equities',
  fixedIncome:   'Fixed Income',
  privateCredit: 'Private Credit',
  realAssets:    'Real Assets',
  liquidity:     'Liquidity',
}

// ── KPI widget ────────────────────────────────────────────────────────────────

interface MetricProps {
  title: string
  value: string
  detail: React.ReactNode
  icon: React.ElementType
  iconBg: string
  iconColor: string
  valueColor?: string
}

function MetricCard({ title, value, detail, icon: Icon, iconBg, iconColor, valueColor = 'text-gray-900' }: MetricProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <div className={`${iconBg} rounded-lg p-1.5`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className={`text-[26px] font-bold ${valueColor} mb-1 leading-none`}>{value}</div>
      <div className="text-xs text-gray-400 leading-snug">{detail}</div>
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export function ClientDashboard() {
  const detail = CONTOSO_DETAIL

  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Greeting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Good morning, Tim</h1>
            <p className="text-sm text-gray-500 mt-0.5">Contoso Capital · Custom LDI Blend · ${detail.aumBillions.toFixed(2)}B AUM</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Renewal in {detail.renewalDays} days
            </span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-1 text-sm">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* KPI metrics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Portfolio Value"
            value={`$${detail.aumBillions.toFixed(2)}B`}
            detail="Contoso Capital mandate"
            icon={Landmark}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
          />
          <MetricCard
            title="YTD Return"
            value="+7.5%"
            detail={
              <span>
                Benchmark: +7.6%{' '}
                <span className="text-red-500 font-medium">(-5bps alpha)</span>
              </span>
            }
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
          />
          <MetricCard
            title="MTM Change"
            value="-2.5%"
            detail="Elevated redemption sensitivity"
            icon={TrendingDown}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            valueColor="text-red-600"
          />
          <MetricCard
            title="Days to Renewal"
            value={`${detail.renewalDays}`}
            detail={`Review: ${detail.nextReview}`}
            icon={CalendarClock}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            valueColor="text-amber-600"
          />
        </div>

        {/* Market alert — framed for Tim */}
        <div className="bg-amber-50 border border-orange-500 rounded-xl mb-4 overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 shrink-0 mt-0.5 text-amber-500"
              style={{ animation: 'alertIconPulse 2s ease-in-out infinite' }}
            />
            <style>{`
              @keyframes alertIconPulse {
                0%, 100% { color: rgb(245,158,11); }
                50%       { color: rgb(220,38,38);  }
              }
            `}</style>
            <div className="flex-1">
              <div className="font-semibold text-amber-900">{MARKET_EVENT.title} — Mandate Impact</div>
              <p className="text-sm text-amber-700 mt-1">
                {MARKET_EVENT.cause}. Crude {MARKET_EVENT.crudePctChange} overnight. Your mandate has elevated sensitivity
                to the resulting rate repricing and credit spread widening. Woodgrove is monitoring your exposure and
                has been in touch to discuss implications.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'Long-end yields +18–22bps (10Y–30Y)',
                  'IG credit spreads widening — financials & utilities',
                  'Duration band approaching review threshold',
                ].map(item => (
                  <span key={item} className="text-xs bg-white border border-amber-400 text-amber-800 rounded-full px-2.5 py-1">
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{MARKET_EVENT.asOfTimestamp}</p>
            </div>
          </div>
        </div>

        {/* Bottom two columns */}
        <div className="grid grid-cols-3 gap-4 items-start">

          {/* Left 2/3 — portfolio snapshot */}
          <div className="col-span-2 space-y-4">

            {/* Allocation */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-gray-900 text-sm">Current Allocation</span>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                  Morningstar
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(detail.allocation).map(([key, pct]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-600 shrink-0">{allocationLabels[key]}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${allocationColors[key]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm font-medium text-gray-700 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <BarChart2 className="w-3.5 h-3.5" />
                Benchmark: Custom LDI Blend
              </div>
            </div>

            {/* Mandate posture */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-gray-900 text-sm">Mandate Posture</span>
              </div>
              <div className="space-y-3">
                {detail.posture.map(p => {
                  const Icon = p.status === 'critical' ? AlertTriangle
                    : p.status === 'warning' ? AlertCircle
                    : CheckCircle2
                  const color = p.status === 'critical' ? 'text-red-500'
                    : p.status === 'warning' ? 'text-amber-500'
                    : 'text-green-500'
                  return (
                    <div key={p.label} className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${color} shrink-0`} />
                      <span className="text-sm font-medium text-gray-800">{p.label}</span>
                      <span className="ml-auto text-sm text-gray-500">{p.detail}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right 1/3 — engagement */}
          <div className="col-span-1 space-y-4">

            {/* Upcoming */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Upcoming</h3>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Video Call</p>
                    <p className="text-xs text-gray-500 mt-0.5">Serena Ribeiro · Woodgrove IRM</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                        Today · 9:30 AM
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                      Energy shock impact on mandate — duration &amp; sector positioning
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent from Woodgrove */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">From Woodgrove</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      Follow-up from today's discussion
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Serena Ribeiro · Just now</p>
                    <p className="text-xs text-gray-400 mt-1.5 leading-snug line-clamp-3">
                      Thank you for the conversation this morning regarding the impact of the energy supply disruption
                      on your mandate. Our team is modeling two duration adjustment scenarios within your mandate
                      guidelines…
                    </p>
                    <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2 transition-colors">
                      Read full message →
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
