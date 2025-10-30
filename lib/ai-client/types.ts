export type MediaType = 'image' | 'video' | 'edited-image'

export type ProviderType = 'huggingface' | 'huggingface-inference' | 'wavespeed' | 'fal' | 'gradio'

export interface LoRA {
  id: string
  path?: string
  scale?: number
}

export interface GenerationRequest {
  type: MediaType
  prompt: string
  negativePrompt?: string
  modelId: string
  userId: string
  requestId: string
  
  width?: number
  height?: number
  steps?: number
  guidance?: number
  seed?: number
  
  loras?: LoRA[]
  
  inputImageUrl?: string
  inputImageDataUrl?: string
  
  duration?: number
  fps?: number
}

export interface GenerationResult {
  success: true
  mediaUrl: string
  metadata: {
    provider: ProviderType
    modelId: string
    requestId: string
    timestamp: number
  }
}

export interface GenerationError {
  success: false
  error: string
  code: 'QUOTA_EXCEEDED' | 'PROVIDER_ERROR' | 'TIMEOUT' | 'INVALID_INPUT' | 'NETWORK_ERROR' | 'UNKNOWN'
  provider?: ProviderType
  retryable: boolean
}

export type GenerationResponse = GenerationResult | GenerationError

export interface ModelConfig {
  id: string
  name: string
  provider: ProviderType
  endpoint: string
  type: MediaType
  
  defaults?: {
    width?: number
    height?: number
    steps?: number
    guidance?: number
    duration?: number
    fps?: number
  }
  
  allowedLoRAs?: string[]
  loras?: Array<{ name: string; scale: number }>
  
  mandatoryPrompts?: {
    positive?: string
    negative?: string
  }
  
  gradioApiName?: string  // Optional: specify custom Gradio API endpoint (default: '/infer')
  
  supportsNegativePrompt?: boolean  // Optional: specify if model supports negative prompts (default: true)
  
  useDirectPayload?: boolean  // Optional: for HF inference endpoints that expect direct parameters instead of wrapped in 'inputs' (default: false)
  
  useSimpleInputs?: boolean  // Optional: for HF inference endpoints that expect simple format {"inputs": "prompt", "parameters": {}} (default: false)
  
  useMinimalParams?: boolean  // Optional: send empty parameters object when using useSimpleInputs (default: false)
  
  pricing: {
    credits: number
  }
  
  timeout?: number
  maxRetries?: number
}

export interface ProviderAdapter {
  name: ProviderType
  
  generate(request: GenerationRequest, config: ModelConfig): Promise<GenerationResponse>
  
  supportsStreaming?: boolean
}

export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export interface AIClientConfig {
  defaultRetry?: RetryConfig
  defaultTimeout?: number
  enableLogging?: boolean
}
