import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { Client } from '@gradio/client'
import { put } from '@vercel/blob'

export class GradioProvider implements ProviderAdapter {
  name = 'gradio' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[Gradio ${requestId}] Generating with space: ${config.endpoint}`)

    try {
      const tokens = [
        process.env.HUGGINGFACE_API_TOKEN,
        process.env.HUGGINGFACE_API_TOKEN_2,
        process.env.HUGGINGFACE_API_TOKEN_3,
      ].filter(Boolean)

      if (tokens.length === 0) {
        throw new Error('No HuggingFace API tokens configured')
      }

      const token = tokens[Math.floor(Math.random() * tokens.length)]! as `hf_${string}`

      console.log(`[Gradio ${requestId}] Connecting to space: ${config.endpoint}`)
      const client = await Client.connect(config.endpoint, {
        hf_token: token,
      })

      const params = [
        request.prompt,
        request.width || config.defaults?.width || 1024,
        request.height || config.defaults?.height || 1024,
        request.steps || config.defaults?.steps || 20,
        request.guidance || config.defaults?.guidance || 3.5,
        request.seed !== undefined ? request.seed : -1,
        true,
      ]

      console.log(`[Gradio ${requestId}] Predict params:`, params)

      const result = await client.predict('/infer', params)
      console.log(`[Gradio ${requestId}] Result:`, JSON.stringify(result, null, 2))

      let imageUrl: string | undefined
      if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        const firstResult = result.data[0]
        if (typeof firstResult === 'string') {
          imageUrl = firstResult
        } else if (firstResult && typeof firstResult === 'object' && 'url' in firstResult) {
          imageUrl = firstResult.url as string
        }
      }

      if (!imageUrl) {
        throw new Error('No image URL in Gradio response')
      }

      console.log(`[Gradio ${requestId}] Image URL:`, imageUrl)

      const imageResponse = await fetch(imageUrl)
      const imageBuffer = await imageResponse.arrayBuffer()

      const fileName = `${request.type}/${request.userId}/${Date.now()}-${requestId}.png`
      const blob = await put(fileName, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
      })

      console.log(`[Gradio ${requestId}] ✓ Uploaded to Blob:`, blob.url)

      return {
        success: true,
        mediaUrl: blob.url,
        metadata: {
          provider: 'gradio',
          modelId: config.id,
          requestId,
          timestamp: Date.now(),
        },
      }
    } catch (error) {
      console.error(`[Gradio ${requestId}] Error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROVIDER_ERROR',
        provider: 'gradio',
        retryable: true,
      }
    }
  }
}
