import { ProviderAdapter, GenerationRequest, GenerationResponse, ModelConfig } from '../types'
import { InferenceClient } from '@huggingface/inference'
import { put } from '@vercel/blob'

export class HuggingFaceI2VProvider implements ProviderAdapter {
  name = 'huggingface-i2v' as const

  async generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse> {
    const requestId = request.requestId
    console.log(`[HF I2V ${requestId}] Generating video with model: ${config.endpoint}`)

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
      const client = new InferenceClient(token)

      if (!request.inputImageUrl) {
        throw new Error('Input image URL is required for image-to-video generation')
      }

      console.log(`[HF I2V ${requestId}] Fetching input image from:`, request.inputImageUrl)
      
      const imageResponse = await fetch(request.inputImageUrl)
      const imageBytes = await imageResponse.arrayBuffer()
      
      console.log(`[HF I2V ${requestId}] Image fetched: ${imageBytes.byteLength} bytes`)

      const params: any = {
        provider: 'fal-ai',
        model: config.endpoint,
        inputs: imageBytes,
        prompt: request.prompt,
      }

      if (request.negativePrompt) {
        params.negative_prompt = request.negativePrompt
      }

      if (request.steps) {
        params.num_inference_steps = request.steps
      }

      if (request.guidance) {
        params.guidance_scale = request.guidance
      }

      if (request.seed !== undefined) {
        params.seed = request.seed
      }

      console.log(`[HF I2V ${requestId}] Request params:`, {
        ...params,
        inputs: `<${imageBytes.byteLength} bytes>`,
      })

      const blob = await client.imageToVideo(params)
      
      console.log(`[HF I2V ${requestId}] Received video blob, size:`, blob.size)

      const videoBuffer = Buffer.from(await blob.arrayBuffer())
      const fileName = `${request.type}/${request.userId}/${Date.now()}-${requestId}.mp4`
      
      const uploadedBlob = await put(fileName, videoBuffer, {
        access: 'public',
        contentType: 'video/mp4',
      })

      console.log(`[HF I2V ${requestId}] ✓ Uploaded to Blob:`, uploadedBlob.url)

      return {
        success: true,
        mediaUrl: uploadedBlob.url,
        metadata: {
          provider: 'huggingface-i2v',
          modelId: config.id,
          requestId,
          timestamp: Date.now(),
        },
      }
    } catch (error) {
      console.error(`[HF I2V ${requestId}] Error:`, error)
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          return {
            success: false,
            error: 'Rate limit exceeded',
            code: 'QUOTA_EXCEEDED',
            provider: 'huggingface-i2v',
            retryable: true,
          }
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROVIDER_ERROR',
        provider: 'huggingface-i2v',
        retryable: true,
      }
    }
  }
}
