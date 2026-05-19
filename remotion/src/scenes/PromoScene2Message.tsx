import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, interpolateColors } from 'remotion';
import { COLORS } from '../lib/colors';

export const PromoScene2Message: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bg = interpolateColors(frame, [0, 60], [COLORS.bgDark, COLORS.bgDeep]);

  // "Crie sites" — spring up
  const t1S = spring({ frame: frame - 5, fps, config: { stiffness: 65, damping: 12, mass: 2 } });
  const t1Y = interpolate(t1S, [0, 1], [100, 0]);
  const t1Op = interpolate(frame - 5, [0, 20], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const t1Blur = interpolate(frame - 5, [0, 22], [16, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // "sem limites" highlight — delayed
  const t2S = spring({ frame: frame - 15, fps, config: { stiffness: 70, damping: 13, mass: 1.8 } });
  const t2Y = interpolate(t2S, [0, 1], [80, 0]);
  const t2Op = interpolate(frame - 15, [0, 18], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const t2Blur = interpolate(frame - 15, [0, 20], [14, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Subtitle
  const subS = spring({ frame: frame - 28, fps, config: { stiffness: 80, damping: 16, mass: 1.5 } });
  const subY = interpolate(subS, [0, 1], [50, 0]);
  const subOp = interpolate(frame - 28, [0, 16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Line
  const lineW = interpolate(frame, [12, 45], [0, 350], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        transform: 'translate(-50%,-50%)', filter: 'blur(80px)',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{
          fontSize: 58, color: COLORS.textPrimary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 700, textAlign: 'center',
          opacity: t1Op, transform: `translateY(${t1Y}px)`,
          filter: `blur(${t1Blur}px)`,
        }}>
          Crie sites
        </div>
        <div style={{
          fontSize: 64, color: COLORS.primary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 800, textAlign: 'center',
          opacity: t2Op, transform: `translateY(${t2Y}px)`,
          filter: `blur(${t2Blur}px)`,
        }}>
          sem limites de créditos
        </div>

        <div style={{
          width: lineW, height: 2, marginTop: 8,
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
          opacity: 0.4,
        }} />

        <div style={{
          fontSize: 22, color: COLORS.textSecondary, marginTop: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 400, opacity: subOp,
          transform: `translateY(${subY}px)`,
        }}>
          A extensão que libera o poder do Lovable
        </div>
      </div>
    </AbsoluteFill>
  );
};
