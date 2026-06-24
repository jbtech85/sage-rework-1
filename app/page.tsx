"use client"

import { useState, useEffect } from "react"
import { Settings, LogOut, User, X } from "lucide-react"
import type { IRMScene } from "@/lib/irmTypes"
import { IRMDashboard } from "@/components/frontend/irm/IRMDashboard"
import { ClientDashboard } from "@/components/frontend/client/ClientDashboard"
import { OrchestrationView } from "@/components/frontend/irm/OrchestrationView"
import { PhoneCallSimulator } from "@/components/frontend/irm/PhoneCallSimulator"
import { CoworkPanel } from "@/components/frontend/irm/CoworkPanel"
import { MOCK_ADVISOR } from "@/lib/advisorApi"
import { SageFloatingButton } from "@/components/frontend/shared/SageChatPane"
import { AdvisorChatView } from "@/components/frontend/advisor/AdvisorChatView"

export default function IRMApp() {
  const [persona, setPersona] = useState<'serena' | 'client'>('serena')
  const [scene, setScene] = useState<IRMScene>('dashboard')
  const [callSegmentIndex, setCallSegmentIndex] = useState(-1)
  const [showSettings, setShowSettings] = useState(false)
  const [swaUser, setSwaUser] = useState<{ name: string; email: string } | null>(null)
  const [isChatPaneOpen, setIsChatPaneOpen] = useState(false)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [activeAccountId, setActiveAccountId] = useState('contoso-capital')

  useEffect(() => {
    // Fetch signed-in user from Easy Auth (works for App Service and SWA)
    fetch('/.auth/me')
      .then(r => r.json())
      .then(data => {
        // App Service Easy Auth: returns an array of provider objects
        if (Array.isArray(data) && data[0]) {
          const provider = data[0]
          const claims: { typ: string; val: string }[] = provider.user_claims || []
          const name = claims.find(c => c.typ === 'name')?.val
          const email = provider.user_id || claims.find(c => c.typ === 'preferred_username')?.val
          if (name || email) setSwaUser({ name: name || email || '', email: email || '' })
        }
        // SWA Easy Auth: returns { clientPrincipal: { ... } }
        else if (data?.clientPrincipal) {
          const claims: { typ: string; val: string }[] = data.clientPrincipal.claims || []
          const name = claims.find(c => c.typ === 'name')?.val
          const email = data.clientPrincipal.userDetails
          if (name || email) setSwaUser({ name: name || email || '', email: email || '' })
        }
      })
      .catch(() => {}) // Local dev or unauthenticated — silently ignore
  }, [])

  const handleCallNext = () => {
    const next = callSegmentIndex + 1
    if (next < 5) {
      setCallSegmentIndex(next)
      if (next === 4) setScene('call-next-steps')
    } else {
      setScene('account-detail')
      setCallSegmentIndex(-1)
    }
  }

  const handleCallPrev = () => {
    if (callSegmentIndex > 0) {
      setCallSegmentIndex(callSegmentIndex - 1)
      setScene('call-active')
    }
  }

  const handleCallEnd = () => {
    setScene('account-detail')
    setCallSegmentIndex(-1)
  }

  const dashboardScenes: IRMScene[] = ['dashboard', 'alert-expanded', 'triage', 'outreach']
  const accountScenes: IRMScene[] = ['account-detail', 'market-context', 'exposure', 'compliance', 'call-active', 'call-next-steps']
  const coworkScenes: IRMScene[] = ['cowork', 'close']

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-slate-50/80 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Logo + Title — links to home (full reload resets demo state) */}
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/Woodgrove-FSI-Logo.png" alt="Woodgrove" className="w-12 h-12" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Woodgrove Financial</h1>
              <p className="text-[11px] text-gray-400 font-medium">Institutional Relationship Manager</p>
            </div>
          </a>

          {/* Right: User indicator + Settings */}
          <div className="flex items-center gap-3">
            {/* Active persona indicator */}
            <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {persona === 'serena' ? 'SR' : 'TB'}
              </div>
              <span className="text-sm font-medium text-indigo-700">
                {persona === 'serena' ? 'Serena Ribeiro' : 'Tim de Boer'}
              </span>
              <span className="text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5">
                {persona === 'serena' ? 'IRM' : 'CIO'}
              </span>
            </div>

            {/* Settings dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>

              {showSettings && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSettings(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                    {/* Signed-in user */}
                    {swaUser && (
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{swaUser.name}</p>
                          <p className="text-xs text-gray-400 truncate">{swaUser.email}</p>
                        </div>
                      </div>
                    )}

                    {/* Persona switcher */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-2">Switch Persona</p>
                      <div className="flex gap-2">
                        {([
                          { id: 'serena', name: 'Serena Ribeiro', initials: 'SR', role: 'IRM' },
                          { id: 'client', name: 'Tim de Boer', initials: 'TB', role: 'CIO' },
                        ] as const).map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setPersona(p.id); setShowSettings(false) }}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-colors text-center ${
                              persona === p.id
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center ${persona === p.id ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                              {p.initials}
                            </div>
                            <span className="text-xs font-medium leading-tight">{p.name}</span>
                            <span className="text-[10px] opacity-60">{p.role}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sign out */}
                    <div className="px-2 py-2">
                      <a
                        href="/.auth/logout"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content + Agent Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {persona === 'client' && <ClientDashboard />}
          {persona === 'serena' && dashboardScenes.includes(scene) && (
            <IRMDashboard
              scene={scene}
              onSceneChange={setScene}
              approvedIds={approvedIds}
              onApprove={(id) => setApprovedIds(prev => new Set([...prev, id]))}
              onSelectAccount={(id) => setActiveAccountId(id)}
            />
          )}
          {persona === 'serena' && accountScenes.includes(scene) && (
            <OrchestrationView
              scene={scene}
              initialAccountId={activeAccountId}
              approvedIds={approvedIds}
              onApprove={(id) => setApprovedIds(prev => new Set([...prev, id]))}
              onSceneChange={setScene}
              onBack={() => setScene('triage')}
            />
          )}
          {persona === 'serena' && coworkScenes.includes(scene) && (
            <CoworkPanel
              scene={scene}
              onSceneChange={setScene}
              onBack={() => setScene('account-detail')}
            />
          )}
        </main>

        {/* Agent sidebar — slides in at 350px, shrinks main */}
        <div
          className="flex-shrink-0 overflow-hidden transition-all duration-300 border-l border-gray-100"
          style={{ width: isChatPaneOpen ? 500 : 0 }}
        >
          <div className="w-[500px] h-full flex flex-col">
            <div className="bg-indigo-900 text-white px-4 py-3 flex items-center gap-2 flex-shrink-0">
              <img src="/Woodgrove-FSI-Logo-Light.png" alt="Woodgrove" className="w-6 h-6" />
              <span className="text-sm font-semibold">Woodgrove AI</span>
              <div className="ml-auto flex items-center gap-3">
                {(scene === 'call-active' || scene === 'call-next-steps') && (
                  <div className="flex items-center gap-1.5">
                    <span className="animate-pulse w-2 h-2 rounded-full bg-green-400 inline-block" />
                    <span className="text-sm font-medium text-green-300">Live Call Assist</span>
                  </div>
                )}
                <button
                  onClick={() => setIsChatPaneOpen(false)}
                  className="text-indigo-300 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <AdvisorChatView
                advisor={MOCK_ADVISOR}
                embedded
                scene={scene}
                callSegmentIndex={callSegmentIndex}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat button — hidden while sidebar is open */}
      {!isChatPaneOpen && (
        <SageFloatingButton
          onClick={() => setIsChatPaneOpen(true)}
          variant="advisor"
        />
      )}

      {/* Phone Call Simulator */}
      <PhoneCallSimulator
        isVisible={scene === 'call-active' || scene === 'call-next-steps'}
        callSegmentIndex={callSegmentIndex}
        onNext={handleCallNext}
        onPrev={handleCallPrev}
        onEnd={handleCallEnd}
      />
    </div>
  )
}
