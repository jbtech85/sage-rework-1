import type {
  IRMAccount,
  ContosoDetail,
  CallSegment,
  MarketEvent,
} from './irmTypes'

export const TOTAL_AUM = 7.42
export const AFFECTED_COUNT = 5

export const MARKET_EVENT: MarketEvent = {
  title: 'Energy Supply Shock',
  crudePctChange: '+16.2%',
  cause: 'Middle East supply disruption',
  timestamp: 'Today, 7:42 AM',
  impacts: [
    'Long-end yields repriced — 10Y +18bps, 30Y +22bps on energy-led inflation expectations',
    'IG spreads widened across sectors, with financials most exposed',
    'Real asset correlations elevated as energy complex drives cross-asset volatility',
    'IG liquidity episodic in long-duration paper — phased execution advised',
  ],
  asOfTimestamp: 'As of 9:15 AM EST, June 12, 2025',
}

export const ACCOUNTS: IRMAccount[] = [
  // Affected accounts
  {
    id: 'contoso-capital',
    name: 'Contoso Capital',
    tier: 1,
    aumBillions: 1.62,
    segment: 'North America',
    mandateType: 'Multi-Asset',
    renewalDays: 30,
    impactSeverity: 'elevated',
    impactReasons: [
      'Duration exposure elevated',
      'Benchmark concentration under review',
      'Renewal in 30 days',
    ],
    contact: {
      name: 'Marcus Chen',
      title: 'CIO',
      preferredChannel: 'video',
    },
    outreach: {
      proposedTime: '9:30 AM Today',
      status: 'confirmed',
    },
  },
  {
    id: 'fabrikam-pension',
    name: 'Fabrikam Pension Fund',
    tier: 2,
    aumBillions: 0.89,
    segment: 'North America',
    mandateType: 'LDI',
    renewalDays: null,
    impactSeverity: 'elevated',
    impactReasons: ['Duration sensitivity elevated'],
    contact: {
      name: 'Sarah Okonkwo',
      title: 'IC Representative',
      preferredChannel: 'phone',
    },
    outreach: {
      proposedTime: '11:00 AM Today',
      status: 'sent',
    },
  },
  {
    id: 'bellows-insurance',
    name: 'Bellows Insurance Group',
    tier: 2,
    aumBillions: 0.64,
    segment: 'North America',
    mandateType: 'Credit',
    renewalDays: null,
    impactSeverity: 'moderate',
    impactReasons: ['IG credit exposure widening'],
    contact: {
      name: 'James Bellows',
      title: 'CRO',
      preferredChannel: 'email',
    },
    outreach: {
      proposedTime: '2:00 PM Today',
      status: 'delivered',
    },
  },
  {
    id: 'northwind-asset',
    name: 'Northwind Asset Mgmt',
    tier: 2,
    aumBillions: 0.51,
    segment: 'North America',
    mandateType: 'Equity',
    renewalDays: null,
    impactSeverity: 'moderate',
    impactReasons: ['Equity drawdown exposure'],
    contact: {
      name: 'Rebecca Foley',
      title: 'Portfolio Director',
      preferredChannel: 'bloomberg',
    },
    outreach: {
      proposedTime: 'Callback link sent',
      status: 'delivered',
    },
  },
  {
    id: 'adatum-treasury',
    name: 'Adatum Group Treasury',
    tier: 3,
    aumBillions: 0.32,
    segment: 'North America',
    mandateType: 'Liquidity',
    renewalDays: null,
    impactSeverity: 'low-moderate',
    impactReasons: ['Modest liquidity risk'],
    contact: {
      name: 'David Sands',
      title: 'Treasurer',
      preferredChannel: 'sms',
    },
    outreach: {
      proposedTime: 'Tomorrow AM',
      status: 'sent',
    },
  },
  // Unaffected accounts
  {
    id: 'contoso-pension',
    name: 'Contoso Pension Trust',
    tier: 2,
    aumBillions: 0.68,
    segment: 'North America',
    mandateType: 'Pension',
    renewalDays: null,
    impactSeverity: 'minimal',
    impactReasons: [],
    contact: {
      name: 'Portfolio Manager',
      title: 'Portfolio Manager',
      preferredChannel: 'email',
    },
    outreach: {
      proposedTime: '',
      status: 'pending',
    },
  },
  {
    id: 'alpine-capital',
    name: 'Alpine Capital Partners',
    tier: 2,
    aumBillions: 0.54,
    segment: 'North America',
    mandateType: 'Equity',
    renewalDays: null,
    impactSeverity: 'minimal',
    impactReasons: [],
    contact: {
      name: 'Portfolio Manager',
      title: 'Portfolio Manager',
      preferredChannel: 'email',
    },
    outreach: {
      proposedTime: '',
      status: 'pending',
    },
  },
  {
    id: 'meridian-state',
    name: 'Meridian State Fund',
    tier: 2,
    aumBillions: 0.43,
    segment: 'North America',
    mandateType: 'Balanced',
    renewalDays: null,
    impactSeverity: 'minimal',
    impactReasons: [],
    contact: {
      name: 'Portfolio Manager',
      title: 'Portfolio Manager',
      preferredChannel: 'email',
    },
    outreach: {
      proposedTime: '',
      status: 'pending',
    },
  },
  {
    id: 'oakwood-endowment',
    name: 'Oakwood Endowment',
    tier: 2,
    aumBillions: 0.38,
    segment: 'North America',
    mandateType: 'Endowment',
    renewalDays: null,
    impactSeverity: 'minimal',
    impactReasons: [],
    contact: {
      name: 'Portfolio Manager',
      title: 'Portfolio Manager',
      preferredChannel: 'email',
    },
    outreach: {
      proposedTime: '',
      status: 'pending',
    },
  },
  {
    id: 'prospect-treasury',
    name: 'Prospect City Treasury',
    tier: 3,
    aumBillions: 0.33,
    segment: 'North America',
    mandateType: 'Liquidity',
    renewalDays: null,
    impactSeverity: 'minimal',
    impactReasons: [],
    contact: {
      name: 'Portfolio Manager',
      title: 'Portfolio Manager',
      preferredChannel: 'email',
    },
    outreach: {
      proposedTime: '',
      status: 'pending',
    },
  },
]

export const CONTOSO_DETAIL: ContosoDetail = {
  id: 'contoso-capital',
  name: 'Contoso Capital',
  tier: 1,
  aumBillions: 1.62,
  segment: 'North America',
  mandateType: 'Multi-Asset',
  benchmark: 'Custom LDI Blend',
  renewalDays: 30,
  nextReview: '30 June',
  netFlow90D: -42,
  allocation: {
    equities: 38,
    fixedIncome: 42,
    privateCredit: 8,
    realAssets: 7,
    liquidity: 5,
  },
  posture: [
    {
      label: 'Duration Sensitivity',
      status: 'warning',
      detail: 'Approaching Review Band',
    },
    {
      label: 'Issuer Concentration',
      status: 'warning',
      detail: 'Under Review',
    },
    {
      label: 'Renewal Sensitivity',
      status: 'critical',
      detail: 'Elevated — 30 days',
    },
  ],
}

export const CALL_SEGMENTS: CallSegment[] = [
  {
    id: 'opening',
    label: 'Opening',
    clientStatement:
      'Good morning, Dani. Thanks for reaching out — I saw the crude move this morning. What are we looking at on our end?',
    agentIntel: {
      type: 'tracking',
      headline: 'Call started — tracking topics',
      bullets: [
        'Market event: Energy supply shock, crude +16.2%',
        'Energy-driven inflation expectations repricing long-end rates',
        'Likely topics: duration positioning, sector concentration',
        'Compliance status: Clear',
      ],
    },
    complianceStatus: 'clear',
  },
  {
    id: 'market-context',
    label: 'Market Context',
    clientStatement:
      "The long-end repricing is what concerns me most. How does today's move affect our duration position relative to the benchmark?",
    agentIntel: {
      type: 'talking-point',
      headline: 'Talking point confirmed: Duration & rate impact',
      bullets: [
        'Long-end repricing driven by energy-led inflation expectations',
        'Contoso duration band approaching review threshold under current rate conditions',
        'Morningstar: 10Y yield +18bps, 30Y +22bps today',
        'Secondary market liquidity in long-duration IG more episodic — phased execution likely',
      ],
    },
    complianceStatus: 'clear',
  },
  {
    id: 'ic-perspective',
    label: 'IC Perspective',
    clientStatement:
      "Has the IC updated their view on financials concentration? We've been watching that cluster for a while.",
    agentIntel: {
      type: 'data-card',
      headline: 'IC positioning surfaced',
      bullets: [
        'IC recommendation: Maintain defensive duration posture',
        'Selective rotation within IG credit — reduce financials concentration',
        'Contoso IG financials: overweight vs. IC recommendation',
        'No change to alternatives allocation — pending liquidity review',
      ],
      approvedFraming:
        '"Our investment teams are currently evaluating sector positioning, and we see merit in reviewing concentration within the mandate\'s risk budget."',
    },
    complianceStatus: 'caution',
  },
  {
    id: 'approved-framing',
    label: 'Approved Framing',
    clientStatement:
      "That makes sense — I appreciate the transparency. Can you model two duration adjustment scenarios within our mandate guidelines?",
    agentIntel: {
      type: 'talking-point',
      headline: 'Compliance-approved framing confirmed',
      bullets: [
        "Approved language used: \"within the mandate's risk budget\"",
        'No commitment language employed',
        'No escalation thresholds triggered',
        'Pre-clearance status: Clear for this engagement',
      ],
    },
    complianceStatus: 'clear',
  },
  {
    id: 'next-steps',
    label: 'Next Steps',
    clientStatement:
      'Perfect. Send those scenarios before our renewal meeting and please loop in our consultant.',
    agentIntel: {
      type: 'next-steps',
      headline: 'Next Steps Captured',
      bullets: [
        'Model two duration adjustment scenarios (within mandate guidelines)',
        'Review IG financials concentration against IC recommendation',
        'Send client summary with approved framing',
        'Schedule pre-renewal review — include consultant',
      ],
    },
    complianceStatus: 'clear',
  },
]
