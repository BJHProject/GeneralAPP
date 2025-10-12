import { MODEL_REGISTRY } from '@/lib/ai-client/model-registry'

export function validateModelId(modelId: string): { valid: boolean; error?: string } {
  if (!modelId) {
    return { valid: false, error: 'Model ID is required' }
  }

  const model = MODEL_REGISTRY[modelId]
  
  if (!model) {
    console.warn('[Security] Invalid model ID attempted:', modelId)
    return { valid: false, error: 'Invalid model ID' }
  }

  return { valid: true }
}

export function getAllowedModels(): string[] {
  return Object.keys(MODEL_REGISTRY)
}

export function getModelCost(modelId: string): number | null {
  const model = MODEL_REGISTRY[modelId]
  return model?.pricing?.credits || null
}

export function isVideoModel(modelId: string): boolean {
  const model = MODEL_REGISTRY[modelId]
  return model?.type === 'video'
}

export function isEditModel(modelId: string): boolean {
  const model = MODEL_REGISTRY[modelId]
  return model?.type === 'edited-image'
}
