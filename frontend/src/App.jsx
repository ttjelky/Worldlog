import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [worlds, setWorlds] = useState([])

  useEffect(() => {
    fetch('/api/worlds/')
      .then((res) => res.json())
      .then(setWorlds)
  }, [])

  return (
    <main>
      <h1>Worldlog</h1>
      <p>World management platform for Minecraft</p>
      <ul>
        {worlds.map((world) => (
          <li key={world.id}>
            <strong>{world.name}</strong> — {world.version || 'no version'}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App