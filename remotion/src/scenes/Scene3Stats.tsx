import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] });

const stats = [
  { value: "500+", label: "Licenças Ativas" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Monitoramento" },
];

export const Scene3Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ display: "flex", gap: 80 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: frame - i * 10, fps, config: { damping: 15, stiffness: 180 } });
          const scale = interpolate(s, [0, 1], [0.5, 1]);
          const opacity = interpolate(s, [0, 1], [0, 1]);
          const y = interpolate(s, [0, 1], [40, 0]);

          return (
            <div
              key={i}
              style={{
                transform: `scale(${scale}) translateY(${y}px)`,
                opacity,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontSize: 80,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #a855f7, #8b5cf6, #7c3aed)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 22,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
              {/* Accent line */}
              <div
                style={{
                  width: interpolate(s, [0, 1], [0, 60]),
                  height: 2,
                  background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)",
                  marginTop: 8,
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
