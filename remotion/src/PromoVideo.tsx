import { AbsoluteFill } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { PromoScene1Intro } from './scenes/PromoScene1Intro';
import { PromoScene2Message } from './scenes/PromoScene2Message';
import { PromoScene3Easy } from './scenes/PromoScene3Easy';
import { PromoScene4Chat } from './scenes/PromoScene4Chat';
import { PromoScene5Benefits } from './scenes/PromoScene5Benefits';
import { PromoScene6CTA } from './scenes/PromoScene6CTA';
import { PromoScene7End } from './scenes/PromoScene7End';

// 450 frames total at 30fps = 15 seconds
// Scene durations (accounting for ~20 frame transitions between scenes):
// Scene 1: 60 frames (0-2s)
// Scene 2: 60 frames (2-4s)
// Scene 3: 60 frames (4-6s)
// Scene 4: 70 frames (6-8s)
// Scene 5: 70 frames (8-10s)
// Scene 6: 65 frames (10-12s)
// Scene 7: 85 frames (12-15s)
// With 6 transitions of ~20 frames each = 120 frames overlap
// Total: 470 - 120 = 350 + additional padding

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={70}>
          <PromoScene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <PromoScene2Message />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={65}>
          <PromoScene3Easy />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={80}>
          <PromoScene4Chat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-left' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={75}>
          <PromoScene5Benefits />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <PromoScene6CTA />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
        />
        <TransitionSeries.Sequence durationInFrames={90}>
          <PromoScene7End />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
