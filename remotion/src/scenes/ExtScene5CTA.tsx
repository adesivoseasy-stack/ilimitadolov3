import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["200", "300", "600", "800"], subsets: ["latin"] });

export const ExtScene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgDark = interpolate(frame, [0, 18], [0, 0.97], { extrapolateRight: "clamp" });

  // Logo
  const logoSpring = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 130, mass: 1.3 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.4, 1]);
  const logoOpacity = interpolate(frame - 5, [0, 16], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoBlur = interpolate(frame - 5, [0, 20], [20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoY = interpolate(logoSpring, [0, 1], [25, 0]);

  // Title
  const titleDelay = 20;
  const titleSpring = spring({ frame: frame - titleDelay, fps, config: { damping: 22, stiffness: 100, mass: 1.4 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(frame - titleDelay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const titleBlur = interpolate(frame - titleDelay, [0, 24], [14, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Accent line
  const lineDelay = 32;
  const lineWidth = interpolate(
    spring({ frame: frame - lineDelay, fps, config: { damping: 200 } }),
    [0, 1], [0, 240]
  );

  // Tagline
  const tagDelay = 38;
  const tagOpacity = interpolate(frame - tagDelay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const tagY = interpolate(
    spring({ frame: frame - tagDelay, fps, config: { damping: 28, stiffness: 100 } }),
    [0, 1], [20, 0]
  );
  const tagBlur = interpolate(frame - tagDelay, [0, 22], [8, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Pulsing glow
  const glowPulse = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.08, 0.22]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `rgba(6,4,12,${bgDark})` }} />

      {/* Pulsing glow */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(124,58,237,${glowPulse}) 0%, transparent 55%)`,
        filter: "blur(80px)",
      }} />

      {/* Secondary glow */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(236,72,153,${glowPulse * 0.5}) 0%, transparent 55%)`,
        filter: "blur(60px)", transform: "translate(200px, -100px)",
      }} />

      {/* Logo */}
      <div
        style={{
          transform: `translateY(${logoY}px) scale(${logoScale})`,
          opacity: logoOpacity,
          filter: `blur(${logoBlur}px)`,
          marginBottom: 36,
        }}
      >
        <Img
          src={staticFile("images/logo.png")}
          style={{ width: 360, height: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Accent line */}
      <div style={{
        width: lineWidth, height: 2, borderRadius: 1,
        background: "linear-gradient(90deg, transparent, #7c3aed, #a855f7, #ec4899, transparent)",
        marginBottom: 28,
      }} />

      {/* Tagline */}
      <div style={{
        fontFamily, fontSize: 24, fontWeight: 200,
        color: "rgba(255,255,255,0.45)",
        opacity: tagOpacity, transform: `translateY(${tagY}px)`,
        filter: `blur(${tagBlur}px)`,
        letterSpacing: "4px", textTransform: "uppercase",
      }}>
        Construa sem limites
      </div>
    </AbsoluteFill>
  );
};
