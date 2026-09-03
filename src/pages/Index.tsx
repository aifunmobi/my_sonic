import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import ImageGenerator from "@/components/ImageGenerator";
import { Button } from "@/components/ui/button";
import { Gamepad2, LogOut, User } from "lucide-react";
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
  return <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline font-thin">{session.user.email}</span>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/sonic">
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">Play Spin Rush</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
      
      <div className="w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl gradient-text animate-fade-in font-thin text-slate-200 sm:text-4xl">Nano Banana Image Factory
        </h1>
          <p style={{
          animationDelay: '0.1s'
        }} className="text-muted-foreground animate-fade-in text-lg">
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