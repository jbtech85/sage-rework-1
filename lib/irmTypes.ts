export type IRMScene =
  | 'dashboard'
  | 'alert-expanded'
  | 'triage'
  | 'outreach'
  | 'account-detail'
  | 'market-context'
  | 'exposure'
  | 'compliance'
  | 'call-active'
  | 'call-next-steps'
  | 'cowork'
  | 'close'

export interface IRMAccount {
  id: string
  name: string
  tier: 1 | 2 | 3
  aumBillions: number
  segment: string
  mandateType: string
  renewalDays: number | null
  impactSeverity: 'elevated' | 'moderate' | 'low-moderate' | 'minimal'
  impactReasons: string[]
  contact: {
    name: string
    title: string
    preferredChannel: 'video' | 'phone' | 'email' | 'bloomberg' | 'sms'
  }
  outreach: {
    proposedTime: string
    status: 'confirmed' | 'sent' | 'delivered' | 'pending'
  }
}

export interface AccountDetail {
  id: string
  name: string
  tier: 1 | 2 | 3
  aumBillions: number
  segment: string
  mandateType: string
  benchmark: string
  renewalDays: number | null
  nextReview: string | null
  netFlow90D: number
  allocation: {
    equities: number
    fixedIncome: number
    privateCredit: number
    realAssets: number
    liquidity: number
  }
  posture: Array<{
    label: string
    status: 'ok' | 'warning' | 'critical'
    detail: string
  }>
}

/** @deprecated Use AccountDetail */
export type ContosoDetail = AccountDetail

export interface AgentIntel {
  type: 'tracking' | 'talking-point' | 'data-card' | 'next-steps'
  headline: string
  bullets: string[]
  approvedFraming?: string
}

export interface CallSegment {
  id: string
  label: string
  clientStatement: string
  agentIntel: AgentIntel
  complianceStatus: 'clear' | 'caution'
}

export interface MarketEvent {
  title: string
  crudePctChange: string
  cause: string
  timestamp: string
  impacts: string[]
  asOfTimestamp: string
}
