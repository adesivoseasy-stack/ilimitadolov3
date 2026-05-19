import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { COLORS } from '../lib/colors';

export const PromoScene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Orbs
  const orbExpand = interpolate(frame, [0, 50], [0.2, 1.3], { extrapolateRight: 'clamp' });
  const orbOp = interpolate(frame, [0, 30], [0, 0.2], { extrapolateRight: 'clamp' });
  const drift = interpolate(Math.sin(frame * 0.025), [-1, 1], [-15, 15]);

  // Logo — heavy spring, rises and settles
  const logoS = spring({ frame: frame - 12, fps, config: { stiffness: 60, damping: 11, mass: 2.2 } });
  const logoY = interpolate(logoS, [0, 1], [140, 0]);
  const logoOp = interpolate(frame - 12, [0, 22], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const logoBlur = interpolate(frame - 12, [0, 28], [24, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const logoGlow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.15, 0.55]);

  // Tagline — staggered after logo
  const tagS = spring({ frame: frame - 30, fps, config: { stiffness: 70, damping: 14, mass: 1.8 } });
  const tagY = interpolate(tagS, [0, 1], [60, 0]);
  const tagOp = interpolate(frame - 30, [0, 18], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const tagBlur = interpolate(frame - 30, [0, 20], [12, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Line reveal
  const lineW = interpolate(frame, [20, 55], [0, 400], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const lineOp = interpolate(frame, [20, 40], [0, 0.35], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Particles orbiting
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const r = 220 + (i % 4) * 40;
    const spd = 0.006 + (i % 3) * 0.004;
    const pOp = interpolate(frame, [8 + i * 2, 28 + i * 2], [0, 0.5], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
    const expand = interpolate(frame, [0, 35], [0.1, 1], { extrapolateRight: 'clamp' });
    return {
      x: Math.cos(angle + frame * spd) * r * expand,
      y: Math.sin(angle + frame * spd) * r * 0.45 * expand,
      op: pOp,
      size: 2 + (i % 3) * 1.5,
    };
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bgDark }}>
      {/* Primary orb */}
      <div style={{
        position: 'absolute', left: '50%', top: '44%',
        width: 1000, height: 1000, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(139,92,246,${orbOp}) 0%, rgba(59,7,100,${orbOp * 0.4}) 40%, transparent 70%)`,
        transform: `translate(-50%,-50%) scale(${orbExpand}) translateX(${drift}px)`,
        filter: 'blur(90px)',
      }} />
      <div style={{
        position: 'absolute', left: '58%', top: '52%',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(167,139,250,${orbOp * 0.5}) 0%, transparent 70%)`,
        transform: `translate(-50%,-50%) scale(${orbExpand * 0.7}) translateX(${-drift * 0.6}px)`,
        filter: 'blur(70px)',
      }} />

      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `calc(50% + ${p.x}px)`, top: `calc(44% + ${p.y}px)`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: i % 2 === 0 ? COLORS.primary : COLORS.secondary,
          opacity: p.op,
          boxShadow: `0 0 ${p.size * 4}px rgba(139,92,246,0.5)`,
        }} />
      ))}

      {/* Lines */}
      <div style={{
        position: 'absolute', left: '50%', top: 'calc(44% + 90px)',
        width: lineW, height: 1, opacity: lineOp,
        background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
        transform: 'translateX(-50%)',
      }} />

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 28,
      }}>
        <Img
          src={staticFile('images/logo.png')}
          style={{
            width: 360, opacity: logoOp,
            transform: `translateY(${logoY}px)`,
            filter: `blur(${logoBlur}px) drop-shadow(0 0 45px rgba(139,92,246,${logoGlow}))`,
          }}
        />
        <div style={{
          fontSize: 24, color: COLORS.textSecondary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontWeight: 300, letterSpacing: 10, textTransform: 'uppercase',
          opacity: tagOp,
          transform: `translateY(${tagY}px)`,
          filter: `blur(${tagBlur}px)`,
        }}>
          Lovable Ilimitado
        </div>
      </div>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)',
      }} />
    </AbsoluteFill>
  );
};
