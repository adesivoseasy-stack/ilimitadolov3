import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, RefreshCw, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function ResetLicenca() {
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    const trimmed = key.trim().toUpperCase();
    if (trimmed.length < 8) {
      toast({ title: "Chave inválida", description: "Digite sua chave completa.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-reset-license", {
        body: { license_key: trimmed },
      });
      if (error || (data && (data as any).error)) {
        const msg = (data as any)?.error || error?.message || "Falha ao resetar.";
        toast({ title: "Não foi possível resetar", description: msg, variant: "destructive" });
        return;
      }
      setSuccess(true);
      toast({ title: "Dispositivo resetado", description: "Ative a extensão no novo computador." });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-12">
      <Helmet>
        <title>Resetar Licença — Ilimitado Lov</title>
        <meta name="description" content="Resete o dispositivo vinculado à sua licença para usar em outro computador." />
      </Helmet>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o início
        </Link>

        <div className="relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={logo} alt="Ilimitado Lov" className="h-10 w-10 rounded-lg" />
            <div className="text-lg font-semibold">
              Ilimitado <span className="text-primary">Lov</span>
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl" />
              <div className="relative h-16 w-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
                {success ? (
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                ) : (
                  <RefreshCw className="h-8 w-8 text-primary" />
                )}
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">
            {success ? "Tudo certo!" : "Resetar licença"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {success
              ? "Seu dispositivo foi desvinculado. Agora ative a extensão no novo computador normalmente."
              : "Mudou de PC? Digite sua licença para liberar o uso em outro computador."}
          </p>

          {!success && (
            <>
              <div className="relative mb-4">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleReset()}
                  placeholder="LVB-XXXXX-XXXXX-XXXXX"
                  className="pl-10 h-12 font-mono tracking-wider bg-background/60 border-border/80"
                  disabled={loading}
                  maxLength={29}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleReset}
                disabled={loading || !key.trim()}
                className="w-full h-12 font-semibold text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resetar HWID
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Após o reset, ative a extensão no novo computador normalmente.
              </div>
            </>
          )}

          {success && (
            <Button
              onClick={() => {
                setSuccess(false);
                setKey("");
              }}
              variant="outline"
              className="w-full h-12"
            >
              Resetar outra chave
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}