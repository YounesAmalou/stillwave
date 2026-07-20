const bars = [18, 31, 47, 24, 58, 78, 36, 64, 92, 45, 72, 30, 57, 84, 40, 68, 96, 52, 75, 27, 61, 88, 44, 70, 34, 82, 55, 73, 39, 64, 48, 86, 59, 76, 29, 67, 43, 79, 51, 90, 38, 62, 46, 72, 32, 58, 42, 69]

export function WaveBand({ className = '' }: { className?: string }) {
  return (
    <div className={`wave-band ${className}`} aria-hidden="true">
      {bars.map((height, index) => (
        <i key={index} style={{ height: `${height}%`, animationDelay: `${index * -37}ms` }} />
      ))}
    </div>
  )
}
