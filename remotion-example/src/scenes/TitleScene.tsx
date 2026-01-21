import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { FadeIn } from '../components/FadeIn';

export const TitleScene: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 200 }
  });

  return (
    <AbsoluteFill style={{ 
      justifyContent: 'center', 
      alignItems: 'center', 
      flexDirection: 'column',
      // background: 'linear-gradient(to bottom right, #000000, #111111)' // Use global background
    }}>
      <FadeIn>
        <h1 style={{ 
          fontSize: 100, 
          color: '#fff', 
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 800,
          margin: 0,
          textAlign: 'center',
          transform: `scale(${scale})`
        }}>
          {title}
        </h1>
      </FadeIn>
      <FadeIn delay={10}>
        <h2 style={{ 
          fontSize: 40, 
          color: '#3B82F6', 
          fontFamily: 'Helvetica, Arial, sans-serif',
          marginTop: 20,
          fontWeight: 600
        }}>
          {subtitle}
        </h2>
      </FadeIn>
    </AbsoluteFill>
  );
};
