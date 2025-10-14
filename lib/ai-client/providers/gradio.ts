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

      // Gradio models expect specific parameter order based on API docs:
      // [prompt, negative_prompt, seed, randomize_seed, width, height, guidance_scale, num_inference_steps]
      const width = request.width || config.defaults?.width || 1024
      const height = request.height || config.defaults?.height || 1024
      const steps = request.steps || config.defaults?.steps || 28
      const guidance = request.guidance || config.defaults?.guidance || 7
      const seed = request.seed !== undefined ? request.seed : 0
      const randomizeSeed = request.seed === undefined || request.seed === -1

      const params = [
        request.prompt,                    // 1. prompt
        request.negativePrompt || "",      // 2. negative_prompt
        seed,                              // 3. seed
        randomizeSeed,                     // 4. randomize_seed
        width,                             // 5. width
        height,                            // 6. height
        guidance,                          // 7. guidance_scale
        steps,                             // 8. num_inference_steps
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
