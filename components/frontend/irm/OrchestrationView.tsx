'use client'

import { useState } from 'react'
import {
  ChevronLeft, PieChart, Activity, TrendingDown, TrendingUp,
  Clock, AlertCircle, AlertTriangle, CheckCircle2,
  Phone, Video, Mail, BarChart2, Smartphone,
} from 'lucide-react'
import type { IRMScene } from '@/lib/irmTypes'
import { ACCOUNTS, ACCOUNT_DETAILS } from '@/lib/irmData'

interface OrchestrationViewProps {
  scene: IRMScene
  initialAccountId: string
  approvedIds: Set<string>
  onApprove: (id: string) => void
  onSceneChange: (scene: IRMScene) => void
  onBack: () => void
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
}: OrchestrationViewProps) {
  const [selectedId, setSelectedId] = useState(initialAccountId)

  const affectedAccounts = ACCOUNTS.filter(a => a.impactSeverity !== 'minimal')
  const selectedAccount = ACCOUNTS.find(a => a.id === selectedId)!
  const selectedDetail = ACCOUNT_DETAILS[selectedId]
  const railAccounts = affectedAccounts.filter(a => a.id !== selectedId)

  const isApproved = approvedIds.has(selectedId)
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

    </div>
  )
}
