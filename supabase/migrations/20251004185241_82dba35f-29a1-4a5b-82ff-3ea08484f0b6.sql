-- Add indexes to improve query performance on generated_images table
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created ON public.generated_images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON public.generated_images(created_at DESC);