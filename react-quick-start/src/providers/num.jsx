import { useContext } from 'react';
import { NumContext } from '../contexts/num';

export default function NumProvider({ children, num }) {
  const originalNum = useContext(NumContext);

  const totalNum = originalNum + num;

  return (
    <p>
      {children}: {totalNum}
    </p>
  );
}
