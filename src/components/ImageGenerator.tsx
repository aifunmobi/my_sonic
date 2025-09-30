import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for your image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({
          title: "Image generated!",
          description: "Your image is ready",
        });
      } else {
        throw new Error('No image URL received');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card className="glass-card p-6 space-y-4">
        <Textarea
          placeholder="Describe the image you want to generate... (e.g., 'A serene mountain landscape at sunset with a crystal clear lake')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] bg-input/50 border-border/50 resize-none text-lg"
          disabled={isGenerating}
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all"
          style={{ boxShadow: 'var(--shadow-glow)' }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Image
            </>
          )}
        </Button>
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
                onClick={handleDownload}
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
