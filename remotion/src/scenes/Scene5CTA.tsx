import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const titleScale = interpolate(s, [0, 1], [0.8, 1]);
  const titleOpacity = interpolate(s, [0, 1], [0, 1]);

  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const pulseGlow = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.7]
  );

  const lineWidth = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 200 } }),
    [0, 1], [0, 500]
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Pulsing glow behind text */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(139,92,246,${pulseGlow * 0.2}) 0%, transparent 60%)`,
          filter: "blur(40px)",
        }}
      />

      <div
        style={{
          fontFamily,
          fontSize: 64,
          fontWeight: 700,
          color: "white",
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: "center",
          letterSpacing: "-2px",
          lineHeight: 1.2,
        }}
      >
        License Guard
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: "linear-gradient(90deg, transparent, #8b5cf6, #a855f7, transparent)",
          marginTop: 20,
          marginBottom: 20,
        }}
      />

      <div
        style={{
          fontFamily,
          fontSize: 24,
          fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
          opacity: subtitleOpacity,
          textAlign: "center",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}
      >
        Proteja seu software
      </div>
    </AbsoluteFill>
  );
};
