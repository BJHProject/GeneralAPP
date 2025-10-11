-- Create edited_images table
CREATE TABLE IF NOT EXISTS edited_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  input_image_url TEXT NOT NULL,
  output_image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_edited_images_user_id ON edited_images(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_edited_images_created_at ON edited_images(created_at DESC);

-- Create index on is_saved for filtering
CREATE INDEX IF NOT EXISTS idx_edited_images_is_saved ON edited_images(is_saved);
