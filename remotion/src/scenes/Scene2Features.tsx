import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] });

const features = [
  { icon: "🔑", label: "Licenças Automáticas" },
  { icon: "📊", label: "Dashboard Completo" },
  { icon: "👥", label: "Rede de Revendedores" },
  { icon: "🤖", label: "IA Integrada" },
];

export const Scene2Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div
        style={{
          fontFamily,
          fontSize: 44,
          fontWeight: 700,
          color: "white",
          opacity: titleOpacity,
          marginBottom: 60,
          letterSpacing: "-1px",
        }}
      >
        Tudo que você precisa
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        {features.map((f, i) => {
          const s = spring({ frame: frame - 8 - i * 8, fps, config: { damping: 15, stiffness: 180 } });
          const scale = interpolate(s, [0, 1], [0.7, 1]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                transform: `scale(${scale})`,
                opacity,
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 20,
                padding: "40px 36px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                width: 220,
              }}
            >
              <div style={{ fontSize: 48 }}>{f.icon}</div>
              <div
                style={{
                  fontFamily,
                  fontSize: 20,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.85)",
                  textAlign: "center",
                }}
              >
                {f.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
