import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const DynamicBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Simple moving gradient
  const offset = frame * 2;
  
  return (
    <AbsoluteFill style={{ overflow: 'hidden', zIndex: -1 }}>
      <div style={{
        position: 'absolute',
        top: -500,
        left: -500,
        right: -500,
        bottom: -500,
        background: `radial-gradient(circle at ${width/2 + Math.sin(frame/50)*200}px ${height/2 + Math.cos(frame/50)*200}px, #1e1b4b 0%, #000000 60%)`,
        opacity: 0.8
      }} />
      {/* Grid lines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        transform: `translateY(${offset % 50}px)`
      }} />
    </AbsoluteFill>
  );
};
