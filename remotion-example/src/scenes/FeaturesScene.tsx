import { AbsoluteFill } from 'remotion';
import { FadeIn } from '../components/FadeIn';

export const FeaturesScene: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  return (
    <AbsoluteFill style={{ 
      justifyContent: 'center', 
      alignItems: 'center', 
      flexDirection: 'column',
      // background: '#0F172A' // Slate-900
    }}>
      <FadeIn>
        <div style={{
          fontSize: 80,
          fontWeight: 'bold',
          color: 'white',
          fontFamily: 'sans-serif',
          marginBottom: 30
        }}>
          {title}
        </div>
      </FadeIn>
      <FadeIn delay={15}>
        <div style={{
          fontSize: 50,
          color: '#60A5FA', // Blue-400
          fontFamily: 'sans-serif'
        }}>
          {subtitle}
        </div>
      </FadeIn>
      <FadeIn delay={30}>
        <div style={{
          marginTop: 60,
          display: 'flex',
          gap: 40
        }}>
           {/* Simple icons/text blocks */}
           <FeatureItem text="无需编程基础" />
           <FeatureItem text="实战项目驱动" />
           <FeatureItem text="全程 AI 辅助" />
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <div style={{
    padding: '20px 40px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    color: 'white',
    fontSize: 30,
    fontFamily: 'sans-serif'
  }}>
    {text}
  </div>
);
