import { z } from 'zod'

const MAX_PROMPT_LENGTH = 2000
const MAX_PIXELS = 2048 * 2048
const ALLOWED_DIMENSIONS = [512, 768, 832, 1024, 1248, 1280, 1344, 1536, 2048] as const

export const imageGenerationSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required').max(MAX_PROMPT_LENGTH, 'Prompt too long'),
  negative_prompt: z.string().max(MAX_PROMPT_LENGTH, 'Negative prompt too long').optional(),
  width: z.number().int().min(512).max(2048).refine(
    (val) => ALLOWED_DIMENSIONS.includes(val as any),
    { message: 'Width must be one of: 512, 768, 832, 1024, 1248, 1280, 1344, 1536, 2048' }
  ).optional().default(1024),
  height: z.number().int().min(512).max(2048).refine(
    (val) => ALLOWED_DIMENSIONS.includes(val as any),
    { message: 'Height must be one of: 512, 768, 832, 1024, 1248, 1280, 1344, 1536, 2048' }
  ).optional().default(1024),
  guidance_scale: z.number().min(1).max(20).optional().default(7.5),
  num_inference_steps: z.number().int().min(1).max(50).optional().default(20),
  seed: z.number().int().min(-1).optional(),
  idempotency_key: z.string().uuid().optional(),
}).refine(
  (data) => {
    const totalPixels = (data.width || 1024) * (data.height || 1024)
    return totalPixels <= MAX_PIXELS
  },
  {
    message: `Total pixels cannot exceed ${MAX_PIXELS} (2048x2048)`,
  }
)

export const imageEditSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  prompt: z.string().min(1, 'Prompt is required').max(MAX_PROMPT_LENGTH, 'Prompt too long'),
  idempotency_key: z.string().uuid().optional(),
})

export const videoGenerationSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required').max(MAX_PROMPT_LENGTH, 'Prompt too long'),
  imageUrl: z.string().url('Invalid image URL').optional(),
  duration: z.enum(['1', '3', '5']).optional().default('3'),
  idempotency_key: z.string().uuid().optional(),
})

export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>
export type ImageEditInput = z.infer<typeof imageEditSchema>
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>
