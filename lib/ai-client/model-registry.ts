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
      steps: 28,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
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
    supportsNegativePrompt: false,
    pricing: {
      credits: 500,
    },
    timeout: 45000,
    maxRetries: 5,
  },

  'realistic_v2': {
    id: 'realistic_v2',
    name: 'Realistic V2',
    provider: 'huggingface-inference',
    endpoint: 'https://jczopg9f2r7erqtf.us-east-1.aws.endpoints.huggingface.cloud',
    type: 'image',
    useSimpleInputs: true,
    defaults: {
      width: 1024,
      height: 1024,
      steps: 40,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
  },

  'realistic_s': {
    id: 'realistic_s',
    name: 'Realistic S',
    provider: 'gradio',
    endpoint: 'DB2169/test1234',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1024,
      steps: 40,
      guidance: 7,
    },
    mandatoryPrompts: {
      positive: 'score_9, score_8_up, score_7_up',
      negative: 'score_6, score_5, score_4',
    },
    gradioApiName: '/txt2img',
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
  },
  
  'anime': {
    id: 'anime',
    name: 'Anime',
    provider: 'gradio',
    endpoint: 'dhead/waiNSFWIllustrious_v110',
    type: 'image',
    defaults: {
      width: 1024,
      height: 1216,
      steps: 28,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
  },
  
  'anime_v2': {
    id: 'anime_v2',
    name: 'Anime V2',
    provider: 'gradio',
    endpoint: 'Menyu/wainsfw',
    type: 'image',
    defaults: {
      width: 832,
      height: 1216,
      steps: 40,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
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
      steps: 28,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
  },

  'anime_pd': {
    id: 'anime_pd',
    name: 'Anime PD',
    provider: 'huggingface-inference',
    endpoint: 'https://pvilbukpcv9mvo3g.us-east-1.aws.endpoints.huggingface.cloud',
    type: 'image',
    useSimpleInputs: true,
    defaults: {
      width: 1024,
      height: 1024,
      steps: 30,
      guidance: 7,
    },
    pricing: {
      credits: 500,
    },
    timeout: 90000,
    maxRetries: 5,
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
    maxRetries: 5,
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
    maxRetries: 5,
  },
  
  'video-express': {
    id: 'video-express',
    name: 'Express (5s)',
    provider: 'wavespeed',
    endpoint: '/api/v3/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast',
    type: 'video',
    defaults: {
      duration: 5,
    },
    pricing: {
      credits: 2000,
    },
    timeout: 90000,
    maxRetries: 5,
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
    maxRetries: 5,
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
