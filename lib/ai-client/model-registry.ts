import { ModelConfig } from './types'

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'realistic': {
    id: 'realistic',
    name: 'Realistic',
    provider: 'gradio',
    endpoint: 'aiqtech/NSFW-Real',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 20,
      guidance: 7.5,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 1,
  },

  'realistic_w': {
    id: 'realistic_w',
    name: 'Realistic W',
    provider: 'wavespeed',
    endpoint: '/api/v3/wavespeed-ai/female-human',
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
  
  'anime': {
    id: 'anime',
    name: 'Anime',
    provider: 'gradio',
    endpoint: 'dhead/waiNSFWIllustrious_v110',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 20,
      guidance: 7.5,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 1,
  },
  
  'anime_v2': {
    id: 'anime_v2',
    name: 'Anime V2',
    provider: 'gradio',
    endpoint: 'Menyu/wainsfw',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 20,
      guidance: 7.5,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 1,
  },

  'anime_v3': {
    id: 'anime_v3',
    name: 'Anime V3',
    provider: 'gradio',
    endpoint: 'Heartsync/NSFW-Uncensored-image',
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
    timeout: 90000,
    maxRetries: 1,
  },

  'neon': {
    id: 'neon',
    name: 'Neon',
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

  'preview': {
    id: 'preview',
    name: 'Preview',
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

  'preview_anime': {
    id: 'preview_anime',
    name: 'Preview Anime',
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
    provider: 'gradio',
    endpoint: 'zerogpu-aoti/wan2-2-fp8da-aoti-faster',
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
    endpoint: '/api/v3/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast',
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
    endpoint: '/api/v3/wavespeed-ai/wan-2.2/i2v-720p-ultra-fast',
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
