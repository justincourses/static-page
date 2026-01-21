import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const CTAScene: React.FC<{ price: string; url: string }> = ({ price, url }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1]);
  const scale = interpolate(frame, [0, 20], [0.9, 1]);

  return (
    <AbsoluteFill style={{ 
      justifyContent: 'center', 
      alignItems: 'center', 
      flexDirection: 'column',
      // background: 'linear-gradient(to top right, #2563EB, #1D4ED8)' // Blue gradient - using global instead
    }}>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
        <h1 style={{
          fontSize: 120,
          color: 'white',
          fontFamily: 'sans-serif',
          fontWeight: 900,
          margin: 0,
          textShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {price}
        </h1>
        <div style={{
          fontSize: 50,
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'sans-serif',
          marginTop: 20
        }}>
          {url}
        </div>
        
        <div style={{
          marginTop: 60,
          padding: '20px 60px',
          background: 'white',
          color: '#2563EB',
          fontSize: 40,
          borderRadius: 100,
          fontWeight: 'bold',
          fontFamily: 'sans-serif'
        }}>
          立即报名
        </div>
      </div>
    </AbsoluteFill>
  );
};
