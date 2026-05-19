import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["200", "300", "600", "800"], subsets: ["latin"] });

export const ExtScene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dark-to-light transition
  const darkOverlay = interpolate(frame, [0, 22], [0.98, 0], { extrapolateRight: "clamp" });

  // Logo appears with dramatic spring
  const logoDelay = 5;
  const logoSpring = spring({ frame: frame - logoDelay, fps, config: { damping: 14, stiffness: 140, mass: 1.3 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.3, 1]);
  const logoOpacity = interpolate(frame - logoDelay, [0, 16], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoBlur = interpolate(frame - logoDelay, [0, 20], [18, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoRotate = interpolate(logoSpring, [0, 1], [-5, 0]);

  // Title
  const titleDelay = 18;
  const titleSpring = spring({ frame: frame - titleDelay, fps, config: { damping: 24, stiffness: 110, mass: 1.3 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(frame - titleDelay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const titleBlur = interpolate(frame - titleDelay, [0, 22], [12, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Pills with stagger
  const pills = ["API Direta", "Sem Limites", "Chrome Extension"];
  
  // Sub text
  const subDelay = 30;
  const subOpacity = interpolate(frame - subDelay, [0, 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subY = interpolate(spring({ frame: frame - subDelay, fps, config: { damping: 30, stiffness: 100 } }), [0, 1], [25, 0]);
  const subBlur = interpolate(frame - subDelay, [0, 22], [6, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Glowing ring around logo
  const ringPulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.15, 0.35]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `rgba(8,6,14,${darkOverlay})` }} />

      {/* Logo with glow ring */}
      <div style={{ position: "relative", marginBottom: 40 }}>
        {/* Glow ring */}
        <div
          style={{
            position: "absolute",
            inset: -30,
            borderRadius: 30,
            background: `radial-gradient(circle, rgba(124,58,237,${ringPulse}) 0%, transparent 70%)`,
            filter: "blur(30px)",
            opacity: logoOpacity,
          }}
        />
        <div
          style={{
            transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
            opacity: logoOpacity,
            filter: `blur(${logoBlur}px)`,
          }}
        >
          <Img
            src={staticFile("images/logo.png")}
            style={{ width: 280, height: "auto", objectFit: "contain" }}
          />
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: 60,
          fontWeight: 800,
          color: "#1a1a2e",
          letterSpacing: "-3px",
          lineHeight: 1.15,
          textAlign: "center",
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          filter: `blur(${titleBlur}px)`,
        }}
      >
        Uma extensão.{"\n"}
        <span style={{
          background: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Zero limites.
        </span>
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily, fontSize: 22, fontWeight: 200, color: "#6b7280",
        marginTop: 24, opacity: subOpacity, transform: `translateY(${subY}px)`,
        filter: `blur(${subBlur}px)`, letterSpacing: "0.5px",
      }}>
        Ponte direta com a API da Lovable
      </div>

      {/* Pills */}
      <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
        {pills.map((pill, i) => {
          const pd = 38 + i * 8;
          const ps = spring({ frame: frame - pd, fps, config: { damping: 18, stiffness: 150 } });
          const pY = interpolate(ps, [0, 1], [35, 0]);
          const pO = interpolate(frame - pd, [0, 14], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
          const pB = interpolate(frame - pd, [0, 16], [8, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
          const pScale = interpolate(ps, [0, 1], [0.85, 1]);
          return (
            <div key={pill} style={{
              fontFamily, fontSize: 15, fontWeight: 600, color: "#7c3aed",
              padding: "10px 26px", borderRadius: 100,
              border: "1px solid rgba(124,58,237,0.15)",
              background: "rgba(124,58,237,0.06)",
              transform: `translateY(${pY}px) scale(${pScale})`,
              opacity: pO, filter: `blur(${pB}px)`,
              boxShadow: "0 4px 20px rgba(124,58,237,0.08)",
            }}>
              {pill}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
