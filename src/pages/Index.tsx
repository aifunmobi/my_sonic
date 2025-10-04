import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import ImageGenerator from "@/components/ImageGenerator";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        navigate("/auth");
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({
      data: {
        session: currentSession
      }
    }) => {
      setSession(currentSession);
      if (!currentSession) {
        navigate("/auth");
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>;
  }
  if (!session) {
    return null;
  }
  return <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <User className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline font-thin truncate max-w-[150px] md:max-w-none">{session.user.email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
          <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline text-xs sm:text-sm">Sign Out</span>
        </Button>
      </div>
      
      <div className="w-full max-w-7xl space-y-6 sm:space-y-8 text-center px-2 sm:px-4">
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl gradient-text animate-fade-in font-thin text-slate-200">Nano Banana Image Factory
        </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground animate-fade-in mt-[5px]" style={{
          animationDelay: '0.1s'
        }}>
            Transform your ideas into stunning visuals with AI
          </p>
        </div>
        
        <div className="animate-fade-in" style={{
        animationDelay: '0.2s'
      }}>
          <ImageGenerator />
        </div>
      </div>
    </div>;
};
export default Index;