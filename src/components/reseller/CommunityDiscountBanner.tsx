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

          {/* Slim bar */}
          <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-primary"
            />
            {levels.map((lvl) => {
              const maxReq = levels[levels.length - 1].sales_required;
              const pos = (lvl.sales_required / maxReq) * 100;
              const reached = currentSales >= lvl.sales_required;
              return (
                <div
                  key={lvl.id}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full',
                    reached ? 'bg-white' : 'bg-white/20'
                  )}
                  style={{ left: `${pos}%` }}
                />
              );
            })}
          </div>

          {/* Inline hint (only when relevant) */}
          {oneAway && !isMax && (
            <p className="text-[10px] text-yellow-300/90 font-display mt-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Falta 1 venda para {nextLevel?.discount_percentage}% OFF
            </p>
          )}
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