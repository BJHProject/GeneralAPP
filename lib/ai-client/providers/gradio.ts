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

      // Add mandatory prompts if configured (like HuggingFace Inference provider)
      let finalPrompt = request.prompt
      let finalNegativePrompt = request.negativePrompt || ''

      if (config.mandatoryPrompts?.positive) {
        finalPrompt = `${config.mandatoryPrompts.positive}, ${request.prompt}`
      }

      if (config.mandatoryPrompts?.negative) {
        finalNegativePrompt = finalNegativePrompt
          ? `${config.mandatoryPrompts.negative}, ${finalNegativePrompt}`
          : config.mandatoryPrompts.negative
      }

      // Gradio models expect specific parameter order based on API docs:
      // [prompt, negative_prompt, seed, randomize_seed, width, height, guidance_scale, num_inference_steps]
      const width = request.width || config.defaults?.width || 1024
      const height = request.height || config.defaults?.height || 1024
      const steps = request.steps || config.defaults?.steps || 28
      const guidance = request.guidance || config.defaults?.guidance || 7
      
      // Generate a new random seed for each request when seed is not explicitly provided
      const seed = (request.seed === undefined || request.seed === -1)
        ? Math.floor(Math.random() * 2147483647)  // Use max int32 for better randomization
        : request.seed!
      
      const randomizeSeed = request.seed === undefined || request.seed === -1

      // Determine API endpoint and parameters based on model config
      const apiEndpoint = config.gradioApiName || '/infer'

      let params: any[]
      if (apiEndpoint === '/txt2img') {
        // New Gradio API format (DB2169/test1234)
        params = [
          finalPrompt,                       // 1. prompt
          finalNegativePrompt,               // 2. negative
          width,                             // 3. width
          height,                            // 4. height
          steps,                             // 5. steps
          guidance,                          // 6. guidance
          1,                                 // 7. images (always 1)
          seed,                              // 8. seed (already randomized if needed)
          "dpmpp_2m",                        // 9. scheduler
          [],                                // 10. loras
          0.7,                               // 11. lora_scale
          false,                             // 12. fuse_lora
        ]
      } else {
        // Original Gradio API format
        params = [
          finalPrompt,                       // 1. prompt
          finalNegativePrompt,               // 2. negative_prompt
          seed,                              // 3. seed (already randomized if needed)
          randomizeSeed,                     // 4. randomize_seed
          width,                             // 5. width
          height,                            // 6. height
          guidance,                          // 7. guidance_scale
          steps,                             // 8. num_inference_steps
        ]
      }

      console.log(`[Gradio ${requestId}] API endpoint: ${apiEndpoint}`)
      console.log(`[Gradio ${requestId}] Predict params:`, params)

      const result = await client.predict(apiEndpoint, params)
      console.log(`[Gradio ${requestId}] Raw result:`, JSON.stringify(result, null, 2))

      let imageUrl: string | undefined

      // Try multiple response format patterns
      if (result?.data) {
        console.log(`[Gradio ${requestId}] Result.data type:`, typeof result.data, 'isArray:', Array.isArray(result.data))

        if (Array.isArray(result.data) && result.data.length > 0) {
          const firstResult = result.data[0]
          console.log(`[Gradio ${requestId}] First result:`, JSON.stringify(firstResult, null, 2))

          // Format 1: Direct string URL
          if (typeof firstResult === 'string') {
            imageUrl = firstResult
          }
          // Format 2: Object with url property
          else if (firstResult && typeof firstResult === 'object' && 'url' in firstResult) {
            imageUrl = firstResult.url as string
          }
          // Format 3: Array of objects (some Gradio APIs return [[{url: ...}]])
          else if (Array.isArray(firstResult) && firstResult.length > 0) {
            const nestedResult = firstResult[0]
            if (typeof nestedResult === 'string') {
              imageUrl = nestedResult
            } else if (nestedResult && typeof nestedResult === 'object' && 'url' in nestedResult) {
              imageUrl = nestedResult.url as string
            } else if (nestedResult && typeof nestedResult === 'object' && 'image' in nestedResult) {
              // Format 4: Object with image.url property (DB2169/test1234 format)
              const imageObj = nestedResult.image as any
              if (imageObj && typeof imageObj === 'object' && 'url' in imageObj) {
                imageUrl = imageObj.url as string
              } else if (imageObj && typeof imageObj === 'object' && 'path' in imageObj) {
                const path = imageObj.path as string
                imageUrl = path.startsWith('http') ? path : `${config.endpoint}/file=${path}`
              }
            } else if (nestedResult && typeof nestedResult === 'object' && 'path' in nestedResult) {
              // Format 5: Object with path property (needs to be converted to full URL)
              const path = nestedResult.path as string
              imageUrl = path.startsWith('http') ? path : `${config.endpoint}/file=${path}`
            }
          }
          // Format 5: Object with path property
          else if (firstResult && typeof firstResult === 'object' && 'path' in firstResult) {
            const path = firstResult.path as string
            imageUrl = path.startsWith('http') ? path : `${config.endpoint}/file=${path}`
          }
        }
      }

      if (!imageUrl) {
        console.error(`[Gradio ${requestId}] Failed to extract image URL from result:`, JSON.stringify(result, null, 2))
        throw new Error(`No image URL in Gradio response. Result structure: ${JSON.stringify(result)}`)
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
        error: 'Image generation encountered an error. Please try again.',
        code: 'PROVIDER_ERROR',
        provider: 'gradio',
        retryable: true,
      }
    }
  }
}