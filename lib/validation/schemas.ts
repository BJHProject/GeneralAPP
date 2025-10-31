import { z } from 'zod'

const MAX_PROMPT_LENGTH = 2000
const MAX_PIXELS = 2048 * 2048
const ALLOWED_DIMENSIONS = [512, 768, 832, 1024, 1216, 1280, 1536, 2048] as const

export const imageGenerationSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'Please describe what you want to create').max(MAX_PROMPT_LENGTH, 'Your prompt is too long. Please keep it under 2000 characters.'),
  negative_prompt: z.string().max(MAX_PROMPT_LENGTH, 'Negative prompt is too long. Please keep it under 2000 characters.').optional(),
  width: z.number().int().min(512).max(2048).refine(
    (val) => ALLOWED_DIMENSIONS.includes(val as any),
    { message: 'Please select a valid image size from the available options' }
  ).optional().default(1024),
  height: z.number().int().min(512).max(2048).refine(
    (val) => ALLOWED_DIMENSIONS.includes(val as any),
    { message: 'Please select a valid image size from the available options' }
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
    message: 'The selected image size is too large. Please choose a smaller size.',
  }
)

export const imageEditSchema = z.object({
  imageUrl: z.string().url('Please upload a valid image'),
  prompt: z.string().min(1, 'Please describe how you want to edit the image').max(MAX_PROMPT_LENGTH, 'Your prompt is too long. Please keep it under 2000 characters.'),
  idempotency_key: z.string().uuid().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const videoGenerationSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1, 'Please describe the video you want to create').max(MAX_PROMPT_LENGTH, 'Your prompt is too long. Please keep it under 2000 characters.'),
  imageUrl: z.string().url('Please upload a valid image').optional(),
  duration: z.enum(['1', '3', '5', '8']).optional().default('3'),
  idempotency_key: z.string().uuid().optional(),
})

export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>
export type ImageEditInput = z.infer<typeof imageEditSchema>
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>