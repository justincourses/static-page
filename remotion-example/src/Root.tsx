import { Composition } from 'remotion';
import { PromoVideo } from './PromoVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={30 * 15} // 15 seconds
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
