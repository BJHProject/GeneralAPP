import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'
import { sleep } from '../retry'

export class HuggingFaceRouterProvider implements ProviderAdapter {
  name = 'huggingface-router' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[HF-Router ${requestId}] Generating video with endpoint: ${config.endpoint}`)

    try {
      const tokens = [
        process.env.HUGGINGFACE_API_TOKEN,
        process.env.HUGGINGFACE_API_TOKEN_2,
        process.env.HUGGINGFACE_API_TOKEN_3,
        process.env.HUGGINGFACE_API_TOKEN_4,
      ].filter(Boolean)

      if (tokens.length === 0) {
        throw new Error('No HuggingFace API tokens configured')
      }

      const token = tokens[Math.floor(Math.random() * tokens.length)]!

      // Convert image URL to base64 if needed
      let imageBase64: string
      if (request.inputImageUrl) {
        const imageResponse = await fetch(request.inputImageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        imageBase64 = Buffer.from(imageBuffer).toString('base64')
        console.log(`[HF-Router ${requestId}] Converted image to base64: ${imageBase64.length} chars`)
      } else {
        throw new Error('Image URL is required for video generation')
      }

      const payload = {
        image_url: `data:image/png;base64,${imageBase64}`,
        prompt: request.prompt,
      }

      console.log(`[HF-Router ${requestId}] Request payload (image truncated): prompt="${request.prompt}"`)

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[HF-Router ${requestId}] Error ${response.status}:`, errorText)

        if (response.status === 429) {
          return {
            success: false,
            error: 'Service is temporarily busy. Please try again in a moment.',
            code: 'QUOTA_EXCEEDED',
            provider: 'huggingface-router',
            retryable: true,
          }
        }

        return {
          success: false,
          error: `Video generation failed. Please try again. [Debug: ${errorText.substring(0, 100)}]`,
          code: 'PROVIDER_ERROR',
          provider: 'huggingface-router',
          retryable: false,
        }
      }

      const data = await response.json()
      console.log(`[HF-Router ${requestId}] Response:`, JSON.stringify(data, null, 2))

      // HuggingFace Router returns a job in the queue
      const jobId = data.id || data.job_id
      const statusUrl = data.status_url
      
      if (!jobId) {
        throw new Error('No job ID in HuggingFace Router response')
      }

      console.log(`[HF-Router ${requestId}] Job submitted: ${jobId}, polling...`)

      const videoUrl = await this.pollJobStatus(jobId, statusUrl, token, requestId)

      // Download and store the video
      const fileName = `video/${request.userId}/${Date.now()}-${requestId}.mp4`
      const videoResponse = await fetch(videoUrl)
      const videoBuffer = await videoResponse.arrayBuffer()

      const blob = await put(fileName, videoBuffer, {
        access: 'public',
        contentType: 'video/mp4',
      })

      console.log(`[HF-Router ${requestId}] ✓ Uploaded to Blob:`, blob.url)

      return {
        success: true,
        mediaUrl: blob.url,
        metadata: {
          provider: 'huggingface-router',
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
      console.error(`[HF-Router ${requestId}] CRITICAL ERROR:`, {
        message: errorMessage,
        stack: errorStack,
        error: error,
      })
      return {
        success: false,
        error: `Video generation encountered an error. Please try again. [Debug: ${errorMessage.substring(0, 200)}]`,
        code: 'PROVIDER_ERROR',
        provider: 'huggingface-router',
        retryable: true,
      }
    }
  }

  private async pollJobStatus(
    jobId: string,
    statusUrl: string | undefined,
    token: string,
    requestId: string,
  ): Promise<string> {
    const maxAttempts = 60
    const pollInterval = 3000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollInterval)

      // Use the status URL if provided, otherwise construct it
      const url = statusUrl || `https://router.huggingface.co/jobs/${jobId}`

      const statusResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!statusResponse.ok) {
        throw new Error(`Failed to poll job status: ${statusResponse.statusText}`)
      }

      const statusData = await statusResponse.json()
      const status = statusData.status
      
      console.log(`[HF-Router ${requestId}] Poll ${attempt + 1}: ${status}`)

      if (status === 'completed' || status === 'succeeded') {
        const videoUrl = statusData.output?.video || statusData.video || statusData.output
        
        if (!videoUrl) {
          throw new Error('No video URL in completed job')
        }
        
        console.log(`[HF-Router ${requestId}] ✓ Job completed, video URL: ${videoUrl.substring(0, 80)}...`)
        return videoUrl
      }

      if (status === 'failed' || status === 'error') {
        const error = statusData.error || 'Unknown error'
        throw new Error(`Job failed: ${error}`)
      }
    }

    throw new Error('Job polling timeout')
  }
}
