import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { TitleScene } from './scenes/TitleScene';
import { FeaturesScene } from './scenes/FeaturesScene';
import { TechStackScene } from './scenes/TechStackScene';
import { CTAScene } from './scenes/CTAScene';
import { DynamicBackground } from './components/DynamicBackground';

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <DynamicBackground />
      <Sequence from={0} durationInFrames={100}>
        <TitleScene 
          title="AI 全栈开发课程" 
          subtitle="JustinCourse Presents"
        />
      </Sequence>
      <Sequence from={100} durationInFrames={120}>
        <FeaturesScene 
          title="零基础入门" 
          subtitle="AI 辅助，弯道超车"
        />
      </Sequence>
      <Sequence from={220} durationInFrames={120}>
        <TechStackScene />
      </Sequence>
      <Sequence from={340} durationInFrames={110}>
        <CTAScene 
          price="限时特惠 ¥279/年"
          url="justincourse.com"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
