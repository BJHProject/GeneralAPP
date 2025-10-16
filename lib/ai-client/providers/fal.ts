import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'
import { sleep } from '../retry'

export class FalProvider implements ProviderAdapter {
  name = 'fal' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[fal.ai ${requestId}] Generating with endpoint: ${config.endpoint}`)

    try {
      const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_TOKEN
      if (!hfToken) {
        throw new Error('No HF_TOKEN configured for fal.ai')
      }

      const token = hfToken as `hf_${string}`
      const submitUrl = `${config.endpoint}?_subdomain=queue`

      const payload: any = {
        prompt: request.prompt,
      }

      if (request.inputImageUrl) {
        payload.image_url = request.inputImageUrl
      }

      if (request.duration) {
        payload.duration = request.duration
      }

      console.log(`[fal.ai ${requestId}] Request payload:`, JSON.stringify(payload, null, 2))

      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[fal.ai ${requestId}] Error ${response.status}:`, errorText)

        if (response.status === 429) {
          console.error(`[fal.ai ${requestId}] Rate limit exceeded (429)`)
          return {
            success: false,
            error: 'Service is temporarily busy. Please try again in a moment.',
            code: 'QUOTA_EXCEEDED',
            provider: 'fal',
            retryable: true,
          }
        }

        console.error(`[fal.ai ${requestId}] API error: ${errorText}`)
        return {
          success: false,
          error: 'Video generation failed. Please try again.',
          code: 'PROVIDER_ERROR',
          provider: 'fal',
          retryable: false,
        }
      }

      const submitData = await response.json()
      console.log(`[fal.ai ${requestId}] Submit response:`, JSON.stringify(submitData, null, 2))

      const statusUrl = submitData.status_url || submitData.statusUrl
      if (!statusUrl) {
        throw new Error('No status_url in fal.ai response')
      }

      console.log(`[fal.ai ${requestId}] Job submitted, polling status URL...`)

      const mediaUrl = await this.pollJobStatus(statusUrl, hfToken, requestId)

      const fileName = `${request.type}/${request.userId}/${Date.now()}-${requestId}.mp4`
      const mediaResponse = await fetch(mediaUrl)
      const mediaBuffer = await mediaResponse.arrayBuffer()

      const blob = await put(fileName, mediaBuffer, {
        access: 'public',
        contentType: 'video/mp4',
      })

      console.log(`[fal.ai ${requestId}] ✓ Uploaded to Blob:`, blob.url)

      return {
        success: true,
        mediaUrl: blob.url,
        metadata: {
          provider: 'fal',
          modelId: config.id,
          requestId,
          timestamp: Date.now(),
        },
      }
    } catch (error) {
      console.error(`[fal.ai ${requestId}] Error:`, error)
      return {
        success: false,
        error: 'Video generation encountered an error. Please try again.',
        code: 'PROVIDER_ERROR',
        provider: 'fal',
        retryable: true,
      }
    }
  }

  private async pollJobStatus(statusUrl: string, token: string, requestId: string): Promise<string> {
    const maxAttempts = 90
    const pollInterval = 2000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollInterval)

      const isFalAi = statusUrl.includes('queue.fal.run') || statusUrl.includes('fal.ai')
      const headers: Record<string, string> = {}

      if (isFalAi) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const statusResponse = await fetch(statusUrl, { headers })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        console.error(`[fal.ai ${requestId}] Poll error ${statusResponse.status}:`, errorText)
        throw new Error(`Failed to poll job status: ${statusResponse.statusText}`)
      }

      const statusData = await statusResponse.json()
      console.log(`[fal.ai ${requestId}] Poll ${attempt + 1}:`, statusData.status || 'processing')

      const status = (statusData.status || statusData.state || '').toUpperCase()

      if (status === 'COMPLETED' || status === 'FINISHED' || status === 'SUCCEEDED') {
        const videoUrl =
          statusData.output?.video?.url ||
          statusData.output?.url ||
          statusData.result?.video?.url ||
          statusData.result?.url ||
          statusData.video_url ||
          statusData.videoUrl ||
          statusData.output ||
          statusData.result

        if (!videoUrl || typeof videoUrl !== 'string') {
          throw new Error('No video URL in completed job response')
        }

        return videoUrl
      }

      if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED' || statusData.error) {
        const error = statusData.error || statusData.message || 'Unknown error'
        throw new Error(`Job failed: ${error}`)
      }
    }

    throw new Error('Job polling timeout')
  }
}
