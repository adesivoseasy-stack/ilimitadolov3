import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../lib/colors';

const BENEFITS = [
  'Sem limite de créditos',
  'Interface intuitiva',
  'Resultados instantâneos',
];

export const PromoScene5Benefits: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleS = spring({ frame: frame - 3, fps, config: { stiffness: 65, damping: 13, mass: 2 } });
  const titleY = interpolate(titleS, [0, 1], [80, 0]);
  const titleOp = interpolate(frame - 3, [0, 18], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const titleBlur = interpolate(frame - 3, [0, 20], [14, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${COLORS.bgDeep} 0%, ${COLORS.bgIntense} 100%)` }}>
      <div style={{
        position: 'absolute', right: '-5%', top: '25%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 32,
      }}>
        <div style={{
          fontSize: 18, color: COLORS.primary, letterSpacing: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 600, textTransform: 'uppercase',
          opacity: titleOp, transform: `translateY(${titleY}px)`,
          filter: `blur(${titleBlur}px)`,
        }}>
          Por que escolher
        </div>

        {BENEFITS.map((b, i) => {
          const delay = 10 + i * 8;
          const s = spring({ frame: frame - delay, fps, config: { stiffness: 70, damping: 11, mass: 1.8 } });
          const y = interpolate(s, [0, 1], [90, 0]);
          const op = interpolate(frame - delay, [0, 16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
          const blur = interpolate(frame - delay, [0, 18], [12, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
          const scale = interpolate(s, [0, 1], [0.92, 1]);
          const glowP = interpolate(Math.sin((frame - delay) * 0.08), [-1, 1], [0, 0.12]);

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              opacity: op,
              transform: `translateY(${y}px) scale(${scale})`,
              filter: `blur(${blur}px)`,
              background: `rgba(139,92,246,${glowP})`,
              borderRadius: 18, padding: '20px 40px',
              border: `1px solid ${COLORS.borderPurple}`,
              boxShadow: `0 4px 30px rgba(139,92,246,${glowP})`,
            }}>
              <span style={{ color: COLORS.green, fontSize: 30, fontWeight: 700 }}>✓</span>
              <span style={{
                color: COLORS.textPrimary, fontSize: 30,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                fontWeight: 600,
              }}>{b}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
