import { useState } from 'react'
import './App.css'

import Gallery from './components/Gallery'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Gallery count={count} setCount={setCount} />
    </>
  );
}

export default App
