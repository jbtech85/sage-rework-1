"use client"

import { useEffect, useRef } from "react"

interface VegaChartProps {
  spec: Record<string, any>
  className?: string
}

export const VegaChart: React.FC<VegaChartProps> = ({ spec, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract title so we can render it with CSS wrapping instead of Vega's truncation
  const title = typeof spec.title === "string" ? spec.title : undefined
  const specWithoutTitle = title ? { ...spec, title: undefined } : spec

  useEffect(() => {
    if (!containerRef.current) return
    let view: any = null

    const render = async () => {
      try {
        const vegaEmbed = (await import("vega-embed")).default
        const result = await vegaEmbed(containerRef.current!, specWithoutTitle, {
          actions: false,
          padding: { top: 5, right: 10, bottom: 50, left: 10 },
          config: {
            background: "transparent",
            view: { stroke: "transparent" },
            axis: {
              labelColor: "#6b7280",
              titleColor: "#6b7280",
              gridColor: "#e5e7eb",
              domainColor: "#e5e7eb",
            },
            legend: {
              labelColor: "#6b7280",
              titleColor: "#6b7280",
            },
          },
        })
        view = result.view
      } catch (err) {
        console.error("VegaChart render error:", err)
      }
    }

    render()

    return () => {
      view?.finalize()
    }
  }, [spec])

  return (
    <div className={className}>
      {title && (
        <p className="text-sm font-semibold text-gray-800 mb-2 leading-snug">{title}</p>
      )}
      <div ref={containerRef} style={{ width: "100%", height: 280 }} />
    </div>
  )
}
