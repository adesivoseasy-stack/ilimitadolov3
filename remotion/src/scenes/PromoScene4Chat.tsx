import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../lib/colors';

const MESSAGES = [
  { text: 'Qual é seu projeto?', isBot: true, delay: 8 },
  { text: 'Quero um site de portfólio', isBot: false, delay: 22 },
  { text: 'Pronto! Seu site está criado ✨', isBot: true, delay: 38 },
];

export const PromoScene4Chat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chat container — spring up from bottom
  const containerS = spring({ frame: frame - 2, fps, config: { stiffness: 55, damping: 13, mass: 2.2 } });
  const containerY = interpolate(containerS, [0, 1], [200, 0]);
  const containerOp = interpolate(frame - 2, [0, 20], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const containerBlur = interpolate(frame - 2, [0, 25], [20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const containerScale = interpolate(containerS, [0, 1], [0.92, 1]);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLORS.bgDark} 0%, ${COLORS.bgSecondary} 100%)` }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        transform: 'translate(-50%,-50%)', filter: 'blur(80px)',
      }} />

      {/* Chat window */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%,-50%) translateY(${containerY}px) scale(${containerScale})`,
        opacity: containerOp,
        filter: `blur(${containerBlur}px)`,
        width: 750,
        background: 'rgba(18,8,34,0.85)',
        border: `1px solid ${COLORS.borderPurple}`,
        borderRadius: 28,
        padding: '36px 32px',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.08)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          paddingBottom: 18,
          borderBottom: `1px solid ${COLORS.borderPurple}`,
          marginBottom: 8,
        }}>
          <div style={{
            width: 11, height: 11, borderRadius: '50%',
            background: COLORS.green,
            boxShadow: `0 0 10px ${COLORS.green}`,
          }} />
          <span style={{
            color: COLORS.textSecondary, fontSize: 15,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            fontWeight: 500, letterSpacing: 1,
          }}>
            LOV2.0 Chat
          </span>
          {/* Dots */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
            {[0.3, 0.5, 0.3].map((op, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: `rgba(255,255,255,${op})`,
              }} />
            ))}
          </div>
        </div>

        {/* Messages */}
        {MESSAGES.map((msg, i) => {
          const msgS = spring({ frame: frame - msg.delay, fps, config: { stiffness: 70, damping: 11, mass: 1.8 } });
          const msgY = interpolate(msgS, [0, 1], [80, 0]);
          const msgOp = interpolate(frame - msg.delay, [0, 16], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
          const msgBlur = interpolate(frame - msg.delay, [0, 18], [10, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
          const msgScale = interpolate(msgS, [0, 1], [0.9, 1]);

          // Sparkle effect for last message
          const isSparkle = msg.text.includes('✨');
          const sparkleGlow = isSparkle
            ? interpolate(Math.sin((frame - msg.delay) * 0.15), [-1, 1], [0.15, 0.35])
            : 0;

          return (
            <div
              key={i}
              style={{
                alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                background: msg.isBot
                  ? 'rgba(139,92,246,0.12)'
                  : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                border: msg.isBot ? `1px solid ${COLORS.borderPurple}` : 'none',
                borderRadius: msg.isBot ? '22px 22px 22px 6px' : '22px 22px 6px 22px',
                padding: '16px 26px',
                color: COLORS.textPrimary,
                fontSize: 21,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                fontWeight: 500,
                opacity: msgOp,
                transform: `translateY(${msgY}px) scale(${msgScale})`,
                filter: `blur(${msgBlur}px)`,
                boxShadow: msg.isBot
                  ? `0 0 ${sparkleGlow * 60}px rgba(139,92,246,${sparkleGlow})`
                  : '0 8px 25px rgba(139,92,246,0.25)',
                maxWidth: '78%',
              }}
            >
              {msg.text}
            </div>
          );
        })}

        {/* Typing indicator that appears briefly */}
        {(() => {
          const typingOp = interpolate(frame, [14, 18, 20, 22], [0, 0.6, 0.6, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
          if (typingOp <= 0) return null;
          return (
            <div style={{
              alignSelf: 'flex-end',
              display: 'flex', gap: 5, padding: '14px 22px',
              background: 'rgba(139,92,246,0.08)',
              borderRadius: 18, opacity: typingOp,
            }}>
              {[0, 4, 8].map((d, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: COLORS.textSecondary,
                  opacity: interpolate(Math.sin((frame + d) * 0.25), [-1, 1], [0.3, 1]),
                }} />
              ))}
            </div>
          );
        })()}
      </div>
    </AbsoluteFill>
  );
};
