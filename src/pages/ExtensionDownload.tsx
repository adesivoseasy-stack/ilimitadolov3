import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileCode, Package, CheckCircle, Loader2, Shield, Lock, MessageCircle, Check, Sparkles, GitBranch, Zap, Globe, RefreshCw, ChevronRight, AlertCircle, Code } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useExtensionDownload } from '@/hooks/useExtensionDownload';
import { useExtensionV7Download } from '@/hooks/useExtensionV7Download';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ExtensionDownload() {
  const v5 = useExtensionDownload();
  const v7 = useExtensionV7Download();
  const [devDownloading, setDevDownloading] = useState(false);

  const downloadDevVersion = async () => {
    if (devDownloading) return;
    setDevDownloading(true);
    try {
      const res = await fetch(`/ilimitado-lov-v8.1.0-dev.zip?t=${Date.now()}`);
      if (!res.ok) throw new Error(`ZIP não encontrado (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ilimitado-lov-v8.1.0-dev.zip';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Extensão v8.1.0 (dev) baixada com sucesso.');
    } catch (err: any) {
      toast.error('Falha ao baixar: ' + (err?.message || 'erro'));
    } finally {
      setDevDownloading(false);
    }
  };

  const getButtonContent = (hook: typeof v5, label: string) => {
    if (hook.status === 'done') return <><Check className="mr-2 h-5 w-5" />Download Concluído!</>;
    if (hook.status === 'zipping') return <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Compactando...</>;
    if (hook.status === 'fetching') return <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Baixando... {hook.progress}%</>;
    return (
      <>
        <Download className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:scale-110 duration-300" />
        {label}
      </>
    );
  };

  const getButtonClasses = (hook: typeof v5, isV7 = false) => {
    const base = 'group relative w-full h-14 text-base font-semibold rounded-xl transition-all duration-500 overflow-hidden';
    
    const colorClass = isV7 ? {
        defaultBg: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 text-white shadow-[0_0_30px_-5px_rgb(34_197_94_/_0.5)] hover:shadow-[0_0_40px_-5px_rgb(34_197_94_/_0.7)] hover:scale-[1.02] active:scale-[0.98]',
        downloadingBg: 'bg-green-500/80 text-white',
        doneBg: 'bg-green-500 hover:bg-green-500/90 text-white'
    } : {
        defaultBg: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 text-white shadow-[0_0_30px_-5px_rgb(34_197_94_/_0.5)] hover:shadow-[0_0_40px_-5px_rgb(34_197_94_/_0.7)] hover:scale-[1.02] active:scale-[0.98]',
        downloadingBg: 'bg-green-500/80 text-white',
        doneBg: 'bg-green-500 hover:bg-green-500/90 text-white'
    };

    if (hook.status === 'done') {
      return `${base} ${colorClass.doneBg} border-0`;
    }
    
    if (hook.isDownloading) {
      return `${base} ${colorClass.downloadingBg} border-0`;
    }

    return `${base} ${colorClass.defaultBg} border-0`;
  };

  const renderDownloadButton = (hook: typeof v5, label: string, isV7 = false) => (
    <div className="space-y-3 pt-2">
      <div className="relative">
        <Button 
          className={getButtonClasses(hook, isV7)}
          onClick={hook.downloadExtension} 
          disabled={hook.isDownloading && hook.status !== 'done'}
        >
          {!hook.isDownloading && hook.status !== 'done' && (
            <span className="absolute inset-0 overflow-hidden rounded-xl">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-from-transparent via-white/10 to-transparent" />
            </span>
          )}
          <span className="relative flex items-center justify-center">
            {getButtonContent(hook, label)}
          </span>
        </Button>
      </div>

      {hook.isDownloading && hook.status !== 'idle' && (
        <div className="animate-fade-in space-y-1">
          <Progress value={hook.progress} className="h-2.5 rounded-full" />
          <p className="text-xs text-muted-foreground text-center">
            {hook.status === 'fetching' ? 'Baixando arquivos...' : 'Gerando pacote ZIP...'}
          </p>
        </div>
      )}

      {!hook.isDownloading && hook.status === 'idle' && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-green-500" />
          <span>Pacote .zip gerado em tempo real</span>
        </div>
      )}
    </div>
  );

  const FeatureItem = ({ icon: Icon, text, highlight = false }: { icon: React.ElementType; text: string; highlight?: boolean }) => (
    <div className="flex items-center gap-2.5 text-sm">
      <div className={`p-1.5 rounded-lg ${highlight ? 'bg-green-500/10' : 'bg-primary/10'}`}>
        <Icon className={`h-3.5 w-3.5 ${highlight ? 'text-green-500' : 'text-primary'}`} />
      </div>
      <span className={highlight ? 'text-green-400/90' : ''}>{text}</span>
    </div>
  );

  const FileList = ({ files, version }: { files: string[]; version: string }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {files.map((file) => (
        <div 
          key={file} 
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs hover:bg-muted/70 transition-colors"
        >
          <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <code className="font-mono text-[11px] truncate">{file}</code>
        </div>
      ))}
    </div>
  );

  const v5Files = ['manifest.json', 'background.js', 'hide-element.js', 'sidepanel.html', 'sidepanel.js', 'remote-ui.js', 'popup.html', 'popup.js', 'permission.html', 'jszip.min.js'];
  const v7Files = ['manifest.json', 'background.js', 'content.js', 'sidepanel.html', 'sidepanel.js', 'popup.html', 'popup.js', 'icons/'];

  return (
    <AdminLayout>
      <div className="space-y-8 overflow-hidden px-1 sm:px-0 pt-12 lg:pt-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Extensões do Chrome</h1>
            <p className="text-muted-foreground mt-1">Baixe e instale as extensões para integrar com o Lovable</p>
          </div>
          <a 
            href="https://w.app/lovableilimitado" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium"
          >
            <MessageCircle className="h-4 w-4" />
            Precisa de ajuda?
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Main Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* v5 Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <Lock className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Thin Client</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Arquitetura segura com UI remota</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg shadow-green-500/20">
                  v5.0.0
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <FeatureItem icon={Shield} text="API Lovable 100% server-side" />
                <FeatureItem icon={Shield} text="Validação de licença e sessão obrigatória" />
                <FeatureItem icon={Shield} text="UI remota carregada via iframe" />
                <FeatureItem icon={CheckCircle} text="Chat com anexos + Templates" />
                <FeatureItem icon={CheckCircle} text="Captura automática de respostas" />
              </div>

              {renderDownloadButton(v5, 'Baixar Extensão v5.0.0', false)}
            </CardContent>
          </Card>

          {/* v7 Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10">
                    <Zap className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">GitHub AI</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Integração com IA + GitHub</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                  v7.0.0
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Detecta automaticamente o repo do projeto aberto no Lovable. Edita via AI + GitHub sem usar créditos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <FeatureItem icon={Globe} text="Detecta o repo GitHub automaticamente" />
                <FeatureItem icon={Zap} text="AI modifica o código via AgentRouter" highlight />
                <FeatureItem icon={GitBranch} text="Commit automático no GitHub" />
                <FeatureItem icon={RefreshCw} text="Lovable sincroniza em tempo real" />
              </div>

              {renderDownloadButton(v7, 'Baixar Extensão v7.0.0', true)}

              <Button
                variant="outline"
                className="w-full mt-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={downloadDevVersion}
                disabled={devDownloading}
              >
                {devDownloading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Baixando...</>
                ) : (
                  <><Code className="mr-2 h-4 w-4" />Baixar v8.1.0 (Sem Ofuscação)</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Files & Installation */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* v5 Files */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-green-500" />
                Arquivos v5
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileList files={v5Files} version="v5" />
            </CardContent>
          </Card>

          {/* v7 Files */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-amber-500" />
                Arquivos v7
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileList files={v7Files} version="v7" />
            </CardContent>
          </Card>

          {/* Installation Guide */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-muted/50 to-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-primary" />
                Como Instalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2.5 text-sm">
                {[ 
                  'Extraia o ZIP baixado',
                  'Abra chrome://extensions',
                  'Ative "Modo desenvolvedor"',
                  'Clique em "Carregar sem empacotar"',
                  'Selecione a pasta extraída',
                  'Clique no ícone para abrir a sidebar'
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-tight pt-px">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Support Info */}
        <Separator className="my-4" />
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Ambas versões são compatíveis com Chrome 120+</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Extensões verificadas e seguras</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
