import { GenerationRequest, GenerationResponse, AIClientConfig, ProviderAdapter } from './types'
import { getModelConfig } from './model-registry'
import { withRetry, isRetryableError } from './retry'
import { HuggingFaceProvider } from './providers/huggingface'
import { HuggingFaceInferenceProvider } from './providers/huggingface-inference'
import { WavespeedProvider } from './providers/wavespeed'
import { FalProvider } from './providers/fal'
import { GradioProvider } from './providers/gradio'

const providers: Record<string, ProviderAdapter> = {
  huggingface: new HuggingFaceProvider(),
  'huggingface-inference': new HuggingFaceInferenceProvider(),
  wavespeed: new WavespeedProvider(),
  fal: new FalProvider(),
  gradio: new GradioProvider(),
}

export class AIClient {
  private config: AIClientConfig

  constructor(config: AIClientConfig = {}) {
    this.config = {
      defaultTimeout: 60000,
      enableLogging: true,
      ...config,
    }
  }

  async generate(request: Omit<GenerationRequest, 'requestId'>): Promise<GenerationResponse> {
    const requestId = this.generateRequestId()
    const fullRequest: GenerationRequest = {
      ...request,
      requestId,
    }

    if (this.config.enableLogging) {
      console.log(`[AIClient ${requestId}] Starting generation:`, {
        type: fullRequest.type,
        modelId: fullRequest.modelId,
        userId: fullRequest.userId,
      })
    }

    const modelConfig = getModelConfig(fullRequest.modelId)
    const provider = providers[modelConfig.provider]

    if (!provider) {
      return {
        success: false,
        error: `Unknown provider: ${modelConfig.provider}`,
        code: 'INVALID_INPUT',
        retryable: false,
      }
    }

    const maxRetries = modelConfig.maxRetries ?? this.config.defaultRetry?.maxRetries ?? 2
    const timeout = modelConfig.timeout ?? this.config.defaultTimeout ?? 60000

    try {
      const result = await withRetry(
        async () => {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Generation timeout')), timeout)
          })

          const generationPromise = provider.generate(fullRequest, modelConfig)

          return Promise.race([generationPromise, timeoutPromise])
        },
        { maxRetries },
        (error) => {
          const shouldRetry = isRetryableError(error)
          if (this.config.enableLogging) {
            console.log(`[AIClient ${requestId}] Error occurred, retryable:`, shouldRetry)
          }
          return shouldRetry
        },
      )

      if (this.config.enableLogging) {
        console.log(`[AIClient ${requestId}] Generation ${result.success ? 'succeeded' : 'failed'}`)
      }

      return result
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[AIClient ${requestId}] Fatal error:`, error)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNKNOWN',
        retryable: false,
      }
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}

export const defaultAIClient = new AIClient()

export * from './types'
export * from './model-registry'
