import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

export const Scene1Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 200 } });
  const titleY = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 20 } }),
    [0, 1], [60, 0]
  );
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subtitleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20 } }),
    [0, 1], [40, 0]
  );
  const lineWidth = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 200 } }),
    [0, 1], [0, 300]
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Shield icon */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 30,
          width: 100,
          height: 100,
          borderRadius: 24,
          background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 60px rgba(139,92,246,0.4)",
        }}
      >
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: 72,
          fontWeight: 700,
          color: "white",
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
          letterSpacing: "-2px",
        }}
      >
        License Guard
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)",
          marginTop: 16,
          marginBottom: 16,
          borderRadius: 2,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 28,
          fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
          textAlign: "center",
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        Gestão Inteligente de Licenças
      </div>
    </AbsoluteFill>
  );
};
