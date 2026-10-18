import { Composition } from "remotion";
import { LogoAnimation } from "./Composition";

/**
 * 210 frames @ 30fps = 7s loop: ~1.5s entrance, 5.5s hold — a slow, calm
 * loop suitable for a navbar. 600×144 canvas (logo 600×120 + rule) rendered
 * with transparency.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LogoAnimation"
        component={LogoAnimation}
        durationInFrames={210}
        fps={30}
        width={600}
        height={144}
        transparent
      />
    </>
  );
};
