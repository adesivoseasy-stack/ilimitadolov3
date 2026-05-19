import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { ExtensionVideo } from "./ExtensionVideo";
import { PromoVideo } from "./PromoVideo";

export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="extension"
      component={ExtensionVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="promo"
      component={PromoVideo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
