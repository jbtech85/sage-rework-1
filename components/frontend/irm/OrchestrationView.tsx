'use client'

import { useState } from 'react'
import {
  ChevronLeft, PieChart, Activity, TrendingDown, TrendingUp,
  Clock, AlertCircle, AlertTriangle, CheckCircle2, Sparkles,
  Phone, Video, Mail, BarChart2, Smartphone,
} from 'lucide-react'
import type { IRMScene } from '@/lib/irmTypes'
import { ACCOUNTS, ACCOUNT_DETAILS, CALL_SEGMENTS } from '@/lib/irmData'

interface OrchestrationViewProps {
  scene: IRMScene
  initialAccountId: string
  approvedIds: Set<string>
  onApprove: (id: string) => void
  onSceneChange: (scene: IRMScene) => void
  onBack: () => void
  callSegmentIndex: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAUM(b: number) { return `$${b.toFixed(2)}B` }

function channelLabel(ch: string) {
  return ch === 'video' ? 'Video Call' : ch === 'phone' ? 'Phone' : ch === 'email' ? 'Email' : ch === 'bloomberg' ? 'Bloomberg' : 'SMS'
}

function ChannelIcon({ channel }: { channel: string }) {
  const cls = 'w-4 h-4'
  if (channel === 'video') return <Video className={cls} />
  if (channel === 'phone') return <Phone className={cls} />
  if (channel === 'email') return <Mail className={cls} />
  if (channel === 'bloomberg') return <BarChart2 className={cls} />
  return <Smartphone className={cls} />
}

function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const s = tier === 1 ? 'bg-amber-100 text-amber-700' : tier === 2 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
  return <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${s}`}>Tier {tier}</span>
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') return <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-xs">✓ Confirmed</span>
  if (status === 'sent') return <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs">⏱ Sent</span>
  if (status === 'delivered') return <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 text-xs">Delivered</span>
  return null
}

const allocationColors: Record<string, string> = {
  equities: 'bg-blue-500',
  fixedIncome: 'bg-indigo-600',
  privateCredit: 'bg-purple-500',
  realAssets: 'bg-teal-500',
  liquidity: 'bg-gray-400',
}
const allocationLabels: Record<string, string> = {
  equities: 'Equities',
  fixedIncome: 'Fixed Income',
  privateCredit: 'Private Credit',
  realAssets: 'Real Assets',
  liquidity: 'Liquidity',
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OrchestrationView({
  scene,
  initialAccountId,
  approvedIds,
  onApprove,
  onSceneChange,
  onBack,
  callSegmentIndex,
}: OrchestrationViewProps) {
  const [selectedId, setSelectedId] = useState(initialAccountId)

  const affectedAccounts = ACCOUNTS.filter(a => a.impactSeverity !== 'minimal')
  const selectedAccount = ACCOUNTS.find(a => a.id === selectedId)!
  const selectedDetail = ACCOUNT_DETAILS[selectedId]
  const railAccounts = affectedAccounts.filter(a => a.id !== selectedId)

  const isApproved = approvedIds.has(selectedId)
  const agentPanelActive = scene !== 'account-detail'
  const isCall = scene === 'call-active' || scene === 'call-next-steps'
  const handleRailClick = (id: string) => {
    setSelectedId(id)
    onSceneChange('account-detail')
  }

  // ── CENTER PANEL ────────────────────────────────────────────────────────────

  const leftPanel = (
    <div className="flex-1 h-full overflow-y-auto p-6" style={{ scrollbarGutter: 'stable' }}>
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-400">{selectedDetail?.name ?? selectedAccount.name}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <TierBadge tier={selectedAccount.tier} />
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{selectedAccount.segment}</span>
        </div>
      </div>

      {/* Account header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedDetail?.name ?? selectedAccount.name}</h2>
        <div className="flex flex-wrap gap-2">
          <span className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">{formatAUM(selectedAccount.aumBillions)}</span>
          <span className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">{selectedDetail?.benchmark ?? selectedAccount.mandateType}</span>
          {selectedDetail?.nextReview && (
            <span className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">Next Review: {selectedDetail.nextReview}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {(selectedDetail?.netFlow90D ?? 0) < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <TrendingUp className="w-4 h-4 text-green-500" />
          )}
          <span className={`text-sm ${(selectedDetail?.netFlow90D ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {selectedDetail ? `${selectedDetail.netFlow90D > 0 ? '+' : ''}$${selectedDetail.netFlow90D}M net flow (90D)` : '—'}
          </span>
        </div>
        {selectedDetail?.renewalDays && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3 inline-flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-amber-700">Renewal in {selectedDetail.renewalDays} days</span>
          </div>
        )}
      </div>

      {/* Outreach widget */}
      <div className={`rounded-xl p-4 border mb-4 ${isApproved ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-100'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 ${isApproved ? 'text-green-700' : 'text-indigo-700'}">
          Outreach Recommendation
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <ChannelIcon channel={selectedAccount.contact.preferredChannel} />
            <span className="font-medium">{channelLabel(selectedAccount.contact.preferredChannel)}</span>
          </div>
          <span className="text-gray-400">·</span>
          <span className="text-sm text-gray-600">{selectedAccount.contact.name}, {selectedAccount.contact.title}</span>
          <span className="text-gray-400">·</span>
          <span className="text-sm text-gray-700">{selectedAccount.outreach.proposedTime}</span>
        </div>
        {isApproved ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">✓ Confirmed</span>
            </div>
            <button
              onClick={() => onSceneChange('call-active')}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
            >
              <Phone className="w-3 h-3" />
              Connect
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onApprove(selectedId)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
            >
              Approve
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg px-3 py-1.5 border border-gray-200 transition-colors">
              Adjust
            </button>
          </div>
        )}
      </div>

      {/* Allocation */}
      {selectedDetail && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-500" />
              <span className="font-medium text-gray-900">Allocation</span>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">Morningstar</span>
          </div>
          <div className="space-y-2">
            {Object.entries(selectedDetail.allocation).map(([key, pct]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-600">{allocationLabels[key]}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${allocationColors[key]}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-xs text-gray-500 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posture */}
      {selectedDetail && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="font-medium text-gray-900">Posture Indicators</span>
          </div>
          <div className="space-y-3">
            {selectedDetail.posture.map(p => {
              const Icon = p.status === 'critical' ? AlertTriangle : p.status === 'warning' ? AlertCircle : CheckCircle2
              const color = p.status === 'critical' ? 'text-red-500' : p.status === 'warning' ? 'text-amber-500' : 'text-green-500'
              return (
                <div key={p.label} className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
                  <span className="font-medium text-gray-800 text-sm">{p.label}</span>
                  <span className="text-gray-500 text-sm ml-auto text-right">{p.detail}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Call active indicator */}
      {isCall && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <span className="animate-pulse w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-sm font-medium text-green-700">
            Live call with {selectedAccount.contact.name} ({selectedAccount.contact.title})
          </span>
        </div>
      )}

      {/* Prompt chip — only when no agentic panel open */}
      {scene === 'account-detail' && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-700">Woodgrove Intelligence</span>
          </div>
          <button
            onClick={() => onSceneChange('market-context')}
            className="bg-white rounded-lg px-4 py-3 text-sm text-indigo-600 border border-indigo-200 cursor-pointer hover:bg-indigo-50 shadow-sm w-full text-left"
          >
            What&apos;s the market context for this mandate given today&apos;s energy shock?
          </button>
        </div>
      )}
    </div>
  )

  // ── RIGHT PANEL ─────────────────────────────────────────────────────────────

  const agentPanel = (
    <div className="w-[500px] flex flex-col h-full overflow-hidden">
      {/* Agentic panel header */}
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
            <span className="text-indigo-300 text-sm">
              {scene === 'market-context' ? 'Market Context'
                : scene === 'exposure' ? 'Exposure & IC Positioning'
                : scene === 'compliance' ? 'Compliance Guardrails'
                : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {/* Market Context */}
        {scene === 'market-context' && (
          <>
            <div className="bg-gray-100 text-gray-700 rounded-xl p-3 text-sm italic">
              "What&apos;s the market context for {selectedDetail?.name ?? selectedAccount.name} given today&apos;s energy shock?"
            </div>
            {[
              { title: 'What Changed — Energy Shock Drivers', bullets: ['Crude oil spiked following Middle East supply disruption, driving inflation expectations higher','Long-end yields repriced meaningfully (+18–22bps 10Y–30Y), increasing duration sensitivity','Credit dispersion widened across IG sectors — financials and utilities most affected','Real asset correlations under pressure as energy-driven inflation diverges from broader commodities'] },
              { title: 'Likely Client / Consultant Questions', bullets: ['"Given the energy-driven move in long rates, how might tracking error behave relative to the liability benchmark?"','"Has the oil-driven spread widening changed your view on maintaining BBB-rated financials within the mandate\'s risk budget?"','"What is the read-through from energy price volatility to the real asset allocation?"'] },
              { title: 'Liquidity & Implementation', bullets: ['Secondary market depth in longer-duration IG corporates more episodic in recent sessions','Duration adjustment may require phased execution within mandate turnover guidelines'] },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{card.title}</p>
                <ul className="space-y-2">
                  {card.bullets.map(b => <li key={b} className="text-sm text-gray-700 leading-relaxed">{b}</li>)}
                </ul>
              </div>
            ))}
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-xl py-3 font-medium transition-colors" onClick={() => onSceneChange('exposure')}>
              Exposure &amp; IC Positioning →
            </button>
          </>
        )}

        {/* Exposure */}
        {scene === 'exposure' && (
          <>
            <div className="bg-gray-100 text-gray-700 rounded-xl p-3 text-sm italic">
              "Show me exposure sensitivity and the IC&apos;s current positioning on rates and credit."
            </div>
            {[
              { title: 'Exposure Areas — Most Impacted', bullets: ['Duration band approaching review threshold under current rate conditions','Flow trend: net outflows may increase renewal pressure','IG financials concentration above IC recommendation'] },
              { title: 'Investment Committee Positioning (as of June 12, 2025)', bullets: ['Rates: IC recommends maintaining defensive duration posture given energy-driven volatility','Credit: Selective rotation within IG credit — reduce financials concentration','Alternatives: No change to alternatives allocation — pending liquidity review'] },
              { title: 'Alignment Gap', bullets: ['Current positioning overweight IG financials relative to IC recommendation','Duration band approaching review threshold under current rate conditions'] },
              { title: 'Impact Bands', bullets: ['Renewal Sensitivity: Elevated','Commercial Risk: Medium — pricing discussions more sensitive under volatility','Relationship: Medium — proactive engagement critical'] },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{card.title}</p>
                <ul className="space-y-2">
                  {card.bullets.map(b => <li key={b} className="text-sm text-gray-700 leading-relaxed">{b}</li>)}
                </ul>
              </div>
            ))}
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-xl py-3 font-medium transition-colors" onClick={() => onSceneChange('compliance')}>
              Review Compliance Guardrails →
            </button>
          </>
        )}

        {/* Compliance */}
        {scene === 'compliance' && (
          <>
            <div className="bg-gray-100 text-gray-700 rounded-xl p-3 text-sm italic">
              "What are my communications guardrails for this conversation?"
            </div>
            {[
              { border: 'border-green-400', label: 'Allowed — After Your Review', bullets: ['Factual, non-committal language referencing approved materials (Comms & Disclosures 2.1)','Pricing proposals within standard bands (Pricing Policy 3.2)','Sharing approved collateral and talking points with required disclosures'] },
              { border: 'border-amber-400', label: 'Required Disclosures', bullets: ['Sensitivity descriptions require disclaimers (Comms & Disclosures 2.3)','Template language must include standard caveats'] },
              { border: 'border-red-400', label: 'Requires Approval / Escalation', bullets: ['Commitment language or threshold exceptions (Comms & Disclosures 3.1)','Pricing outside standard bands: senior authority (Pricing Policy 3.2)','Credit exposure $5M+: Credit Officer; $25M+: Credit Committee (Credit Authority 1.4)'] },
            ].map(card => (
              <div key={card.label} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 border border-gray-100 ${card.border}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{card.label}</p>
                <ul className="space-y-2">
                  {card.bullets.map(b => <li key={b} className="text-sm text-gray-700 leading-relaxed">{b}</li>)}
                </ul>
              </div>
            ))}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 border border-gray-100 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Flagged for this call</p>
              <p className="text-sm text-gray-700">Discussion of rotating out of IG financials may require pre-clearance if it implies a firm-level sector view.</p>
              <blockquote className="mt-2 bg-white rounded-lg p-3 italic text-sm text-yellow-900 border border-yellow-200">
                "Our investment teams are currently evaluating sector positioning, and we see merit in reviewing concentration within the mandate&apos;s risk budget."
              </blockquote>
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white w-full rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2" onClick={() => onSceneChange('call-active')}>
              <Phone className="w-4 h-4" /> Connect to {selectedAccount.contact.name}
            </button>
          </>
        )}

        {/* Call active / next steps */}
        {(scene === 'call-active' || scene === 'call-next-steps') && (() => {
          const seg = CALL_SEGMENTS[callSegmentIndex]
          const intel = seg.agentIntel
          return (
            <>
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${seg.complianceStatus === 'clear' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {seg.complianceStatus === 'clear' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                Compliance: {seg.complianceStatus === 'clear' ? 'Clear' : 'Caution — pre-clearance recommended'}
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="font-semibold text-gray-900 mb-3">{intel.headline}</p>
                <ul className="space-y-2">
                  {intel.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                      {intel.type === 'next-steps' ? <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />}
                      {b}
                    </li>
                  ))}
                </ul>
                {intel.approvedFraming && (
                  <div className="mt-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4">
                    <p className="text-xs text-green-600 uppercase font-medium mb-1">Approved Framing</p>
                    <p className="italic text-green-800 text-sm">{intel.approvedFraming}</p>
                  </div>
                )}
              </div>
              {callSegmentIndex === 4 && (
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-xl py-3 font-medium transition-colors" onClick={() => onSceneChange('cowork')}>
                  Open Cowork Artifacts →
                </button>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )

  const orchestrationRail = (
    <div className="h-full overflow-y-auto flex-shrink-0 border-r border-gray-200 bg-white" style={{ width: 356 }}>
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Other Affected Accounts</p>
      </div>
      <div className="p-3 space-y-2">
        {railAccounts.map(account => {
          const approved = approvedIds.has(account.id)
          return (
            <button
              key={account.id}
              onClick={() => handleRailClick(account.id)}
              className="w-full text-left bg-gray-50 hover:bg-indigo-50 hover:ring-1 hover:ring-indigo-200 rounded-xl p-3 transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-medium text-sm text-gray-900">{account.name}</span>
                <TierBadge tier={account.tier} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                <ChannelIcon channel={account.contact.preferredChannel} />
                <span>{channelLabel(account.contact.preferredChannel)}</span>
                <span className="text-gray-300">·</span>
                <span>{account.outreach.proposedTime}</span>
              </div>
              {approved ? (
                <StatusBadge status={account.outreach.status} />
              ) : (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                  Action required
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex overflow-hidden bg-gray-50">
      {/* Left rail — other affected accounts */}
      {orchestrationRail}

      {/* Center — main account detail */}
      {leftPanel}

      {/* Right — agent panel, slides in at 350px */}
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-300 border-l border-gray-200"
        style={{ width: agentPanelActive ? 500 : 0 }}
      >
        {agentPanel}
      </div>
    </div>
  )
}
