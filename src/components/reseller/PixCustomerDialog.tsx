import { useState, useEffect, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY = 'pix_customer_data';

export interface PixCustomerFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
}

function loadSavedData(): Partial<PixCustomerFormData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data: PixCustomerFormData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: PixCustomerFormData) => void;
  loading?: boolean;
  title?: string;
  description?: string;
  defaultEmail?: string;
}

export function PixCustomerDialog({ open, onClose, onConfirm, loading, title, description, defaultEmail }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [useSaved, setUseSaved] = useState(false);

  useEffect(() => {
    if (open) {
      // Always start with empty fields for new customer
      setName('');
      setEmail(defaultEmail || '');
      setPhone('');
      setDocument('');
      setUseSaved(false);
    }
  }, [open, defaultEmail]);

  const handleLoadSaved = () => {
    const s = loadSavedData();
    if (s.customerName) setName(s.customerName);
    if (s.customerEmail) setEmail(s.customerEmail);
    if (s.customerPhone) setPhone(s.customerPhone);
    if (s.customerDocument) setDocument(s.customerDocument);
    setUseSaved(true);
  };

  const hasSavedData = (() => { try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; } })();

  const docDigits = document.replace(/\D/g, '');
  const isValid = name.trim().length >= 3 && (docDigits.length === 11 || docDigits.length === 14);

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!isValid || loading) return;

    const data: PixCustomerFormData = {
      customerName: name.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.replace(/\D/g, ''),
      customerDocument: docDigits,
    };
    saveData({ ...data, customerPhone: phone, customerDocument: document });
    onConfirm(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || 'Dados do pagador'}</DialogTitle>
          <DialogDescription>{description || 'Informe os dados para gerar o QR Code PIX.'}</DialogDescription>
        </DialogHeader>
        <form id="pix-customer-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          {hasSavedData && !useSaved && (
            <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={handleLoadSaved}>
              Carregar dados do último pagamento
            </Button>
          )}
          <div className="space-y-1">
            <Label htmlFor="pix-name">Nome completo *</Label>
            <Input id="pix-name" placeholder="João da Silva" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pix-email">Email</Label>
            <Input id="pix-email" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pix-phone">Telefone</Label>
            <Input id="pix-phone" placeholder="(27) 99999-9999" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={15} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pix-doc">CPF/CNPJ *</Label>
            <Input id="pix-doc" placeholder="000.000.000-00" value={document} onChange={(e) => setDocument(formatCpfCnpj(e.target.value))} maxLength={18} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="pix-customer-form" disabled={!isValid || loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : 'Gerar PIX'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
