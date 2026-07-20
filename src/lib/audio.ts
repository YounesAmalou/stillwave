export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export async function extractWaveform(source: Blob | ArrayBuffer, samples = 160): Promise<number[]> {
  const arrayBuffer = source instanceof Blob ? await source.arrayBuffer() : source
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0))
    const data = buffer.getChannelData(0)
    const block = Math.max(1, Math.floor(data.length / samples))
    const values = Array.from({ length: samples }, (_, index) => {
      let peak = 0
      const start = index * block
      const end = Math.min(start + block, data.length)
      for (let cursor = start; cursor < end; cursor += 1) peak = Math.max(peak, Math.abs(data[cursor]))
      return peak
    })
    const max = Math.max(...values, 0.01)
    return values.map((value) => Math.max(0.08, value / max))
  } finally {
    await context.close()
  }
}

export function supportedRecorderMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}
