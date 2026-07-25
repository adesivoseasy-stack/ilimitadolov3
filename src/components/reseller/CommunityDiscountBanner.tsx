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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 18 }}
      className="relative overflow-hidden rounded-3xl p-[1.5px] bg-[conic-gradient(from_0deg,#8b5cf6_0%,#c4b5fd_25%,#7c3aed_50%,#a78bfa_75%,#8b5cf6_100%)] animate-glow-rotate"
    >
      <div className="relative rounded-3xl bg-background/90 backdrop-blur-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-purple-500/20 blur-[100px] pointer-events-none" />

        <div className="relative p-5 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Flame className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-primary font-display">
                  Desconto da Comunidade
                </p>
                <h3 className="text-lg sm:text-2xl font-black text-foreground font-display leading-tight">
                  {isMax ? (
                    <>Nível máximo — <span className="text-gradient">{discountPct}% OFF</span></>
                  ) : currentLevel ? (
                    <>Nível <span className="text-gradient">{currentLevel.name}</span> — {discountPct}% OFF</>
                  ) : (
                    <>Suba o primeiro nível para desbloquear <span className="text-gradient">desconto</span></>
                  )}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentLevel && (
                <motion.span
                  key={currentLevel.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/30 text-xs font-bold text-primary font-display flex items-center gap-1.5"
                >
                  <span className="text-base">{currentLevel.emoji}</span>
                  {currentLevel.name}
                </motion.span>
              )}
              {isMax && (
                <span className="px-3 py-1.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-xs font-bold text-yellow-400 font-display flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> MAX
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm font-display">
              <span className="text-muted-foreground">
                <AnimatedNumber value={currentSales} /> vendas
              </span>
              {!isMax && salesToNext !== null && (
                <span className="text-foreground/80">
                  Faltam <span className="text-primary font-bold">{salesToNext}</span> para {nextLevel?.emoji} {nextLevel?.name}
                </span>
              )}
            </div>

            <div className="relative h-4 sm:h-5 rounded-full bg-white/[0.04] border border-white/10 overflow-hidden">
              {/* Filled bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 20, duration: 1.2 }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 via-primary to-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.7)]"
              >
                {/* Shine */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </motion.div>

              {/* Level markers */}
              {levels.map((lvl) => {
                const maxReq = levels[levels.length - 1].sales_required;
                const pos = (lvl.sales_required / maxReq) * 100;
                const reached = currentSales >= lvl.sales_required;
                return (
                  <div
                    key={lvl.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                    style={{ left: `${pos}%` }}
                  >
                    <motion.div
                      animate={reached ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 1.6, repeat: reached ? Infinity : 0 }}
                      className={cn(
                        'h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 transition-all',
                        reached
                          ? 'bg-white border-primary shadow-[0_0_10px_rgba(255,255,255,0.9)]'
                          : 'bg-background border-white/30'
                      )}
                    />
                  </div>
                );
              })}
            </div>

            {/* Level labels */}
            <div className="hidden sm:flex items-center justify-between text-[10px] font-display uppercase tracking-wider">
              {levels.map((lvl) => {
                const reached = currentSales >= lvl.sales_required;
                return (
                  <div
                    key={lvl.id}
                    className={cn(
                      'flex flex-col items-center gap-0.5 transition-colors',
                      reached ? 'text-primary' : 'text-muted-foreground/50'
                    )}
                    style={{ minWidth: 60 }}
                  >
                    <span className="text-lg">{lvl.emoji}</span>
                    <span className="font-bold">{lvl.name}</span>
                    <span className="text-[9px] opacity-70">{lvl.sales_required} · {lvl.discount_percentage}%</span>
                  </div>
                );
              })}
            </div>

            {/* Mobile compact legend */}
            <div className="flex sm:hidden items-center justify-between text-[9px] font-display uppercase tracking-wider gap-1 overflow-x-auto scrollbar-none">
              {levels.map((lvl) => {
                const reached = currentSales >= lvl.sales_required;
                return (
                  <div key={lvl.id} className={cn('flex flex-col items-center gap-0.5 shrink-0', reached ? 'text-primary' : 'text-muted-foreground/50')}>
                    <span className="text-sm">{lvl.emoji}</span>
                    <span className="font-bold">{lvl.discount_percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isMax ? 'max' : oneAway ? 'one' : nextLevel?.id ?? 'none'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2.5 border text-xs sm:text-sm font-display',
                oneAway
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                  : isMax
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-primary/10 border-primary/25 text-foreground/90'
              )}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                {isMax ? (
                  <>🏆 Nível máximo atingido — <b>{discountPct}% OFF</b> aplicado automaticamente em todo PIX.</>
                ) : oneAway ? (
                  <>🚨 Falta apenas <b>UMA venda</b> para desbloquear <b>{nextLevel?.discount_percentage}% OFF!</b></>
                ) : (
                  <>Faltam <b>{salesToNext}</b> vendas para desbloquear <b>{nextLevel?.discount_percentage}% OFF</b> em toda a loja.</>
                )}
              </span>
            </motion.div>
          </AnimatePresence>

          {discountPct > 0 && (
            <p className="text-[11px] text-center text-muted-foreground font-display">
              💜 Seu desconto de <b className="text-primary">{discountPct}%</b> é aplicado automaticamente no PIX de todos os produtos da loja.
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