import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { ExtScene1Hook } from "./scenes/ExtScene1Hook";
import { ExtScene2Problem } from "./scenes/ExtScene2Problem";
import { ExtScene3Solution } from "./scenes/ExtScene3Solution";
import { ExtScene4HowItWorks } from "./scenes/ExtScene4HowItWorks";
import { ExtScene5CTA } from "./scenes/ExtScene5CTA";
import { ExtBackground } from "./components/ExtBackground";

export const ExtensionVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <ExtBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={80}>
          <ExtScene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <ExtScene2Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <ExtScene3Solution />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={70}>
          <ExtScene4HowItWorks />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={80}>
          <ExtScene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
