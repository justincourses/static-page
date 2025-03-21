import { useState } from 'react'
import './App.css'

import Gallery from './components/Gallery'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Gallery num={count} />
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button onClick={() => setCount(0)}>
          reset
        </button>
      </div>
    </>
  )
}

export default App
