import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      
      <div className="text-center relative z-10 animate-fade-up">
        <div className="mx-auto mb-6 relative w-20 h-20">
          <div className="absolute inset-0 rounded-2xl bg-gradient opacity-20 blur-lg animate-pulse-glow" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-subtle border border-primary/20">
            <AlertTriangle className="h-9 w-9 text-primary" />
          </div>
        </div>
        <h1 className="mb-3 text-6xl font-bold text-gradient">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Página não encontrada</p>
        <a href="/" className="inline-flex items-center justify-center h-11 px-8 rounded-xl bg-gradient text-white font-medium hover:opacity-90 transition-opacity">
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
