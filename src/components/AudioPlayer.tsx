import { useEffect, useRef, useState } from 'react'
import { Download, Pause, Play } from 'lucide-react'
import { formatTime } from '../lib/audio'
import { WaveformCanvas } from './WaveformCanvas'

type Props = {
  title: string
  subtitle: string
  source: string
  values: number[]
  variant: 'original' | 'enhanced'
  downloadName: string
}

export function AudioPlayer({ title, subtitle, source, values, variant, downloadName }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const ended = () => setPlaying(false)
    audio.addEventListener('ended', ended)
    return () => audio.removeEventListener('ended', ended)
  }, [])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      await audio.play()
      setPlaying(true)
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  const seek = (ratio: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = ratio * duration
    setCurrent(audio.currentTime)
  }

  return (
    <article className={`audio-result audio-result--${variant}`}>
      <div className="audio-result__head"><div><span>{variant === 'enhanced' ? 'AI ENHANCED' : 'SOURCE'}</span><h3>{title}</h3><p>{subtitle}</p></div>{variant === 'enhanced' ? <i>RECOMMENDED</i> : null}</div>
      <div className="audio-result__player">
        <button onClick={toggle} aria-label={playing ? `Pause ${title}` : `Play ${title}`}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
        <div className="audio-result__wave"><WaveformCanvas values={values} variant={variant} playhead={duration ? current / duration : 0} onSeek={seek} /></div>
        <span>{formatTime(current)} / {formatTime(duration)}</span>
      </div>
      <a className="audio-result__download" href={source} download={downloadName}><Download size={16} /> Download WAV</a>
      <audio ref={audioRef} src={source} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} />
    </article>
  )
}
