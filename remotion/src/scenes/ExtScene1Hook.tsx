import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["200", "300", "600", "800"], subsets: ["latin"] });

export const ExtScene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo fades in with scale overshoot
  const logoSpring = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 120, mass: 1.4 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(frame - 2, [0, 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoBlur = interpolate(frame - 2, [0, 22], [20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoY = interpolate(logoSpring, [0, 1], [30, 0]);

  // "0 Créditos Gastos" — hero text
  const heroDelay = 15;
  const heroSpring = spring({ frame: frame - heroDelay, fps, config: { damping: 22, stiffness: 100, mass: 1.5 } });
  const heroY = interpolate(heroSpring, [0, 1], [60, 0]);
  const heroBlur = interpolate(frame - heroDelay, [0, 28], [18, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const heroOpacity = interpolate(frame - heroDelay, [0, 22], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const heroScale = interpolate(heroSpring, [0, 1], [0.88, 1]);

  // Accent line
  const lineDelay = 30;
  const lineWidth = interpolate(
    spring({ frame: frame - lineDelay, fps, config: { damping: 200 } }),
    [0, 1], [0, 280]
  );

  // Subtitle
  const subDelay = 35;
  const subOpacity = interpolate(frame - subDelay, [0, 22], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subY = interpolate(
    spring({ frame: frame - subDelay, fps, config: { damping: 30, stiffness: 100 } }),
    [0, 1], [25, 0]
  );
  const subBlur = interpolate(frame - subDelay, [0, 25], [8, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Floating particles
  const particles = [
    { x: 15, y: 20, size: 6, delay: 0, speed: 0.03 },
    { x: 85, y: 30, size: 4, delay: 10, speed: 0.025 },
    { x: 70, y: 75, size: 5, delay: 5, speed: 0.035 },
    { x: 25, y: 80, size: 3, delay: 15, speed: 0.02 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Floating particles */}
      {particles.map((p, i) => {
        const pOpacity = interpolate(frame - p.delay, [0, 20], [0, 0.4], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        const pY = interpolate(Math.sin((frame - p.delay) * p.speed), [-1, 1], [-15, 15]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "rgba(124,58,237,0.6)",
              opacity: pOpacity,
              transform: `translateY(${pY}px)`,
              filter: "blur(1px)",
            }}
          />
        );
      })}

      {/* Logo */}
      <div
        style={{
          transform: `translateY(${logoY}px) scale(${logoScale})`,
          opacity: logoOpacity,
          filter: `blur(${logoBlur}px)`,
          marginBottom: 40,
        }}
      >
        <Img
          src={staticFile("images/logo.png")}
          style={{ width: 320, height: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Hero text */}
      <div
        style={{
          fontFamily,
          fontSize: 130,
          fontWeight: 800,
          letterSpacing: "-5px",
          lineHeight: 1,
          background: "linear-gradient(135deg, #1a1a2e 0%, #7c3aed 45%, #a855f7 70%, #ec4899 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          transform: `translateY(${heroY}px) scale(${heroScale})`,
          filter: `blur(${heroBlur}px)`,
          opacity: heroOpacity,
        }}
      >
        0 Créditos
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: "linear-gradient(90deg, transparent, #7c3aed, #a855f7, #ec4899, transparent)",
          marginTop: 28,
          marginBottom: 28,
          borderRadius: 2,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 30,
          fontWeight: 200,
          color: "#4b5563",
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          filter: `blur(${subBlur}px)`,
          letterSpacing: "1px",
        }}
      >
        Construa sites completos sem gastar nada
      </div>
    </AbsoluteFill>
  );
};
