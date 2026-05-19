import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["300", "600", "700", "800"], subsets: ["latin"] });

export const ExtScene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const creditCount = Math.max(0, Math.round(interpolate(frame, [8, 45], [847, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })));

  const counterSpring = spring({ frame: frame - 3, fps, config: { damping: 22, stiffness: 130 } });
  const counterY = interpolate(counterSpring, [0, 1], [50, 0]);
  const counterBlur = interpolate(frame - 3, [0, 25], [12, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const counterOpacity = interpolate(frame - 3, [0, 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const hitZero = 45;
  const shakeX = frame > hitZero && frame < hitZero + 12
    ? interpolate(Math.sin((frame - hitZero) * 2.5), [-1, 1], [-8, 8])
    : 0;
  const redFlash = frame > hitZero ? interpolate(frame - hitZero, [0, 6, 18], [0, 0.2, 0], { extrapolateRight: "clamp" }) : 0;

  const barWidth = interpolate(frame, [8, 45], [100, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const msgDelay = 50;
  const msgOpacity = interpolate(frame - msgDelay, [0, 18], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const msgY = interpolate(
    spring({ frame: frame - msgDelay, fps, config: { damping: 30, stiffness: 100 } }),
    [0, 1], [20, 0]
  );
  const msgBlur = interpolate(frame - msgDelay, [0, 20], [6, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Warning icon pulse
  const warnDelay = hitZero + 5;
  const warnScale = spring({ frame: frame - warnDelay, fps, config: { damping: 10, stiffness: 200 } });
  const warnOpacity = interpolate(frame - warnDelay, [0, 10], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `rgba(8,6,14,${bgOpacity * 0.98})` }} />
      <AbsoluteFill style={{ background: `rgba(239,68,68,${redFlash})` }} />

      {/* Radial dark vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${counterY}px) translateX(${shakeX}px)`,
          filter: `blur(${counterBlur}px)`,
          opacity: counterOpacity,
        }}
      >
        <div style={{ fontFamily, fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 20 }}>
          Créditos restantes
        </div>

        <div style={{
          fontFamily, fontSize: 140, fontWeight: 800,
          color: creditCount === 0 ? "#ef4444" : "white",
          letterSpacing: "-6px", lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          textShadow: creditCount === 0 ? "0 0 60px rgba(239,68,68,0.5)" : "none",
        }}>
          {creditCount}
        </div>

        {/* Progress bar */}
        <div style={{ width: 350, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", marginTop: 36, overflow: "hidden" }}>
          <div style={{
            width: `${barWidth}%`, height: "100%", borderRadius: 3,
            background: barWidth < 20
              ? "linear-gradient(90deg, #ef4444, #dc2626)"
              : "linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)",
            boxShadow: barWidth < 20 ? "0 0 20px rgba(239,68,68,0.4)" : "0 0 20px rgba(124,58,237,0.3)",
          }} />
        </div>
      </div>

      {/* Warning icon */}
      <div
        style={{
          position: "absolute",
          bottom: "30%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: warnOpacity,
          transform: `scale(${interpolate(warnScale, [0, 1], [0.5, 1])})`,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div style={{
          fontFamily, fontSize: 24, fontWeight: 300, color: "rgba(255,255,255,0.45)",
          opacity: msgOpacity, transform: `translateY(${msgY}px)`, filter: `blur(${msgBlur}px)`,
          letterSpacing: "-0.3px",
        }}>
          Seus créditos acabaram.
        </div>
      </div>
    </AbsoluteFill>
  );
};
