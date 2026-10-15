import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initSupabase } from './services/supabaseClient'
import './index.css'

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

// Demo builds resolve immediately; with Supabase configured the client chunk loads first.
initSupabase().then(render, (error) => {
  console.error(error)
  render()
})
