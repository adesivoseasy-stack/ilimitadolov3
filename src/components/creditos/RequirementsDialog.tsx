import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccept: () => void;
  onCancel?: () => void;
}

export function RequirementsDialog({ open, onOpenChange, onAccept, onCancel }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            🚨 ATENÇÃO — VERIFIQUE OS REQUISITOS ANTES DE CONTINUAR 🚨
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-foreground/90">
              <p>
                Contas com determinados planos <strong>Pro</strong> e <strong>Business</strong> são
                compatíveis com nosso sistema de recarga de créditos.
              </p>
              <p>Confira abaixo os planos aceitos atualmente:</p>

              <div>
                <p className="font-semibold mb-2">✅ PLANOS COMPATÍVEIS</p>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Plano da Conta</th>
                        <th className="text-right p-2">Valor Mensal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <tr><td className="p-2">Plano Free</td><td className="p-2 text-right">Gratuito</td></tr>
                      <tr><td className="p-2">Pro — 20 créditos</td><td className="p-2 text-right">$5/mês</td></tr>
                      <tr><td className="p-2">Pro — 200 créditos</td><td className="p-2 text-right">$50/mês</td></tr>
                      <tr><td className="p-2">Pro — 400 créditos</td><td className="p-2 text-right">$100/mês</td></tr>
                      <tr><td className="p-2">Pro — 800 créditos</td><td className="p-2 text-right">$200/mês</td></tr>
                      <tr><td className="p-2">Pro — 10.000 créditos</td><td className="p-2 text-right">$2.250/mês</td></tr>
                      <tr><td className="p-2">Business — 100 créditos</td><td className="p-2 text-right">$50/mês</td></tr>
                      <tr><td className="p-2">Business — 200 créditos</td><td className="p-2 text-right">$100/mês</td></tr>
                      <tr><td className="p-2">Business — 400 créditos</td><td className="p-2 text-right">$200/mês</td></tr>
                      <tr><td className="p-2">Business — 5.000 créditos</td><td className="p-2 text-right">$2.250/mês</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="font-semibold mb-2">📍 LIMITE DIÁRIO DE RECARGA</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Pro — 20 créditos</strong> → até 200 créditos por dia</li>
                  <li><strong>Pro — 200 créditos ou superior</strong> → até 1.000 créditos por dia</li>
                  <li><strong>Business — qualquer plano</strong> → até 2.000 créditos por dia</li>
                </ul>
              </div>

              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                <p className="font-semibold mb-1">⚠️ IMPORTANTE</p>
                <p>
                  Pedidos realizados acima do limite diário do seu plano serão entregues
                  automaticamente no dia seguinte, após 24 horas exatas.
                </p>
              </div>

              <p>Ao continuar, você confirma que leu e concorda com as regras acima.</p>
              <p>Qualquer dúvida, estamos à disposição 🚀</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>Li e concordo, continuar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
