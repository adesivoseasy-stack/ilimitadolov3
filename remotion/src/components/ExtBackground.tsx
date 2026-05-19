import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const ExtBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const orbPulse1 = interpolate(Math.sin(frame * 0.02), [-1, 1], [0.04, 0.09]);
  const orbPulse2 = interpolate(Math.sin(frame * 0.015 + 1), [-1, 1], [0.03, 0.07]);
  const orbPulse3 = interpolate(Math.sin(frame * 0.025 + 2), [-1, 1], [0.02, 0.05]);

  return (
    <AbsoluteFill style={{ background: "#FAFAFA" }}>
      {/* Main purple orb */}
      <div
        style={{
          position: "absolute",
          left: `${interpolate(frame, [0, 400], [25, 65])}%`,
          top: `${interpolate(frame, [0, 400], [15, 55])}%`,
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(124,58,237,${orbPulse1}) 0%, transparent 65%)`,
          filter: "blur(140px)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Secondary blue-violet orb */}
      <div
        style={{
          position: "absolute",
          left: `${interpolate(frame, [0, 400], [75, 30])}%`,
          top: `${interpolate(frame, [0, 400], [70, 35])}%`,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(99,102,241,${orbPulse2}) 0%, transparent 65%)`,
          filter: "blur(120px)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Accent pink orb */}
      <div
        style={{
          position: "absolute",
          left: `${interpolate(frame, [0, 400], [50, 45])}%`,
          top: `${interpolate(frame, [0, 400], [80, 20])}%`,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(236,72,153,${orbPulse3}) 0%, transparent 65%)`,
          filter: "blur(100px)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
};
