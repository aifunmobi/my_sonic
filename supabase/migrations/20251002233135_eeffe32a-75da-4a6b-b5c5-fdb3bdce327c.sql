-- Create table for storing generated images
CREATE TABLE public.generated_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  prompt text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own images
CREATE POLICY "Users can view their own images"
ON public.generated_images
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own images
CREATE POLICY "Users can insert their own images"
ON public.generated_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON public.generated_images
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_generated_images_user_id ON public.generated_images(user_id, created_at DESC);