import { useState } from 'react'
import './App.css'

import Gallery from './components/Gallery'
import Hello from './components/Hello'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Gallery count={count} setCount={setCount} />
      <Hello count={count} />
    </>
  );
}

export default App
