import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../lib/colors';

export const PromoScene3Easy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Icon — spring up with overshoot
  const iconS = spring({ frame: frame - 5, fps, config: { stiffness: 90, damping: 9, mass: 1.8 } });
  const iconY = interpolate(iconS, [0, 1], [120, 0]);
  const iconOp = interpolate(frame - 5, [0, 18], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const iconBlur = interpolate(frame - 5, [0, 20], [18, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const iconScale = interpolate(iconS, [0, 1], [0.4, 1]);
  const pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.95, 1.08]);

  // Title — delayed spring up
  const titleS = spring({ frame: frame - 14, fps, config: { stiffness: 70, damping: 13, mass: 2 } });
  const titleY = interpolate(titleS, [0, 1], [80, 0]);
  const titleOp = interpolate(frame - 14, [0, 18], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const titleBlur = interpolate(frame - 14, [0, 20], [14, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Subtitle — more delayed
  const subS = spring({ frame: frame - 22, fps, config: { stiffness: 80, damping: 16, mass: 1.5 } });
  const subY = interpolate(subS, [0, 1], [50, 0]);
  const subOp = interpolate(frame - 22, [0, 16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${COLORS.bgSecondary} 0%, ${COLORS.bgDeep} 100%)` }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', left: '50%', top: '38%',
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)`,
        transform: `translate(-50%,-50%) scale(${pulse})`, filter: 'blur(70px)',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 35,
      }}>
        <div style={{
          fontSize: 110, opacity: iconOp,
          transform: `translateY(${iconY}px) scale(${iconScale})`,
          filter: `blur(${iconBlur}px) drop-shadow(0 0 30px rgba(139,92,246,0.6))`,
        }}>⚡</div>

        <div style={{
          fontSize: 50, color: COLORS.textPrimary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 700, opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          filter: `blur(${titleBlur}px)`,
        }}>
          Instale e use
        </div>

        <div style={{
          fontSize: 24, color: COLORS.textSecondary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 400, opacity: subOp,
          transform: `translateY(${subY}px)`,
        }}>
          Sem complexidade. Sem configuração.
        </div>
      </div>
    </AbsoluteFill>
  );
};
