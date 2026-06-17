'use client'

import { useEffect, useRef, useState } from 'react'
import {
  PhoneOff, ChevronLeft, ChevronRight,
  MicOff, VideoOff, Monitor, MoreHorizontal,
} from 'lucide-react'
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
  const [imgError, setImgError] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (callSegmentIndex < 0) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(`/audio/client-${callSegmentIndex}.mp3`)
    audioRef.current = audio
    audio.play().catch(() => {})
    return () => { audio.pause() }
  }, [callSegmentIndex])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m + ':' + String(sec).padStart(2, '0')
  }

  if (!isVisible) return null

  const segment = callSegmentIndex >= 0 ? CALL_SEGMENTS[callSegmentIndex] : null
  const total = CALL_SEGMENTS.length

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 flex flex-col gap-2">

      {/* ── ACS Video Widget ───────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#1b1b1b', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Video area — 16:9, no header bar */}
        <div className="relative" style={{ background: '#1e1e1e', aspectRatio: '16/9' }}>

          {/* Centered avatar */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {!imgError ? (
              <img
                src="/contoso_client.jpeg"
                alt="Tim de Boer"
                className="w-20 h-20 rounded-full object-cover"
                style={{ outline: '2px solid rgba(255,255,255,0.12)' }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: '#3d3d8f', outline: '2px solid rgba(255,255,255,0.12)' }}
              >
                TC
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <VideoOff className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500 text-xs">Camera is off</span>
            </div>
          </div>

          {/* Name badge — bottom-left overlay */}
          <div className="absolute bottom-2 left-2">
            <div className="rounded px-2 py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <span className="text-white text-xs font-medium">Tim de Boer</span>
            </div>
          </div>

          {/* Timer — top-right overlay */}
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1.5 rounded px-2 py-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-mono tabular-nums">{formatTime(seconds)}</span>
            </div>
          </div>
        </div>

        {/* Call controls bar */}
        <div className="flex items-center justify-center gap-1.5 px-3 py-3" style={{ background: '#2d2d2d' }}>
          <button className="p-2 rounded-full transition-colors hover:bg-white/10" title="Mute">
            <MicOff className="w-4 h-4 text-white" />
          </button>
          <button className="p-2 rounded-full transition-colors hover:bg-white/10" title="Camera off">
            <VideoOff className="w-4 h-4 text-white" />
          </button>
          <button className="p-2 rounded-full transition-colors hover:bg-white/10" title="Share screen">
            <Monitor className="w-4 h-4 text-white" />
          </button>
          <button className="p-2 rounded-full transition-colors hover:bg-white/10" title="More options">
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>
          {/* End call — icon only, ACS compact style */}
          <button
            onClick={onEnd}
            className="p-2.5 rounded-full ml-1 transition-colors hover:opacity-90"
            style={{ background: '#C4314B' }}
            title="End call"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* ── Script / Navigation Widget ──────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden shadow-xl flex flex-col"
        style={{ height: 231, background: '#1b1b1b', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Content area — fills space above nav bar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {segment ? (
            <>
              <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs uppercase tracking-wide">{segment.label}</span>
                  <span className="text-gray-600 text-xs">{callSegmentIndex + 1} / {total}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: total }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full flex-1 transition-colors"
                      style={{ background: i <= callSegmentIndex ? '#6264A7' : 'rgba(255,255,255,0.12)' }}
                    />
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 flex-1 overflow-y-auto">
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1.5">Client</div>
                <div className="text-gray-300 text-sm italic leading-relaxed">{segment.clientStatement}</div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-gray-500 text-sm text-center">Press Next when ready for Tim's first response</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            disabled={callSegmentIndex <= 0}
            onClick={onPrev}
            className="flex-1 py-2 px-3 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          {callSegmentIndex < total - 1 ? (
            <button
              onClick={onNext}
              className="flex-1 py-2 px-3 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-1"
              style={{ background: '#6264A7' }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex-1 py-2 px-3 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-1"
              style={{ background: '#107C41' }}
            >
              Wrap Up
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
