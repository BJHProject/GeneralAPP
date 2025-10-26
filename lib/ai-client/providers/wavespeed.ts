import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'
import { sleep } from '../retry'

export class WavespeedProvider implements ProviderAdapter {
  name = 'wavespeed' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[Wavespeed ${requestId}] Generating with endpoint: ${config.endpoint}`)

    try {
      const tokens = [
        process.env.WAVESPEED_API_KEY,
        process.env.WAVESPEED_API_TOKEN,
        process.env.WAVESPEED_API_TOKEN_2,
        process.env.WAVESPEED_API_TOKEN_3,
      ].filter(Boolean)

      if (tokens.length === 0) {
        throw new Error('No Wavespeed API tokens configured')
      }

      const token = tokens[Math.floor(Math.random() * tokens.length)]!
      const baseUrl = 'https://api.wavespeed.ai'
      const url = `${baseUrl}${config.endpoint}`

      let payload: any
      const isFemaleHumanEndpoint = config.endpoint.includes('female-human')

      if (request.type === 'edited-image') {
        payload = {
          enable_base64_output: false,
          enable_sync_mode: false,
          images: [request.inputImageUrl],
          prompt: request.prompt,
          size: '1024x1024',
        }
      } else if (isFemaleHumanEndpoint) {
        // Female-human endpoint (Realistic W) uses different format
        const width = request.width || 1024
        const height = request.height || 1024
        
        payload = {
          enable_base64_output: false,
          enable_sync_mode: false,
          output_format: 'jpeg',
          prompt: request.prompt,
          seed: request.seed !== undefined && request.seed !== -1 ? request.seed : -1,
          size: `${width}*${height}`,
        }
      } else {
        payload = {
          prompt: request.prompt,
        }

        if (request.negativePrompt) payload.negative_prompt = request.negativePrompt
        if (request.width) payload.width = request.width
        if (request.height) payload.height = request.height
        if (request.steps) payload.num_inference_steps = request.steps
        
        if (request.guidance) {
          payload.guidance_scale = request.guidance
        }
        
        payload.seed = request.seed !== undefined ? request.seed : Math.floor(Math.random() * 1000000000)

        if (request.type === 'video' && request.inputImageUrl) {
          payload.image_url = request.inputImageUrl
        }
      }

      console.log(`[Wavespeed ${requestId}] Request payload:`, JSON.stringify(payload, null, 2))

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Wavespeed ${requestId}] Error ${response.status}:`, errorText)

        if (response.status === 429) {
          console.error(`[Wavespeed ${requestId}] Rate limit exceeded (429)`)
          return {
            success: false,
            error: 'Service is temporarily busy. Please try again in a moment.',
            code: 'QUOTA_EXCEEDED',
            provider: 'wavespeed',
            retryable: true,
          }
        }

        console.error(`[Wavespeed ${requestId}] API error: ${errorText}`)
        return {
          success: false,
          error: `Generation failed. Please try again. [Debug: ${errorText.substring(0, 100)}]`,
          code: 'PROVIDER_ERROR',
          provider: 'wavespeed',
          retryable: false,
        }
      }

      const data = await response.json()
      console.log(`[Wavespeed ${requestId}] Response:`, JSON.stringify(data, null, 2))

      const jobId = data.job_id || data.data?.id || data.request_id || data.requestId || data.id || data.task_id
      if (!jobId) {
        throw new Error('No job_id in Wavespeed response')
      }

      console.log(`[Wavespeed ${requestId}] Job submitted: ${jobId}, polling...`)

      const mediaUrl = await this.pollJobStatus(jobId, token, requestId, baseUrl, request.type, isFemaleHumanEndpoint)

      const fileName = `${request.type}/${request.userId}/${Date.now()}-${requestId}.${config.type === 'video' ? 'mp4' : 'png'}`
      const mediaResponse = await fetch(mediaUrl)
      const mediaBuffer = await mediaResponse.arrayBuffer()

      const blob = await put(fileName, mediaBuffer, {
        access: 'public',
        contentType: config.type === 'video' ? 'video/mp4' : 'image/png',
      })

      console.log(`[Wavespeed ${requestId}] ✓ Uploaded to Blob:`, blob.url)

      return {
        success: true,
        mediaUrl: blob.url,
        metadata: {
          provider: 'wavespeed',
          modelId: config.id,
          requestId,
          timestamp: Date.now(),
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error))
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[Wavespeed ${requestId}] CRITICAL ERROR:`, {
        message: errorMessage,
        stack: errorStack,
        error: error,
      })
      return {
        success: false,
        error: `Generation encountered an error. Please try again. [Debug: ${errorMessage.substring(0, 200)}]`,
        code: 'PROVIDER_ERROR',
        provider: 'wavespeed',
        retryable: true,
      }
    }
  }

  private async pollJobStatus(
    jobId: string,
    token: string,
    requestId: string,
    baseUrl: string,
    mediaType: 'image' | 'video' | 'edited-image',
    isFemaleHumanEndpoint: boolean = false,
  ): Promise<string> {
    const maxAttempts = 60
    const pollInterval = 2000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollInterval)

      // Use different polling endpoints based on the model
      let statusUrl: string
      if (mediaType === 'edited-image' || isFemaleHumanEndpoint) {
        statusUrl = `${baseUrl}/api/v3/predictions/${jobId}/result`
      } else {
        statusUrl = `${baseUrl}/api/v3/wavespeed-ai/job/${jobId}`
      }
      
      const statusResponse = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!statusResponse.ok) {
        throw new Error(`Failed to poll job status: ${statusResponse.statusText}`)
      }

      const statusData = await statusResponse.json()
      const status = statusData.data?.status || statusData.status
      const outputs = statusData.data?.outputs || statusData.outputs || statusData.output
      
      console.log(`[Wavespeed ${requestId}] Poll ${attempt + 1}: ${status}`)

      if (status === 'completed' || status === 'succeeded') {
        let mediaUrl: string | undefined
        
        if (mediaType === 'edited-image' || isFemaleHumanEndpoint) {
          // For edited-image and female-human endpoints, outputs is an array
          if (Array.isArray(outputs) && outputs.length > 0) {
            mediaUrl = outputs[0]
          } else if (outputs && !Array.isArray(outputs)) {
            mediaUrl = outputs
          }
        } else {
          mediaUrl = mediaType === 'video' ? statusData.video_url : statusData.image_url
        }
        
        if (!mediaUrl) {
          throw new Error(`No ${mediaType === 'video' ? 'video' : 'image'} URL in completed job`)
        }
        return mediaUrl
      }

      if (status === 'failed' || status === 'error') {
        const error = statusData.data?.error || statusData.error || 'Unknown error'
        throw new Error(`Job failed: ${error}`)
      }
    }

    throw new Error('Job polling timeout')
  }
}
