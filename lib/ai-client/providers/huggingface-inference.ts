import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { put } from '@vercel/blob'

export class HuggingFaceInferenceProvider implements ProviderAdapter {
  name = 'huggingface-inference' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[HF-Inference ${requestId}] Generating with endpoint: ${config.endpoint}`)

    const tokens = [
      process.env.HUGGINGFACE_API_TOKEN,
      process.env.HUGGINGFACE_API_TOKEN_2,
      process.env.HUGGINGFACE_API_TOKEN_3,
      process.env.HUGGINGFACE_API_TOKEN_4,
    ].filter(Boolean)

    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No HuggingFace API tokens configured',
        code: 'PROVIDER_ERROR',
        provider: 'huggingface-inference',
        retryable: false,
      }
    }

    // Shuffle tokens for random starting point
    const shuffledTokens = [...tokens].sort(() => Math.random() - 0.5)
    const errors: string[] = []

    // Try each API key sequentially until one works
    for (let i = 0; i < shuffledTokens.length; i++) {
      const token = shuffledTokens[i]!
      const tokenNum = i + 1
      
      try {
        console.log(`[HF-Inference ${requestId}] Trying API key ${tokenNum}/${shuffledTokens.length}`)

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
      let payload: any
      
      if (config.useSimpleInputs) {
        // Simple format with parameters: {"inputs": "prompt", "parameters": {...}}
        const parameters: any = {}
        
        // Only add parameters if not minimal mode
        if (!config.useMinimalParams) {
          // Add dimensions if provided
          if (request.width || config.defaults?.width) {
            parameters.width = request.width || config.defaults?.width
          }
          if (request.height || config.defaults?.height) {
            parameters.height = request.height || config.defaults?.height
          }
          
          // Add other generation parameters if needed
          if (request.steps || config.defaults?.steps) {
            parameters.num_inference_steps = request.steps || config.defaults?.steps
          }
          if (request.guidance || config.defaults?.guidance) {
            parameters.guidance_scale = request.guidance || config.defaults?.guidance
          }
          if (request.seed !== undefined) {
            parameters.seed = request.seed
          }
        }
        
        payload = {
          inputs: finalPrompt,
          parameters: parameters
        }
      } else {
        // Standard format with detailed parameters
        const baseParams: any = {
          prompt: finalPrompt,
          negative_prompt: finalNegativePrompt,
          width: request.width || config.defaults?.width || 1024,
          height: request.height || config.defaults?.height || 1024,
          num_inference_steps: request.steps || config.defaults?.steps || 30,
          guidance_scale: request.guidance || config.defaults?.guidance || 6.5,
          num_images: 1,
          seed: request.seed !== undefined ? request.seed : Math.floor(Math.random() * 1000000000),
        }

        // Add LoRA configuration if specified
        if (config.loras && config.loras.length > 0) {
          baseParams.loras = config.loras
          baseParams.fuse_lora = false
        }

        // Use direct payload format for custom handlers, or wrapped format for standard endpoints
        if (config.useDirectPayload) {
          payload = baseParams
        } else {
          payload = { 
            inputs: baseParams,
            accept: "image/jpeg"
          }
        }
      }

      console.log(`[HF-Inference ${requestId}] Request payload:`, JSON.stringify(payload, null, 2))

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': config.useSimpleInputs ? 'application/json' : 'image/jpeg',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`[HF-Inference ${requestId}] API key ${tokenNum} failed (${response.status}): ${errorText.substring(0, 100)}`)
        errors.push(`Key ${tokenNum}: ${response.status} - ${errorText.substring(0, 50)}`)
        continue // Try next key
      }

      // Check if response is binary image or JSON
      const contentType = response.headers.get('content-type') || ''
      let imageBuffer: Buffer
      
      if (contentType.includes('image/png') || contentType.includes('image/jpeg')) {
        // Binary image response
        const arrayBuffer = await response.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
        console.log(`[HF-Inference ${requestId}] ✓ API key ${tokenNum} succeeded. Received binary image: ${imageBuffer.byteLength} bytes`)
      } else {
        // JSON response with base64 image
        const data = await response.json()
        console.log(`[HF-Inference ${requestId}] Response structure:`, Object.keys(data))

        let base64Image: string | undefined
        
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          base64Image = data.images[0].b64_json
        } else if (data.image) {
          base64Image = data.image
        }

        if (!base64Image) {
          throw new Error('No image in response')
        }

        imageBuffer = Buffer.from(base64Image, 'base64')
        console.log(`[HF-Inference ${requestId}] ✓ API key ${tokenNum} succeeded. Received image: ${imageBuffer.byteLength} bytes`)
      }

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
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`[HF-Inference ${requestId}] API key ${tokenNum} error: ${errorMsg}`)
        errors.push(`Key ${tokenNum}: ${errorMsg.substring(0, 50)}`)
        continue // Try next key
      }
    }

    // All keys failed - return error
    console.error(`[HF-Inference ${requestId}] All ${shuffledTokens.length} API keys failed:`, errors)
    return {
      success: false,
      error: `Image generation failed after trying all API keys. Please try again. [Debug: ${errors[errors.length - 1]}]`,
      code: 'PROVIDER_ERROR',
      provider: 'huggingface-inference',
      retryable: true,
    }
  }
}
