"use client"

import { useState, useEffect } from "react"
import { Leaf, Settings, WifiOff, Wifi, LogOut, User } from "lucide-react"
import type { IRMScene } from "@/lib/irmTypes"
import { IRMDashboard } from "@/components/frontend/irm/IRMDashboard"
import { AccountDetailView } from "@/components/frontend/irm/AccountDetailView"
import { PhoneCallSimulator } from "@/components/frontend/irm/PhoneCallSimulator"
import { CoworkPanel } from "@/components/frontend/irm/CoworkPanel"
import { prefetchWorkIQContext } from "@/lib/advisorApi"

export default function IRMApp() {
  const [scene, setScene] = useState<IRMScene>('dashboard')
  const [callSegmentIndex, setCallSegmentIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isMockMode, setIsMockMode] = useState(true)
  const [swaUser, setSwaUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    prefetchWorkIQContext()

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
    if (callSegmentIndex < 4) {
      const next = callSegmentIndex + 1
      setCallSegmentIndex(next)
      if (next === 4) setScene('call-next-steps')
    } else {
      setScene('cowork')
      setCallSegmentIndex(0)
    }
  }

  const handleCallPrev = () => {
    if (callSegmentIndex > 0) {
      setCallSegmentIndex(callSegmentIndex - 1)
      setScene('call-active')
    }
  }

  const handleCallEnd = () => {
    setScene('cowork')
    setCallSegmentIndex(0)
  }

  const dashboardScenes: IRMScene[] = ['dashboard', 'alert-expanded', 'triage', 'outreach']
  const accountScenes: IRMScene[] = ['account-detail', 'market-context', 'exposure', 'compliance', 'call-active', 'call-next-steps']
  const coworkScenes: IRMScene[] = ['cowork', 'close']

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-slate-50/80 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg">
              <Leaf className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Woodgrove</h1>
              <p className="text-[11px] text-gray-400 font-medium">Institutional Relationship Manager</p>
            </div>
          </div>

          {/* Right: User indicator + Settings */}
          <div className="flex items-center gap-3">
            {/* Dani Sanchez indicator */}
            <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                DS
              </div>
              <span className="text-sm font-medium text-indigo-700">Dani Sanchez</span>
              <span className="text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5">IRM</span>
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

                    {/* API Mode */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">API Mode</span>
                        <button
                          onClick={() => setIsMockMode(!isMockMode)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isMockMode
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {isMockMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                          {isMockMode ? "Demo" : "Live"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {isMockMode ? "Using demo data" : "Connected to live API"}
                      </p>
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {dashboardScenes.includes(scene) && (
          <IRMDashboard scene={scene} onSceneChange={setScene} />
        )}
        {accountScenes.includes(scene) && (
          <AccountDetailView
            scene={scene}
            callSegmentIndex={callSegmentIndex}
            onSceneChange={setScene}
            onBack={() => setScene('outreach')}
          />
        )}
        {coworkScenes.includes(scene) && (
          <CoworkPanel
            scene={scene}
            onSceneChange={setScene}
            onBack={() => setScene('account-detail')}
          />
        )}
      </main>

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
