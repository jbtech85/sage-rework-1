'use client'

import { useState } from 'react'
import { ChevronLeft, FileText, Mail, Sparkles, CheckCircle2 } from 'lucide-react'
import { IRMScene } from '@/lib/irmTypes'

interface CoworkPanelProps {
  scene: IRMScene
  onSceneChange: (scene: IRMScene) => void
  onBack: () => void
}

export function CoworkPanel({ scene, onSceneChange, onBack }: CoworkPanelProps) {
  const [emailBody, setEmailBody] = useState(`Dear Contoso Capital Team,

Thank you for the conversation this morning regarding the impact of the energy supply disruption on your mandate.

As discussed, the overnight crude price movement has driven meaningful repricing across rate-sensitive assets and widened credit dispersion in investment-grade sectors. These developments have implications for duration positioning and sector concentration within your benchmark-aware multi-asset mandate.

Our team is modeling two duration adjustment scenarios within your mandate guidelines, and we will provide a focused analysis of financials concentration relative to the current risk budget. We will share these ahead of your next review.

In the meantime, we continue to monitor exposure positions against the mandate's parameters and will engage proactively should conditions warrant.

Please let us know if there are additional questions or areas you would like addressed ahead of the pre-renewal review.

Best regards,
Serena`)
  const [memoEditing, setMemoEditing] = useState(false)

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Account
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="text-xl font-semibold text-gray-900">Copilot Cowork</span>
            </div>
            <span className="block text-sm text-gray-500 mt-1">
              Artifacts built collaboratively during your Contoso Capital engagement
            </span>
          </div>

          <div className="bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-sm font-medium">
            2 drafts ready
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-2 gap-6">

          {/* Artifact 1 — Internal Coverage Memo */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-gray-50 rounded-t-2xl px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-indigo-500 mr-2" />
                <span className="font-semibold text-gray-900">Internal Coverage Memo</span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-full px-2 py-0.5 ml-auto">
                  Draft
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-500">Contoso Capital — Tier 1</div>
              <div className="mt-2 flex gap-2">
                <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full border border-indigo-100">Work IQ</span>
                <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full border border-purple-100">Foundry IQ</span>
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full border border-blue-100">Fabric IQ</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
              {/* Purpose */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Purpose</div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Prepare coverage record following proactive client engagement on energy supply shock impact. Document risk posture, IC alignment, messaging guardrails, and next steps ahead of 30-day mandate renewal.
                </p>
              </div>

              {/* Market Context */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Market Context</div>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700 leading-relaxed">
                  <li>Energy supply shock: crude +16.2% overnight, driving inflation expectations and rate repricing</li>
                  <li>Long-end yields repriced, increasing duration sensitivity in benchmark-aware allocations</li>
                  <li>Credit dispersion widened across IG sectors, raising concentration scrutiny</li>
                  <li>Liquidity in longer-duration IG credit has become more episodic</li>
                </ul>
              </div>

              {/* IC Alignment */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">IC Alignment</div>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700 leading-relaxed">
                  <li>IC recommends defensive duration posture and selective IG financials rotation</li>
                  <li>Current Contoso positioning diverges from IC on financials concentration</li>
                  <li>Duration band approaching review threshold</li>
                </ul>
              </div>

              {/* Decisions from Client Call */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Decisions from Client Call</div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="space-y-2">
                    {[
                      'Model two duration adjustment scenarios (within mandate guidelines)',
                      'Review IG financials concentration against IC recommendation',
                      'Send client summary with approved framing',
                      'Schedule pre-renewal review — include consultant',
                    ].map((item, i) => (
                      <div key={i} className="flex items-start text-sm text-gray-700 leading-relaxed">
                        <CheckCircle2 className="text-indigo-500 w-4 h-4 mr-2 mt-0.5 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compliance Notes */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Compliance Notes</div>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700 leading-relaxed">
                  <li>Approved language used throughout engagement</li>
                  <li>IG financials rotation discussion used pre-cleared framing</li>
                  <li>No commitment language employed; no escalation thresholds triggered</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                Edit Memo
              </button>
              <button className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm opacity-50" disabled>
                Mark Finalized
              </button>
            </div>
          </div>

          {/* Artifact 2 — Client Follow-up Email */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-gray-50 rounded-t-2xl px-6 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-indigo-500 mr-2" />
                <span className="font-semibold text-gray-900">Client Follow-up Email</span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-full px-2 py-0.5 ml-2">
                  Draft
                </span>
                <span className="text-xs text-amber-600 ml-2">Review before sending</span>
              </div>
              <div className="mt-1 text-sm text-gray-500">To: Contoso Capital Team</div>
              <div className="mt-2 flex gap-2">
                <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full border border-indigo-100">Work IQ</span>
                <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full border border-purple-100">Foundry IQ</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-5">
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700 font-medium">
                Subject: Contoso Capital — Follow-up from today's discussion
              </div>

              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className="w-full min-h-56 p-4 text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-sans"
              />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-xs text-amber-700">
                ⚠ Required disclosures will be appended before sending. Compliance review required.
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm">
                Save Draft
              </button>
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2 text-sm font-medium"
                onClick={() => {
                  if (window.confirm('Send to Contoso Capital? This will include required disclaimers.')) {
                    alert('Sent successfully')
                  }
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Scene 'close' — Book Engagement Status */}
        {scene === 'close' && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Book Engagement Status</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Contoso Capital</span>
                  <span className="bg-green-50 text-green-700 border border-green-200 text-sm rounded-full px-3 py-0.5">
                    Engaged — follow-up queued
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Fabrikam Pension Fund</span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-sm rounded-full px-3 py-0.5">
                    In progress — call at 11 AM
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Bellows Insurance</span>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-sm rounded-full px-3 py-0.5">
                    Scheduled — 2 PM call
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Northwind Asset Mgmt</span>
                  <span className="bg-gray-50 text-gray-500 border border-gray-200 text-sm rounded-full px-3 py-0.5">
                    Callback pending
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Adatum Group Treasury</span>
                  <span className="bg-gray-50 text-gray-400 border border-gray-200 text-sm rounded-full px-3 py-0.5">
                    Tomorrow AM
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
