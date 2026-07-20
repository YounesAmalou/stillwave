export type JobStatus = {
  id: string
  status: 'queued' | 'processing' | 'complete' | 'failed'
  phase: string
  progress: number
  message: string
  created_at: string
  duration_seconds?: number
  error?: string
}

export function uploadRecording(file: Blob, filename: string, onProgress: (progress: number) => void): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    const body = new FormData()
    body.append('audio', file, filename)
    const request = new XMLHttpRequest()
    request.open('POST', '/api/jobs')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 12))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve(JSON.parse(request.responseText) as JobStatus)
      else reject(new Error(JSON.parse(request.responseText || '{}').detail || 'The studio could not accept this recording.'))
    }
    request.onerror = () => reject(new Error('Stillwave could not reach the processing service.'))
    request.send(body)
  })
}

export async function getJob(id: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${id}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Processing status is unavailable.')
  return response.json() as Promise<JobStatus>
}

export const jobAudioUrl = (id: string, kind: 'original' | 'enhanced') => `/api/jobs/${id}/audio/${kind}`
