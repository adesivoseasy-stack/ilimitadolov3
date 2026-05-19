import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PixQrCodeProps {
  value: string;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}

export function PixQrCode({ value, imageUrl, alt = 'QR Code PIX', className = 'w-48 h-48 rounded-xl border border-border/50' }: PixQrCodeProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function generate() {
      if (imageUrl) {
        setGeneratedUrl(imageUrl);
        return;
      }

      if (!value) {
        setGeneratedUrl('');
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(value, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 384,
        });
        if (active) setGeneratedUrl(dataUrl);
      } catch {
        if (active) setGeneratedUrl('');
      }
    }

    generate();
    return () => {
      active = false;
    };
  }, [imageUrl, value]);

  if (!generatedUrl) return null;

  return <img src={generatedUrl} alt={alt} className={className} />;
}
