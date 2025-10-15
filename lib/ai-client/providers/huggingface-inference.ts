import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'

export class HuggingFaceInferenceProvider implements ProviderAdapter {
  name = 'huggingface-inference' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[HF-Inference ${requestId}] Generating with endpoint: ${config.endpoint}`)

    try {
      const tokens = [
        process.env.HUGGINGFACE_API_TOKEN,
        process.env.HUGGINGFACE_API_TOKEN_2,
        process.env.HUGGINGFACE_API_TOKEN_3,
      ].filter(Boolean)

      if (tokens.length === 0) {
        throw new Error('No HuggingFace API tokens configured')
      }

      const token = tokens[Math.floor(Math.random() * tokens.length)]!

      // Add mandatory prompts if configured
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

      // Build payload for HF Inference Endpoint
      const payload: any = {
        inputs: {
          prompt: finalPrompt,
          negative_prompt: finalNegativePrompt,
          width: request.width || config.defaults?.width || 1024,
          height: request.height || config.defaults?.height || 1024,
          num_inference_steps: request.steps || config.defaults?.steps || 30,
          guidance_scale: request.guidance || config.defaults?.guidance || 6.5,
          num_images: 1,
          seed: request.seed !== undefined ? request.seed : Math.floor(Math.random() * 1000000000),
        }
      }

      // Add LoRA configuration if specified
      if (config.loras && config.loras.length > 0) {
        payload.inputs.loras = config.loras
        payload.inputs.fuse_lora = false
      }

      console.log(`[HF-Inference ${requestId}] Request payload:`, JSON.stringify(payload, null, 2))

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
        console.error(`[HF-Inference ${requestId}] Error ${response.status}:`, errorText)

        if (response.status === 503) {
          return {
            success: false,
            error: 'Model is loading, please try again',
            code: 'PROVIDER_ERROR',
            provider: 'huggingface-inference',
            retryable: true,
          }
        }

        if (response.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded',
            code: 'QUOTA_EXCEEDED',
            provider: 'huggingface-inference',
            retryable: true,
          }
        }

        return {
          success: false,
          error: `HuggingFace Inference API error: ${errorText}`,
          code: 'PROVIDER_ERROR',
          provider: 'huggingface-inference',
          retryable: false,
        }
      }

      const data = await response.json()
      console.log(`[HF-Inference ${requestId}] Response structure:`, Object.keys(data))

      // Handle base64 image response
      let base64Image: string | undefined
      
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        base64Image = data.images[0].b64_json
      } else if (data.image) {
        base64Image = data.image
      }

      if (!base64Image) {
        throw new Error('No image in response')
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Image, 'base64')
      console.log(`[HF-Inference ${requestId}] Received image: ${imageBuffer.byteLength} bytes`)

      const fileName = `${request.type}/${request.userId}/${Date.now()}-${requestId}.png`
      const blob = await put(fileName, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
      })

      console.log(`[HF-Inference ${requestId}] ✓ Uploaded to Blob:`, blob.url)

      return {
        success: true,
        mediaUrl: blob.url,
        metadata: {
          provider: 'huggingface-inference',
          modelId: config.id,
          requestId,
          timestamp: Date.now(),
        },
      }
    } catch (error) {
      console.error(`[HF-Inference ${requestId}] Error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROVIDER_ERROR',
        provider: 'huggingface-inference',
        retryable: true,
      }
    }
  }
}
