import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../lib/colors';

export const PromoScene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title spring up
  const titleS = spring({ frame: frame - 3, fps, config: { stiffness: 60, damping: 12, mass: 2.2 } });
  const titleY = interpolate(titleS, [0, 1], [110, 0]);
  const titleOp = interpolate(frame - 3, [0, 20], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const titleBlur = interpolate(frame - 3, [0, 22], [18, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Button spring up (delayed)
  const btnS = spring({ frame: frame - 16, fps, config: { stiffness: 80, damping: 10, mass: 1.8 } });
  const btnY = interpolate(btnS, [0, 1], [80, 0]);
  const btnScale = interpolate(btnS, [0, 1], [0.7, 1]);
  const btnOp = interpolate(frame - 16, [0, 16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const btnBlur = interpolate(frame - 16, [0, 18], [12, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const pulse = interpolate(Math.sin(frame * 0.12), [-1, 1], [1, 1.04]);
  const glowI = interpolate(Math.sin(frame * 0.12), [-1, 1], [0.25, 0.55]);

  // Sub text
  const subS = spring({ frame: frame - 28, fps, config: { stiffness: 80, damping: 16, mass: 1.5 } });
  const subY = interpolate(subS, [0, 1], [40, 0]);
  const subOp = interpolate(frame - 28, [0, 14], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${COLORS.bgSecondary} 0%, ${COLORS.bgDeep} 100%)` }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        transform: 'translate(-50%,-50%)', filter: 'blur(100px)',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 40,
      }}>
        <div style={{
          fontSize: 62, color: COLORS.textPrimary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 800, opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          filter: `blur(${titleBlur}px)`,
        }}>
          Comece Agora
        </div>

        <div style={{
          transform: `translateY(${btnY}px) scale(${btnScale * pulse})`,
          opacity: btnOp,
          filter: `blur(${btnBlur}px)`,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
          borderRadius: 18, padding: '22px 64px',
          color: '#fff', fontSize: 26,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 700,
          boxShadow: `0 0 ${25 + glowI * 35}px rgba(139,92,246,${glowI}), 0 12px 40px rgba(0,0,0,0.3)`,
        }}>
          Baixar Extensão
        </div>

        <div style={{
          fontSize: 16, color: COLORS.textSecondary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          opacity: subOp, transform: `translateY(${subY}px)`,
        }}>
          Gratuito para testar • Chrome Extension
        </div>
      </div>
    </AbsoluteFill>
  );
};
