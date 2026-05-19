import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const gradientAngle = interpolate(frame, [0, 300], [135, 225]);
  const orb1X = interpolate(frame, [0, 300], [15, 85]);
  const orb1Y = interpolate(frame, [0, 300], [20, 60]);
  const orb2X = interpolate(frame, [0, 300], [80, 25]);
  const orb2Y = interpolate(frame, [0, 300], [70, 30]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #0a0a14 0%, #12101f 40%, #0d0b18 100%)`,
      }}
    >
      {/* Purple orb 1 */}
      <div
        style={{
          position: "absolute",
          left: `${orb1X}%`,
          top: `${orb1Y}%`,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          filter: "blur(80px)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Purple orb 2 */}
      <div
        style={{
          position: "absolute",
          left: `${orb2X}%`,
          top: `${orb2Y}%`,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </AbsoluteFill>
  );
};
