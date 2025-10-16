-- Add model and negative_prompt columns to images table
ALTER TABLE public.images 
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS negative_prompt TEXT;

-- Create index for model column for faster filtering
CREATE INDEX IF NOT EXISTS idx_images_model ON public.images(model);
