import { AbsoluteFill, Sequence } from 'remotion';
import { FadeIn } from '../components/FadeIn';

export const TechStackScene: React.FC = () => {
  const techs = [
    { name: 'Vue 3', color: '#42b883' },
    { name: 'Nuxt 3', color: '#00DC82' },
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'Tailwind', color: '#06B6D4' },
    { name: 'Vercel', color: '#fff' },
    { name: 'Docker', color: '#2496ED' },
  ];

  return (
    <AbsoluteFill style={{ 
      justifyContent: 'center', 
      alignItems: 'center',
      // background: '#000',
      color: 'white'
    }}>
      <FadeIn>
        <h2 style={{ fontSize: 60, fontFamily: 'sans-serif', marginBottom: 60 }}>
          掌握现代技术栈
        </h2>
      </FadeIn>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 40,
        width: 1200
      }}>
        {techs.map((tech, i) => (
          <Sequence key={tech.name} from={10 + i * 5} layout="none">
             <TechCard name={tech.name} color={tech.color} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const TechCard: React.FC<{ name: string; color: string }> = ({ name, color }) => {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: `2px solid ${color}`,
      borderRadius: 16,
      height: 150,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 40,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: color,
      boxShadow: `0 0 20px ${color}40`
    }}>
      {name}
    </div>
  );
};
