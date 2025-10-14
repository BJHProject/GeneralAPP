import { ModelConfig } from './types'

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'flux-dev': {
    id: 'flux-dev',
    name: 'Flux Dev',
    provider: 'huggingface',
    endpoint: 'black-forest-labs/FLUX.1-dev',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 30,
      guidance: 7.5,
    },
    pricing: {
      credits: 500,
    },
    timeout: 60000,
    maxRetries: 2,
  },
  
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    provider: 'huggingface',
    endpoint: 'black-forest-labs/FLUX.1-schnell',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 4,
    },
    pricing: {
      credits: 500,
    },
    timeout: 30000,
    maxRetries: 2,
  },
  
  'wavespeed-flux': {
    id: 'wavespeed-flux',
    name: 'Wavespeed Flux',
    provider: 'wavespeed',
    endpoint: '/api/v3/wavespeed-ai/flux-1.1-pro',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
    },
    pricing: {
      credits: 500,
    },
    timeout: 45000,
    maxRetries: 2,
  },
  
  'gradio-nsfw-real': {
    id: 'gradio-nsfw-real',
    name: 'NSFW Real',
    provider: 'gradio',
    endpoint: 'aiqtech/NSFW-Real',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 20,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 1,
  },

  'anime-new': {
    id: 'anime-new',
    name: 'Anime New',
    provider: 'gradio',
    endpoint: 'Heartsync/NSFW-Uncensored-image',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 28,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 1,
  },
  
  'wavespeed-edit': {
    id: 'wavespeed-edit',
    name: 'Wavespeed Edit',
    provider: 'wavespeed',
    endpoint: '/api/v3/bytedance/seedream-v4/edit',
    type: 'edited-image',
    pricing: {
      credits: 1000,
    },
    timeout: 60000,
    maxRetries: 2,
  },
  
  'video-lovely': {
    id: 'video-lovely',
    name: 'Lovely (3s)',
    provider: 'huggingface',
    endpoint: 'aiqtech/lovely-video',
    type: 'video',
    defaults: {
      duration: 3,
    },
    pricing: {
      credits: 2000,
    },
    timeout: 120000,
    maxRetries: 1,
  },
  
  'video-express': {
    id: 'video-express',
    name: 'Express (3s)',
    provider: 'wavespeed',
    endpoint: '/api/v3/wavespeed-ai/video-express',
    type: 'video',
    defaults: {
      duration: 3,
    },
    pricing: {
      credits: 2000,
    },
    timeout: 90000,
    maxRetries: 2,
  },
  
  'video-express-hd': {
    id: 'video-express-hd',
    name: 'Express HD (5s)',
    provider: 'wavespeed',
    endpoint: '/api/v3/wavespeed-ai/video-express-hd',
    type: 'video',
    defaults: {
      duration: 5,
    },
    pricing: {
      credits: 3000,
    },
    timeout: 120000,
    maxRetries: 2,
  },
  
  'video-elite': {
    id: 'video-elite',
    name: 'Elite (5s)',
    provider: 'fal',
    endpoint: 'https://router.huggingface.co/fal-ai/fal-ai/wan/v2.2-a14b/image-to-video',
    type: 'video',
    defaults: {
      duration: 5,
    },
    pricing: {
      credits: 3000,
    },
    timeout: 180000,
    maxRetries: 1,
  },

  'video-wan-ai': {
    id: 'video-wan-ai',
    name: 'Wan AI 2.2 (5s)',
    provider: 'huggingface-i2v',
    endpoint: 'Wan-AI/Wan2.2-I2V-A14B',
    type: 'video',
    defaults: {
      duration: 5,
      steps: 16,
      guidance: 3.0,
    },
    pricing: {
      credits: 3000,
    },
    timeout: 180000,
    maxRetries: 2,
  },
}

export function getModelConfig(modelId: string): ModelConfig {
  const config = MODEL_REGISTRY[modelId]
  if (!config) {
    throw new Error(`Unknown model ID: ${modelId}`)
  }
  return config
}

export function getModelsByType(type: ModelConfig['type']): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter(model => model.type === type)
}

export function getModelPrice(modelId: string): number {
  return getModelConfig(modelId).pricing.credits
}
