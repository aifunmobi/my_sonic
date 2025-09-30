import ImageGenerator from "@/components/ImageGenerator";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl font-bold gradient-text animate-fade-in">
            AI Image Generator
          </h1>
          <p className="text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Transform your ideas into stunning visuals with AI
          </p>
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ImageGenerator />
        </div>
      </div>
    </div>
  );
};

export default Index;
