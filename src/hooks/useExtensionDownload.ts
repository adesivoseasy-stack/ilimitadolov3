import { useState } from 'react';
import { toast } from 'sonner';

const ZIP_PATH = '/LOV3.8.zip';
const ZIP_FILENAME = 'LOV3.8.zip';

export function useExtensionDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'zipping' | 'done'>('idle');

  const downloadExtension = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setProgress(15);
    setStatus('fetching');

    try {
      const cacheBustPath = `${ZIP_PATH}?t=${Date.now()}`;
      const response = await fetch(cacheBustPath, { method: 'HEAD', cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`ZIP não encontrado (${response.status})`);
      }

      setProgress(65);
      setStatus('zipping');

      const link = document.createElement('a');
      link.href = `${ZIP_PATH}?t=${Date.now()}`;
      link.download = ZIP_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setProgress(100);
      setStatus('done');
      toast.success('Extensão (versão ofuscada mais recente) baixada com sucesso.');

      window.setTimeout(() => {
        setProgress(0);
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao baixar extensão:', err);
      toast.error('Falha ao baixar a extensão: ' + (err?.message || 'erro desconhecido'));
      setProgress(0);
      setStatus('idle');
    } finally {
      setIsDownloading(false);
    }
  };

  return { isDownloading, progress, status, downloadExtension };
}
