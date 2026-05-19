import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] });

export const Scene4Security: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldScale = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });
  const ringRotation = interpolate(frame, [0, 60], [0, 360]);
  const textOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const textY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 20 } }),
    [0, 1], [30, 0]
  );

  const items = ["HWID Lock", "Anti-Pirataria", "Criptografia"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
      {/* Animated shield with ring */}
      <div style={{ position: "relative", width: 160, height: 160 }}>
        {/* Rotating ring */}
        <div
          style={{
            position: "absolute",
            inset: -10,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "rgba(139,92,246,0.6)",
            borderRightColor: "rgba(168,85,247,0.3)",
            transform: `rotate(${ringRotation}deg)`,
          }}
        />
        {/* Shield */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 32,
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${shieldScale})`,
            boxShadow: "0 0 80px rgba(139,92,246,0.4)",
          }}
        >
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: 42,
          fontWeight: 700,
          color: "white",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          letterSpacing: "-1px",
        }}
      >
        Segurança Total
      </div>

      {/* Security items */}
      <div style={{ display: "flex", gap: 32 }}>
        {items.map((item, i) => {
          const s = spring({ frame: frame - 25 - i * 6, fps, config: { damping: 18, stiffness: 200 } });
          return (
            <div
              key={i}
              style={{
                fontFamily,
                fontSize: 18,
                fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 12,
                padding: "12px 24px",
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
