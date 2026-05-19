import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["200", "300", "600", "700", "800"], subsets: ["latin"] });

const steps = [
  { num: "01", label: "Escreva no chat", desc: "Digite o que quer construir", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { num: "02", label: "API processa", desc: "Extensão envia direto à Lovable", icon: "M13 2L3 14h9l-1 10 10-12h-9l1-10z" },
  { num: "03", label: "Site pronto", desc: "Sem gastar um único crédito", icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" },
];

export const ExtScene4HowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 26, stiffness: 120, mass: 1.2 } });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const titleBlur = interpolate(frame, [0, 22], [10, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily, fontSize: 46, fontWeight: 800, color: "#1a1a2e",
          letterSpacing: "-2px", transform: `translateY(${titleY}px)`,
          opacity: titleOpacity, filter: `blur(${titleBlur}px)`, marginBottom: 70,
        }}
      >
        Como funciona
      </div>

      <div style={{ display: "flex", gap: 50, alignItems: "flex-start" }}>
        {steps.map((step, i) => {
          const delay = 10 + i * 14;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 130, mass: 1.2 } });
          const y = interpolate(s, [0, 1], [55, 0]);
          const opacity = interpolate(frame - delay, [0, 16], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
          const blur = interpolate(frame - delay, [0, 20], [14, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
          const scale = interpolate(s, [0, 1], [0.88, 1]);

          const lineDelay = delay + 10;
          const lineW = interpolate(frame - lineDelay, [0, 14], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

          return (
            <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", width: 260,
                  transform: `translateY(${y}px) scale(${scale})`, opacity, filter: `blur(${blur}px)`,
                }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  display: "flex", justifyContent: "center", alignItems: "center",
                  marginBottom: 20, boxShadow: "0 12px 40px rgba(124,58,237,0.25)",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={step.icon}/>
                  </svg>
                </div>

                <div style={{
                  fontFamily, fontSize: 44, fontWeight: 800,
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  lineHeight: 1, marginBottom: 14,
                }}>
                  {step.num}
                </div>
                <div style={{ fontFamily, fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 8, letterSpacing: "-0.5px" }}>
                  {step.label}
                </div>
                <div style={{ fontFamily, fontSize: 15, fontWeight: 300, color: "#6b7280", textAlign: "center" }}>
                  {step.desc}
                </div>
              </div>

              {i < steps.length - 1 && (
                <div style={{
                  width: lineW, height: 2, borderRadius: 1,
                  background: "linear-gradient(90deg, rgba(124,58,237,0.4), rgba(168,85,247,0.1))",
                  marginLeft: 10, marginRight: -10, marginTop: -60,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
