'use client'

import type { IRMScene } from '@/lib/irmTypes'
import { ACCOUNTS, MARKET_EVENT } from '@/lib/irmData'
import {
  AlertTriangle,
  TrendingUp,
  Activity,
  Layers,
  Droplets,
  Video,
  Phone,
  Mail,
  BarChart2,
  Smartphone,
  ChevronRight,
} from 'lucide-react'

interface IRMDashboardProps {
  scene: IRMScene
  onSceneChange: (scene: IRMScene) => void
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

function GreetingRow() {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Good morning, Dani — Accounts Overview
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

function AccountsGrid() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {ACCOUNTS.map((account) => (
        <div
          key={account.id}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{account.name}</span>
            <TierBadge tier={account.tier} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {formatAUM(account.aumBillions)}
            </span>
            <span className="text-sm text-gray-500">{account.mandateType}</span>
          </div>
        </div>
      ))}
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

function SceneDashboard({
  onSceneChange,
}: {
  onSceneChange: (scene: IRMScene) => void
}) {
  return (
    <>
      <div
        className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-4 cursor-pointer"
        onClick={() => onSceneChange('alert-expanded')}
      >
        <div className="animate-pulse w-1 h-12 bg-amber-400 rounded-full" />
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <div className="font-semibold text-amber-900">
              {MARKET_EVENT.title}
            </div>
            <div className="text-sm text-amber-700">
              Crude {MARKET_EVENT.crudePctChange} overnight — {MARKET_EVENT.cause}
            </div>
          </div>
        </div>
        <span className="text-sm font-medium text-indigo-600 whitespace-nowrap">
          Review Impact →
        </span>
      </div>
      <AccountsGrid />
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

      <AccountsGrid />
    </>
  )
}

function SceneTriage({
  onSceneChange,
}: {
  onSceneChange: (scene: IRMScene) => void
}) {
  return (
    <>
      <CollapsedAlertPill onSceneChange={onSceneChange} />

      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900">
          Book-Wide Triage
        </h2>
        <span className="text-sm text-gray-500">
          5 of 10 accounts materially affected
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Left: Affected */}
        <div>
          <div className="bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm font-medium mb-3">
            Affected Accounts (5)
          </div>
          {affectedAccounts.map((account, index) => {
            const isContoso = account.id === 'contoso-capital'
            return (
              <div
                key={account.id}
                className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-3 cursor-pointer ${
                  isContoso ? 'ring-2 ring-indigo-300 bg-indigo-50/30' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {account.name}
                  </span>
                  <TierBadge tier={account.tier} />
                  <span className="ml-auto text-sm font-medium text-gray-700">
                    {formatAUM(account.aumBillions)}
                  </span>
                  <SeverityBadge severity={account.impactSeverity} />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {account.impactReasons.map((reason) => (
                    <span
                      key={reason}
                      className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          <button
            className="bg-indigo-600 text-white rounded-xl px-6 py-3 w-full font-medium mt-2 hover:bg-indigo-700 transition-colors"
            onClick={() => onSceneChange('outreach')}
          >
            Plan Outreach →
          </button>
        </div>

        {/* Right: Minimal */}
        <div>
          <div className="bg-gray-100 text-gray-500 rounded-lg px-3 py-2 text-sm font-medium mb-3">
            Minimal Impact (5)
          </div>
          {minimalAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-2 opacity-60"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {account.name}
                </span>
                <TierBadge tier={account.tier} />
                <span className="ml-auto text-sm text-gray-500">
                  {formatAUM(account.aumBillions)}
                </span>
              </div>
            </div>
          ))}
          <p className="text-sm text-gray-400 mt-4 italic">
            No action required today
          </p>
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

export function IRMDashboard({ scene, onSceneChange }: IRMDashboardProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <GreetingRow />

        {scene === 'dashboard' && (
          <SceneDashboard onSceneChange={onSceneChange} />
        )}

        {scene === 'alert-expanded' && (
          <SceneAlertExpanded onSceneChange={onSceneChange} />
        )}

        {scene === 'triage' && (
          <SceneTriage onSceneChange={onSceneChange} />
        )}

        {scene === 'outreach' && (
          <SceneOutreach onSceneChange={onSceneChange} />
        )}
      </div>
    </div>
  )
}
