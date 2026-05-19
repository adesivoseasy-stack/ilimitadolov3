import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { COLORS } from '../lib/colors';

export const PromoScene7End: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Logo spring up
  const logoS = spring({ frame: frame - 5, fps, config: { stiffness: 55, damping: 12, mass: 2.5 } });
  const logoY = interpolate(logoS, [0, 1], [130, 0]);
  const logoScale = interpolate(logoS, [0, 1], [0.5, 1]);
  const logoOp = interpolate(frame - 5, [0, 22], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const logoBlur = interpolate(frame - 5, [0, 26], [22, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const glow = interpolate(Math.sin(frame * 0.05), [-1, 1], [0.2, 0.6]);

  // Tagline
  const tagS = spring({ frame: frame - 22, fps, config: { stiffness: 70, damping: 15, mass: 1.8 } });
  const tagY = interpolate(tagS, [0, 1], [50, 0]);
  const tagOp = interpolate(frame - 22, [0, 16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 22, durationInFrames], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const blurOut = interpolate(frame, [durationInFrames - 22, durationInFrames], [0, 10], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDark }}>
      <div style={{
        position: 'absolute', left: '50%', top: '44%',
        width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(139,92,246,${glow * 0.12}) 0%, transparent 60%)`,
        transform: 'translate(-50%,-50%)', filter: 'blur(100px)',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 30,
        opacity: fadeOut, filter: `blur(${blurOut}px)`,
      }}>
        <Img
          src={staticFile('images/logo.png')}
          style={{
            width: 360, opacity: logoOp,
            transform: `translateY(${logoY}px) scale(${logoScale})`,
            filter: `blur(${logoBlur}px) drop-shadow(0 0 50px rgba(139,92,246,${glow}))`,
          }}
        />
        <div style={{
          fontSize: 22, color: COLORS.textSecondary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 300, letterSpacing: 8, textTransform: 'uppercase',
          opacity: tagOp, transform: `translateY(${tagY}px)`,
        }}>
          Lovable Ilimitado
        </div>
      </div>

      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
      }} />
    </AbsoluteFill>
  );
};
