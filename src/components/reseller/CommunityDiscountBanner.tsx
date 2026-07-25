import { motion, AnimatePresence } from 'framer-motion';
import { useCommunityDiscount } from '@/hooks/useCommunityDiscount';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CommunityDiscountBanner() {
  const {
    isActive,
    levels,
    currentLevel,
    nextLevel,
    discountPct,
    currentSales,
    salesToNext,
    progressPct,
  } = useCommunityDiscount();

  if (!isActive || levels.length === 0) return null;

  const isMax = !nextLevel;
  const oneAway = salesToNext === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative rounded-xl border border-primary/20 bg-background/60 backdrop-blur-md px-3.5 py-3 sm:px-4 sm:py-3"
    >
      <div className="flex items-center gap-3">
        <Flame className="h-4 w-4 text-primary shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Top row: title + status */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-foreground/90 font-display truncate">
              {isMax ? (
                <>Nível máximo · <span className="text-primary">{discountPct}% OFF</span></>
              ) : currentLevel ? (
                <>{currentLevel.emoji} {currentLevel.name} · <span className="text-primary">{discountPct}% OFF</span></>
              ) : (
                <>Desconto da comunidade</>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground font-display shrink-0">
              {isMax ? (
                <><Trophy className="inline h-3 w-3 mr-0.5 text-yellow-400" />MAX</>
              ) : (
                <><AnimatedNumber value={currentSales} />/{nextLevel?.sales_required} → {nextLevel?.discount_percentage}%</>
              )}
            </span>
          </div>

          {/* Slim bar with level icons */}
          <div className="relative pt-3 pb-4">
            <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-primary"
              />
            </div>
            {levels.map((lvl) => {
              const maxReq = levels[levels.length - 1].sales_required;
              const pos = (lvl.sales_required / maxReq) * 100;
              const reached = currentSales >= lvl.sales_required;
              return (
                <div
                  key={lvl.id}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5"
                  style={{ left: `${pos}%` }}
                  title={`${lvl.name} · ${lvl.sales_required} vendas · ${lvl.discount_percentage}% OFF`}
                >
                  <span
                    className={cn(
                      'text-[11px] leading-none transition-all',
                      reached ? 'grayscale-0 opacity-100 drop-shadow-[0_0_6px_rgba(168,139,250,0.7)]' : 'grayscale opacity-40'
                    )}
                  >
                    {lvl.emoji}
                  </span>
                  <span
                    className={cn(
                      'text-[8px] font-display leading-none tracking-wide',
                      reached ? 'text-primary font-bold' : 'text-muted-foreground/60'
                    )}
                  >
                    {lvl.discount_percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Inline hint */}
          <p
            className={cn(
              'text-[10px] font-display mt-1.5 flex items-center gap-1',
              isMax
                ? 'text-green-300/90'
                : oneAway
                ? 'text-yellow-300/90'
                : 'text-muted-foreground'
            )}
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            {isMax ? (
              <span>Nível máximo — <b>{discountPct}% OFF</b> aplicado no PIX</span>
            ) : oneAway ? (
              <span>Falta <b>1 venda</b> para <b>{nextLevel?.discount_percentage}% OFF</b></span>
            ) : currentLevel ? (
              <span>Faça mais vendas pra subir de nível e aumentar seu desconto</span>
            ) : (
              <span>Faça mais vendas pra subir de nível e liberar desconto</span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2, color: '#a78bfa' }}
      animate={{ scale: 1, color: 'currentColor' }}
      transition={{ duration: 0.4 }}
      className="text-foreground font-bold tabular-nums"
    >
      {value}
    </motion.span>
  );
}