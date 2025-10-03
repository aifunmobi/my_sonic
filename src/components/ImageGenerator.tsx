import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [imageCount, setImageCount] = useState("1");
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedImages();
  }, []);

  const fetchSavedImages = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for your image",
        variant: "destructive",
      });
      return;
    }

    const count = parseInt(imageCount);
    setIsGenerating(true);
    setCurrentProgress({ current: 0, total: count });
    
    let successCount = 0;
    let failCount = 0;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      for (let i = 0; i < count; i++) {
        setCurrentProgress({ current: i + 1, total: count });
        
        try {
          // Add a small delay between requests to avoid overwhelming the gateway
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt }
          });

          if (error) {
            console.error(`Error generating image ${i + 1}:`, error);
            failCount++;
            continue;
          }

          if (data?.imageUrl) {
            successCount++;
            if (i === count - 1) {
              setGeneratedImage(data.imageUrl);
            }
            
            // Save to database
            const { error: insertError } = await supabase
              .from('generated_images')
              .insert({
                user_id: session.session.user.id,
                image_url: data.imageUrl,
                prompt: prompt
              });

            if (!insertError) {
              fetchSavedImages();
            }
          } else {
            console.error(`No image URL received for image ${i + 1}`);
            failCount++;
          }
        } catch (imageError) {
          console.error(`Failed to generate image ${i + 1}:`, imageError);
          failCount++;
          // Continue to next image instead of stopping
        }
      }

      if (successCount > 0) {
        toast({
          title: successCount > 1 ? "Images generated!" : "Image generated!",
          description: failCount > 0 
            ? `${successCount} succeeded, ${failCount} failed`
            : count > 1 ? `${count} images are ready` : "Your image is ready",
        });
      } else {
        throw new Error('All image generations failed');
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate images",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCurrentProgress({ current: 0, total: 0 });
    }
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedImages(savedImages.filter(img => img.id !== id));
      toast({
        title: "Image deleted",
        description: "Your image has been removed",
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Previous Images Gallery */}
      {!isLoadingImages && savedImages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Generated Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedImages.map((image) => (
              <Card key={image.id} className="glass-card p-2 group relative overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.prompt}
                  className="w-full h-48 object-cover rounded cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setGeneratedImage(image.image_url)}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleDownload(image.image_url)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate" title={image.prompt}>
                  {image.prompt}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
      <Card className="glass-card p-6 space-y-4">
        <Textarea
          placeholder="Describe the image you want to generate... (e.g., 'A serene mountain landscape at sunset with a crystal clear lake')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] bg-input/50 border-border/50 resize-none text-lg"
          disabled={isGenerating}
        />
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Number of images</label>
            <Select value={imageCount} onValueChange={setImageCount} disabled={isGenerating}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select count" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'image' : 'images'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex-[2] h-14 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating {currentProgress.current}/{currentProgress.total}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate {parseInt(imageCount) > 1 ? 'Images' : 'Image'}
              </>
            )}
          </Button>
        </div>
      </Card>

      {generatedImage && (
        <Card className="glass-card p-2 animate-fade-in">
          <div className="relative group">
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-auto rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <Button
                onClick={() => handleDownload(generatedImage)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImageGenerator;
