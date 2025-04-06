import { useState } from 'react'
import './App.css'

import Gallery from './components/Gallery'
import Hello from './components/Hello'
import Greeting from './components/Greeting'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Gallery count={count} setCount={setCount} />
      <Greeting count={count} />
      <Hello count={count} />
    </>
  );
}

export default App
