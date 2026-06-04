"use client"

import { useEffect, useRef } from "react"

interface VegaChartProps {
  spec: object
  className?: string
}

export const VegaChart: React.FC<VegaChartProps> = ({ spec, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let view: any = null

    const render = async () => {
      try {
        const vegaEmbed = (await import("vega-embed")).default
        const result = await vegaEmbed(containerRef.current!, spec, {
          actions: false,
          theme: "ggplot2",
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
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: 300 }}
    />
  )
}
