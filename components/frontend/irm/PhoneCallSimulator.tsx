'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { CALL_SEGMENTS } from '@/lib/irmData'

interface PhoneCallSimulatorProps {
  isVisible: boolean
  callSegmentIndex: number
  onNext: () => void
  onPrev: () => void
  onEnd: () => void
}

export function PhoneCallSimulator({ isVisible, callSegmentIndex, onNext, onPrev, onEnd }: PhoneCallSimulatorProps) {
  const [seconds, setSeconds] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Play audio when segment advances
  useEffect(() => {
    if (callSegmentIndex < 0) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(`/audio/marcus-${callSegmentIndex}.mp3`)
    audioRef.current = audio
    audio.play().catch(() => {})
    return () => {
      audio.pause()
    }
  }, [callSegmentIndex])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m + ':' + String(sec).padStart(2, '0')
  }

  if (!isVisible) return null

  const segment = callSegmentIndex >= 0 ? CALL_SEGMENTS[callSegmentIndex] : null
  const total = CALL_SEGMENTS.length
  const heights = ['8px', '14px', '10px', '16px', '8px']

  return (
    <>
      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.5); opacity: 0.6; }
          50% { transform: scaleY(1.4); opacity: 1; }
        }
      `}</style>
      <div className="fixed bottom-6 left-6 z-50 w-80 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-[0_0_40px_rgba(99,102,241,0.25)]">
        {/* Header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2" />
            <span className="text-green-400 text-sm font-medium">Live Call</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-white text-sm font-mono">{formatTime(seconds)}</span>
          </div>
          <button
            onClick={onEnd}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            <PhoneOff className="w-3 h-3" />
            End
          </button>
        </div>

        {/* Caller info */}
        <div className="bg-gray-900 px-4 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              MC
            </div>
            <div>
              <div className="text-white font-semibold text-base">Marcus Chen</div>
              <div className="text-gray-400 text-sm">CIO, Contoso Capital</div>
            </div>
            <div className="ml-auto flex items-end gap-0.5 h-6">
              {heights.map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-green-400"
                  style={{
                    height: h,
                    animation: callSegmentIndex >= 0 ? `waveform 1.2s ease-in-out ${i * 0.15}s infinite` : 'none',
                    opacity: callSegmentIndex >= 0 ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Segment content — hidden until first Next press */}
        {segment ? (
          <>
            <div className="bg-gray-800 px-4 py-3">
              <div className="flex items-center">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Response</span>
                <span className="flex-1" />
                <span className="text-white text-sm font-medium">{callSegmentIndex + 1} / {total}</span>
              </div>
              <div className="text-indigo-300 text-sm mt-1">{segment.label}</div>
              <div className="flex gap-1.5 mt-2">
                {Array.from({ length: total }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= callSegmentIndex ? 'bg-indigo-400' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
            <div className="bg-gray-900 px-4 py-4">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-2">Client</div>
              <div className="text-gray-300 text-sm italic leading-relaxed">{segment.clientStatement}</div>
            </div>
          </>
        ) : (
          <div className="bg-gray-900 px-4 py-4 text-center">
            <div className="text-gray-500 text-sm">Press Next when ready for Marcus's first response</div>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-gray-800 px-4 py-3 flex gap-2">
          <button
            disabled={callSegmentIndex <= 0}
            onClick={onPrev}
            className="flex-1 py-2 px-3 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          {callSegmentIndex < total - 1 ? (
            <button
              onClick={onNext}
              className="flex-1 py-2 px-3 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex-1 py-2 px-3 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center justify-center gap-1"
            >
              Wrap Up
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
