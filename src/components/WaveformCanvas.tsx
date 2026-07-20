import { useEffect, useRef } from 'react'

type Props = {
  values?: number[]
  progress?: number
  variant?: 'neutral' | 'original' | 'enhanced' | 'live'
  analyser?: AnalyserNode | null
  onSeek?: (ratio: number) => void
  playhead?: number
  label?: string
}

const fallback = Array.from({ length: 160 }, (_, index) => 0.18 + Math.abs(Math.sin(index * 0.41) * Math.cos(index * 0.09)) * 0.7)

export function WaveformCanvas({ values = fallback, progress = 0, variant = 'neutral', analyser, onSeek, playhead, label = 'Audio waveform' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const liveData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    const draw = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width * ratio))
      const height = Math.max(1, Math.round(rect.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      context.clearRect(0, 0, width, height)
      let samples = values
      if (analyser && liveData) {
        analyser.getByteFrequencyData(liveData)
        const stride = Math.max(1, Math.floor(liveData.length / 110))
        samples = Array.from({ length: 110 }, (_, index) => Math.max(0.07, liveData[index * stride] / 255))
      }
      const gap = 2.6 * ratio
      const barWidth = Math.max(1.35 * ratio, (width - gap * samples.length) / samples.length)
      const total = barWidth + gap
      const activeRatio = playhead ?? progress / 100
      const activeX = width * activeRatio
      samples.forEach((sample, index) => {
        const x = index * total
        if (x > width) return
        const barHeight = Math.max(3 * ratio, sample * height * 0.8)
        const y = (height - barHeight) / 2
        const isActive = x <= activeX || variant === 'live'
        if (variant === 'enhanced') context.fillStyle = isActive ? '#c8ff45' : 'rgba(200,255,69,.22)'
        else if (variant === 'original') context.fillStyle = isActive ? '#ff8c6b' : 'rgba(255,140,107,.24)'
        else if (variant === 'live') context.fillStyle = index > samples.length - 14 ? '#c8ff45' : 'rgba(200,255,69,.52)'
        else context.fillStyle = isActive ? (index % 3 === 0 ? '#ff7b63' : index % 2 === 0 ? '#c8ff45' : '#f6d85a') : 'rgba(241,239,232,.18)'
        context.beginPath()
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2)
        context.fill()
      })
      if (analyser) frameRef.current = requestAnimationFrame(draw)
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [analyser, playhead, progress, values, variant])

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return
    const rect = event.currentTarget.getBoundingClientRect()
    onSeek(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)))
  }

  return <canvas ref={canvasRef} className={`waveform waveform--${variant}${onSeek ? ' waveform--interactive' : ''}`} onClick={handleClick} aria-label={label} />
}
