import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, Download, FileAudio, Mic, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Square, Upload } from 'lucide-react'
import { Header } from '../components/Header'
import { AudioPlayer } from '../components/AudioPlayer'
import { WaveformCanvas } from '../components/WaveformCanvas'
import { extractWaveform, formatTime, supportedRecorderMimeType } from '../lib/audio'
import { getJob, jobAudioUrl, uploadRecording, type JobStatus } from '../lib/api'

type StudioState = 'idle' | 'recording' | 'paused' | 'ready' | 'processing' | 'complete' | 'error'

const phaseCopy: Record<string, string> = {
  upload: 'Securely sending your recording',
  queued: 'Warming up the audio engine',
  normalizing: 'Preparing a full-band 48 kHz signal',
  analyzing: 'Mapping speech and room texture',
  enhancing: 'Removing noise while preserving voice',
  mastering: 'Balancing the final waveform',
  complete: 'Your quiet room is ready',
}

export function DemoPage() {
  const [studioState, setStudioState] = useState<StudioState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [recording, setRecording] = useState<Blob | null>(null)
  const [recordingName, setRecordingName] = useState('stillwave-recording.webm')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [waveform, setWaveform] = useState<number[]>([])
  const [enhancedWaveform, setEnhancedWaveform] = useState<number[]>([])
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('upload')
  const [job, setJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const clockRef = useRef({ accumulated: 0, startedAt: 0 })
  const pollGenerationRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    pollGenerationRef.current += 1
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close()
    if (timerRef.current) window.clearInterval(timerRef.current)
  }, [recordingUrl])

  const startClock = () => {
    clockRef.current.startedAt = performance.now()
    timerRef.current = window.setInterval(() => {
      setElapsed((clockRef.current.accumulated + performance.now() - clockRef.current.startedAt) / 1000)
    }, 80)
  }

  const pauseClock = () => {
    clockRef.current.accumulated += performance.now() - clockRef.current.startedAt
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    setElapsed(clockRef.current.accumulated / 1000)
  }

  const beginRecording = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('This browser does not support microphone recording. You can still upload an audio file.')
      setStudioState('error')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false })
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      audioContext.createMediaStreamSource(stream).connect(analyser)
      const mimeType = supportedRecorderMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm'
        await prepareRecording(blob, `stillwave-recording.${extension}`)
        stream.getTracks().forEach((track) => track.stop())
        await audioContext.close()
        analyserRef.current = null
      }
      recorderRef.current = recorder
      streamRef.current = stream
      analyserRef.current = analyser
      audioContextRef.current = audioContext
      clockRef.current = { accumulated: 0, startedAt: performance.now() }
      setElapsed(0)
      setStudioState('recording')
      recorder.start(250)
      startClock()
    } catch (reason) {
      const message = reason instanceof DOMException && reason.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in your browser or upload a file instead.'
        : 'The microphone could not be started. Try uploading a recording instead.'
      setError(message)
      setStudioState('error')
    }
  }

  const togglePause = () => {
    const recorder = recorderRef.current
    if (!recorder) return
    if (recorder.state === 'recording') {
      recorder.pause()
      pauseClock()
      setStudioState('paused')
    } else if (recorder.state === 'paused') {
      recorder.resume()
      startClock()
      setStudioState('recording')
    }
  }

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    if (recorder.state === 'recording') pauseClock()
    recorder.stop()
  }

  const prepareRecording = async (blob: Blob, name: string) => {
    if (blob.size > 50 * 1024 * 1024) {
      setError('That file is larger than the 50 MB studio limit.')
      setStudioState('error')
      return
    }
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    const url = URL.createObjectURL(blob)
    setRecording(blob)
    setRecordingName(name)
    setRecordingUrl(url)
    setProgress(0)
    setJob(null)
    try {
      setWaveform(await extractWaveform(blob))
      setStudioState('ready')
    } catch {
      setWaveform([])
      setStudioState('ready')
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    setError('')
    await prepareRecording(file, file.name)
  }

  const processRecording = async () => {
    if (!recording) return
    const generation = ++pollGenerationRef.current
    setError('')
    setPhase('upload')
    setProgress(1)
    setStudioState('processing')
    try {
      const accepted = await uploadRecording(recording, recordingName, setProgress)
      setJob(accepted)
      setPhase(accepted.phase)
      setProgress(Math.max(accepted.progress, 12))
      for (;;) {
        await new Promise((resolve) => window.setTimeout(resolve, 650))
        if (generation !== pollGenerationRef.current) return
        const status = await getJob(accepted.id)
        setJob(status)
        setPhase(status.phase)
        setProgress(status.progress)
        if (status.status === 'failed') throw new Error(status.error || 'Noise reduction failed for this recording.')
        if (status.status === 'complete') {
          const enhancedResponse = await fetch(jobAudioUrl(status.id, 'enhanced'))
          if (enhancedResponse.ok) {
            try { setEnhancedWaveform(await extractWaveform(await enhancedResponse.arrayBuffer())) } catch { setEnhancedWaveform(waveform.map((value) => value * 0.8)) }
          }
          setStudioState('complete')
          return
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something interrupted the processing pass.')
      setStudioState('error')
    }
  }

  const reset = () => {
    pollGenerationRef.current += 1
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    setRecording(null)
    setRecordingUrl('')
    setWaveform([])
    setEnhancedWaveform([])
    setProgress(0)
    setElapsed(0)
    setJob(null)
    setError('')
    setStudioState('idle')
  }

  return (
    <div className="demo-page">
      <Header dark />
      <main className="studio-shell">
        <div className="studio-intro">
          <a href="/" data-route><ArrowLeft size={15} /> Back to Stillwave</a>
          <span className="studio-intro__status"><i /> ENGINE READY · DEEPFILTERNET3</span>
          <h1>Let’s find the<br /><em>quiet in your voice.</em></h1>
          <p>Record something with a little real-world noise, or upload an existing take. We’ll preserve the voice and remove the room around it.</p>
        </div>

        <section className={`recorder-panel recorder-panel--${studioState}`}>
          <div className="recorder-panel__meta">
            <span>01 / INPUT</span>
            <span><ShieldCheck size={14} /> Auto-deleted after 1 hour</span>
          </div>

          {studioState === 'idle' || (studioState === 'error' && !recording) ? (
            <div className={`record-start${dragging ? ' record-start--dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0]) }}>
              <button className="record-orb" onClick={beginRecording} aria-label="Start recording"><span><Mic /></span><i /><i /><i /></button>
              <h2>Tap to start recording</h2>
              <p>Your browser will ask for microphone access.</p>
              <div className="record-divider"><span>OR</span></div>
              <button className="upload-link" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Upload an audio file</button>
              <small>WAV, MP3, M4A, OGG, or WebM · Up to 50 MB</small>
              <input ref={fileInputRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
              {error ? <div className="studio-error"><AlertCircle size={16} /> {error}</div> : null}
            </div>
          ) : null}

          {studioState === 'recording' || studioState === 'paused' ? (
            <div className="record-active">
              <div className="record-active__status"><span><i /> {studioState === 'paused' ? 'PAUSED' : 'RECORDING'}</span><b>{formatTime(elapsed)}</b><span>MIC / RAW</span></div>
              <div className="live-wave"><WaveformCanvas variant="live" analyser={studioState === 'recording' ? analyserRef.current : null} /></div>
              <div className="record-active__controls">
                <button onClick={togglePause}>{studioState === 'paused' ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}<span>{studioState === 'paused' ? 'Resume' : 'Pause'}</span></button>
                <button className="stop-button" onClick={stopRecording}><Square fill="currentColor" /><span>Finish</span></button>
              </div>
              <p>Tip: keep speaking naturally. Background sound helps the model show its work.</p>
            </div>
          ) : null}

          {studioState === 'ready' ? (
            <div className="record-ready">
              <div className="record-ready__title"><div className="file-icon"><FileAudio /></div><div><span>READY TO PROCESS</span><h2>{recordingName}</h2><p>{(recording!.size / 1024 / 1024).toFixed(1)} MB · Browser recording</p></div><button onClick={reset} aria-label="Discard recording"><RotateCcw /></button></div>
              <div className="preview-wave"><WaveformCanvas values={waveform} variant="original" progress={100} /></div>
              <audio className="native-preview" controls src={recordingUrl} />
              <button className="enhance-button" onClick={processRecording}><Sparkles size={18} /> Reduce the noise <span>AI PASS</span></button>
            </div>
          ) : null}

          {studioState === 'processing' ? (
            <div className="processing-view">
              <div className="processing-view__head"><div><span>02 / PROCESSING</span><h2>{phaseCopy[phase] || job?.message || 'Listening closely'}</h2></div><b>{Math.round(progress)}%</b></div>
              <div className="processing-wave" style={{ '--progress': `${progress}%` } as React.CSSProperties}><WaveformCanvas values={waveform} progress={progress} /></div>
              <div className="processing-scale"><span>INPUT</span><span>VOICE MAP</span><span>FILTER</span><span>MASTER</span></div>
              <div className="processing-note"><span className="spinner" /> <p>Keep this tab open. Your recording is being processed on our private CPU worker and will never be used for training.</p></div>
            </div>
          ) : null}

          {studioState === 'error' && recording ? (
            <div className="processing-error"><AlertCircle /><h2>The pass went quiet.</h2><p>{error}</p><div><button className="button button--lime" onClick={processRecording}>Try again</button><button className="button button--ghost-light" onClick={reset}>New recording</button></div></div>
          ) : null}
        </section>

        {studioState === 'complete' && job ? (
          <section className="results-section">
            <div className="results-section__head"><div><span><Check /> PASS COMPLETE</span><h2>One voice. <em>Much less room.</em></h2><p>Switch between versions and listen with headphones for the clearest comparison.</p></div><button onClick={reset}><RotateCcw size={16} /> New recording</button></div>
            <div className="result-grid">
              <AudioPlayer title="Original recording" subtitle="The untouched 48 kHz source" source={jobAudioUrl(job.id, 'original')} values={waveform} variant="original" downloadName="stillwave-original.wav" />
              <AudioPlayer title="Stillwave enhanced" subtitle="Noise reduced · voice preserved" source={jobAudioUrl(job.id, 'enhanced')} values={enhancedWaveform.length ? enhancedWaveform : waveform} variant="enhanced" downloadName="stillwave-enhanced.wav" />
            </div>
            <div className="result-note"><Sparkles /><div><b>What Stillwave changed</b><p>DeepFilterNet3 analyzed the full-band signal, suppressed non-speech textures, and retained vocal detail. No loudness normalization or artificial voice reconstruction was added.</p></div><a href={jobAudioUrl(job.id, 'enhanced')} download="stillwave-enhanced.wav"><Download size={17} /> Save enhanced WAV</a></div>
          </section>
        ) : null}

        <div className="studio-trust"><span>48 kHz full-band processing</span><span>DeepFilterNet3 open model</span><span>Private, temporary storage</span></div>
      </main>
    </div>
  )
}
